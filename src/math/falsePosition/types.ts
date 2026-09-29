/**
 * Type Definitions for False Position (Regula Falsi) Method
 */

import { MathFunction, NumericalErrorCode } from '../numerical/types.ts';

export type FalsePositionStoppingStrategy =
  | 'decimal_places'     // Consecutive approximations agree to requested decimal places
  | 'consecutive_step'   // Absolute change between consecutive approximations |c_(n+1) - c_n| < tolerance
  | 'function_residual'  // Absolute function value |f(c_(n+1))| < tolerance
  | 'interval_width'     // Interval length |b_n - a_n| < tolerance
  | 'custom';

export interface FalsePositionOptions {
  expression: string | MathFunction;
  a: number;
  b: number;
  decimalPlaces?: number;
  tolerance?: number;
  maxIterations?: number;
  stoppingStrategy?: FalsePositionStoppingStrategy;
  customStoppingCriterion?: (
    current: FalsePositionIteration,
    previous?: FalsePositionIteration
  ) => boolean;
}

export interface FalsePositionIteration {
  n: number;
  a: number;
  b: number;
  f_a: number;
  f_b: number;
  c: number;
  f_c: number;
  next_interval: [number, number];
  is_stopping_met: boolean;
  step_difference?: number;
}

export interface FalsePositionResult {
  success: boolean;
  root?: number;
  formattedRoot?: string;
  iterations: FalsePositionIteration[];
  iterations_used: number;
  stopping_reason?: string;
  stopping_strategy_used?: string;
  exactRootFoundAt?: 'a' | 'b' | 'c';
  errorCode?: NumericalErrorCode;
  error?: string;
  initialEvaluation?: {
    a: number;
    b: number;
    f_a: number;
    f_b: number;
  };
}

export type FalsePositionInteractiveStepType =
  | 'bracket_check'
  | 'approximation'
  | 'f_approximation'
  | 'interval_choice'
  | 'completed';

export interface FalsePositionCompletedIterationRecord {
  n: number;
  a: number;
  b: number;
  f_a: number;
  f_b: number;
  c: number;
  f_c: number;
  next_interval: [number, number];
  hintsUsedForIteration?: number;
}

export interface FalsePositionStepHintContent {
  whyAreWeDoingThis: string;
  hints: [string, string, string];
  correctExplanation: string;
  diagnoseMistake?: (userValue: any) => string | null;
  defaultMistakeFeedback: string;
}

export interface FalsePositionStepFeedback {
  status: 'idle' | 'correct' | 'incorrect';
  message?: string;
  userValue?: string;
  mistakeDiagnostic?: string;
}

export interface FalsePositionSessionState {
  currentIterationIndex: number;
  totalIterations: number;
  currentStep: FalsePositionInteractiveStepType;
  stepFeedback: FalsePositionStepFeedback;
  completedIterations: FalsePositionCompletedIterationRecord[];
  independentStepsCompleted: number;
  hintsRevealedForCurrentStep: number;
  totalHintsUsed: number;
  highestHintLevelUsed: number;
  hintHistory: Record<string, number>;
  isCompleted: boolean;
  stepExplanation?: string;
}

export interface FalsePositionStepContext {
  expression: string;
  n: number;
  iterationDisplay: number;
  a: number;
  b: number;
  f_a: number;
  f_b: number;
  c: number;
  f_c: number;
  nextInterval: [number, number];
  decimalPlaces: number;
}
