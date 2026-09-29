/**
 * Local OCR and Deterministic Problem Parsing Types
 */

import { SupportedMethod, BoundsSource, ExtractedProblem } from '../problemImage/problemImageTypes.ts';

export interface LocalOcrWord {
  text: string;
  confidence: number;
}

export interface LocalOcrResult {
  text: string;
  confidence: number;
  source: 'local-ocr';
  words?: LocalOcrWord[];
}

export interface ParsedQuestionResult extends ExtractedProblem {
  id: string;
  questionText: string;
  equation: string | null;
  method: SupportedMethod | null;
  lowerBound: number | null;
  upperBound: number | null;
  initialGuess: number | null;
  decimalPlaces: number | null;
  confidence: number;
  confidenceLabel: 'High' | 'Medium' | 'Needs review';
  missingFields?: string[];
  patternMatched?: string;
  notes?: string;
  boundsSource: BoundsSource;
  extractionSource: 'local-ocr' | 'gemini-fallback';
}
