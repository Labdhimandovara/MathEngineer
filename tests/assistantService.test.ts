/**
 * Tests for Assistant Service, Context Serialization, Image Validation, and Speech Service
 */

import { assertEquals, assertNotEquals } from 'jsr:@std/assert';
import { buildSystemPrompt } from '../src/services/assistant/systemPrompt.ts';
import {
  validateImageFile,
  MAX_IMAGE_SIZE_BYTES,
  SUPPORTED_MIME_TYPES,
} from '../src/services/assistant/assistantService.ts';
import {
  cleanTextForSpeech,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
} from '../src/services/assistant/speechService.ts';
import { handleChatRequest } from '../src/services/assistant/chatHandler.ts';

Deno.test('Assistant 1: System prompt includes course authority and core principles', () => {
  const prompt = buildSystemPrompt();
  assertEquals(prompt.includes('Dr. Ram Kishun Lodhi'), true);
  assertEquals(prompt.includes('Symbiosis Institute of Technology'), true);
  assertEquals(prompt.includes('Bisection Method'), true);
  assertEquals(prompt.includes('False Position Method'), true);
  assertEquals(prompt.includes('Newton-Raphson Method'), true);
  assertEquals(prompt.includes('THE DETERMINISTIC SOLVER IS THE SINGLE SOURCE OF NUMERICAL TRUTH'), true);
});

Deno.test('Assistant 2: System prompt incorporates structured solver context snapshot', () => {
  const prompt = buildSystemPrompt({
    currentPage: 'solve',
    method: 'False Position Method',
    equation: 'cos(x) - x*exp(x) = 0',
    bounds: [0, 1],
    decimalPlaces: 4,
    currentStep: 'Interval Selection',
    currentIteration: 2,
    lastError: 'Selected [0, 0.5177] instead of [0.5177, 1]',
  });

  assertEquals(prompt.includes('Active Method: False Position Method'), true);
  assertEquals(prompt.includes('Active Equation: cos(x) - x*exp(x) = 0'), true);
  assertEquals(prompt.includes('Active Interval: [0, 1]'), true);
  assertEquals(prompt.includes('Target Accuracy: 4 decimal places'), true);
  assertEquals(prompt.includes('Current Student Step: Interval Selection'), true);
  assertEquals(prompt.includes('Selected [0, 0.5177] instead of [0.5177, 1]'), true);
});

Deno.test('Assistant 3: Image validation accepts JPG, PNG, and WEBP within 5MB', () => {
  for (const mime of SUPPORTED_MIME_TYPES) {
    const mockFile = new File(['mock content'], 'problem.jpg', { type: mime });
    const result = validateImageFile(mockFile);
    assertEquals(result.valid, true);
  }
});

Deno.test('Assistant 4: Image validation rejects unsupported MIME types (e.g. GIF, PDF)', () => {
  const gifFile = new File(['mock gif'], 'problem.gif', { type: 'image/gif' });
  const gifResult = validateImageFile(gifFile);
  assertEquals(gifResult.valid, false);
  assertEquals(gifResult.error?.includes('Unsupported image format'), true);

  const pdfFile = new File(['mock pdf'], 'problem.pdf', { type: 'application/pdf' });
  const pdfResult = validateImageFile(pdfFile);
  assertEquals(pdfResult.valid, false);
});

Deno.test('Assistant 5: Image validation rejects files exceeding 5MB', () => {
  // Create a 6MB dummy buffer
  const largeBuffer = new Uint8Array(6 * 1024 * 1024);
  const largeFile = new File([largeBuffer], 'large.png', { type: 'image/png' });
  const result = validateImageFile(largeFile);
  assertEquals(result.valid, false);
  assertEquals(result.error?.includes('too large'), true);
});

Deno.test('Assistant 6: Speech text cleaner converts math formulas to natural prose', () => {
  const cleaned1 = cleanTextForSpeech('We evaluate f(x) and compute x_(n+1) = (a + b)/2');
  assertEquals(cleaned1.includes('f of x'), true);
  assertEquals(cleaned1.includes('x sub n plus 1'), true);

  const cleaned2 = cleanTextForSpeech('x^2 - 4x + 4 ≈ 0');
  assertEquals(cleaned2.includes('x squared'), true);
  assertEquals(cleaned2.includes('approximately'), true);
});

Deno.test('Assistant 7: Speech API support checkers run safely without throwing in test environment', () => {
  // In Deno headless environment, window might not have Web Speech API, should safely return boolean
  const recSupported = isSpeechRecognitionSupported();
  const synthSupported = isSpeechSynthesisSupported();
  assertEquals(typeof recSupported, 'boolean');
  assertEquals(typeof synthSupported, 'boolean');
});

Deno.test('Assistant 8: Server chat handler cleanly returns unconfigured message when no API key set', async () => {
  // Test with explicit empty overrides
  const result = await handleChatRequest(
    {
      messages: [{ role: 'user', content: 'What is Bisection?' }],
    },
    { GEMINI_API_KEY: '', OPENAI_API_KEY: '' }
  );

  assertEquals(result.success, false);
  assertEquals(result.provider, 'none');
  assertEquals(result.error?.includes('MathEngineer Assistant is not configured yet'), true);
});

Deno.test('Assistant 9: Server chat handler rejects empty messages payload', async () => {
  const result = await handleChatRequest(
    { messages: [] },
    { GEMINI_API_KEY: '', OPENAI_API_KEY: '' }
  );
  assertEquals(result.success, false);
  assertEquals(result.error?.includes('No messages provided'), true);
});
