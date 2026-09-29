/**
 * Tests for Newton-Raphson Lesson Content Model
 */

import { assertEquals, assertNotEquals } from 'jsr:@std/assert';
import { getNewtonRaphsonLessonContent } from '../src/data/newtonRaphsonLessonContent.ts';

Deno.test('Newton Lesson 1: Contains all 10 canonical course sections (A to J)', () => {
  const content = getNewtonRaphsonLessonContent();
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

Deno.test('Newton Lesson 2: Section A defines root and equation types', () => {
  const content = getNewtonRaphsonLessonContent();
  assertEquals(content.sectionA.rootDefinition.notation, 'f(α) = 0');
  assertEquals(content.sectionA.equationTypes.algebraic.name, 'Algebraic Equations');
  assertEquals(content.sectionA.equationTypes.transcendental.name, 'Transcendental Equations');
});

Deno.test('Newton Lesson 3: Section B explains tangent line concept', () => {
  const content = getNewtonRaphsonLessonContent();
  assertEquals(content.sectionB.tangentIdea.includes('tangent line'), true);
  assertEquals(content.sectionB.concept.includes('open iterative'), true);
});

Deno.test('Newton Lesson 4: Section C states initial bracket requirement and x0 selection rule', () => {
  const content = getNewtonRaphsonLessonContent();
  assertEquals(content.sectionC.mathCriterion, '|f(x₀)| = min(|f(a)|, |f(b)|)');
  assertEquals(content.sectionC.x0SelectionRule.includes('closer to zero'), true);
});

Deno.test('Newton Lesson 5: Section D provides Newton-Raphson formula and 5 procedure steps', () => {
  const content = getNewtonRaphsonLessonContent();
  assertEquals(content.sectionD.formula, 'x_(n+1) = x_n - f(x_n) / f\'(x_n)');
  assertEquals(content.sectionD.steps.length, 5);
});

Deno.test('Newton Lesson 6: Section G contains dynamic course worked example reaching 1.856', () => {
  const content = getNewtonRaphsonLessonContent();
  assertEquals(content.sectionG.equation, 'x^4 - x - 10 = 0');
  assertEquals(content.sectionG.initialX0, 2);
  assertEquals(content.sectionG.approximateRoot, '1.856');
  assertEquals(content.sectionG.solverResult.success, true);
});

Deno.test('Newton Lesson 7: Section I lists common mistake checks including missing minus and swapped derivative', () => {
  const content = getNewtonRaphsonLessonContent();
  const mistakeIds = content.sectionI.items.map((i) => i.id);
  assertEquals(mistakeIds.includes('missing-minus'), true);
  assertEquals(mistakeIds.includes('swapped-derivative'), true);
  assertEquals(mistakeIds.includes('omitted-denominator'), true);
});

Deno.test('Newton Lesson 8: Section J provides CTAs to Solve With Me and Practice', () => {
  const content = getNewtonRaphsonLessonContent();
  assertEquals(content.sectionJ.tryMyselfCTA.target, 'solve');
  assertEquals(content.sectionJ.tryMyselfCTA.action, 'myself');
  assertEquals(content.sectionJ.practiceCTA.target, 'practice');
});
