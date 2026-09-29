/**
 * Isolated Numeric Validation Utility for Student Inputs
 * 
 * Compares student numeric input against deterministic expected values
 * using a small floating-point tolerance solely to account for IEEE-754
 * machine representation.
 * 
 * Does NOT invent broad educational rounding tolerances.
 */

export const FLOAT_EPSILON = 1e-4;

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
