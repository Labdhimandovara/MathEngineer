/**
 * Deterministic False Position (Regula Falsi) Method Engine
 * 
 * Implements the standard False Position root-finding algorithm.
 * Uses the exact secant-intercept approximation formula while preserving
 * full internal numerical precision.
 */

import { validateInitialBracket } from '../numerical/bracketValidation.ts';
import { EPSILON_ZERO } from '../numerical/precision.ts';
import { evaluateStoppingCondition } from './stoppingCriteria.ts';
import {
  FalsePositionOptions,
  FalsePositionResult,
  FalsePositionIteration,
} from './types.ts';

const DEFAULT_MAX_ITERATIONS = 100;
const DEFAULT_DECIMAL_PLACES = 2;

/**
 * Solves an equation f(x) = 0 deterministically on interval [a, b] using the False Position Method.
 */
export function solveFalsePosition(options: FalsePositionOptions): FalsePositionResult {
  const {
    expression,
    a: initialA,
    b: initialB,
    decimalPlaces = DEFAULT_DECIMAL_PLACES,
    tolerance,
    maxIterations = DEFAULT_MAX_ITERATIONS,
    stoppingStrategy = 'decimal_places',
    customStoppingCriterion,
  } = options;

  // 1. Validate initial bracket preconditions
  const validation = validateInitialBracket({
    expression,
    a: initialA,
    b: initialB,
    epsilonZero: EPSILON_ZERO,
    methodName: 'False Position Method',
  });

  if (!validation.isValid) {
    return {
      success: false,
      iterations: [],
      iterations_used: 0,
      errorCode: validation.errorCode,
      error: validation.error,
      initialEvaluation: validation.initialEvaluation,
    };
  }

  const { f, a, b, f_a, f_b, exactBoundaryRoot } = validation;

  // 2. Handle exact boundary root
  if (exactBoundaryRoot === 'a') {
    return {
      success: true,
      root: a,
      formattedRoot: a.toFixed(decimalPlaces),
      iterations: [],
      iterations_used: 0,
      stopping_reason: `Exact root found at lower bound a = ${a} where f(a) = 0.`,
      stopping_strategy_used: 'exact_boundary_root',
      exactRootFoundAt: 'a',
      initialEvaluation: { a, b, f_a, f_b },
    };
  }

  if (exactBoundaryRoot === 'b') {
    return {
      success: true,
      root: b,
      formattedRoot: b.toFixed(decimalPlaces),
      iterations: [],
      iterations_used: 0,
      stopping_reason: `Exact root found at upper bound b = ${b} where f(b) = 0.`,
      stopping_strategy_used: 'exact_boundary_root',
      exactRootFoundAt: 'b',
      initialEvaluation: { a, b, f_a, f_b },
    };
  }

  // 3. Iteration loop
  const iterations: FalsePositionIteration[] = [];
  let a_n = a;
  let b_n = b;
  let current_f_a = f_a;
  let current_f_b = f_b;

  for (let n = 0; n < maxIterations; n++) {
    // False Position secant-intercept formula:
    // c = (a_n * f(b_n) - b_n * f(a_n)) / (f(b_n) - f(a_n))
    // Denominator cannot be zero because f(a_n) and f(b_n) have opposite signs (f(a) * f(b) < 0).
    const denominator = current_f_b - current_f_a;
    if (Math.abs(denominator) <= EPSILON_ZERO) {
      return {
        success: false,
        iterations,
        iterations_used: n,
        errorCode: 'EVALUATION_ERROR',
        error: `Denominator f(b) - f(a) is zero at iteration ${n + 1}.`,
        initialEvaluation: { a, b, f_a, f_b },
      };
    }

    // Preserve full precision calculation
    const c = (a_n * current_f_b - b_n * current_f_a) / denominator;

    // Evaluate f(c)
    let f_c: number;
    try {
      f_c = f(c);
    } catch (err: any) {
      return {
        success: false,
        iterations,
        iterations_used: n + 1,
        errorCode: 'EVALUATION_ERROR',
        error: `Error evaluating function at False Position approximation c_(${n + 1}) = ${c}: ${err?.message || err}`,
        initialEvaluation: { a, b, f_a, f_b },
      };
    }

    if (!isFinite(f_c)) {
      return {
        success: false,
        iterations,
        iterations_used: n + 1,
        errorCode: 'EVALUATION_ERROR',
        error: `Function produced non-finite value at approximation c_(${n + 1}) = ${c}: f(c) = ${f_c}.`,
        initialEvaluation: { a, b, f_a, f_b },
      };
    }

    const isExactRoot = Math.abs(f_c) <= EPSILON_ZERO;

    // Sign-based interval selection:
    // Retain the half-interval that continues to bracket the root with opposite endpoint signs.
    let nextA: number;
    let nextB: number;
    let next_f_a: number;
    let next_f_b: number;

    if (current_f_a * f_c < 0) {
      // Root lies in [a_n, c]
      nextA = a_n;
      nextB = c;
      next_f_a = current_f_a;
      next_f_b = f_c;
    } else {
      // Root lies in [c, b_n]
      nextA = c;
      nextB = b_n;
      next_f_a = f_c;
      next_f_b = current_f_b;
    }

    const prevIteration = iterations[iterations.length - 1];
    const stepDiff = prevIteration ? Math.abs(c - prevIteration.c) : undefined;

    // Build intermediate record
    const iterationRecord: FalsePositionIteration = {
      n,
      a: a_n,
      b: b_n,
      f_a: current_f_a,
      f_b: current_f_b,
      c,
      f_c,
      next_interval: [nextA, nextB],
      is_stopping_met: false,
      step_difference: stepDiff,
    };

    // Evaluate stopping condition
    const stopEval = isExactRoot
      ? { isMet: true, reason: `Exact root found at c_(${n + 1}) = ${c} where f(c) = 0.` }
      : evaluateStoppingCondition(
          iterationRecord,
          prevIteration,
          stoppingStrategy,
          {
            decimalPlaces,
            tolerance,
            customStoppingCriterion,
          }
        );

    iterationRecord.is_stopping_met = stopEval.isMet;
    iterations.push(iterationRecord);

    if (isExactRoot) {
      return {
        success: true,
        root: c,
        formattedRoot: c.toFixed(decimalPlaces),
        iterations,
        iterations_used: n + 1,
        stopping_reason: stopEval.reason,
        stopping_strategy_used: 'exact_root',
        exactRootFoundAt: 'c',
        initialEvaluation: { a, b, f_a, f_b },
      };
    }

    if (stopEval.isMet) {
      const formatted = c.toFixed(decimalPlaces);
      return {
        success: true,
        root: c,
        formattedRoot: formatted,
        iterations,
        iterations_used: n + 1,
        stopping_reason: stopEval.reason,
        stopping_strategy_used: stoppingStrategy,
        initialEvaluation: { a, b, f_a, f_b },
      };
    }

    // Advance to next iteration
    a_n = nextA;
    b_n = nextB;
    current_f_a = next_f_a;
    current_f_b = next_f_b;
  }

  // Maximum iterations exceeded
  const last = iterations[iterations.length - 1];
  const lastC = last ? last.c : (a + b) / 2;

  return {
    success: false,
    root: lastC,
    formattedRoot: lastC.toFixed(decimalPlaces),
    iterations,
    iterations_used: maxIterations,
    errorCode: 'MAX_ITERATIONS_EXCEEDED',
    stopping_reason: `Maximum iteration safety limit (${maxIterations}) reached before stopping condition was satisfied.`,
    stopping_strategy_used: stoppingStrategy,
    error: `Exceeded maximum iteration limit of ${maxIterations}.`,
    initialEvaluation: { a, b, f_a, f_b },
  };
}
