import { assertEquals, assert } from "jsr:@std/assert@1";
import { solveBisection } from "../src/math/bisection/bisectionSolver.ts";
import {
  createInteractiveSession,
  requestHint,
  getStepContext,
  processBracketCheck,
  processMidpoint,
  processFMidpoint,
  processIntervalChoice,
} from "../src/math/bisection/interactiveSolver.ts";
import {
  getBracketCheckContent,
  getMidpointContent,
  getFMidpointContent,
  getIntervalChoiceContent,
} from "../src/data/bisectionEducationalContent.ts";

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

// 1. Hint 1 appears when requested
Deno.test("Hint Test 1: Hint 1 appears when requested", () => {
  const result = getCourseResult();
  const session = createInteractiveSession(result);
  assertEquals(session.hintsRevealedForCurrentStep, 0);

  const withHint1 = requestHint(session);
  assertEquals(withHint1.hintsRevealedForCurrentStep, 1);
  assertEquals(withHint1.totalHintsUsed, 1);
  assertEquals(withHint1.highestHintLevelUsed, 1);
});

// 2. Hint 2 appears only after requesting another hint
Deno.test("Hint Test 2: Hint 2 appears only after requesting another hint", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = requestHint(session); // Hint 1
  assertEquals(session.hintsRevealedForCurrentStep, 1);

  session = requestHint(session); // Hint 2
  assertEquals(session.hintsRevealedForCurrentStep, 2);
  assertEquals(session.totalHintsUsed, 2);
  assertEquals(session.highestHintLevelUsed, 2);
});

// 3. Hint 3 appears only after requesting another hint
Deno.test("Hint Test 3: Hint 3 appears only after requesting another hint and caps at 3", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = requestHint(session); // Hint 1
  session = requestHint(session); // Hint 2
  session = requestHint(session); // Hint 3
  assertEquals(session.hintsRevealedForCurrentStep, 3);
  assertEquals(session.totalHintsUsed, 3);

  // Requesting again should not exceed 3 or add more hints
  const capped = requestHint(session);
  assertEquals(capped.hintsRevealedForCurrentStep, 3);
  assertEquals(capped.totalHintsUsed, 3);
});

// 4. Hints do not automatically reveal the final answer
Deno.test("Hint Test 4: Hints do not automatically reveal the final answer", () => {
  const result = getCourseResult();
  const session = createInteractiveSession(result);
  const context = getStepContext(session, result, "x^3 - 9x + 1");
  const midpointContent = getMidpointContent(context);

  // Expected midpoint is 2.5
  // Hints 1, 2, 3 should guide without directly stating "2.5" as the answer
  assert(!midpointContent.hints[0].includes("2.5"), "Hint 1 should not reveal answer");
  assert(!midpointContent.hints[1].includes("2.5"), "Hint 2 should not reveal answer");
  assert(!midpointContent.hints[2].includes("2.5"), "Hint 3 should not reveal answer");
  assert(midpointContent.hints[2].includes("(2 + 3) / 2"), "Hint 3 should show dynamic substitution structure");
});

// 5. Hint usage is tracked across steps
Deno.test("Hint Test 5: Hint usage is tracked across steps", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);

  // Use 2 hints on bracket check
  session = requestHint(session);
  session = requestHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 2);
  assertEquals(session.totalHintsUsed, 2);

  // Submit correct bracket check
  session = processBracketCheck(session, result, -9, 1);
  assertEquals(session.currentStep, "midpoint");
  // Current step hint counter should reset to 0
  assertEquals(session.hintsRevealedForCurrentStep, 0);
  // Total hints used must be preserved
  assertEquals(session.totalHintsUsed, 2);

  // Use 1 hint on midpoint
  session = requestHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 1);
  assertEquals(session.totalHintsUsed, 3);
});

// 6. Correct midpoint produces a meaningful explanation
Deno.test("Hint Test 6: Correct midpoint produces a meaningful explanation", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);

  session = processMidpoint(session, result, 2.5);
  assertEquals(session.stepFeedback.status, "correct");
  assert(session.stepExplanation !== undefined);
  assert(session.stepExplanation.includes("midpoint divides [2, 3] into two equal intervals"));
});

// 7. Wrong midpoint produces appropriate feedback (e.g. half-width confusion)
Deno.test("Hint Test 7: Wrong midpoint produces appropriate feedback", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);

  // Student enters (3 - 2) / 2 = 0.5 (half-width error)
  session = processMidpoint(session, result, 0.5);
  assertEquals(session.stepFeedback.status, "incorrect");
  assert(session.stepFeedback.message?.includes("interval half-width"));

  // Student enters uncalculated sum 5 (forgot to divide by 2)
  session = processMidpoint(session, result, 5);
  assertEquals(session.stepFeedback.status, "incorrect");
  assert(session.stepFeedback.message?.includes("forgotten to divide by 2"));
});

// 8. Correct interval selection produces a meaningful explanation
Deno.test("Hint Test 8: Correct interval selection produces a meaningful explanation", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);
  session = processMidpoint(session, result, 2.5);
  session = processFMidpoint(session, result, -5.875);

  // Option B: [2.5, 3] is correct
  session = processIntervalChoice(session, result, "right");
  assertEquals(session.stepFeedback.status, "correct");
  assert(session.stepExplanation !== undefined);
  assert(session.stepExplanation.includes("function values at 2.5 and 3 have opposite signs"));
});

// 9. Wrong interval selection produces appropriate feedback
Deno.test("Hint Test 9: Wrong interval selection produces appropriate feedback", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);
  session = processMidpoint(session, result, 2.5);
  session = processFMidpoint(session, result, -5.875);

  // Option A: [2, 2.5] is wrong
  session = processIntervalChoice(session, result, "left");
  assertEquals(session.stepFeedback.status, "incorrect");
  assert(session.stepFeedback.message?.includes("opposite signs"));
});

// 10. Hints reset appropriately when moving to next step
Deno.test("Hint Test 10: Hints reset appropriately when moving to next step", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);

  // Request 3 hints on midpoint
  session = requestHint(session);
  session = requestHint(session);
  session = requestHint(session);
  assertEquals(session.hintsRevealedForCurrentStep, 3);

  // Complete midpoint
  session = processMidpoint(session, result, 2.5);
  assertEquals(session.currentStep, "f_midpoint");
  assertEquals(session.hintsRevealedForCurrentStep, 0, "Must reset on advancing to f_midpoint");
});

// 11. Completion summary reports hint usage correctly
Deno.test("Hint Test 11: Completion summary reports hint usage correctly", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = requestHint(session); // Hint on bracket check
  session = processBracketCheck(session, result, -9, 1);
  session = requestHint(session); // Hint on midpoint
  session = processMidpoint(session, result, 2.5);

  // Total hints used so far
  assertEquals(session.totalHintsUsed, 2);
  assertEquals(session.highestHintLevelUsed, 1);
});

// 12. Dynamic hints work for a completely different polynomial and interval
Deno.test("Hint Test 12: Dynamic hints work for a different polynomial (x^3 - 4x - 9 on [2, 3])", () => {
  const diffResult = solveBisection({
    expression: "x^3 - 4x - 9",
    a: 2,
    b: 3,
    decimalPlaces: 3,
  });
  assert(diffResult.success);

  const session = createInteractiveSession(diffResult);
  const context = getStepContext(session, diffResult, "x^3 - 4x - 9");

  // Midpoint hints must dynamically reflect [2, 3] for x^3 - 4x - 9
  const midpointContent = getMidpointContent(context);
  assert(midpointContent.hints[2].includes("(2 + 3) / 2"));

  // f(x) hints must reflect "x^3 - 4x - 9", NOT the course example "x^3 - 9x + 1"
  const fContent = getFMidpointContent(context);
  assert(fContent.hints[0].includes("x^3 - 4x - 9"), "f(x) hint must contain the actual problem expression");
  assert(!fContent.hints[0].includes("9x + 1"), "f(x) hint must NOT contain hardcoded course expression");
});

// 13. Dynamic hints use updated bounds in later iterations (n = 1, 2)
Deno.test("Hint Test 13: Dynamic hints use updated bounds in later iterations", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);
  session = processMidpoint(session, result, 2.5);
  session = processFMidpoint(session, result, -5.875);
  session = processIntervalChoice(session, result, "right"); // Advances to Iteration 2: [2.5, 3]

  assertEquals(session.currentIterationIndex, 1);
  const contextIter2 = getStepContext(session, result, "x^3 - 9x + 1");
  assertEquals(contextIter2.a, 2.5);
  assertEquals(contextIter2.b, 3);

  const midpointIter2 = getMidpointContent(contextIter2);
  assert(midpointIter2.hints[1].includes("x_2 = (a_1 + b_1) / 2"), "Formula must update iteration indices");
  assert(midpointIter2.hints[2].includes("(2.5 + 3) / 2"), "Hint 3 must substitute new interval [2.5, 3]");
});

// 14. Unrecognized mistakes do not produce fabricated diagnoses
Deno.test("Hint Test 14: Unrecognized mistakes do not produce fabricated diagnoses", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = processBracketCheck(session, result, -9, 1);

  // Enter random arbitrary wrong number 42.123
  session = processMidpoint(session, result, 42.123);
  assertEquals(session.stepFeedback.status, "incorrect");
  // Should use neutral, truthful feedback, not claim half-width or sign error
  assert(!session.stepFeedback.message?.includes("half-width"));
  assert(session.stepFeedback.message?.includes("The midpoint is the average of the current lower and upper bounds"));
});

// 15. Hint history is preserved when reviewing completed steps
Deno.test("Hint Test 15: Hint history is preserved in state", () => {
  const result = getCourseResult();
  let session = createInteractiveSession(result);
  session = requestHint(session); // Hint 1 on bracket
  session = requestHint(session); // Hint 2 on bracket
  session = processBracketCheck(session, result, -9, 1);

  // History should record iter0_bracket_check used 2 hints
  assertEquals(session.hintHistory["iter0_bracket_check"], 2);
});
