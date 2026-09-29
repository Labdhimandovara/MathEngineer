/**
 * Types and interfaces for the Bisection Method Engine
 */

export interface BisectionIteration {
  n: number;
  a: number;
  b: number;
  midpoint: number; // x_(n+1) = (a_n + b_n) / 2
  f_a: number;
  f_b: number;
  f_midpoint: number; // f(x_(n+1))
  next_interval: [number, number];
  is_stopping_met: boolean;
}

export type BisectionStoppingRule =
  | 'decimal_places' // Course default: a_n, b_n, and x_(n+1) equal to d decimal places
  | 'interval_tolerance' // Future utility: |b_n - a_n| < 10^-d
  | 'consecutive_midpoints' // Future utility: |x_(n+1) - x_n| < 10^-d
  | 'exact_zero'; // f(x_(n+1)) == 0

export interface BisectionOptions {
  expression: string | ((x: number) => number);
  a: number;
  b: number;
  decimalPlaces?: number; // Desired decimal places (e.g. 2 for course example)
  maxIterations?: number; // Optional safety limit (defaults to 100)
  stoppingRule?: BisectionStoppingRule; // Defaults strictly to 'decimal_places'
}

export interface BisectionResult {
  success: boolean;
  root?: number;
  formattedRoot?: string;
  iterations: BisectionIteration[];
  iterations_used: number;
  stopping_reason?: string;
  error?: string;
  errorCode?:
    | 'INVALID_BOUNDS'
    | 'INVALID_EXPRESSION'
    | 'EVALUATION_ERROR'
    | 'NO_SIGN_CHANGE'
    | 'MAX_ITERATIONS_EXCEEDED';
  exactRootFoundAt?: 'a' | 'b' | 'midpoint';
  initialEvaluation?: {
    a: number;
    b: number;
    f_a: number;
    f_b: number;
  };
}

/* =========================================================================
 * Educational and Interactive Types (Solve with Me)
 * ========================================================================= */

export type InteractiveStepType =
  | 'bracket_check'   // Calculate f(a_0) and f(b_0)
  | 'midpoint'        // Calculate midpoint x_(n+1) = (a_n + b_n)/2
  | 'f_midpoint'      // Calculate f(x_(n+1))
  | 'interval_choice' // Choose which sub-interval contains the root
  | 'completed';      // Course stopping condition reached

export interface StepContext {
  expression: string;
  n: number;
  iterationDisplay: number; // n + 1
  a: number;
  b: number;
  f_a: number;
  f_b: number;
  midpoint: number;
  f_midpoint: number;
  nextInterval: [number, number];
  decimalPlaces: number;
}

export interface StepHintContent {
  whyAreWeDoingThis: string;
  hints: [string, string, string];
  correctExplanation: string;
  diagnoseMistake?: (userValue: any) => string | null;
  defaultMistakeFeedback: string;
}

export interface StepFeedback {
  status: 'idle' | 'correct' | 'incorrect';
  message?: string;
  userValue?: string;
  mistakeDiagnostic?: string;
}

export interface CompletedIterationRecord {
  n: number;
  a: number;
  b: number;
  midpoint: number;
  f_midpoint: number;
  next_interval: [number, number];
  hintsUsedForIteration?: number;
}

export interface InteractiveSessionState {
  currentIterationIndex: number;
  totalIterations: number;
  currentStep: InteractiveStepType;
  stepFeedback: StepFeedback;
  stepExplanation?: string; // Meaningful explanation shown after correct answer
  completedIterations: CompletedIterationRecord[];
  independentStepsCompleted: number;
  hintsRevealedForCurrentStep: number; // 0, 1, 2, or 3
  totalHintsUsed: number;
  highestHintLevelUsed: number;
  hintHistory: Record<string, number>; // maps stepKey to number of hints used
  isCompleted: boolean;
}
