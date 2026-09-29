/**
 * Assessment Session & History Persistence Store (Phase 10)
 * 
 * Manages active session lifecycle, answer recording, assistance tracking,
 * and immutable assessment history persistence.
 * 
 * Guarantees:
 * - Session restoration across page refresh.
 * - Integration with learningStore (source: 'assessment').
 * - 0 Gemini API calls.
 */

import { useState, useEffect } from 'react';
import {
  AssessmentSession,
  AssessmentAnswer,
  QuizType,
} from './assessmentTypes.ts';
import {
  selectQuestionsForQuiz,
  verifyAssessmentAnswer,
  calculateAssessmentResult,
} from './assessmentEngine.ts';
import { PRACTICE_QUESTIONS } from '../../data/practiceQuestions.ts';
import { startAttempt, completeAttempt } from '../learning/learningStore.ts';
import { MethodId } from '../progress/progressTypes.ts';

export const ACTIVE_ASSESSMENT_KEY = 'mathengineer_active_assessment_v1';
export const ASSESSMENT_HISTORY_KEY = 'mathengineer_assessment_history_v1';

let inMemoryActiveSession: AssessmentSession | null = null;
let inMemoryHistory: AssessmentSession[] = [];
const activeListeners = new Set<(session: AssessmentSession | null) => void>();
const historyListeners = new Set<(history: AssessmentSession[]) => void>();

function safeGenerateSessionId(): string {
  return `quiz_sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getStorage(): Storage | null {
  try {
    if (typeof localStorage !== 'undefined') {
      return localStorage;
    }
    if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      return globalThis.localStorage;
    }
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Loads active session from localStorage with validation
 */
export function getActiveSession(): AssessmentSession | null {
  try {
    const storage = getStorage();
    if (storage) {
      const raw = storage.getItem(ACTIVE_ASSESSMENT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed.id === 'string' &&
          Array.isArray(parsed.questionIds) &&
          parsed.status === 'active'
        ) {
          inMemoryActiveSession = parsed;
          return inMemoryActiveSession;
        }
        inMemoryActiveSession = null;
        return null;
      } else {
        inMemoryActiveSession = null;
        return null;
      }
    }
  } catch (err) {
    console.warn('Unable to load active assessment from localStorage:', err);
    inMemoryActiveSession = null;
    return null;
  }
  return inMemoryActiveSession;
}

/**
 * Saves active session to localStorage and notifies subscribers
 */
export function saveActiveSession(session: AssessmentSession | null): void {
  inMemoryActiveSession = session;
  try {
    const storage = getStorage();
    if (storage) {
      if (session) {
        storage.setItem(ACTIVE_ASSESSMENT_KEY, JSON.stringify(session));
      } else {
        storage.removeItem(ACTIVE_ASSESSMENT_KEY);
      }
    }
  } catch (err) {
    console.warn('Unable to save active assessment to localStorage:', err);
  }
  for (const l of activeListeners) {
    try {
      l(inMemoryActiveSession);
    } catch (e) {
      console.error('Error in active assessment listener:', e);
    }
  }
}

/**
 * Loads completed assessment history
 */
export function getAssessmentHistory(): AssessmentSession[] {
  try {
    const storage = getStorage();
    if (storage) {
      const raw = storage.getItem(ASSESSMENT_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          inMemoryHistory = parsed.filter(
            (s) => s && typeof s.id === 'string' && s.status === 'completed'
          );
          return inMemoryHistory;
        }
        inMemoryHistory = [];
        return inMemoryHistory;
      } else {
        inMemoryHistory = [];
        return inMemoryHistory;
      }
    }
  } catch (err) {
    console.warn('Unable to load assessment history from localStorage:', err);
    inMemoryHistory = [];
    return inMemoryHistory;
  }
  return inMemoryHistory;
}

import {
  syncAssessmentToBackend,
  fetchAssessmentsFromBackend,
} from '../api/persistenceClient.ts';

export function saveAssessmentHistory(history: AssessmentSession[]): void {
  inMemoryHistory = history;
  try {
    const storage = getStorage();
    if (storage) {
      storage.setItem(ASSESSMENT_HISTORY_KEY, JSON.stringify(history));
    }
  } catch (err) {
    console.warn('Unable to save assessment history to localStorage:', err);
  }
  for (const l of historyListeners) {
    try {
      l(inMemoryHistory);
    } catch (e) {
      console.error('Error in assessment history listener:', e);
    }
  }
}

/**
 * Hydrates assessment history from backend DB
 */
export async function hydrateAssessmentHistoryFromBackend(): Promise<void> {
  try {
    const remote = await fetchAssessmentsFromBackend();
    if (remote && remote.length > 0) {
      const current = getAssessmentHistory();
      const existingIds = new Set(current.map((s) => s.id));
      let changed = false;

      for (const r of remote) {
        if (!existingIds.has(r.id)) {
          current.push(r);
          existingIds.add(r.id);
          changed = true;
        }
      }

      if (changed) {
        current.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
        saveAssessmentHistory(current);
      }
    }
  } catch {
    // Offline or network error
  }
}

/**
 * Starts a new immutable assessment session.
 */
export function startAssessmentSession(params: {
  type: QuizType;
  title?: string;
  method?: MethodId | 'mixed';
  questionCount?: number;
  timeLimitSeconds?: number;
  seed?: number;
}): AssessmentSession {
  const questions = selectQuestionsForQuiz(params.type, {
    method: params.method,
    questionCount: params.questionCount,
    seed: params.seed,
  });

  const questionIds = questions.map((q) => q.id);

  const title =
    params.title ||
    (params.type === 'quick'
      ? 'Quick Quiz'
      : params.type === 'timed'
      ? `Timed Assessment (${Math.round((params.timeLimitSeconds || 300) / 60)} mins)`
      : params.method === 'bisection'
      ? 'Bisection Method Quiz'
      : params.method === 'false-position'
      ? 'False Position Method Quiz'
      : params.method === 'newton-raphson'
      ? 'Newton-Raphson Method Quiz'
      : 'Mixed Numerical Methods Quiz');

  const newSession: AssessmentSession = {
    id: safeGenerateSessionId(),
    type: params.type,
    method: params.method || 'mixed',
    title,
    startedAt: new Date().toISOString(),
    timeLimitSeconds: params.timeLimitSeconds,
    questionIds,
    currentIndex: 0,
    flaggedQuestionIds: [],
    answers: {},
    status: 'active',
  };

  saveActiveSession(newSession);
  return newSession;
}

/**
 * Records or updates a student's answer for a question in the active session.
 */
export function recordAnswer(params: {
  questionId: string;
  answer: string | number;
  solutionViewed?: boolean;
  hintsUsed?: number;
}): AssessmentSession | null {
  const session = getActiveSession();
  if (!session || session.status !== 'active') {
    return null;
  }

  const question = PRACTICE_QUESTIONS.find((q) => q.id === params.questionId);
  if (!question) {
    console.warn(`Question ${params.questionId} not found in PRACTICE_QUESTIONS`);
    return session;
  }

  const existingAnswer = session.answers[params.questionId];
  const solutionViewed =
    params.solutionViewed !== undefined
      ? params.solutionViewed
      : existingAnswer?.solutionViewed || false;
  const hintsUsed =
    params.hintsUsed !== undefined ? params.hintsUsed : existingAnswer?.hintsUsed || 0;
  const isAssisted = solutionViewed || hintsUsed > 0;

  const verification = verifyAssessmentAnswer(question, params.answer);

  const updatedAnswer: AssessmentAnswer = {
    questionId: params.questionId,
    submittedAnswer: params.answer,
    isAnswered: true,
    correct: verification.isCorrect,
    submittedAt: new Date().toISOString(),
    timeSpentSeconds: (existingAnswer?.timeSpentSeconds || 0) + 15,
    hintsUsed,
    solutionViewed,
    isAssisted,
    mistakeCategories: verification.mistakeCategory ? [verification.mistakeCategory] : [],
  };

  const updatedSession: AssessmentSession = {
    ...session,
    answers: {
      ...session.answers,
      [params.questionId]: updatedAnswer,
    },
  };

  saveActiveSession(updatedSession);
  return updatedSession;
}

/**
 * Records that a solution was viewed during an active assessment, tracking assistance.
 */
export function recordAssessmentSolutionView(questionId: string): AssessmentSession | null {
  const session = getActiveSession();
  if (!session || session.status !== 'active') return null;

  const existing = session.answers[questionId];
  const updatedAnswer: AssessmentAnswer = existing
    ? {
        ...existing,
        solutionViewed: true,
        isAssisted: true,
      }
    : {
        questionId,
        isAnswered: false,
        correct: false,
        timeSpentSeconds: 15,
        hintsUsed: 0,
        solutionViewed: true,
        isAssisted: true,
        submittedAt: new Date().toISOString(),
      };

  const updatedSession: AssessmentSession = {
    ...session,
    answers: {
      ...session.answers,
      [questionId]: updatedAnswer,
    },
  };

  saveActiveSession(updatedSession);
  return updatedSession;
}

/**
 * Toggles a question's flagged state.
 */
export function toggleFlagQuestion(questionId: string): AssessmentSession | null {
  const session = getActiveSession();
  if (!session || session.status !== 'active') return null;

  const isFlagged = session.flaggedQuestionIds.includes(questionId);
  const flaggedQuestionIds = isFlagged
    ? session.flaggedQuestionIds.filter((id) => id !== questionId)
    : [...session.flaggedQuestionIds, questionId];

  const updatedSession: AssessmentSession = {
    ...session,
    flaggedQuestionIds,
  };

  saveActiveSession(updatedSession);
  return updatedSession;
}

/**
 * Updates the current question index in the active session.
 */
export function setCurrentIndex(index: number): AssessmentSession | null {
  const session = getActiveSession();
  if (!session || session.status !== 'active') return null;

  const clamped = Math.max(0, Math.min(session.questionIds.length - 1, index));
  const updatedSession: AssessmentSession = {
    ...session,
    currentIndex: clamped,
  };

  saveActiveSession(updatedSession);
  return updatedSession;
}

/**
 * Submits the active assessment session, calculating results and recording attempts into learningStore.
 */
export function submitAssessmentSession(timedOut: boolean = false): AssessmentSession | null {
  const session = getActiveSession();
  if (!session || session.status !== 'active') return null;

  const completedAt = new Date().toISOString();
  const results = calculateAssessmentResult({ ...session, completedAt }, timedOut);

  const completedSession: AssessmentSession = {
    ...session,
    completedAt,
    status: 'completed',
    results,
  };

  // 1. Save to assessment history
  const history = getAssessmentHistory();
  const updatedHistory = [completedSession, ...history];
  saveAssessmentHistory(updatedHistory);

  // 2. Clear active session
  saveActiveSession(null);

  // 3. Integrate each question attempt into learning history with source: 'assessment'
  for (const qId of session.questionIds) {
    const question = PRACTICE_QUESTIONS.find((q) => q.id === qId);
    const ans = session.answers[qId];

    if (question) {
      try {
        const att = startAttempt({
          questionId: question.id,
          method: question.method,
          topic: question.title,
          decimalPlaces: question.decimalPlaces,
          equation: question.equation,
          lowerBound: question.bounds[0],
          upperBound: question.bounds[1],
          initialGuess: question.x0,
          source: 'assessment',
          rawExtractedText: question.description,
        });

        completeAttempt(att.id, {
          correct: ans?.correct ?? false,
          hintsUsed: ans?.hintsUsed || 0,
          solutionViewed: ans?.solutionViewed || false,
          mistakeCategories: ans?.mistakeCategories || [],
          finalAnswer: ans?.submittedAnswer,
          expectedAnswer: question.expectedRoot,
          durationSeconds: ans?.timeSpentSeconds || 30,
        });
      } catch (err) {
        console.warn(`Could not sync assessment attempt for ${qId} to learningStore:`, err);
      }
    }
  }

  return completedSession;
}

/**
 * Abandons the active session without recording completed results.
 */
export function abandonAssessmentSession(): AssessmentSession | null {
  const session = getActiveSession();
  if (!session || session.status !== 'active') return null;

  const abandonedSession: AssessmentSession = {
    ...session,
    completedAt: new Date().toISOString(),
    status: 'abandoned',
  };

  saveActiveSession(null);
  return abandonedSession;
}

/**
 * Finds an assessment session by ID from active session or history.
 */
export function getAssessmentSessionById(id: string): AssessmentSession | null {
  if (inMemoryActiveSession && inMemoryActiveSession.id === id) {
    return inMemoryActiveSession;
  }
  const history = getAssessmentHistory();
  return history.find((s) => s.id === id) || null;
}

/**
 * Resets all assessment data (active session and history).
 */
export function clearAssessmentHistory(): void {
  saveActiveSession(null);
  saveAssessmentHistory([]);
}

/**
 * React hook subscribing to active assessment updates.
 */
export function useActiveAssessment(): AssessmentSession | null {
  const [session, setSession] = useState<AssessmentSession | null>(getActiveSession());

  useEffect(() => {
    const handler = (updated: AssessmentSession | null) => {
      setSession(updated ? { ...updated } : null);
    };
    activeListeners.add(handler);
    return () => {
      activeListeners.delete(handler);
    };
  }, []);

  return session;
}

/**
 * React hook subscribing to assessment history updates.
 */
export function useAssessmentHistory(): AssessmentSession[] {
  const [history, setHistory] = useState<AssessmentSession[]>(getAssessmentHistory());

  useEffect(() => {
    const handler = (updated: AssessmentSession[]) => {
      setHistory([...updated]);
    };
    historyListeners.add(handler);
    return () => {
      historyListeners.delete(handler);
    };
  }, []);

  return history;
}
