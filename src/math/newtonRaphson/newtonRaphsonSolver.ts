/**
 * Deterministic Newton-Raphson Method Engine
 * 
 * Sourced strictly from official course material (Dr. Ram Kishun Lodhi, SIT Pune).
 * Implements the tangent-intercept iteration formula:
 *   x_(n+1) = x_n - f(x_n) / f'(x_n)
 */

import { compileExpression, MathFunction } from '../expressionParser.ts';
import { EPSILON_ZERO } from '../numerical/precision.ts';
import { resolveDerivative } from './differentiator.ts';
import { evaluateNewtonStopping } from './stoppingCriteria.ts';
import {
  NewtonRaphsonOptions,
  NewtonRaphsonResult,
  NewtonRaphsonIteration,
} from './types.ts';

const DEFAULT_MAX_ITERATIONS = 50;
const DEFAULT_DECIMAL_PLACES = 3;

/**
 * Solves an equation f(x) = 0 deterministically using the Newton-Raphson Method.
 */
export function solveNewtonRaphson(
  options: NewtonRaphsonOptions
): NewtonRaphsonResult {
  const {
    expression,
    derivative,
    a,
    b,
    x0: explicitX0,
    decimalPlaces = DEFAULT_DECIMAL_PLACES,
    maxIterations = DEFAULT_MAX_ITERATIONS,
    precisionMode = 'course_step_rounding',
    tolerance,
  } = options;

  // 1. Resolve evaluation function f(x)
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
        selected_x0: explicitX0 ?? 0,
        precisionModeUsed: precisionMode,
        errorCode: 'INVALID_EXPRESSION',
        error: `Failed to parse function expression: ${err?.message || err}`,
      };
    }
  } else {
    return {
      success: false,
      iterations: [],
      iterations_used: 0,
      selected_x0: explicitX0 ?? 0,
      precisionModeUsed: precisionMode,
      errorCode: 'INVALID_EXPRESSION',
      error: 'Expression must be a mathematical string or a JavaScript function.',
    };
  }

  // 2. Resolve derivative function f'(x)
  let f_prime: MathFunction;
  let derivativeExprStr: string | undefined;
  try {
    const derivResult = resolveDerivative(expression, derivative);
    f_prime = derivResult.fn;
    derivativeExprStr = derivResult.expressionString;
  } catch (err: any) {
    return {
      success: false,
      iterations: [],
      iterations_used: 0,
      selected_x0: explicitX0 ?? 0,
      precisionModeUsed: precisionMode,
      errorCode: 'UNSUPPORTED_DERIVATIVE',
      error: `Could not resolve derivative: ${err?.message || err}`,
    };
  }

  // 3. Handle initial bracket [a, b] and choice of initial guess x_0
  let initialEval: { a: number; b: number; f_a: number; f_b: number } | undefined;
  let initialInterval: [number, number] | undefined;
  let selectedX0: number;
  let x0Reason: string | undefined;

  if (a !== undefined && b !== undefined) {
    // Validate bounds
    if (!isFinite(a) || !isFinite(b)) {
      return {
        success: false,
        iterations: [],
        iterations_used: 0,
        selected_x0: 0,
        precisionModeUsed: precisionMode,
        errorCode: 'INVALID_BOUNDS',
        error: `Interval bounds must be finite numbers. Received a = ${a}, b = ${b}.`,
      };
    }

    if (a >= b) {
      return {
        success: false,
        iterations: [],
        iterations_used: 0,
        selected_x0: 0,
        precisionModeUsed: precisionMode,
        errorCode: 'INVALID_BOUNDS',
        error: `Lower bound a must be strictly less than upper bound b. Received a = ${a}, b = ${b}.`,
      };
    }

    let f_a: number;
    let f_b: number;
    try {
      f_a = f(a);
      f_b = f(b);
    } catch (err: any) {
      return {
        success: false,
        iterations: [],
        iterations_used: 0,
        selected_x0: 0,
        precisionModeUsed: precisionMode,
        errorCode: 'EVALUATION_ERROR',
        error: `Error evaluating function at boundary points: ${err?.message || err}`,
      };
    }

    if (!isFinite(f_a) || !isFinite(f_b)) {
      return {
        success: false,
        iterations: [],
        iterations_used: 0,
        selected_x0: 0,
        precisionModeUsed: precisionMode,
        errorCode: 'EVALUATION_ERROR',
        error: `Function produced non-finite values at endpoints: f(a) = ${f_a}, f(b) = ${f_b}.`,
      };
    }

    initialEval = { a, b, f_a, f_b };
    initialInterval = [a, b];

    // Check exact root at boundary
    if (Math.abs(f_a) <= EPSILON_ZERO) {
      return {
        success: true,
        root: a,
        formattedRoot: a.toFixed(decimalPlaces),
        iterations: [],
        iterations_used: 0,
        initialInterval,
        initialEvaluation: initialEval,
        selected_x0: a,
        x0_selection_reason: `Exact root found at lower bound a = ${a} where f(a) = 0.`,
        derivativeExpression: derivativeExprStr,
        precisionModeUsed: precisionMode,
        stopping_reason: `Exact root found at boundary a = ${a}.`,
      };
    }

    if (Math.abs(f_b) <= EPSILON_ZERO) {
      return {
        success: true,
        root: b,
        formattedRoot: b.toFixed(decimalPlaces),
        iterations: [],
        iterations_used: 0,
        initialInterval,
        initialEvaluation: initialEval,
        selected_x0: b,
        x0_selection_reason: `Exact root found at upper bound b = ${b} where f(b) = 0.`,
        derivativeExpression: derivativeExprStr,
        precisionModeUsed: precisionMode,
        stopping_reason: `Exact root found at boundary b = ${b}.`,
      };
    }

    // Validate sign condition: f(a) and f(b) must have opposite signs
    if (f_a * f_b > 0) {
      return {
        success: false,
        iterations: [],
        iterations_used: 0,
        initialInterval,
        initialEvaluation: initialEval,
        selected_x0: explicitX0 ?? a,
        precisionModeUsed: precisionMode,
        errorCode: 'NO_SIGN_CHANGE',
        error: `No sign change on [${a}, ${b}]: f(a) = ${f_a.toFixed(4)} and f(b) = ${f_b.toFixed(4)} have the same sign. Root must be bracketed by opposite signs.`,
      };
    }

    // Course Rule (Slide 5): Select x_0 as the endpoint whose |f(x)| is closer to 0
    if (explicitX0 !== undefined) {
      selectedX0 = explicitX0;
      x0Reason = `User explicitly provided initial approximation x_0 = ${explicitX0}.`;
    } else {
      if (Math.abs(f_b) < Math.abs(f_a)) {
        selectedX0 = b;
        x0Reason = `Since |f(${b})| = ${Math.abs(f_b).toFixed(4)} is closer to 0 than |f(${a})| = ${Math.abs(f_a).toFixed(4)}, take x_0 = ${b} as initial approximation.`;
      } else {
        selectedX0 = a;
        x0Reason = `Since |f(${a})| = ${Math.abs(f_a).toFixed(4)} is closer to 0 than |f(${b})| = ${Math.abs(f_b).toFixed(4)}, take x_0 = ${a} as initial approximation.`;
      }
    }
  } else if (explicitX0 !== undefined) {
    if (!isFinite(explicitX0)) {
      return {
        success: false,
        iterations: [],
        iterations_used: 0,
        selected_x0: 0,
        precisionModeUsed: precisionMode,
        errorCode: 'INVALID_BOUNDS',
        error: `Initial guess x_0 must be a finite number. Received ${explicitX0}.`,
      };
    }
    selectedX0 = explicitX0;
    x0Reason = `User provided initial approximation x_0 = ${explicitX0}.`;
  } else {
    return {
      success: false,
      iterations: [],
      iterations_used: 0,
      selected_x0: 0,
      precisionModeUsed: precisionMode,
      errorCode: 'INVALID_BOUNDS',
      error: 'Must provide either an initial bracket [a, b] or an initial guess x_0.',
    };
  }

  // 4. Iteration Loop
  const iterations: NewtonRaphsonIteration[] = [];
  let currentX = selectedX0;

  for (let n = 0; n < maxIterations; n++) {
    // Evaluate f(currentX) and f'(currentX)
    let f_x: number;
    let f_prime_x: number;
    try {
      f_x = f(currentX);
      f_prime_x = f_prime(currentX);
    } catch (err: any) {
      return {
        success: false,
        iterations,
        iterations_used: n,
        initialInterval,
        initialEvaluation: initialEval,
        selected_x0: selectedX0,
        x0_selection_reason: x0Reason,
        derivativeExpression: derivativeExprStr,
        precisionModeUsed: precisionMode,
        errorCode: 'EVALUATION_ERROR',
        error: `Evaluation failed at x_(${n}) = ${currentX}: ${err?.message || err}`,
      };
    }

    if (!isFinite(f_x) || !isFinite(f_prime_x)) {
      return {
        success: false,
        iterations,
        iterations_used: n,
        initialInterval,
        initialEvaluation: initialEval,
        selected_x0: selectedX0,
        x0_selection_reason: x0Reason,
        derivativeExpression: derivativeExprStr,
        precisionModeUsed: precisionMode,
        errorCode: 'EVALUATION_ERROR',
        error: `Function or derivative produced non-finite value at x_(${n}) = ${currentX}: f(x) = ${f_x}, f'(x) = ${f_prime_x}.`,
      };
    }

    // Implementation Safety Check: Derivative zero
    if (Math.abs(f_prime_x) <= EPSILON_ZERO) {
      return {
        success: false,
        iterations,
        iterations_used: n,
        initialInterval,
        initialEvaluation: initialEval,
        selected_x0: selectedX0,
        x0_selection_reason: x0Reason,
        derivativeExpression: derivativeExprStr,
        precisionModeUsed: precisionMode,
        errorCode: 'DERIVATIVE_ZERO',
        error: `Derivative vanished at x_(${n}) = ${currentX} (f'(x) ≈ 0). Tangent line is horizontal and cannot intersect the x-axis. (Implementation safety check).`,
      };
    }

    // Newton-Raphson formula: x_(n+1) = x_n - f(x_n) / f'(x_n)
    const x_next = currentX - f_x / f_prime_x;

    if (!isFinite(x_next)) {
      return {
        success: false,
        iterations,
        iterations_used: n,
        initialInterval,
        initialEvaluation: initialEval,
        selected_x0: selectedX0,
        x0_selection_reason: x0Reason,
        derivativeExpression: derivativeExprStr,
        precisionModeUsed: precisionMode,
        errorCode: 'EVALUATION_ERROR',
        error: `Computed non-finite approximation x_(${n + 1}) = ${x_next}.`,
      };
    }

    const formattedNext = x_next.toFixed(decimalPlaces);
    const stepDiff = Math.abs(x_next - currentX);

    // Evaluate course stopping condition (consecutive agreement)
    const stopEval = evaluateNewtonStopping(
      x_next,
      currentX,
      n,
      decimalPlaces,
      tolerance
    );

    const iterationRecord: NewtonRaphsonIteration = {
      n,
      x_n: currentX,
      f_x,
      f_prime_x,
      x_next,
      formatted_x_next: formattedNext,
      step_difference: stepDiff,
      is_stopping_met: stopEval.isMet,
    };

    iterations.push(iterationRecord);

    if (stopEval.isMet) {
      return {
        success: true,
        root: x_next,
        formattedRoot: formattedNext,
        iterations,
        iterations_used: n + 1,
        stopping_reason: stopEval.reason,
        initialInterval,
        initialEvaluation: initialEval,
        selected_x0: selectedX0,
        x0_selection_reason: x0Reason,
        derivativeExpression: derivativeExprStr,
        precisionModeUsed: precisionMode,
      };
    }

    // Advance to next iteration
    if (precisionMode === 'course_step_rounding') {
      currentX = parseFloat(formattedNext);
    } else {
      currentX = x_next;
    }
  }

  // Safety limit reached
  const lastIter = iterations[iterations.length - 1];
  const fallbackRoot = lastIter ? lastIter.x_next : selectedX0;

  return {
    success: false,
    root: fallbackRoot,
    formattedRoot: fallbackRoot.toFixed(decimalPlaces),
    iterations,
    iterations_used: maxIterations,
    initialInterval,
    initialEvaluation: initialEval,
    selected_x0: selectedX0,
    x0_selection_reason: x0Reason,
    derivativeExpression: derivativeExprStr,
    precisionModeUsed: precisionMode,
    errorCode: 'MAX_ITERATIONS_EXCEEDED',
    stopping_reason: `Maximum iteration limit (${maxIterations}) reached before consecutive agreement was obtained.`,
    error: `Exceeded maximum iteration limit of ${maxIterations}.`,
  };
}
