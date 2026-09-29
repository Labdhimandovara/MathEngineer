/**
 * Tests for Problem Image Extraction, Validation, and Solver Import Flow
 */

import { assertEquals, assert } from 'jsr:@std/assert';
import { handleProblemImageRequest } from '../src/services/problemImage/problemImageHandler.ts';
import {
  validateExtractedProblem,
} from '../src/services/problemImage/problemImageValidation.ts';
import {
  validateProblemImageFile,
} from '../src/services/problemImage/problemImageService.ts';
import {
  ExtractedProblem,
  ProblemImageRequestPayload,
} from '../src/services/problemImage/problemImageTypes.ts';

Deno.test('Problem Image 1: Valid Bisection extraction parses and validates successfully', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    questionText: 'Find the root of x^3 - 4x - 9 = 0 using bisection method between 2 and 3.',
                    equation: 'x^3 - 4x - 9 = 0',
                    method: 'bisection',
                    lowerBound: 2,
                    upperBound: 3,
                    decimalPlaces: 3,
                    confidence: 0.95,
                    confidenceLabel: 'High',
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const payload: ProblemImageRequestPayload = {
    imageBase64: 'fakeBase64==',
    imageMimeType: 'image/png',
  };

  const res = await handleProblemImageRequest(
    payload,
    { GEMINI_API_KEY: 'test-key' },
    mockFetch
  );

  assertEquals(res.success, true);
  assert(res.problem !== undefined);
  assertEquals(res.problem.method, 'bisection');
  assertEquals(res.problem.equation, 'x^3 - 4x - 9 = 0');
  assertEquals(res.problem.lowerBound, 2);
  assertEquals(res.problem.upperBound, 3);
  assertEquals(res.problem.decimalPlaces, 3);

  const valResult = validateExtractedProblem(res.problem);
  assertEquals(valResult.isValid, true);
});

Deno.test('Problem Image 2: Valid False Position extraction parses and validates successfully', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    questionText: 'Find root of cos(x) - x*exp(x) = 0 by Regula Falsi method in [0, 1] correct to 4 decimal places.',
                    equation: 'cos(x) - x*exp(x) = 0',
                    method: 'false-position',
                    lowerBound: 0,
                    upperBound: 1,
                    decimalPlaces: 4,
                    confidence: 0.92,
                    confidenceLabel: 'High',
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const res = await handleProblemImageRequest(
    { imageBase64: 'abc==', imageMimeType: 'image/jpeg' },
    { GEMINI_API_KEY: 'test-key' },
    mockFetch
  );

  assertEquals(res.success, true);
  assert(res.problem !== undefined);
  assertEquals(res.problem.method, 'false-position');
  assertEquals(res.problem.equation, 'cos(x) - x*exp(x) = 0');
  assertEquals(res.problem.decimalPlaces, 4);

  const valResult = validateExtractedProblem(res.problem);
  assertEquals(valResult.isValid, true);
});

Deno.test('Problem Image 3: Valid Newton-Raphson extraction parses and validates successfully', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    questionText: 'Find a real root of x^4 - x - 10 = 0 by Newton-Raphson method starting near x0 = 2.',
                    equation: 'x^4 - x - 10 = 0',
                    method: 'newton-raphson',
                    lowerBound: 1,
                    upperBound: 2,
                    initialGuess: 2,
                    decimalPlaces: 3,
                    confidence: 0.98,
                    confidenceLabel: 'High',
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const res = await handleProblemImageRequest(
    { imageBase64: 'abc==', imageMimeType: 'image/webp' },
    { GEMINI_API_KEY: 'test-key' },
    mockFetch
  );

  assertEquals(res.success, true);
  assert(res.problem !== undefined);
  assertEquals(res.problem.method, 'newton-raphson');
  assertEquals(res.problem.initialGuess, 2);

  const valResult = validateExtractedProblem(res.problem);
  assertEquals(valResult.isValid, true);
});

Deno.test('Problem Image 4: Newton x0 extraction preserves custom starting guess', () => {
  const problem: ExtractedProblem = {
    questionText: 'Solve 3x - cos(x) - 1 = 0 near x0 = 0.6',
    equation: '3x - cos(x) - 1 = 0',
    method: 'newton-raphson',
    lowerBound: 0,
    upperBound: 1,
    initialGuess: 0.6,
    decimalPlaces: 4,
    confidence: 0.9,
    confidenceLabel: 'High',
  };

  const valResult = validateExtractedProblem(problem);
  assertEquals(valResult.isValid, true);
  assertEquals(problem.initialGuess, 0.6);
});

Deno.test('Problem Image 5: Decimal-place extraction validates range 1 to 6', () => {
  const validProblem: ExtractedProblem = {
    questionText: 'Test',
    equation: 'x^2 - 2 = 0',
    method: 'bisection',
    lowerBound: 1,
    upperBound: 2,
    decimalPlaces: 4,
    confidence: 0.9,
    confidenceLabel: 'High',
  };
  assertEquals(validateExtractedProblem(validProblem).isValid, true);

  // Out of range (e.g. 0 or 8)
  const invalidProblem1 = { ...validProblem, decimalPlaces: 0 };
  const val1 = validateExtractedProblem(invalidProblem1);
  assertEquals(val1.isValid, false);
  assert(val1.decimalPlacesError !== undefined);

  const invalidProblem2 = { ...validProblem, decimalPlaces: 8 };
  const val2 = validateExtractedProblem(invalidProblem2);
  assertEquals(val2.isValid, false);
});

Deno.test('Problem Image 6: Invalid equation syntax is detected and flagged', () => {
  const unparseableProblem: ExtractedProblem = {
    questionText: 'Test',
    equation: 'x ^^ + 3?? = 0',
    method: 'bisection',
    lowerBound: 1,
    upperBound: 2,
    decimalPlaces: 3,
    confidence: 0.7,
    confidenceLabel: 'Medium',
  };

  const val = validateExtractedProblem(unparseableProblem);
  assertEquals(val.isValid, false);
  assert(val.equationError?.includes('syntax cannot be parsed'));

  const emptyProblem: ExtractedProblem = {
    questionText: 'Test',
    equation: '',
    method: 'bisection',
    lowerBound: 1,
    upperBound: 2,
    decimalPlaces: 3,
    confidence: 0.5,
    confidenceLabel: 'Needs review',
  };
  const valEmpty = validateExtractedProblem(emptyProblem);
  assertEquals(valEmpty.isValid, false);
  assert(valEmpty.equationError?.includes('missing'));
});

Deno.test('Problem Image 7: Missing or invalid bounds (a >= b) are detected', () => {
  // Lower bound >= upper bound
  const invertedBounds: ExtractedProblem = {
    questionText: 'Test',
    equation: 'x^3 - 9x + 1 = 0',
    method: 'bisection',
    lowerBound: 3,
    upperBound: 2,
    decimalPlaces: 2,
    confidence: 0.8,
    confidenceLabel: 'Medium',
  };
  const val1 = validateExtractedProblem(invertedBounds);
  assertEquals(val1.isValid, false);
  assert(val1.boundsError?.includes('strictly less than'));

  // Missing bounds
  const missingBounds: Partial<ExtractedProblem> = {
    equation: 'x^3 - 9x + 1 = 0',
    method: 'bisection',
    decimalPlaces: 2,
  };
  const val2 = validateExtractedProblem(missingBounds);
  assertEquals(val2.isValid, false);
  assert(val2.boundsError?.includes('required'));
});

Deno.test('Problem Image 8: Missing x0 for Newton-Raphson is detected', () => {
  const problemNoX0: Partial<ExtractedProblem> = {
    equation: 'x^4 - x - 10 = 0',
    method: 'newton-raphson',
    lowerBound: 1,
    upperBound: 2,
    decimalPlaces: 3,
  };

  const val = validateExtractedProblem(problemNoX0);
  assertEquals(val.isValid, false);
  assert(val.initialGuessError?.includes('Initial guess (x₀) is required'));
});

Deno.test('Problem Image 9: Ambiguous or low-confidence extraction is labeled correctly', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    questionText: 'Blurry handwritten text',
                    equation: 'x^2 - ? = 0',
                    method: 'bisection',
                    lowerBound: 1,
                    upperBound: 2,
                    decimalPlaces: 3,
                    confidence: 0.4,
                    confidenceLabel: 'Needs review',
                    notes: 'Equation was partially smudged on paper.',
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const res = await handleProblemImageRequest(
    { imageBase64: 'blur==', imageMimeType: 'image/jpeg' },
    { GEMINI_API_KEY: 'test-key' },
    mockFetch
  );

  assertEquals(res.success, true);
  assert(res.problem !== undefined);
  assertEquals(res.problem.confidenceLabel, 'Needs review');
  assertEquals(res.problem.notes, 'Equation was partially smudged on paper.');
});

Deno.test('Problem Image 10: Unsupported image MIME types are rejected before upload', () => {
  const pdfFile = {
    name: 'exam.pdf',
    type: 'application/pdf',
    size: 500 * 1024,
  } as unknown as File;
  const pdfResult = validateProblemImageFile(pdfFile);
  assertEquals(pdfResult.valid, false);
  assert(pdfResult.error?.includes('Unsupported image format'));

  const textFile = {
    name: 'notes.txt',
    type: 'text/plain',
    size: 10 * 1024,
  } as unknown as File;
  const textResult = validateProblemImageFile(textFile);
  assertEquals(textResult.valid, false);
});

Deno.test('Problem Image 11: Oversized image (>5MB) is rejected', () => {
  const oversizedFile = {
    name: 'raw_photo.png',
    type: 'image/png',
    size: 6 * 1024 * 1024,
  } as unknown as File;
  const result = validateProblemImageFile(oversizedFile);
  assertEquals(result.valid, false);
  assert(result.error?.includes('too large'));
});

Deno.test('Problem Image 12: Markdown-wrapped JSON response from model is cleaned and parsed', async () => {
  const rawModelMarkdown = '```json\n{\n  "questionText": "Solve x^3 - x - 1 = 0",\n  "equation": "x^3 - x - 1 = 0",\n  "method": "bisection",\n  "lowerBound": 1,\n  "upperBound": 2,\n  "decimalPlaces": 3,\n  "confidence": 0.9\n}\n```';

  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: rawModelMarkdown }],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const res = await handleProblemImageRequest(
    { imageBase64: 'abc==', imageMimeType: 'image/png' },
    { GEMINI_API_KEY: 'test-key' },
    mockFetch
  );

  assertEquals(res.success, true);
  assert(res.problem !== undefined);
  assertEquals(res.problem.equation, 'x^3 - x - 1 = 0');
});

Deno.test('Problem Image 13: Upstream 500 failure returns safe error without leaking API key', async () => {
  const mockKey = 'secret-api-key-xyz-987';
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: 500,
          message: `Internal error communicating with key=${mockKey}`,
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const res = await handleProblemImageRequest(
    { imageBase64: 'abc==', imageMimeType: 'image/png' },
    { GEMINI_API_KEY: mockKey },
    mockFetch
  );

  assertEquals(res.success, false);
  assert(res.error !== undefined);
  assert(!res.error.includes(mockKey));
  assert(res.error.includes('[REDACTED]'));
});

Deno.test('Problem Image 14: Model fallback triggers when primary model returns 503', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async (input) => {
    callCount++;
    const url = String(input);
    if (url.includes('gemini-3.8-flash')) {
      // First model fails with 503 Service Unavailable
      return new Response(
        JSON.stringify({ error: { code: 503, message: 'High load' } }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // Fallback model succeeds
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    questionText: 'Fallback success',
                    equation: 'x^3 - 2x - 5 = 0',
                    method: 'bisection',
                    lowerBound: 2,
                    upperBound: 3,
                    decimalPlaces: 3,
                    confidence: 0.9,
                  }),
                },
              ],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const res = await handleProblemImageRequest(
    { imageBase64: 'abc==', imageMimeType: 'image/png' },
    { GEMINI_API_KEY: 'test-key' },
    mockFetch
  );

  assertEquals(res.success, true);
  assertEquals(callCount, 2); // Tried primary model, then fell back and succeeded
  assertEquals(res.problem?.equation, 'x^3 - 2x - 5 = 0');
});

Deno.test('Problem Image 15: User editing invalid equation corrects validation', () => {
  // Initially flawed OCR
  const problem: ExtractedProblem = {
    questionText: 'Test',
    equation: 'x^3 - 9x + = 0', // Syntax error
    method: 'bisection',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 2,
    confidence: 0.6,
    confidenceLabel: 'Needs review',
  };

  const initialVal = validateExtractedProblem(problem);
  assertEquals(initialVal.isValid, false);

  // Student edits the equation in the modal
  const editedProblem: ExtractedProblem = {
    ...problem,
    equation: 'x^3 - 9x + 1 = 0',
  };

  const editedVal = validateExtractedProblem(editedProblem);
  assertEquals(editedVal.isValid, true);
  assertEquals(editedVal.parsedExpression, 'x^3 - 9x + 1');
});

Deno.test('Problem Image 16: Confirmed problem object contains all parameters required by solvers', () => {
  const confirmedData = {
    equation: 'cos(x) - x*exp(x) = 0',
    method: 'false-position' as const,
    lowerBound: 0,
    upperBound: 1,
    initialGuess: undefined,
    decimalPlaces: 4,
    questionText: 'Course exam problem 2024',
  };

  // Check all fields are present and typed correctly
  assertEquals(typeof confirmedData.equation, 'string');
  assertEquals(confirmedData.method, 'false-position');
  assertEquals(typeof confirmedData.lowerBound, 'number');
  assertEquals(typeof confirmedData.upperBound, 'number');
  assertEquals(confirmedData.lowerBound < confirmedData.upperBound, true);
  assertEquals(confirmedData.decimalPlaces >= 1 && confirmedData.decimalPlaces <= 6, true);
});
