/**
 * Tests for False Position Lesson Content Model
 */

import { assertEquals, assertNotEquals } from 'jsr:@std/assert';
import { getFalsePositionLessonContent } from '../src/data/falsePositionLessonContent.ts';

Deno.test('FP Lesson 1: Contains all 10 canonical course sections (A to J)', () => {
  const content = getFalsePositionLessonContent();
  assertNotEquals(content.sectionA, undefined);
  assertNotEquals(content.sectionB, undefined);
  assertNotEquals(content.sectionC, undefined);
  assertNotEquals(content.sectionD, undefined);
  assertNotEquals(content.sectionE, undefined);
  assertNotEquals(content.sectionF, undefined);
  assertNotEquals(content.sectionG, undefined);
  assertNotEquals(content.sectionH, undefined);
  assertNotEquals(content.sectionI, undefined);
  assertNotEquals(content.sectionJ, undefined);
});

Deno.test('FP Lesson 2: Section A defines root and algebraic vs transcendental equations', () => {
  const content = getFalsePositionLessonContent();
  assertEquals(content.sectionA.rootDefinition.notation, 'f(α) = 0');
  assertEquals(content.sectionA.equationTypes.algebraic.name, 'Algebraic Equations');
  assertEquals(content.sectionA.equationTypes.transcendental.name, 'Transcendental Equations');
});

Deno.test('FP Lesson 3: Section B explains secant chord geometric idea', () => {
  const content = getFalsePositionLessonContent();
  assertEquals(content.sectionB.geometricIdea.includes('chord'), true);
  assertEquals(content.sectionB.concept.includes('Regula Falsi'), true);
});

Deno.test('FP Lesson 4: Section C states continuity and opposite sign conditions', () => {
  const content = getFalsePositionLessonContent();
  assertEquals(content.sectionC.signNotation, 'f(a) · f(b) < 0');
  assertEquals(content.sectionC.continuityCondition.includes('continuous'), true);
});

Deno.test('FP Lesson 5: Section D provides False Position secant formula and 5 steps', () => {
  const content = getFalsePositionLessonContent();
  assertEquals(content.sectionD.formula.includes('[a · f(b) - b · f(a)]'), true);
  assertEquals(content.sectionD.steps.length, 5);
});

Deno.test('FP Lesson 6: Section G contains dynamic course worked example reaching 0.5177', () => {
  const content = getFalsePositionLessonContent();
  assertEquals(content.sectionG.equation, 'cos(x) - x*exp(x) = 0');
  assertEquals(content.sectionG.interval, [0, 1]);
  assertEquals(content.sectionG.approximateRoot, '0.5177');
  assertEquals(content.sectionG.solverResult.success, true);
});

Deno.test('FP Lesson 7: Section I lists common mistake checks including midpoint confusion', () => {
  const content = getFalsePositionLessonContent();
  const mistakeIds = content.sectionI.items.map((i) => i.id);
  assertEquals(mistakeIds.includes('bisection-confusion'), true);
  assertEquals(mistakeIds.includes('omitted-denominator'), true);
  assertEquals(mistakeIds.includes('sign-in-numerator'), true);
});

Deno.test('FP Lesson 8: Section J provides CTAs to Solve With Me and Practice', () => {
  const content = getFalsePositionLessonContent();
  assertEquals(content.sectionJ.tryMyselfCTA.target, 'solve');
  assertEquals(content.sectionJ.tryMyselfCTA.action, 'myself');
  assertEquals(content.sectionJ.practiceCTA.target, 'practice');
});
