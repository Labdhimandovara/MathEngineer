/**
 * Dynamic Educational Content for False Position (Regula Falsi) Method
 * 
 * Provides course-grounded explanations, dynamic 3-level progressive hints,
 * correct-answer rationales, and honest mistake diagnosis.
 * 
 * Sourced directly from Dr. Ram Kishun Lodhi's course presentation (SIT Pune).
 * ZERO LLM generation, completely deterministic.
 */

import {
  FalsePositionStepContext,
  FalsePositionStepHintContent,
} from '../math/falsePosition/types.ts';

/**
 * Step 1: Initial Bracket Check Content
 */
export function getFalsePositionBracketCheckContent(
  expression: string,
  a: number,
  b: number,
  f_a: number,
  f_b: number
): FalsePositionStepHintContent {
  return {
    whyAreWeDoingThis:
      `We first evaluate the function at the initial endpoints a and b. In False Position, the root must be bracketed by an interval where f(a) and f(b) have opposite signs (f(a) · f(b) < 0), ensuring a real root lies between a and b.`,

    hints: [
      // Hint 1: What must be true
      `For False Position to begin, the function values at the endpoints must have opposite signs (f(a) · f(b) < 0).`,

      // Hint 2: Evaluate at endpoints
      `Evaluate the equation f(x) = ${expression} at both endpoints a = ${a} and b = ${b} to find f(${a}) and f(${b}).`,

      // Hint 3: Substitution structure
      `Substitute x = ${a} into '${expression}' to compute f(${a}), and Substitute x = ${b} to compute f(${b}). Verify that one value is positive and the other is negative.`,
    ],

    correctExplanation:
      `Correct. f(${a}) = ${f_a.toFixed(4)} and f(${b}) = ${f_b.toFixed(4)} have opposite signs. Because f(a) · f(b) < 0, a real root is bracketed between ${a} and ${b}.`,

    diagnoseMistake: (userVal: any) => {
      if (typeof userVal === 'string') {
        const parts = userVal.split(',').map((p) => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
          const [uFa, uFb] = parts;
          // Check if user entered endpoints themselves
          if (
            (Math.abs(uFa - a) < 1e-4 && Math.abs(uFb - b) < 1e-4) ||
            (Math.abs(uFa - b) < 1e-4 && Math.abs(uFb - a) < 1e-4)
          ) {
            return `You entered the interval endpoints ${a} and ${b} themselves. Evaluate f(x) at these endpoints.`;
          }
          const isFaMatch = Math.abs(uFa - f_a) < 2e-4;
          const isFbMatch = Math.abs(uFb - f_b) < 2e-4;
          if (!isFaMatch && isFbMatch) {
            return `Your value for f(${a}) does not match. Re-evaluate ${expression} at x = ${a}.`;
          }
          if (isFaMatch && !isFbMatch) {
            return `Your value for f(${b}) does not match. Re-evaluate ${expression} at x = ${b}.`;
          }
          // Check if both have same sign
          if (uFa * uFb > 0) {
            return `Both values you entered have the same sign (${uFa > 0 ? 'positive' : 'negative'}). False Position requires that f(a) and f(b) have opposite signs.`;
          }
        }
      }
      return null;
    },

    defaultMistakeFeedback:
      `That value doesn't match the expected calculation. Try checking the formula and substitution again.`,
  };
}

/**
 * Step 2: False Position Approximation Content
 */
export function getFalsePositionApproximationContent(
  context: FalsePositionStepContext
): FalsePositionStepHintContent {
  const { a, b, f_a, f_b, c, expression } = context;

  const aFormatted = a.toFixed(4);
  const bFormatted = b.toFixed(4);
  const faFormatted = f_a.toFixed(4);
  const fbFormatted = f_b.toFixed(4);

  return {
    whyAreWeDoingThis:
      `We join the points (a, f(a)) and (b, f(b)) by a straight line chord and find where this line intersects the x-axis. Setting y = 0 in the chord line equation gives the False Position root approximation x.`,

    hints: [
      // Hint 1: Not Bisection midpoint
      `This is NOT the Bisection midpoint (a + b)/2. False Position uses the chord joining (a, f(a)) and (b, f(b)).`,

      // Hint 2: Formula
      `Use the False Position formula: x = [a·f(b) - b·f(a)] / [f(b) - f(a)].`,

      // Hint 3: Dynamic substitution
      `Substitute the active values into the formula: x = [(${aFormatted})(${fbFormatted}) - (${bFormatted})(${faFormatted})] / [(${fbFormatted}) - (${faFormatted})].`,
    ],

    correctExplanation:
      `Correct. Calculated x = [(${aFormatted})(${fbFormatted}) - (${bFormatted})(${faFormatted})] / [(${fbFormatted}) - (${faFormatted})] = ${c.toFixed(5)}.`,

    diagnoseMistake: (userVal: any) => {
      const num = typeof userVal === 'number' ? userVal : parseFloat(userVal);
      if (isNaN(num)) return null;

      // 1. Check if student used Bisection midpoint (a + b)/2
      const midpoint = (a + b) / 2;
      if (Math.abs(num - midpoint) < 1e-4) {
        return `You calculated the Bisection midpoint (a + b)/2 = ${midpoint.toFixed(4)}. False Position requires the secant formula: x = [a·f(b) - b·f(a)] / [f(b) - f(a)].`;
      }

      // 2. Check if student calculated only the numerator [a·f(b) - b·f(a)]
      const numerator = a * f_b - b * f_a;
      if (Math.abs(num - numerator) < 1e-4) {
        return `You calculated only the numerator [a·f(b) - b·f(a)] = ${numerator.toFixed(4)}. Remember to divide by the denominator [f(b) - f(a)].`;
      }

      // 3. Check if student reversed denominator [f(a) - f(b)]
      const reversedDenomResult = numerator / (f_a - f_b);
      if (Math.abs(num - reversedDenomResult) < 1e-4) {
        return `Your calculation used [f(a) - f(b)] in the denominator instead of [f(b) - f(a)], reversing the sign.`;
      }

      // 4. Check if student entered endpoints directly
      if (Math.abs(num - a) < 1e-4 || Math.abs(num - b) < 1e-4) {
        return `You entered one of the interval endpoints. Calculate the chord's x-intercept using x = [a·f(b) - b·f(a)] / [f(b) - f(a)].`;
      }

      // Fallback: strictly conservative, do not guess student's thought process
      return null;
    },

    defaultMistakeFeedback:
      `That value doesn't match the expected calculation. Check your substitution into the False Position formula.`,
  };
}

/**
 * Step 3: Function Value at Approximation Content
 */
export function getFalsePositionFApproximationContent(
  context: FalsePositionStepContext
): FalsePositionStepHintContent {
  const { c, f_c, expression } = context;
  const cFormatted = c.toFixed(5);
  const fcFormatted = f_c.toFixed(5);

  return {
    whyAreWeDoingThis:
      `We evaluate the function f(x) at the newly calculated approximation x to determine its sign. This sign dictates which endpoint will be replaced in the next step.`,

    hints: [
      // Hint 1: Concept
      `The newly calculated approximation x = ${cFormatted} must now be substituted into the equation f(x).`,

      // Hint 2: Substitution structure
      `In the expression '${expression}', replace every occurrence of 'x' with (${cFormatted}).`,

      // Hint 3: Numerical substitution
      `Evaluate f(${cFormatted}) = ${expression.replace(/x/g, `(${cFormatted})`)} and note whether the result is positive or negative.`,
    ],

    correctExplanation:
      `Correct. f(${cFormatted}) = ${fcFormatted}. Its sign is ${f_c > 0 ? 'positive (+)' : 'negative (−)'}.`,

    diagnoseMistake: (userVal: any) => {
      const num = typeof userVal === 'number' ? userVal : parseFloat(userVal);
      if (isNaN(num)) return null;

      // 1. Check if user entered x itself
      if (Math.abs(num - c) < 1e-4) {
        return `You entered the approximation x = ${cFormatted} itself. You must substitute this x into f(x) = ${expression} to calculate the function value.`;
      }

      // 2. Check for exact opposite sign
      if (Math.abs(num - (-f_c)) < 1e-4) {
        return `Your value has the correct magnitude (${Math.abs(f_c).toFixed(5)}) but the opposite sign. Recheck the signs of each term in f(x).`;
      }

      // Fallback: conservative
      return null;
    },

    defaultMistakeFeedback:
      `That value doesn't match the expected calculation. Substitute x = ${cFormatted} into the function expression f(x).`,
  };
}

/**
 * Step 4: Interval Selection Content
 */
export function getFalsePositionIntervalChoiceContent(
  context: FalsePositionStepContext
): FalsePositionStepHintContent {
  const { a, b, f_a, f_b, c, f_c, nextInterval } = context;

  const faSign = f_a >= 0 ? '+' : '−';
  const fbSign = f_b >= 0 ? '+' : '−';
  const fcSign = f_c >= 0 ? '+' : '−';

  const sameAsA = f_c * f_a > 0;
  const replacedEndpoint = sameAsA ? 'a' : 'b';
  const sameSignEndpoint = sameAsA ? 'f(a)' : 'f(b)';

  return {
    whyAreWeDoingThis:
      `To ensure the root remains bracketed, the updated interval must continue to have opposite signs at its endpoints. We replace the endpoint whose function value has the same sign as f(x).`,

    hints: [
      // Hint 1: Opposite signs rule
      `The retained interval must continue to have opposite endpoint signs so that it encloses the root.`,

      // Hint 2: Compare signs
      `Compare the sign of f(x) = ${f_c.toFixed(4)} (${fcSign}) with f(a) = ${f_a.toFixed(4)} (${faSign}) and f(b) = ${f_b.toFixed(4)} (${fbSign}).`,

      // Hint 3: Course rule
      `Since f(x) has the SAME sign as ${sameSignEndpoint}, replace ${replacedEndpoint} with x. The next interval is [${sameAsA ? c.toFixed(5) : a.toFixed(5)}, ${sameAsA ? b.toFixed(5) : c.toFixed(5)}].`,
    ],

    correctExplanation:
      `Correct. Since f(x) has the same sign as ${sameSignEndpoint}, replace ${replacedEndpoint} with x. The new interval [${nextInterval[0].toFixed(5)}, ${nextInterval[1].toFixed(5)}] preserves opposite signs at the endpoints.`,

    diagnoseMistake: (_userVal: any) => {
      return `Incorrect interval choice. Course rule: replace the endpoint whose function value has the SAME sign as f(x) so that the retained interval continues to have opposite signs.`;
    },

    defaultMistakeFeedback:
      `That choice doesn't match the expected interval. Replace the endpoint having the same sign as f(x).`,
  };
}
