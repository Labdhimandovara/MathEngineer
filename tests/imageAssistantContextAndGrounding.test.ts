import { assertEquals, assert } from 'jsr:@std/assert';
import {
  setActiveImageProblem,
  clearActiveImageProblem,
  setActivePracticeProblem,
  clearActivePracticeProblem,
  setActiveLearnLesson,
  resetAllActiveProblems,
  getActiveAssistantContext,
} from '../src/services/problem/activeProblemStore.ts';
import { runDeterministicSolver } from '../src/services/problem/deterministicSolverAdapter.ts';
import { buildSystemPrompt, formatMethodName } from '../src/services/assistant/systemPrompt.ts';
import { handleChatRequest } from '../src/services/assistant/chatHandler.ts';
import { searchKnowledge } from '../src/services/knowledge/knowledgeService.ts';
import { classifyQuery } from '../src/services/knowledge/queryClassifier.ts';
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

function setupCleanEnvironment() {
  resetAllActiveProblems();
  resetLearningHistory();
  saveProgress(createInitialProgressState());
}

// ---------------------------------------------------------------------------
// Test A: False Position image -> assistant context says false-position
// ---------------------------------------------------------------------------
Deno.test('A. False Position image -> assistant context says false-position', () => {
  setupCleanEnvironment();

  setActiveImageProblem({
    questionId: 'img_q_fourth_root_32_fp',
    source: 'image',
    rawExtractedText: 'Use the method of false position to find the fourth root of 32 correct to three decimal places.',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'discovered',
    decimalPlaces: 3,
  });

  const ctx = getActiveAssistantContext('solve');
  assertEquals(ctx.method, 'false-position');
  assertEquals(ctx.source, 'image');
  assertEquals(ctx.equation, 'x^4 - 32 = 0');
  assertEquals(formatMethodName(ctx.method), 'False Position');
  assert(ctx.method !== 'bisection', 'Assistant context must never be bisection for false-position image');
});

// ---------------------------------------------------------------------------
// Test B: Bisection image -> assistant context says bisection
// ---------------------------------------------------------------------------
Deno.test('B. Bisection image -> assistant context says bisection', () => {
  setupCleanEnvironment();

  setActiveImageProblem({
    questionId: 'img_q_bisection_test_1',
    source: 'image',
    rawExtractedText: 'Find a root of x^3 - 9x + 1 = 0 by bisection in [2, 3]',
    equation: 'x^3 - 9x + 1 = 0',
    method: 'bisection',
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'supplied',
    decimalPlaces: 2,
  });

  const ctx = getActiveAssistantContext('solve');
  assertEquals(ctx.method, 'bisection');
  assertEquals(ctx.source, 'image');
  assertEquals(formatMethodName(ctx.method), 'Bisection');
});

// ---------------------------------------------------------------------------
// Test C: Newton image -> assistant context says newton-raphson
// ---------------------------------------------------------------------------
Deno.test('C. Newton image -> assistant context says newton-raphson', () => {
  setupCleanEnvironment();

  setActiveImageProblem({
    questionId: 'img_q_newton_test_1',
    source: 'image',
    rawExtractedText: 'Find root of x^3 - 2x - 5 = 0 using Newton Raphson starting from x0 = 2',
    equation: 'x^3 - 2x - 5 = 0',
    method: 'newton-raphson',
    initialGuess: 2,
    decimalPlaces: 3,
  });

  const ctx = getActiveAssistantContext('solve');
  assertEquals(ctx.method, 'newton-raphson');
  assertEquals(ctx.source, 'image');
  assertEquals(formatMethodName(ctx.method), 'Newton-Raphson');
});

// ---------------------------------------------------------------------------
// Test D: Image problem overrides stale Learn context
// ---------------------------------------------------------------------------
Deno.test('D. Image problem overrides stale Learn context', () => {
  setupCleanEnvironment();

  // Student was studying Bisection in Learn
  setActiveLearnLesson('bisection');
  const learnCtxBefore = getActiveAssistantContext('learn');
  assertEquals(learnCtxBefore.method, 'bisection');

  // Student uploads a False Position image
  setActiveImageProblem({
    questionId: 'img_q_fourth_root_32_fp',
    source: 'image',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  // Assistant context must now be False Position even if still on 'learn' page
  const activeCtx = getActiveAssistantContext('learn');
  assertEquals(activeCtx.method, 'false-position');
  assertEquals(activeCtx.source, 'image');
  assertEquals(formatMethodName(activeCtx.method), 'False Position');

  // Once image problem is cleared, Learn context is restored
  clearActiveImageProblem();
  const restoredCtx = getActiveAssistantContext('learn');
  assertEquals(restoredCtx.method, 'bisection');
});

// ---------------------------------------------------------------------------
// Test E: Image problem overrides stale Practice context
// ---------------------------------------------------------------------------
Deno.test('E. Image problem overrides stale Practice context', () => {
  setupCleanEnvironment();

  // Student was working on Bisection practice question
  setActivePracticeProblem({
    questionId: 'pq-bis-1',
    source: 'practice',
    equation: 'x^3 - 4x - 9 = 0',
    method: 'bisection',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });
  const practiceCtxBefore = getActiveAssistantContext('solve');
  assertEquals(practiceCtxBefore.method, 'bisection');
  assertEquals(practiceCtxBefore.questionId, 'pq-bis-1');

  // Student uploads False Position image
  setActiveImageProblem({
    questionId: 'img_q_fp_override',
    source: 'image',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  // Image problem wins over practice problem
  const activeCtx = getActiveAssistantContext('solve');
  assertEquals(activeCtx.method, 'false-position');
  assertEquals(activeCtx.questionId, 'img_q_fp_override');
  assertEquals(activeCtx.source, 'image');

  // Clear image -> Practice question restored
  clearActiveImageProblem();
  const restoredCtx = getActiveAssistantContext('solve');
  assertEquals(restoredCtx.method, 'bisection');
  assertEquals(restoredCtx.questionId, 'pq-bis-1');
});

// ---------------------------------------------------------------------------
// Test F: False Position image retrieves False Position course knowledge
// ---------------------------------------------------------------------------
Deno.test('F. False Position image retrieves False Position course knowledge', () => {
  const matches = searchKnowledge('false position formula and interval replacement procedure', {
    method: 'false-position',
    topK: 3,
  });

  assert(matches.length > 0);
  for (const m of matches) {
    assertEquals(m.chunk.method, 'false-position');
    assertEquals(m.chunk.documentId, 'doc-unit1-false-position');
    assert(m.source.includes('False position') || m.source.includes('Unit-I'));
  }
});

// ---------------------------------------------------------------------------
// Test G: Bisection image retrieves Bisection course knowledge
// ---------------------------------------------------------------------------
Deno.test('G. Bisection image retrieves Bisection course knowledge', () => {
  const matches = searchKnowledge('bisection method stopping rule and midpoint condition', {
    method: 'bisection',
    topK: 3,
  });

  assert(matches.length > 0);
  for (const m of matches) {
    assertEquals(m.chunk.method, 'bisection');
    assertEquals(m.chunk.documentId, 'doc-unit1-bisection');
    assert(m.source.includes('Bisection') || m.source.includes('Unit-I'));
  }
});

// ---------------------------------------------------------------------------
// Test H: Newton image retrieves Newton-Raphson course knowledge
// ---------------------------------------------------------------------------
Deno.test('H. Newton image retrieves Newton-Raphson course knowledge', () => {
  const matches = searchKnowledge('newton raphson formula and initial guess selection', {
    method: 'newton-raphson',
    topK: 3,
  });

  assert(matches.length > 0);
  for (const m of matches) {
    assertEquals(m.chunk.method, 'newton-raphson');
    assertEquals(m.chunk.documentId, 'doc-unit1-newton-raphson');
    assert(m.source.includes('Newton') || m.source.includes('Unit-I'));
  }
});

// ---------------------------------------------------------------------------
// Test I: Deterministic solver output is included in solution explanation context
// ---------------------------------------------------------------------------
Deno.test('I. Deterministic solver output is included in solution explanation context', () => {
  const solverOutput = runDeterministicSolver({
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  assertEquals(solverOutput.converged, true);
  assertEquals(solverOutput.formattedRoot, '2.378');
  assert(solverOutput.iterationsCount >= 5);
  assert(solverOutput.iterationsSummary.includes('Iteration 1:'));
  assert(solverOutput.iterationsSummary.includes('Iteration 2:'));

  const systemPrompt = buildSystemPrompt({
    currentPage: 'solve',
    questionId: 'img_q_fourth_root_32_fp',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    bounds: [2, 3],
    decimalPlaces: 3,
    bracketDiscovery: {
      a: 2,
      b: 3,
      fa: -16,
      fb: 49,
      explanation: [
        'f(x) = x^4 - 32',
        'f(2) = -16',
        'f(3) = 49',
        'The signs are opposite.',
        'Therefore, [2, 3] is a valid starting interval.',
      ],
    },
    verifiedSolverOutput: solverOutput,
  });

  assert(systemPrompt.includes('VERIFIED DETERMINISTIC SOLVER DATA'));
  assert(systemPrompt.includes('Active Method: False Position'));
  assert(systemPrompt.includes('f(2) = -16'));
  assert(systemPrompt.includes('f(3) = 49'));
  assert(systemPrompt.includes('Root: 2.378'));
  assert(systemPrompt.includes('STRICT INSTRUCTION FOR THE ASSISTANT'));
});

// ---------------------------------------------------------------------------
// Test J: Gemini cannot invent solver iterations because prompt provides verified data
// ---------------------------------------------------------------------------
Deno.test('J. Gemini cannot invent solver iterations because prompt provides verified data', async () => {
  const solverOutput = runDeterministicSolver({
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  let capturedSystemInstruction = '';

  const mockFetch: typeof fetch = async (_url, init) => {
    const body = JSON.parse(init?.body as string);
    capturedSystemInstruction = body.system_instruction?.parts?.[0]?.text || '';
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Step 1: Convert to equation x^4 - 32 = 0. Step 2: f(2) = -16, f(3) = 49. Step 3: By False Position, root is 2.378.',
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const response = await handleChatRequest(
    {
      messages: [{ role: 'user', content: 'Solve this in detail.' }],
      context: {
        currentPage: 'solve',
        source: 'image',
        method: 'false-position',
        equation: 'x^4 - 32 = 0',
        bounds: [2, 3],
        decimalPlaces: 3,
        verifiedSolverOutput: solverOutput,
      },
    },
    { GEMINI_API_KEY: 'test-key-mock' },
    mockFetch
  );

  assertEquals(response.success, true);
  assert(capturedSystemInstruction.includes('False Position'));
  assert(capturedSystemInstruction.includes('VERIFIED DETERMINISTIC SOLVER DATA'));
  assert(capturedSystemInstruction.includes('Root: 2.378'));
  assert(capturedSystemInstruction.includes('DO NOT recalculate or invent different iteration numbers'));
});

// ---------------------------------------------------------------------------
// Test K: Exact image questionId survives solution completion
// ---------------------------------------------------------------------------
Deno.test('K. Exact image questionId survives solution completion', () => {
  setupCleanEnvironment();

  const exactImageId = 'img_q_fourth_root_32_verified';

  setActiveImageProblem({
    questionId: exactImageId,
    source: 'image',
    rawExtractedText: 'Fourth root of 32',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const ctx = getActiveAssistantContext('solve');
  assertEquals(ctx.questionId, exactImageId);

  // Student starts attempt
  const att = startAttempt({
    questionId: ctx.questionId!,
    method: 'false-position',
    topic: 'Image Problem: Fourth Root of 32',
    decimalPlaces: 3,
  });
  assertEquals(att.questionId, exactImageId);

  // Solution completed
  const completed = completeAttempt(att.id, {
    correct: true,
    solutionViewed: true,
    durationSeconds: 45,
  });

  assert(completed !== null);
  assertEquals(completed.questionId, exactImageId);
  assertEquals(completed.method, 'false-position');

  // Verify stored records
  const records = getAttemptsForQuestion(exactImageId);
  assertEquals(records.length, 1);
  assertEquals(records[0].questionId, exactImageId);
});

// ---------------------------------------------------------------------------
// Test L: Show Solution records the exact image problem
// ---------------------------------------------------------------------------
Deno.test('L. Show Solution records the exact image problem in learningStore and progressStore', () => {
  setupCleanEnvironment();

  const exactImageId = 'img_q_fp_show_solution_851';

  setActiveImageProblem({
    questionId: exactImageId,
    source: 'image',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const att = startAttempt({
    questionId: exactImageId,
    method: 'false-position',
    topic: 'False Position Image Problem',
    decimalPlaces: 3,
  });

  completeAttempt(att.id, {
    correct: true,
    solutionViewed: true,
    durationSeconds: 30,
  });

  // Verify in progressStore
  const progress = loadProgress();
  const record = progress.attempts.find((a) => a.questionId === exactImageId);
  assert(record !== undefined);
  assertEquals(record.questionId, exactImageId);
  assertEquals(record.methodId, 'false-position');
  assertEquals(record.isCorrect, true);
  assert(progress.methods['false-position'].questionsSolved >= 1);
});

// ---------------------------------------------------------------------------
// Test M: Existing Phase 7/8 tests remain passing
// ---------------------------------------------------------------------------
Deno.test('M. Existing Phase 7/8 classification and store behavior preserved', () => {
  // Query classification for general vs course-specific
  const courseClass = classifyQuery('What does our course say about Newton-Raphson stopping condition?');
  assertEquals(courseClass.intent, 'COURSE_SPECIFIC');
  assertEquals(courseClass.targetMethod, 'newton-raphson');

  const generalClass = classifyQuery('What is the difference between calculus and linear algebra?');
  assertEquals(generalClass.intent, 'GENERAL');
});
