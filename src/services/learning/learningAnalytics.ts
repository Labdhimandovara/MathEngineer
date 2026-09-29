/**
 * Deterministic Learning Analytics Engine for MathEngineer
 * 
 * Provides pure, explainable calculations for:
 * - Method & Topic Performance aggregation
 * - Learning State progression (not-started -> practicing -> developing -> consistent)
 * - Conservative Weak Topic Detection
 * - Mistake pattern analysis
 * 
 * Zero external AI dependencies. 100% testable and deterministic.
 */

import {
  LearningAttempt,
  MethodPerformance,
  TopicPerformance,
  TopicLearningState,
  WeakTopicSignal,
  MistakeCategory,
} from '../../types/learning.ts';
import { MethodId } from '../progress/progressTypes.ts';

export const METHOD_IDS: MethodId[] = ['bisection', 'false-position', 'newton-raphson'];

export function getMethodDisplayName(method: MethodId | 'mixed'): string {
  switch (method) {
    case 'bisection':
      return 'Bisection Method';
    case 'false-position':
      return 'False Position Method';
    case 'newton-raphson':
      return 'Newton-Raphson Method';
    case 'mixed':
      return 'Mixed Numerical Methods';
  }
}

export function formatMistakeLabel(category: MistakeCategory): string {
  switch (category) {
    case 'wrong-bracket':
      return 'Bracketing Error (f(a)·f(b) >= 0)';
    case 'wrong-formula':
      return 'Formula Application Error';
    case 'wrong-function-evaluation':
      return 'Function Evaluation f(x) Error';
    case 'wrong-interval-selection':
      return 'Subinterval Sign Update Error';
    case 'arithmetic-error':
      return 'Arithmetic or Algebraic Error';
    case 'rounding-error':
      return 'Decimal Rounding Precision Error';
    case 'wrong-initial-guess':
      return 'Initial Guess x0 Selection Error';
    case 'derivative-error':
      return 'Derivative Evaluation f\'(x) Error';
    case 'stopping-condition-error':
      return 'Premature / Incorrect Stopping Check';
    case 'unknown':
      return 'Unclassified Calculation Error';
  }
}

/**
 * Aggregates mistakes from a list of attempts sorted by frequency
 */
export function aggregateMistakes(
  attempts: LearningAttempt[]
): { category: MistakeCategory; count: number }[] {
  const counts: Partial<Record<MistakeCategory, number>> = {};
  for (const a of attempts) {
    for (const m of a.mistakeCategories) {
      counts[m] = (counts[m] || 0) + 1;
    }
  }

  const entries = Object.entries(counts) as [MistakeCategory, number][];
  entries.sort((a, b) => b[1] - a[1]);
  return entries.map(([category, count]) => ({ category, count }));
}

/**
 * Calculates the explainable learning state for a specific method
 * 
 * Rules:
 * - 'not-started': 0 completed attempts
 * - 'practicing': 1-2 completed attempts, or lower recent accuracy
 * - 'developing': >= 3 completed attempts with moderate accuracy (40% - 75%)
 * - 'consistent': >= 3 completed attempts with high recent accuracy (> 75%) and low hint reliance
 * 
 * Note: solutionViewed is descriptive evidence only, NOT a blocker for 'consistent'.
 */
export function calculateTopicState(
  attempts: LearningAttempt[],
  method: MethodId | 'mixed'
): TopicLearningState {
  const methodAttempts = attempts.filter(
    (a) => a.method === method && a.status === 'completed'
  );

  if (methodAttempts.length === 0) {
    return 'not-started';
  }

  if (methodAttempts.length === 1) {
    return 'practicing';
  }

  // Look at recent 3 to 5 completed attempts
  const recent = methodAttempts.slice(-5);
  const correctCount = recent.filter((a) => a.correct === true).length;
  const recentAccuracy = correctCount / recent.length;
  const recentHintsAvg =
    recent.reduce((sum, a) => sum + (a.hintsUsed || 0), 0) / recent.length;

  if (methodAttempts.length >= 3 && recentAccuracy >= 0.75 && recentHintsAvg <= 1.5) {
    return 'consistent';
  }

  if (recentAccuracy >= 0.5 || correctCount >= 1) {
    return 'developing';
  }

  return 'practicing';
}

/**
 * Calculates complete performance metrics for a specific method
 */
export function calculateMethodPerformance(
  attempts: LearningAttempt[],
  method: MethodId | 'mixed'
): MethodPerformance {
  const methodAttempts = attempts.filter((a) => a.method === method);
  const completed = methodAttempts.filter((a) => a.status === 'completed');

  const uniqueQuestions = new Set(methodAttempts.map((a) => a.questionId));
  const correctCount = completed.filter((a) => a.correct === true).length;
  const incorrectCount = completed.filter((a) => a.correct === false).length;

  const totalEvaluated = correctCount + incorrectCount;
  const accuracy =
    totalEvaluated > 0 ? Math.round((correctCount / totalEvaluated) * 100) : 0;

  const avgAttemptsPerQuestion =
    uniqueQuestions.size > 0
      ? parseFloat((completed.length / uniqueQuestions.size).toFixed(1))
      : 0;

  const totalHints = completed.reduce((sum, a) => sum + (a.hintsUsed || 0), 0);
  const avgHintsUsed =
    completed.length > 0 ? parseFloat((totalHints / completed.length).toFixed(1)) : 0;

  const solutionViewCount = completed.filter((a) => a.solutionViewed).length;
  const solutionViewRate =
    completed.length > 0
      ? Math.round((solutionViewCount / completed.length) * 100)
      : 0;

  const totalDuration = completed.reduce((sum, a) => sum + (a.durationSeconds || 0), 0);
  const avgDurationSeconds =
    completed.length > 0 ? Math.round(totalDuration / completed.length) : 0;

  const learningState = calculateTopicState(attempts, method);
  const topMistakes = aggregateMistakes(completed);

  return {
    method,
    questionsAttempted: uniqueQuestions.size,
    questionsCompleted: completed.length,
    correctCount,
    incorrectCount,
    accuracy,
    avgAttemptsPerQuestion,
    avgHintsUsed,
    solutionViewRate,
    avgDurationSeconds,
    learningState,
    topMistakes,
  };
}

/**
 * Aggregates performance across all standard syllabus methods
 */
export function aggregateAllMethods(
  attempts: LearningAttempt[]
): Record<MethodId, MethodPerformance> {
  const result: Partial<Record<MethodId, MethodPerformance>> = {};
  for (const m of METHOD_IDS) {
    result[m] = calculateMethodPerformance(attempts, m);
  }
  return result as Record<MethodId, MethodPerformance>;
}

/**
 * Conservative evidence-based weak-topic detection
 * 
 * Rules:
 * - Requires at least 2 completed attempts for that method.
 * - MUST have either:
 *   1. Low recent accuracy (< 50% in last attempts)
 *   OR
 *   2. Repeated same mistake category (>= 2 occurrences of that mistake)
 * - High hint usage (>= 2 avg hints) serves as supporting evidence only, never as sole trigger.
 */
export function detectWeakTopics(attempts: LearningAttempt[]): WeakTopicSignal[] {
  const signals: WeakTopicSignal[] = [];

  for (const method of METHOD_IDS) {
    const methodAttempts = attempts.filter(
      (a) => a.method === method && a.status === 'completed'
    );

    // Conservative guard: Require at least 2 completed attempts
    if (methodAttempts.length < 2) {
      continue;
    }

    const recent = methodAttempts.slice(-4);
    const correctCount = recent.filter((a) => a.correct === true).length;
    const recentAccuracy = correctCount / recent.length;

    const mistakes = aggregateMistakes(methodAttempts);
    const repeatedMistake = mistakes.find((m) => m.count >= 2);

    const hasLowAccuracy = recentAccuracy < 0.5;
    const hasRepeatedMistake = repeatedMistake !== undefined;

    // Must satisfy either low recent accuracy OR repeated same mistake
    if (hasLowAccuracy || hasRepeatedMistake) {
      const reasons: string[] = [];

      if (hasLowAccuracy) {
        reasons.push(
          `Recent practice accuracy is ${Math.round(recentAccuracy * 100)}% across your last ${recent.length} attempts.`
        );
      }

      if (repeatedMistake) {
        reasons.push(
          `Repeated occurrences of ${formatMistakeLabel(repeatedMistake.category)} (${repeatedMistake.category}) (${repeatedMistake.count} times).`
        );
      }

      // Supporting hint evidence
      const hintsTotal = recent.reduce((sum, a) => sum + (a.hintsUsed || 0), 0);
      const avgHints = hintsTotal / recent.length;
      if (avgHints >= 2) {
        reasons.push(
          `Frequent reliance on hints (averaging ${avgHints.toFixed(1)} hints per problem).`
        );
      }

      signals.push({
        method,
        topic: getMethodDisplayName(method),
        reasons,
        severity: hasLowAccuracy && hasRepeatedMistake ? 'needs-attention' : 'review-recommended',
      });
    }
  }

  return signals;
}
