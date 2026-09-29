/**
 * Type Definitions for Newton-Raphson Method
 * 
 * Sourced from official course material (Dr. Ram Kishun Lodhi, SIT Pune).
 */

import { MathFunction, NumericalErrorCode } from '../numerical/types.ts';

export type NewtonRaphsonPrecisionMode =
  | 'course_step_rounding' // Rounds approximations at each iteration to match textbook worked steps
  | 'full_precision';      // Maintains full IEEE-754 precision throughout

export type NewtonRaphsonErrorCode =
  | NumericalErrorCode
  | 'DERIVATIVE_ZERO'
  | 'UNSUPPORTED_DERIVATIVE';

export interface NewtonRaphsonOptions {
  expression: string | MathFunction;
  derivative?: string | MathFunction;
  a?: number;
  b?: number;
  x0?: number;
  decimalPlaces?: number;
  maxIterations?: number;
  precisionMode?: NewtonRaphsonPrecisionMode;
  tolerance?: number;
}

export interface NewtonRaphsonIteration {
  n: number;
  x_n: number;
  f_x: number;
  f_prime_x: number;
  x_next: number;
  formatted_x_next: string;
  step_difference: number;
  is_stopping_met: boolean;
}

export interface NewtonRaphsonResult {
  success: boolean;
  root?: number;
  formattedRoot?: string;
  iterations: NewtonRaphsonIteration[];
  iterations_used: number;
  stopping_reason?: string;
  initialInterval?: [number, number];
  initialEvaluation?: {
    a: number;
    b: number;
    f_a: number;
    f_b: number;
  };
  selected_x0: number;
  x0_selection_reason?: string;
  derivativeExpression?: string;
  precisionModeUsed: NewtonRaphsonPrecisionMode;
  errorCode?: NewtonRaphsonErrorCode;
  error?: string;
}

// ----------------------------------------------------
// Interactive Learning State Types
// ----------------------------------------------------

export type NewtonRaphsonStep =
  | 'check_x0'          // Step 1: Validate/confirm initial guess x0
  | 'evaluate_fx'       // Step 2: Evaluate f(x_n)
  | 'evaluate_fprime'   // Step 3: Evaluate derivative f'(x_n)
  | 'apply_formula'     // Step 4: Compute x_(n+1) = x_n - f(x_n)/f'(x_n)
  | 'check_stopping'    // Step 5: Check agreement to requested decimal places
  | 'completed';        // Solved

export interface NewtonRaphsonStepContext {
  iterationIndex: number;
  x_n: number;
  f_x: number;
  f_prime_x: number;
  x_next: number;
  expression: string;
  derivativeExpression: string;
  a?: number;
  b?: number;
  f_a?: number;
  f_b?: number;
  decimalPlaces: number;
}

export interface NewtonRaphsonStepHintContent {
  whyAreWeDoingThis: string;
  hints: string[];
  correctExplanation: string;
  diagnoseMistake?: (userVal: any) => string | null;
  defaultMistakeFeedback: string;
}

export interface NewtonRaphsonStepFeedback {
  isCorrect: boolean;
  message: string;
  mistakeDiagnostic?: string;
  explanation?: string;
}

export interface NewtonRaphsonCompletedIterationRecord {
  iteration: number;
  x_n: number;
  f_x: number;
  f_prime_x: number;
  x_next: number;
  hintsUsedForIteration: number;
}

export interface NewtonRaphsonSessionState {
  problemExpression: string;
  derivativeExpression: string;
  currentStep: NewtonRaphsonStep;
  currentIterationIndex: number;
  canonicalResult: NewtonRaphsonResult;
  activeIteration: NewtonRaphsonIteration | null;
  isComplete: boolean;
  completedIterations: NewtonRaphsonCompletedIterationRecord[];
  hintsRevealedForCurrentStep: number;
  totalHintsUsed: number;
  highestHintLevelUsed: number;
  hintHistory: {
    iteration: number;
    step: NewtonRaphsonStep;
    hintLevel: number;
    hintText: string;
  }[];
  lastFeedback: NewtonRaphsonStepFeedback | null;
}
