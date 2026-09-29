import { assertEquals, assert } from "jsr:@std/assert@1";
import { getBisectionLessonContent } from "../src/data/bisectionLessonContent.ts";
import { solveBisection } from "../src/math/bisection/bisectionSolver.ts";

// 1. Lesson content exists and contains all required sections A through J
Deno.test("BisectionLesson Test 1: Content contains all required sections A through J", () => {
  const lesson = getBisectionLessonContent();

  assert(lesson !== null);
  assertEquals(lesson.courseTitle, "Numerical Techniques");
  assertEquals(lesson.methodTitle, "Bisection Method");

  // Sections A through J presence
  assert(lesson.sectionA && lesson.sectionA.id === "section-a");
  assert(lesson.sectionB && lesson.sectionB.id === "section-b");
  assert(lesson.sectionC && lesson.sectionC.id === "section-c");
  assert(lesson.sectionD && lesson.sectionD.id === "section-d");
  assert(lesson.sectionE && lesson.sectionE.id === "section-e");
  assert(lesson.sectionF && lesson.sectionF.id === "section-f");
  assert(lesson.sectionG && lesson.sectionG.id === "section-g");
  assert(lesson.sectionH && lesson.sectionH.id === "section-h");
  assert(lesson.sectionI && lesson.sectionI.id === "section-i");
  assert(lesson.sectionJ && lesson.sectionJ.id === "section-j");
});

// 2. Root definition and equation types are represented
Deno.test("BisectionLesson Test 2: Root definition and equation types are represented", () => {
  const { sectionA } = getBisectionLessonContent();

  assert(sectionA.rootDefinition.statement.includes("root"));
  assert(sectionA.rootDefinition.notation.includes("f(α) = 0"));
  assert(sectionA.context.includes("algebraic and transcendental"));

  // Check algebraic and transcendental types
  assertEquals(sectionA.equationTypes.algebraic.name, "Algebraic Equations");
  assert(sectionA.equationTypes.algebraic.examples.length >= 2);
  assertEquals(sectionA.equationTypes.transcendental.name, "Transcendental Equations");
  assert(sectionA.equationTypes.transcendental.examples.length >= 2);
});

// 3. Continuity and opposite-sign initial condition are represented
Deno.test("BisectionLesson Test 3: Continuity and opposite-sign conditions are represented", () => {
  const { sectionC } = getBisectionLessonContent();

  assert(sectionC.continuityCondition.includes("continuous"));
  assert(sectionC.oppositeSignCondition.includes("opposite signs"));
  assertEquals(sectionC.signNotation, "f(a) · f(b) < 0");
  assert(sectionC.consequence.includes("real root"));
});

// 4. Midpoint formula is represented in the procedure
Deno.test("BisectionLesson Test 4: Midpoint formula is explicitly represented", () => {
  const { sectionD } = getBisectionLessonContent();

  const midpointStep = sectionD.steps.find((s) => s.stepNumber === 4);
  assert(midpointStep !== undefined);
  assert(midpointStep.instruction.includes("midpoint"));
  assert(midpointStep.mathFormula?.includes("(a_n + b_n) / 2"));
});

// 5. Interval-selection concept is represented
Deno.test("BisectionLesson Test 5: Interval selection logic is accurately detailed", () => {
  const { sectionD, sectionE } = getBisectionLessonContent();

  const intervalStep = sectionD.steps.find((s) => s.stepNumber === 6);
  assert(intervalStep !== undefined);
  assert(intervalStep.instruction.includes("opposite sign"));

  const choosePhase = sectionE.phases.find((p) => p.phase.includes("Choose Half"));
  assert(choosePhase !== undefined);
  assert(choosePhase.purpose.includes("opposite signs"));
});

// 6. Iteration table columns are represented
Deno.test("BisectionLesson Test 6: Iteration table columns match course structure", () => {
  const { sectionF } = getBisectionLessonContent();

  const headers = sectionF.columns.map((c) => c.header);
  assert(headers.includes("n"));
  assert(headers.includes("a_n"));
  assert(headers.includes("b_n"));
  assert(headers.includes("x_(n+1)"));
  assert(headers.includes("f(x_(n+1))"));
});

// 7. Course example equation is represented
Deno.test("BisectionLesson Test 7: Course example matches course parameters", () => {
  const { sectionG } = getBisectionLessonContent();

  assertEquals(sectionG.equation, "x^3 - 9x + 1 = 0");
  assertEquals(sectionG.interval, [2, 3]);
  assertEquals(sectionG.requiredAccuracy, "2 decimal places");
  assert(sectionG.initialCheck.conclusion.includes("f(2) · f(3) < 0"));
});

// 8. Result is derived from the deterministic solver rather than hardcoded
Deno.test("BisectionLesson Test 8: 2.94 result is derived directly from deterministic solver", () => {
  const { sectionG } = getBisectionLessonContent();

  // Directly run deterministic solver to confirm source of truth
  const canonicalResult = solveBisection({
    expression: "x^3 - 9x + 1",
    a: 2,
    b: 3,
    decimalPlaces: 2,
  });

  // Verify that the lesson's solverResult is identical to the canonical engine output
  assertEquals(sectionG.solverResult.formattedRoot, canonicalResult.formattedRoot);
  assertEquals(sectionG.solverResult.iterations_used, canonicalResult.iterations_used);
  assertEquals(sectionG.solverResult.iterations.length, canonicalResult.iterations.length);
  assertEquals(sectionG.approximateRoot, canonicalResult.formattedRoot);
  assertEquals(sectionG.approximateRoot, "2.94");
});

// 9. Stopping explanation is explicitly Bisection/course-specific
Deno.test("BisectionLesson Test 9: Stopping condition is course-specific and not universal", () => {
  const { sectionH } = getBisectionLessonContent();

  assert(sectionH.stoppingRule.includes("agree to the required number of decimal places"));
  assert(sectionH.demonstratedExplanation.includes("2.94"));
  assert(
    sectionH.methodSpecificClarification.includes(
      "should not be assumed to be a universal stopping rule for all numerical methods"
    )
  );
});

// 10. Common mistakes are separated as MathEngineer Learning Guidance and grounded in procedure
Deno.test("BisectionLesson Test 10: Mistakes are marked as MathEngineer guidance and procedure-grounded", () => {
  const { sectionI } = getBisectionLessonContent();

  assertEquals(sectionI.category, "MathEngineer Learning Guidance");
  assert(sectionI.items.length >= 5);

  const mistakeIds = sectionI.items.map((item) => item.id);
  assert(mistakeIds.includes("sign-check"));
  assert(mistakeIds.includes("half-width-confusion"));
  assert(mistakeIds.includes("sum-without-halving"));
  assert(mistakeIds.includes("wrong-interval-retention"));
  assert(mistakeIds.includes("confusing-x-with-fx"));
  assert(mistakeIds.includes("premature-stopping"));
});

// 11. CTA targets existing working flows
Deno.test("BisectionLesson Test 11: CTAs launch existing working flows without fake routes", () => {
  const { sectionJ } = getBisectionLessonContent();

  assertEquals(sectionJ.tryMyselfCTA.target, "solve");
  assertEquals(sectionJ.tryMyselfCTA.action, "myself");
  assertEquals(sectionJ.practiceCTA.target, "practice");
});
