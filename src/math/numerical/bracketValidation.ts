/**
 * Reusable Initial Bracket Validation Utility
 * 
 * Verifies mathematical bracketing preconditions for root-finding methods
 * on interval [a, b].
 */

import { compileExpression, MathFunction } from '../expressionParser.ts';
import {
  InitialBracketValidationResult,
  NumericalErrorCode,
} from './types.ts';
import { EPSILON_ZERO } from './precision.ts';

export interface ValidateInitialBracketOptions {
  expression: string | MathFunction;
  a: number;
  b: number;
  epsilonZero?: number;
  methodName?: string;
}

export function validateInitialBracket(
  options: ValidateInitialBracketOptions
): InitialBracketValidationResult {
  const {
    expression,
    a,
    b,
    epsilonZero = EPSILON_ZERO,
    methodName = 'Root-finding',
  } = options;

  // 1. Validate numerical inputs
  if (
    typeof a !== 'number' ||
    typeof b !== 'number' ||
    !isFinite(a) ||
    !isFinite(b)
  ) {
    return {
      isValid: false,
      errorCode: 'INVALID_BOUNDS',
      error: `Interval bounds must be finite numbers. Received a = ${a}, b = ${b}.`,
    };
  }

  // 2. Validate a < b
  if (a >= b) {
    return {
      isValid: false,
      errorCode: 'INVALID_BOUNDS',
      error: `Lower bound a must be strictly less than upper bound b. Received a = ${a}, b = ${b}.`,
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
        isValid: false,
        errorCode: 'INVALID_EXPRESSION',
        error: `Failed to parse function expression: ${err?.message || err}`,
      };
    }
  } else {
    return {
      isValid: false,
      errorCode: 'INVALID_EXPRESSION',
      error: `Expression must be a mathematical string or a JavaScript function.`,
    };
  }

  // 4. Calculate f(a) and f(b)
  let f_a: number;
  let f_b: number;
  try {
    f_a = f(a);
    f_b = f(b);
  } catch (err: any) {
    return {
      isValid: false,
      errorCode: 'EVALUATION_ERROR',
      error: `Error evaluating function at boundary points: ${err?.message || err}`,
    };
  }

  if (!isFinite(f_a) || !isFinite(f_b)) {
    return {
      isValid: false,
      errorCode: 'EVALUATION_ERROR',
      error: `Function produced non-finite value at interval endpoints: f(a) = ${f_a}, f(b) = ${f_b}.`,
    };
  }

  // 5. Check if f(a) = 0 or f(b) = 0 (exact root at boundary)
  if (Math.abs(f_a) <= epsilonZero) {
    return {
      isValid: true,
      f,
      a,
      b,
      f_a,
      f_b,
      exactBoundaryRoot: 'a',
    };
  }

  if (Math.abs(f_b) <= epsilonZero) {
    return {
      isValid: true,
      f,
      a,
      b,
      f_a,
      f_b,
      exactBoundaryRoot: 'b',
    };
  }

  // 6. Validate sign condition: f(a) and f(b) must have opposite signs
  if (f_a * f_b > 0) {
    return {
      isValid: false,
      errorCode: 'NO_SIGN_CHANGE',
      error: `No sign change on [${a}, ${b}]: f(a) = ${f_a.toFixed(4)} and f(b) = ${f_b.toFixed(4)} have the same sign. ${methodName} requires opposite signs (f(a) · f(b) < 0) so that a root lies between them.`,
      initialEvaluation: { a, b, f_a, f_b },
    };
  }

  return {
    isValid: true,
    f,
    a,
    b,
    f_a,
    f_b,
  };
}
