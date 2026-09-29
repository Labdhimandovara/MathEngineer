import { assertEquals, assert } from "jsr:@std/assert@1";
import { solveFalsePosition } from "../src/math/falsePosition/falsePositionSolver.ts";
import {
  createFalsePositionInteractiveSession,
  getFalsePositionStepContext,
  processFalsePositionBracketCheck,
  processFalsePositionApproximation,
  processFalsePositionFApproximation,
  processFalsePositionIntervalChoice,
} from "../src/math/falsePosition/interactiveSolver.ts";

// Setup canonical course problem: cos(x) - x*exp(x) on [0, 1] to 4 decimal places
function getCourseResult() {
  const result = solveFalsePosition({
    expression: "cos(x) - x*exp(x)",
    a: 0,
    b: 1,
    decimalPlaces: 4,
  });
  assert(result.success, "Solver must succeed for course example");
  return result;
}

Deno.test("FalsePosition Interactive 1: Correct f(a) and f(b) accepted", () => {
  const result = getCourseResult();
  const session = createFalsePositionInteractiveSession(result);
  assertEquals(session.currentStep, "bracket_check");

  // Expected: f(0) = 1, f(1) = -2.17798
  const updated = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  assertEquals(updated.stepFeedback.status, "correct");
  assertEquals(updated.currentStep, "approximation");
  assertEquals(updated.independentStepsCompleted, 1);
  assert(updated.stepExplanation?.includes("opposite signs"));
});

Deno.test("FalsePosition Interactive 2: Incorrect f(a) or f(b) rejected and keeps on bracket_check", () => {
  const result = getCourseResult();
  const session = createFalsePositionInteractiveSession(result);

  // Wrong f(a)
  const wrongFa = processFalsePositionBracketCheck(session, result, 0.5, -2.17798);
  assertEquals(wrongFa.stepFeedback.status, "incorrect");
  assertEquals(wrongFa.currentStep, "bracket_check");
  assertEquals(wrongFa.independentStepsCompleted, 0);
  assert(wrongFa.stepFeedback.message?.includes("f(0)"));

  // Wrong f(b)
  const wrongFb = processFalsePositionBracketCheck(session, result, 1, -1.5);
  assertEquals(wrongFb.stepFeedback.status, "incorrect");
  assertEquals(wrongFb.currentStep, "bracket_check");
  assert(wrongFb.stepFeedback.message?.includes("f(1)"));
});

Deno.test("FalsePosition Interactive 3: Correct secant approximation accepted", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  assertEquals(session.currentStep, "approximation");

  // Iteration 1 approximation: x_1 = 0.31467
  const expectedC = result.iterations[0].c;
  const updated = processFalsePositionApproximation(session, result, expectedC);
  assertEquals(updated.stepFeedback.status, "correct");
  assertEquals(updated.currentStep, "f_approximation");
  assertEquals(updated.independentStepsCompleted, 2);
  assert(updated.stepExplanation?.includes("Calculated x"));
});

Deno.test("FalsePosition Interactive 4: Diagnoses accidental Bisection midpoint formula usage", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);

  // Student mistakenly enters Bisection midpoint (0 + 1) / 2 = 0.5
  const updated = processFalsePositionApproximation(session, result, 0.5);
  assertEquals(updated.stepFeedback.status, "incorrect");
  assertEquals(updated.currentStep, "approximation");
  assert(updated.stepFeedback.message?.includes("Bisection midpoint"));
  assert(updated.stepFeedback.message?.includes("secant formula"));
});

Deno.test("FalsePosition Interactive 5: Generic incorrect approximation rejected", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);

  const updated = processFalsePositionApproximation(session, result, 0.75);
  assertEquals(updated.stepFeedback.status, "incorrect");
  assertEquals(updated.currentStep, "approximation");
  assert(updated.stepFeedback.message?.includes("Check your substitution"));
});

Deno.test("FalsePosition Interactive 6: Correct f(x) evaluation accepted", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  session = processFalsePositionApproximation(session, result, result.iterations[0].c);
  assertEquals(session.currentStep, "f_approximation");

  // Expected: f(0.31467) = 0.51987
  const expectedFc = result.iterations[0].f_c;
  const updated = processFalsePositionFApproximation(session, result, expectedFc);
  assertEquals(updated.stepFeedback.status, "correct");
  assertEquals(updated.currentStep, "interval_choice");
  assertEquals(updated.independentStepsCompleted, 3);
  assert(updated.stepExplanation?.includes("positive"));
});

Deno.test("FalsePosition Interactive 7: Incorrect f(x) evaluation rejected", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  session = processFalsePositionApproximation(session, result, result.iterations[0].c);

  const updated = processFalsePositionFApproximation(session, result, 0.999);
  assertEquals(updated.stepFeedback.status, "incorrect");
  assertEquals(updated.currentStep, "f_approximation");
  assert(updated.stepFeedback.message?.includes("Substitute x"));
});

Deno.test("FalsePosition Interactive 8: Correct interval selection advances to next iteration", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  session = processFalsePositionApproximation(session, result, result.iterations[0].c);
  session = processFalsePositionFApproximation(session, result, result.iterations[0].f_c);
  assertEquals(session.currentStep, "interval_choice");

  // In iteration 0: f(c) = 0.51987 > 0 has SAME sign as f(a) = 1 > 0.
  // Therefore replace a with x -> choice 'replace_a'. Next interval is [0.31467, 1].
  const updated = processFalsePositionIntervalChoice(session, result, "replace_a");
  assertEquals(updated.stepFeedback.status, "correct");
  assertEquals(updated.currentIterationIndex, 1);
  assertEquals(updated.currentStep, "approximation");
  assertEquals(updated.completedIterations.length, 1);
  assertEquals(updated.completedIterations[0].n, 0);
  assert(Math.abs(updated.completedIterations[0].c - 0.31467) < 1e-4);
  assert(Math.abs(updated.completedIterations[0].next_interval[0] - 0.31467) < 1e-4);
  assertEquals(updated.completedIterations[0].next_interval[1], 1);
});

Deno.test("FalsePosition Interactive 9: Normalizes 'right' and 'left' interval choice inputs", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  session = processFalsePositionApproximation(session, result, result.iterations[0].c);
  session = processFalsePositionFApproximation(session, result, result.iterations[0].f_c);

  // 'right' maps to replacing a -> [c, b]
  const updated = processFalsePositionIntervalChoice(session, result, "right");
  assertEquals(updated.stepFeedback.status, "correct");
  assertEquals(updated.currentIterationIndex, 1);
});

Deno.test("FalsePosition Interactive 10: Incorrect interval selection rejected with course rule feedback", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  session = processFalsePositionApproximation(session, result, result.iterations[0].c);
  session = processFalsePositionFApproximation(session, result, result.iterations[0].f_c);

  // Choosing 'replace_b' when sign matches f(a) is wrong
  const updated = processFalsePositionIntervalChoice(session, result, "replace_b");
  assertEquals(updated.stepFeedback.status, "incorrect");
  assertEquals(updated.currentStep, "interval_choice");
  assertEquals(updated.currentIterationIndex, 0);
  assertEquals(updated.completedIterations.length, 0);
  assert(updated.stepFeedback.message?.includes("SAME sign as f(x)"));
});

Deno.test("FalsePosition Interactive 11: Illegal step advancement is blocked", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);

  // In bracket_check, cannot call approximation or f_approximation or interval choice
  const illegalApprox = processFalsePositionApproximation(session, result, 0.31467);
  assertEquals(illegalApprox.currentStep, "bracket_check");

  const illegalFApprox = processFalsePositionFApproximation(session, result, 0.51987);
  assertEquals(illegalFApprox.currentStep, "bracket_check");

  const illegalInterval = processFalsePositionIntervalChoice(session, result, "replace_a");
  assertEquals(illegalInterval.currentStep, "bracket_check");
});

Deno.test("FalsePosition Interactive 12: Handles exact root at boundary", () => {
  const boundaryResult = solveFalsePosition({
    expression: "x - 2",
    a: 2,
    b: 5,
    decimalPlaces: 2,
  });
  assertEquals(boundaryResult.exactRootFoundAt, "a");

  const session = createFalsePositionInteractiveSession(boundaryResult);
  assertEquals(session.isCompleted, true);
  assertEquals(session.currentStep, "completed");
  assertEquals(session.totalIterations, 0);
});

Deno.test("FalsePosition Interactive 13: getFalsePositionStepContext derives correct metadata", () => {
  const result = getCourseResult();
  const session = createFalsePositionInteractiveSession(result);
  const context = getFalsePositionStepContext(session, result, "cos(x) - x*exp(x)");

  assertEquals(context.iterationDisplay, 1);
  assertEquals(context.n, 0);
  assertEquals(context.a, 0);
  assertEquals(context.b, 1);
  assertEquals(context.decimalPlaces, 4);
});

Deno.test("FalsePosition Interactive 14: Multi-iteration step-through to convergence", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);

  // Initial bracket check
  session = processFalsePositionBracketCheck(
    session,
    result,
    result.initialEvaluation!.f_a,
    result.initialEvaluation!.f_b
  );
  assertEquals(session.currentStep, "approximation");

  // Step through each iteration until completed
  for (let i = 0; i < result.iterations.length; i++) {
    const iter = result.iterations[i];
    assertEquals(session.currentIterationIndex, i);
    assertEquals(session.currentStep, "approximation");

    // Approximation
    session = processFalsePositionApproximation(session, result, iter.c);
    assertEquals(session.currentStep, "f_approximation");

    // f(approximation)
    session = processFalsePositionFApproximation(session, result, iter.f_c);
    assertEquals(session.currentStep, "interval_choice");

    // Interval choice
    const isReplaceA = Math.abs(iter.next_interval[0] - iter.c) < 1e-6;
    session = processFalsePositionIntervalChoice(
      session,
      result,
      isReplaceA ? "replace_a" : "replace_b"
    );

    if (i < result.iterations.length - 1) {
      assertEquals(session.currentStep, "approximation");
      assertEquals(session.currentIterationIndex, i + 1);
    }
  }

  assertEquals(session.isCompleted, true);
  assertEquals(session.currentStep, "completed");
  assertEquals(session.completedIterations.length, result.iterations.length);
  assertEquals(session.independentStepsCompleted, 1 + result.iterations.length * 3);
});
