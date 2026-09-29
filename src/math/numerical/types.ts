/**
 * Shared Numerical Analysis Types
 * 
 * Reusable data contracts across root-finding numerical methods (Bisection, False Position, etc.)
 */

import { MathFunction } from '../expressionParser';

export type { MathFunction };

export interface BracketEvaluation {
  a: number;
  b: number;
  f_a: number;
  f_b: number;
}

export type NumericalErrorCode =
  | 'INVALID_BOUNDS'
  | 'INVALID_EXPRESSION'
  | 'EVALUATION_ERROR'
  | 'NO_SIGN_CHANGE'
  | 'MAX_ITERATIONS_EXCEEDED';

export interface InitialBracketValidationSuccess {
  isValid: true;
  f: MathFunction;
  a: number;
  b: number;
  f_a: number;
  f_b: number;
  exactBoundaryRoot?: 'a' | 'b';
}

export interface InitialBracketValidationFailure {
  isValid: false;
  errorCode: NumericalErrorCode;
  error: string;
  initialEvaluation?: BracketEvaluation;
}

export type InitialBracketValidationResult =
  | InitialBracketValidationSuccess
  | InitialBracketValidationFailure;
