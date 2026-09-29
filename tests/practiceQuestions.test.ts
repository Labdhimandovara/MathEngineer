import { assertEquals, assert } from 'jsr:@std/assert';
import { PRACTICE_QUESTIONS } from '../src/data/practiceQuestions.ts';
import { solveBisection } from '../src/math/bisection/bisectionSolver.ts';
import { solveFalsePosition } from '../src/math/falsePosition/falsePositionSolver.ts';
import { solveNewtonRaphson } from '../src/math/newtonRaphson/newtonRaphsonSolver.ts';

Deno.test('Practice Questions 1: Question bank has exactly 20 verified questions', () => {
  assertEquals(PRACTICE_QUESTIONS.length, 20);

  const bisection = PRACTICE_QUESTIONS.filter((q) => q.method === 'bisection');
  const falsePosition = PRACTICE_QUESTIONS.filter((q) => q.method === 'false-position');
  const newton = PRACTICE_QUESTIONS.filter((q) => q.method === 'newton-raphson');
  const mixed = PRACTICE_QUESTIONS.filter((q) => q.method === 'mixed');

  assertEquals(bisection.length, 5);
  assertEquals(falsePosition.length, 5);
  assertEquals(newton.length, 5);
  assertEquals(mixed.length, 5);
});

Deno.test('Practice Questions 2: All 5 Bisection questions converge to expected root', () => {
  const bisection = PRACTICE_QUESTIONS.filter((q) => q.method === 'bisection');

  for (const q of bisection) {
    const res = solveBisection({
      expression: q.equation,
      a: q.bounds[0],
      b: q.bounds[1],
      decimalPlaces: q.decimalPlaces,
      maxIterations: 50,
    });

    assert(res.success, `Bisection solver failed on ${q.id}: ${res.error}`);
    assert(res.root !== undefined);
    const roundedRoot = Number(res.root.toFixed(q.decimalPlaces));
    assertEquals(
      roundedRoot,
      q.expectedRoot,
      `Bisection root mismatch for ${q.id}: got ${roundedRoot}, expected ${q.expectedRoot}`
    );
  }
});

Deno.test('Practice Questions 3: All 5 False Position questions converge to expected root', () => {
  const fp = PRACTICE_QUESTIONS.filter((q) => q.method === 'false-position');

  for (const q of fp) {
    const res = solveFalsePosition({
      expression: q.equation,
      a: q.bounds[0],
      b: q.bounds[1],
      decimalPlaces: q.decimalPlaces,
      maxIterations: 50,
    });

    assert(res.success, `False Position solver failed on ${q.id}: ${res.error}`);
    assert(res.root !== undefined);
    const roundedRoot = Number(res.root.toFixed(q.decimalPlaces));
    assertEquals(
      roundedRoot,
      q.expectedRoot,
      `False Position root mismatch for ${q.id}: got ${roundedRoot}, expected ${q.expectedRoot}`
    );
  }
});

Deno.test('Practice Questions 4: All 5 Newton-Raphson questions converge to expected root', () => {
  const nr = PRACTICE_QUESTIONS.filter((q) => q.method === 'newton-raphson');

  for (const q of nr) {
    const res = solveNewtonRaphson({
      expression: q.equation,
      a: q.bounds[0],
      b: q.bounds[1],
      x0: q.x0,
      decimalPlaces: q.decimalPlaces,
      maxIterations: 30,
    });

    assert(res.success, `Newton-Raphson solver failed on ${q.id}: ${res.error}`);
    assert(res.root !== undefined);
    const roundedRoot = Number(res.root.toFixed(q.decimalPlaces));
    assertEquals(
      roundedRoot,
      q.expectedRoot,
      `Newton-Raphson root mismatch for ${q.id}: got ${roundedRoot}, expected ${q.expectedRoot}`
    );
  }
});

Deno.test('Practice Questions 5: Mixed questions are valid under bracketing solvers', () => {
  const mixed = PRACTICE_QUESTIONS.filter((q) => q.method === 'mixed');

  for (const q of mixed) {
    const res = solveBisection({
      expression: q.equation,
      a: q.bounds[0],
      b: q.bounds[1],
      decimalPlaces: q.decimalPlaces,
      maxIterations: 50,
    });

    assert(res.success, `Mixed question failed on Bisection ${q.id}: ${res.error}`);
    assert(res.root !== undefined);
    const roundedRoot = Number(res.root.toFixed(q.decimalPlaces));
    assertEquals(
      roundedRoot,
      q.expectedRoot,
      `Mixed question root mismatch for ${q.id}: got ${roundedRoot}, expected ${q.expectedRoot}`
    );
  }
});
