import { assertEquals, assert } from 'jsr:@std/assert';
import {
  findInitialBracket,
  formatBracketExplanation,
} from '../src/math/bracketSearch/index.ts';
import { solveFalsePosition } from '../src/math/falsePosition/index.ts';
import { solveBisection } from '../src/math/bisection/index.ts';
import { solveNewtonRaphson } from '../src/math/newtonRaphson/index.ts';
import {
  normalizeExtractedProblem,
  validateExtractedProblem,
} from '../src/services/problemImage/problemImageValidation.ts';
import { handleProblemImageRequest } from '../src/services/problemImage/problemImageHandler.ts';
import { formatEducationalReply } from '../src/services/assistant/systemPrompt.ts';
import { handleChatRequest } from '../src/services/assistant/chatHandler.ts';
import {
  startAttempt,
  completeAttempt,
  getAttemptsForQuestion,
  resetLearningHistory,
  getAttempts,
} from '../src/services/learning/learningStore.ts';
import { loadProgress, saveProgress, createInitialProgressState } from '../src/services/progress/progressStore.ts';

// Reset stores before tests
function setupFreshStore() {
  resetLearningHistory();
  saveProgress(createInitialProgressState());
}

// -------------------------------------------------------------
// Test A: Extraction with explicit bounds preserves provided bounds
// -------------------------------------------------------------
Deno.test('A. Extraction with explicit bounds preserves provided bounds', () => {
  const rawWithBounds = {
    questionText: 'Find a root of x^3 - 4x - 9 = 0 in [2, 3]',
    equation: 'x^3 - 4x - 9 = 0',
    method: 'bisection',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
    confidence: 0.95,
  };

  const normalized = normalizeExtractedProblem(rawWithBounds);
  assertEquals(normalized.lowerBound, 2);
  assertEquals(normalized.upperBound, 3);
  assertEquals(normalized.boundsSource, 'supplied');
  assert(normalized.id !== undefined && normalized.id.startsWith('img_q_'));
});

// -------------------------------------------------------------
// Test B: Extraction without bounds leaves lower/upper null without fabrication
// -------------------------------------------------------------
Deno.test('B. Extraction without bounds leaves lowerBound and upperBound null/undefined', () => {
  const rawMissingBounds = {
    questionText: 'Use the method of false position to find the fourth root of 32 correct to three decimal places.',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    decimalPlaces: 3,
  };

  const normalized = normalizeExtractedProblem(rawMissingBounds);
  assertEquals(normalized.lowerBound, null);
  assertEquals(normalized.upperBound, null);
  assertEquals(normalized.boundsSource, 'missing');
  assertEquals(normalized.confidenceLabel, 'Needs review');
  assert(normalized.missingFields?.includes('lowerBound') || normalized.missingFields?.includes('bounds'));
});

// -------------------------------------------------------------
// Test C: Fourth-root example bracket search finds [2, 3]
// -------------------------------------------------------------
Deno.test('C. Fourth-root example automatic bracket search finds [2, 3]', () => {
  const searchResult = findInitialBracket('x^4 - 32 = 0');
  assertEquals(searchResult.found, true);
  if (searchResult.found) {
    assertEquals(searchResult.a, 2);
    assertEquals(searchResult.b, 3);
  }
});

// -------------------------------------------------------------
// Test D: Verify deterministic calculations: f(2) = -16, f(3) = 49
// -------------------------------------------------------------
Deno.test('D. Verify deterministic calculations: f(2) = -16, f(3) = 49', () => {
  const searchResult = findInitialBracket('x^4 - 32 = 0');
  assertEquals(searchResult.found, true);
  if (searchResult.found) {
    assertEquals(searchResult.fa, -16);
    assertEquals(searchResult.fb, 49);
  }
});

// -------------------------------------------------------------
// Test E: Verify sign-change condition: f(a) * f(b) < 0
// -------------------------------------------------------------
Deno.test('E. Verify sign-change condition: f(a) * f(b) < 0', () => {
  const searchResult = findInitialBracket('x^4 - 32 = 0');
  assertEquals(searchResult.found, true);
  if (searchResult.found) {
    const product = searchResult.fa * searchResult.fb;
    assert(product < 0, `Expected f(a) * f(b) < 0, got ${product}`);
  }
});

// -------------------------------------------------------------
// Test F: Verify False Position receives [2, 3] and solves successfully
// -------------------------------------------------------------
Deno.test('F. Verify False Position receives [2, 3] and executes deterministic solver', () => {
  const searchResult = findInitialBracket('x^4 - 32 = 0');
  assertEquals(searchResult.found, true);
  if (searchResult.found) {
    const fpResult = solveFalsePosition({
      expression: 'x^4 - 32',
      a: searchResult.a,
      b: searchResult.b,
      decimalPlaces: 3,
    });
    assertEquals(fpResult.success, true);
    assert(fpResult.root !== undefined);
    // 32^(1/4) = 2.378414... -> to 3 decimals: ~2.378
    const roundedRoot = Number(fpResult.root?.toFixed(3));
    assertEquals(roundedRoot, 2.378);
  }
});

// -------------------------------------------------------------
// Test G: Verify Bisection receives [2, 3] if that method is selected
// -------------------------------------------------------------
Deno.test('G. Verify Bisection receives [2, 3] if that method is selected', () => {
  const searchResult = findInitialBracket('x^4 - 32 = 0');
  assertEquals(searchResult.found, true);
  if (searchResult.found) {
    const bisResult = solveBisection({
      expression: 'x^4 - 32',
      a: searchResult.a,
      b: searchResult.b,
      decimalPlaces: 3,
    });
    assertEquals(bisResult.success, true);
    assert(bisResult.root !== undefined);
    const roundedRoot = Number(bisResult.root?.toFixed(3));
    assertEquals(roundedRoot, 2.378);
  }
});

// -------------------------------------------------------------
// Test H: Verify Newton-Raphson does NOT automatically receive [2, 3] as initial guess
// -------------------------------------------------------------
Deno.test('H. Verify Newton-Raphson does NOT automatically receive [2, 3] as initial guess', () => {
  const extracted = normalizeExtractedProblem({
    equation: 'x^4 - 32 = 0',
    method: 'newton-raphson',
    decimalPlaces: 3,
  });

  assertEquals(extracted.initialGuess, null);

  // Validation should detect that initial guess is missing and require review
  const val = validateExtractedProblem(extracted, 'newton-raphson');
  assertEquals(val.isValid, false);
  assert(val.initialGuessError?.includes('Initial guess (x₀) is required'));
});

// -------------------------------------------------------------
// Test I: Verify bracket-search failure produces a review/manual-input state
// -------------------------------------------------------------
Deno.test('I. Verify bracket-search failure produces a structured failure result', () => {
  // Equation with no real root and no sign change (always strictly positive)
  const noRootResult = findInitialBracket('x^2 + 10 = 0');
  assertEquals(noRootResult.found, false);
  if (!noRootResult.found) {
    assert(noRootResult.reason.includes('No sign-changing interval found'));
  }
});

// -------------------------------------------------------------
// Test J: Verify malformed expression is handled safely
// -------------------------------------------------------------
Deno.test('J. Verify malformed expression is handled safely without crashing', () => {
  const invalidResult = findInitialBracket('x ^^ + 3?? = 0');
  assertEquals(invalidResult.found, false);
  if (!invalidResult.found) {
    assert(invalidResult.reason.includes('Invalid mathematical expression syntax'));
  }
});

// -------------------------------------------------------------
// Test K: Verify exact image-question ID survives the entire workflow
// -------------------------------------------------------------
Deno.test('K. Verify exact image-question ID survives extraction -> solver -> solution -> completion', () => {
  setupFreshStore();

  const customId = 'img_q_fourth_root_32_test';
  const extracted = normalizeExtractedProblem({
    id: customId,
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    decimalPlaces: 3,
  });

  assertEquals(extracted.id, customId);

  // Discover interval
  const bracket = findInitialBracket(extracted.equation!);
  assertEquals(bracket.found, true);

  // Student starts attempt using the exact questionId
  const att = startAttempt({
    questionId: extracted.id!,
    method: 'false-position',
    topic: 'Image Problem: Fourth Root of 32',
    decimalPlaces: 3,
  });
  assertEquals(att.questionId, customId);

  // Solve completed
  const completed = completeAttempt(att.id, {
    correct: true,
    hintsUsed: 1,
    durationSeconds: 45,
  });
  assert(completed !== null);
  assertEquals(completed.questionId, customId);
  assertEquals(completed.correct, true);

  // Verify in store
  const saved = getAttemptsForQuestion(customId);
  assertEquals(saved.length, 1);
  assertEquals(saved[0].questionId, customId);
});

// -------------------------------------------------------------
// Test L: Verify Show Solution records the exact question as solved/viewed
// -------------------------------------------------------------
Deno.test('L. Verify Show Solution records the exact question as solved/viewed in learningStore and progressStore', () => {
  setupFreshStore();

  const questionId = 'img_q_show_solution_verify_123';
  const att = startAttempt({
    questionId,
    method: 'false-position',
    topic: 'Fourth Root of 32',
    decimalPlaces: 3,
  });

  // Student clicks Show Solution
  const completed = completeAttempt(att.id, {
    correct: true,
    solutionViewed: true,
    durationSeconds: 30,
  });

  assert(completed !== null);
  assertEquals(completed.questionId, questionId);
  assertEquals(completed.solutionViewed, true);
  assertEquals(completed.correct, true);

  // Verify progressStore sync
  const progress = loadProgress();
  const attemptInProg = progress.attempts.find((a) => a.questionId === questionId);
  assert(attemptInProg !== undefined);
  assertEquals(attemptInProg.questionId, questionId);
  assertEquals(attemptInProg.isCorrect, true);
  assertEquals(progress.methods['false-position'].questionsSolved >= 1, true);
});

// -------------------------------------------------------------
// Test M: Verify previous attempts are preserved on retry
// -------------------------------------------------------------
Deno.test('M. Verify previous attempts are preserved on retry (distinct attempts)', () => {
  setupFreshStore();

  const questionId = 'img_q_retry_preservation_test';

  // Attempt 1: Failed or incomplete
  const att1 = startAttempt({ questionId, method: 'false-position', topic: 'Practice' });
  completeAttempt(att1.id, { correct: false, durationSeconds: 50 });

  // Attempt 2: Show solution / solved
  const att2 = startAttempt({ questionId, method: 'false-position', topic: 'Practice' });
  completeAttempt(att2.id, { correct: true, solutionViewed: true, durationSeconds: 20 });

  const allAttempts = getAttemptsForQuestion(questionId);
  assertEquals(allAttempts.length, 2);
  assertEquals(allAttempts[0].id !== allAttempts[1].id, true);
  assertEquals(allAttempts[0].correct, false);
  assertEquals(allAttempts[1].correct, true);
  assertEquals(allAttempts[1].solutionViewed, true);
});

// -------------------------------------------------------------
// Test N: Verify Gemini is not required for bracket calculation
// -------------------------------------------------------------
Deno.test('N. Verify Gemini is not required for bracket calculation (pure local execution)', () => {
  // Pure local call with zero environment variables or network fetch
  const res = findInitialBracket('x^3 - 9x + 1 = 0');
  assertEquals(res.found, true);
  if (res.found) {
    // f(0) = 1; f(1) = -7 -> [0, 1] found starting search near 0
    assertEquals(res.a, 0);
    assertEquals(res.b, 1);
    assertEquals(res.fa, 1);
    assertEquals(res.fb, -7);
  }

  // Also verify x^3 - 4x - 9 = 0 finds [2, 3]
  const res2 = findInitialBracket('x^3 - 4x - 9 = 0');
  assertEquals(res2.found, true);
  if (res2.found) {
    // f(2) = 8 - 8 - 9 = -9; f(3) = 27 - 12 - 9 = 6 -> [2, 3]
    assertEquals(res2.a, 2);
    assertEquals(res2.b, 3);
    assertEquals(res2.fa, -9);
    assertEquals(res2.fb, 6);
  }
});

// -------------------------------------------------------------
// Test O: Verify Gemini formatting rules using a mocked response
// -------------------------------------------------------------
Deno.test('O. Verify Gemini formatting rules: no **, no raw JSON, no internal labels', async () => {
  const rawModelResponse =
    '**Step 1:** Compute the initial value. According to **Theorem 1**, NOT_SPECIFIED_BY_COURSE applies here. ```json\\n{\\"note\\": \\"internal\\"}\\n```';

  const cleaned = formatEducationalReply(rawModelResponse);

  // No ** bold
  assert(!cleaned.includes('**'));
  assert(cleaned.includes('Step 1: Compute the initial value.'));

  // No internal label NOT_SPECIFIED_BY_COURSE
  assert(!cleaned.includes('NOT_SPECIFIED_BY_COURSE'));
  assert(cleaned.includes('The official course notes do not specify this.'));

  // No raw JSON block
  assert(!cleaned.includes('```json'));
  assert(!cleaned.includes('{"note": "internal"}'));

  // Test full chat handler with mock fetch returning markdown bold
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: '**Explanation:** The root lies in interval [2, 3].' }],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const chatRes = await handleChatRequest(
    {
      messages: [{ role: 'user', content: 'Explain False Position' }],
    },
    { GEMINI_API_KEY: 'test-key' },
    mockFetch
  );

  assertEquals(chatRes.success, true);
  assert(chatRes.reply !== undefined);
  assert(!chatRes.reply.includes('**'));
  assert(chatRes.reply.includes('Explanation: The root lies in interval [2, 3].'));
});

// -------------------------------------------------------------
// Test P: Verify existing Phase 7 extraction behavior is preserved
// -------------------------------------------------------------
Deno.test('P. Verify existing Phase 7 extraction behavior is preserved', () => {
  const phase7Problem = {
    questionText: 'Find the positive root of cos(x) - x*exp(x) = 0 by false position in [0, 1]',
    equation: 'cos(x) - x*exp(x) = 0',
    method: 'false-position',
    lowerBound: 0,
    upperBound: 1,
    decimalPlaces: 4,
    confidence: 0.92,
  };

  const normalized = normalizeExtractedProblem(phase7Problem);
  assertEquals(normalized.equation, 'cos(x) - x*exp(x) = 0');
  assertEquals(normalized.method, 'false-position');
  assertEquals(normalized.lowerBound, 0);
  assertEquals(normalized.upperBound, 1);
  assertEquals(normalized.decimalPlaces, 4);
  assertEquals(normalized.boundsSource, 'supplied');

  const val = validateExtractedProblem(normalized);
  assertEquals(val.isValid, true);
});

// -------------------------------------------------------------
// Test Q: Verify existing Phase 8 learning history behavior
// -------------------------------------------------------------
Deno.test('Q. Verify existing Phase 8 learning history behavior', () => {
  setupFreshStore();

  const standardPracticeQuestion = 'pq-fp-1';
  const att = startAttempt({
    questionId: standardPracticeQuestion,
    method: 'false-position',
    topic: 'False Position Standard Practice',
    decimalPlaces: 4,
  });

  assertEquals(att.questionId, standardPracticeQuestion);
  assertEquals(att.status, 'started');
  assertEquals(att.correct, undefined);

  completeAttempt(att.id, {
    correct: true,
    hintsUsed: 0,
    durationSeconds: 75,
  });

  const all = getAttempts();
  assertEquals(all.length, 1);
  assertEquals(all[0].questionId, standardPracticeQuestion);
  assertEquals(all[0].correct, true);
});
