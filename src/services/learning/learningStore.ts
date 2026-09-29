/**
 * Learning History & Attempt Persistence Engine
 * 
 * Manages granular LearningAttempt lifecycles across Practice, Solve, and Solve With Me.
 * Preserves full retry history and guarantees exact questionId tracking.
 * Coordinates with progressStore to maintain streak and challenge data without competing.
 */

import { LearningAttempt, AttemptStatus, MistakeCategory } from '../../types/learning.ts';
import { MethodId } from '../progress/progressTypes.ts';
import { recordQuestionAttempt } from '../progress/progressStore.ts';
import { getImageProblem } from '../problem/imageProblemRegistry.ts';
import { PRACTICE_QUESTIONS } from '../../data/practiceQuestions.ts';
import { useState, useEffect } from 'react';

import {
  syncAttemptToBackend,
  fetchAttemptsFromBackend,
} from '../api/persistenceClient.ts';

export const LEARNING_STORAGE_KEY = 'mathengineer_learning_history_v1';

let inMemoryAttempts: LearningAttempt[] = [];
const listeners = new Set<(attempts: LearningAttempt[]) => void>();

function safeGenerateId(): string {
  return `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Loads learning attempts safely from localStorage with schema validation
 */
export function loadLearningAttempts(): LearningAttempt[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(LEARNING_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          // Validate and filter well-formed records
          inMemoryAttempts = parsed.filter(
            (a) =>
              a &&
              typeof a.id === 'string' &&
              typeof a.questionId === 'string' &&
              typeof a.method === 'string' &&
              typeof a.startedAt === 'string'
          );
          return inMemoryAttempts;
        }
      }
    }
  } catch (err) {
    console.warn('Unable to load learning attempts from localStorage:', err);
  }
  return inMemoryAttempts;
}

/**
 * Persists learning attempts and notifies subscribers
 */
export function saveLearningAttempts(attempts: LearningAttempt[]): void {
  inMemoryAttempts = attempts;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(LEARNING_STORAGE_KEY, JSON.stringify(attempts));
    }
  } catch (err) {
    console.warn('Unable to save learning attempts to localStorage:', err);
  }
  for (const listener of listeners) {
    try {
      listener(inMemoryAttempts);
    } catch (e) {
      console.warn('Error in learningStore listener:', e);
    }
  }
}

/**
 * Hydrates learning attempts from backend DB
 */
export async function hydrateLearningAttemptsFromBackend(): Promise<void> {
  try {
    const remote = await fetchAttemptsFromBackend();
    if (remote && remote.length > 0) {
      const current = loadLearningAttempts();
      const existingIds = new Set(current.map((a) => a.id));
      let changed = false;

      for (const r of remote) {
        if (!existingIds.has(r.id)) {
          current.push(r);
          existingIds.add(r.id);
          changed = true;
        }
      }

      if (changed) {
        current.sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime());
        saveLearningAttempts(current);
      }
    }
  } catch {
    // Offline or network error
  }
}

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener(inMemoryAttempts);
    } catch (err) {
      console.error('Error in learning attempts listener:', err);
    }
  }
}

/**
 * Starts a new learning attempt. Each retry/session is its own distinct attempt.
 */
export function startAttempt(params: {
  questionId: string;
  method: MethodId | 'mixed';
  topic?: string;
  decimalPlaces?: number;
  source?: 'practice' | 'assessment' | 'image' | 'review' | 'solve-manual';
  rawExtractedText?: string;
  equation?: string;
  lowerBound?: number | null;
  upperBound?: number | null;
  boundsSource?: 'supplied' | 'discovered' | 'manual' | 'missing';
  initialGuess?: number | null;
  imageThumbnailUrl?: string;
}): LearningAttempt {
  loadLearningAttempts();

  // Count existing attempts for this exact questionId to determine attemptNumber
  const previousForQuestion = inMemoryAttempts.filter(
    (a) => a.questionId === params.questionId
  );
  const attemptNumber = previousForQuestion.length + 1;
  const lastAttempt =
    previousForQuestion.length > 0
      ? previousForQuestion[previousForQuestion.length - 1]
      : undefined;

  // Retrieve underlying question registry or practice data if available
  const registeredImage = params.questionId.startsWith('img_')
    ? getImageProblem(params.questionId)
    : null;
  const practiceQuestion = params.questionId.startsWith('pq-')
    ? PRACTICE_QUESTIONS.find((q) => q.id === params.questionId)
    : null;

  const topicName =
    params.topic ||
    lastAttempt?.topic ||
    practiceQuestion?.title ||
    (params.method === 'bisection'
      ? 'Bisection Method'
      : params.method === 'false-position'
      ? 'False Position Method'
      : params.method === 'newton-raphson'
      ? 'Newton-Raphson Method'
      : 'Mixed Numerical Methods');

  const source =
    params.source ??
    lastAttempt?.source ??
    (registeredImage
      ? 'image'
      : practiceQuestion
      ? 'practice'
      : params.questionId.startsWith('img_')
      ? 'image'
      : 'solve-manual');

  const equation =
    params.equation ??
    lastAttempt?.equation ??
    registeredImage?.equation ??
    practiceQuestion?.equation;

  const lowerBound =
    params.lowerBound !== undefined
      ? params.lowerBound
      : lastAttempt?.lowerBound !== undefined
      ? lastAttempt.lowerBound
      : registeredImage?.lowerBound !== undefined
      ? registeredImage.lowerBound
      : practiceQuestion?.bounds[0];

  const upperBound =
    params.upperBound !== undefined
      ? params.upperBound
      : lastAttempt?.upperBound !== undefined
      ? lastAttempt.upperBound
      : registeredImage?.upperBound !== undefined
      ? registeredImage.upperBound
      : practiceQuestion?.bounds[1];

  const boundsSource =
    params.boundsSource ??
    lastAttempt?.boundsSource ??
    registeredImage?.boundsSource ??
    (practiceQuestion ? 'supplied' : undefined);

  const initialGuess =
    params.initialGuess !== undefined
      ? params.initialGuess
      : lastAttempt?.initialGuess !== undefined
      ? lastAttempt.initialGuess
      : registeredImage?.initialGuess !== undefined
      ? registeredImage.initialGuess
      : practiceQuestion?.x0;

  const rawExtractedText =
    params.rawExtractedText ??
    lastAttempt?.rawExtractedText ??
    registeredImage?.rawExtractedText ??
    practiceQuestion?.description;

  const imageThumbnailUrl =
    params.imageThumbnailUrl ??
    lastAttempt?.imageThumbnailUrl ??
    registeredImage?.imageThumbnailUrl;

  const decimalPlaces =
    params.decimalPlaces ??
    lastAttempt?.decimalPlaces ??
    registeredImage?.decimalPlaces ??
    practiceQuestion?.decimalPlaces;

  const newAttempt: LearningAttempt = {
    id: safeGenerateId(),
    questionId: params.questionId,
    method: params.method,
    topic: topicName,
    startedAt: new Date().toISOString(),
    status: 'started',
    correct: undefined, // Explicitly undefined while started
    attemptNumber,
    hintsUsed: 0,
    solutionViewed: false,
    mistakeCategories: [],
    decimalPlaces,
    durationSeconds: 0,
    source,
    equation,
    lowerBound,
    upperBound,
    boundsSource,
    initialGuess,
    rawExtractedText,
    imageThumbnailUrl,
  };

  const updated = [...inMemoryAttempts, newAttempt];
  saveLearningAttempts(updated);
  syncAttemptToBackend(newAttempt).catch(() => {});
  return newAttempt;
}

/**
 * Records that a solution was viewed for a given attempt, without changing correctness.
 */
export function recordSolutionView(attemptId: string): void {
  loadLearningAttempts();
  const idx = inMemoryAttempts.findIndex((a) => a.id === attemptId);
  if (idx === -1) return;
  const existing = inMemoryAttempts[idx];
  inMemoryAttempts[idx] = {
    ...existing,
    solutionViewed: true,
  };
  saveLearningAttempts([...inMemoryAttempts]);
}

/**
 * Completes an active attempt, recording correctness, duration, hints, and mistakes.
 */
export function completeAttempt(
  attemptId: string,
  update: {
    correct: boolean;
    hintsUsed?: number;
    solutionViewed?: boolean;
    mistakeCategories?: MistakeCategory[];
    finalAnswer?: string | number;
    expectedAnswer?: string | number;
    durationSeconds?: number;
  }
): LearningAttempt | null {
  loadLearningAttempts();

  const idx = inMemoryAttempts.findIndex((a) => a.id === attemptId);
  if (idx === -1) {
    console.warn(`LearningAttempt with id ${attemptId} not found.`);
    return null;
  }

  const existing = inMemoryAttempts[idx];
  const completedAt = new Date().toISOString();
  const durationSeconds =
    update.durationSeconds !== undefined
      ? update.durationSeconds
      : Math.max(
          1,
          Math.round(
            (new Date(completedAt).getTime() - new Date(existing.startedAt).getTime()) / 1000
          )
        );

  const updatedAttempt: LearningAttempt = {
    ...existing,
    completedAt,
    status: 'completed',
    correct: update.correct,
    hintsUsed: update.hintsUsed !== undefined ? update.hintsUsed : existing.hintsUsed,
    solutionViewed:
      update.solutionViewed !== undefined ? update.solutionViewed : existing.solutionViewed,
    mistakeCategories: update.mistakeCategories || existing.mistakeCategories,
    finalAnswer: update.finalAnswer,
    expectedAnswer: update.expectedAnswer,
    durationSeconds,
  };

  const nextList = [...inMemoryAttempts];
  nextList[idx] = updatedAttempt;
  saveLearningAttempts(nextList);
  syncAttemptToBackend(updatedAttempt).catch(() => {});

  // Synchronize to progressStore to keep existing streaks & method stats updated
  try {
    recordQuestionAttempt({
      questionId: updatedAttempt.questionId,
      methodId: updatedAttempt.method,
      isCorrect: updatedAttempt.correct ?? false,
      hintsUsed: updatedAttempt.hintsUsed,
      timeSpentSeconds: updatedAttempt.durationSeconds,
    });
  } catch (err) {
    console.warn('Could not sync attempt to progressStore:', err);
  }

  return updatedAttempt;
}

/**
 * Marks an ongoing attempt as abandoned if the student navigates away or resets
 */
export function abandonAttempt(attemptId: string): void {
  loadLearningAttempts();
  const idx = inMemoryAttempts.findIndex((a) => a.id === attemptId);
  if (idx === -1) return;

  const existing = inMemoryAttempts[idx];
  if (existing.status !== 'started') return;

  const updated: LearningAttempt = {
    ...existing,
    status: 'abandoned',
    completedAt: new Date().toISOString(),
  };

  const nextList = [...inMemoryAttempts];
  nextList[idx] = updated;
  saveLearningAttempts(nextList);
}

/**
 * Retrieves all learning attempts
 */
export function getAttempts(): LearningAttempt[] {
  return [...loadLearningAttempts()];
}

/**
 * Retrieves all attempts for a specific questionId
 */
export function getAttemptsForQuestion(questionId: string): LearningAttempt[] {
  return loadLearningAttempts().filter((a) => a.questionId === questionId);
}

/**
 * Retrieves all attempts for a specific method
 */
export function getAttemptsForMethod(method: string): LearningAttempt[] {
  return loadLearningAttempts().filter((a) => a.method === method);
}

/**
 * Resets learning history (development / testing / user reset)
 */
export function resetLearningHistory(): void {
  saveLearningAttempts([]);
}

/**
 * React hook subscribing to learning attempt updates
 */
export function useLearningAttempts(): LearningAttempt[] {
  const [attempts, setAttempts] = useState<LearningAttempt[]>(loadLearningAttempts());

  useEffect(() => {
    const handler = (updated: LearningAttempt[]) => {
      setAttempts([...updated]);
    };
    listeners.add(handler);
    return () => {
      listeners.delete(handler);
    };
  }, []);

  return attempts;
}
