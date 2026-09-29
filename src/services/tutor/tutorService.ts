/**
 * AI Tutor Service (Phase 13.4 Unified Orchestrator Entrypoint)
 * 
 * Delegates all tutor requests to the Unified Intelligent Tutor Orchestrator.
 * Guarantees that frontend components, background services, and test suites
 * share the exact same intelligent deterministic routing logic.
 */

import {
  TutorRequest,
  TutorResponse,
} from './tutorTypes.ts';
import { routeTutorRequest } from './tutorOrchestrator.ts';

export interface TutorRequestOptions {
  signal?: AbortSignal;
  envOverride?: { GEMINI_API_KEY?: string; OPENAI_API_KEY?: string };
  fetchFn?: typeof fetch;
}

/**
 * Removes markdown bold asterisks from tutor responses to maintain calm textbook presentation
 */
export function stripBoldAsterisks(text: string): string {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/__([^_]+)__/g, '$1')
    .trim();
}

/**
 * Formats tutor output for clean educational presentation
 */
export function formatTutorReply(reply: string): string {
  if (!reply || typeof reply !== 'string') return '';
  return stripBoldAsterisks(reply);
}

/**
 * Primary dispatch function for AI tutor inquiries
 * Routes all inquiries through the Unified Tutor Orchestrator (Phase 13.4)
 */
export async function askTutor(
  request: TutorRequest,
  options?: TutorRequestOptions
): Promise<TutorResponse> {
  return routeTutorRequest(request, options);
}

export { routeTutorRequest };
