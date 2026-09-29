import { assertEquals, assert, assertAlmostEquals } from "jsr:@std/assert@1";
import {
  solveNewtonRaphson,
  resolveDerivative,
  differentiateAST,
  simplifyAST,
  astToString,
} from "../src/math/newtonRaphson/index.ts";
import { compileExpression } from "../src/math/expressionParser.ts";

// 1. Newton-Raphson formula computation
Deno.test("NewtonRaphson Test 1: Single step matches exact formula x_(n+1) = x_n - f(x_n)/f'(x_n)", () => {
  // f(x) = x^4 - x - 10, f'(x) = 4x^3 - 1, x_0 = 2
  // f(2) = 16 - 2 - 10 = 4
  // f'(2) = 4(8) - 1 = 31
  // x_1 = 2 - 4/31 = 1.8709677419...
  const result = solveNewtonRaphson({
    expression: "x^4 - x - 10",
    x0: 2,
    maxIterations: 1,
    precisionMode: "full_precision",
  });

  assert(result.iterations.length === 1);
  const iter0 = result.iterations[0];
  assertEquals(iter0.n, 0);
  assertEquals(iter0.x_n, 2);
  assertEquals(iter0.f_x, 4);
  assertEquals(iter0.f_prime_x, 31);
  assertAlmostEquals(iter0.x_next, 2 - 4 / 31, 1e-12);
  assertEquals(iter0.formatted_x_next, "1.871");
});

// 2. Derivative evaluation
Deno.test("NewtonRaphson Test 2: Symbolic differentiator correctly differentiates course expressions", () => {
  // Course example: x^4 - x - 10 -> f'(x) = 4x^3 - 1
  const deriv1 = resolveDerivative("x^4 - x - 10");
  assertAlmostEquals(deriv1.fn(2), 31, 1e-12);
  assertAlmostEquals(deriv1.fn(1), 3, 1e-12);

  // Course Q.1: 3x - cos(x) - 1 -> f'(x) = 3 + sin(x)
  const deriv2 = resolveDerivative("3*x - cos(x) - 1");
  assertAlmostEquals(deriv2.fn(0), 3, 1e-12);
  assertAlmostEquals(deriv2.fn(Math.PI / 2), 4, 1e-12);

  // Course Q.2: x^3 - 2x - 5 -> f'(x) = 3x^2 - 2
  const deriv3 = resolveDerivative("x^3 - 2*x - 5");
  assertAlmostEquals(deriv3.fn(2), 10, 1e-12);
  assertAlmostEquals(deriv3.fn(0), -2, 1e-12);
});

// 3. Course initial-guess selection (|f(x_0)| = min(|f(a)|, |f(b)|))
Deno.test("NewtonRaphson Test 3: Selects endpoint whose |f(x)| is closer to 0", () => {
  // f(x) = x^4 - x - 10 on [1, 2]:
  // f(1) = -10, f(2) = 4
  // Since |4| < |-10|, x_0 must be selected as 2
  const result = solveNewtonRaphson({
    expression: "x^4 - x - 10",
    a: 1,
    b: 2,
    decimalPlaces: 3,
  });

  assertEquals(result.selected_x0, 2);
  assert(result.x0_selection_reason?.includes("closer to 0"));
  assert(result.x0_selection_reason?.includes("x_0 = 2"));
});

// 4. Primary course example: f(x) = x^4 - x - 10 on [1, 2], x_0 = 2
Deno.test("NewtonRaphson Test 4: Primary course example reproduces exact course sequence 1.871 -> 1.856 -> 1.856", () => {
  const result = solveNewtonRaphson({
    expression: "x^4 - x - 10",
    a: 1,
    b: 2,
    decimalPlaces: 3,
    precisionMode: "course_step_rounding",
  });

  assert(result.success, "Course example should succeed");
  assertEquals(result.formattedRoot, "1.856");

  // Slide 5: x_1 = 1.871
  assert(result.iterations.length >= 2);
  assertEquals(result.iterations[0].formatted_x_next, "1.871");

  // Slide 6: x_2 = 1.856
  assertEquals(result.iterations[1].formatted_x_next, "1.856");

  // Slide 6: x_3 = 1.856
  assertEquals(result.iterations[2].formatted_x_next, "1.856");

  // Slide 7: stops because x_3 = x_2
  assertEquals(result.iterations_used, 3);
  assertEquals(result.iterations[2].is_stopping_met, true);
  assert(result.stopping_reason?.includes("1.856"));
});

// 5. Consecutive-approximation stopping rule
Deno.test("NewtonRaphson Test 5: Stops precisely when consecutive approximations agree in decimal places", () => {
  const result = solveNewtonRaphson({
    expression: "x^4 - x - 10",
    x0: 2,
    decimalPlaces: 3,
  });

  const lastIter = result.iterations[result.iterations.length - 1];
  const secondLastIter = result.iterations[result.iterations.length - 2];
  assertEquals(lastIter.formatted_x_next, secondLastIter.formatted_x_next);
  assertEquals(lastIter.is_stopping_met, true);
});

// 6. Multiple iterations tracking
Deno.test("NewtonRaphson Test 6: Iterations advance sequentially with valid tracking", () => {
  const result = solveNewtonRaphson({
    expression: "x^3 - 2*x - 5",
    x0: 2,
    decimalPlaces: 4,
    maxIterations: 10,
  });

  assert(result.iterations.length >= 2);
  for (let i = 0; i < result.iterations.length; i++) {
    assertEquals(result.iterations[i].n, i);
    assert(isFinite(result.iterations[i].x_n));
    assert(isFinite(result.iterations[i].x_next));
    assert(isFinite(result.iterations[i].step_difference));
  }
});

// 7. Endpoint / sign validation
Deno.test("NewtonRaphson Test 7: Validates opposite-sign condition when interval [a, b] is provided", () => {
  // Both f(2) = 4 and f(3) = 68 are positive
  const noSignChange = solveNewtonRaphson({
    expression: "x^4 - x - 10",
    a: 2,
    b: 3,
    decimalPlaces: 3,
  });

  assertEquals(noSignChange.success, false);
  assertEquals(noSignChange.errorCode, "NO_SIGN_CHANGE");
  assert(noSignChange.error?.includes("No sign change"));
});

// 8. Invalid interval
Deno.test("NewtonRaphson Test 8: Rejects invalid bounds (a >= b or non-finite)", () => {
  const invalidOrder = solveNewtonRaphson({
    expression: "x^4 - x - 10",
    a: 2,
    b: 1,
  });
  assertEquals(invalidOrder.success, false);
  assertEquals(invalidOrder.errorCode, "INVALID_BOUNDS");

  const nanBounds = solveNewtonRaphson({
    expression: "x^4 - x - 10",
    a: NaN,
    b: 2,
  });
  assertEquals(nanBounds.success, false);
  assertEquals(nanBounds.errorCode, "INVALID_BOUNDS");
});

// 9. Derivative-zero error state (implementation safety condition)
Deno.test("NewtonRaphson Test 9: Gracefully flags derivative zero without crashing", () => {
  // f(x) = x^2 - 4. At x_0 = 0, f'(0) = 2(0) = 0.
  const result = solveNewtonRaphson({
    expression: "x^2 - 4",
    x0: 0,
  });

  assertEquals(result.success, false);
  assertEquals(result.errorCode, "DERIVATIVE_ZERO");
  assert(result.error?.includes("Derivative vanished"));
  assert(result.error?.includes("Implementation safety check"));
});

// 10. Second equation: Course PPT Q.1 (Transcendental) 3x - cos(x) - 1 = 0 on [0, 1]
Deno.test("NewtonRaphson Test 10: Solves Course PPT Q.1 (3x - cos(x) - 1 = 0) yielding 0.6071", () => {
  // Problem from Slide 7: Find one root of 3x - cos(x) - 1 = 0 between 0 and 1. Answer: 0.6071
  // f(0) = 0 - 1 - 1 = -2 (<0)
  // f(1) = 3 - cos(1) - 1 = 2 - 0.5403 = 1.4597 (>0)
  // |f(1)| = 1.4597 < |f(0)| = 2 -> takes x_0 = 1 (or 0.6)
  const result = solveNewtonRaphson({
    expression: "3*x - cos(x) - 1",
    a: 0,
    b: 1,
    decimalPlaces: 4,
  });

  assert(result.success);
  assertEquals(result.formattedRoot, "0.6071");
  assertAlmostEquals(result.root!, 0.6071, 0.0005);
});

// 11. Third equation: Course PPT Q.2 (Polynomial) x^3 - 2x - 5 = 0
Deno.test("NewtonRaphson Test 11: Solves Course PPT Q.2 (x^3 - 2x - 5 = 0) yielding 2.094", () => {
  // Problem from Slide 7: Find root of x^3 - 2x - 5 = 0. Answer: 2.094
  // Root is in [2, 3]: f(2) = -1, f(3) = 16. |f(2)| = 1 < 16, so x_0 = 2.
  const result = solveNewtonRaphson({
    expression: "x^3 - 2*x - 5",
    a: 2,
    b: 3,
    decimalPlaces: 3,
  });

  assert(result.success);
  // True mathematical root is 2.094551...
  // Depending on whether truncation (2.094) or standard rounding (2.095) is applied
  assert(result.formattedRoot === "2.094" || result.formattedRoot === "2.095");
  assertAlmostEquals(result.root!, 2.09455, 0.002);
});

// 12. Complete iteration history
Deno.test("NewtonRaphson Test 12: Preserves complete iteration history and metadata", () => {
  const result = solveNewtonRaphson({
    expression: "x^4 - x - 10",
    a: 1,
    b: 2,
    decimalPlaces: 3,
  });

  assert(result.initialInterval !== undefined);
  assertEquals(result.initialInterval[0], 1);
  assertEquals(result.initialInterval[1], 2);
  assertEquals(result.initialEvaluation?.f_a, -10);
  assertEquals(result.initialEvaluation?.f_b, 4);

  for (const iter of result.iterations) {
    assert(typeof iter.n === "number");
    assert(typeof iter.x_n === "number");
    assert(typeof iter.f_x === "number");
    assert(typeof iter.f_prime_x === "number");
    assert(typeof iter.x_next === "number");
    assert(typeof iter.formatted_x_next === "string");
    assert(typeof iter.step_difference === "number");
    assert(typeof iter.is_stopping_met === "boolean");
  }
});

// 13. Precision / display behavior
Deno.test("NewtonRaphson Test 13: Configurable precision modes (course_step_rounding vs full_precision)", () => {
  const resultCourse = solveNewtonRaphson({
    expression: "x^4 - x - 10",
    a: 1,
    b: 2,
    decimalPlaces: 3,
    precisionMode: "course_step_rounding",
  });
  assertEquals(resultCourse.precisionModeUsed, "course_step_rounding");
  assertEquals(resultCourse.formattedRoot, "1.856");

  const resultFull = solveNewtonRaphson({
    expression: "x^4 - x - 10",
    a: 1,
    b: 2,
    decimalPlaces: 3,
    precisionMode: "full_precision",
  });
  assertEquals(resultFull.precisionModeUsed, "full_precision");
  assertEquals(resultFull.formattedRoot, "1.856");
});

// 14. No hardcoded final answer
Deno.test("NewtonRaphson Test 14: Accurately converges for arbitrary quadratic and cubic equations", () => {
  // x^2 - 7 = 0 starting at x_0 = 2 -> sqrt(7) ≈ 2.64575
  const resultSqrt = solveNewtonRaphson({
    expression: "x^2 - 7",
    x0: 2,
    decimalPlaces: 3,
  });
  assert(resultSqrt.success);
  assertEquals(resultSqrt.formattedRoot, "2.646");
  assertAlmostEquals(resultSqrt.root!, Math.sqrt(7), 0.001);
});
