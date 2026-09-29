/**
 * Phase 8.5 Tests: Local OCR-First Image Question Solving + Deterministic Parser + Gemini Fallback
 * 
 * Verifies all 20 requirements specified in Phase 8.5.
 * ZERO real Gemini calls are made during tests.
 */

import { assertEquals, assert } from 'jsr:@std/assert';
import {
  parseQuestionText,
} from '../src/services/ocr/questionParser.ts';
import {
  setMockOcrRunner,
  clearOcrCache,
} from '../src/services/ocr/ocrService.ts';
import {
  extractProblemFromImageLocal,
  extractProblemFromImageGemini,
} from '../src/services/problemImage/problemImageService.ts';
import {
  findInitialBracket,
  formatBracketExplanation,
} from '../src/math/bracketSearch/index.ts';
import { solveFalsePosition } from '../src/math/falsePosition/index.ts';
import { solveBisection } from '../src/math/bisection/index.ts';
import { validateExtractedProblem } from '../src/services/problemImage/problemImageValidation.ts';
import {
  startAttempt,
  completeAttempt,
  getAttemptsForQuestion,
  resetLearningHistory,
} from '../src/services/learning/learningStore.ts';
import {
  loadProgress,
  saveProgress,
  createInitialProgressState,
} from '../src/services/progress/progressStore.ts';

function resetAllStores() {
  resetLearningHistory();
  saveProgress(createInitialProgressState());
  clearOcrCache();
  setMockOcrRunner(null);
}

// ---------------------------------------------------------------------
// 1. Local OCR result parsing
// ---------------------------------------------------------------------
Deno.test('1. Local OCR result parsing creates structured problem with local-ocr source', () => {
  const ocrText = 'Use bisection method to solve x^3 - 4x - 9 = 0 between 2 and 3 to 3 decimal places.';
  const parsed = parseQuestionText(ocrText);

  assertEquals(parsed.extractionSource, 'local-ocr');
  assertEquals(parsed.method, 'bisection');
  assertEquals(parsed.equation, 'x^3 - 4x - 9 = 0');
  assertEquals(parsed.lowerBound, 2);
  assertEquals(parsed.upperBound, 3);
  assertEquals(parsed.decimalPlaces, 3);
  assert(parsed.id.startsWith('img_q_'));
});

// ---------------------------------------------------------------------
// 2. Explicit equation extraction
// ---------------------------------------------------------------------
Deno.test('2. Explicit equation extraction compiles and normalizes equations', () => {
  const ocrText = 'Find the positive root of cos(x) - x*exp(x) = 0 using Regula Falsi in [0, 1] correct to 4 decimal places.';
  const parsed = parseQuestionText(ocrText);

  assertEquals(parsed.equation, 'cos(x) - x*exp(x) = 0');
  assertEquals(parsed.method, 'false-position');
});

// ---------------------------------------------------------------------
// 3. Method extraction
// ---------------------------------------------------------------------
Deno.test('3. Method extraction supports Bisection, False Position, and Newton-Raphson', () => {
  const t1 = parseQuestionText('Apply False Position method to find root.');
  assertEquals(t1.method, 'false-position');

  const t2 = parseQuestionText('Apply Regula Falsi method.');
  assertEquals(t2.method, 'false-position');

  const t3 = parseQuestionText('Apply Bisection method to isolate root.');
  assertEquals(t3.method, 'bisection');

  const t4 = parseQuestionText('Apply Newton-Raphson method with initial guess.');
  assertEquals(t4.method, 'newton-raphson');
});

// ---------------------------------------------------------------------
// 4. Decimal-place extraction
// ---------------------------------------------------------------------
Deno.test('4. Decimal-place extraction supports words and numbers', () => {
  const p1 = parseQuestionText('Solve x^3 - 2x - 5 = 0 correct to three decimal places.');
  assertEquals(p1.decimalPlaces, 3);

  const p2 = parseQuestionText('Solve x^3 - 2x - 5 = 0 correct to 4 decimal places.');
  assertEquals(p2.decimalPlaces, 4);

  const p3 = parseQuestionText('Solve x^3 - 2x - 5 = 0 to 2 places of decimals.');
  assertEquals(p3.decimalPlaces, 2);
});

// ---------------------------------------------------------------------
// 5. Explicit bounds extraction
// ---------------------------------------------------------------------
Deno.test('5. Explicit bounds extraction parses intervals in brackets or between text', () => {
  const p1 = parseQuestionText('Solve in [1, 2].');
  assertEquals(p1.lowerBound, 1);
  assertEquals(p1.upperBound, 2);
  assertEquals(p1.boundsSource, 'supplied');

  const p2 = parseQuestionText('Find root lying between 2 and 3.');
  assertEquals(p2.lowerBound, 2);
  assertEquals(p2.upperBound, 3);
  assertEquals(p2.boundsSource, 'supplied');
});

// ---------------------------------------------------------------------
// 6. Missing bounds remain null
// ---------------------------------------------------------------------
Deno.test('6. Missing bounds remain strictly null without arbitrary defaults', () => {
  const parsed = parseQuestionText('Use False Position to find the fourth root of 32 correct to three decimal places.');
  assertEquals(parsed.lowerBound, null);
  assertEquals(parsed.upperBound, null);
  assertEquals(parsed.boundsSource, 'missing');
});

// ---------------------------------------------------------------------
// 7. Fourth-root pattern
// ---------------------------------------------------------------------
Deno.test('7. Fourth-root pattern: "fourth root of 32" -> x^4 - 32 = 0', () => {
  const parsed = parseQuestionText('Use the method of false position to find the fourth root of 32 correct to three decimal places.');
  assertEquals(parsed.equation, 'x^4 - 32 = 0');
  assertEquals(parsed.patternMatched, 'fourth root of 32');
});

// ---------------------------------------------------------------------
// 8. Deterministic bracket search for x^4 - 32
// ---------------------------------------------------------------------
Deno.test('8. Deterministic bracket search: x^4 - 32 -> [2, 3]', () => {
  const res = findInitialBracket('x^4 - 32 = 0');
  assertEquals(res.found, true);
  if (res.found) {
    assertEquals(res.a, 2);
    assertEquals(res.b, 3);
  }
});

// ---------------------------------------------------------------------
// 9. Verify f(2) = -16, f(3) = 49
// ---------------------------------------------------------------------
Deno.test('9. Verify deterministic evaluations: f(2) = -16, f(3) = 49', () => {
  const res = findInitialBracket('x^4 - 32 = 0');
  assertEquals(res.found, true);
  if (res.found) {
    assertEquals(res.fa, -16);
    assertEquals(res.fb, 49);
    assert(res.fa * res.fb < 0);
  }
});

// ---------------------------------------------------------------------
// 10. False Position receives [2, 3]
// ---------------------------------------------------------------------
Deno.test('10. False Position receives [2, 3] and converges to 2.378', () => {
  const solved = solveFalsePosition({
    expression: 'x^4 - 32',
    a: 2,
    b: 3,
    decimalPlaces: 3,
  });
  assertEquals(solved.success, true);
  assertEquals(Number(solved.root?.toFixed(3)), 2.378);
});

// ---------------------------------------------------------------------
// 11. Bisection receives [2, 3]
// ---------------------------------------------------------------------
Deno.test('11. Bisection receives [2, 3] and converges to 2.378', () => {
  const solved = solveBisection({
    expression: 'x^4 - 32',
    a: 2,
    b: 3,
    decimalPlaces: 3,
  });
  assertEquals(solved.success, true);
  assertEquals(Number(solved.root?.toFixed(3)), 2.378);
});

// ---------------------------------------------------------------------
// 12. Newton-Raphson does not incorrectly use a bracket as initial guess
// ---------------------------------------------------------------------
Deno.test('12. Newton-Raphson does not incorrectly use a bracket as initial guess', () => {
  const parsed = parseQuestionText('Use Newton-Raphson to solve x^4 - 32 = 0 in [2, 3].');
  assertEquals(parsed.method, 'newton-raphson');
  assertEquals(parsed.initialGuess, null);

  const val = validateExtractedProblem(parsed, 'newton-raphson');
  assertEquals(val.isValid, false);
  assert(val.initialGuessError?.includes('Initial guess (x₀) is required'));
});

// ---------------------------------------------------------------------
// 13. Bracket-search failure
// ---------------------------------------------------------------------
Deno.test('13. Bracket-search failure produces structured failure without fabrication', () => {
  const res = findInitialBracket('x^2 + 100 = 0');
  assertEquals(res.found, false);
  if (!res.found) {
    assert(res.reason.includes('No sign-changing interval found'));
  }
});

// ---------------------------------------------------------------------
// 14. Malformed OCR text
// ---------------------------------------------------------------------
Deno.test('14. Malformed OCR text does not crash and produces "Needs review"', () => {
  const parsed = parseQuestionText('??? *** @@@ smudged blur 12345 %%%');
  assertEquals(parsed.equation, null);
  assertEquals(parsed.method, null);
  assertEquals(parsed.confidenceLabel, 'Needs review');
  assert(parsed.notes?.includes('Some parts of this question could not be confidently understood'));
});

// ---------------------------------------------------------------------
// 15. Exact question ID preservation
// ---------------------------------------------------------------------
Deno.test('15. Exact question ID preservation across workflow', () => {
  resetAllStores();

  const ocrText = 'Use False Position to find fourth root of 32 to 3 decimal places.';
  const parsed = parseQuestionText(ocrText);
  const stableId = parsed.id;
  assert(stableId.startsWith('img_q_'));

  // Start attempt with stable ID
  const att = startAttempt({
    questionId: stableId,
    method: 'false-position',
    topic: 'Fourth Root of 32',
    decimalPlaces: 3,
  });
  assertEquals(att.questionId, stableId);

  // Complete attempt
  const completed = completeAttempt(att.id, {
    correct: true,
    durationSeconds: 40,
  });
  assert(completed !== null);
  assertEquals(completed.questionId, stableId);
});

// ---------------------------------------------------------------------
// 16. Show Solution records exact question
// ---------------------------------------------------------------------
Deno.test('16. Show Solution records exact question in learningStore and progressStore', () => {
  resetAllStores();

  const testQId = 'img_q_show_sol_test_456';
  const att = startAttempt({
    questionId: testQId,
    method: 'false-position',
    topic: 'False Position Solution View',
  });

  const completed = completeAttempt(att.id, {
    correct: true,
    solutionViewed: true,
    durationSeconds: 30,
  });

  assertEquals(completed?.questionId, testQId);
  assertEquals(completed?.solutionViewed, true);

  const progress = loadProgress();
  const found = progress.attempts.find((a) => a.questionId === testQId);
  assert(found !== undefined);
  assertEquals(found.isCorrect, true);
  assertEquals(progress.methods['false-position'].questionsSolved >= 1, true);
});

// ---------------------------------------------------------------------
// 17. Retry preserves previous attempts
// ---------------------------------------------------------------------
Deno.test('17. Retry preserves previous attempts as distinct records', () => {
  resetAllStores();

  const qId = 'img_q_retry_track_789';
  const a1 = startAttempt({ questionId: qId, method: 'bisection', topic: 'Bisection' });
  completeAttempt(a1.id, { correct: false, durationSeconds: 20 });

  const a2 = startAttempt({ questionId: qId, method: 'bisection', topic: 'Bisection' });
  completeAttempt(a2.id, { correct: true, solutionViewed: true, durationSeconds: 15 });

  const history = getAttemptsForQuestion(qId);
  assertEquals(history.length, 2);
  assertEquals(history[0].id !== history[1].id, true);
  assertEquals(history[0].correct, false);
  assertEquals(history[1].correct, true);
});

// ---------------------------------------------------------------------
// 18. Progress receives the exact question
// ---------------------------------------------------------------------
Deno.test('18. Progress receives the exact question without corrupting standard practice', () => {
  resetAllStores();

  const imgQId = 'img_q_unique_progress_target';
  const att = startAttempt({ questionId: imgQId, method: 'newton-raphson', topic: 'Newton Test' });
  completeAttempt(att.id, { correct: true, durationSeconds: 50 });

  const progress = loadProgress();
  const attemptRecord = progress.attempts.find((a) => a.questionId === imgQId);
  assert(attemptRecord !== undefined);
  assertEquals(attemptRecord.methodId, 'newton-raphson');
  assertEquals(progress.methods['newton-raphson'].questionsSolved, 1);
});

// ---------------------------------------------------------------------
// 19. Normal local OCR path makes ZERO Gemini calls
// ---------------------------------------------------------------------
Deno.test('19. Normal local OCR path makes ZERO Gemini calls', async () => {
  resetAllStores();

  // Mock local OCR engine to return the fourth root text
  setMockOcrRunner(async () => ({
    text: 'Use the method of false position to find the fourth root of 32 correct to three decimal places.',
    confidence: 0.92,
    source: 'local-ocr',
  }));

  const mockFile = new File(['fake-png-bytes'], 'photo.png', { type: 'image/png' });

  // Call the normal image extraction path
  const res = await extractProblemFromImageLocal(mockFile);

  assertEquals(res.success, true);
  assert(res.problem !== undefined);
  assertEquals(res.provider, 'none'); // ZERO Gemini calls!
  assertEquals(res.problem.extractionSource, 'local-ocr');
  assertEquals(res.problem.equation, 'x^4 - 32 = 0');
  assertEquals(res.problem.method, 'false-position');
  assertEquals(res.problem.lowerBound, null);
  assertEquals(res.problem.upperBound, null);
});

// ---------------------------------------------------------------------
// 20. Gemini fallback makes a call ONLY when explicitly requested
// ---------------------------------------------------------------------
Deno.test('20. Gemini fallback makes a call ONLY when explicitly requested (mocked provider, 0 real calls)', async () => {
  resetAllStores();

  let geminiApiCallCount = 0;

  // Mock fetch that monitors /api/problem-image
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (url.includes('/api/problem-image')) {
      geminiApiCallCount++;
      return new Response(
        JSON.stringify({
          success: true,
          problem: {
            questionText: 'Handwritten fourth root problem',
            equation: 'x^4 - 32 = 0',
            method: 'false-position',
            lowerBound: null,
            upperBound: null,
            decimalPlaces: 3,
            confidence: 0.9,
            confidenceLabel: 'Needs review',
          },
          provider: 'gemini',
          modelUsed: 'gemini-3.8-flash',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return originalFetch(input, init);
  };

  try {
    const mockFile = new File(['fake-jpeg-bytes'], 'handwritten.jpg', { type: 'image/jpeg' });

    // Step A: Normal extraction does NOT call Gemini
    setMockOcrRunner(async () => ({
      text: 'Difficult handwriting',
      confidence: 0.3,
      source: 'local-ocr',
    }));
    await extractProblemFromImageLocal(mockFile);
    assertEquals(geminiApiCallCount, 0); // Still 0 calls!

    // Step B: Explicit Gemini fallback triggers exactly 1 call
    const aiRes = await extractProblemFromImageGemini(mockFile);
    assertEquals(geminiApiCallCount, 1); // Exactly 1 call when requested!
    assertEquals(aiRes.success, true);
    assertEquals(aiRes.provider, 'gemini');
    assertEquals(aiRes.problem?.extractionSource, 'gemini-fallback');
    assertEquals(aiRes.problem?.equation, 'x^4 - 32 = 0');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
