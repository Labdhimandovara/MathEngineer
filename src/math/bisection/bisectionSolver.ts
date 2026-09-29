/**
 * Deterministic Bisection Method Engine
 * 
 * Implements the standard Bisection algorithm strictly according
 * to course material specifications for Numerical Techniques.
 */

import { compileExpression, MathFunction } from '../expressionParser';
import {
  BisectionOptions,
  BisectionResult,
  BisectionIteration,
} from './types';
import { isCourseDecimalPlacesMet } from './stoppingCriteria';

const DEFAULT_MAX_ITERATIONS = 100;
const DEFAULT_DECIMAL_PLACES = 2;
const EPSILON_ZERO = 1e-15;

/**
 * Solves an equation f(x) = 0 deterministically on interval [a, b] using the Bisection Method.
 */
export function solveBisection(options: BisectionOptions): BisectionResult {
  const {
    expression,
    a: initialA,
    b: initialB,
    decimalPlaces = DEFAULT_DECIMAL_PLACES,
    maxIterations = DEFAULT_MAX_ITERATIONS,
  } = options;

  // 1. Validate numerical inputs
  if (
    typeof initialA !== 'number' ||
    typeof initialB !== 'number' ||
    !isFinite(initialA) ||
    !isFinite(initialB)
  ) {
    return {
      success: false,
      iterations: [],
      iterations_used: 0,
      errorCode: 'INVALID_BOUNDS',
      error: `Interval bounds must be finite numbers. Received a = ${initialA}, b = ${initialB}.`,
    };
  }

  // 2. Validate a < b
  if (initialA >= initialB) {
    return {
      success: false,
      iterations: [],
      iterations_used: 0,
      errorCode: 'INVALID_BOUNDS',
      error: `Lower bound a must be strictly less than upper bound b. Received a = ${initialA}, b = ${initialB}.`,
    };
  }

  // 3. Resolve evaluation function f(x)
  let f: MathFunction;
  if (typeof expression === 'function') {
    f = expression;
  } else if (typeof expression === 'string') {
    try {
      const parsed = compileExpression(expression);
      f = parsed.fn;
    } catch (err: any) {
      return {
        success: false,
        iterations: [],
        iterations_used: 0,
        errorCode: 'INVALID_EXPRESSION',
        error: `Failed to parse function expression: ${err.message || err}`,
      };
    }
  } else {
    return {
      success: false,
      iterations: [],
      iterations_used: 0,
      errorCode: 'INVALID_EXPRESSION',
      error: `Expression must be a mathematical string or a JavaScript function.`,
    };
  }

  // 4. Calculate f(a) and f(b)
  let f_a: number;
  let f_b: number;
  try {
    f_a = f(initialA);
    f_b = f(initialB);
  } catch (err: any) {
    return {
      success: false,
      iterations: [],
      iterations_used: 0,
      errorCode: 'EVALUATION_ERROR',
      error: `Error evaluating function at boundary points: ${err.message || err}`,
    };
  }

  if (!isFinite(f_a) || !isFinite(f_b)) {
    return {
      success: false,
      iterations: [],
      iterations_used: 0,
      errorCode: 'EVALUATION_ERROR',
      error: `Function produced non-finite value at interval endpoints: f(a) = ${f_a}, f(b) = ${f_b}.`,
    };
  }

  // 5. Check if f(a) = 0 or f(b) = 0 (exact root at boundary)
  if (Math.abs(f_a) <= EPSILON_ZERO) {
    return {
      success: true,
      root: initialA,
      formattedRoot: initialA.toFixed(decimalPlaces),
      iterations: [],
      iterations_used: 0,
      stopping_reason: `Exact root found at lower bound a = ${initialA} where f(a) = 0.`,
      exactRootFoundAt: 'a',
      initialEvaluation: { a: initialA, b: initialB, f_a, f_b },
    };
  }

  if (Math.abs(f_b) <= EPSILON_ZERO) {
    return {
      success: true,
      root: initialB,
      formattedRoot: initialB.toFixed(decimalPlaces),
      iterations: [],
      iterations_used: 0,
      stopping_reason: `Exact root found at upper bound b = ${initialB} where f(b) = 0.`,
      exactRootFoundAt: 'b',
      initialEvaluation: { a: initialA, b: initialB, f_a, f_b },
    };
  }

  // 6. Validate sign condition: f(a) and f(b) must have opposite signs
  if (f_a * f_b > 0) {
    return {
      success: false,
      iterations: [],
      iterations_used: 0,
      errorCode: 'NO_SIGN_CHANGE',
      error: `No sign change on [${initialA}, ${initialB}]: f(a) = ${f_a.toFixed(4)} and f(b) = ${f_b.toFixed(4)} have the same sign. Bisection requires opposite signs (f(a)·f(b) < 0) by Bolzano's Intermediate Value Theorem.`,
      initialEvaluation: { a: initialA, b: initialB, f_a, f_b },
    };
  }

  // 7. Core Iteration Loop
  const iterations: BisectionIteration[] = [];
  let a_n = initialA;
  let b_n = initialB;
  let current_f_a = f_a;
  let current_f_b = f_b;

  for (let n = 0; n < maxIterations; n++) {
    // Calculate midpoint: x_(n+1) = (a_n + b_n) / 2
    const midpoint = (a_n + b_n) / 2;

    let f_midpoint: number;
    try {
      f_midpoint = f(midpoint);
    } catch (err: any) {
      return {
        success: false,
        iterations,
        iterations_used: n + 1,
        errorCode: 'EVALUATION_ERROR',
        error: `Error evaluating function at midpoint x_(${n + 1}) = ${midpoint}: ${err.message || err}`,
      };
    }

    if (!isFinite(f_midpoint)) {
      return {
        success: false,
        iterations,
        iterations_used: n + 1,
        errorCode: 'EVALUATION_ERROR',
        error: `Function produced non-finite value at midpoint x_(${n + 1}) = ${midpoint}: f(midpoint) = ${f_midpoint}.`,
      };
    }

    // Check exact root at midpoint
    const isExactMidpointRoot = Math.abs(f_midpoint) <= EPSILON_ZERO;

    // Determine interval for next step based on signs:
    // Case A: If f(a_n) and f(midpoint) have opposite signs, root lies in [a_n, midpoint]
    // Case B: If f(midpoint) and f(b_n) have opposite signs, root lies in [midpoint, b_n]
    let nextA: number;
    let nextB: number;
    let next_f_a: number;
    let next_f_b: number;

    if (current_f_a * f_midpoint < 0) {
      // Case A: [a_n, midpoint]
      nextA = a_n;
      nextB = midpoint;
      next_f_a = current_f_a;
      next_f_b = f_midpoint;
    } else {
      // Case B: [midpoint, b_n]
      nextA = midpoint;
      nextB = b_n;
      next_f_a = f_midpoint;
      next_f_b = current_f_b;
    }

    // Check if stopping condition is met
    // Uses course decimal-places stopping rule
    const isStoppingMet =
      isExactMidpointRoot ||
      isCourseDecimalPlacesMet(a_n, b_n, midpoint, decimalPlaces);

    const iterationRecord: BisectionIteration = {
      n,
      a: a_n,
      b: b_n,
      midpoint,
      f_a: current_f_a,
      f_b: current_f_b,
      f_midpoint,
      next_interval: [nextA, nextB],
      is_stopping_met: isStoppingMet,
    };

    iterations.push(iterationRecord);

    if (isExactMidpointRoot) {
      return {
        success: true,
        root: midpoint,
        formattedRoot: midpoint.toFixed(decimalPlaces),
        iterations,
        iterations_used: n + 1,
        stopping_reason: `Exact root found at midpoint x_(${n + 1}) = ${midpoint} where f(x_(${n + 1})) = 0.`,
        exactRootFoundAt: 'midpoint',
        initialEvaluation: { a: initialA, b: initialB, f_a, f_b },
      };
    }

    if (isStoppingMet) {
      const formatted = midpoint.toFixed(decimalPlaces);
      return {
        success: true,
        root: midpoint,
        formattedRoot: formatted,
        iterations,
        iterations_used: n + 1,
        stopping_reason: `In step ${n}, a_n (${a_n.toFixed(decimalPlaces)}), b_n (${b_n.toFixed(decimalPlaces)}), and x_(n+1) (${formatted}) are equal up to ${decimalPlaces} decimal places. Root is taken as ${formatted}.`,
        initialEvaluation: { a: initialA, b: initialB, f_a, f_b },
      };
    }

    // Advance to next iteration
    a_n = nextA;
    b_n = nextB;
    current_f_a = next_f_a;
    current_f_b = next_f_b;
  }

  // If loop completes without meeting stopping condition
  const lastIteration = iterations[iterations.length - 1];
  const approximateRoot = lastIteration ? lastIteration.midpoint : (initialA + initialB) / 2;

  return {
    success: false,
    root: approximateRoot,
    formattedRoot: approximateRoot.toFixed(decimalPlaces),
    iterations,
    iterations_used: maxIterations,
    errorCode: 'MAX_ITERATIONS_EXCEEDED',
    stopping_reason: `Maximum iteration safety limit (${maxIterations}) reached before desired accuracy was obtained.`,
    error: `Exceeded maximum iteration limit of ${maxIterations}.`,
    initialEvaluation: { a: initialA, b: initialB, f_a, f_b },
  };
}
