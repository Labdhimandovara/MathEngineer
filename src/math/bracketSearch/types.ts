/**
 * Deterministic Bracket Search Types
 * 
 * Defines schemas for finding and explaining valid initial intervals [a, b]
 * where f(a) * f(b) < 0 without invoking external AI providers.
 */

export interface BracketStep {
  x: number;
  fx: number;
  isFinite: boolean;
  note?: string;
}

export interface BracketSearchResultSuccess {
  found: true;
  a: number;
  b: number;
  fa: number;
  fb: number;
  steps: BracketStep[];
  explanation: string[];
}

export interface BracketSearchResultFailure {
  found: false;
  reason: string;
  steps: BracketStep[];
}

export type BracketSearchResult =
  | BracketSearchResultSuccess
  | BracketSearchResultFailure;

export interface BracketSearchOptions {
  min?: number;
  max?: number;
  step?: number;
  maxSteps?: number;
}
