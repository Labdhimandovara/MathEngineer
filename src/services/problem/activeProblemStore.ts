/**
 * Active Problem Store & Precedence Engine
 * 
 * Manages the single normalized source of truth for the active problem across MathEngineer.
 * Enforces strict assistant context precedence:
 *   1. Active Image Problem (Highest Priority: wins over Learn, Practice, or defaults)
 *   2. Active Practice / Solve Problem
 *   3. Active Review Problem
 *   4. Active Quiz / Assessment Context
 *   5. Active Learn Lesson
 *   6. Generic Assistant Context
 * 
 * Guarantees that an extracted image problem (e.g. False Position fourth root of 32)
 * is NEVER masked or misidentified as Bisection.
 * Prevents context drift between Solve, Tutor, Review, and Practice.
 */

import { useState, useEffect } from 'react';
import { SupportedMethod, BoundsSource } from '../problemImage/problemImageTypes.ts';
import { AssistantSolverContext } from '../assistant/types.ts';
import { PageId } from '../../types/index.ts';
import {
  runDeterministicSolver,
  VerifiedSolverData,
} from './deterministicSolverAdapter.ts';
import { getActiveSession } from '../assessment/assessmentStore.ts';

export interface NormalizedActiveProblem {
  questionId: string;
  source: 'image' | 'practice' | 'solve-manual' | 'learn' | 'review' | 'quiz';
  title?: string;
  equation: string;
  normalizedEquation?: string;
  method: 'bisection' | 'false-position' | 'newton-raphson';
  lowerBound?: number | null;
  upperBound?: number | null;
  boundsSource?: BoundsSource;
  decimalPlaces: number;
  initialGuess?: number | null;
  imageProblemId?: string;
  rawExtractedText?: string;
  imageThumbnailUrl?: string;
  bracketDiscovery?: {
    a: number;
    b: number;
    fa: number;
    fb: number;
    explanation?: string[];
  };
  verifiedSolverOutput?: VerifiedSolverData;
  attemptId?: string | null;
  attemptNumber?: number;
  discoveredExplanation?: string[];
}

export type ActiveProblemState = NormalizedActiveProblem;

// Central single source of truth
let activeProblem: NormalizedActiveProblem | null = null;

// Individual fallback slots to support precedence and clean fallback
let activeImageProblem: NormalizedActiveProblem | null = null;
let activePracticeProblem: NormalizedActiveProblem | null = null;
let activeReviewProblem: NormalizedActiveProblem | null = null;
let activeLearnLesson: 'bisection' | 'false-position' | 'newton-raphson' | null = null;

const listeners = new Set<() => void>();

function notify(): void {
  for (const l of listeners) {
    try {
      l();
    } catch (err) {
      console.error('Error in activeProblemStore listener:', err);
    }
  }
}

/**
 * Ensures deterministic solver output is precalculated for a problem
 */
function ensureSolverOutput(problem: NormalizedActiveProblem): NormalizedActiveProblem {
  if (!problem.verifiedSolverOutput && problem.equation && problem.method) {
    const solverData = runDeterministicSolver({
      method: problem.method,
      equation: problem.equation,
      lowerBound: problem.lowerBound,
      upperBound: problem.upperBound,
      initialGuess: problem.initialGuess,
      decimalPlaces: problem.decimalPlaces || 3,
      questionId: problem.questionId,
    });

    const lowerBound =
      problem.lowerBound !== undefined && problem.lowerBound !== null
        ? problem.lowerBound
        : solverData.bracketDiscovery?.a;
    const upperBound =
      problem.upperBound !== undefined && problem.upperBound !== null
        ? problem.upperBound
        : solverData.bracketDiscovery?.b;
    const boundsSource =
      problem.boundsSource ||
      (solverData.bracketDiscovery ? 'discovered' : 'supplied');

    return {
      ...problem,
      lowerBound,
      upperBound,
      boundsSource,
      bracketDiscovery: problem.bracketDiscovery || solverData.bracketDiscovery,
      verifiedSolverOutput: solverData,
    };
  }
  return problem;
}

/**
 * Sets the active problem as the single authoritative source of truth
 * Replaces any stale problem to guarantee 100% synchronization across Solve, Tutor, Review, and Practice.
 */
export function setActiveProblem(problem: NormalizedActiveProblem | null): void {
  if (!problem) {
    activeProblem = null;
    activeImageProblem = null;
    activePracticeProblem = null;
    activeReviewProblem = null;
    notify();
    return;
  }

  const enriched = ensureSolverOutput(problem);
  activeProblem = enriched;

  if (enriched.source === 'image') {
    activeImageProblem = enriched;
  } else if (enriched.source === 'practice' || enriched.source === 'solve-manual') {
    activePracticeProblem = enriched;
    // Explicitly opening a practice problem clears any stale image problem
    activeImageProblem = null;
    activeReviewProblem = null;
  } else if (enriched.source === 'review') {
    activeReviewProblem = enriched;
    activeImageProblem = null;
  }

  notify();
}

/**
 * Sets the active image problem and precomputes the verified deterministic solver output
 */
export function setActiveImageProblem(problem: ActiveProblemState): void {
  setActiveProblem({
    ...problem,
    source: 'image',
  });
}

/**
 * Updates the solver result for the active image or active problem
 */
export function updateActiveImageSolverResult(verifiedSolverOutput: VerifiedSolverData): void {
  if (activeProblem) {
    activeProblem = {
      ...activeProblem,
      verifiedSolverOutput,
    };
  }
  if (activeImageProblem) {
    activeImageProblem = {
      ...activeImageProblem,
      verifiedSolverOutput,
    };
  }
  notify();
}

/**
 * Clears the active image problem, restoring lower-precedence contexts if present
 */
export function clearActiveImageProblem(): void {
  activeImageProblem = null;
  if (activeProblem?.source === 'image') {
    activeProblem = activePracticeProblem || activeReviewProblem || null;
  }
  notify();
}

/**
 * Sets the active practice problem
 */
export function setActivePracticeProblem(problem: ActiveProblemState): void {
  setActiveProblem({
    ...problem,
    source: 'practice',
  });
}

/**
 * Clears the active practice problem
 */
export function clearActivePracticeProblem(): void {
  activePracticeProblem = null;
  if (activeProblem?.source === 'practice') {
    activeProblem = activeImageProblem || activeReviewProblem || null;
  }
  notify();
}

/**
 * Sets the active review problem
 */
export function setActiveReviewProblem(problem: ActiveProblemState): void {
  setActiveProblem({
    ...problem,
    source: problem.source || 'review',
  });
}

/**
 * Clears the active review problem
 */
export function clearActiveReviewProblem(): void {
  activeReviewProblem = null;
  if (activeProblem?.source === 'review') {
    activeProblem = activeImageProblem || activePracticeProblem || null;
  }
  notify();
}

/**
 * Clears the current active problem completely
 */
export function clearActiveProblem(): void {
  setActiveProblem(null);
}

/**
 * Sets the active learn lesson
 */
export function setActiveLearnLesson(
  lesson: 'bisection' | 'false-position' | 'newton-raphson' | null
): void {
  activeLearnLesson = lesson;
  notify();
}

/**
 * Resets all active problem states (for test isolation)
 */
export function resetAllActiveProblems(): void {
  activeProblem = null;
  activeImageProblem = null;
  activePracticeProblem = null;
  activeReviewProblem = null;
  activeLearnLesson = null;
  notify();
}

/**
 * Gets the current active problem respecting priority:
 * 1. Current active problem (single source of truth)
 * 2. Image problem fallback
 * 3. Practice problem fallback
 * 4. Review problem fallback
 */
export function getActiveProblem(): NormalizedActiveProblem | null {
  if (activeImageProblem) return activeImageProblem;
  if (activePracticeProblem) return activePracticeProblem;
  if (activeReviewProblem) return activeReviewProblem;
  if (activeProblem) return activeProblem;
  return null;
}

/**
 * Resolves the authoritative AssistantSolverContext respecting strict precedence:
 *   1. Active Image Problem (Always wins)
 *   2. Active Practice / Solve Problem
 *   3. Active Review Problem
 *   4. Active Learn Lesson
 *   5. Generic Assistant Context
 */
export function getActiveAssistantContext(currentPage?: PageId): AssistantSolverContext {
  const activeQuiz = getActiveSession();
  const isAssessmentActive = currentPage === 'quiz' && activeQuiz !== null && activeQuiz.status === 'active';

  // 1. ACTIVE PROBLEM (Image, Practice, Review, or Manual)
  const p = getActiveProblem();
  if (p) {
    const hasBounds = p.lowerBound != null && p.upperBound != null;
    return {
      currentPage: currentPage || (p.source === 'review' ? 'review' : 'solve'),
      questionId: p.questionId,
      source: p.source as any,
      rawExtractedText: p.rawExtractedText,
      method: p.method,
      equation: p.equation,
      bounds: hasBounds ? [p.lowerBound!, p.upperBound!] : undefined,
      boundsSource: p.boundsSource,
      x0: p.initialGuess != null ? p.initialGuess : undefined,
      decimalPlaces: p.decimalPlaces,
      bracketDiscovery: p.bracketDiscovery,
      verifiedSolverOutput: p.verifiedSolverOutput,
      isAssessmentActive,
    };
  }

  // 2. ACTIVE LEARN LESSON
  if (currentPage === 'learn' || activeLearnLesson) {
    const lesson = activeLearnLesson || 'bisection';
    return {
      currentPage: currentPage || 'learn',
      method: lesson,
      currentLessonSection: `Unit-I: ${lesson}`,
      isAssessmentActive,
    };
  }

  // 3. GENERIC ASSISTANT CONTEXT (Neutral default)
  return {
    currentPage: currentPage || 'home',
    method: 'bisection',
    isAssessmentActive,
  };
}

/**
 * React hook for subscribing to the central active problem
 */
export function useActiveProblem(): NormalizedActiveProblem | null {
  const [problem, setProblem] = useState<NormalizedActiveProblem | null>(() => getActiveProblem());

  useEffect(() => {
    const update = () => setProblem(getActiveProblem());
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, []);

  return problem;
}

/**
 * React hook for subscribing to active assistant context changes
 */
export function useActiveAssistantContext(currentPage?: PageId): AssistantSolverContext {
  const [ctx, setCtx] = useState<AssistantSolverContext>(() =>
    getActiveAssistantContext(currentPage)
  );

  useEffect(() => {
    const update = () => setCtx(getActiveAssistantContext(currentPage));
    listeners.add(update);
    update();
    return () => {
      listeners.delete(update);
    };
  }, [currentPage]);

  return ctx;
}
