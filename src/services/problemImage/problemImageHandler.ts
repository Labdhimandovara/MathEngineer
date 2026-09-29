/**
 * Server-Side Problem Image Extraction Handler
 * 
 * Securely processes /api/problem-image requests using the unified Gemini client.
 * Kept entirely separate from conversational chat endpoints.
 */

import { PROBLEM_IMAGE_EXTRACTION_PROMPT } from './problemImagePrompt.ts';
import {
  ExtractedProblem,
  ProblemImageRequestPayload,
  ProblemImageResponsePayload,
} from './problemImageTypes.ts';
import { normalizeExtractedProblem } from './problemImageValidation.ts';
import {
  generateVision,
  getGeminiConfig,
} from '../gemini/geminiClient.ts';

/**
 * Extracts the first JSON object block from a string, handling markdown or surrounding prose
 */
export function extractJsonBlock(text: string): string | null {
  if (!text || typeof text !== 'string') return null;
  const match = text.match(/\{[\s\S]*\}/);
  return match ? match[0] : null;
}

export async function handleProblemImageRequest(
  payload: ProblemImageRequestPayload,
  envOverride?: { GEMINI_API_KEY?: string },
  fetchFn: typeof fetch = fetch
): Promise<ProblemImageResponsePayload> {
  const config = getGeminiConfig(envOverride);

  if (!payload?.imageBase64 || !payload?.imageMimeType) {
    return {
      success: false,
      error: 'Missing image data or MIME type.',
      provider: 'none',
      httpStatus: 400,
    };
  }

  if (!config.apiKey) {
    return {
      success: false,
      error:
        'Gemini Vision is not configured on the server. Please set GEMINI_API_KEY to enable image problem extraction.',
      provider: 'none',
      httpStatus: 503,
    };
  }

  const visionResult = await generateVision(
    {
      imageBase64: payload.imageBase64,
      imageMimeType: payload.imageMimeType,
      prompt: 'Extract the mathematical problem specification from this image according to the system instructions. Output JSON only.',
      systemInstruction: PROBLEM_IMAGE_EXTRACTION_PROMPT,
      temperature: 0.1,
      responseMimeType: 'application/json',
      fetchFn,
    },
    envOverride
  );

  if (!visionResult.success || !visionResult.text) {
    return {
      success: false,
      error: visionResult.error || 'Failed to extract problem from image.',
      provider: 'gemini',
      modelUsed: visionResult.modelUsed,
      httpStatus: visionResult.diagnostic.httpStatus,
      diagnostic: visionResult.diagnostic,
    };
  }

  const jsonBlock = extractJsonBlock(visionResult.text);
  if (!jsonBlock) {
    return {
      success: false,
      error: "MathEngineer couldn't structure this image. Please try another image or enter the problem manually.",
      provider: 'gemini',
      modelUsed: visionResult.modelUsed,
      httpStatus: 200,
      diagnostic: visionResult.diagnostic,
    };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(jsonBlock);
  } catch (_err: any) {
    return {
      success: false,
      error: 'Could not parse mathematical parameters from image response. Please enter the problem manually.',
      provider: 'gemini',
      modelUsed: visionResult.modelUsed,
      httpStatus: 200,
      diagnostic: visionResult.diagnostic,
    };
  }

  // Strictly normalize extracted values without fabricating missing bounds, x0, or equation
  const normalized: ExtractedProblem = normalizeExtractedProblem(parsed);

  return {
    success: true,
    problem: normalized,
    provider: 'gemini',
    modelUsed: visionResult.modelUsed,
    httpStatus: 200,
    diagnostic: visionResult.diagnostic,
  };
}