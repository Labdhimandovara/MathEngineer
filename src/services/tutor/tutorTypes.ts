/**
 * AI Tutor Domain Types (Phase 13)
 * 
 * Defines typed structures for:
 * - LanguageMode ('english' | 'hinglish')
 * - TutorIntent (deterministic query classification)
 * - TutorContext (comprehensive educational context)
 * - TutorRequest & TutorResponse
 */

import { MethodId } from '../progress/progressTypes.ts';
import { MistakeCategory } from '../../types/learning.ts';
import { VerifiedSolverData } from '../problem/deterministicSolverAdapter.ts';
import { KnowledgeChunk } from '../../types/knowledge.ts';
import { AdaptiveTopicState, LearningFocus, WeakTopicSignal } from '../adaptive/adaptiveTypes.ts';

export type LanguageMode = 'english' | 'hinglish';

export type TutorResponseStatus =
  | 'success'
  | 'clarification'
  | 'assessment-blocked';

export type TutorAnswerSource =
  | 'deterministic'
  | 'local'
  | 'course'
  | 'gemini'
  | 'fallback'
  | 'clarification';

export type TutorIntent =
  | 'GENERAL_HELP'
  | 'EXPLAIN_CONCEPT'
  | 'EXPLAIN_STEP'
  | 'WHY_WRONG'
  | 'GIVE_HINT'
  | 'CHECK_MY_WORK'
  | 'SHOW_SOLUTION'
  | 'EXPLAIN_SOLUTION'
  | 'COMPARE_METHODS'
  | 'COURSE_QUESTION'
  | 'PRACTICE_RECOMMENDATION'
  | 'IMAGE_PROBLEM_HELP'
  | 'CALCULATION'
  | 'FORMULA'
  | 'RETRY';

export interface TutorActiveProblem {
  questionId?: string;
  source?: 'image' | 'practice' | 'solve-manual' | 'review' | 'assessment' | 'learn';
  title?: string;
  equation?: string;
  method?: MethodId | string;
  lowerBound?: number | null;
  upperBound?: number | null;
  boundsSource?: 'supplied' | 'discovered' | 'manual' | 'missing';
  decimalPlaces?: number;
  initialGuess?: number | null;
  currentStep?: string;
  currentIteration?: number;
  studentAnswer?: string | number;
  lastError?: string;
  mistakeCategories?: MistakeCategory[];
  hintsUsed?: number;
  solutionViewed?: boolean;
  attemptNumber?: number;
  bracketDiscovery?: {
    a: number;
    b: number;
    fa: number;
    fb: number;
    explanation?: string[];
  };
  verifiedSolverOutput?: VerifiedSolverData;
}

export interface TutorLearningContext {
  topicState?: AdaptiveTopicState;
  currentFocus?: LearningFocus;
  weakTopics?: WeakTopicSignal[];
  recentMistakes?: { category: MistakeCategory; count: number }[];
}

export interface TutorCourseContext {
  chunks: KnowledgeChunk[];
  citations: string[];
  negativeKnowledgeNote?: string;
  methodFocus?: 'bisection' | 'false-position' | 'newton-raphson';
}

export interface TutorInteractionContext {
  currentPage: string;
  isAssessmentActive?: boolean;
  tutorMode?: TutorIntent;
}

export interface TutorContext {
  activeProblem?: TutorActiveProblem;
  solverState?: VerifiedSolverData;
  learningContext?: TutorLearningContext;
  courseContext?: TutorCourseContext;
  interactionContext: TutorInteractionContext;
  languageMode: LanguageMode;
  responseMode: 'text' | 'voice';
}

export interface TutorRequest {
  query: string;
  context?: TutorContext;
  languageMode?: LanguageMode;
  responseMode?: 'text' | 'voice';
  currentPage?: string;
  isAssessmentActive?: boolean;
  activeProblemOverride?: Partial<TutorActiveProblem>;
  imageFile?: File;
  conversationHistory?: any[];
}

export interface TutorResponse {
  // Phase 13.4 Normalized Architecture
  status: TutorResponseStatus;
  answer: string;
  source: TutorAnswerSource;
  language: LanguageMode;
  questionId?: string;
  citations?: string[];
  actions?: string[];

  // Backwards-Compatible Aliases & Existing Properties
  success: boolean;
  reply: string;
  speechText?: string;
  intent: TutorIntent;
  languageMode: LanguageMode;
  groundedInMethod?: string;
  groundedInProblem?: string;
  groundedEquation?: string;
  groundedSource?: string;
  isSolverGrounded: boolean;
  solverVerified: boolean;
  isAssessmentBlocked?: boolean;
  provider?: string;
  quickActions?: string[];
  isLocalAnswer?: boolean;
  error?: string;
  retryable?: boolean;
}
