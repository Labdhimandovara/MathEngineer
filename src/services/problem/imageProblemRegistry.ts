/**
 * Persistent Image Problem Registry for MathEngineer
 * 
 * Stores structured representations of confirmed image questions
 * so that exact equation, method, bounds (supplied or discovered),
 * decimal places, and initial guess survive page reloads and can be
 * replayed accurately in Practice, Solve, and Review workflows.
 */

export interface RegisteredImageProblem {
  questionId: string;
  source: 'image';
  method: 'bisection' | 'false-position' | 'newton-raphson';
  equation: string;
  lowerBound: number | null;
  upperBound: number | null;
  boundsSource: 'supplied' | 'discovered' | 'manual' | 'missing';
  initialGuess?: number | null;
  decimalPlaces: number;
  rawExtractedText?: string;
  imageThumbnailUrl?: string;
  discoveredExplanation?: string[];
  createdAt: string;
  title?: string;
}

export const IMAGE_PROBLEMS_STORAGE_KEY = 'mathengineer_image_problems_v1';

let inMemoryRegistry: Record<string, RegisteredImageProblem> = {};

function safeLoadRegistry(): Record<string, RegisteredImageProblem> {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(IMAGE_PROBLEMS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          inMemoryRegistry = parsed;
          return inMemoryRegistry;
        }
      }
    }
  } catch (err) {
    console.warn('Unable to load image problem registry from localStorage:', err);
  }
  return inMemoryRegistry;
}

function safeSaveRegistry(registry: Record<string, RegisteredImageProblem>): void {
  inMemoryRegistry = registry;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(IMAGE_PROBLEMS_STORAGE_KEY, JSON.stringify(registry));
    }
  } catch (err) {
    console.warn('Unable to save image problem registry to localStorage:', err);
  }
}

import {
  syncImageProblemToBackend,
  patchImageProblemOnBackend,
  fetchAllImageProblemsFromBackend,
} from '../api/persistenceClient.ts';

/**
 * Registers an image problem in the persistent store.
 */
export function registerImageProblem(problem: Omit<RegisteredImageProblem, 'createdAt'> & { createdAt?: string }): RegisteredImageProblem {
  const current = safeLoadRegistry();
  const entry: RegisteredImageProblem = {
    ...problem,
    createdAt: problem.createdAt || new Date().toISOString(),
  };
  current[problem.questionId] = entry;
  safeSaveRegistry(current);

  // Asynchronously sync to backend DB without blocking UI
  syncImageProblemToBackend(entry).catch(() => {});

  return entry;
}

/**
 * Retrieves a registered image problem by its stable questionId.
 */
export function getImageProblem(questionId: string): RegisteredImageProblem | null {
  const current = safeLoadRegistry();
  return current[questionId] || null;
}

/**
 * Retrieves all registered image problems.
 */
export function getAllImageProblems(): RegisteredImageProblem[] {
  const current = safeLoadRegistry();
  return Object.values(current);
}

/**
 * Updates an existing registered image problem without duplicating it.
 */
export function updateRegisteredImageProblem(
  questionId: string,
  updates: Partial<RegisteredImageProblem>
): RegisteredImageProblem | null {
  const current = safeLoadRegistry();
  if (!current[questionId]) return null;
  current[questionId] = {
    ...current[questionId],
    ...updates,
  };
  safeSaveRegistry(current);

  // Asynchronously update backend DB
  patchImageProblemOnBackend(questionId, updates).catch(() => {});

  return current[questionId];
}

/**
 * Hydrates client registry from backend database if available
 */
export async function hydrateImageProblemsFromBackend(): Promise<void> {
  try {
    const remote = await fetchAllImageProblemsFromBackend();
    if (remote && remote.length > 0) {
      const current = safeLoadRegistry();
      let changed = false;
      for (const p of remote) {
        if (!current[p.questionId]) {
          current[p.questionId] = p;
          changed = true;
        }
      }
      if (changed) {
        safeSaveRegistry(current);
      }
    }
  } catch {
    // Offline or network error
  }
}

/**
 * Clears the image problem registry (for testing or reset).
 */
export function clearImageProblemRegistry(): void {
  inMemoryRegistry = {};
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(IMAGE_PROBLEMS_STORAGE_KEY);
    }
  } catch (err) {
    console.warn('Unable to clear image problem registry:', err);
  }
}
