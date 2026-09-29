import { assertEquals, assert, assertAlmostEquals } from "jsr:@std/assert@1";
import { solveBisection } from "../src/math/bisection/bisectionSolver.ts";

// 1. A valid bracketed equation
Deno.test("Test 1: Valid bracketed equation converges correctly", () => {
  // f(x) = x^2 - 4 on [1, 3], root is 2
  const result = solveBisection({
    expression: "x^2 - 4",
    a: 1,
    b: 3,
    decimalPlaces: 2,
  });

  assert(result.success, "Should solve successfully");
  assert(result.root !== undefined);
  assertAlmostEquals(result.root, 2.0, 0.05);
  assertEquals(result.formattedRoot, "2.00");
});

// 2. Root exactly at a
Deno.test("Test 2: Root exactly at lower bound a", () => {
  // f(x) = x^2 - 4 on [2, 4], f(2) = 0
  const result = solveBisection({
    expression: "x^2 - 4",
    a: 2,
    b: 4,
    decimalPlaces: 2,
  });

  assert(result.success, "Should succeed immediately");
  assertEquals(result.exactRootFoundAt, 'a');
  assertEquals(result.root, 2);
  assertEquals(result.iterations_used, 0);
});

// 3. Root exactly at b
Deno.test("Test 3: Root exactly at upper bound b", () => {
  // f(x) = x^2 - 4 on [0, 2], f(2) = 0
  const result = solveBisection({
    expression: "x^2 - 4",
    a: 0,
    b: 2,
    decimalPlaces: 2,
  });

  assert(result.success, "Should succeed immediately");
  assertEquals(result.exactRootFoundAt, 'b');
  assertEquals(result.root, 2);
  assertEquals(result.iterations_used, 0);
});

// 4. Root exactly at midpoint
Deno.test("Test 4: Root exactly at midpoint", () => {
  // f(x) = x^2 - 4 on [0, 4], midpoint is (0+4)/2 = 2, f(2) = 0
  const result = solveBisection({
    expression: "x^2 - 4",
    a: 0,
    b: 4,
    decimalPlaces: 2,
  });

  assert(result.success, "Should detect root at midpoint");
  assertEquals(result.exactRootFoundAt, 'midpoint');
  assertEquals(result.root, 2);
  assertEquals(result.iterations_used, 1);
  assertEquals(result.iterations[0].midpoint, 2);
  assertEquals(result.iterations[0].f_midpoint, 0);
});

// 5. Invalid interval with no sign change
Deno.test("Test 5: Invalid interval with no sign change returns error", () => {
  // f(x) = x^2 - 4 on [3, 5], f(3)=5 > 0, f(5)=21 > 0
  const result = solveBisection({
    expression: "x^2 - 4",
    a: 3,
    b: 5,
    decimalPlaces: 2,
  });

  assertEquals(result.success, false);
  assertEquals(result.errorCode, "NO_SIGN_CHANGE");
  assert(result.error?.includes("No sign change"));
  assertEquals(result.iterations_used, 0);
});

// 6. Invalid function expression
Deno.test("Test 6: Invalid function expression returns syntax error", () => {
  const result = solveBisection({
    expression: "x^^3 +++ 2",
    a: 1,
    b: 3,
  });

  assertEquals(result.success, false);
  assertEquals(result.errorCode, "INVALID_EXPRESSION");
  assert(result.error !== undefined);
});

// 7. Convergence to a known root
Deno.test("Test 7: Convergence to known transcendental root", () => {
  // f(x) = x^3 - 2 on [1, 2], exact root is 2^(1/3) ~ 1.259921
  const result = solveBisection({
    expression: "x^3 - 2",
    a: 1,
    b: 2,
    decimalPlaces: 3,
  });

  assert(result.success);
  assert(result.root !== undefined);
  assertAlmostEquals(result.root, Math.cbrt(2), 0.01);
});

// 8. The course example: x^3 - 9x + 1 = 0 on [2, 3]
Deno.test("Test 8: Course Example x^3 - 9x + 1 = 0 on [2, 3] identifies 2.94", () => {
  const result = solveBisection({
    expression: "x^3 - 9x + 1",
    a: 2,
    b: 3,
    decimalPlaces: 2,
  });

  assert(result.success, "Course example should succeed");
  assert(result.iterations.length >= 8, "Course example should run through step 8/9");

  // Step 0: a_0 = 2, b_0 = 3, x_1 = 2.5
  const iter0 = result.iterations[0];
  assertEquals(iter0.n, 0);
  assertEquals(iter0.a, 2);
  assertEquals(iter0.b, 3);
  assertEquals(iter0.midpoint, 2.5);
  // f(2.5) = (2.5)^3 - 9(2.5) + 1 = 15.625 - 22.5 + 1 = -5.875
  assertAlmostEquals(iter0.f_midpoint, -5.875, 0.001);
  assertEquals(iter0.next_interval, [2.5, 3]);

  // Step 1: a_1 = 2.5, b_1 = 3, x_2 = 2.75
  const iter1 = result.iterations[1];
  assertEquals(iter1.n, 1);
  assertEquals(iter1.a, 2.5);
  assertEquals(iter1.b, 3);
  assertEquals(iter1.midpoint, 2.75);
  assertAlmostEquals(iter1.f_midpoint, -2.953125, 0.001);
  assertEquals(iter1.next_interval, [2.75, 3]);

  // Final root identified must be 2.94 to two decimal places
  assertEquals(result.formattedRoot, "2.94");
  assert(result.root !== undefined);
  assertAlmostEquals(result.root, 2.94, 0.02);
});

// 9. Interval-selection logic correctness (Case A and Case B)
Deno.test("Test 9: Interval-selection logic: Case A and Case B", () => {
  // Case A: f(a) and f(midpoint) have opposite signs -> next interval must be [a, midpoint]
  // Let f(x) = x on [-2, 4]: f(-2) = -2 (neg), f(4) = 4 (pos).
  // Midpoint = (-2 + 4)/2 = 1. f(1) = 1 (pos).
  // Signs: f(a) is neg, f(midpoint) is pos (opposite signs!).
  // Therefore next interval must be [a, midpoint] = [-2, 1].
  const resultCaseA = solveBisection({
    expression: "x",
    a: -2,
    b: 4,
    decimalPlaces: 2,
    maxIterations: 1,
  });
  assertEquals(resultCaseA.iterations[0].next_interval, [-2, 1]);

  // Case B: f(midpoint) and f(b) have opposite signs -> next interval must be [midpoint, b]
  // Let f(x) = x on [-4, 2]: f(-4) = -4 (neg), f(2) = 2 (pos).
  // Midpoint = (-4 + 2)/2 = -1. f(-1) = -1 (neg).
  // Signs: f(midpoint) is neg, f(b) is pos (opposite signs!).
  // Therefore next interval must be [midpoint, b] = [-1, 2].
  const resultCaseB = solveBisection({
    expression: "x",
    a: -4,
    b: 2,
    decimalPlaces: 2,
    maxIterations: 1,
  });
  assertEquals(resultCaseB.iterations[0].next_interval, [-1, 2]);
});

// 10. Additional validation: a >= b error handling
Deno.test("Test 10: Lower bound greater than or equal to upper bound", () => {
  const result1 = solveBisection({
    expression: "x^2 - 4",
    a: 3,
    b: 1,
  });
  assertEquals(result1.success, false);
  assertEquals(result1.errorCode, "INVALID_BOUNDS");

  const result2 = solveBisection({
    expression: "x^2 - 4",
    a: 2,
    b: 2,
  });
  assertEquals(result2.success, false);
  assertEquals(result2.errorCode, "INVALID_BOUNDS");
});
