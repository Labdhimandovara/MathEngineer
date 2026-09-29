import { assertEquals, assert } from "jsr:@std/assert@1";
import { solveBisection } from "../src/math/bisection/bisectionSolver.ts";
import {
  createInteractiveSession,
  processBracketCheck,
  processMidpoint,
  processFMidpoint,
  processIntervalChoice,
} from "../src/math/bisection/interactiveSolver.ts";

// Setup canonical course problem: x^3 - 9x + 1 on [2, 3]
function getCourseResult() {
  const result = solveBisection({
    expression: "x^3 - 9x + 1",
    a: 2,
    b: 3,
    decimalPlaces: 2,
  });
  assert(result.success, "Solver must succeed for course example");
  return result;
}

Deno.test("Interactive Test 1: Correct f(a) and f(b) accepted", () => {
  const result = getCourseResult();
  const session = createInteractiveSession(result);
  assertEquals(session.currentStep, "bracket_check");

  // Expected: f(2) = -9, f(3) = 1
  const updated = processBracketCheck(session, result, -9, 1);
  assertEquals(updated.stepFeedback.status, "correct");
  assertEquals(updated.currentStep, "midpoint");
  assertEquals(updated.independentStepsCompleted, 1);
});

Deno.test("Interactive Test 2: Incorrect f(a) rejected and student cannot advance", () => {
  const result = getCourseResult();
  const session = createInteractiveSession(result);

  // Submit incorrect f(a) = -5 instead of -9
  const updated = processBracketCheck(session, result, -5, 1);
  assertEquals(updated.stepFeedback.status, "incorrect");
  assertEquals(updated.currentStep, "bracket_check"); // Must NOT advance
  assertEquals(updated.independentStepsCompleted, 0);
  assert(updated.stepFeedback.userValue?.includes("-5"));
});

Deno.test("Interactive Test 3: Correct midpoint accepted", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);
  assertEquals(session.currentStep, "midpoint");

  // Step 2: x_1 = (2 + 3) / 2 = 2.5
  const updated = processMidpoint(session, result, 2.5);
  assertEquals(updated.stepFeedback.status, "correct");
  assertEquals(updated.currentStep, "f_midpoint");
  assertEquals(updated.independentStepsCompleted, 2);
});

Deno.test("Interactive Test 4: Incorrect midpoint rejected", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);

  // Submit wrong midpoint 2.4
  const updated = processMidpoint(session, result, 2.4);
  assertEquals(updated.stepFeedback.status, "incorrect");
  assertEquals(updated.currentStep, "midpoint"); // Must NOT advance
  assertEquals(updated.independentStepsCompleted, 1);
  assertEquals(updated.stepFeedback.userValue, "2.4");
});

Deno.test("Interactive Test 5: Correct f(midpoint) accepted", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);
  session = processMidpoint(session, result, 2.5);
  assertEquals(session.currentStep, "f_midpoint");

  // Expected: f(2.5) = -5.875
  const updated = processFMidpoint(session, result, -5.875);
  assertEquals(updated.stepFeedback.status, "correct");
  assertEquals(updated.currentStep, "interval_choice");
  assertEquals(updated.independentStepsCompleted, 3);
});

Deno.test("Interactive Test 6: Correct interval selection accepted", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);
  session = processMidpoint(session, result, 2.5);
  session = processFMidpoint(session, result, -5.875);
  assertEquals(session.currentStep, "interval_choice");

  // In course example: f(2.5) is negative, f(3) is positive -> root is in [2.5, 3] ('right' half)
  const updated = processIntervalChoice(session, result, "right");
  assertEquals(updated.stepFeedback.status, "correct");
  assertEquals(updated.currentIterationIndex, 1);
  assertEquals(updated.currentStep, "midpoint");
  assertEquals(updated.completedIterations.length, 1);
  assertEquals(updated.completedIterations[0].next_interval, [2.5, 3]);
});

Deno.test("Interactive Test 7: Incorrect interval selection rejected", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);
  session = processMidpoint(session, result, 2.5);
  session = processFMidpoint(session, result, -5.875);

  // Choosing 'left' [2, 2.5] is wrong
  const updated = processIntervalChoice(session, result, "left");
  assertEquals(updated.stepFeedback.status, "incorrect");
  assertEquals(updated.currentStep, "interval_choice"); // Must NOT advance
  assertEquals(updated.currentIterationIndex, 0);
  assertEquals(updated.completedIterations.length, 0);
});

Deno.test("Interactive Test 8: Student cannot advance after incorrect step until corrected", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);

  // 1. Submit wrong bracket value
  session = processBracketCheck(session, result, 999, 1);
  assertEquals(session.currentStep, "bracket_check");

  // Attempting to invoke processMidpoint when step is bracket_check should be ignored
  const illegalAdvancement = processMidpoint(session, result, 2.5);
  assertEquals(illegalAdvancement.currentStep, "bracket_check");

  // Now submit correct bracket value -> advances to midpoint
  session = processBracketCheck(session, result, -9, 1);
  assertEquals(session.currentStep, "midpoint");

  // 2. Submit wrong midpoint
  session = processMidpoint(session, result, 999);
  assertEquals(session.currentStep, "midpoint");

  // Now submit correct midpoint -> advances to f_midpoint
  session = processMidpoint(session, result, 2.5);
  assertEquals(session.currentStep, "f_midpoint");
});

Deno.test("Interactive Test 9: Completion occurs only after deterministic stopping condition is met", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);

  // Initial bracket check
  session = processBracketCheck(
    session,
    result,
    result.initialEvaluation!.f_a,
    result.initialEvaluation!.f_b
  );

  // Loop through all iterations up to the final stopping iteration
  for (let i = 0; i < result.iterations.length; i++) {
    const iter = result.iterations[i];
    assertEquals(session.currentIterationIndex, i);
    assertEquals(session.isCompleted, false, `Must not be completed at iteration ${i} start`);

    // Submit correct midpoint
    session = processMidpoint(session, result, iter.midpoint);
    // Submit correct f(midpoint)
    session = processFMidpoint(session, result, iter.f_midpoint);

    // Determine correct half
    const isLeft = Math.abs(iter.next_interval[0] - iter.a) < 1e-6;
    session = processIntervalChoice(session, result, isLeft ? "left" : "right");

    if (iter.is_stopping_met || i === result.iterations.length - 1) {
      assertEquals(session.isCompleted, true);
      assertEquals(session.currentStep, "completed");
    } else {
      assertEquals(session.isCompleted, false);
      assertEquals(session.currentIterationIndex, i + 1);
    }
  }

  assertEquals(session.isCompleted, true);
  assertEquals(session.completedIterations.length, result.iterations.length);
});

Deno.test("Interactive Test 10: Show Solution still produces existing deterministic iteration table", () => {
  const result = getCourseResult();
  assert(result.iterations.length >= 8);
  assertEquals(result.formattedRoot, "2.94");
  assertEquals(result.iterations[0].midpoint, 2.5);
  assertEquals(result.iterations[0].next_interval, [2.5, 3]);
  assertEquals(result.iterations[1].midpoint, 2.75);
  assertEquals(result.iterations[1].next_interval, [2.75, 3]);
});
