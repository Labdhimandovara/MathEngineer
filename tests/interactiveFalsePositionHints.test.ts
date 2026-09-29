import { assertEquals, assert } from "jsr:@std/assert@1";
import { solveFalsePosition } from "../src/math/falsePosition/falsePositionSolver.ts";
import {
  createFalsePositionInteractiveSession,
  getFalsePositionStepContext,
  requestFalsePositionHint,
  processFalsePositionBracketCheck,
  processFalsePositionApproximation,
  processFalsePositionFApproximation,
  processFalsePositionIntervalChoice,
} from "../src/math/falsePosition/interactiveSolver.ts";
import {
  getFalsePositionBracketCheckContent,
  getFalsePositionApproximationContent,
  getFalsePositionFApproximationContent,
  getFalsePositionIntervalChoiceContent,
} from "../src/data/falsePositionEducationalContent.ts";

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

Deno.test("FP Hint 1: Bracket check hints reveal progressively across levels 1, 2, 3", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  assertEquals(session.hintsRevealedForCurrentStep, 0);

  // Request Hint 1
  session = requestFalsePositionHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 1);
  assertEquals(session.totalHintsUsed, 1);

  // Request Hint 2
  session = requestFalsePositionHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 2);

  // Request Hint 3
  session = requestFalsePositionHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 3);

  // Hint content checks
  const content = getFalsePositionBracketCheckContent("cos(x) - x*exp(x)", 0, 1, 1, -2.17798);
  assert(content.hints[0].includes("opposite signs"));
  assert(content.hints[1].includes("a = 0 and b = 1"));
  assert(content.hints[2].includes("Substitute x = 0"));
  assert(content.hints[2].includes("Substitute x = 1"));
});

Deno.test("FP Hint 2: False Position approximation hints reveal progressively across levels 1, 2, 3", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  assertEquals(session.currentStep, "approximation");

  const context = getFalsePositionStepContext(session, result, "cos(x) - x*exp(x)");
  const content = getFalsePositionApproximationContent(context);

  // Hint 1 distinguishes from Bisection midpoint
  assert(content.hints[0].includes("NOT the Bisection midpoint"));
  // Hint 2 provides the secant-intercept formula
  assert(content.hints[1].includes("[a·f(b) - b·f(a)] / [f(b) - f(a)]"));
  // Hint 3 shows dynamic numerical substitution
  assert(content.hints[2].includes("x = ["));
  assert(content.hints[2].includes("0.0000"));
});

Deno.test("FP Hint 3: Function evaluation hints reveal progressively across levels 1, 2, 3", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  session = processFalsePositionApproximation(session, result, result.iterations[0].c);
  assertEquals(session.currentStep, "f_approximation");

  const context = getFalsePositionStepContext(session, result, "cos(x) - x*exp(x)");
  const content = getFalsePositionFApproximationContent(context);

  // Hint 1: concept
  assert(content.hints[0].includes("must now be substituted into the equation f(x)"));
  // Hint 2: structure
  assert(content.hints[1].includes("replace every occurrence of 'x'"));
  // Hint 3: actual substitution
  assert(content.hints[2].includes("Evaluate f("));
});

Deno.test("FP Hint 4: Interval selection hints reveal progressively across levels 1, 2, 3", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  session = processFalsePositionApproximation(session, result, result.iterations[0].c);
  session = processFalsePositionFApproximation(session, result, result.iterations[0].f_c);
  assertEquals(session.currentStep, "interval_choice");

  const context = getFalsePositionStepContext(session, result, "cos(x) - x*exp(x)");
  const content = getFalsePositionIntervalChoiceContent(context);

  // Hint 1: opposite sign condition
  assert(content.hints[0].includes("opposite endpoint signs"));
  // Hint 2: comparison of signs
  assert(content.hints[1].includes("Compare the sign of f(x)"));
  // Hint 3: course replacement rule
  assert(content.hints[2].includes("SAME sign as"));
  assert(content.hints[2].includes("replace a with x"));
});

Deno.test("FP Hint 5: Dynamic substitution does not hardcode course example values", () => {
  const altResult = solveFalsePosition({
    expression: "x^3 - 2x - 5",
    a: 2,
    b: 3,
    decimalPlaces: 3,
  });
  assert(altResult.success);

  let session = createFalsePositionInteractiveSession(altResult);
  session = processFalsePositionBracketCheck(session, altResult, -1, 16, "x^3 - 2x - 5");
  const context = getFalsePositionStepContext(session, altResult, "x^3 - 2x - 5");
  const content = getFalsePositionApproximationContent(context);

  // Checks that active bounds (2 and 3) are reflected dynamically
  assert(content.hints[2].includes("2.0000"));
  assert(content.hints[2].includes("3.0000"));
});

Deno.test("FP Hint 6: Bisection-midpoint mistake detection", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);

  // Mistakenly inputting Bisection midpoint (0 + 1) / 2 = 0.5
  const updated = processFalsePositionApproximation(session, result, 0.5);
  assertEquals(updated.stepFeedback.status, "incorrect");
  assert(updated.stepFeedback.message?.includes("Bisection midpoint"));
  assert(updated.stepFeedback.message?.includes("secant formula"));
  assert(updated.stepFeedback.mistakeDiagnostic !== undefined);
});

Deno.test("FP Hint 7: Omitted denominator mistake detection", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);

  // Numerator alone = 0 * (-2.17798) - 1 * 1 = -1
  const updated = processFalsePositionApproximation(session, result, -1);
  assertEquals(updated.stepFeedback.status, "incorrect");
  assert(updated.stepFeedback.message?.includes("numerator"));
  assert(updated.stepFeedback.message?.includes("denominator"));
});

Deno.test("FP Hint 8: Entered x instead of f(x) mistake detection", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  session = processFalsePositionApproximation(session, result, result.iterations[0].c);

  // Enters x = 0.31467 itself instead of f(x)
  const updated = processFalsePositionFApproximation(session, result, result.iterations[0].c);
  assertEquals(updated.stepFeedback.status, "incorrect");
  assert(updated.stepFeedback.message?.includes("entered the approximation x"));
});

Deno.test("FP Hint 9: Wrong interval choice rejected with course rule feedback", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  session = processFalsePositionApproximation(session, result, result.iterations[0].c);
  session = processFalsePositionFApproximation(session, result, result.iterations[0].f_c);

  // Choosing wrong replacement
  const updated = processFalsePositionIntervalChoice(session, result, "replace_b");
  assertEquals(updated.stepFeedback.status, "incorrect");
  assert(updated.stepFeedback.message?.includes("SAME sign as f(x)"));
});

Deno.test("FP Hint 10: Neutral fallback for unclassified mistake", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);

  // Completely arbitrary value that does not match verified mistake patterns
  const updated = processFalsePositionApproximation(session, result, 42.123);
  assertEquals(updated.stepFeedback.status, "incorrect");
  assert(updated.stepFeedback.message?.includes("Check your substitution"));
  assertEquals(updated.stepFeedback.mistakeDiagnostic, undefined);
});

Deno.test("FP Hint 11: Progressive hint ordering and cap at 3", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);

  session = requestFalsePositionHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 1);
  assertEquals(session.totalHintsUsed, 1);

  session = requestFalsePositionHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 2);
  assertEquals(session.totalHintsUsed, 2);

  session = requestFalsePositionHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 3);
  assertEquals(session.totalHintsUsed, 3);

  // Calling again must stay capped at 3 and not increase totalHintsUsed
  session = requestFalsePositionHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 3);
  assertEquals(session.totalHintsUsed, 3);
});

Deno.test("FP Hint 12: Hints reset when advancing to next step", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);

  // Request 2 hints during bracket check
  session = requestFalsePositionHint(session);
  session = requestFalsePositionHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 2);

  // Correct bracket check resets hints for the upcoming approximation step
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);
  assertEquals(session.currentStep, "approximation");
  assertEquals(session.hintsRevealedForCurrentStep, 0);

  // Request 1 hint during approximation step
  session = requestFalsePositionHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 1);

  // Correct approximation resets hints for f_approximation
  session = processFalsePositionApproximation(session, result, result.iterations[0].c);
  assertEquals(session.currentStep, "f_approximation");
  assertEquals(session.hintsRevealedForCurrentStep, 0);
});

Deno.test("FP Hint 13: Session hint tracking is preserved across steps", () => {
  const result = getCourseResult();
  let session = createFalsePositionInteractiveSession(result);

  session = requestFalsePositionHint(session); // Bracket Hint 1
  session = processFalsePositionBracketCheck(session, result, 1, -2.17798);

  session = requestFalsePositionHint(session); // Approx Hint 1
  session = requestFalsePositionHint(session); // Approx Hint 2
  session = processFalsePositionApproximation(session, result, result.iterations[0].c);

  session = requestFalsePositionHint(session); // f_approx Hint 1
  session = processFalsePositionFApproximation(session, result, result.iterations[0].f_c);

  session = processFalsePositionIntervalChoice(session, result, "replace_a");

  assertEquals(session.totalHintsUsed, 4);
  assertEquals(session.highestHintLevelUsed, 2);
  assertEquals(session.completedIterations[0].hintsUsedForIteration, 3);
});

Deno.test("FP Hint 14: Hints do not alter deterministic solver results", () => {
  const result = getCourseResult();
  let sessionWithHints = createFalsePositionInteractiveSession(result);
  let sessionNoHints = createFalsePositionInteractiveSession(result);

  // Session with hints
  sessionWithHints = requestFalsePositionHint(sessionWithHints);
  sessionWithHints = processFalsePositionBracketCheck(sessionWithHints, result, 1, -2.17798);
  sessionWithHints = requestFalsePositionHint(sessionWithHints);
  sessionWithHints = processFalsePositionApproximation(sessionWithHints, result, result.iterations[0].c);

  // Session without hints
  sessionNoHints = processFalsePositionBracketCheck(sessionNoHints, result, 1, -2.17798);
  sessionNoHints = processFalsePositionApproximation(sessionNoHints, result, result.iterations[0].c);

  assertEquals(
    sessionWithHints.independentStepsCompleted,
    sessionNoHints.independentStepsCompleted
  );
  assertEquals(sessionWithHints.currentStep, sessionNoHints.currentStep);
});

Deno.test("FP Hint 15: Different equation support (cos(x) - x on [0, 1])", () => {
  const cosResult = solveFalsePosition({
    expression: "cos(x) - x",
    a: 0,
    b: 1,
    decimalPlaces: 3,
  });
  assert(cosResult.success);

  let session = createFalsePositionInteractiveSession(cosResult);
  session = requestFalsePositionHint(session);
  const context = getFalsePositionStepContext(session, cosResult, "cos(x) - x");
  const content = getFalsePositionBracketCheckContent("cos(x) - x", 0, 1, 1, -0.4597);

  assert(content.whyAreWeDoingThis.includes("bracketed"));
  assert(content.hints[1].includes("cos(x) - x"));
});
