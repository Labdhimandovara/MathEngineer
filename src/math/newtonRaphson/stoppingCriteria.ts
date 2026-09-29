/**
 * Isolated Stopping Criteria for Newton-Raphson Method
 * 
 * Source: Official Course Material (Dr. Ram Kishun Lodhi, SIT Pune)
 * Slide 7: "Since x_3 = x_2. Hence the desired root is 1.856 (correct to three decimal places)."
 * 
 * Course Stopping Rule:
 * The iteration stops when consecutive approximations x_n and x_(n+1)
 * agree to the requested number of decimal places.
 */

export interface NewtonStoppingEvaluation {
  isMet: boolean;
  reason?: string;
}

/**
 * Checks whether consecutive approximations agree to the requested decimal places.
 */
export function isConsecutiveDecimalAgreementMet(
  x_next: number,
  x_curr: number,
  decimalPlaces: number
): boolean {
  return x_next.toFixed(decimalPlaces) === x_curr.toFixed(decimalPlaces);
}

/**
 * Evaluates the Newton-Raphson stopping condition.
 */
export function evaluateNewtonStopping(
  x_next: number,
  x_curr: number,
  n: number,
  decimalPlaces: number,
  tolerance?: number
): NewtonStoppingEvaluation {
  // If numeric tolerance is explicitly configured
  if (tolerance !== undefined) {
    const diff = Math.abs(x_next - x_curr);
    if (diff <= tolerance) {
      return {
        isMet: true,
        reason: `Consecutive step difference |x_(${n + 1}) - x_(${n})| = ${diff.toExponential(3)} is within tolerance ${tolerance}.`,
      };
    }
  }

  // Course default: decimal-places agreement between x_n and x_(n+1)
  const isMet = isConsecutiveDecimalAgreementMet(x_next, x_curr, decimalPlaces);
  if (isMet) {
    const formatted = x_next.toFixed(decimalPlaces);
    return {
      isMet: true,
      reason: `Consecutive approximations x_(${n}) and x_(${n + 1}) agree to ${decimalPlaces} decimal places (${formatted}).`,
    };
  }

  return { isMet: false };
}
