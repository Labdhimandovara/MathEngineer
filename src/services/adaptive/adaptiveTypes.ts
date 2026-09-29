/**
 * Adaptive Learning & Deterministic Personalization Domain Types (Phase 11)
 * 
 * Defines pure, observable data models for:
 * - AdaptiveState & AdaptiveTopicState
 * - WeakTopicSignal & TopicStrength
 * - LearningFocus & AdaptiveRecommendation
 * - SessionPlan ("Today's Focus")
 * - AssessmentRecommendation ("What to work on next")
 * 
 * Zero AI black-box scores. Every state and recommendation is explainable
 * from observable student interaction history.
 */

import { MethodId } from '../progress/progressTypes.ts';
import { MistakeCategory } from '../../types/learning.ts';
import { QuestionDifficulty } from '../../data/practiceQuestions.ts';

export type AdaptiveState =
  | 'not-started'
  | 'introduced'
  | 'practicing'
  | 'developing'
  | 'consistent'
  | 'needs-review';

export interface AdaptiveTopicState {
  method: MethodId;
  topic: string;
  state: AdaptiveState;
  totalAttempts: number;
  completedAttempts: number;
  recentAccuracy: number; // 0 - 100 percentage
  weightedAccuracy: number; // 0 - 100 percentage with recency weighting
  unassistedAccuracy: number; // 0 - 100 percentage unassisted
  assessmentAccuracy: number; // 0 - 100 percentage from formal quizzes
  assessmentAttemptCount: number;
  avgHints: number;
  solutionViewCount: number;
  recentMistakes: { category: MistakeCategory; count: number }[];
  lastPracticedAt?: string; // ISO 8601
  evidenceSummary: string[];
}

export interface WeakTopicSignal {
  method: MethodId;
  topic: string;
  severity: 'needs-review' | 'needs-attention';
  reasons: string[];
  supportingQuestionIds: string[];
}

export interface TopicStrength {
  method: MethodId;
  topic: string;
  description: string;
  evidence: string[];
}

export interface LearningFocus {
  method: MethodId | 'mixed';
  topic: string;
  title: string;
  reason: string;
  evidence: string[];
  suggestedAction: 'practice' | 'review' | 'quiz';
  targetQuestionId?: string;
}

export type RecommendationType =
  | 'remediation'
  | 'retry'
  | 'mistake-pattern'
  | 'variety'
  | 'progression'
  | 'mixed';

export interface AdaptiveRecommendation {
  id: string;
  questionId: string;
  method: MethodId | 'mixed';
  type: RecommendationType;
  title: string;
  difficulty: QuestionDifficulty | 'mixed';
  equation: string;
  reason: string;
  evidence: string[];
  priority: number; // Lower number = higher priority
  action: 'practice' | 'review' | 'retry';
}

export interface SessionPlanStep {
  stepNumber: number;
  title: string;
  type: 'review' | 'practice' | 'assessment' | 'challenge';
  description: string;
  questionId?: string;
  method?: MethodId | 'mixed';
  completed: boolean;
}

export interface SessionPlan {
  generatedAt: string;
  focusMethod?: MethodId | 'mixed';
  summary: string;
  steps: SessionPlanStep[];
}

export interface AssessmentRecommendation {
  method: MethodId | 'mixed';
  title: string;
  reason: string;
  actionText: string;
  targetQuestionId?: string;
  targetPage: 'practice' | 'review' | 'learn' | 'quiz';
}
