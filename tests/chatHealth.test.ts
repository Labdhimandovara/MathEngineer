import { assertEquals, assert } from 'jsr:@std/assert';
import { handleChatRequest } from '../src/services/assistant/chatHandler.ts';
import {
  validateImageFile,
  MAX_IMAGE_SIZE_BYTES,
} from '../src/services/assistant/assistantService.ts';

Deno.test('Chat Health 1: Successful text chat with mocked Gemini provider returns 200 JSON with reply', async () => {
  const mockFetch: typeof fetch = async (input, init) => {
    // Verify payload sent to Gemini
    const body = JSON.parse((init?.body as string) || '{}');
    assertEquals(body.contents.length, 1);
    assertEquals(body.contents[0].role, 'user');
    assertEquals(body.contents[0].parts[0].text, 'Explain Bisection method');

    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: 'The Bisection method iteratively halves the bracket [a, b].' }],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const res = await handleChatRequest(
    {
      messages: [{ role: 'user', content: 'Explain Bisection method' }],
    },
    { GEMINI_API_KEY: 'test-mock-key' },
    mockFetch
  );

  assertEquals(res.success, true);
  assertEquals(res.provider, 'gemini');
  assertEquals(res.reply, 'The Bisection method iteratively halves the bracket [a, b].');
});

Deno.test('Chat Health 2: Missing API key returns informative configuration message without crashing', async () => {
  const res = await handleChatRequest(
    {
      messages: [{ role: 'user', content: 'Hello' }],
    },
    { GEMINI_API_KEY: '', OPENAI_API_KEY: '' }
  );

  assertEquals(res.success, false);
  assertEquals(res.provider, 'none');
  assert(res.error?.includes('GEMINI_API_KEY'));
});

Deno.test('Chat Health 3: Malformed request (empty messages) returns error', async () => {
  const res = await handleChatRequest(
    {
      messages: [],
    },
    { GEMINI_API_KEY: 'test-mock-key' }
  );

  assertEquals(res.success, false);
  assertEquals(res.error, 'No messages provided in request.');
});

Deno.test('Chat Health 4: Upstream Gemini provider error (500 or 403) returns safe sanitized JSON error', async () => {
  const mockKey = 'secret-gemini-key-123';
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          code: 403,
          message: `API key ${mockKey} is invalid or expired.`,
          status: 'PERMISSION_DENIED',
        },
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const res = await handleChatRequest(
    {
      messages: [{ role: 'user', content: 'What is Newton-Raphson?' }],
    },
    { GEMINI_API_KEY: mockKey },
    mockFetch
  );

  assertEquals(res.success, false);
  assertEquals(res.provider, 'gemini');
  assert(res.error !== undefined);
  // Ensure the secret key was sanitized and never leaked!
  assert(!res.error.includes(mockKey));
  assert(res.error.includes('[REDACTED]'));
});

Deno.test('Chat Health 5: Invalid provider response (empty candidates) returns graceful error', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ candidates: [] }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const res = await handleChatRequest(
    {
      messages: [{ role: 'user', content: 'Hello' }],
    },
    { GEMINI_API_KEY: 'test-mock-key' },
    mockFetch
  );

  assertEquals(res.success, false);
  assertEquals(res.error, 'No reply received from Gemini model.');
});

Deno.test('Image Chat 1: Valid image payload is properly included in request to provider', async () => {
  let capturedBody: any = null;
  const mockFetch: typeof fetch = async (_input, init) => {
    capturedBody = JSON.parse((init?.body as string) || '{}');
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: 'I see a quadratic equation x^2 - 2 = 0 on graph paper.' }],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const res = await handleChatRequest(
    {
      messages: [
        {
          role: 'user',
          content: 'What is written here?',
          imageBase64: 'fakeBase64Data==',
          imageMimeType: 'image/png',
        },
      ],
    },
    { GEMINI_API_KEY: 'test-mock-key' },
    mockFetch
  );

  assertEquals(res.success, true);
  assertEquals(res.reply, 'I see a quadratic equation x^2 - 2 = 0 on graph paper.');
  assert(capturedBody !== null);
  const parts = capturedBody.contents[0].parts;
  assertEquals(parts.length, 2);
  assertEquals(parts[0].inline_data.mime_type, 'image/png');
  assertEquals(parts[0].inline_data.data, 'fakeBase64Data==');
});

Deno.test('Image Chat 2: Image validation helper rejects unsupported and oversized images', () => {
  // Mock File objects for test environment
  const validFile = {
    name: 'test.jpg',
    type: 'image/jpeg',
    size: 1024 * 1024, // 1 MB
  } as unknown as File;

  const invalidTypeFile = {
    name: 'test.pdf',
    type: 'application/pdf',
    size: 1024 * 1024,
  } as unknown as File;

  const oversizedFile = {
    name: 'large.png',
    type: 'image/png',
    size: MAX_IMAGE_SIZE_BYTES + 1024, // > 5 MB
  } as unknown as File;

  assertEquals(validateImageFile(validFile).valid, true);

  const invalidTypeRes = validateImageFile(invalidTypeFile);
  assertEquals(invalidTypeRes.valid, false);
  assert(invalidTypeRes.error?.includes('Unsupported image format'));

  const oversizedRes = validateImageFile(oversizedFile);
  assertEquals(oversizedRes.valid, false);
  assert(oversizedRes.error?.includes('too large'));
});

Deno.test('Chat Health 6: Upstream 503 triggers transparent fallback to next Gemini model', async () => {
  let attemptedModels: string[] = [];
  const mockFetch: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('gemini-3.8-flash')) {
      attemptedModels.push('gemini-3.8-flash');
      return new Response(
        JSON.stringify({ error: { code: 503, message: 'Model is currently overloaded' } }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }
    if (url.includes('gemini-3.5-flash')) {
      attemptedModels.push('gemini-3.5-flash');
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: 'Fallback reply from flash-3.5' }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('{}', { status: 404 });
  };

  const res = await handleChatRequest(
    {
      messages: [{ role: 'user', content: 'What is Newton-Raphson formula?' }],
    },
    { GEMINI_API_KEY: 'test-key' },
    mockFetch
  );

  assertEquals(res.success, true);
  assertEquals(res.reply, 'Fallback reply from flash-3.5');
  assertEquals(attemptedModels.includes('gemini-3.8-flash'), true);
  assertEquals(attemptedModels.includes('gemini-3.5-flash'), true);
});

Deno.test('Chat Health 7: Error responses maintain clean actionable message without fake initializing state', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        error: { code: 400, message: 'Invalid argument provided to Gemini API' },
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const res = await handleChatRequest(
    {
      messages: [{ role: 'user', content: 'Test question' }],
    },
    { GEMINI_API_KEY: 'test-key' },
    mockFetch
  );

  assertEquals(res.success, false);
  assert(res.error !== undefined);
  // Never falsely shows "Chat service is initializing"
  assert(!res.error.includes('initializing'));
  assert(res.error.includes('Invalid argument'));
});

