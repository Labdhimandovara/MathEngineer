/**
 * Assessment, Quiz & Timed Practice Domain Types (Phase 10)
 * 
 * Defines typed models for:
 * - AssessmentSession: immutable session snapshot
 * - AssessmentAnswer: answer recording with assistance tracking
 * - AssessmentResult: descriptive, verifiable outcome metrics
 * - QuizType & QuizPresetConfig: centralized quiz configurations
 */

import { MethodId } from '../progress/progressTypes.ts';
import { MistakeCategory } from '../../types/learning.ts';
import { QuestionDifficulty } from '../../data/practiceQuestions.ts';

export type QuizType = 'method' | 'mixed' | 'quick' | 'standard' | 'timed';

export type AssessmentSessionStatus = 'not-started' | 'active' | 'completed' | 'abandoned';

export interface AssessmentAnswer {
  questionId: string;
  submittedAnswer?: number | string;
  isAnswered: boolean;
  correct?: boolean;
  submittedAt?: string; // ISO 8601
  timeSpentSeconds: number;
  hintsUsed: number;
  solutionViewed: boolean;
  isAssisted: boolean; // true if hintsUsed > 0 or solutionViewed === true
  mistakeCategories?: MistakeCategory[];
}

export interface AssessmentResult {
  totalQuestions: number;
  attemptedCount: number;
  correctCount: number;
  unassistedCorrectCount: number;
  assistedCorrectCount: number;
  incorrectCount: number;
  unansweredCount: number;
  accuracy: number; // 0 - 100 percentage
  unassistedAccuracy: number; // 0 - 100 percentage based on total questions
  totalTimeSeconds: number;
  averageTimePerQuestion: number;
  totalHintsUsed: number;
  solutionsViewedCount: number;
  timedOut: boolean;
}

export interface AssessmentSession {
  id: string;
  type: QuizType;
  method?: MethodId | 'mixed';
  title: string;
  startedAt: string; // ISO 8601
  completedAt?: string; // ISO 8601
  timeLimitSeconds?: number;
  questionIds: string[];
  currentIndex: number;
  flaggedQuestionIds: string[];
  answers: Record<string, AssessmentAnswer>;
  results?: AssessmentResult;
  status: AssessmentSessionStatus;
}

export interface QuizPresetConfig {
  id: string;
  type: QuizType;
  title: string;
  subtitle: string;
  method?: MethodId | 'mixed';
  questionCount: number;
  timeLimitSeconds?: number;
  difficulty?: QuestionDifficulty | 'mixed';
}
