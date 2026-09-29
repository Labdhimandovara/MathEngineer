import { assertEquals, assert } from "jsr:@std/assert@1";
import { solveBisection } from "../src/math/bisection/bisectionSolver.ts";
import { generateExplainedSolution } from "../src/data/bisectionSolutionExplanation.ts";

function getCourseResult() {
  const result = solveBisection({
    expression: "x^3 - 9x + 1",
    a: 2,
    b: 3,
    decimalPlaces: 2,
  });
  assert(result.success);
  return result;
}

// 1. Deterministic Data Binding: Verifies explanations use real iteration records from bisectionSolver
Deno.test("ExplainedSolution Test 1: Binds deterministically to solver result", () => {
  const result = getCourseResult();
  const explained = generateExplainedSolution(result, "x^3 - 9x + 1 = 0", 2);

  assert(explained !== null);
  assertEquals(explained.iterations.length, result.iterations.length);
  assertEquals(explained.problem.expression, "x^3 - 9x + 1");
  assertEquals(explained.finalSummary.iterationsUsed, result.iterations_used);
  assertEquals(explained.finalSummary.formattedRoot, result.formattedRoot);
  assertEquals(explained.overview.methodName, "Bisection Method");
});

// 2. Step 1 (Current Interval): Verifies interval endpoints formatting
Deno.test("ExplainedSolution Test 2: Step 1 displays formatted current interval", () => {
  const result = getCourseResult();
  const explained = generateExplainedSolution(result, "x^3 - 9x + 1 = 0", 2)!;

  const firstIter = explained.iterations[0];
  assertEquals(firstIter.iterationNumber, 1);
  assertEquals(firstIter.n, 0);
  assertEquals(firstIter.intervalTitle, "Interval [a_0, b_0]");
  assert(firstIter.intervalExplanation.includes("a_0 = 2.0000"));
  assert(firstIter.intervalExplanation.includes("b_0 = 3.0000"));
});

// 3. Step 2 (Midpoint Substitution): Verifies formula, substitution, and calculated midpoint
Deno.test("ExplainedSolution Test 3: Step 2 displays midpoint formula and dynamic numerical substitution", () => {
  const result = getCourseResult();
  const explained = generateExplainedSolution(result, "x^3 - 9x + 1 = 0", 2)!;

  const firstIter = explained.iterations[0];
  assertEquals(firstIter.midpointFormula, "x_1 = (a_0 + b_0) / 2");
  assertEquals(firstIter.midpointSubstitution, "x_1 = (2.0000 + 3.0000) / 2");
  assertEquals(firstIter.midpointResult, "2.5000");
  assertEquals(firstIter.midpoint, 2.5);
});

// 4. Step 3 (Function Evaluation): Verifies function value and sign matching solver evaluation
Deno.test("ExplainedSolution Test 4: Step 3 displays function evaluation and sign", () => {
  const result = getCourseResult();
  const explained = generateExplainedSolution(result, "x^3 - 9x + 1 = 0", 2)!;

  const firstIter = explained.iterations[0];
  assertEquals(firstIter.functionFormula, "f(x_1) = f(2.5000)");
  assertEquals(firstIter.functionResult, "-5.8750");
  assertEquals(firstIter.functionSign, "negative (< 0)");
});

// 5. Step 4 (Decide Next Interval): Verifies opposite-sign reasoning for the retained sub-interval
Deno.test("ExplainedSolution Test 5: Step 4 explains opposite sign pair and retained interval", () => {
  const result = getCourseResult();
  const explained = generateExplainedSolution(result, "x^3 - 9x + 1 = 0", 2)!;

  const firstIter = explained.iterations[0];
  // For iteration 1 of course problem: f(2.5) = -5.875 (< 0) and f(3) = 1 (> 0) have opposite signs
  assert(firstIter.oppositePairExplanation.includes("f(2.5000) = -5.8750 (< 0)"));
  assert(firstIter.oppositePairExplanation.includes("f(3.0000) = 1.0000 (> 0)"));
  assertEquals(firstIter.retainedIntervalDisplay, "[2.5000, 3.0000]");
});

// 6. Stopping Condition: Verifies course decimal-place agreement rationale
Deno.test("ExplainedSolution Test 6: Final summary contains course stopping rationale and formatted root", () => {
  const result = getCourseResult();
  const explained = generateExplainedSolution(result, "x^3 - 9x + 1 = 0", 2)!;

  assertEquals(explained.finalSummary.formattedRoot, "2.94");
  assertEquals(explained.finalSummary.accuracyDecimalPlaces, 2);
  assert(explained.finalSummary.whyThisIsTheAnswer.includes("2.94"));
  assert(explained.finalSummary.whyThisIsTheAnswer.includes("2 decimal places"));
});

// 7. Multi-Problem Support: Verifies dynamic generation for different equation x^3 - 4x - 9 = 0
Deno.test("ExplainedSolution Test 7: Works dynamically for alternative problem x^3 - 4x - 9 = 0", () => {
  const result = solveBisection({
    expression: "x^3 - 4x - 9",
    a: 2,
    b: 3,
    decimalPlaces: 2,
  });
  assert(result.success);

  const explained = generateExplainedSolution(result, "x^3 - 4x - 9 = 0", 2);
  assert(explained !== null);

  // Initial f(2) = 8 - 8 - 9 = -9, f(3) = 27 - 12 - 9 = 6
  // Midpoint x1 = (2 + 3) / 2 = 2.5
  // f(2.5) = 15.625 - 10 - 9 = -3.375 (< 0)
  const iter1 = explained.iterations[0];
  assertEquals(iter1.midpointSubstitution, "x_1 = (2.0000 + 3.0000) / 2");
  assertEquals(iter1.midpointResult, "2.5000");
  assertEquals(iter1.functionResult, "-3.3750");
  assertEquals(iter1.functionSign, "negative (< 0)");
  assertEquals(iter1.retainedIntervalDisplay, "[2.5000, 3.0000]");

  // Root must be around 2.706 -> 2.70 or 2.71, NOT 2.94
  assert(explained.finalSummary.formattedRoot !== "2.94");
  assert(explained.finalSummary.formattedRoot.startsWith("2.7"));
});

// 8. Multi-Problem Support: Quadratic equation x^2 - 2 = 0
Deno.test("ExplainedSolution Test 8: Works dynamically for quadratic equation x^2 - 2 = 0", () => {
  const result = solveBisection({
    expression: "x^2 - 2",
    a: 1,
    b: 2,
    decimalPlaces: 2,
  });
  assert(result.success);

  const explained = generateExplainedSolution(result, "x^2 - 2 = 0", 2)!;
  // First midpoint = 1.5, f(1.5) = 2.25 - 2 = +0.25 (> 0)
  const iter1 = explained.iterations[0];
  assertEquals(iter1.midpointResult, "1.5000");
  assertEquals(iter1.functionResult, "0.2500");
  assertEquals(iter1.functionSign, "positive (> 0)");
  // Since f(1) = -1 (<0) and f(1.5) = +0.25 (>0), retained interval is [1, 1.5]
  assertEquals(iter1.retainedIntervalDisplay, "[1.0000, 1.5000]");
  // Root matches deterministic solver output
  assertEquals(explained.finalSummary.formattedRoot, result.formattedRoot);
  assertEquals(result.formattedRoot, "1.42");
});

// 9. Exact Root at Boundary: Handles exact root with 0 iterations gracefully
Deno.test("ExplainedSolution Test 9: Handles exact root at boundary with 0 iterations", () => {
  const result = solveBisection({
    expression: "x^3 - 8",
    a: 2,
    b: 3,
    decimalPlaces: 2,
  });
  assert(result.success);
  assertEquals(result.iterations_used, 0);

  const explained = generateExplainedSolution(result, "x^3 - 8 = 0", 2);
  assert(explained !== null);
  assertEquals(explained.iterations.length, 0);
  assertEquals(explained.finalSummary.formattedRoot, "2.00");
  assert(explained.finalSummary.whyThisIsTheAnswer.includes("f(x) = 0 exactly"));
});

// 10. Solver Error / Failure Handling: Returns null when solver was unsuccessful
Deno.test("ExplainedSolution Test 10: Returns null when initial interval has no sign change", () => {
  const result = solveBisection({
    expression: "x^3 - 9x + 1",
    a: 2,
    b: 2.5,
    decimalPlaces: 2,
  });
  // f(2) = -9, f(2.5) = -5.875 (both negative)
  assertEquals(result.success, false);

  const explained = generateExplainedSolution(result, "x^3 - 9x + 1 = 0", 2);
  assertEquals(explained, null);
});

// 11. Complete Iteration Table Data Preserved: Verifies iterations array contains all table fields
Deno.test("ExplainedSolution Test 11: Complete iteration data is intact across all iterations", () => {
  const result = getCourseResult();
  const explained = generateExplainedSolution(result, "x^3 - 9x + 1 = 0", 2)!;

  for (let i = 0; i < explained.iterations.length; i++) {
    const expIter = explained.iterations[i];
    const rawIter = result.iterations[i];

    assertEquals(expIter.n, rawIter.n);
    assertEquals(expIter.a, rawIter.a);
    assertEquals(expIter.b, rawIter.b);
    assertEquals(expIter.midpoint, rawIter.midpoint);
    assertEquals(expIter.f_midpoint, rawIter.f_midpoint);
    assertEquals(expIter.nextInterval, rawIter.next_interval);
    assertEquals(expIter.isStoppingMet, rawIter.is_stopping_met);
  }

  // The last iteration should have isStoppingMet === true
  const lastIter = explained.iterations[explained.iterations.length - 1];
  assertEquals(lastIter.isStoppingMet, true);
});
