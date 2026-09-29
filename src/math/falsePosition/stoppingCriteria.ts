/**
 * Isolated Stopping Criteria for False Position Method
 * 
 * Note on Course Grounding:
 * The provided course material (Dr. Ram Kishun Lodhi, SIT Pune) contains a worked
 * example and decimal-agreement stopping rule specifically for the Bisection Method.
 * It does not establish a False Position stopping rule.
 * 
 * Therefore, False Position stopping criteria are intentionally isolated here
 * and made configurable, rather than silently assuming the Bisection 3-way agreement
 * rule applies to False Position (where one endpoint often remains stationary).
 */

import {
  FalsePositionIteration,
  FalsePositionStoppingStrategy,
} from './types.ts';

export interface StoppingEvaluationResult {
  isMet: boolean;
  reason?: string;
}

/**
 * Checks whether consecutive approximations agree to the specified number of decimal places.
 */
export function isConsecutiveDecimalPlacesMet(
  currentC: number,
  prevC: number | undefined,
  decimalPlaces: number
): boolean {
  if (prevC === undefined) {
    return false;
  }
  return currentC.toFixed(decimalPlaces) === prevC.toFixed(decimalPlaces);
}

/**
 * Checks whether the step difference |c_(n+1) - c_n| is within tolerance.
 */
export function isConsecutiveStepMet(
  currentC: number,
  prevC: number | undefined,
  tolerance: number
): boolean {
  if (prevC === undefined) {
    return false;
  }
  return Math.abs(currentC - prevC) <= tolerance;
}

/**
 * Checks whether the residual |f(c)| is within tolerance.
 */
export function isFunctionResidualMet(
  f_c: number,
  tolerance: number
): boolean {
  return Math.abs(f_c) <= tolerance;
}

/**
 * Checks whether the bracket width |b - a| is within tolerance.
 */
export function isIntervalWidthMet(
  a: number,
  b: number,
  tolerance: number
): boolean {
  return Math.abs(b - a) <= tolerance;
}

/**
 * Evaluates whether the configured stopping strategy is satisfied for the current iteration.
 */
export function evaluateStoppingCondition(
  current: FalsePositionIteration,
  previous: FalsePositionIteration | undefined,
  strategy: FalsePositionStoppingStrategy,
  options: {
    decimalPlaces?: number;
    tolerance?: number;
    customStoppingCriterion?: (
      current: FalsePositionIteration,
      previous?: FalsePositionIteration
    ) => boolean;
  }
): StoppingEvaluationResult {
  const { decimalPlaces = 2, tolerance, customStoppingCriterion } = options;

  switch (strategy) {
    case 'decimal_places': {
      if (previous === undefined) {
        return { isMet: false };
      }
      const isMet = isConsecutiveDecimalPlacesMet(current.c, previous.c, decimalPlaces);
      if (isMet) {
        const formatted = current.c.toFixed(decimalPlaces);
        return {
          isMet: true,
          reason: `Consecutive approximations in iterations ${previous.n + 1} and ${current.n + 1} agree to ${decimalPlaces} decimal places (${formatted}).`,
        };
      }
      return { isMet: false };
    }

    case 'consecutive_step': {
      const tol = tolerance ?? Math.pow(10, -decimalPlaces);
      if (previous === undefined) {
        return { isMet: false };
      }
      const isMet = isConsecutiveStepMet(current.c, previous.c, tol);
      if (isMet) {
        return {
          isMet: true,
          reason: `Step change |c_(${current.n + 1}) - c_(${previous.n + 1})| = ${Math.abs(current.c - previous.c).toExponential(3)} is within tolerance ${tol}.`,
        };
      }
      return { isMet: false };
    }

    case 'function_residual': {
      const tol = tolerance ?? Math.pow(10, -decimalPlaces);
      const isMet = isFunctionResidualMet(current.f_c, tol);
      if (isMet) {
        return {
          isMet: true,
          reason: `Function residual |f(c_(${current.n + 1}))| = ${Math.abs(current.f_c).toExponential(3)} is within tolerance ${tol}.`,
        };
      }
      return { isMet: false };
    }

    case 'interval_width': {
      const tol = tolerance ?? Math.pow(10, -decimalPlaces);
      const isMet = isIntervalWidthMet(current.a, current.b, tol);
      if (isMet) {
        return {
          isMet: true,
          reason: `Interval width |b_(${current.n}) - a_(${current.n})| = ${Math.abs(current.b - current.a).toExponential(3)} is within tolerance ${tol}.`,
        };
      }
      return { isMet: false };
    }

    case 'custom': {
      if (customStoppingCriterion) {
        const isMet = customStoppingCriterion(current, previous);
        return {
          isMet,
          reason: isMet ? 'Custom stopping criterion satisfied.' : undefined,
        };
      }
      return { isMet: false };
    }

    default:
      return { isMet: false };
  }
}
