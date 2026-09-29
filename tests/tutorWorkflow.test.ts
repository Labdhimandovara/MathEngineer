/**
 * Comprehensive Test Suite for Phase 13: AI Tutor, Hinglish & Voice
 * 
 * Verifies:
 * 1. Central TutorContext assembly respecting strict precedence:
 *    Image -> Practice -> Review -> Quiz -> Learn -> Generic
 * 2. Authoritative deterministic solver grounding & prompt guardrails
 * 3. Deterministic intent classification (11 categories)
 * 4. Language modes: English & Hinglish persistence and phrasing rules
 * 5. Voice pronunciation filters: powers, subscripts, derivatives, decimals
 * 6. Assessment Safety: Tutor blocked during active assessments (0 Gemini calls)
 * 7. Course RAG & negative knowledge handling (f'(x) = 0)
 * 8. Adaptive learning context integration (topic states, recurring mistakes)
 * 9. End-to-end tutor service orchestration with mocked provider (0 live API calls)
 */

import { assertEquals, assertNotEquals, assert } from 'jsr:@std/assert';
import {
  buildTutorContext,
  classifyTutorIntent,
} from '../src/services/tutor/tutorContext.ts';
import { buildTutorSystemPrompt } from '../src/services/tutor/tutorPrompt.ts';
import {
  getLanguageMode,
  setLanguageMode,
  toggleLanguageMode,
  LANGUAGE_MODE_KEY,
} from '../src/services/tutor/languageMode.ts';
import {
  formatMathForSpeech,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
} from '../src/services/tutor/voiceService.ts';
import {
  askTutor,
  stripBoldAsterisks,
  formatTutorReply,
} from '../src/services/tutor/tutorService.ts';
import { handleChatRequest } from '../src/services/assistant/chatHandler.ts';
import {
  setActiveImageProblem,
  clearActiveImageProblem,
  setActivePracticeProblem,
  clearActivePracticeProblem,
  setActiveReviewProblem,
  clearActiveReviewProblem,
  setActiveLearnLesson,
  resetAllActiveProblems,
} from '../src/services/problem/activeProblemStore.ts';
import {
  saveActiveSession,
  saveAssessmentHistory,
  ACTIVE_ASSESSMENT_KEY,
  ASSESSMENT_HISTORY_KEY,
} from '../src/services/assessment/assessmentStore.ts';
import {
  startAttempt,
  completeAttempt,
  resetLearningHistory,
} from '../src/services/learning/learningStore.ts';

function cleanTestEnvironment(): void {
  resetAllActiveProblems();
  resetLearningHistory();
  saveActiveSession(null);
  saveAssessmentHistory([]);
  setLanguageMode('english');
  try {
    localStorage.removeItem(LANGUAGE_MODE_KEY);
    localStorage.removeItem(ACTIVE_ASSESSMENT_KEY);
    localStorage.removeItem(ASSESSMENT_HISTORY_KEY);
  } catch {
    // ignore
  }
}

// ============================================================================
// 1. Context Precedence & Problem Resolution
// ============================================================================

Deno.test('Tutor 1: Context precedence: Image problem takes highest priority over Practice problem', () => {
  cleanTestEnvironment();

  setActivePracticeProblem({
    questionId: 'pq-bis-1',
    source: 'practice',
    method: 'bisection',
    equation: 'x^3 - 4x - 9 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  setActiveImageProblem({
    questionId: 'img-q-custom-1',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'How do I solve this?' });
  assertEquals(ctx.activeProblem?.source, 'image');
  assertEquals(ctx.activeProblem?.method, 'false-position');
  assertEquals(ctx.activeProblem?.equation, 'x^4 - 32 = 0');
});

Deno.test('Tutor 2: Context precedence: Practice problem takes priority over Review problem', () => {
  cleanTestEnvironment();

  setActiveReviewProblem({
    questionId: 'rev-q-1',
    source: 'practice',
    method: 'newton-raphson',
    equation: 'x^2 - 5 = 0',
    initialGuess: 2,
    decimalPlaces: 3,
  });

  setActivePracticeProblem({
    questionId: 'pq-bis-2',
    source: 'practice',
    method: 'bisection',
    equation: 'cos(x) - x = 0',
    lowerBound: 0,
    upperBound: 1,
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'Explain this step' });
  assertEquals(ctx.activeProblem?.questionId, 'pq-bis-2');
  assertEquals(ctx.activeProblem?.method, 'bisection');
  assertEquals(ctx.activeProblem?.equation, 'cos(x) - x = 0');
});

Deno.test('Tutor 3: Context precedence: Review problem takes priority over Learn lesson', () => {
  cleanTestEnvironment();

  setActiveLearnLesson('bisection');

  setActiveReviewProblem({
    questionId: 'rev-q-nr-1',
    source: 'practice',
    method: 'newton-raphson',
    equation: 'x^3 - x - 1 = 0',
    initialGuess: 1.5,
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'What was my mistake?' });
  assertEquals(ctx.activeProblem?.method, 'newton-raphson');
  assertEquals(ctx.activeProblem?.equation, 'x^3 - x - 1 = 0');
});

Deno.test('Tutor 4: Context precedence: Learn lesson takes priority over Generic default', () => {
  cleanTestEnvironment();

  setActiveLearnLesson('false-position');

  const ctx = buildTutorContext({ query: 'What is the formula?', currentPage: 'learn' });
  assertEquals(ctx.activeProblem?.method, 'false-position');
});

Deno.test('Tutor 5: Context precedence: Stale Learn lesson never overrides active False Position image problem', () => {
  cleanTestEnvironment();

  setActiveLearnLesson('bisection'); // User was browsing Bisection lesson

  setActiveImageProblem({
    questionId: 'img_q_fp_32',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'Explain this question' });
  assertEquals(ctx.activeProblem?.method, 'false-position');
  assertNotEquals(ctx.activeProblem?.method, 'bisection');
  assertEquals(ctx.activeProblem?.source, 'image');
});

Deno.test('Tutor 6: Image question fourth root of 32 strictly resolves to False Position with interval [2, 3]', () => {
  cleanTestEnvironment();

  setActiveImageProblem({
    questionId: 'img_q_fourth_root_32',
    source: 'image',
    rawExtractedText: 'Use the method of false position to find the fourth root of 32 correct to three decimal places.',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'discovered',
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'Help me solve this' });
  assertEquals(ctx.activeProblem?.method, 'false-position');
  assertEquals(ctx.activeProblem?.lowerBound, 2);
  assertEquals(ctx.activeProblem?.upperBound, 3);
  assertEquals(ctx.activeProblem?.boundsSource, 'discovered');
});

// ============================================================================
// 2. Authoritative Deterministic Solver Grounding
// ============================================================================

Deno.test('Tutor 7: Authoritative solver execution is attached to TutorContext for active problem', () => {
  cleanTestEnvironment();

  setActiveImageProblem({
    questionId: 'img_q_fp_32',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'Solve this' });
  assert(ctx.solverState !== undefined, 'Solver state must be precalculated');
  assertEquals(ctx.solverState?.converged, true);
  assert(ctx.solverState?.iterationsCount! >= 1);
  assertEquals(ctx.solverState?.formattedRoot, '2.378');
});

Deno.test('Tutor 8: Tutor prompt mandates deterministic solver as authoritative single source of numerical truth', () => {
  cleanTestEnvironment();

  const ctx = buildTutorContext({ query: 'What is the root?' });
  const prompt = buildTutorSystemPrompt(ctx);
  assert(prompt.includes('NON-NEGOTIABLE RULE: DETERMINISTIC SOLVER IS AUTHORITATIVE TRUTH'));
  assert(prompt.includes('SINGLE SOURCE OF NUMERICAL TRUTH') || prompt.includes('numerical source of truth'));
});

Deno.test('Tutor 9: Tutor prompt contains exact solver root, iteration count, and step summary', () => {
  cleanTestEnvironment();

  setActivePracticeProblem({
    questionId: 'pq-bis-1',
    source: 'practice',
    method: 'bisection',
    equation: 'x^3 - 4x - 9 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'Explain the steps' });
  const prompt = buildTutorSystemPrompt(ctx);
  assert(prompt.includes('Final Root: 2.706'));
  assert(prompt.includes('AUTHORITATIVE SOLVER EXECUTION'));
  assert(prompt.includes('Refer to these exact iterations'));
});

Deno.test('Tutor 10: Tutor prompt explicitly prohibits recalculating or contradicting deterministic solver', () => {
  cleanTestEnvironment();

  const ctx = buildTutorContext({ query: 'Show me your calculations' });
  const prompt = buildTutorSystemPrompt(ctx);
  assert(prompt.includes('DO NOT recalculate, approximate differently, or invent numerical values'));
  assert(prompt.includes('DO NOT contradict the deterministic engine'));
});

// ============================================================================
// 3. Deterministic Intent Classification
// ============================================================================

Deno.test('Tutor 11: Intent classifier identifies SHOW_SOLUTION from direct answer requests', () => {
  assertEquals(classifyTutorIntent('Show me the complete solution'), 'SHOW_SOLUTION');
  assertEquals(classifyTutorIntent('Give me the answer'), 'SHOW_SOLUTION');
  assertEquals(classifyTutorIntent('What is the final root'), 'SHOW_SOLUTION');
});

Deno.test('Tutor 12: Intent classifier identifies WHY_WRONG from error diagnosis queries', () => {
  assertEquals(classifyTutorIntent('Why was my answer wrong?'), 'WHY_WRONG');
  assertEquals(classifyTutorIntent('Where is my mistake?'), 'WHY_WRONG');
  assertEquals(classifyTutorIntent('What did I do wrong on iteration 2?'), 'WHY_WRONG');
});

Deno.test('Tutor 13: Intent classifier identifies GIVE_HINT from student stuck queries', () => {
  assertEquals(classifyTutorIntent('give me a hint'), 'GIVE_HINT');
  assertEquals(classifyTutorIntent('I am stuck'), 'GIVE_HINT');
  assertEquals(classifyTutorIntent('hint'), 'GIVE_HINT');
});

Deno.test('Tutor 14: Intent classifier identifies EXPLAIN_STEP from interval replacement questions', () => {
  assertEquals(classifyTutorIntent('Why do we replace b in this step?'), 'EXPLAIN_STEP');
  assertEquals(classifyTutorIntent('Explain this step'), 'EXPLAIN_STEP');
  assertEquals(classifyTutorIntent('What is the next step?'), 'EXPLAIN_STEP');
});

Deno.test('Tutor 15: Intent classifier identifies CHECK_MY_WORK from verification requests', () => {
  assertEquals(classifyTutorIntent('Check my work please'), 'CHECK_MY_WORK');
  assertEquals(classifyTutorIntent('Is this correct?'), 'CHECK_MY_WORK');
  assertEquals(classifyTutorIntent('Did I do this right?'), 'CHECK_MY_WORK');
});

Deno.test('Tutor 16: Intent classifier identifies COURSE_QUESTION for Dr. Lodhi and SIT Pune queries', () => {
  assertEquals(classifyTutorIntent('According to our course notes by Dr. Ram Kishun Lodhi'), 'COURSE_QUESTION');
  assertEquals(classifyTutorIntent('How does our course solve this?'), 'COURSE_QUESTION');
  assertEquals(classifyTutorIntent('What did the professor say about initial interval?'), 'COURSE_QUESTION');
});

Deno.test('Tutor 17: Intent classifier identifies COMPARE_METHODS for method comparison queries', () => {
  assertEquals(classifyTutorIntent('Which method converges faster, Bisection vs Newton?'), 'COMPARE_METHODS');
  assertEquals(classifyTutorIntent('Compare Bisection and False Position'), 'COMPARE_METHODS');
});

Deno.test('Tutor 18: Intent classifier identifies PRACTICE_RECOMMENDATION for adaptive next step queries', () => {
  assertEquals(classifyTutorIntent('What should I practice next?'), 'PRACTICE_RECOMMENDATION');
  assertEquals(classifyTutorIntent('Recommend practice'), 'PRACTICE_RECOMMENDATION');
});

// ============================================================================
// 4. Language Mode: English & Hinglish
// ============================================================================

Deno.test('Tutor 19: Language mode defaults to English and persists changes to localStorage', () => {
  cleanTestEnvironment();
  assertEquals(getLanguageMode(), 'english');

  setLanguageMode('hinglish');
  assertEquals(getLanguageMode(), 'hinglish');
});

Deno.test('Tutor 20: Toggling language mode switches between English and Hinglish', () => {
  cleanTestEnvironment();
  assertEquals(getLanguageMode(), 'english');

  const next1 = toggleLanguageMode();
  assertEquals(next1, 'hinglish');
  assertEquals(getLanguageMode(), 'hinglish');

  const next2 = toggleLanguageMode();
  assertEquals(next2, 'english');
  assertEquals(getLanguageMode(), 'english');
});

Deno.test('Tutor 21: Hinglish tutor prompt mandates natural Hindi syntax with standard English math terms', () => {
  cleanTestEnvironment();
  const ctx = buildTutorContext({ query: 'Samjhao', languageMode: 'hinglish' });
  const prompt = buildTutorSystemPrompt(ctx);

  assert(prompt.includes('LANGUAGE MODE: HINGLISH'));
  assert(prompt.includes('Natural Indian Student Phrasing'));
  assert(prompt.includes('DO NOT translate technical mathematical terminology'));
});

Deno.test('Tutor 22: Hinglish rules prohibit translating Bisection, Newton, derivative, convergence', () => {
  cleanTestEnvironment();
  const ctx = buildTutorContext({ query: 'Formula batao', languageMode: 'hinglish' });
  const prompt = buildTutorSystemPrompt(ctx);

  assert(prompt.includes('Method names: Bisection, False Position, Newton-Raphson'));
  assert(prompt.includes('Mathematical entities: derivative, iteration, convergence'));
});

// ============================================================================
// 5. Voice Input & Speech Synthesis Formatter
// ============================================================================

Deno.test('Tutor 23: Voice pronunciation formatter converts powers (x^2, x^3, x^4)', () => {
  const spoken = formatMathForSpeech('Find the root of x^4 - 32 = 0 and x^2 - 4 = 0');
  assert(spoken.includes('x to the fourth power'));
  assert(spoken.includes('x squared'));
  assert(!spoken.includes('x^4'));
});

Deno.test('Tutor 24: Voice pronunciation formatter converts subscripts and expressions (x_0, x_1, x_(n+1))', () => {
  const spoken1 = formatMathForSpeech('We start with initial guess x_0 = 2 and compute x_1');
  assert(spoken1.includes('x sub 0'));
  assert(spoken1.includes('x sub 1'));

  const spoken2 = formatMathForSpeech('Using recurrence x_(n+1) = x_n - f(x_n)/f\'(x_n)');
  assert(spoken2.includes('x sub n plus 1'));
  assert(spoken2.includes('f prime of x sub n'));
});

Deno.test('Tutor 25: Voice pronunciation formatter converts derivatives (f\'(x), f\'\'(x))', () => {
  const spoken = formatMathForSpeech('Since f\'(x) = 4x^3 and f\'\'(x) = 12x^2');
  assert(spoken.includes('f prime of x'));
  assert(spoken.includes('f double prime of x'));
});

Deno.test('Tutor 26: Voice pronunciation formatter converts decimal digits (1.871 -> 1 point 8 7 1)', () => {
  const spoken = formatMathForSpeech('The converged root is 2.378 correct to 3 decimal places');
  assert(spoken.includes('2 point 3 7 8'));
});

Deno.test('Tutor 27: Voice pronunciation formatter strips markdown bold asterisks and code blocks', () => {
  const raw = 'Here is **Step 1:** calculate `x_1` and verify ```json {}``` result.';
  const spoken = formatMathForSpeech(raw);
  assert(!spoken.includes('**'));
  assert(!spoken.includes('`'));
  assert(spoken.includes('Step 1:'));
});

// ============================================================================
// 6. Assessment Safety: Tutor Pausing during Active Assessments
// ============================================================================

Deno.test('Tutor 28: Assessment Safety: askTutor pauses immediately when assessment is active (0 Gemini calls)', async () => {
  cleanTestEnvironment();

  // Active quiz session is set
  saveActiveSession({
    id: 'quiz-sess-1',
    type: 'mixed',
    title: 'Mini Mixed Assessment',
    questionIds: ['pq-bis-1', 'pq-fp-1'],
    answers: {},
    currentIndex: 0,
    flaggedQuestionIds: [],
    startedAt: new Date().toISOString(),
    status: 'active',
  });

  const response = await askTutor({
    query: 'What is the answer to this question?',
    currentPage: 'quiz',
    isAssessmentActive: true,
  });

  assertEquals(response.success, false);
  assertEquals(response.error, 'AI tutor is paused during active assessment.');
  assert(response.reply.includes('AI tutor is paused during active assessment'));
  assertEquals(response.retryable, false);
});

Deno.test('Tutor 29: Assessment Safety: Server chatHandler rejects requests with 403 during active assessment', async () => {
  cleanTestEnvironment();

  const response = await handleChatRequest({
    messages: [{ role: 'user', content: 'Give me the answer' }],
    context: {
      currentPage: 'quiz',
      isAssessmentActive: true,
    },
  });

  assertEquals(response.success, false);
  assertEquals(response.httpStatus, 403);
  assert(Boolean(response.error?.includes('AI tutor is paused during active assessment')));
});

Deno.test('Tutor 30: Assessment Safety: Paused message supports Hinglish mode during assessment', async () => {
  cleanTestEnvironment();

  const response = await askTutor({
    query: 'Answer batao',
    currentPage: 'quiz',
    isAssessmentActive: true,
    languageMode: 'hinglish',
  });

  assertEquals(response.success, false);
  assert(response.reply.includes('Quiz ke dauraan AI tutor paused hai'));
});

// ============================================================================
// 7. Course RAG & Negative Knowledge
// ============================================================================

Deno.test('Tutor 31: Course RAG retrieves official SIT Pune citations for syllabus queries', () => {
  cleanTestEnvironment();

  const ctx = buildTutorContext({
    query: 'What is the official course formula for Bisection method according to Dr. Lodhi at SIT Pune?',
  });

  assert(ctx.courseContext !== undefined);
  assert(ctx.courseContext?.citations.length! > 0);
  assert(ctx.courseContext?.citations.some((c) => c.includes('SIT Pune') || c.includes('Dr. Ram Kishun Lodhi')));
});

Deno.test('Tutor 32: Negative Knowledge: Tutor prompt notes no alternative rule for f\'(x)=0 in Newton-Raphson', () => {
  cleanTestEnvironment();

  const ctx = buildTutorContext({
    query: 'What does our course say if the derivative is zero in Newton-Raphson?',
  });

  const prompt = buildTutorSystemPrompt(ctx);
  assert(
    prompt.includes('According to the official course material, no alternative continuation rule is provided') ||
    prompt.includes('division by zero makes the formula undefined') ||
    prompt.includes('no alternative continuation rule')
  );
});

// ============================================================================
// 8. Adaptive Learning Context Integration
// ============================================================================

Deno.test('Tutor 33: Adaptive learning context attaches topic states and recurring mistakes to tutor prompt', () => {
  cleanTestEnvironment();

  // Record 2 failed attempts with interval selection mistake
  const att1 = startAttempt({
    questionId: 'pq-bis-1',
    source: 'practice',
    method: 'bisection',
  });
  completeAttempt(att1.id, {
    correct: false,
    mistakeCategories: ['wrong-interval-selection'],
  });

  const att2 = startAttempt({
    questionId: 'pq-bis-2',
    source: 'practice',
    method: 'bisection',
  });
  completeAttempt(att2.id, {
    correct: false,
    mistakeCategories: ['wrong-interval-selection'],
  });

  const ctx = buildTutorContext({ query: 'Why did my calculation fail?' });
  const prompt = buildTutorSystemPrompt(ctx);

  assert(prompt.includes('STUDENT LEARNING CONTEXT (ADAPTIVE RECORD)'));
  assert(prompt.includes('wrong-interval-selection') || prompt.includes('Topic State'));
});

// ============================================================================
// 9. Error Handling, Formatting & Robustness
// ============================================================================

Deno.test('Tutor 34: Tutor service rejects empty input gracefully', async () => {
  cleanTestEnvironment();

  const res = await askTutor({ query: '   ' });
  assertEquals(res.success, false);
  assert(res.reply.includes('Please ask a mathematical question'));
});

Deno.test('Tutor 35: Tutor service rejects invalid image file MIME types', async () => {
  cleanTestEnvironment();

  const badFile = new File(['bad'], 'test.pdf', { type: 'application/pdf' });
  const res = await askTutor({
    query: 'What is this?',
    imageFile: badFile,
  });

  assertEquals(res.success, false);
  assert(res.error?.includes('Unsupported image format'));
});

Deno.test('Tutor 36: Tutor service handles mock Gemini response and returns clean tutor reply and speechText', async () => {
  cleanTestEnvironment();

  const mockFetch = async () => {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'To find the root, **Step 1:** evaluate f(a) and f(b). In iteration 1, x_1 = 2.378.',
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const response = await askTutor(
    {
      query: 'Explain step 1',
    },
    {
      envOverride: { GEMINI_API_KEY: 'mock-valid-key' },
      fetchFn: mockFetch as any,
    }
  );

  assertEquals(response.success, true);
  // Asterisk bolding must be stripped
  assert(!response.reply.includes('**'));
  assert(response.reply.includes('Step 1: evaluate f(a) and f(b)'));
  assert(response.speechText !== undefined);
  assert(response.speechText?.includes('2 point 3 7 8'));
});
