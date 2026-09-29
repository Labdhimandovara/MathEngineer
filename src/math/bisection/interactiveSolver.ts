/**
 * Interactive Bisection State Machine (Solve with Me)
 * 
 * Consumes the canonical BisectionResult from bisectionSolver.ts as the
 * single source of mathematical truth. Coordinates progressive hints,
 * step explanations, and deterministic mistake diagnostics.
 */

import {
  BisectionResult,
  BisectionIteration,
  InteractiveSessionState,
  InteractiveStepType,
  CompletedIterationRecord,
  StepContext,
} from './types';
import { isNumericallyEqual } from './numericValidation';
import {
  getBracketCheckContent,
  getMidpointContent,
  getFMidpointContent,
  getIntervalChoiceContent,
} from '../../data/bisectionEducationalContent';

/**
 * Derives the active StepContext from the current solver state and problem.
 */
export function getStepContext(
  state: InteractiveSessionState,
  result: BisectionResult,
  expression: string = 'x^3 - 9x + 1'
): StepContext {
  const currentIter: BisectionIteration | undefined =
    result.iterations[state.currentIterationIndex];

  const a = currentIter ? currentIter.a : (result.initialEvaluation?.a ?? 0);
  const b = currentIter ? currentIter.b : (result.initialEvaluation?.b ?? 0);
  const f_a = currentIter ? currentIter.f_a : (result.initialEvaluation?.f_a ?? 0);
  const f_b = currentIter ? currentIter.f_b : (result.initialEvaluation?.f_b ?? 0);
  const midpoint = currentIter ? currentIter.midpoint : (a + b) / 2;
  const f_midpoint = currentIter ? currentIter.f_midpoint : 0;
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
    midpoint,
    f_midpoint,
    nextInterval,
    decimalPlaces: 2,
  };
}

/**
 * Initializes a new interactive session based on the deterministic solver result.
 */
export function createInteractiveSession(result: BisectionResult): InteractiveSessionState {
  const totalIterations = result.iterations.length;

  if (result.exactRootFoundAt === 'a' || result.exactRootFoundAt === 'b' || totalIterations === 0) {
    return {
      currentIterationIndex: 0,
      totalIterations: 0,
      currentStep: 'completed',
      stepFeedback: { status: 'correct', message: result.stopping_reason },
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
export function requestHint(state: InteractiveSessionState): InteractiveSessionState {
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
 * Step 1: Validate initial bracket values f(a_0) and f(b_0).
 */
export function processBracketCheck(
  state: InteractiveSessionState,
  result: BisectionResult,
  userFa: number,
  userFb: number,
  expression: string = 'x^3 - 9x + 1'
): InteractiveSessionState {
  if (state.currentStep !== 'bracket_check') {
    return state;
  }

  const expectedFa = result.initialEvaluation?.f_a;
  const expectedFb = result.initialEvaluation?.f_b;

  if (expectedFa === undefined || expectedFb === undefined) {
    throw new Error('Initial evaluation missing from deterministic BisectionResult.');
  }

  const isFaCorrect = isNumericallyEqual(userFa, expectedFa);
  const isFbCorrect = isNumericallyEqual(userFb, expectedFb);

  const a = result.initialEvaluation?.a ?? 0;
  const b = result.initialEvaluation?.b ?? 0;
  const content = getBracketCheckContent(expression, a, b, expectedFa, expectedFb);

  if (isFaCorrect && isFbCorrect) {
    return {
      ...state,
      currentStep: 'midpoint',
      independentStepsCompleted: state.independentStepsCompleted + 1,
      stepFeedback: {
        status: 'correct',
        message: 'Correct.',
      },
      stepExplanation: content.correctExplanation,
      hintsRevealedForCurrentStep: 0, // Reset hint level for next step
    };
  }

  // Diagnose mistake or provide neutral honest feedback
  const diagnostic = content.diagnoseMistake?.(`${userFa},${userFb}`);
  const feedbackMessage = diagnostic || content.defaultMistakeFeedback;

  return {
    ...state,
    stepFeedback: {
      status: 'incorrect',
      message: feedbackMessage,
      userValue: `f(a₀) = ${userFa}, f(b₀) = ${userFb}`,
    },
  };
}

/**
 * Step 2: Validate midpoint x_(n+1).
 */
export function processMidpoint(
  state: InteractiveSessionState,
  result: BisectionResult,
  userMidpoint: number,
  expression: string = 'x^3 - 9x + 1'
): InteractiveSessionState {
  if (state.currentStep !== 'midpoint') {
    return state;
  }

  const currentIter: BisectionIteration = result.iterations[state.currentIterationIndex];
  if (!currentIter) {
    throw new Error(`Iteration ${state.currentIterationIndex} not found in deterministic result.`);
  }

  const context = getStepContext(state, result, expression);
  const content = getMidpointContent(context);

  const expectedMidpoint = currentIter.midpoint;
  const isCorrect = isNumericallyEqual(userMidpoint, expectedMidpoint);

  if (isCorrect) {
    return {
      ...state,
      currentStep: 'f_midpoint',
      independentStepsCompleted: state.independentStepsCompleted + 1,
      stepFeedback: {
        status: 'correct',
        message: 'Correct.',
      },
      stepExplanation: content.correctExplanation,
      hintsRevealedForCurrentStep: 0, // Reset hint level for next step
    };
  }

  const diagnostic = content.diagnoseMistake?.(userMidpoint);
  const feedbackMessage = diagnostic || content.defaultMistakeFeedback;

  return {
    ...state,
    stepFeedback: {
      status: 'incorrect',
      message: feedbackMessage,
      userValue: String(userMidpoint),
    },
  };
}

/**
 * Step 3: Validate midpoint function value f(x_(n+1)).
 */
export function processFMidpoint(
  state: InteractiveSessionState,
  result: BisectionResult,
  userFVal: number,
  expression: string = 'x^3 - 9x + 1'
): InteractiveSessionState {
  if (state.currentStep !== 'f_midpoint') {
    return state;
  }

  const currentIter: BisectionIteration = result.iterations[state.currentIterationIndex];
  if (!currentIter) {
    throw new Error(`Iteration ${state.currentIterationIndex} not found in deterministic result.`);
  }

  const context = getStepContext(state, result, expression);
  const content = getFMidpointContent(context);

  const expectedF = currentIter.f_midpoint;
  const isCorrect = isNumericallyEqual(userFVal, expectedF);

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
      hintsRevealedForCurrentStep: 0, // Reset hint level for next step
    };
  }

  const diagnostic = content.diagnoseMistake?.(userFVal);
  const feedbackMessage = diagnostic || content.defaultMistakeFeedback;

  return {
    ...state,
    stepFeedback: {
      status: 'incorrect',
      message: feedbackMessage,
      userValue: String(userFVal),
    },
  };
}

/**
 * Step 4: Validate interval choice ('left' for [a_n, x_(n+1)], 'right' for [x_(n+1), b_n]).
 */
export function processIntervalChoice(
  state: InteractiveSessionState,
  result: BisectionResult,
  chosenHalf: 'left' | 'right',
  expression: string = 'x^3 - 9x + 1'
): InteractiveSessionState {
  if (state.currentStep !== 'interval_choice') {
    return state;
  }

  const currentIter: BisectionIteration = result.iterations[state.currentIterationIndex];
  if (!currentIter) {
    throw new Error(`Iteration ${state.currentIterationIndex} not found in deterministic result.`);
  }

  const context = getStepContext(state, result, expression);
  const content = getIntervalChoiceContent(context);

  const expectedNextInterval = currentIter.next_interval;
  const isExpectedLeft = Math.abs(expectedNextInterval[0] - currentIter.a) < 1e-6;
  const expectedChoice: 'left' | 'right' = isExpectedLeft ? 'left' : 'right';

  const isCorrect = chosenHalf === expectedChoice;

  if (isCorrect) {
    const hintsForIter =
      (state.hintHistory[`iter${currentIter.n}_bracket`] || 0) +
      (state.hintHistory[`iter${currentIter.n}_midpoint`] || 0) +
      (state.hintHistory[`iter${currentIter.n}_f_midpoint`] || 0) +
      (state.hintHistory[`iter${currentIter.n}_interval_choice`] || 0);

    const record: CompletedIterationRecord = {
      n: currentIter.n,
      a: currentIter.a,
      b: currentIter.b,
      midpoint: currentIter.midpoint,
      f_midpoint: currentIter.f_midpoint,
      next_interval: currentIter.next_interval,
      hintsUsedForIteration: hintsForIter,
    };

    const nextCompletedList = [...state.completedIterations, record];
    const nextStepsCount = state.independentStepsCompleted + 1;

    // Check if stopping condition was met on this iteration
    if (currentIter.is_stopping_met || state.currentIterationIndex + 1 >= result.iterations.length) {
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

    // Advance to next iteration
    return {
      ...state,
      currentIterationIndex: state.currentIterationIndex + 1,
      currentStep: 'midpoint',
      completedIterations: nextCompletedList,
      independentStepsCompleted: nextStepsCount,
      hintsRevealedForCurrentStep: 0, // Reset hint level for next iteration's first step
      stepFeedback: {
        status: 'correct',
        message: 'Correct.',
      },
      stepExplanation: content.correctExplanation,
    };
  }

  const diagnostic = content.diagnoseMistake?.(chosenHalf);
  const feedbackMessage = diagnostic || content.defaultMistakeFeedback;

  return {
    ...state,
    stepFeedback: {
      status: 'incorrect',
      message: feedbackMessage,
      userValue: chosenHalf === 'left' ? `[${currentIter.a}, ${currentIter.midpoint}]` : `[${currentIter.midpoint}, ${currentIter.b}]`,
    },
  };
}
