/**
 * Explainable Recency & Weighting Model for MathEngineer (Phase 11)
 * 
 * Provides deterministic, mathematical weighting for recent attempts.
 * Recent problem solving matters more than historical attempts from days ago,
 * while preventing single bad questions from dominating the overall record.
 * 
 * Weight Table for the last 5 completed attempts (newest to oldest):
 * - Attempt 0 (Most Recent): weight = 1.00
 * - Attempt 1 (1 prior):     weight = 0.80
 * - Attempt 2 (2 prior):     weight = 0.65
 * - Attempt 3 (3 prior):     weight = 0.50
 * - Attempt 4 (4 prior):     weight = 0.35
 */

import { LearningAttempt } from '../../types/learning.ts';

export const RECENCY_WEIGHTS = [1.00, 0.80, 0.65, 0.50, 0.35] as const;

export interface RecencyMetrics {
  totalConsidered: number;
  weightedAccuracy: number; // 0 - 100 percentage
  unweightedAccuracy: number; // 0 - 100 percentage
  weightedUnassistedAccuracy: number; // 0 - 100 percentage
  avgHintsUsed: number;
  recentMistakeCount: number;
  newestAttempt?: LearningAttempt;
}

/**
 * Calculates deterministic recency-weighted accuracy and assistance metrics
 * from a list of attempts (sorted chronological or arbitrary; this function
 * isolates completed attempts and treats the latest in time as newest).
 */
export function calculateRecencyMetrics(attempts: LearningAttempt[]): RecencyMetrics {
  const completed = attempts
    .filter((a) => a.status === 'completed' && a.correct !== undefined)
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());

  if (completed.length === 0) {
    return {
      totalConsidered: 0,
      weightedAccuracy: 0,
      unweightedAccuracy: 0,
      weightedUnassistedAccuracy: 0,
      avgHintsUsed: 0,
      recentMistakeCount: 0,
    };
  }

  // Take the most recent 5 completed attempts (newest first)
  const recentSlice = completed.slice(-5).reverse();
  let weightSum = 0;
  let weightedCorrectSum = 0;
  let weightedUnassistedCorrectSum = 0;
  let rawCorrectCount = 0;
  let totalHints = 0;
  let mistakeCount = 0;

  for (let i = 0; i < recentSlice.length; i++) {
    const att = recentSlice[i];
    const weight = RECENCY_WEIGHTS[i] ?? 0.35;
    weightSum += weight;

    const isCorrect = att.correct === true;
    const isUnassisted = isCorrect && (att.hintsUsed || 0) === 0 && !att.solutionViewed;

    if (isCorrect) {
      weightedCorrectSum += weight;
      rawCorrectCount += 1;
    }

    if (isUnassisted) {
      weightedUnassistedCorrectSum += weight;
    }

    totalHints += att.hintsUsed || 0;
    mistakeCount += (att.mistakeCategories || []).length;
  }

  const weightedAccuracy = weightSum > 0 ? Math.round((weightedCorrectSum / weightSum) * 100) : 0;
  const unweightedAccuracy = Math.round((rawCorrectCount / recentSlice.length) * 100);
  const weightedUnassistedAccuracy =
    weightSum > 0 ? Math.round((weightedUnassistedCorrectSum / weightSum) * 100) : 0;
  const avgHintsUsed = parseFloat((totalHints / recentSlice.length).toFixed(1));

  return {
    totalConsidered: recentSlice.length,
    weightedAccuracy,
    unweightedAccuracy,
    weightedUnassistedAccuracy,
    avgHintsUsed,
    recentMistakeCount: mistakeCount,
    newestAttempt: recentSlice[0],
  };
}
