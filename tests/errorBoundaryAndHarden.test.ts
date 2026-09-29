/**
 * Blank-Screen Hardening & Schema Validation Test Suite
 * 
 * Verifies:
 * 1. normalizeExtractedProblem strictly conforms to Constraint 1 (never invents missing values).
 * 2. Missing equation, bounds, x0, or method are retained as null and flagged in missingFields.
 * 3. Confidence label correctly downgrades to 'Needs review' on missing critical parameters.
 * 4. mapProviderStatusToMessage maps 503, 429, 401/403, 404, 500 properly.
 * 5. Discriminated response unions prevent undefined property access errors.
 * 6. Client validation and cancellation safety.
 */

import { assertEquals, assertNotEquals, assert } from 'jsr:@std/assert';
import {
  normalizeExtractedProblem,
  validateExtractedProblem,
} from '../src/services/problemImage/problemImageValidation.ts';
import {
  mapProviderStatusToMessage,
  handleChatRequest,
} from '../src/services/assistant/chatHandler.ts';
import {
  validateProblemImageFile,
} from '../src/services/problemImage/problemImageService.ts';

Deno.test('Harden 1: normalizeExtractedProblem never fabricates missing equation', () => {
  const raw = {
    method: 'bisection',
    lowerBound: 1,
    upperBound: 2,
    decimalPlaces: 3,
  };

  const normalized = normalizeExtractedProblem(raw);
  assertEquals(normalized.equation, null);
  assertEquals(normalized.confidenceLabel, 'Needs review');
  assert(normalized.missingFields?.includes('equation'));
});

Deno.test('Harden 2: normalizeExtractedProblem never fabricates missing interval bounds', () => {
  const raw = {
    equation: 'x^3 - 2x - 5 = 0',
    method: 'bisection',
    decimalPlaces: 3,
  };

  const normalized = normalizeExtractedProblem(raw);
  assertEquals(normalized.lowerBound, null);
  assertEquals(normalized.upperBound, null);
  assertEquals(normalized.confidenceLabel, 'Needs review');
  assert(normalized.missingFields?.includes('lowerBound'));
  assert(normalized.missingFields?.includes('upperBound'));
});

Deno.test('Harden 3: normalizeExtractedProblem never fabricates missing Newton x0', () => {
  const raw = {
    equation: 'x^3 - 2x - 5 = 0',
    method: 'newton-raphson',
    lowerBound: 2,
    upperBound: 3,
  };

  const normalized = normalizeExtractedProblem(raw);
  assertEquals(normalized.initialGuess, null);
  assertEquals(normalized.confidenceLabel, 'Needs review');
  assert(normalized.missingFields?.includes('initialGuess'));
});

Deno.test('Harden 4: normalizeExtractedProblem rejects invalid or unsupported methods', () => {
  const raw = {
    equation: 'x^3 - 2x - 5 = 0',
    method: 'secant-method', // Unsupported
    lowerBound: 1,
    upperBound: 2,
  };

  const normalized = normalizeExtractedProblem(raw);
  assertEquals(normalized.method, null);
  assertEquals(normalized.confidenceLabel, 'Needs review');
  assert(normalized.missingFields?.includes('method'));
});

Deno.test('Harden 5: Non-object or corrupted AI JSON returns safe review-required structure', () => {
  const corruptedOutputs = [null, undefined, 'not-json', [1, 2, 3], 42, true];

  for (const raw of corruptedOutputs) {
    const normalized = normalizeExtractedProblem(raw);
    assertEquals(normalized.equation, null);
    assertEquals(normalized.method, null);
    assertEquals(normalized.lowerBound, null);
    assertEquals(normalized.upperBound, null);
    assertEquals(normalized.confidenceLabel, 'Needs review');
    assert(normalized.missingFields !== undefined);
  }
});

Deno.test('Harden 6: Decimal places outside 1-6 are rejected from automatic extraction', () => {
  const rawOver = {
    equation: 'x^2 - 2 = 0',
    method: 'bisection',
    lowerBound: 1,
    upperBound: 2,
    decimalPlaces: 10, // Invalid
  };

  const normalized = normalizeExtractedProblem(rawOver);
  assertEquals(normalized.decimalPlaces, null);
});

Deno.test('Harden 7: validateExtractedProblem blocks confirmation when mathematical fields are null', () => {
  const partialWithNulls = {
    equation: null,
    lowerBound: null,
    upperBound: null,
    decimalPlaces: 3,
  };

  const validation = validateExtractedProblem(partialWithNulls, 'bisection');
  assertEquals(validation.isValid, false);
  assert(validation.equationError !== undefined);
  assert(validation.boundsError !== undefined);
});

Deno.test('Harden 8: mapProviderStatusToMessage provides user-friendly sanitized strings', () => {
  assertEquals(mapProviderStatusToMessage(503), 'MathEngineer is temporarily busy. Please try again.');
  assertEquals(mapProviderStatusToMessage(429), 'MathEngineer has reached the current AI request limit. Please try again later.');
  assertEquals(mapProviderStatusToMessage(401), 'MathEngineer could not authenticate with the AI service.');
  assertEquals(mapProviderStatusToMessage(403), 'MathEngineer could not authenticate with the AI service.');
  assertEquals(mapProviderStatusToMessage(404), 'The configured AI model is unavailable.');
  assertEquals(mapProviderStatusToMessage(400), 'The request could not be processed.');
  assertEquals(mapProviderStatusToMessage(500), 'Something went wrong. Please try again.');
});

Deno.test('Harden 9: Chat 503 marks retryable = true, while 400/403 marks retryable = false', async () => {
  const mockFetch503: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: { code: 503, message: 'Overloaded' } }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const res503 = await handleChatRequest(
    { messages: [{ role: 'user', content: 'Help' }] },
    { GEMINI_API_KEY: 'test-key' },
    mockFetch503
  );

  assertEquals(res503.success, false);
  assertEquals(res503.retryable, true);

  const mockFetch403: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: { code: 403, message: 'Forbidden' } }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const res403 = await handleChatRequest(
    { messages: [{ role: 'user', content: 'Help' }] },
    { GEMINI_API_KEY: 'test-key' },
    mockFetch403
  );

  assertEquals(res403.success, false);
  assertEquals(res403.retryable, false);
});

Deno.test('Harden 10: validateProblemImageFile rejects empty and invalid files gracefully', () => {
  const nullFile = null as any;
  const resNull = validateProblemImageFile(nullFile);
  assertEquals(resNull.valid, false);

  const pdfFile = new File(['%PDF-1.4'], 'document.pdf', { type: 'application/pdf' });
  const resPdf = validateProblemImageFile(pdfFile);
  assertEquals(resPdf.valid, false);
  assert(resPdf.error?.includes('Unsupported image format'));

  const jpgFile = new File(['binary-jpeg'], 'photo.jpg', { type: 'image/jpeg' });
  const resJpg = validateProblemImageFile(jpgFile);
  assertEquals(resJpg.valid, true);
});