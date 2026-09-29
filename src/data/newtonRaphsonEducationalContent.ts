/**
 * Dynamic Educational Content for Newton-Raphson Method
 * 
 * Sourced directly from Dr. Ram Kishun Lodhi's course presentation (SIT Pune).
 * ZERO LLM generation, completely deterministic.
 * 
 * Provides progressive 3-level hints, step explanations ("Why are we doing this?"),
 * and conservative mistake diagnostics.
 */

import {
  NewtonRaphsonStepContext,
  NewtonRaphsonStepHintContent,
} from '../math/newtonRaphson/types.ts';

/**
 * Step 1: Check Initial Approximation x0
 */
export function getNewtonCheckX0Content(
  context: NewtonRaphsonStepContext
): NewtonRaphsonStepHintContent {
  const { a, b, f_a, f_b, x_n, expression } = context;

  const hasInterval = a !== undefined && b !== undefined && f_a !== undefined && f_b !== undefined;
  const aStr = a !== undefined ? a.toString() : '';
  const bStr = b !== undefined ? b.toString() : '';
  const faStr = f_a !== undefined ? f_a.toFixed(4) : '';
  const fbStr = f_b !== undefined ? f_b.toFixed(4) : '';

  return {
    whyAreWeDoingThis: hasInterval
      ? `Newton-Raphson begins from an initial approximation x₀. Under the course procedure, when an interval [a, b] is given where f(a) and f(b) have opposite signs, we choose x₀ as the endpoint whose value |f(x)| is closer to zero: |f(x₀)| = min(|f(a)|, |f(b)|).`
      : `Newton-Raphson begins from an initial approximation x₀ close to the true root to start drawing tangent lines.`,

    hints: [
      // Hint 1: Starting requirement
      `Newton-Raphson begins from an initial approximation x₀ to start iterating with tangent lines.`,

      // Hint 2: Endpoint magnitude rule
      hasInterval
        ? `Compare |f(${aStr})| = ${Math.abs(f_a!).toFixed(4)} and |f(${bStr})| = ${Math.abs(f_b!).toFixed(4)}. Pick the endpoint with smaller absolute value.`
        : `Enter the initial guess x₀ provided in the problem statement.`,

      // Hint 3: Direct value
      `For this problem, select x₀ = ${x_n}.`,
    ],

    correctExplanation: hasInterval
      ? `Correct. |f(${x_n})| is closer to zero than the other endpoint, making x₀ = ${x_n} the course-prescribed starting approximation.`
      : `Correct. x₀ = ${x_n} is selected as the starting approximation.`,

    diagnoseMistake: (userVal: any) => {
      const num = typeof userVal === 'number' ? userVal : parseFloat(userVal);
      if (isNaN(num)) return null;

      if (hasInterval) {
        const otherEndpoint = Math.abs(x_n - a!) < 1e-5 ? b! : a!;
        if (Math.abs(num - otherEndpoint) < 1e-4) {
          return `You chose endpoint x = ${otherEndpoint}. However, |f(${otherEndpoint})| is further from zero than |f(${x_n})|. The course rule chooses the endpoint with smaller |f(x)|.`;
        }
      }
      return null;
    },

    defaultMistakeFeedback:
      `That value does not match the expected initial guess x₀. Check the problem interval and select the endpoint closer to zero.`,
  };
}

/**
 * Step 2: Evaluate f(x_n)
 */
export function getNewtonEvaluateFxContent(
  context: NewtonRaphsonStepContext
): NewtonRaphsonStepHintContent {
  const { x_n, f_x, f_prime_x, expression } = context;
  const xnStr = x_n.toFixed(4);
  const fxStr = f_x.toFixed(4);

  return {
    whyAreWeDoingThis:
      `We evaluate f(x_${context.iterationIndex}) to determine the height of the curve at x = ${xnStr}. This value becomes the numerator in the Newton-Raphson correction term.`,

    hints: [
      // Hint 1: Concept
      `Substitute the current approximation x = ${xnStr} into the original function f(x) = ${expression}.`,

      // Hint 2: Formula substitution
      `Evaluate f(${xnStr}) carefully using standard arithmetic and power precedence.`,

      // Hint 3: Direct value
      `For x = ${xnStr}, f(${xnStr}) evaluates to approximately ${fxStr}.`,
    ],

    correctExplanation:
      `Correct. f(${xnStr}) = ${fxStr}.`,

    diagnoseMistake: (userVal: any) => {
      const num = typeof userVal === 'number' ? userVal : parseFloat(userVal);
      if (isNaN(num)) return null;

      // Check if entered x_n itself
      if (Math.abs(num - x_n) < 1e-4) {
        return `You entered the approximation x = ${xnStr} itself. You need to calculate f(${xnStr}).`;
      }

      // Check if entered derivative f'(x_n) instead
      if (Math.abs(num - f_prime_x) < 2e-3) {
        return `You entered the derivative value f'(${xnStr}) = ${f_prime_x.toFixed(4)}. In this step, calculate f(${xnStr}) from the original equation.`;
      }

      return null;
    },

    defaultMistakeFeedback:
      `That value does not match f(${xnStr}). Re-evaluate f(x) = ${expression} at x = ${xnStr}.`,
  };
}

/**
 * Step 3: Evaluate Derivative f'(x_n)
 */
export function getNewtonEvaluateFPrimeContent(
  context: NewtonRaphsonStepContext
): NewtonRaphsonStepHintContent {
  const { x_n, f_x, f_prime_x, derivativeExpression } = context;
  const xnStr = x_n.toFixed(4);
  const fpxStr = f_prime_x.toFixed(4);

  return {
    whyAreWeDoingThis:
      `We calculate the tangent line slope f'(x_${context.iterationIndex}) at x = ${xnStr}. In Newton-Raphson, this slope forms the denominator of the correction term f(x_n)/f'(x_n).`,

    hints: [
      // Hint 1: Derivative purpose
      `Newton-Raphson uses the tangent slope f'(x_n) at the current point.`,

      // Hint 2: Derivative expression
      `The derivative of f(x) is f'(x) = ${derivativeExpression}. Substitute x = ${xnStr} into this derivative.`,

      // Hint 3: Direct value
      `Evaluating f'(${xnStr}) = ${derivativeExpression} yields approximately ${fpxStr}.`,
    ],

    correctExplanation:
      `Correct. The derivative at x = ${xnStr} is f'(${xnStr}) = ${fpxStr}.`,

    diagnoseMistake: (userVal: any) => {
      const num = typeof userVal === 'number' ? userVal : parseFloat(userVal);
      if (isNaN(num)) return null;

      // Check if entered f(x_n) instead of f'(x_n)
      if (Math.abs(num - f_x) < 2e-3) {
        return `You entered f(${xnStr}) = ${f_x.toFixed(4)}. In this step, calculate the derivative f'(${xnStr}) using f'(x) = ${derivativeExpression}.`;
      }

      // Check if entered x_n
      if (Math.abs(num - x_n) < 1e-4) {
        return `You entered the value x = ${xnStr}. Substitute it into the derivative f'(x) = ${derivativeExpression}.`;
      }

      return null;
    },

    defaultMistakeFeedback:
      `That value does not match f'(${xnStr}). Check the derivative expression ${derivativeExpression} and substitution at x = ${xnStr}.`,
  };
}

/**
 * Step 4: Apply Newton-Raphson Formula
 */
export function getNewtonApplyFormulaContent(
  context: NewtonRaphsonStepContext
): NewtonRaphsonStepHintContent {
  const { x_n, f_x, f_prime_x, x_next, iterationIndex } = context;
  const xnStr = x_n.toFixed(4);
  const fxStr = f_x.toFixed(4);
  const fpxStr = f_prime_x.toFixed(4);
  const nextStr = x_next.toFixed(4);

  return {
    whyAreWeDoingThis:
      `We apply the Newton-Raphson formula x_(n+1) = x_n - f(x_n)/f'(x_n). This finds the x-intercept of the tangent line drawn to y = f(x) at x = ${xnStr}.`,

    hints: [
      // Hint 1: Formula
      `Use the Newton-Raphson formula: x_(n+1) = x_n - f(x_n) / f'(x_n).`,

      // Hint 2: Substitution
      `Substitute: x_${iterationIndex + 1} = ${xnStr} - (${fxStr}) / (${fpxStr}). Watch the minus sign carefully!`,

      // Hint 3: Result
      `Compute ${xnStr} - (${fxStr} / ${fpxStr}) to get approximately ${nextStr}.`,
    ],

    correctExplanation:
      `Correct. x_${iterationIndex + 1} = ${xnStr} - (${fxStr} / ${fpxStr}) = ${nextStr}.`,

    diagnoseMistake: (userVal: any) => {
      const num = typeof userVal === 'number' ? userVal : parseFloat(userVal);
      if (isNaN(num)) return null;

      // Mistake 1: Missing minus sign (addition instead of subtraction: x_n + f/f')
      const plusRatio = x_n + f_x / f_prime_x;
      if (Math.abs(num - plusRatio) < 2e-3) {
        return `You added the ratio instead of subtracting it (x_n + f/f'). Newton-Raphson subtracts the correction: x_(n+1) = x_n - f(x_n)/f'(x_n).`;
      }

      // Mistake 2: Inverted fraction (f'/f instead of f/f')
      if (Math.abs(f_x) > 1e-7) {
        const invertedRatio = x_n - f_prime_x / f_x;
        if (Math.abs(num - invertedRatio) < 2e-3) {
          return `You inverted the ratio as f'(x_n)/f(x_n). Newton-Raphson puts the derivative in the denominator: f(x_n)/f'(x_n).`;
        }
      }

      // Mistake 3: Omitted denominator (x_n - f(x_n))
      const omittedDenom = x_n - f_x;
      if (Math.abs(num - omittedDenom) < 2e-3) {
        return `You forgot to divide by the derivative f'(x_n). Newton-Raphson formula: x_n - f(x_n)/f'(x_n).`;
      }

      // Mistake 4: Entered previous x_n
      if (Math.abs(num - x_n) < 1e-4) {
        return `You re-entered the previous approximation x_${iterationIndex} = ${xnStr}. Calculate the new approximation x_${iterationIndex + 1}.`;
      }

      return null;
    },

    defaultMistakeFeedback:
      `That value does not match the Newton-Raphson substitution. Check f(x_n), f'(x_n), and the minus sign in the formula.`,
  };
}

/**
 * Step 5: Check Stopping Condition
 */
export function getNewtonCheckStoppingContent(
  context: NewtonRaphsonStepContext,
  isStoppingMet: boolean
): NewtonRaphsonStepHintContent {
  const { x_n, x_next, decimalPlaces } = context;
  const xnStr = x_n.toFixed(decimalPlaces);
  const nextStr = x_next.toFixed(decimalPlaces);

  return {
    whyAreWeDoingThis:
      `We compare consecutive approximations x_n and x_(n+1). In the course procedure, iterations stop when consecutive values agree to ${decimalPlaces} decimal places.`,

    hints: [
      // Hint 1: Rule
      `Compare x_n = ${x_n.toFixed(4)} and x_(n+1) = ${x_next.toFixed(4)}.`,

      // Hint 2: Decimal places
      `To ${decimalPlaces} decimal places: x_n is ${xnStr} and x_(n+1) is ${nextStr}.`,

      // Hint 3: Conclusion
      isStoppingMet
        ? `Both round to ${nextStr}. The stopping condition is satisfied!`
        : `They differ (${xnStr} vs ${nextStr}). More iterations are required.`,
    ],

    correctExplanation: isStoppingMet
      ? `Correct. Consecutive approximations agree to ${decimalPlaces} decimal places (${nextStr}). The root is identified!`
      : `Correct. Consecutive approximations do not yet agree to ${decimalPlaces} decimal places. We proceed to the next iteration.`,

    diagnoseMistake: (userVal: any) => {
      // User can submit 'stop' or 'continue' or boolean
      if (typeof userVal === 'string') {
        const lower = userVal.trim().toLowerCase();
        if (isStoppingMet && (lower === 'continue' || lower === 'no' || lower === 'false')) {
          return `Consecutive approximations already agree to ${decimalPlaces} decimal places (${nextStr}). The stopping rule is satisfied.`;
        }
        if (!isStoppingMet && (lower === 'stop' || lower === 'yes' || lower === 'true')) {
          return `Consecutive approximations do not yet agree to ${decimalPlaces} decimal places (${xnStr} vs ${nextStr}). You must continue iterating.`;
        }
      }
      return null;
    },

    defaultMistakeFeedback:
      `Compare x_n and x_(n+1) rounded to ${decimalPlaces} decimal places to determine if the stopping condition is met.`,
  };
}
