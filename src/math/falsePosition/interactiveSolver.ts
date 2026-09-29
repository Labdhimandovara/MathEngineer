/**
 * Interactive False Position State Machine (Solve with Me)
 * 
 * Consumes the canonical FalsePositionResult from falsePositionSolver.ts as the
 * single source of mathematical truth. Coordinates step-by-step student calculation,
 * feedback, and interval-selection logic grounded in the course PPT.
 */

import {
  FalsePositionResult,
  FalsePositionIteration,
  FalsePositionSessionState,
  FalsePositionCompletedIterationRecord,
  FalsePositionStepContext,
} from './types.ts';
import { isNumericallyEqual } from '../numerical/precision.ts';
import {
  getFalsePositionBracketCheckContent,
  getFalsePositionApproximationContent,
  getFalsePositionFApproximationContent,
  getFalsePositionIntervalChoiceContent,
} from '../../data/falsePositionEducationalContent.ts';

/**
 * Derives the active StepContext from current session state and deterministic result.
 */
export function getFalsePositionStepContext(
  state: FalsePositionSessionState,
  result: FalsePositionResult,
  expression: string = 'cos(x) - x*exp(x)'
): FalsePositionStepContext {
  const currentIter: FalsePositionIteration | undefined =
    result.iterations[state.currentIterationIndex];

  const a = currentIter ? currentIter.a : (result.initialEvaluation?.a ?? 0);
  const b = currentIter ? currentIter.b : (result.initialEvaluation?.b ?? 1);
  const f_a = currentIter ? currentIter.f_a : (result.initialEvaluation?.f_a ?? 0);
  const f_b = currentIter ? currentIter.f_b : (result.initialEvaluation?.f_b ?? 0);
  const c = currentIter ? currentIter.c : a;
  const f_c = currentIter ? currentIter.f_c : 0;
  const nextInterval: [number, number] = currentIter
    ? currentIter.next_interval
    : [a, b];

  return {
    expression,
    n: state.currentIterationIndex,
    iterationDisplay: state.currentIterationIndex + 1,
    a,
    b,
    f_a,
    f_b,
    c,
    f_c,
    nextInterval,
    decimalPlaces: 4,
  };
}

/**
 * Initializes an interactive False Position session.
 */
export function createFalsePositionInteractiveSession(
  result: FalsePositionResult
): FalsePositionSessionState {
  const totalIterations = result.iterations.length;

  if (
    result.exactRootFoundAt === 'a' ||
    result.exactRootFoundAt === 'b' ||
    totalIterations === 0
  ) {
    return {
      currentIterationIndex: 0,
      totalIterations: 0,
      currentStep: 'completed',
      stepFeedback: {
        status: 'correct',
        message: result.stopping_reason || 'Exact root found at boundary.',
      },
      completedIterations: [],
      independentStepsCompleted: 0,
      hintsRevealedForCurrentStep: 0,
      totalHintsUsed: 0,
      highestHintLevelUsed: 0,
      hintHistory: {},
      isCompleted: true,
    };
  }

  return {
    currentIterationIndex: 0,
    totalIterations,
    currentStep: 'bracket_check',
    stepFeedback: { status: 'idle' },
    completedIterations: [],
    independentStepsCompleted: 0,
    hintsRevealedForCurrentStep: 0,
    totalHintsUsed: 0,
    highestHintLevelUsed: 0,
    hintHistory: {},
    isCompleted: false,
  };
}

/**
 * Requests the next hint level for the current step (reveals Hint 1, then Hint 2, then Hint 3).
 */
export function requestFalsePositionHint(
  state: FalsePositionSessionState
): FalsePositionSessionState {
  if (state.isCompleted || state.hintsRevealedForCurrentStep >= 3) {
    return state;
  }

  const nextLevel = state.hintsRevealedForCurrentStep + 1;
  const stepKey = `iter${state.currentIterationIndex}_${state.currentStep}`;

  return {
    ...state,
    hintsRevealedForCurrentStep: nextLevel,
    totalHintsUsed: state.totalHintsUsed + 1,
    highestHintLevelUsed: Math.max(state.highestHintLevelUsed, nextLevel),
    hintHistory: {
      ...state.hintHistory,
      [stepKey]: nextLevel,
    },
  };
}

/**
 * Step 1: Validate initial bracket values f(a) and f(b).
 */
export function processFalsePositionBracketCheck(
  state: FalsePositionSessionState,
  result: FalsePositionResult,
  userFa: number,
  userFb: number,
  expression: string = 'cos(x) - x*exp(x)'
): FalsePositionSessionState {
  if (state.currentStep !== 'bracket_check') {
    return state;
  }

  const expectedFa = result.initialEvaluation?.f_a;
  const expectedFb = result.initialEvaluation?.f_b;

  if (expectedFa === undefined || expectedFb === undefined) {
    throw new Error('Initial evaluation missing from deterministic FalsePositionResult.');
  }

  const isFaCorrect = isNumericallyEqual(userFa, expectedFa, 2e-4);
  const isFbCorrect = isNumericallyEqual(userFb, expectedFb, 2e-4);

  const a = result.initialEvaluation?.a ?? 0;
  const b = result.initialEvaluation?.b ?? 1;
  const content = getFalsePositionBracketCheckContent(expression, a, b, expectedFa, expectedFb);

  if (isFaCorrect && isFbCorrect) {
    return {
      ...state,
      currentStep: 'approximation',
      independentStepsCompleted: state.independentStepsCompleted + 1,
      stepFeedback: {
        status: 'correct',
        message: 'Correct.',
      },
      stepExplanation: content.correctExplanation,
      hintsRevealedForCurrentStep: 0,
    };
  }

  const diagnostic = content.diagnoseMistake?.(`${userFa},${userFb}`);
  const feedbackMsg = diagnostic || content.defaultMistakeFeedback;

  return {
    ...state,
    stepFeedback: {
      status: 'incorrect',
      message: feedbackMsg,
      userValue: `f(${a}) = ${userFa}, f(${b}) = ${userFb}`,
      mistakeDiagnostic: diagnostic || undefined,
    },
  };
}

/**
 * Step 2: Validate False Position approximation x = [a·f(b) - b·f(a)] / [f(b) - f(a)].
 */
export function processFalsePositionApproximation(
  state: FalsePositionSessionState,
  result: FalsePositionResult,
  userC: number,
  expression: string = 'cos(x) - x*exp(x)'
): FalsePositionSessionState {
  if (state.currentStep !== 'approximation') {
    return state;
  }

  const currentIter: FalsePositionIteration = result.iterations[state.currentIterationIndex];
  if (!currentIter) {
    throw new Error(`Iteration ${state.currentIterationIndex} not found in deterministic result.`);
  }

  const context = getFalsePositionStepContext(state, result, expression);
  const content = getFalsePositionApproximationContent(context);

  const expectedC = currentIter.c;
  const isCorrect = isNumericallyEqual(userC, expectedC, 2e-4);

  if (isCorrect) {
    return {
      ...state,
      currentStep: 'f_approximation',
      independentStepsCompleted: state.independentStepsCompleted + 1,
      stepFeedback: {
        status: 'correct',
        message: 'Correct.',
      },
      stepExplanation: content.correctExplanation,
      hintsRevealedForCurrentStep: 0,
    };
  }

  const diagnostic = content.diagnoseMistake?.(userC);
  const feedbackMsg = diagnostic || content.defaultMistakeFeedback;

  return {
    ...state,
    stepFeedback: {
      status: 'incorrect',
      message: feedbackMsg,
      userValue: String(userC),
      mistakeDiagnostic: diagnostic || undefined,
    },
  };
}

/**
 * Step 3: Validate function evaluation f(x).
 */
export function processFalsePositionFApproximation(
  state: FalsePositionSessionState,
  result: FalsePositionResult,
  userFc: number,
  expression: string = 'cos(x) - x*exp(x)'
): FalsePositionSessionState {
  if (state.currentStep !== 'f_approximation') {
    return state;
  }

  const currentIter: FalsePositionIteration = result.iterations[state.currentIterationIndex];
  if (!currentIter) {
    throw new Error(`Iteration ${state.currentIterationIndex} not found in deterministic result.`);
  }

  const context = getFalsePositionStepContext(state, result, expression);
  const content = getFalsePositionFApproximationContent(context);

  const expectedFc = currentIter.f_c;
  const isCorrect = isNumericallyEqual(userFc, expectedFc, 2e-4);

  if (isCorrect) {
    return {
      ...state,
      currentStep: 'interval_choice',
      independentStepsCompleted: state.independentStepsCompleted + 1,
      stepFeedback: {
        status: 'correct',
        message: 'Correct.',
      },
      stepExplanation: content.correctExplanation,
      hintsRevealedForCurrentStep: 0,
    };
  }

  const diagnostic = content.diagnoseMistake?.(userFc);
  const feedbackMsg = diagnostic || content.defaultMistakeFeedback;

  return {
    ...state,
    stepFeedback: {
      status: 'incorrect',
      message: feedbackMsg,
      userValue: String(userFc),
      mistakeDiagnostic: diagnostic || undefined,
    },
  };
}

export type IntervalChoiceInput = 'replace_a' | 'replace_b' | 'left' | 'right';

/**
 * Step 4: Validate interval selection based on course rule:
 * "If f(x) has the same sign as f(a), replace a with x."
 * "If f(x) has the same sign as f(b), replace b with x."
 */
export function processFalsePositionIntervalChoice(
  state: FalsePositionSessionState,
  result: FalsePositionResult,
  userChoice: IntervalChoiceInput,
  expression: string = 'cos(x) - x*exp(x)'
): FalsePositionSessionState {
  if (state.currentStep !== 'interval_choice') {
    return state;
  }

  const currentIter: FalsePositionIteration = result.iterations[state.currentIterationIndex];
  if (!currentIter) {
    throw new Error(`Iteration ${state.currentIterationIndex} not found in deterministic result.`);
  }

  const context = getFalsePositionStepContext(state, result, expression);
  const content = getFalsePositionIntervalChoiceContent(context);

  const isReplaceA = Math.abs(currentIter.next_interval[0] - currentIter.c) < 1e-6;
  const expectedChoice: IntervalChoiceInput = isReplaceA ? 'replace_a' : 'replace_b';

  const normalizedUserChoice: IntervalChoiceInput =
    userChoice === 'right' ? 'replace_a' : userChoice === 'left' ? 'replace_b' : userChoice;

  const isCorrect = normalizedUserChoice === expectedChoice;

  if (isCorrect) {
    const hintsInThisIter =
      (state.hintHistory[`iter${state.currentIterationIndex}_approximation`] ?? 0) +
      (state.hintHistory[`iter${state.currentIterationIndex}_f_approximation`] ?? 0) +
      (state.hintHistory[`iter${state.currentIterationIndex}_interval_choice`] ?? 0);

    const record: FalsePositionCompletedIterationRecord = {
      n: currentIter.n,
      a: currentIter.a,
      b: currentIter.b,
      f_a: currentIter.f_a,
      f_b: currentIter.f_b,
      c: currentIter.c,
      f_c: currentIter.f_c,
      next_interval: currentIter.next_interval,
      hintsUsedForIteration: hintsInThisIter,
    };

    const nextCompletedList = [...state.completedIterations, record];
    const nextStepsCount = state.independentStepsCompleted + 1;

    // Check if stopping condition was met or last iteration reached
    if (
      currentIter.is_stopping_met ||
      state.currentIterationIndex + 1 >= result.iterations.length
    ) {
      return {
        ...state,
        currentStep: 'completed',
        completedIterations: nextCompletedList,
        independentStepsCompleted: nextStepsCount,
        hintsRevealedForCurrentStep: 0,
        isCompleted: true,
        stepFeedback: {
          status: 'correct',
          message: 'Problem completed.',
        },
        stepExplanation: content.correctExplanation,
      };
    }

    return {
      ...state,
      currentIterationIndex: state.currentIterationIndex + 1,
      currentStep: 'approximation',
      completedIterations: nextCompletedList,
      independentStepsCompleted: nextStepsCount,
      hintsRevealedForCurrentStep: 0,
      stepFeedback: {
        status: 'correct',
        message: 'Correct.',
      },
      stepExplanation: content.correctExplanation,
    };
  }

  const diagnostic = content.diagnoseMistake?.(userChoice);
  const feedbackMsg = diagnostic || content.defaultMistakeFeedback;

  return {
    ...state,
    stepFeedback: {
      status: 'incorrect',
      message: feedbackMsg,
      userValue: userChoice,
      mistakeDiagnostic: diagnostic || undefined,
    },
  };
}
