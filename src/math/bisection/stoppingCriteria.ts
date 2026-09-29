/**
 * Isolated Stopping Criteria for Bisection Method
 * 
 * ACTIVE COURSE RULE:
 * `isCourseDecimalPlacesMet` is the ONLY active production stopping rule
 * matching the course material (Slide 8):
 * "In the 8th step a_n, b_n and x_(n+1) are equal up to two decimal places.
 * We can take 2.94 as a root up to two decimal places."
 */

/**
 * Checks if a_n, b_n, and x_(n+1) are equal up to `decimalPlaces`.
 * This is the ONLY active production stopping rule.
 */
export function isCourseDecimalPlacesMet(
  a: number,
  b: number,
  midpoint: number,
  decimalPlaces: number
): boolean {
  if (decimalPlaces <= 0) {
    return Math.round(a) === Math.round(b);
  }

  // Decimal equality formatted to d decimal places
  const aFormatted = a.toFixed(decimalPlaces);
  const bFormatted = b.toFixed(decimalPlaces);
  const mFormatted = midpoint.toFixed(decimalPlaces);

  // Both interval endpoints and the midpoint agree to d decimal places
  if (aFormatted === bFormatted && aFormatted === mFormatted) {
    return true;
  }

  // Also check truncation to d decimal places
  const factor = Math.pow(10, decimalPlaces);
  const aTrunc = Math.trunc(a * factor);
  const bTrunc = Math.trunc(b * factor);
  const mTrunc = Math.trunc(midpoint * factor);

  return aTrunc === bTrunc && aTrunc === mTrunc;
}

/* =========================================================================
 * FUTURE EXPERIMENTAL UTILITIES
 * The functions below exist purely as isolated utilities for future
 * experimentation. They do NOT affect the default solver result.
 * ========================================================================= */

/**
 * [FUTURE UTILITY] Checks if interval width |b - a| < 10^-d.
 * NOT used in default production solver.
 */
export function isIntervalToleranceMet(
  a: number,
  b: number,
  decimalPlaces: number
): boolean {
  const tolerance = Math.pow(10, -decimalPlaces);
  return Math.abs(b - a) <= tolerance;
}

/**
 * [FUTURE UTILITY] Checks if consecutive midpoints |x_(n+1) - x_n| < 10^-d.
 * NOT used in default production solver.
 */
export function isConsecutiveMidpointsMet(
  currMidpoint: number,
  prevMidpoint: number | null,
  decimalPlaces: number
): boolean {
  if (prevMidpoint === null) return false;
  const tolerance = Math.pow(10, -decimalPlaces);
  return Math.abs(currMidpoint - prevMidpoint) <= tolerance;
}
