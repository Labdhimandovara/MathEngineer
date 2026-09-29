/**
 * Tests for False Position Explained Solution Generator
 */

import { assertEquals, assertNotEquals } from 'jsr:@std/assert';
import { solveFalsePosition } from '../src/math/falsePosition/falsePositionSolver.ts';
import { generateFalsePositionExplainedSolution } from '../src/data/falsePositionSolutionExplanation.ts';

Deno.test('FP ExplainedSolution 1: Generates complete structured walkthrough for course problem', () => {
  const result = solveFalsePosition({
    expression: 'cos(x) - x*exp(x)',
    a: 0,
    b: 1,
    decimalPlaces: 4,
  });

  const explained = generateFalsePositionExplainedSolution(result, 'cos(x) - x*exp(x)', 4);
  assertNotEquals(explained, null);
  assertEquals(explained!.problem.initialA, 0);
  assertEquals(explained!.problem.initialB, 1);
  assertEquals(explained!.problem.decimalPlaces, 4);
  assertEquals(explained!.overview.methodName, 'False Position Method (Regula Falsi)');
  assertEquals(explained!.iterations.length, result.iterations.length);
  assertEquals(explained!.finalSummary.formattedRoot, '0.5177');
});

Deno.test('FP ExplainedSolution 2: Step 1 contains proper bracket explanation', () => {
  const result = solveFalsePosition({
    expression: 'cos(x) - x*exp(x)',
    a: 0,
    b: 1,
    decimalPlaces: 4,
  });

  const explained = generateFalsePositionExplainedSolution(result, 'cos(x) - x*exp(x)', 4);
  const firstIter = explained!.iterations[0];
  assertEquals(firstIter.iterationNumber, 1);
  assertEquals(firstIter.n, 0);
  assertEquals(firstIter.a, 0);
  assertEquals(firstIter.b, 1);
  assertEquals(firstIter.intervalTitle.includes('a_0'), true);
});

Deno.test('FP ExplainedSolution 3: Step 2 displays secant chord formula and substitution', () => {
  const result = solveFalsePosition({
    expression: 'cos(x) - x*exp(x)',
    a: 0,
    b: 1,
    decimalPlaces: 4,
  });

  const explained = generateFalsePositionExplainedSolution(result, 'cos(x) - x*exp(x)', 4);
  const firstIter = explained!.iterations[0];
  assertEquals(firstIter.formulaDisplay.includes('[a_n · f(b_n) - b_n · f(a_n)]'), true);
  assertEquals(firstIter.approximationResult, firstIter.c.toFixed(4));
});

Deno.test('FP ExplainedSolution 4: Step 3 evaluates function at secant intercept', () => {
  const result = solveFalsePosition({
    expression: 'cos(x) - x*exp(x)',
    a: 0,
    b: 1,
    decimalPlaces: 4,
  });

  const explained = generateFalsePositionExplainedSolution(result, 'cos(x) - x*exp(x)', 4);
  const firstIter = explained!.iterations[0];
  assertEquals(firstIter.functionFormula.includes(firstIter.c.toFixed(4)), true);
  assertEquals(firstIter.functionResult, firstIter.f_c.toFixed(4));
});

Deno.test('FP ExplainedSolution 5: Step 4 explains endpoint replacement rule', () => {
  const result = solveFalsePosition({
    expression: 'cos(x) - x*exp(x)',
    a: 0,
    b: 1,
    decimalPlaces: 4,
  });

  const explained = generateFalsePositionExplainedSolution(result, 'cos(x) - x*exp(x)', 4);
  const firstIter = explained!.iterations[0];
  assertEquals(firstIter.signComparisonExplanation.includes('Therefore, we replace'), true);
  assertEquals(firstIter.retainedIntervalDisplay.includes('['), true);
});

Deno.test('FP ExplainedSolution 6: Stopping condition accurately stated in final summary', () => {
  const result = solveFalsePosition({
    expression: 'cos(x) - x*exp(x)',
    a: 0,
    b: 1,
    decimalPlaces: 4,
  });

  const explained = generateFalsePositionExplainedSolution(result, 'cos(x) - x*exp(x)', 4);
  assertEquals(explained!.finalSummary.accuracyDecimalPlaces, 4);
  assertEquals(explained!.finalSummary.whyThisIsTheAnswer.includes('0.5177'), true);
});

Deno.test('FP ExplainedSolution 7: Returns null on failed solver result (e.g. unbracketed)', () => {
  const result = solveFalsePosition({
    expression: 'x^2 + 1',
    a: 1,
    b: 2,
    decimalPlaces: 4,
  });

  const explained = generateFalsePositionExplainedSolution(result, 'x^2 + 1', 4);
  assertEquals(explained, null);
});

Deno.test('FP ExplainedSolution 8: Dynamic evaluation on different polynomial equation', () => {
  const result = solveFalsePosition({
    expression: 'x^3 - 2x - 5',
    a: 2,
    b: 3,
    decimalPlaces: 3,
  });

  const explained = generateFalsePositionExplainedSolution(result, 'x^3 - 2x - 5', 3);
  assertNotEquals(explained, null);
  assertEquals(explained!.problem.expression, 'x^3 - 2x - 5');
  assertEquals(explained!.iterations[0].a, 2);
  assertEquals(explained!.iterations[0].b, 3);
});
