/**
 * Tests for Newton-Raphson Deterministic Interactive State Machine
 */

import { assertEquals, assertNotEquals } from 'jsr:@std/assert';
import { solveNewtonRaphson } from '../src/math/newtonRaphson/newtonRaphsonSolver.ts';
import {
  createNewtonRaphsonInteractiveSession,
  processNewtonRaphsonCheckX0,
  processNewtonRaphsonEvaluateFx,
  processNewtonRaphsonEvaluateFPrime,
  processNewtonRaphsonApplyFormula,
  processNewtonRaphsonCheckStopping,
} from '../src/math/newtonRaphson/interactiveSolver.ts';

function createCourseSession() {
  const result = solveNewtonRaphson({
    expression: 'x^4 - x - 10',
    a: 1,
    b: 2,
    x0: 2,
    decimalPlaces: 3,
    precisionMode: 'course_step_rounding',
  });
  return createNewtonRaphsonInteractiveSession(result, 'x^4 - x - 10 = 0');
}

Deno.test('Newton Interactive 1: Session starts at check_x0 step', () => {
  const session = createCourseSession();
  assertEquals(session.currentStep, 'check_x0');
  assertEquals(session.currentIterationIndex, 0);
  assertEquals(session.isComplete, false);
  assertEquals(session.hintsRevealedForCurrentStep, 0);
});

Deno.test('Newton Interactive 2: Correct initial guess x0 = 2 advances to evaluate_fx', () => {
  const session = createCourseSession();
  const { state: next, feedback } = processNewtonRaphsonCheckX0(session, 2);
  assertEquals(feedback.isCorrect, true);
  assertEquals(next.currentStep, 'evaluate_fx');
  assertEquals(next.hintsRevealedForCurrentStep, 0);
});

Deno.test('Newton Interactive 3: Incorrect endpoint x0 = 1 is diagnosed with magnitude rule', () => {
  const session = createCourseSession();
  const { state: next, feedback } = processNewtonRaphsonCheckX0(session, 1);
  assertEquals(feedback.isCorrect, false);
  assertEquals(next.currentStep, 'check_x0');
  assertEquals(feedback.mistakeDiagnostic?.includes('|f(1)| is further from zero'), true);
});

Deno.test('Newton Interactive 4: Correct f(2) = 4 accepted and advances to evaluate_fprime', () => {
  const session = createCourseSession();
  const { state: s1 } = processNewtonRaphsonCheckX0(session, 2);
  const { state: s2, feedback } = processNewtonRaphsonEvaluateFx(s1, 4);
  assertEquals(feedback.isCorrect, true);
  assertEquals(s2.currentStep, 'evaluate_fprime');
});

Deno.test('Newton Interactive 5: Entering x = 2 instead of f(2) is diagnosed', () => {
  const session = createCourseSession();
  const { state: s1 } = processNewtonRaphsonCheckX0(session, 2);
  const { state: s2, feedback } = processNewtonRaphsonEvaluateFx(s1, 2);
  assertEquals(feedback.isCorrect, false);
  assertEquals(s2.currentStep, 'evaluate_fx');
  assertEquals(feedback.mistakeDiagnostic?.includes('You entered the approximation x = 2'), true);
});

Deno.test('Newton Interactive 6: Correct f\'(2) = 31 accepted and advances to apply_formula', () => {
  const session = createCourseSession();
  const { state: s1 } = processNewtonRaphsonCheckX0(session, 2);
  const { state: s2 } = processNewtonRaphsonEvaluateFx(s1, 4);
  const { state: s3, feedback } = processNewtonRaphsonEvaluateFPrime(s2, 31);
  assertEquals(feedback.isCorrect, true);
  assertEquals(s3.currentStep, 'apply_formula');
});

Deno.test('Newton Interactive 7: Entering f(2) = 4 instead of f\'(2) = 31 is diagnosed', () => {
  const session = createCourseSession();
  const { state: s1 } = processNewtonRaphsonCheckX0(session, 2);
  const { state: s2 } = processNewtonRaphsonEvaluateFx(s1, 4);
  const { state: s3, feedback } = processNewtonRaphsonEvaluateFPrime(s2, 4);
  assertEquals(feedback.isCorrect, false);
  assertEquals(s3.currentStep, 'evaluate_fprime');
  assertEquals(feedback.mistakeDiagnostic?.includes('You entered f(2.0000)'), true);
});

Deno.test('Newton Interactive 8: Correct formula result x1 = 1.871 accepted and advances to check_stopping', () => {
  const session = createCourseSession();
  const { state: s1 } = processNewtonRaphsonCheckX0(session, 2);
  const { state: s2 } = processNewtonRaphsonEvaluateFx(s1, 4);
  const { state: s3 } = processNewtonRaphsonEvaluateFPrime(s2, 31);
  const { state: s4, feedback } = processNewtonRaphsonApplyFormula(s3, 1.871);
  assertEquals(feedback.isCorrect, true);
  assertEquals(s4.currentStep, 'check_stopping');
});

Deno.test('Newton Interactive 9: Diagnoses missing minus sign (x + f/f\')', () => {
  const session = createCourseSession();
  const { state: s1 } = processNewtonRaphsonCheckX0(session, 2);
  const { state: s2 } = processNewtonRaphsonEvaluateFx(s1, 4);
  const { state: s3 } = processNewtonRaphsonEvaluateFPrime(s2, 31);
  // User adds 2 + 4/31 = 2.129
  const { state: s4, feedback } = processNewtonRaphsonApplyFormula(s3, 2.129);
  assertEquals(feedback.isCorrect, false);
  assertEquals(s4.currentStep, 'apply_formula');
  assertEquals(feedback.mistakeDiagnostic?.includes('added the ratio instead of subtracting'), true);
});

Deno.test('Newton Interactive 10: Diagnoses inverted ratio (x - f\'/f)', () => {
  const session = createCourseSession();
  const { state: s1 } = processNewtonRaphsonCheckX0(session, 2);
  const { state: s2 } = processNewtonRaphsonEvaluateFx(s1, 4);
  const { state: s3 } = processNewtonRaphsonEvaluateFPrime(s2, 31);
  // User calculates 2 - 31/4 = 2 - 7.75 = -5.75
  const { state: s4, feedback } = processNewtonRaphsonApplyFormula(s3, -5.75);
  assertEquals(feedback.isCorrect, false);
  assertEquals(feedback.mistakeDiagnostic?.includes('inverted the ratio as f\'(x_n)/f(x_n)'), true);
});

Deno.test('Newton Interactive 11: Diagnoses omitted denominator (x - f)', () => {
  const session = createCourseSession();
  const { state: s1 } = processNewtonRaphsonCheckX0(session, 2);
  const { state: s2 } = processNewtonRaphsonEvaluateFx(s1, 4);
  const { state: s3 } = processNewtonRaphsonEvaluateFPrime(s2, 31);
  // User calculates 2 - 4 = -2
  const { state: s4, feedback } = processNewtonRaphsonApplyFormula(s3, -2);
  assertEquals(feedback.isCorrect, false);
  assertEquals(feedback.mistakeDiagnostic?.includes('forgot to divide by the derivative'), true);
});

Deno.test('Newton Interactive 12: Stopping check "continue" advances to iteration 2', () => {
  const session = createCourseSession();
  const { state: s1 } = processNewtonRaphsonCheckX0(session, 2);
  const { state: s2 } = processNewtonRaphsonEvaluateFx(s1, 4);
  const { state: s3 } = processNewtonRaphsonEvaluateFPrime(s2, 31);
  const { state: s4 } = processNewtonRaphsonApplyFormula(s3, 1.871);
  const { state: s5, feedback } = processNewtonRaphsonCheckStopping(s4, 'continue');
  assertEquals(feedback.isCorrect, true);
  assertEquals(s5.currentIterationIndex, 1);
  assertEquals(s5.currentStep, 'evaluate_fx');
  assertEquals(s5.completedIterations.length, 1);
  assertEquals(s5.completedIterations[0].x_n, 2);
  assertEquals(s5.completedIterations[0].x_next, 1.871);
});

Deno.test('Newton Interactive 13: Stopping check rejects premature "stop" when x0 != x1', () => {
  const session = createCourseSession();
  const { state: s1 } = processNewtonRaphsonCheckX0(session, 2);
  const { state: s2 } = processNewtonRaphsonEvaluateFx(s1, 4);
  const { state: s3 } = processNewtonRaphsonEvaluateFPrime(s2, 31);
  const { state: s4 } = processNewtonRaphsonApplyFormula(s3, 1.871);
  const { state: s5, feedback } = processNewtonRaphsonCheckStopping(s4, 'stop');
  assertEquals(feedback.isCorrect, false);
  assertEquals(feedback.mistakeDiagnostic?.includes('do not yet agree'), true);
});

Deno.test('Newton Interactive 14: Multi-iteration progression to completion (x = 1.856)', () => {
  let session = createCourseSession();

  // Iteration 1
  session = processNewtonRaphsonCheckX0(session, 2).state;
  session = processNewtonRaphsonEvaluateFx(session, 4).state;
  session = processNewtonRaphsonEvaluateFPrime(session, 31).state;
  session = processNewtonRaphsonApplyFormula(session, 1.871).state;
  session = processNewtonRaphsonCheckStopping(session, 'continue').state;

  // Iteration 2
  assertEquals(session.currentIterationIndex, 1);
  session = processNewtonRaphsonEvaluateFx(session, 0.383).state;
  session = processNewtonRaphsonEvaluateFPrime(session, 25.199).state;
  session = processNewtonRaphsonApplyFormula(session, 1.856).state;
  session = processNewtonRaphsonCheckStopping(session, 'continue').state;

  // Iteration 3
  assertEquals(session.currentIterationIndex, 2);
  session = processNewtonRaphsonEvaluateFx(session, 0.010).state;
  session = processNewtonRaphsonEvaluateFPrime(session, 24.574).state;
  session = processNewtonRaphsonApplyFormula(session, 1.856).state;
  session = processNewtonRaphsonCheckStopping(session, 'stop').state;

  assertEquals(session.isComplete, true);
  assertEquals(session.currentStep, 'completed');
  assertEquals(session.completedIterations.length, 3);
  assertEquals(session.completedIterations[2].x_next, 1.856);
});
