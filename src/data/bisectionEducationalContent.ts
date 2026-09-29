/**
 * Dynamic Educational Content for Bisection Method (Solve with Me)
 * 
 * Provides course-grounded explanations, dynamic 3-level progressive hints,
 * correct-answer rationales, and honest mistake diagnosis.
 * 
 * Sourced directly from Dr. Ram Kishun Lodhi's course material (Symbiosis Institute of Technology Pune).
 * ZERO LLM generation, completely deterministic.
 */

import { StepContext, StepHintContent } from '../math/bisection/types';

/**
 * Step 1: Initial Bracket Check Content
 */
export function getBracketCheckContent(
  expression: string,
  a: number,
  b: number,
  f_a: number,
  f_b: number
): StepHintContent {
  const isOpposite = f_a * f_b < 0;

  return {
    whyAreWeDoingThis:
      `We first check the signs of f(a) and f(b). In Numerical Techniques, Bolzano's Intermediate Value Theorem states that if a continuous real-valued function f(x) has opposite signs at the interval endpoints (f(a) · f(b) < 0), at least one real root is guaranteed to lie within the open interval (a, b).`,

    hints: [
      // Hint 1: First thing to check
      `Before starting Bisection iterations, we must verify that the initial interval brackets a root by evaluating the function at both endpoints a₀ = ${a} and b₀ = ${b}.`,

      // Hint 2: Guide substitution into f(x)
      `Substitute the endpoint values directly into the equation f(x) = ${expression} to calculate f(${a}) and f(${b}).`,

      // Hint 3: Substitution structure (does NOT give final numbers)
      `To calculate f(${a}), replace every 'x' in '${expression}' with (${a}). To calculate f(${b}), replace every 'x' with (${b}). Check that their product f(${a}) · f(${b}) < 0.`,
    ],

    correctExplanation:
      `Correct. f(${a}) = ${f_a.toFixed(4)} and f(${b}) = ${f_b.toFixed(4)} have opposite signs (${f_a < 0 ? 'negative' : 'positive'} and ${f_b < 0 ? 'negative' : 'positive'}). Because f(a) · f(b) < 0, a real root is guaranteed to lie between ${a} and ${b}.`,

    diagnoseMistake: (userVal: any) => {
      if (typeof userVal === 'string') {
        const parts = userVal.split(',').map((p) => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const [uFa, uFb] = parts;
          // Check if user entered endpoints themselves instead of f(endpoints)
          if (
            (Math.abs(uFa - a) < 1e-4 && Math.abs(uFb - b) < 1e-4) ||
            (Math.abs(uFa - b) < 1e-4 && Math.abs(uFb - a) < 1e-4)
          ) {
            return `You entered the interval endpoints ${a} and ${b} themselves. You must evaluate the function f(x) at these points.`;
          }
          // Check if both have same sign
          if (uFa * uFb > 0) {
            return `Both values you entered have the same sign (${uFa > 0 ? 'positive' : 'negative'}). For Bisection to proceed, f(a) and f(b) must have opposite signs.`;
          }
        }
      }
      return null;
    },

    defaultMistakeFeedback:
      `Your values do not match the calculated f(a₀) and f(b₀). Recheck the substitution of each endpoint into f(x) = ${expression}.`,
  };
}

/**
 * Step 2: Midpoint Content
 */
export function getMidpointContent(context: StepContext): StepHintContent {
  const { a, b, n, iterationDisplay } = context;

  return {
    whyAreWeDoingThis:
      `We divide the current interval [a_${n}, b_${n}] into two equal halves using the midpoint formula x_${iterationDisplay} = (a_${n} + b_${n}) / 2. This systematically halves the uncertainty range in every iteration.`,

    hints: [
      // Hint 1: Concept
      `The midpoint divides the current interval into two equal parts.`,

      // Hint 2: Formula
      `Use x_${iterationDisplay} = (a_${n} + b_${n}) / 2.`,

      // Hint 3: Dynamic substitution (does NOT state final midpoint value)
      `Substitute a_${n} = ${a} and b_${n} = ${b} into the formula: (${a} + ${b}) / 2.`,
    ],

    correctExplanation:
      `Correct. The midpoint divides [${a}, ${b}] into two equal intervals: [${a}, ${context.midpoint}] and [${context.midpoint}, ${b}].`,

    diagnoseMistake: (userVal: any) => {
      const num = typeof userVal === 'number' ? userVal : parseFloat(userVal);
      if (isNaN(num)) return null;

      // Check if user calculated half-width (b - a)/2 instead of average (a + b)/2
      const halfWidth = (b - a) / 2;
      if (Math.abs(num - halfWidth) < 1e-4) {
        return `You may have calculated the interval half-width (b - a)/2 = ${halfWidth} rather than the midpoint. The midpoint is the average (a + b) / 2.`;
      }

      // Check if user forgot to divide by 2
      const sum = a + b;
      if (Math.abs(num - sum) < 1e-4) {
        return `You may have calculated the sum (a + b) = ${sum} and forgotten to divide by 2. The midpoint is (a + b) / 2.`;
      }

      // Check if user entered boundary a or b
      if (Math.abs(num - a) < 1e-4 || Math.abs(num - b) < 1e-4) {
        return `You entered one of the interval endpoints. The midpoint is the average of both endpoints: (${a} + ${b}) / 2.`;
      }

      return null;
    },

    defaultMistakeFeedback:
      `Your value does not match the calculated midpoint. The midpoint is the average of the current lower and upper bounds: (${a} + ${b}) / 2.`,
  };
}

/**
 * Step 3: Function Value at Midpoint Content
 */
export function getFMidpointContent(context: StepContext): StepHintContent {
  const { midpoint, iterationDisplay, expression, f_midpoint } = context;

  return {
    whyAreWeDoingThis:
      `We evaluate the function at the midpoint to test if x_${iterationDisplay} is an exact root, and to determine which half-interval retains the opposite signs needed to bracket the root.`,

    hints: [
      // Hint 1: Concept
      `Substitute the calculated midpoint x_${iterationDisplay} = ${midpoint} into the original function f(x) = ${expression}.`,

      // Hint 2: Substitution structure
      `In the expression '${expression}', replace every occurrence of 'x' with (${midpoint}) and evaluate.`,

      // Hint 3: Arithmetic guidance
      `Evaluate each term in '${expression}' with x = ${midpoint}. Note whether the overall result is positive or negative.`,
    ],

    correctExplanation:
      `Correct. f(${midpoint}) = ${f_midpoint.toFixed(4)}. Its sign is ${f_midpoint < 0 ? 'negative (−)' : 'positive (+)'}.`,

    diagnoseMistake: (userVal: any) => {
      const num = typeof userVal === 'number' ? userVal : parseFloat(userVal);
      if (isNaN(num)) return null;

      // Check if user entered midpoint x itself
      if (Math.abs(num - midpoint) < 1e-4) {
        return `You entered the midpoint value x = ${midpoint} itself. You need to substitute x into f(x) = ${expression} to calculate the function value.`;
      }

      // Check for exact opposite sign
      if (Math.abs(num - (-f_midpoint)) < 1e-4) {
        return `Your answer has the correct magnitude (${Math.abs(f_midpoint).toFixed(4)}) but the opposite sign. Recheck the signs of each term in f(x).`;
      }

      return null;
    },

    defaultMistakeFeedback:
      `Your value does not match the calculated result. Check the substitution of x = ${midpoint} into f(x) = ${expression} and verify your arithmetic.`,
  };
}

/**
 * Step 4: Interval Selection Content
 */
export function getIntervalChoiceContent(context: StepContext): StepHintContent {
  const { a, b, midpoint, f_a, f_b, f_midpoint, nextInterval, iterationDisplay } = context;

  const leftSign = f_a >= 0 ? '+' : '−';
  const midSign = f_midpoint >= 0 ? '+' : '−';
  const rightSign = f_b >= 0 ? '+' : '−';

  return {
    whyAreWeDoingThis:
      `We keep the half-interval that continues to bracket the root. By discarding the half that has matching signs, we guarantee that the root is retained in the newly selected sub-interval.`,

    hints: [
      // Hint 1: Opposite sign rule
      `Bisection keeps the half-interval whose endpoint function values have opposite signs.`,

      // Hint 2: Compare signs
      `Compare the signs: left endpoint f(a) is ${f_a >= 0 ? 'positive (+)' : 'negative (−)'}, midpoint f(x_${iterationDisplay}) is ${f_midpoint >= 0 ? 'positive (+)' : 'negative (−)'}, and right endpoint f(b) is ${f_b >= 0 ? 'positive (+)' : 'negative (−)'}.`,

      // Hint 3: Explicit guide
      `Check which pair has opposite signs: [${a}, ${midpoint}] has (${leftSign}, ${midSign}), while [${midpoint}, ${b}] has (${midSign}, ${rightSign}). Select the pair with opposite signs.`,
    ],

    correctExplanation:
      `Correct. The root remains in [${nextInterval[0]}, ${nextInterval[1]}] because the function values at ${nextInterval[0]} and ${nextInterval[1]} have opposite signs.`,

    diagnoseMistake: (_userVal: any) => {
      return `Bisection keeps the half-interval whose endpoint function values have opposite signs. Look closely at the signs of f(a), f(x_${iterationDisplay}), and f(b).`;
    },

    defaultMistakeFeedback:
      `Bisection keeps the half-interval whose endpoint function values have opposite signs.`,
  };
}
