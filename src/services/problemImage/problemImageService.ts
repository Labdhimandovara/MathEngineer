/**
 * Client-Side Problem Image Service (Phase 8.5 Local OCR-First Architecture)
 * 
 * Primary workflow:
 * 1. Validates image file (JPG, PNG, WEBP, <= 5MB)
 * 2. Runs local browser OCR (Tesseract.js) - ZERO Gemini quota consumed
 * 3. Deterministically parses text into structured mathematical problem
 * 4. Supplies explicit Gemini Vision fallback ONLY when user clicks "Try AI extraction"
 */

import {
  ProblemImageRequestPayload,
  ProblemImageResponsePayload,
} from './problemImageTypes.ts';
import { performLocalOcr } from '../ocr/ocrService.ts';
import { parseQuestionText } from '../ocr/questionParser.ts';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const SUPPORTED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

export function validateProblemImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No image file provided.' };
  }

  const mime = (file.type || '').toLowerCase();
  const name = (file.name || '').toLowerCase();
  const hasValidExt =
    name.endsWith('.jpg') ||
    name.endsWith('.jpeg') ||
    name.endsWith('.png') ||
    name.endsWith('.webp');

  if (!SUPPORTED_MIME_TYPES.includes(mime) && !hasValidExt) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload a JPG, PNG, or WEBP image. PDFs and other document types are not supported.',
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image file is too large (${sizeMb} MB). Maximum supported file size is 5 MB.`,
    };
  }

  return { valid: true };
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      if (commaIdx !== -1) {
        resolve(result.slice(commaIdx + 1));
      } else {
        resolve(result);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * PRIMARY WORKFLOW: Local OCR-first extraction
 * Runs 100% locally in browser without calling Gemini API.
 */
export async function extractProblemFromImageLocal(
  file: File,
  signal?: AbortSignal,
  onProgress?: (progress: number) => void
): Promise<ProblemImageResponsePayload> {
  const validation = validateProblemImageFile(file);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid image file.',
    };
  }

  if (signal?.aborted) {
    return {
      success: false,
      error: 'Image extraction was cancelled.',
    };
  }

  try {
    const ocrResult = await performLocalOcr(file, { signal, onProgress });

    if (signal?.aborted) {
      return {
        success: false,
        error: 'Image extraction was cancelled.',
      };
    }

    const parsed = parseQuestionText(ocrResult.text);

    return {
      success: true,
      problem: parsed,
      provider: 'none',
      httpStatus: 200,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      return {
        success: false,
        error: 'Image extraction was cancelled.',
      };
    }
    return {
      success: false,
      error: `Failed to perform local OCR on image: ${err?.message || err}`,
    };
  }
}

/**
 * OPTIONAL FALLBACK: Gemini Vision extraction
 * Triggered ONLY when student explicitly clicks "Try AI extraction".
 */
export async function extractProblemFromImageGemini(
  file: File,
  signal?: AbortSignal
): Promise<ProblemImageResponsePayload> {
  const validation = validateProblemImageFile(file);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error || 'Invalid image file.',
    };
  }

  if (signal?.aborted) {
    return {
      success: false,
      error: 'Image extraction was cancelled.',
    };
  }

  try {
    const imageBase64 = await fileToBase64(file);
    const imageMimeType = file.type || 'image/jpeg';

    const payload: ProblemImageRequestPayload = {
      imageBase64,
      imageMimeType,
    };

    const response = await fetch('/api/problem-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      let errorMsg = `Server returned status ${response.status}.`;
      try {
        const errJson = await response.json();
        if (errJson?.error) errorMsg = errJson.error;
      } catch {
        // use fallback
      }
      return {
        success: false,
        error: errorMsg,
      };
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      return {
        success: false,
        error: 'Invalid response format received from the image processing server.',
      };
    }

    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'Unexpected response format received from the image processing server.',
      };
    }

    if (data.success && data.problem) {
      data.problem.extractionSource = 'gemini-fallback';
    }

    return data as ProblemImageResponsePayload;
  } catch (err: any) {
    if (err?.name === 'AbortError' || signal?.aborted) {
      return {
        success: false,
        error: 'Image extraction was cancelled.',
      };
    }
    return {
      success: false,
      error: `Failed to extract problem with AI: ${err?.message || err}`,
    };
  }
}

/**
 * Default extraction handler:
 * Routes to local OCR-first by default.
 */
export function extractProblemFromImage(
  file: File,
  signal?: AbortSignal
): Promise<ProblemImageResponsePayload> {
  return extractProblemFromImageLocal(file, signal);
}
