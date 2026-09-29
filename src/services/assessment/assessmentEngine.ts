/**
 * Assessment Engine for MathEngineer (Phase 10)
 * 
 * Provides deterministic quiz configurations, question selection,
 * numerical answer verification, assistance tracking, and scoring calculations.
 * 
 * Strict Guarantees:
 * - 0 Gemini API calls.
 * - Deterministic numerical validation matching verified engines.
 * - Authoritative timestamp-based timing.
 */

import { PRACTICE_QUESTIONS, PracticeQuestion } from '../../data/practiceQuestions.ts';
import { MethodId } from '../progress/progressTypes.ts';
import { MistakeCategory } from '../../types/learning.ts';
import {
  QuizType,
  QuizPresetConfig,
  AssessmentSession,
  AssessmentResult,
  AssessmentAnswer,
} from './assessmentTypes.ts';

export const PRESET_QUIZZES: QuizPresetConfig[] = [
  {
    id: 'quiz-quick-5',
    type: 'quick',
    title: 'Quick Assessment',
    subtitle: '5 diverse problems across all methods to test core root-finding mechanics.',
    method: 'mixed',
    questionCount: 5,
  },
  {
    id: 'quiz-method-bisection',
    type: 'method',
    title: 'Bisection Method Quiz',
    subtitle: '5 university-level problems focusing strictly on interval halving and bracketing.',
    method: 'bisection',
    questionCount: 5,
  },
  {
    id: 'quiz-method-false-position',
    type: 'method',
    title: 'False Position Method Quiz',
    subtitle: '5 problems covering chord intersections and linear interpolation convergence.',
    method: 'false-position',
    questionCount: 5,
  },
  {
    id: 'quiz-method-newton-raphson',
    type: 'method',
    title: 'Newton-Raphson Method Quiz',
    subtitle: '5 problems testing tangent iterations, initial guesses, and quadratic convergence.',
    method: 'newton-raphson',
    questionCount: 5,
  },
  {
    id: 'quiz-mixed-10',
    type: 'standard',
    title: 'Standard Examination (Mixed)',
    subtitle: '10 problems combining all numerical methods to simulate university midterm exams.',
    method: 'mixed',
    questionCount: 10,
  },
  {
    id: 'quiz-timed-5m',
    type: 'timed',
    title: 'Timed Sprint (5 mins)',
    subtitle: '5 problems under strict 5-minute countdown. Tests mental pace and precision.',
    method: 'mixed',
    questionCount: 5,
    timeLimitSeconds: 300,
  },
  {
    id: 'quiz-timed-10m',
    type: 'timed',
    title: 'Timed Exam Simulation (10 mins)',
    subtitle: '10 questions under a 10-minute timer. Tests exam endurance and speed.',
    method: 'mixed',
    questionCount: 10,
    timeLimitSeconds: 600,
  },
];

/**
 * Deterministic pseudo-random number generator (LCG) for reproducible question sets.
 */
function seededRandom(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Selects an immutable, non-duplicate list of verified PracticeQuestion records for a quiz.
 */
export function selectQuestionsForQuiz(
  type: QuizType,
  options?: {
    method?: MethodId | 'mixed';
    questionCount?: number;
    seed?: number;
  }
): PracticeQuestion[] {
  const method = options?.method ?? (type === 'method' ? 'bisection' : 'mixed');
  const count = options?.questionCount ?? (type === 'quick' ? 5 : type === 'standard' ? 10 : 5);

  // 1. Filter candidate questions from canonical PRACTICE_QUESTIONS
  let pool = PRACTICE_QUESTIONS.filter((q) => {
    if (method !== 'mixed' && q.method !== method) {
      return false;
    }
    return true;
  });

  if (pool.length === 0) {
    pool = [...PRACTICE_QUESTIONS];
  }

  // 2. Deterministic or stable shuffling
  const rnd = options?.seed !== undefined ? seededRandom(options.seed) : Math.random;
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // 3. Guarantee NO duplicates
  const seenIds = new Set<string>();
  const selected: PracticeQuestion[] = [];
  for (const q of shuffled) {
    if (!seenIds.has(q.id)) {
      seenIds.add(q.id);
      selected.push(q);
      if (selected.length >= count) {
        break;
      }
    }
  }

  // If pool had fewer unique questions than requested, fill without immediate duplicates if possible
  return selected;
}

/**
 * Deterministically verifies a student's answer against the target expected root.
 * 0 Gemini calls.
 */
export function verifyAssessmentAnswer(
  question: PracticeQuestion,
  rawAnswer: string | number
): {
  isCorrect: boolean;
  parsedAnswer?: number;
  mistakeCategory?: MistakeCategory;
} {
  const parsed = typeof rawAnswer === 'number' ? rawAnswer : parseFloat(String(rawAnswer).trim());

  if (isNaN(parsed)) {
    return {
      isCorrect: false,
      mistakeCategory: 'arithmetic-error',
    };
  }

  const tolerance = Math.pow(10, -question.decimalPlaces) * 1.5;
  const diff = Math.abs(parsed - question.expectedRoot);
  const isCorrect = diff <= tolerance;

  if (isCorrect) {
    return {
      isCorrect: true,
      parsedAnswer: parsed,
    };
  }

  // Classify deterministic mistake if incorrect
  let mistakeCategory: MistakeCategory = 'arithmetic-error';
  if (diff < Math.max(0.08, tolerance * 8)) {
    mistakeCategory = 'rounding-error';
  } else if (
    parsed < Math.min(question.bounds[0], question.bounds[1]) - 0.5 ||
    parsed > Math.max(question.bounds[0], question.bounds[1]) + 0.5
  ) {
    mistakeCategory = 'wrong-interval-selection';
  } else if (question.x0 !== undefined && Math.abs(parsed - question.x0) < 0.01) {
    mistakeCategory = 'wrong-initial-guess';
  }

  return {
    isCorrect: false,
    parsedAnswer: parsed,
    mistakeCategory,
  };
}

/**
 * Calculates authoritative, descriptive assessment results.
 */
export function calculateAssessmentResult(
  session: AssessmentSession,
  timedOut: boolean = false
): AssessmentResult {
  const totalQuestions = session.questionIds.length;
  let attemptedCount = 0;
  let correctCount = 0;
  let unassistedCorrectCount = 0;
  let assistedCorrectCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;
  let totalHintsUsed = 0;
  let solutionsViewedCount = 0;

  for (const qId of session.questionIds) {
    const ans = session.answers[qId];

    if (!ans || !ans.isAnswered) {
      unansweredCount++;
    } else {
      attemptedCount++;
      if (ans.correct) {
        correctCount++;
        if (ans.isAssisted) {
          assistedCorrectCount++;
        } else {
          unassistedCorrectCount++;
        }
      } else {
        incorrectCount++;
      }
    }

    if (ans) {
      totalHintsUsed += ans.hintsUsed || 0;
      if (ans.solutionViewed) {
        solutionsViewedCount++;
      }
    }
  }

  const accuracy = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const unassistedAccuracy =
    totalQuestions > 0 ? Math.round((unassistedCorrectCount / totalQuestions) * 100) : 0;

  const startedTime = new Date(session.startedAt).getTime();
  const completedTime = session.completedAt ? new Date(session.completedAt).getTime() : Date.now();
  const totalTimeSeconds = Math.max(1, Math.round((completedTime - startedTime) / 1000));
  const averageTimePerQuestion = totalQuestions > 0 ? Math.round(totalTimeSeconds / totalQuestions) : 0;

  return {
    totalQuestions,
    attemptedCount,
    correctCount,
    unassistedCorrectCount,
    assistedCorrectCount,
    incorrectCount,
    unansweredCount,
    accuracy,
    unassistedAccuracy,
    totalTimeSeconds,
    averageTimePerQuestion,
    totalHintsUsed,
    solutionsViewedCount,
    timedOut,
  };
}

/**
 * Authoritative, timestamp-based countdown calculation.
 * Immune to React render frequency and browser tab sleep.
 */
export function calculateRemainingSeconds(
  startedAt: string,
  timeLimitSeconds: number,
  nowTimestamp: number = Date.now()
): number {
  const startedMs = new Date(startedAt).getTime();
  const elapsedSeconds = Math.max(0, Math.floor((nowTimestamp - startedMs) / 1000));
  return Math.max(0, timeLimitSeconds - elapsedSeconds);
}
