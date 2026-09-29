/**
 * Client-Side Persistence API Client (Phase 13.2)
 * 
 * Communicates with Deno backend persistence endpoints.
 * Handles online/offline degradation gracefully without disrupting the UI.
 */

import { RegisteredImageProblem } from '../problem/imageProblemRegistry.ts';
import { LearningAttempt } from '../../types/learning.ts';
import { AssessmentSession } from '../assessment/assessmentTypes.ts';

const TIMEOUT_MS = 5000;

async function safeFetch(url: string, options: RequestInit = {}): Promise<Response | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const res = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res;
  } catch {
    // Offline or network timeout
    return null;
  }
}

/**
 * Persists an image problem record to backend database
 */
export async function syncImageProblemToBackend(problem: RegisteredImageProblem): Promise<boolean> {
  const res = await safeFetch('/api/problems/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(problem),
  });
  return Boolean(res && res.ok);
}

/**
 * Updates an existing image problem record on the backend (e.g. after bracket discovery)
 */
export async function patchImageProblemOnBackend(
  questionId: string,
  updates: Partial<RegisteredImageProblem>
): Promise<boolean> {
  const res = await safeFetch(`/api/problems/image/${encodeURIComponent(questionId)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return Boolean(res && res.ok);
}

/**
 * Fetches canonical image problem from backend database
 */
export async function fetchImageProblemFromBackend(
  questionId: string
): Promise<RegisteredImageProblem | null> {
  const res = await safeFetch(`/api/problems/image/${encodeURIComponent(questionId)}`);
  if (!res || !res.ok) return null;
  try {
    const json = await res.json();
    return json.problem || null;
  } catch {
    return null;
  }
}

/**
 * Fetches all image problems from backend
 */
export async function fetchAllImageProblemsFromBackend(): Promise<RegisteredImageProblem[]> {
  const res = await safeFetch('/api/problems/image');
  if (!res || !res.ok) return [];
  try {
    const json = await res.json();
    return Array.isArray(json.problems) ? json.problems : [];
  } catch {
    return [];
  }
}

/**
 * Uploads physical image file to backend storage
 */
export async function uploadImageBinaryToBackend(
  questionId: string,
  file: File | Blob
): Promise<string | null> {
  try {
    const res = await safeFetch(`/api/images/${encodeURIComponent(questionId)}`, {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'image/png' },
      body: file,
    });
    if (!res || !res.ok) return null;
    const json = await res.json();
    return json.url || null;
  } catch {
    return null;
  }
}

/**
 * Persists learning attempt to backend database
 */
export async function syncAttemptToBackend(attempt: LearningAttempt): Promise<boolean> {
  const res = await safeFetch('/api/attempts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(attempt),
  });
  return Boolean(res && res.ok);
}

/**
 * Fetches all learning attempts from backend
 */
export async function fetchAttemptsFromBackend(): Promise<LearningAttempt[]> {
  const res = await safeFetch('/api/attempts');
  if (!res || !res.ok) return [];
  try {
    const json = await res.json();
    return Array.isArray(json.attempts) ? json.attempts : [];
  } catch {
    return [];
  }
}

/**
 * Persists assessment session to backend database
 */
export async function syncAssessmentToBackend(session: AssessmentSession): Promise<boolean> {
  const res = await safeFetch('/api/assessments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(session),
  });
  return Boolean(res && res.ok);
}

/**
 * Fetches all completed assessments from backend
 */
export async function fetchAssessmentsFromBackend(): Promise<AssessmentSession[]> {
  const res = await safeFetch('/api/assessments');
  if (!res || !res.ok) return [];
  try {
    const json = await res.json();
    return Array.isArray(json.assessments) ? json.assessments : [];
  } catch {
    return [];
  }
}

/**
 * One-time idempotent batch migration from client localStorage to backend database
 */
export async function syncBatchToBackend(payload: {
  imageProblems?: RegisteredImageProblem[];
  attempts?: LearningAttempt[];
  assessments?: AssessmentSession[];
  preferences?: any;
}): Promise<boolean> {
  const res = await safeFetch('/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return Boolean(res && res.ok);
}
