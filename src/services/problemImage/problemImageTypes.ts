/**
 * Problem Image Extraction Types
 * 
 * Defines schemas for image upload, Gemini Vision problem extraction,
 * mathematical parameter validation, and user confirmation.
 */

export type SupportedMethod = 'bisection' | 'false-position' | 'newton-raphson';

export type ImageUploadState =
  | 'idle'
  | 'selecting'
  | 'uploading'
  | 'extracting'
  | 'confirmation'
  | 'success'
  | 'error';

export type BoundsSource = 'supplied' | 'discovered' | 'manual' | 'missing';

export interface ExtractedProblem {
  id?: string;
  questionText: string;
  equation: string | null;
  method: SupportedMethod | null;
  lowerBound: number | null;
  upperBound: number | null;
  initialGuess?: number | null;
  decimalPlaces: number | null;
  confidence: number; // 0.0 to 1.0
  confidenceLabel: 'High' | 'Medium' | 'Needs review';
  notes?: string;
  missingFields?: string[];
  boundsSource?: BoundsSource;
  discoveredExplanation?: string[];
  extractionSource?: 'local-ocr' | 'gemini-fallback';
}

export interface ProblemImageRequestPayload {
  imageBase64: string;
  imageMimeType: string;
}

export type ProblemImageResponsePayload =
  | {
      success: true;
      problem: ExtractedProblem;
      error?: undefined;
      provider?: 'gemini' | 'none';
      modelUsed?: string;
      httpStatus?: number | null;
      diagnostic?: any;
    }
  | {
      success: false;
      problem?: undefined;
      error: string;
      provider?: 'gemini' | 'none';
      modelUsed?: string;
      httpStatus?: number | null;
      diagnostic?: any;
    };

export interface ProblemValidationResult {
  isValid: boolean;
  parsedExpression?: string;
  equationError?: string;
  boundsError?: string;
  initialGuessError?: string;
  decimalPlacesError?: string;
  methodError?: string;
}
