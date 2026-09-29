/**
 * Learning Loop & Progress Intelligence Data Models for MathEngineer
 * 
 * Defines typed structures for:
 * - LearningAttempt: granular, session-level attempt records
 * - MistakeCategory: observable, verifiable error classifications
 * - TopicLearningState: explainable mastery progressions
 * - MethodPerformance & TopicPerformance: deterministic learning metrics
 * - WeakTopicSignal & PracticeRecommendation: conservative, actionable guidance
 */

import { MethodId } from '../services/progress/progressTypes.ts';

export type AttemptStatus = 'started' | 'completed' | 'abandoned';

export type MistakeCategory =
  | 'wrong-bracket'
  | 'wrong-formula'
  | 'wrong-function-evaluation'
  | 'wrong-interval-selection'
  | 'arithmetic-error'
  | 'rounding-error'
  | 'wrong-initial-guess'
  | 'derivative-error'
  | 'stopping-condition-error'
  | 'unknown';

export interface LearningAttempt {
  id: string;
  questionId: string;
  method: MethodId | 'mixed';
  topic: string;
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  status: AttemptStatus;
  /**
   * Optional while status === 'started'. Present when completed.
   */
  correct?: boolean;
  attemptNumber: number; // 1 for first attempt, 2 for first retry, etc.
  hintsUsed: number;
  solutionViewed: boolean;
  mistakeCategories: MistakeCategory[];
  finalAnswer?: string | number;
  expectedAnswer?: string | number;
  decimalPlaces?: number;
  durationSeconds: number;

  // Phase 9 & 10: Replay, assessment and review parameters for exact problem reconstruction
  source?: 'practice' | 'assessment' | 'image' | 'review' | 'solve-manual';
  rawExtractedText?: string;
  equation?: string;
  lowerBound?: number | null;
  upperBound?: number | null;
  boundsSource?: 'supplied' | 'discovered' | 'manual' | 'missing';
  initialGuess?: number | null;
  imageThumbnailUrl?: string;
}

export type TopicLearningState =
  | 'not-started'
  | 'practicing'
  | 'developing'
  | 'consistent';

export interface MethodPerformance {
  method: MethodId | 'mixed';
  questionsAttempted: number;
  questionsCompleted: number;
  correctCount: number;
  incorrectCount: number;
  accuracy: number; // 0 - 100 percentage
  avgAttemptsPerQuestion: number;
  avgHintsUsed: number;
  solutionViewRate: number; // 0 - 100 percentage
  avgDurationSeconds: number;
  learningState: TopicLearningState;
  topMistakes: { category: MistakeCategory; count: number }[];
}

export interface TopicPerformance extends MethodPerformance {
  topic: string;
}

export interface WeakTopicSignal {
  method: MethodId | 'mixed';
  topic: string;
  reasons: string[];
  severity: 'review-recommended' | 'needs-attention';
}

export interface PracticeRecommendation {
  questionId: string;
  title: string;
  method: MethodId | 'mixed';
  difficulty: 'basic' | 'intermediate' | 'advanced';
  equation: string;
  reason: string;
  action: 'practice' | 'retry' | 'review';
}
