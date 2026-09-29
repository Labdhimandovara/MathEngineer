/**
 * Deterministic Interactive Solver State Machine for Newton-Raphson Method
 * 
 * Sourced directly from Dr. Ram Kishun Lodhi's course presentation (SIT Pune).
 * ZERO LLM generation, completely deterministic.
 * 
 * Driven solely by the canonical NewtonRaphsonResult.
 */

import {
  NewtonRaphsonIteration,
  NewtonRaphsonResult,
  NewtonRaphsonSessionState,
  NewtonRaphsonStep,
  NewtonRaphsonStepContext,
  NewtonRaphsonStepFeedback,
} from './types.ts';

import {
  getNewtonCheckX0Content,
  getNewtonEvaluateFxContent,
  getNewtonEvaluateFPrimeContent,
  getNewtonApplyFormulaContent,
  getNewtonCheckStoppingContent,
} from '../../data/newtonRaphsonEducationalContent.ts';

const NUMERICAL_TOLERANCE = 2e-3;

/**
 * Creates a new interactive session from the canonical NewtonRaphsonResult.
 */
export function createNewtonRaphsonInteractiveSession(
  canonicalResult: NewtonRaphsonResult,
  problemExpression: string
): NewtonRaphsonSessionState {
  const activeIter = canonicalResult.iterations[0] || null;
  const derivativeExpr = canonicalResult.derivativeExpression || "f'(x)";

  return {
    problemExpression,
    derivativeExpression: derivativeExpr,
    currentStep: 'check_x0',
    currentIterationIndex: 0,
    canonicalResult,
    activeIteration: activeIter,
    isComplete: canonicalResult.iterations.length === 0,
    completedIterations: [],
    hintsRevealedForCurrentStep: 0,
    totalHintsUsed: 0,
    highestHintLevelUsed: 0,
    hintHistory: [],
    lastFeedback: null,
  };
}

/**
 * Derives the active step context for hints and mistake diagnostics.
 */
export function getNewtonRaphsonStepContext(
  state: NewtonRaphsonSessionState
): NewtonRaphsonStepContext {
  const iterIndex = state.currentIterationIndex;
  const iter: NewtonRaphsonIteration =
    state.canonicalResult.iterations[iterIndex] ||
    state.canonicalResult.iterations[state.canonicalResult.iterations.length - 1];

  const initEval = state.canonicalResult.initialEvaluation;
  const initInterval = state.canonicalResult.initialInterval;

  return {
    iterationIndex: iterIndex,
    x_n: iter.x_n,
    f_x: iter.f_x,
    f_prime_x: iter.f_prime_x,
    x_next: iter.x_next,
    expression: state.problemExpression,
    derivativeExpression: state.derivativeExpression,
    a: initInterval?.[0],
    b: initInterval?.[1],
    f_a: initEval?.f_a,
    f_b: initEval?.f_b,
    decimalPlaces: 3, // Course default
  };
}

/**
 * Requests the next progressive hint (up to 3) for the current step.
 */
export function requestNewtonRaphsonHint(
  state: NewtonRaphsonSessionState
): { state: NewtonRaphsonSessionState; hint: string | null } {
  if (state.isComplete) {
    return { state, hint: null };
  }

  const context = getNewtonRaphsonStepContext(state);
  let hintContent;

  switch (state.currentStep) {
    case 'check_x0':
      hintContent = getNewtonCheckX0Content(context);
      break;
    case 'evaluate_fx':
      hintContent = getNewtonEvaluateFxContent(context);
      break;
    case 'evaluate_fprime':
      hintContent = getNewtonEvaluateFPrimeContent(context);
      break;
    case 'apply_formula':
      hintContent = getNewtonApplyFormulaContent(context);
      break;
    case 'check_stopping': {
      const isStoppingMet = state.activeIteration?.is_stopping_met ?? false;
      hintContent = getNewtonCheckStoppingContent(context, isStoppingMet);
      break;
    }
    default:
      return { state, hint: null };
  }

  const currentLevel = state.hintsRevealedForCurrentStep;
  if (currentLevel >= 3 || currentLevel >= hintContent.hints.length) {
    // Already revealed maximum hints for this step
    const lastHint = hintContent.hints[hintContent.hints.length - 1];
    return { state, hint: lastHint };
  }

  const nextLevel = currentLevel + 1;
  const hintText = hintContent.hints[nextLevel - 1];

  const updatedState: NewtonRaphsonSessionState = {
    ...state,
    hintsRevealedForCurrentStep: nextLevel,
    totalHintsUsed: state.totalHintsUsed + 1,
    highestHintLevelUsed: Math.max(state.highestHintLevelUsed, nextLevel),
    hintHistory: [
      ...state.hintHistory,
      {
        iteration: state.currentIterationIndex + 1,
        step: state.currentStep,
        hintLevel: nextLevel,
        hintText,
      },
    ],
  };

  return { state: updatedState, hint: hintText };
}

/**
 * Step 1: Process initial guess x0 check
 */
export function processNewtonRaphsonCheckX0(
  state: NewtonRaphsonSessionState,
  userX0: number
): { state: NewtonRaphsonSessionState; feedback: NewtonRaphsonStepFeedback } {
  if (state.currentStep !== 'check_x0') {
    return {
      state,
      feedback: {
        isCorrect: false,
        message: 'Current step is not the initial guess check.',
      },
    };
  }

  const context = getNewtonRaphsonStepContext(state);
  const content = getNewtonCheckX0Content(context);
  const expectedX0 = state.canonicalResult.selected_x0;

  const isMatch = Math.abs(userX0 - expectedX0) < 1e-4;

  if (isMatch) {
    const feedback: NewtonRaphsonStepFeedback = {
      isCorrect: true,
      message: 'Initial approximation confirmed.',
      explanation: content.correctExplanation,
    };

    return {
      state: {
        ...state,
        currentStep: 'evaluate_fx',
        hintsRevealedForCurrentStep: 0,
        lastFeedback: feedback,
      },
      feedback,
    };
  }

  const mistakeDiag = content.diagnoseMistake ? content.diagnoseMistake(userX0) : null;
  const feedback: NewtonRaphsonStepFeedback = {
    isCorrect: false,
    message: mistakeDiag || content.defaultMistakeFeedback,
    mistakeDiagnostic: mistakeDiag || undefined,
  };

  return {
    state: {
      ...state,
      lastFeedback: feedback,
    },
    feedback,
  };
}

/**
 * Step 2: Process evaluate f(x_n)
 */
export function processNewtonRaphsonEvaluateFx(
  state: NewtonRaphsonSessionState,
  userFx: number
): { state: NewtonRaphsonSessionState; feedback: NewtonRaphsonStepFeedback } {
  if (state.currentStep !== 'evaluate_fx') {
    return {
      state,
      feedback: {
        isCorrect: false,
        message: 'Current step is not the f(x_n) evaluation.',
      },
    };
  }

  const context = getNewtonRaphsonStepContext(state);
  const content = getNewtonEvaluateFxContent(context);
  const expectedFx = context.f_x;

  const isMatch = Math.abs(userFx - expectedFx) < NUMERICAL_TOLERANCE;

  if (isMatch) {
    const feedback: NewtonRaphsonStepFeedback = {
      isCorrect: true,
      message: `f(x_${state.currentIterationIndex}) evaluated correctly.`,
      explanation: content.correctExplanation,
    };

    return {
      state: {
        ...state,
        currentStep: 'evaluate_fprime',
        hintsRevealedForCurrentStep: 0,
        lastFeedback: feedback,
      },
      feedback,
    };
  }

  const mistakeDiag = content.diagnoseMistake ? content.diagnoseMistake(userFx) : null;
  const feedback: NewtonRaphsonStepFeedback = {
    isCorrect: false,
    message: mistakeDiag || content.defaultMistakeFeedback,
    mistakeDiagnostic: mistakeDiag || undefined,
  };

  return {
    state: {
      ...state,
      lastFeedback: feedback,
    },
    feedback,
  };
}

/**
 * Step 3: Process evaluate derivative f'(x_n)
 */
export function processNewtonRaphsonEvaluateFPrime(
  state: NewtonRaphsonSessionState,
  userFPrime: number
): { state: NewtonRaphsonSessionState; feedback: NewtonRaphsonStepFeedback } {
  if (state.currentStep !== 'evaluate_fprime') {
    return {
      state,
      feedback: {
        isCorrect: false,
        message: 'Current step is not the derivative f\'(x_n) evaluation.',
      },
    };
  }

  const context = getNewtonRaphsonStepContext(state);
  const content = getNewtonEvaluateFPrimeContent(context);
  const expectedFPrime = context.f_prime_x;

  const isMatch = Math.abs(userFPrime - expectedFPrime) < NUMERICAL_TOLERANCE;

  if (isMatch) {
    const feedback: NewtonRaphsonStepFeedback = {
      isCorrect: true,
      message: `f'(x_${state.currentIterationIndex}) evaluated correctly.`,
      explanation: content.correctExplanation,
    };

    return {
      state: {
        ...state,
        currentStep: 'apply_formula',
        hintsRevealedForCurrentStep: 0,
        lastFeedback: feedback,
      },
      feedback,
    };
  }

  const mistakeDiag = content.diagnoseMistake ? content.diagnoseMistake(userFPrime) : null;
  const feedback: NewtonRaphsonStepFeedback = {
    isCorrect: false,
    message: mistakeDiag || content.defaultMistakeFeedback,
    mistakeDiagnostic: mistakeDiag || undefined,
  };

  return {
    state: {
      ...state,
      lastFeedback: feedback,
    },
    feedback,
  };
}

/**
 * Step 4: Process apply Newton-Raphson formula x_(n+1)
 */
export function processNewtonRaphsonApplyFormula(
  state: NewtonRaphsonSessionState,
  userXNext: number
): { state: NewtonRaphsonSessionState; feedback: NewtonRaphsonStepFeedback } {
  if (state.currentStep !== 'apply_formula') {
    return {
      state,
      feedback: {
        isCorrect: false,
        message: 'Current step is not the Newton formula application.',
      },
    };
  }

  const context = getNewtonRaphsonStepContext(state);
  const content = getNewtonApplyFormulaContent(context);
  const expectedXNext = context.x_next;

  const isMatch = Math.abs(userXNext - expectedXNext) < NUMERICAL_TOLERANCE;

  if (isMatch) {
    const feedback: NewtonRaphsonStepFeedback = {
      isCorrect: true,
      message: `Approximation x_${state.currentIterationIndex + 1} calculated correctly.`,
      explanation: content.correctExplanation,
    };

    return {
      state: {
        ...state,
        currentStep: 'check_stopping',
        hintsRevealedForCurrentStep: 0,
        lastFeedback: feedback,
      },
      feedback,
    };
  }

  const mistakeDiag = content.diagnoseMistake ? content.diagnoseMistake(userXNext) : null;
  const feedback: NewtonRaphsonStepFeedback = {
    isCorrect: false,
    message: mistakeDiag || content.defaultMistakeFeedback,
    mistakeDiagnostic: mistakeDiag || undefined,
  };

  return {
    state: {
      ...state,
      lastFeedback: feedback,
    },
    feedback,
  };
}

/**
 * Step 5: Process stopping condition check
 */
export function processNewtonRaphsonCheckStopping(
  state: NewtonRaphsonSessionState,
  userDecision: 'stop' | 'continue'
): { state: NewtonRaphsonSessionState; feedback: NewtonRaphsonStepFeedback } {
  if (state.currentStep !== 'check_stopping') {
    return {
      state,
      feedback: {
        isCorrect: false,
        message: 'Current step is not the stopping condition check.',
      },
    };
  }

  const context = getNewtonRaphsonStepContext(state);
  const iter = state.activeIteration!;
  const isStoppingMet = iter.is_stopping_met || state.currentIterationIndex === state.canonicalResult.iterations.length - 1;
  const content = getNewtonCheckStoppingContent(context, isStoppingMet);

  const expectedDecision = isStoppingMet ? 'stop' : 'continue';
  const isCorrect = userDecision.toLowerCase() === expectedDecision;

  if (isCorrect) {
    // Record completed iteration
    const roundedXNext = iter.formatted_x_next ? parseFloat(iter.formatted_x_next) : iter.x_next;
    const record = {
      iteration: state.currentIterationIndex + 1,
      x_n: iter.x_n,
      f_x: iter.f_x,
      f_prime_x: iter.f_prime_x,
      x_next: roundedXNext,
      hintsUsedForIteration: state.hintsRevealedForCurrentStep,
    };

    if (isStoppingMet) {
      const feedback: NewtonRaphsonStepFeedback = {
        isCorrect: true,
        message: `Stopping rule met: consecutive approximations agree!`,
        explanation: content.correctExplanation,
      };

      return {
        state: {
          ...state,
          currentStep: 'completed',
          isComplete: true,
          completedIterations: [...state.completedIterations, record],
          hintsRevealedForCurrentStep: 0,
          lastFeedback: feedback,
        },
        feedback,
      };
    } else {
      const nextIndex = state.currentIterationIndex + 1;
      const nextIter = state.canonicalResult.iterations[nextIndex];

      const feedback: NewtonRaphsonStepFeedback = {
        isCorrect: true,
        message: `Moving to Iteration ${nextIndex + 1}.`,
        explanation: content.correctExplanation,
      };

      return {
        state: {
          ...state,
          currentIterationIndex: nextIndex,
          activeIteration: nextIter,
          currentStep: 'evaluate_fx',
          completedIterations: [...state.completedIterations, record],
          hintsRevealedForCurrentStep: 0,
          lastFeedback: feedback,
        },
        feedback,
      };
    }
  }

  const mistakeDiag = content.diagnoseMistake ? content.diagnoseMistake(userDecision) : null;
  const feedback: NewtonRaphsonStepFeedback = {
    isCorrect: false,
    message: mistakeDiag || content.defaultMistakeFeedback,
    mistakeDiagnostic: mistakeDiag || undefined,
  };

  return {
    state: {
      ...state,
      lastFeedback: feedback,
    },
    feedback,
  };
}
