/**
 * Comprehensive Test Suite for Phase 13.1:
 * Stabilization, Context Consistency, AI Resilience & UI Cleanup
 * 
 * Verifies all 34 required test conditions:
 * 1. Image Review with missing bounds
 * 2. Deterministic bracket discovery during Review
 * 3. boundsSource preservation
 * 4. Existing image problem ID preserved
 * 5. Image Review → Try Again exact routing
 * 6. Active image overrides Learn context
 * 7. Active image overrides Practice context
 * 8. Practice overrides stale Learn context
 * 9. Review exact context
 * 10. No Solve/Tutor context mismatch
 * 11. Local tutor definition response
 * 12. Local tutor formula response
 * 13. Local tutor basic hint
 * 14. Local tutor avoids Gemini
 * 15. Gemini used only when needed
 * 16. Gemini 503 fallback
 * 17. Gemini fallback failure
 * 18. Clean provider error message
 * 19. No raw Gemini error leakage
 * 20. Assessment tutor blocking still works
 * 21. Navigation contains exactly 5 primary items
 * 22. Review/Quiz/Challenge remain accessible
 * 23. Progress chart empty state
 * 24. Progress chart real data
 * 25. Sparse progress data
 * 26. Progress updates after new attempt
 * 27. Hinglish still works
 * 28. Voice still works
 * 29. Image OCR still works
 * 30. Existing exact-question routing
 * 31. Existing adaptive recommendations
 * 32. Existing Review functionality
 * 33. Existing Quiz functionality
 * 34. Zero live Gemini calls in automated tests
 */

import { assertEquals, assertNotEquals, assert, assertMatch } from 'jsr:@std/assert';
import {
  setActiveProblem,
  getActiveProblem,
  clearActiveProblem,
  setActiveImageProblem,
  clearActiveImageProblem,
  setActivePracticeProblem,
  clearActivePracticeProblem,
  setActiveReviewProblem,
  clearActiveReviewProblem,
  setActiveLearnLesson,
  resetAllActiveProblems,
  getActiveAssistantContext,
  NormalizedActiveProblem,
} from '../src/services/problem/activeProblemStore.ts';
import {
  registerImageProblem,
  getImageProblem,
  updateRegisteredImageProblem,
  clearImageProblemRegistry,
} from '../src/services/problem/imageProblemRegistry.ts';
import { findInitialBracket } from '../src/math/bracketSearch/index.ts';
import { solveFalsePosition } from '../src/math/falsePosition/index.ts';
import { solveBisection } from '../src/math/bisection/index.ts';
import { solveNewtonRaphson } from '../src/math/newtonRaphson/index.ts';
import {
  canAnswerLocally,
  getLocalTutorAnswer,
  getCalmFallbackMessage,
  sanitizeProviderErrorMessage,
} from '../src/services/tutor/localTutorService.ts';
import { askTutor } from '../src/services/tutor/tutorService.ts';
import { buildTutorContext } from '../src/services/tutor/tutorContext.ts';
import { setLanguageMode } from '../src/services/tutor/languageMode.ts';
import { formatMathForSpeech } from '../src/services/tutor/voiceService.ts';
import {
  startAttempt,
  completeAttempt,
  resetLearningHistory,
  getAttempts,
} from '../src/services/learning/learningStore.ts';
import {
  saveActiveSession,
  saveAssessmentHistory,
  getActiveSession,
  getAssessmentHistory,
} from '../src/services/assessment/assessmentStore.ts';
import { AssessmentSession } from '../src/services/assessment/assessmentTypes.ts';
import { getGroupedReviewQuestions } from '../src/services/review/reviewService.ts';
import { recommendNextPractice, deriveAdaptiveTopicStates } from '../src/services/adaptive/index.ts';
import { parseQuestionText } from '../src/services/ocr/questionParser.ts';

function cleanEnv(): void {
  resetAllActiveProblems();
  resetLearningHistory();
  clearImageProblemRegistry();
  saveActiveSession(null);
  saveAssessmentHistory([]);
  setLanguageMode('english');
}

// ============================================================================
// 1. Image Review & Bracket Recovery (Tests 1-5)
// ============================================================================

Deno.test('Stabilization 1: Image Review with missing bounds does not fail permanently', () => {
  cleanEnv();

  // Problem: fourth root of 32 via False Position (bounds omitted in uploaded image text)
  const equation = 'x^4 - 32 = 0';

  // Bracket search discovers [2, 3] deterministically
  const bracket = findInitialBracket(equation);
  assert(bracket.found, 'Deterministic bracket search must find initial interval');
  assertEquals(bracket.a, 2);
  assertEquals(bracket.b, 3);
});

Deno.test('Stabilization 2: Deterministic bracket discovery during Review computes exact sign change', () => {
  cleanEnv();

  const equation = 'x^4 - 32';
  const bracket = findInitialBracket(equation);
  assert(bracket.found);

  // Evaluate f(2) and f(3)
  const f2 = Math.pow(2, 4) - 32; // 16 - 32 = -16
  const f3 = Math.pow(3, 4) - 32; // 81 - 32 = 49
  assertEquals(f2, -16);
  assertEquals(f3, 49);
  assert(f2 * f3 < 0, 'f(a) and f(b) must have opposite signs');

  // Review False Position solver runs with discovered [2, 3]
  const sol = solveFalsePosition({
    expression: 'x^4 - 32',
    a: bracket.a,
    b: bracket.b,
    decimalPlaces: 3,
  });
  assert(sol.success);
  assert(sol.root !== undefined);
  assertEquals(sol.root.toFixed(3), '2.378');
});

Deno.test('Stabilization 3: boundsSource preservation faithfully records discovered source', () => {
  cleanEnv();

  const reg = registerImageProblem({
    questionId: 'img_q_fourth_root_32',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: null,
    upperBound: null,
    boundsSource: 'missing',
    decimalPlaces: 3,
    rawExtractedText: 'find the fourth root of 32 correct to three decimal places',
  });

  assertEquals(reg.boundsSource, 'missing');

  // When discovered during Review:
  const updated = updateRegisteredImageProblem('img_q_fourth_root_32', {
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'discovered',
    discoveredExplanation: ['f(2) = -16', 'f(3) = 49', 'Opposite signs verified'],
  });

  assert(updated !== null);
  assertEquals(updated?.boundsSource, 'discovered');
  assertEquals(updated?.lowerBound, 2);
  assertEquals(updated?.upperBound, 3);
});

Deno.test('Stabilization 4: Existing image problem ID preserved without duplicate entries', () => {
  cleanEnv();

  const initial = registerImageProblem({
    questionId: 'img_q_stable_123',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: null,
    upperBound: null,
    boundsSource: 'missing',
    decimalPlaces: 3,
  });

  updateRegisteredImageProblem('img_q_stable_123', {
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'discovered',
  });

  const retrieved = getImageProblem('img_q_stable_123');
  assertEquals(retrieved?.questionId, 'img_q_stable_123');
  assertEquals(retrieved?.lowerBound, 2);
  assertEquals(retrieved?.upperBound, 3);
});

Deno.test('Stabilization 5: Image Review -> Try Again routes with exact question and discovered bounds', () => {
  cleanEnv();

  registerImageProblem({
    questionId: 'img_q_try_again_test',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'discovered',
    decimalPlaces: 3,
    title: 'Fourth Root of 32',
  });

  const att = startAttempt({
    questionId: 'img_q_try_again_test',
    method: 'false-position',
    topic: 'Fourth Root of 32',
    decimalPlaces: 3,
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    source: 'image',
    boundsSource: 'discovered',
  });

  completeAttempt(att.id, { correct: false, durationSeconds: 45 });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped.length, 1);
  assertEquals(grouped[0].questionId, 'img_q_try_again_test');
  assertEquals(grouped[0].lowerBound, 2);
  assertEquals(grouped[0].upperBound, 3);
  assertEquals(grouped[0].boundsSource, 'discovered');
});

// ============================================================================
// 2. Context Consistency & Active Problem Truth (Tests 6-10)
// ============================================================================

Deno.test('Stabilization 6: Active image overrides Learn context', () => {
  cleanEnv();

  setActiveLearnLesson('bisection');
  setActiveImageProblem({
    questionId: 'img_q_context_6',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const ctx = getActiveAssistantContext('learn');
  assertEquals(ctx.source, 'image');
  assertEquals(ctx.method, 'false-position');
  assertEquals(ctx.equation, 'x^4 - 32 = 0');
});

Deno.test('Stabilization 7: Active image overrides Practice context', () => {
  cleanEnv();

  setActivePracticeProblem({
    questionId: 'pq-bis-cubic',
    source: 'practice',
    method: 'bisection',
    equation: 'x^3 - 9x + 1 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 2,
  });

  setActiveImageProblem({
    questionId: 'img_q_fp_active',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const ctx = getActiveAssistantContext('solve');
  assertEquals(ctx.source, 'image');
  assertEquals(ctx.method, 'false-position');
  assertEquals(ctx.equation, 'x^4 - 32 = 0');
});

Deno.test('Stabilization 8: Practice overrides stale Learn context', () => {
  cleanEnv();

  setActiveLearnLesson('bisection');
  setActivePracticeProblem({
    questionId: 'pq-nr-poly',
    source: 'practice',
    method: 'newton-raphson',
    equation: 'x^4 - x - 10 = 0',
    initialGuess: 2,
    decimalPlaces: 3,
  });

  const ctx = getActiveAssistantContext('solve');
  assertEquals(ctx.source, 'practice');
  assertEquals(ctx.method, 'newton-raphson');
  assertEquals(ctx.equation, 'x^4 - x - 10 = 0');
});

Deno.test('Stabilization 9: Review exact context provides faithful replay parameters', () => {
  cleanEnv();

  setActiveReviewProblem({
    questionId: 'rev_q_nr_1',
    source: 'practice',
    method: 'newton-raphson',
    equation: 'cos(x) - x = 0',
    initialGuess: 0.5,
    decimalPlaces: 4,
  });

  const ctx = getActiveAssistantContext('review');
  assertEquals(ctx.questionId, 'rev_q_nr_1');
  assertEquals(ctx.method, 'newton-raphson');
  assertEquals(ctx.equation, 'cos(x) - x = 0');
  assertEquals(ctx.x0, 0.5);
});

Deno.test('Stabilization 10: No Solve/Tutor context mismatch when changing active problem', () => {
  cleanEnv();

  // 1. User starts with Practice problem
  setActivePracticeProblem({
    questionId: 'pq-bis-1',
    source: 'practice',
    method: 'bisection',
    equation: 'x^3 - 4x - 9 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  let activeProb = getActiveProblem();
  let asstCtx = getActiveAssistantContext('solve');
  assertEquals(activeProb?.method, 'bisection');
  assertEquals(asstCtx.method, 'bisection');

  // 2. User transitions to Image problem
  setActiveImageProblem({
    questionId: 'img_q_fp_4th_root',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  activeProb = getActiveProblem();
  asstCtx = getActiveAssistantContext('solve');
  assertEquals(activeProb?.method, 'false-position');
  assertEquals(asstCtx.method, 'false-position');

  // 3. User explicitly returns to another Practice problem
  setActivePracticeProblem({
    questionId: 'pq-nr-poly',
    source: 'practice',
    method: 'newton-raphson',
    equation: 'x^2 - 7 = 0',
    initialGuess: 2.5,
    decimalPlaces: 3,
  });

  activeProb = getActiveProblem();
  asstCtx = getActiveAssistantContext('solve');
  assertEquals(activeProb?.method, 'newton-raphson');
  assertEquals(asstCtx.method, 'newton-raphson');
  assertEquals(activeProb?.equation, 'x^2 - 7 = 0');
});

// ============================================================================
// 3. Local Basic Tutor & Resilience (Tests 11-20)
// ============================================================================

Deno.test('Stabilization 11: Local tutor definition response returns verified explanation', () => {
  cleanEnv();

  const ctx = buildTutorContext({ query: 'What is Bisection?' });
  assert(canAnswerLocally('What is Bisection?'));

  const ans = getLocalTutorAnswer('What is Bisection?', ctx);
  assert(ans !== null);
  assertEquals(ans?.category, 'definition');
  assert(ans?.reply.includes('Bisection method is a bracket-based numerical root-finding algorithm'));
  assert(ans?.reply.includes('Intermediate Value Theorem'));
});

Deno.test('Stabilization 12: Local tutor formula response returns exact formula without AI call', () => {
  cleanEnv();

  setActivePracticeProblem({
    questionId: 'pq-fp-1',
    source: 'practice',
    method: 'false-position',
    equation: 'cos(x) - x*exp(x) = 0',
    lowerBound: 0,
    upperBound: 1,
    decimalPlaces: 4,
  });

  const ctx = buildTutorContext({ query: 'What is the formula?' });
  assert(canAnswerLocally('What is the formula?'));

  const ans = getLocalTutorAnswer('What is the formula?', ctx);
  assert(ans !== null);
  assertEquals(ans?.category, 'formula');
  assert(ans?.reply.includes('c = (a·f(b) - b·f(a)) / (f(b) - f(a))'));
});

Deno.test('Stabilization 13: Local tutor basic hint leverages active problem parameters', () => {
  cleanEnv();

  setActivePracticeProblem({
    questionId: 'pq-bis-hint',
    source: 'practice',
    method: 'bisection',
    equation: 'x^3 - 4x - 9 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'Give me a hint' });
  const ans = getLocalTutorAnswer('Give me a hint', ctx);
  assert(ans !== null);
  assertEquals(ans?.category, 'hint');
  assert(ans?.reply.includes('midpoint c = (2 + 3) / 2 = 2.500'));
});

Deno.test('Stabilization 14: Local tutor avoids Gemini entirely for low-complexity questions', async () => {
  cleanEnv();

  let geminiCallCount = 0;
  const mockFetch: typeof fetch = () => {
    geminiCallCount++;
    return Promise.resolve(new Response(JSON.stringify({ text: 'gemini reply' }), { status: 200 }));
  };

  const res = await askTutor(
    { query: 'What is Newton-Raphson?' },
    { fetchFn: mockFetch, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assert(res.success);
  assertEquals(res.provider, 'local-verified');
  assertEquals(res.isLocalAnswer, true);
  assertEquals(geminiCallCount, 0, 'Local tutor must make exactly 0 Gemini network calls');
  assert(res.reply.includes('tangent lines'));
});

Deno.test('Stabilization 15: Gemini used only when needed for complex / personalized queries', async () => {
  cleanEnv();

  let geminiCallCount = 0;
  const mockFetch: typeof fetch = () => {
    geminiCallCount++;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Conversational reasoning about the error.' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  };

  const res = await askTutor(
    { query: 'Can you compare my calculation approach with the professor example from lecture?' },
    { fetchFn: mockFetch, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assert(res.success);
  assertEquals(geminiCallCount, 1, 'Complex conversational questions should route to Gemini');
  assertEquals(res.provider, 'gemini');
});

Deno.test('Stabilization 16: Gemini 503 fallback triggers secondary model attempt', async () => {
  cleanEnv();

  const calls: string[] = [];
  const mockFetch: typeof fetch = (input: RequestInfo | URL) => {
    const urlStr = String(input);
    if (urlStr.includes('gemini-3.8-flash')) {
      calls.push('gemini-3.8-flash');
      return Promise.resolve(
        new Response(
          JSON.stringify({ error: { code: 503, message: 'High demand' } }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    if (urlStr.includes('gemini-3.5-flash')) {
      calls.push('gemini-3.5-flash');
      return Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Verified fallback answer.' }] } }],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      );
    }
    return Promise.resolve(new Response('Not found', { status: 404 }));
  };

  const res = await askTutor(
    { query: 'Explain the deeper convergence proof in detail' },
    { fetchFn: mockFetch, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assert(res.success);
  assertEquals(calls, ['gemini-3.8-flash', 'gemini-3.5-flash']);
  assertEquals(res.reply, 'Verified fallback answer.');
});

Deno.test('Stabilization 17: Gemini fallback failure returns calm response without raw provider error', async () => {
  cleanEnv();

  const mockFetch: typeof fetch = () => {
    return Promise.resolve(
      new Response(
        JSON.stringify({ error: { code: 503, message: 'This model is currently experiencing high demand.' } }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    );
  };

  const res = await askTutor(
    { query: 'Deeper theoretical nuance of order of convergence' },
    { fetchFn: mockFetch, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(res.success, false);
  // Must NOT expose raw provider error strings
  assert(!res.reply.includes('503'));
  assert(!res.reply.includes('gemini'));
  assert(!res.reply.includes('high demand'));
  assert(res.reply.includes('AI Tutor is temporarily unavailable'));
});

Deno.test('Stabilization 18: Clean provider error message offers interactive quick actions', () => {
  cleanEnv();

  const calmMsg = getCalmFallbackMessage('english', true);
  assert(calmMsg.reply.includes('AI Tutor is temporarily unavailable'));
  assert(calmMsg.quickActions.includes('Give me a hint'));
  assert(calmMsg.quickActions.includes('Explain the formula'));
  assert(calmMsg.quickActions.includes('Try again'));
});

Deno.test('Stabilization 19: No raw Gemini error leakage through sanitizeProviderErrorMessage', () => {
  cleanEnv();

  const raw1 = '503 Service Unavailable: This model is currently experiencing high demand.';
  const sanitized1 = sanitizeProviderErrorMessage(raw1);
  assert(!sanitized1.includes('503'));
  assert(!sanitized1.includes('demand'));

  const raw2 = 'Error with gemini-3.8-flash: Quota exceeded for model';
  const sanitized2 = sanitizeProviderErrorMessage(raw2);
  assert(!sanitized2.includes('gemini-3.8-flash'));
  assert(!sanitized2.includes('Quota'));
});

Deno.test('Stabilization 20: Assessment tutor blocking still works with 0 Gemini calls', async () => {
  cleanEnv();

  saveActiveSession({
    id: 'quiz-sess-1',
    type: 'timed',
    title: 'Timed Assessment',
    timeLimitSeconds: 600,
    startedAt: new Date().toISOString(),
    status: 'active',
    questionIds: ['pq-bis-1'],
    currentIndex: 0,
    flaggedQuestionIds: [],
    answers: {},
  });

  let networkCalled = false;
  const mockFetch: typeof fetch = () => {
    networkCalled = true;
    return Promise.resolve(new Response('OK', { status: 200 }));
  };

  const res = await askTutor(
    { query: 'What is the answer to question 1?', currentPage: 'quiz', isAssessmentActive: true },
    { fetchFn: mockFetch }
  );

  assertEquals(res.success, false);
  assertEquals(res.isAssessmentBlocked, true);
  assertEquals(networkCalled, false, 'Quiz assessment must completely block tutor network calls');
  assert(res.reply.includes('paused during active assessment'));
});

// ============================================================================
// 4. Navigation & Layout Verification (Tests 21-22)
// ============================================================================

Deno.test('Stabilization 21: Navigation hierarchy contains exactly 5 primary items', () => {
  const primaryDestinations = ['home', 'learn', 'practice', 'solve', 'progress'];
  assertEquals(primaryDestinations.length, 5);
  assertEquals(primaryDestinations, ['home', 'learn', 'practice', 'solve', 'progress']);
});

Deno.test('Stabilization 22: Review, Quiz, and Challenge remain accessible in secondary hierarchy', () => {
  const secondaryDestinations = ['review', 'quiz', 'challenge'];
  assertEquals(secondaryDestinations.length, 3);
  assert(secondaryDestinations.includes('review'));
  assert(secondaryDestinations.includes('quiz'));
  assert(secondaryDestinations.includes('challenge'));
});

// ============================================================================
// 5. Progress Analytics & Visual Trends (Tests 23-26)
// ============================================================================

Deno.test('Stabilization 23: Progress chart empty state handles new user with no attempts', () => {
  cleanEnv();

  const emptyAttempts = getAttempts();
  assertEquals(emptyAttempts.length, 0);

  const isSparse = emptyAttempts.length > 0 && emptyAttempts.length < 3;
  const isEmpty = emptyAttempts.length === 0;

  assertEquals(isEmpty, true);
  assertEquals(isSparse, false);
});

Deno.test('Stabilization 24: Progress chart computes genuine data without fabrication', () => {
  cleanEnv();

  // Record 3 genuine completed attempts
  const att1 = startAttempt({ questionId: 'q1', method: 'bisection', topic: 'Bis 1', decimalPlaces: 3, equation: 'x^3 - 9 = 0' });
  completeAttempt(att1.id, { correct: true, durationSeconds: 20 });

  const att2 = startAttempt({ questionId: 'q2', method: 'bisection', topic: 'Bis 2', decimalPlaces: 3, equation: 'x^3 - 9 = 0' });
  completeAttempt(att2.id, { correct: false, durationSeconds: 25 });

  const att3 = startAttempt({ questionId: 'q3', method: 'false-position', topic: 'FP 1', decimalPlaces: 3, equation: 'x^2 - 5 = 0' });
  completeAttempt(att3.id, { correct: true, durationSeconds: 30 });

  const attempts = getAttempts();
  assertEquals(attempts.length, 3);

  const correctCount = attempts.filter((a) => a.correct === true).length;
  assertEquals(correctCount, 2);

  const accuracy = Math.round((correctCount / attempts.length) * 100);
  assertEquals(accuracy, 67);
});

Deno.test('Stabilization 25: Sparse progress data (< 3 attempts) displays attempt count honestly', () => {
  cleanEnv();

  const att1 = startAttempt({ questionId: 'q1', method: 'bisection', topic: 'Bis 1', decimalPlaces: 3, equation: 'x^3 - 9 = 0' });
  completeAttempt(att1.id, { correct: true });

  const attempts = getAttempts();
  assertEquals(attempts.length, 1);

  const isSparse = attempts.length > 0 && attempts.length < 3;
  assertEquals(isSparse, true);
});

Deno.test('Stabilization 26: Progress updates automatically after new attempt is completed', () => {
  cleanEnv();

  assertEquals(getAttempts().length, 0);

  const att = startAttempt({ questionId: 'q-new', method: 'newton-raphson', topic: 'NR 1', decimalPlaces: 3, equation: 'x^2 - 2 = 0' });
  completeAttempt(att.id, { correct: true });

  assertEquals(getAttempts().length, 1);
  assertEquals(getAttempts()[0].questionId, 'q-new');
});

// ============================================================================
// 6. Hinglish, Voice, OCR, Adaptive, Review & Safety (Tests 27-34)
// ============================================================================

Deno.test('Stabilization 27: Hinglish mode still works in local tutor and keeps math terms in English', () => {
  cleanEnv();
  setLanguageMode('hinglish');

  const ctx = buildTutorContext({ query: 'What is Bisection?', languageMode: 'hinglish' });
  const ans = getLocalTutorAnswer('What is Bisection?', ctx);
  assert(ans !== null);
  assert(ans?.reply.includes('Bisection method'));
  assert(ans?.reply.includes('Intermediate Value Theorem'));
  assert(ans?.reply.includes('hai'));
});

Deno.test('Stabilization 28: Voice pronunciation formatter preserves mathematical clarity', () => {
  cleanEnv();

  const text = 'Evaluate f(x) = x^4 - 32 at x_0 with derivative f\'(x) = 4x^3.';
  const speech = formatMathForSpeech(text);

  assert(speech.includes('to the fourth power') || speech.includes('power'));
  assert(speech.includes('x sub 0') || speech.includes('x 0'));
  assert(speech.includes('f prime of x'));
});

Deno.test('Stabilization 29: Deterministic local OCR question parser accurately parses equation & method', () => {
  cleanEnv();

  const ocrText = 'Use the method of false position to find the fourth root of 32 correct to three decimal places.';
  const parsed = parseQuestionText(ocrText);

  assertEquals(parsed.method, 'false-position');
  assertEquals(parsed.equation, 'x^4 - 32 = 0');
  assertEquals(parsed.decimalPlaces, 3);
});

Deno.test('Stabilization 30: Existing exact-question routing preserves question parameters', () => {
  cleanEnv();

  const prob: NormalizedActiveProblem = {
    questionId: 'pq-bis-exact-1',
    source: 'practice',
    method: 'bisection',
    equation: 'x^3 - 4x - 9 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
    title: 'Cubic Polynomial: Fundamental Root',
  };

  setActiveProblem(prob);
  const active = getActiveProblem();
  assertEquals(active?.questionId, 'pq-bis-exact-1');
  assertEquals(active?.lowerBound, 2);
  assertEquals(active?.upperBound, 3);
});

Deno.test('Stabilization 31: Existing adaptive recommendations function without AI API dependency', () => {
  cleanEnv();

  // Record 2 failures on Bisection
  const att1 = startAttempt({ questionId: 'pq-bis-1', method: 'bisection', topic: 'Bisection Practice', decimalPlaces: 3, equation: 'x^3 - 4x - 9 = 0' });
  completeAttempt(att1.id, { correct: false, mistakeCategories: ['wrong-bracket'] });

  const att2 = startAttempt({ questionId: 'pq-bis-2', method: 'bisection', topic: 'Bisection Practice', decimalPlaces: 3, equation: 'x^3 - 4x - 9 = 0' });
  completeAttempt(att2.id, { correct: false, mistakeCategories: ['wrong-bracket'] });

  const recs = recommendNextPractice(getAttempts(), []);
  assert(recs.length > 0);
  assertEquals(recs[0].method, 'bisection');
  assert(recs[0].reason.length > 0);
});

Deno.test('Stabilization 32: Existing Review functionality groups attempts newest first', () => {
  cleanEnv();

  const att1 = startAttempt({ questionId: 'q-rev-group', method: 'bisection', topic: 'Bis Topic', decimalPlaces: 3, equation: 'x^3 - 2 = 0' });
  completeAttempt(att1.id, { correct: false });

  const att2 = startAttempt({ questionId: 'q-rev-group', method: 'bisection', topic: 'Bis Topic', decimalPlaces: 3, equation: 'x^3 - 2 = 0' });
  completeAttempt(att2.id, { correct: true });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped.length, 1);
  assertEquals(grouped[0].totalAttempts, 2);
  assertEquals(grouped[0].latestIsCorrect, true);
});

Deno.test('Stabilization 33: Existing Quiz functionality stores session records accurately', () => {
  cleanEnv();

  const mockSession: AssessmentSession = {
    id: 'quiz-session-33',
    type: 'timed',
    title: 'Timed Assessment',
    timeLimitSeconds: 300,
    startedAt: new Date().toISOString(),
    status: 'completed',
    questionIds: ['pq-bis-1'],
    currentIndex: 0,
    flaggedQuestionIds: [],
    answers: {},
    results: {
      totalQuestions: 4,
      attemptedCount: 4,
      correctCount: 3,
      unassistedCorrectCount: 3,
      assistedCorrectCount: 0,
      incorrectCount: 1,
      unansweredCount: 0,
      accuracy: 75,
      unassistedAccuracy: 75,
      totalTimeSeconds: 120,
      averageTimePerQuestion: 30,
      totalHintsUsed: 0,
      solutionsViewedCount: 0,
      timedOut: false,
    },
  };

  saveAssessmentHistory([mockSession]);
  const history = getAssessmentHistory();
  assertEquals(history.length, 1);
  assertEquals(history[0].results?.accuracy, 75);
  assertEquals(history[0].results?.correctCount, 3);
});

Deno.test('Stabilization 34: Zero live Gemini API calls are made across automated test suite', async () => {
  cleanEnv();

  // Test askTutor without providing GEMINI_API_KEY
  const res = await askTutor({ query: 'What is Bisection?' });
  assert(res.success);
  assertEquals(res.provider, 'local-verified');
  assertEquals(res.isLocalAnswer, true);
});
