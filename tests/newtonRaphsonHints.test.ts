/**
 * Tests for Newton-Raphson Progressive Hints and Mistake Diagnostics
 */

import { assertEquals } from 'jsr:@std/assert';
import { solveNewtonRaphson } from '../src/math/newtonRaphson/newtonRaphsonSolver.ts';
import {
  createNewtonRaphsonInteractiveSession,
  requestNewtonRaphsonHint,
  processNewtonRaphsonCheckX0,
  processNewtonRaphsonEvaluateFx,
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

Deno.test('Newton Hints 1: Initial check_x0 hints reveal progressively 1 -> 2 -> 3', () => {
  let session = createCourseSession();

  const h1 = requestNewtonRaphsonHint(session);
  assertEquals(h1.state.hintsRevealedForCurrentStep, 1);
  assertEquals(h1.hint?.includes('initial approximation x₀'), true);

  const h2 = requestNewtonRaphsonHint(h1.state);
  assertEquals(h2.state.hintsRevealedForCurrentStep, 2);
  assertEquals(h2.hint?.includes('Compare |f(1)|'), true);

  const h3 = requestNewtonRaphsonHint(h2.state);
  assertEquals(h3.state.hintsRevealedForCurrentStep, 3);
  assertEquals(h3.hint?.includes('x₀ = 2'), true);
});

Deno.test('Newton Hints 2: Hints cap at 3 and do not exceed', () => {
  let session = createCourseSession();
  session = requestNewtonRaphsonHint(session).state;
  session = requestNewtonRaphsonHint(session).state;
  session = requestNewtonRaphsonHint(session).state;
  assertEquals(session.hintsRevealedForCurrentStep, 3);

  // 4th request returns last hint and stays at 3
  const h4 = requestNewtonRaphsonHint(session);
  assertEquals(h4.state.hintsRevealedForCurrentStep, 3);
  assertEquals(h4.hint?.includes('x₀ = 2'), true);
});

Deno.test('Newton Hints 3: Hints reset to 0 when advancing to next step', () => {
  let session = createCourseSession();
  session = requestNewtonRaphsonHint(session).state;
  session = requestNewtonRaphsonHint(session).state;
  assertEquals(session.hintsRevealedForCurrentStep, 2);

  const { state: next } = processNewtonRaphsonCheckX0(session, 2);
  assertEquals(next.currentStep, 'evaluate_fx');
  assertEquals(next.hintsRevealedForCurrentStep, 0);
});

Deno.test('Newton Hints 4: evaluate_fx step reveals progressive hints', () => {
  let session = createCourseSession();
  session = processNewtonRaphsonCheckX0(session, 2).state;

  const h1 = requestNewtonRaphsonHint(session);
  assertEquals(h1.state.hintsRevealedForCurrentStep, 1);
  assertEquals(h1.hint?.includes('Substitute the current approximation'), true);

  const h2 = requestNewtonRaphsonHint(h1.state);
  assertEquals(h2.state.hintsRevealedForCurrentStep, 2);

  const h3 = requestNewtonRaphsonHint(h2.state);
  assertEquals(h3.state.hintsRevealedForCurrentStep, 3);
  assertEquals(h3.hint?.includes('4.0000'), true);
});

Deno.test('Newton Hints 5: Session accumulates total hints and highest hint level', () => {
  let session = createCourseSession();
  session = requestNewtonRaphsonHint(session).state; // 1
  session = requestNewtonRaphsonHint(session).state; // 2
  assertEquals(session.totalHintsUsed, 2);
  assertEquals(session.highestHintLevelUsed, 2);

  session = processNewtonRaphsonCheckX0(session, 2).state;
  session = requestNewtonRaphsonHint(session).state; // 3
  assertEquals(session.totalHintsUsed, 3);
  assertEquals(session.highestHintLevelUsed, 2);
});

Deno.test('Newton Hints 6: Hint history preserves records', () => {
  let session = createCourseSession();
  session = requestNewtonRaphsonHint(session).state;
  session = requestNewtonRaphsonHint(session).state;
  assertEquals(session.hintHistory.length, 2);
  assertEquals(session.hintHistory[0].step, 'check_x0');
  assertEquals(session.hintHistory[0].hintLevel, 1);
  assertEquals(session.hintHistory[1].hintLevel, 2);
});

Deno.test('Newton Hints 7: Hints dynamically substitute updated x_n in later iterations', () => {
  let session = createCourseSession();
  session = processNewtonRaphsonCheckX0(session, 2).state;
  session = processNewtonRaphsonEvaluateFx(session, 4).state;
  // Move to iteration 2
  session = {
    ...session,
    currentIterationIndex: 1,
    currentStep: 'evaluate_fx',
    hintsRevealedForCurrentStep: 0,
  };

  const h1 = requestNewtonRaphsonHint(session);
  assertEquals(h1.hint?.includes('1.8710'), true);
});

Deno.test('Newton Hints 8: Hints work on a different equation (3x - cos(x) - 1 = 0)', () => {
  const result = solveNewtonRaphson({
    expression: '3x - cos(x) - 1',
    a: 0,
    b: 1,
    x0: 0.6,
    decimalPlaces: 4,
  });
  let session = createNewtonRaphsonInteractiveSession(result, '3x - cos(x) - 1 = 0');
  const h1 = requestNewtonRaphsonHint(session);
  assertEquals(h1.state.hintsRevealedForCurrentStep, 1);
});

Deno.test('Newton Hints 9: Requesting hints does not alter solver results', () => {
  let session = createCourseSession();
  requestNewtonRaphsonHint(session);
  requestNewtonRaphsonHint(session);
  requestNewtonRaphsonHint(session);

  assertEquals(session.canonicalResult.formattedRoot, '1.856');
  assertEquals(session.canonicalResult.iterations.length, 3);
});

Deno.test('Newton Hints 10: Neutral fallback for unclassified mistake', () => {
  let session = createCourseSession();
  session = processNewtonRaphsonCheckX0(session, 2).state;
  const { feedback } = processNewtonRaphsonEvaluateFx(session, 999.123);
  assertEquals(feedback.isCorrect, false);
  assertEquals(feedback.message.includes('Re-evaluate f(x)'), true);
});
