import { assertEquals, assert } from 'jsr:@std/assert';
import { solveBisection } from '../src/math/bisection/bisectionSolver.ts';
import { solveFalsePosition } from '../src/math/falsePosition/falsePositionSolver.ts';
import { solveNewtonRaphson } from '../src/math/newtonRaphson/newtonRaphsonSolver.ts';

Deno.test('Method Comparison 1: All 3 methods converge on cubic x^3 - 2x - 5 = 0', () => {
  const eq = 'x^3 - 2*x - 5';
  const a = 2;
  const b = 3;
  const dp = 3;

  const bis = solveBisection({ expression: eq, a, b, decimalPlaces: dp, maxIterations: 40 });
  const fp = solveFalsePosition({ expression: eq, a, b, decimalPlaces: dp, maxIterations: 40 });
  const nr = solveNewtonRaphson({ expression: eq, a, b, x0: 2, decimalPlaces: dp, maxIterations: 30 });

  assert(bis.success);
  assert(fp.success);
  assert(nr.success);

  assert(Math.abs((bis.root ?? 0) - 2.094) < 0.002);
  assert(Math.abs((fp.root ?? 0) - 2.094) < 0.002);
  assert(Math.abs((nr.root ?? 0) - 2.094) < 0.002);

  // Newton converges in fewest iterations, False Position second, Bisection third
  assert(nr.iterations.length < fp.iterations.length, `Expected NR (${nr.iterations.length}) < FP (${fp.iterations.length})`);
  assert(fp.iterations.length < bis.iterations.length, `Expected FP (${fp.iterations.length}) < Bis (${bis.iterations.length})`);
});

Deno.test('Method Comparison 2: Transcendental cos(x) - x*exp(x) solves under all 3 methods', () => {
  const eq = 'cos(x) - x*exp(x)';
  const a = 0;
  const b = 1;
  const dp = 4;

  const bis = solveBisection({ expression: eq, a, b, decimalPlaces: dp, maxIterations: 40 });
  const fp = solveFalsePosition({ expression: eq, a, b, decimalPlaces: dp, maxIterations: 40 });
  const nr = solveNewtonRaphson({ expression: eq, a, b, x0: 0, decimalPlaces: dp, maxIterations: 30 });

  assert(bis.success);
  assert(fp.success);
  assert(nr.success);

  // All converge within 0.002 of the true root 0.5177
  assert(Math.abs((bis.root ?? 0) - 0.5177) < 0.002);
  assert(Math.abs((fp.root ?? 0) - 0.5177) < 0.002);
  assert(Math.abs((nr.root ?? 0) - 0.5177) < 0.002);
});
