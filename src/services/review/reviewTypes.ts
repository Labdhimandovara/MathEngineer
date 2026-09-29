/**
 * Review & Reinforcement Domain Types for MathEngineer (Phase 9)
 * 
 * Defines typed contracts for:
 * - GroupedReviewQuestion: unified, grouped attempt history per distinct problem
 * - Filtering and sorting options (status, method, source, sort)
 * - Mistake diagnosis advice
 */

import { LearningAttempt, MistakeCategory } from '../../types/learning.ts';
import { MethodId } from '../progress/progressTypes.ts';

export type ReviewFilterStatus = 'all' | 'incorrect' | 'correct' | 'needs-review' | 'recent';

export type ReviewFilterMethod = 'all' | 'bisection' | 'false-position' | 'newton-raphson';

export type ReviewFilterSource = 'all' | 'practice' | 'assessment' | 'image';

export type ReviewSortOption = 'recent' | 'attempts' | 'needs-review';

export interface MistakeAdviceEntry {
  category: MistakeCategory;
  categoryLabel: string;
  advice: string;
}

export interface GroupedReviewQuestion {
  questionId: string;
  title: string;
  equation: string;
  equationDisplay: string;
  method: MethodId | 'mixed';
  source: 'practice' | 'assessment' | 'image' | 'review' | 'solve-manual';
  lowerBound: number | null;
  upperBound: number | null;
  boundsSource?: 'supplied' | 'discovered' | 'manual' | 'missing';
  initialGuess?: number | null;
  decimalPlaces: number;
  rawExtractedText?: string;
  imageThumbnailUrl?: string;

  // History and aggregated metrics
  totalAttempts: number;
  latestAttempt: LearningAttempt;
  allAttempts: LearningAttempt[]; // sorted newest first
  hasCorrectAttempt: boolean;
  latestIsCorrect: boolean;
  needsReview: boolean;
  solutionViewed: boolean;
  totalHintsUsed: number;
  lastAttemptedAt: string; // ISO 8601

  // Diagnosed mistakes and advice
  mistakes: MistakeCategory[];
  mistakeAdvice: MistakeAdviceEntry[];
}
