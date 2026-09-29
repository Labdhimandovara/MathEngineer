import { assertEquals, assert, assertAlmostEquals } from "jsr:@std/assert@1";
import {
  solveFalsePosition,
  FalsePositionResult,
} from "../src/math/falsePosition/index.ts";

// 1. Basic valid False Position problem
Deno.test("FalsePosition Test 1: Basic valid problem converges to real root", () => {
  // f(x) = x^3 - 2x - 5 on [2, 3]
  // Root ≈ 2.09455
  const result: FalsePositionResult = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: 2,
    b: 3,
    decimalPlaces: 2,
  });

  assert(result.success, "Should solve successfully");
  assert(result.root !== undefined, "Root should be defined");
  assert(result.iterations.length > 0, "Should have iterations");
  assertEquals(result.formattedRoot, "2.09");
  assertAlmostEquals(result.root!, 2.09455, 0.01);
});

// 2. Correct approximation formula (secant-intercept)
Deno.test("FalsePosition Test 2: Correct secant-intercept approximation formula", () => {
  // For f(x) = x^3 - 2x - 5 on [2, 3]:
  // f(2) = 8 - 4 - 5 = -1
  // f(3) = 27 - 6 - 5 = 16
  // c_1 = (a * f(b) - b * f(a)) / (f(b) - f(a))
  //     = (2 * 16 - 3 * (-1)) / (16 - (-1))
  //     = (32 + 3) / 17 = 35 / 17 ≈ 2.0588235294117645
  const result = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: 2,
    b: 3,
    maxIterations: 1,
  });

  assert(result.iterations.length === 1);
  const iter0 = result.iterations[0];
  assertEquals(iter0.n, 0);
  assertEquals(iter0.a, 2);
  assertEquals(iter0.b, 3);
  assertEquals(iter0.f_a, -1);
  assertEquals(iter0.f_b, 16);

  const expectedC = 35 / 17;
  assertAlmostEquals(iter0.c, expectedC, 1e-12);
});

// 3. Correct function evaluation
Deno.test("FalsePosition Test 3: Correct function evaluation at approximation c", () => {
  const result = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: 2,
    b: 3,
    maxIterations: 1,
  });

  const iter0 = result.iterations[0];
  const c = iter0.c;
  const expectedFC = Math.pow(c, 3) - 2 * c - 5;
  assertAlmostEquals(iter0.f_c, expectedFC, 1e-12);
  assert(iter0.f_c < 0, "f(c) should be negative for this step");
});

// 4. Correct sign-based interval selection (Case A and Case B)
Deno.test("FalsePosition Test 4: Correct sign-based interval selection for Case A and Case B", () => {
  // Case B: f(c) has same sign as f(a), so next interval is [c, b]
  // In x^3 - 2x - 5 on [2, 3]: f(2) = -1 (<0), f(3) = 16 (>0).
  // c_1 = 35/17, f(c_1) ≈ -0.3947 (<0).
  // f(c_1) has same sign as f(a), so next interval is [35/17, 3].
  const resultCaseB = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: 2,
    b: 3,
    maxIterations: 1,
  });
  assertEquals(resultCaseB.iterations[0].next_interval[0], 35 / 17);
  assertEquals(resultCaseB.iterations[0].next_interval[1], 3);

  // Case A: f(c) has opposite sign to f(a), so next interval is [a, c]
  // Let f(x) = 2 - x^2 on [0, 2]:
  // f(0) = 2 (>0), f(2) = -2 (<0).
  // c_1 = (0 * (-2) - 2 * 2) / (-2 - 2) = -4 / -4 = 1.
  // f(1) = 2 - 1 = +1 (>0).
  // f(1) has same sign as f(0) (+), opposite to f(2) (-).
  // Next interval is [1, 2].
  // Now consider f(x) = x^2 - 1 on [0.5, 2]:
  // f(0.5) = -0.75 (<0), f(2) = 3 (>0).
  // c_1 = (0.5 * 3 - 2 * (-0.75)) / (3 - (-0.75)) = (1.5 + 1.5) / 3.75 = 3 / 3.75 = 0.8.
  // f(0.8) = 0.64 - 1 = -0.36 (<0). Same sign as f(0.5).
  // To get Case A where f(c) > 0 while f(a) < 0:
  // Let f(x) = x^3 - 0.1 on [0, 1]:
  // f(0) = -0.1 (<0), f(1) = 0.9 (>0).
  // c_1 = (0 * 0.9 - 1 * (-0.1)) / (0.9 - (-0.1)) = 0.1 / 1.0 = 0.1.
  // f(0.1) = 0.001 - 0.1 = -0.099 (<0).
  // Let f(x) = x^0.5 - 0.9 (represented as sqrt(x) - 0.9) on [0, 1]:
  // f(0) = -0.9 (<0), f(1) = 0.1 (>0).
  // c_1 = (0 * 0.1 - 1 * (-0.9)) / (0.1 - (-0.9)) = 0.9 / 1.0 = 0.9.
  // f(0.9) = sqrt(0.9) - 0.9 ≈ 0.94868 - 0.9 = +0.04868 (>0).
  // Here: f(a) = -0.9 (<0), f(c) = +0.04868 (>0).
  // f(a) and f(c) have OPPOSITE signs! Next interval MUST be [a, c] = [0, 0.9]!
  const resultCaseA = solveFalsePosition({
    expression: "sqrt(x) - 0.9",
    a: 0,
    b: 1,
    maxIterations: 1,
  });
  assertEquals(resultCaseA.iterations[0].next_interval[0], 0);
  assertAlmostEquals(resultCaseA.iterations[0].next_interval[1], 0.9, 1e-12);
});

// 5. Endpoint root
Deno.test("FalsePosition Test 5: Exact root at interval endpoints returns immediately", () => {
  // Exact root at lower bound a = 2
  const rootAtA = solveFalsePosition({
    expression: "x^2 - 4",
    a: 2,
    b: 5,
    decimalPlaces: 2,
  });
  assert(rootAtA.success);
  assertEquals(rootAtA.root, 2);
  assertEquals(rootAtA.iterations_used, 0);
  assertEquals(rootAtA.exactRootFoundAt, "a");

  // Exact root at upper bound b = 3
  const rootAtB = solveFalsePosition({
    expression: "x^2 - 9",
    a: 1,
    b: 3,
    decimalPlaces: 2,
  });
  assert(rootAtB.success);
  assertEquals(rootAtB.root, 3);
  assertEquals(rootAtB.iterations_used, 0);
  assertEquals(rootAtB.exactRootFoundAt, "b");
});

// 6. Invalid / unbracketed interval
Deno.test("FalsePosition Test 6: Detects unbracketed interval without sign change", () => {
  // Both f(3) = 5 and f(5) = 21 are positive
  const unbracketed = solveFalsePosition({
    expression: "x^2 - 4",
    a: 3,
    b: 5,
  });
  assertEquals(unbracketed.success, false);
  assertEquals(unbracketed.errorCode, "NO_SIGN_CHANGE");
  assert(unbracketed.error?.includes("No sign change"));

  // a >= b
  const invalidBounds = solveFalsePosition({
    expression: "x^2 - 4",
    a: 5,
    b: 2,
  });
  assertEquals(invalidBounds.success, false);
  assertEquals(invalidBounds.errorCode, "INVALID_BOUNDS");
});

// 7. Invalid numeric input
Deno.test("FalsePosition Test 7: Handles invalid numeric input gracefully", () => {
  const nanInput = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: NaN,
    b: 3,
  });
  assertEquals(nanInput.success, false);
  assertEquals(nanInput.errorCode, "INVALID_BOUNDS");

  const infInput = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: 2,
    b: Infinity,
  });
  assertEquals(infInput.success, false);
  assertEquals(infInput.errorCode, "INVALID_BOUNDS");

  const invalidSyntax = solveFalsePosition({
    expression: "x ^^ 2",
    a: 2,
    b: 3,
  });
  assertEquals(invalidSyntax.success, false);
  assertEquals(invalidSyntax.errorCode, "INVALID_EXPRESSION");
});

// 8. Multiple iterations
Deno.test("FalsePosition Test 8: Multiple iterations execute and progress sequentially", () => {
  const result = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: 2,
    b: 3,
    decimalPlaces: 4,
    maxIterations: 10,
  });

  assert(result.iterations.length >= 3);
  for (let i = 0; i < result.iterations.length; i++) {
    assertEquals(result.iterations[i].n, i);
    assert(isFinite(result.iterations[i].c));
    assert(isFinite(result.iterations[i].f_c));
  }
});

// 9. Full-precision internal calculations
Deno.test("FalsePosition Test 9: Preserves full internal floating-point precision", () => {
  const result = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: 2,
    b: 3,
    maxIterations: 2,
  });

  const c1 = result.iterations[0].c;
  // 35/17 should have full floating precision, not rounded to 2 or 4 decimal places
  const c1Str = c1.toString();
  assert(c1Str.length > 8, "Internal approximation should have high precision digits");
  assertEquals(c1, 35 / 17);
});

// 10. Stopping behavior only where supported by course material
Deno.test("FalsePosition Test 10: Isolated stopping strategy works accurately", () => {
  // Test 10a: Function residual strategy
  const resResidual = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: 2,
    b: 3,
    stoppingStrategy: "function_residual",
    tolerance: 1e-3,
  });
  assert(resResidual.success);
  assertEquals(resResidual.stopping_strategy_used, "function_residual");
  assert(Math.abs(resResidual.iterations[resResidual.iterations.length - 1].f_c) <= 1e-3);

  // Test 10b: Consecutive step strategy
  const resStep = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: 2,
    b: 3,
    stoppingStrategy: "consecutive_step",
    tolerance: 1e-4,
  });
  assert(resStep.success);
  assertEquals(resStep.stopping_strategy_used, "consecutive_step");

  // Test 10c: Custom stopping criterion
  let customCriterionCalled = false;
  const resCustom = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: 2,
    b: 3,
    stoppingStrategy: "custom",
    customStoppingCriterion: (curr) => {
      customCriterionCalled = true;
      return curr.n >= 2;
    },
  });
  assert(customCriterionCalled);
  assert(resCustom.success);
  assertEquals(resCustom.iterations_used, 3); // iterations 0, 1, 2
});

// 11. A second equation to prove implementation is not hardcoded
Deno.test("FalsePosition Test 11: Solves transcendental equation cos(x) - x = 0", () => {
  // Root is Dottie number ≈ 0.739085
  const result = solveFalsePosition({
    expression: "cos(x) - x",
    a: 0,
    b: 1,
    decimalPlaces: 2,
  });

  assert(result.success);
  assertEquals(result.formattedRoot, "0.74");
  assertAlmostEquals(result.root!, 0.739085, 0.01);
});

// 12. Result structure contains complete iteration history
Deno.test("FalsePosition Test 12: Result contains complete iteration metadata", () => {
  const result = solveFalsePosition({
    expression: "x^3 - 9x + 1",
    a: 2,
    b: 3,
    decimalPlaces: 2,
  });

  assert(result.success);
  assert(result.initialEvaluation !== undefined);
  assertEquals(result.initialEvaluation.a, 2);
  assertEquals(result.initialEvaluation.b, 3);
  assertEquals(result.initialEvaluation.f_a, -9);
  assertEquals(result.initialEvaluation.f_b, 1);

  // Inspect first iteration fields
  const first = result.iterations[0];
  assert(first.a !== undefined);
  assert(first.b !== undefined);
  assert(first.f_a !== undefined);
  assert(first.f_b !== undefined);
  assert(first.c !== undefined);
  assert(first.f_c !== undefined);
  assert(first.next_interval !== undefined);
  assert(typeof first.is_stopping_met === "boolean");
});

// 13. Exact root at secant intercept
Deno.test("FalsePosition Test 13: Exact root found at secant intercept terminates cleanly", () => {
  // f(x) = 2x - 4 on [1, 5]: Root is exactly 2. Secant line gives c = 2 in iteration 0.
  const result = solveFalsePosition({
    expression: "2*x - 4",
    a: 1,
    b: 5,
    decimalPlaces: 2,
  });

  assert(result.success);
  assertEquals(result.root, 2);
  assertEquals(result.iterations_used, 1);
  assertEquals(result.exactRootFoundAt, "c");
  assert(result.stopping_reason?.includes("Exact root found at c"));
});
