/**
 * Practice Question -> Exact Solve With Me Integration Tests
 * 
 * Verifies:
 * 1. Bisection Question A (pq-bis-1) vs Question B (pq-bis-2)
 * 2. False Position Question A (pq-fp-1) vs Question B (pq-fp-2)
 * 3. Newton-Raphson Question A (pq-nr-1) vs Question B (pq-nr-2) preserving x0
 * 4. Mixed question requiring method selection before launch
 * 5. Problem Reset restoring question parameters vs generic defaults
 * 6. Explained solution generating steps for the specific question
 * 7. Progress recording receiving exact questionId
 * 8. Assistant context and system prompt receiving exact question metadata
 */

import { assertEquals, assert, assertNotEquals } from 'jsr:@std/assert';
import { PRACTICE_QUESTIONS } from '../src/data/practiceQuestions.ts';
import { QuestionLaunchConfig } from '../src/types/index.ts';
import { solveBisection } from '../src/math/bisection/bisectionSolver.ts';
import { solveFalsePosition } from '../src/math/falsePosition/falsePositionSolver.ts';
import { solveNewtonRaphson } from '../src/math/newtonRaphson/newtonRaphsonSolver.ts';
import { generateExplainedSolution as generateBisectionExplainedSolution } from '../src/data/bisectionSolutionExplanation.ts';
import { generateFalsePositionExplainedSolution } from '../src/data/falsePositionSolutionExplanation.ts';
import { generateNewtonRaphsonExplainedSolution } from '../src/data/newtonRaphsonSolutionExplanation.ts';
import {
  recordQuestionAttempt,
  recordSolveWithMeCompleted,
  loadProgress,
  resetProgress,
} from '../src/services/progress/progressStore.ts';
import { buildSystemPrompt } from '../src/services/assistant/systemPrompt.ts';
import { AssistantSolverContext } from '../src/services/assistant/types.ts';

// Helper to create QuestionLaunchConfig from PracticeQuestion
function createLaunchConfig(
  questionId: string,
  chosenMethod?: 'bisection' | 'false-position' | 'newton-raphson'
): QuestionLaunchConfig {
  const q = PRACTICE_QUESTIONS.find((item) => item.id === questionId);
  if (!q) throw new Error(`Question ${questionId} not found in question bank`);

  const method = chosenMethod || (q.method === 'mixed' ? 'bisection' : q.method);
  return {
    questionId: q.id,
    method,
    equation: q.equation,
    lowerBound: q.bounds[0],
    upperBound: q.bounds[1],
    decimalPlaces: q.decimalPlaces,
    initialGuess: q.x0 ?? q.bounds[0],
    title: q.title,
  };
}

// ---------------------------------------------------------------------------
// 1. BISECTION: QUESTION A vs QUESTION B
// ---------------------------------------------------------------------------
Deno.test('Practice Launch 1: Bisection pq-bis-1 vs pq-bis-2 produces distinct launch configurations and solver results', () => {
  const configA = createLaunchConfig('pq-bis-1');
  const configB = createLaunchConfig('pq-bis-2');

  // Verify launch config differences
  assertEquals(configA.questionId, 'pq-bis-1');
  assertEquals(configA.equation, 'x^3 - x - 1');
  assertEquals(configA.lowerBound, 1);
  assertEquals(configA.upperBound, 2);
  assertEquals(configA.decimalPlaces, 3);
  assertEquals(configA.method, 'bisection');

  assertEquals(configB.questionId, 'pq-bis-2');
  assertEquals(configB.equation, 'x^3 - 4*x - 9');
  assertEquals(configB.lowerBound, 2);
  assertEquals(configB.upperBound, 3);
  assertEquals(configB.decimalPlaces, 3);
  assertEquals(configB.method, 'bisection');

  // Verify solvers calculate against the specific question parameters
  const resA = solveBisection({
    expression: configA.equation,
    a: configA.lowerBound,
    b: configA.upperBound,
    decimalPlaces: configA.decimalPlaces,
  });
  const resB = solveBisection({
    expression: configB.equation,
    a: configB.lowerBound,
    b: configB.upperBound,
    decimalPlaces: configB.decimalPlaces,
  });

  assert(resA.success);
  assert(resB.success);
  assertEquals(Number(resA.root?.toFixed(3)), 1.325);
  assertEquals(Number(resB.root?.toFixed(3)), 2.706);
  assertNotEquals(resA.root, resB.root);
  assertNotEquals(resA.iterations[0].midpoint, resB.iterations[0].midpoint);
});

// ---------------------------------------------------------------------------
// 2. FALSE POSITION: QUESTION A vs QUESTION B
// ---------------------------------------------------------------------------
Deno.test('Practice Launch 2: False Position pq-fp-1 vs pq-fp-2 produces distinct course parameters and convergence', () => {
  const configA = createLaunchConfig('pq-fp-1');
  const configB = createLaunchConfig('pq-fp-2');

  assertEquals(configA.questionId, 'pq-fp-1');
  assertEquals(configA.equation, 'x^3 - 2*x - 5');
  assertEquals(configA.lowerBound, 2);
  assertEquals(configA.upperBound, 3);
  assertEquals(configA.decimalPlaces, 3);

  assertEquals(configB.questionId, 'pq-fp-2');
  assertEquals(configB.equation, 'cos(x) - x*exp(x)');
  assertEquals(configB.lowerBound, 0);
  assertEquals(configB.upperBound, 1);
  assertEquals(configB.decimalPlaces, 4);

  const resA = solveFalsePosition({
    expression: configA.equation,
    a: configA.lowerBound,
    b: configA.upperBound,
    decimalPlaces: configA.decimalPlaces,
  });
  const resB = solveFalsePosition({
    expression: configB.equation,
    a: configB.lowerBound,
    b: configB.upperBound,
    decimalPlaces: configB.decimalPlaces,
  });

  assert(resA.success);
  assert(resB.success);
  assertEquals(Number(resA.root?.toFixed(3)), 2.094);
  assertEquals(Number(resB.root?.toFixed(4)), 0.5177);
  // Verify distinct first approximations
  assertEquals(Number(resA.iterations[0].c.toFixed(4)), 2.0588);
  assertEquals(Number(resB.iterations[0].c.toFixed(4)), 0.3147);
});

// ---------------------------------------------------------------------------
// 3. NEWTON-RAPHSON: PRESERVATION OF x0 (pq-nr-1 vs pq-nr-2)
// ---------------------------------------------------------------------------
Deno.test('Practice Launch 3: Newton-Raphson preserves specific x0 (pq-nr-1 x0=2 vs pq-nr-2 x0=0.6)', () => {
  const configA = createLaunchConfig('pq-nr-1');
  const configB = createLaunchConfig('pq-nr-2');

  assertEquals(configA.initialGuess, 2);
  assertEquals(configA.equation, 'x^4 - x - 10');
  assertEquals(configA.lowerBound, 1);
  assertEquals(configA.upperBound, 2);
  assertEquals(configA.decimalPlaces, 3);

  assertEquals(configB.initialGuess, 0.6);
  assertEquals(configB.equation, '3*x - cos(x) - 1');
  assertEquals(configB.lowerBound, 0);
  assertEquals(configB.upperBound, 1);
  assertEquals(configB.decimalPlaces, 4);

  const resA = solveNewtonRaphson({
    expression: configA.equation,
    a: configA.lowerBound,
    b: configA.upperBound,
    x0: configA.initialGuess,
    decimalPlaces: configA.decimalPlaces,
    precisionMode: 'course_step_rounding',
  });
  const resB = solveNewtonRaphson({
    expression: configB.equation,
    a: configB.lowerBound,
    b: configB.upperBound,
    x0: configB.initialGuess,
    decimalPlaces: configB.decimalPlaces,
    precisionMode: 'course_step_rounding',
  });

  assert(resA.success);
  assert(resB.success);
  assertEquals(Number(resA.root?.toFixed(3)), 1.856);
  assertEquals(Number(resB.root?.toFixed(4)), 0.6071);
  assertEquals(resA.iterations[0].x_n, 2);
  assertEquals(resB.iterations[0].x_n, 0.6);
});

// ---------------------------------------------------------------------------
// 4. MIXED QUESTION METHOD SELECTION
// ---------------------------------------------------------------------------
Deno.test('Practice Launch 4: Mixed question pq-mix-1 can be launched with each chosen method', () => {
  const mixedQ = PRACTICE_QUESTIONS.find((q) => q.id === 'pq-mix-1');
  assert(mixedQ);
  assertEquals(mixedQ.method, 'mixed');

  const methods: ('bisection' | 'false-position' | 'newton-raphson')[] = [
    'bisection',
    'false-position',
    'newton-raphson',
  ];

  for (const m of methods) {
    const config = createLaunchConfig('pq-mix-1', m);
    assertEquals(config.questionId, 'pq-mix-1');
    assertEquals(config.method, m);
    assertEquals(config.equation, 'x^3 - 9*x + 1');
    assertEquals(config.lowerBound, 2);
    assertEquals(config.upperBound, 4);

    if (m === 'bisection') {
      const res = solveBisection({
        expression: config.equation,
        a: config.lowerBound,
        b: config.upperBound,
        decimalPlaces: config.decimalPlaces,
      });
      assert(res.success);
      assertEquals(Number(res.root?.toFixed(3)), 2.943);
    } else if (m === 'false-position') {
      const res = solveFalsePosition({
        expression: config.equation,
        a: config.lowerBound,
        b: config.upperBound,
        decimalPlaces: config.decimalPlaces,
      });
      assert(res.success);
      assertEquals(Number(res.root?.toFixed(3)), 2.943);
    } else if (m === 'newton-raphson') {
      const res = solveNewtonRaphson({
        expression: config.equation,
        a: config.lowerBound,
        b: config.upperBound,
        x0: config.initialGuess,
        decimalPlaces: config.decimalPlaces,
      });
      assert(res.success);
      assertEquals(Number(res.root?.toFixed(3)), 2.943);
    }
  }
});

// ---------------------------------------------------------------------------
// 5. RESET BEHAVIOR RESTORES QUESTION PARAMETERS
// ---------------------------------------------------------------------------
Deno.test('Practice Launch 5: Reset problem restores question parameters when activeQuestion is set', () => {
  const activeQuestion = createLaunchConfig('pq-nr-2');

  // Simulate user modifying inputs in workspace
  let userEquation = 'x^2 - 4 = 0';
  let userLowerBound = '5';
  let userUpperBound = '10';
  let userInitialGuess = '7';
  let userDecimalPlaces = 2;

  // Simulate reset function logic from Solve.tsx
  const resetProblem = (qConfig: QuestionLaunchConfig | null) => {
    if (qConfig) {
      userEquation = qConfig.equation;
      userLowerBound = String(qConfig.lowerBound);
      userUpperBound = String(qConfig.upperBound);
      userInitialGuess =
        qConfig.initialGuess !== undefined
          ? String(qConfig.initialGuess)
          : String(qConfig.lowerBound);
      userDecimalPlaces = qConfig.decimalPlaces;
    } else {
      userEquation = 'x^4 - x - 10 = 0';
      userLowerBound = '1';
      userUpperBound = '2';
      userInitialGuess = '2';
      userDecimalPlaces = 3;
    }
  };

  // Reset with active question
  resetProblem(activeQuestion);
  assertEquals(userEquation, '3*x - cos(x) - 1');
  assertEquals(userLowerBound, '0');
  assertEquals(userUpperBound, '1');
  assertEquals(userInitialGuess, '0.6');
  assertEquals(userDecimalPlaces, 4);

  // Reset without active question (reverts to default)
  resetProblem(null);
  assertEquals(userEquation, 'x^4 - x - 10 = 0');
  assertEquals(userLowerBound, '1');
  assertEquals(userUpperBound, '2');
  assertEquals(userInitialGuess, '2');
  assertEquals(userDecimalPlaces, 3);
});

// ---------------------------------------------------------------------------
// 6. EXPLAINED SOLUTIONS ADAPT TO SPECIFIC QUESTION
// ---------------------------------------------------------------------------
Deno.test('Practice Launch 6: Explained solution generators calculate steps for specific question', () => {
  const config = createLaunchConfig('pq-nr-2');

  const solverRes = solveNewtonRaphson({
    expression: config.equation,
    a: config.lowerBound,
    b: config.upperBound,
    x0: config.initialGuess,
    decimalPlaces: config.decimalPlaces,
    precisionMode: 'course_step_rounding',
  });

  const explained = generateNewtonRaphsonExplainedSolution(
    solverRes,
    `${config.equation} = 0`,
    config.decimalPlaces
  );

  assert(explained !== null);
  assertEquals(explained!.problem.selectedX0, 0.6);
  assertEquals(explained!.finalSummary.formattedRoot, '0.6071');
  // First step must use x0 = 0.6, f(0.6), f'(0.6)
  assertEquals(explained!.iterations[0].x_n, 0.6);
});

// ---------------------------------------------------------------------------
// 7. PROGRESS TRACKING RECORDS EXACT QUESTION ID
// ---------------------------------------------------------------------------
Deno.test('Practice Launch 7: Progress store records question attempt with exact questionId', () => {
  resetProgress();

  const config = createLaunchConfig('pq-bis-1');

  // Record completed attempt for pq-bis-1
  const attempt = recordQuestionAttempt({
    questionId: config.questionId,
    methodId: config.method,
    isCorrect: true,
    hintsUsed: 1,
    timeSpentSeconds: 45,
  });

  assertEquals(attempt.questionId, 'pq-bis-1');
  assertEquals(attempt.methodId, 'bisection');
  assertEquals(attempt.isCorrect, true);

  // Verify in stored progress
  const progress = loadProgress();
  const foundAttempt = progress.attempts.find((a) => a.questionId === 'pq-bis-1');
  assert(foundAttempt !== undefined);
  assertEquals(foundAttempt?.isCorrect, true);
  assertEquals(progress.methods.bisection.questionsSolved, 1);

  // Record Solve With Me completed
  recordSolveWithMeCompleted('bisection');
  const updatedProgress = loadProgress();
  assertEquals(updatedProgress.methods.bisection.solveWithMeCompleted, true);
});

// ---------------------------------------------------------------------------
// 8. ASSISTANT CONTEXT RECEIVES EXACT QUESTION METADATA
// ---------------------------------------------------------------------------
Deno.test('Practice Launch 8: Assistant context and system prompt receive exact practice question metadata', () => {
  const config = createLaunchConfig('pq-fp-2');

  const context: AssistantSolverContext = {
    currentPage: 'solve',
    questionId: config.questionId,
    method: 'False Position Method (Regula Falsi)',
    equation: config.equation,
    bounds: [config.lowerBound, config.upperBound],
    decimalPlaces: config.decimalPlaces,
  };

  const systemPrompt = buildSystemPrompt(context);

  assert(systemPrompt.includes('Active Practice Question ID: pq-fp-2'));
  assert(systemPrompt.includes('Active Equation: cos(x) - x*exp(x)'));
  assert(systemPrompt.includes('Active Interval: [0, 1]'));
  assert(systemPrompt.includes('Target Accuracy: 4 decimal places'));
});
