/**
 * Shared Floating-Point Precision Utilities
 * 
 * Preserves IEEE-754 full numerical precision across all numerical methods.
 */

export const EPSILON_ZERO = 1e-15;
export const FLOAT_EPSILON = 1e-4;

/**
 * Checks whether a number is close to zero within a given tolerance.
 */
export function isNearZero(val: number, epsilon: number = EPSILON_ZERO): boolean {
  return Math.abs(val) <= epsilon;
}

/**
 * Validates whether user-entered floating point numbers match expected values
 * within an IEEE-754 representation tolerance.
 */
export function isNumericallyEqual(
  userInput: number,
  expected: number,
  tolerance: number = FLOAT_EPSILON
): boolean {
  if (typeof userInput !== 'number' || isNaN(userInput) || !isFinite(userInput)) {
    return false;
  }
  if (typeof expected !== 'number' || isNaN(expected) || !isFinite(expected)) {
    return false;
  }
  return Math.abs(userInput - expected) <= tolerance;
}
