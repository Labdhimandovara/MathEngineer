/**
 * Tests for Newton-Raphson Explained Solution Generator
 */

import { assertEquals, assertNotEquals } from 'jsr:@std/assert';
import { solveNewtonRaphson } from '../src/math/newtonRaphson/newtonRaphsonSolver.ts';
import { generateNewtonRaphsonExplainedSolution } from '../src/data/newtonRaphsonSolutionExplanation.ts';

Deno.test('Newton ExplainedSolution 1: Generates structured walkthrough for course problem', () => {
  const result = solveNewtonRaphson({
    expression: 'x^4 - x - 10',
    a: 1,
    b: 2,
    x0: 2,
    decimalPlaces: 3,
    precisionMode: 'course_step_rounding',
  });

  const explained = generateNewtonRaphsonExplainedSolution(result, 'x^4 - x - 10 = 0', 3);
  assertNotEquals(explained, null);
  assertEquals(explained!.problem.selectedX0, 2);
  assertEquals(explained!.problem.decimalPlaces, 3);
  assertEquals(explained!.overview.methodName, 'Newton-Raphson Method (Tangent Method)');
  assertEquals(explained!.iterations.length, 3);
  assertEquals(explained!.finalSummary.formattedRoot, '1.856');
});

Deno.test('Newton ExplainedSolution 2: Step 1 shows current approximation point', () => {
  const result = solveNewtonRaphson({
    expression: 'x^4 - x - 10',
    a: 1,
    b: 2,
    x0: 2,
    decimalPlaces: 3,
    precisionMode: 'course_step_rounding',
  });

  const explained = generateNewtonRaphsonExplainedSolution(result, 'x^4 - x - 10 = 0', 3);
  const it0 = explained!.iterations[0];
  assertEquals(it0.currentPointTitle.includes('x_0 = 2.0000'), true);
  assertEquals(it0.x_n, 2);
});

Deno.test('Newton ExplainedSolution 3: Step 2 evaluates f(2) = 4.0000', () => {
  const result = solveNewtonRaphson({
    expression: 'x^4 - x - 10',
    a: 1,
    b: 2,
    x0: 2,
    decimalPlaces: 3,
    precisionMode: 'course_step_rounding',
  });

  const explained = generateNewtonRaphsonExplainedSolution(result, 'x^4 - x - 10 = 0', 3);
  const it0 = explained!.iterations[0];
  assertEquals(it0.functionResult, '4.0000');
});

Deno.test('Newton ExplainedSolution 4: Step 3 evaluates f\'(2) = 31.0000', () => {
  const result = solveNewtonRaphson({
    expression: 'x^4 - x - 10',
    a: 1,
    b: 2,
    x0: 2,
    decimalPlaces: 3,
    precisionMode: 'course_step_rounding',
  });

  const explained = generateNewtonRaphsonExplainedSolution(result, 'x^4 - x - 10 = 0', 3);
  const it0 = explained!.iterations[0];
  assertEquals(it0.derivativeResult, '31.0000');
});

Deno.test('Newton ExplainedSolution 5: Step 4 applies tangent formula yielding 1.8710', () => {
  const result = solveNewtonRaphson({
    expression: 'x^4 - x - 10',
    a: 1,
    b: 2,
    x0: 2,
    decimalPlaces: 3,
    precisionMode: 'course_step_rounding',
  });

  const explained = generateNewtonRaphsonExplainedSolution(result, 'x^4 - x - 10 = 0', 3);
  const it0 = explained!.iterations[0];
  assertEquals(it0.approximationResult, '1.871');
  assertEquals(it0.substitutionDisplay.includes('2.0000 - (4.0000) / (31.0000)'), true);
});

Deno.test('Newton ExplainedSolution 6: Iteration 2 and 3 reproduce sequence 1.871 -> 1.856 -> 1.856', () => {
  const result = solveNewtonRaphson({
    expression: 'x^4 - x - 10',
    a: 1,
    b: 2,
    x0: 2,
    decimalPlaces: 3,
    precisionMode: 'course_step_rounding',
  });

  const explained = generateNewtonRaphsonExplainedSolution(result, 'x^4 - x - 10 = 0', 3);
  assertEquals(explained!.iterations[0].approximationResult, '1.871');
  assertEquals(explained!.iterations[1].approximationResult, '1.856');
  assertEquals(explained!.iterations[2].approximationResult, '1.856');
});

Deno.test('Newton ExplainedSolution 7: Stopping condition justification clearly stated', () => {
  const result = solveNewtonRaphson({
    expression: 'x^4 - x - 10',
    a: 1,
    b: 2,
    x0: 2,
    decimalPlaces: 3,
    precisionMode: 'course_step_rounding',
  });

  const explained = generateNewtonRaphsonExplainedSolution(result, 'x^4 - x - 10 = 0', 3);
  assertEquals(explained!.finalSummary.accuracyDecimalPlaces, 3);
  assertEquals(explained!.finalSummary.whyThisIsTheAnswer.includes('1.856'), true);
});

Deno.test('Newton ExplainedSolution 8: Returns null on failed solver result', () => {
  const result = solveNewtonRaphson({
    expression: 'x^2 + 1',
    a: 1,
    b: 2,
    x0: 1,
  });

  const explained = generateNewtonRaphsonExplainedSolution(result, 'x^2 + 1', 3);
  assertEquals(explained, null);
});

Deno.test('Newton ExplainedSolution 9: Dynamic generation for cubic polynomial x^3 - 2x - 5 = 0', () => {
  const result = solveNewtonRaphson({
    expression: 'x^3 - 2x - 5',
    a: 2,
    b: 3,
    x0: 2,
    decimalPlaces: 3,
  });

  const explained = generateNewtonRaphsonExplainedSolution(result, 'x^3 - 2x - 5', 3);
  assertNotEquals(explained, null);
  assertEquals(explained!.problem.expression, 'x^3 - 2x - 5');
  assertEquals(explained!.iterations[0].x_n, 2);
});
