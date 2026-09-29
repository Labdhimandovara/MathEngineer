/**
 * Shared Gemini Client Unit & Integration Test Suite
 * 
 * Verifies all requirements:
 * 1. Missing key diagnostic
 * 2. Key presence detection
 * 3. Configured model handling
 * 4. Invalid model (404) -> no fallback, categorized as model-not-found
 * 5. 400 bad request -> categorized as bad-request
 * 6. 401/403 auth error -> categorized as auth
 * 7. 404 model not found -> categorized as model-not-found
 * 8. 429 rate limit -> categorized as rate-limit
 * 9. 500 server unavailable -> categorized as server-unavailable
 * 10. 503 server unavailable -> triggers fallback to gemini-3.5-flash
 * 11. Network failure (fetch failed) -> categorized as network
 * 12. TLS failure (UnknownIssuer) -> categorized as tls
 * 13. Text generation success
 * 14. Vision generation success
 * 15. Data URL base64 stripping
 * 16. Malformed Gemini response handling
 * 17. Safe health check endpoint logic
 */

import { assertEquals, assertNotEquals, assert } from 'jsr:@std/assert';
import {
  getGeminiConfig,
  classifyGeminiError,
  sanitizeSecret,
  stripBase64Prefix,
  buildGeminiUrl,
  generateText,
  generateVision,
  checkGeminiHealth,
} from '../src/services/gemini/geminiClient.ts';
import { handleChatRequest } from '../src/services/assistant/chatHandler.ts';
import { handleProblemImageRequest } from '../src/services/problemImage/problemImageHandler.ts';

Deno.test('GeminiClient 1: Missing API key returns explicit server diagnostic', async () => {
  const result = await generateText(
    { messages: [{ role: 'user', content: 'Hello' }] },
    { GEMINI_API_KEY: '' }
  );

  assertEquals(result.success, false);
  assertEquals(result.diagnostic.errorCategory, 'auth');
  assertEquals(result.diagnostic.message, 'GEMINI_API_KEY is not available to the server process.');
  assertEquals(result.retryable, false);
});

Deno.test('GeminiClient 2: Config reads key, default model gemini-3.8-flash and fallback gemini-3.5-flash', () => {
  const config = getGeminiConfig({
    GEMINI_API_KEY: 'test-secret-key-12345',
  });

  assertEquals(config.apiKey, 'test-secret-key-12345');
  assertEquals(config.model, 'gemini-3.8-flash');
  assertEquals(config.fallbackModel, 'gemini-3.5-flash');
});

Deno.test('GeminiClient 3: buildGeminiUrl contains exactly one models/ prefix', () => {
  const url1 = buildGeminiUrl('gemini-3.8-flash', 'test-key');
  assertEquals(url1.includes('models/gemini-3.8-flash:generateContent'), true);
  assertEquals(url1.includes('models/models/'), false);

  const url2 = buildGeminiUrl('models/gemini-3.8-flash', 'test-key');
  assertEquals(url2.includes('models/gemini-3.8-flash:generateContent'), true);
  assertEquals(url2.includes('models/models/'), false);
});

Deno.test('GeminiClient 4: 400 Bad Request is categorized as bad-request without fallback', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response(JSON.stringify({ error: { code: 400, message: 'Invalid field' } }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await generateText(
    { messages: [{ role: 'user', content: 'Bad arg' }], fetchFn: mockFetch },
    { GEMINI_API_KEY: 'test-key' }
  );

  assertEquals(result.success, false);
  assertEquals(result.diagnostic.errorCategory, 'bad-request');
  assertEquals(result.diagnostic.httpStatus, 400);
  assertEquals(callCount, 1); // Never retried on 400
  assertEquals(result.retryable, false);
});

Deno.test('GeminiClient 5: 401 and 403 are categorized as auth without fallback', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response(JSON.stringify({ error: { code: 403, message: 'API key expired' } }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await generateText(
    { messages: [{ role: 'user', content: 'Auth test' }], fetchFn: mockFetch },
    { GEMINI_API_KEY: 'test-key' }
  );

  assertEquals(result.success, false);
  assertEquals(result.diagnostic.errorCategory, 'auth');
  assertEquals(result.diagnostic.httpStatus, 403);
  assertEquals(callCount, 1);
  assertEquals(result.retryable, false);
});

Deno.test('GeminiClient 6: 404 Model Not Found is categorized as model-not-found and NEVER falls back', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response(JSON.stringify({ error: { code: 404, message: 'models/gemini-foo not found' } }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await generateText(
    { messages: [{ role: 'user', content: 'Model test' }], fetchFn: mockFetch },
    { GEMINI_API_KEY: 'test-key' }
  );

  assertEquals(result.success, false);
  assertEquals(result.diagnostic.errorCategory, 'model-not-found');
  assertEquals(result.diagnostic.httpStatus, 404);
  assertEquals(callCount, 1); // No blind fallback on 404
  assertEquals(result.retryable, false);
});

Deno.test('GeminiClient 7: 429 Rate Limit is categorized as rate-limit and retries if fallback exists', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async (input) => {
    callCount++;
    const url = String(input);
    if (url.includes('gemini-3.8-flash')) {
      return new Response(JSON.stringify({ error: { code: 429, message: 'Resource exhausted' } }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text: 'Response from 3.5' }] } }],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const result = await generateText(
    { messages: [{ role: 'user', content: 'Rate test' }], fetchFn: mockFetch },
    { GEMINI_API_KEY: 'test-key' }
  );

  assertEquals(result.success, true);
  assertEquals(result.modelUsed, 'gemini-3.5-flash');
  assertEquals(callCount, 2);
});

Deno.test('GeminiClient 8: 503 Provider Unavailable falls back from gemini-3.8-flash to gemini-3.5-flash', async () => {
  const attemptedModels: string[] = [];
  const mockFetch: typeof fetch = async (input) => {
    const url = String(input);
    if (url.includes('gemini-3.8-flash')) {
      attemptedModels.push('gemini-3.8-flash');
      return new Response(JSON.stringify({ error: { code: 503, message: 'High load spike' } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.includes('gemini-3.5-flash')) {
      attemptedModels.push('gemini-3.5-flash');
      return new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Success from verified fallback gemini-3.5-flash' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    return new Response('{}', { status: 404 });
  };

  const result = await generateText(
    { messages: [{ role: 'user', content: 'Fallback test' }], fetchFn: mockFetch },
    { GEMINI_API_KEY: 'test-key' }
  );

  assertEquals(result.success, true);
  assertEquals(result.text, 'Success from verified fallback gemini-3.5-flash');
  assertEquals(result.modelUsed, 'gemini-3.5-flash');
  assertEquals(attemptedModels, ['gemini-3.8-flash', 'gemini-3.5-flash']);
});

Deno.test('GeminiClient 9: 500 Server Error categorized as server-unavailable', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(JSON.stringify({ error: { code: 500, message: 'Internal server error' } }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  const result = await generateText(
    { messages: [{ role: 'user', content: '500 test' }], fetchFn: mockFetch },
    { GEMINI_API_KEY: 'test-key' }
  );

  assertEquals(result.success, false);
  assertEquals(result.diagnostic.errorCategory, 'server-unavailable');
  assertEquals(result.diagnostic.httpStatus, 500);
});

Deno.test('GeminiClient 10: TLS Certificate failure is classified as tls error', () => {
  const tlsErr = classifyGeminiError(null, 'client error (Connect): invalid peer certificate: UnknownIssuer');
  assertEquals(tlsErr.category, 'tls');
  assertEquals(tlsErr.friendlyMessage.includes('TLS error'), true);
  assertEquals(tlsErr.retryable, false);
});

Deno.test('GeminiClient 11: Network connection failure is classified as network error', () => {
  const netErr = classifyGeminiError(null, 'TypeError: fetch failed (ECONNREFUSED)');
  assertEquals(netErr.category, 'network');
  assertEquals(netErr.friendlyMessage.includes('internet connection'), true);
  assertEquals(netErr.retryable, true);
});

Deno.test('GeminiClient 12: stripBase64Prefix removes data URL prefix while preserving raw base64', () => {
  const raw = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
  const dataUrl = `data:image/png;base64,${raw}`;

  assertEquals(stripBase64Prefix(dataUrl), raw);
  assertEquals(stripBase64Prefix(raw), raw);
  assertEquals(stripBase64Prefix(''), '');
});

Deno.test('GeminiClient 13: sanitizeSecret redacts keys and sensitive patterns', () => {
  const secretKey = 'my-secret-key-999';
  const rawMsg = `Failed with key=${secretKey} and raw ${secretKey}`;
  const sanitized = sanitizeSecret(rawMsg, secretKey);

  assertEquals(sanitized.includes(secretKey), false);
  assertEquals(sanitized.includes('[REDACTED]'), true);
});

Deno.test('GeminiClient 14: Vision generation sends raw base64 and receives structured output', async () => {
  let capturedBody: any = null;
  const mockFetch: typeof fetch = async (_input, init) => {
    capturedBody = JSON.parse(String(init?.body || '{}'));
    return new Response(
      JSON.stringify({
        candidates: [
          {
            content: {
              parts: [{ text: JSON.stringify({ equation: 'x^3 - x - 4 = 0', method: 'bisection', lowerBound: 1, upperBound: 2, decimalPlaces: 3 }) }],
            },
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const rawBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAAB';
  const result = await generateVision(
    {
      imageBase64: `data:image/jpeg;base64,${rawBase64}`,
      imageMimeType: 'image/jpeg',
      fetchFn: mockFetch,
    },
    { GEMINI_API_KEY: 'test-key' }
  );

  assertEquals(result.success, true);
  assert(capturedBody !== null);
  // Ensure the data URL was stripped to raw base64
  assertEquals(capturedBody.contents[0].parts[0].inline_data.data, rawBase64);
  assertEquals(capturedBody.contents[0].parts[0].inline_data.mime_type, 'image/jpeg');
});

Deno.test('GeminiClient 15: Malformed provider response (non-JSON) is handled gracefully', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response('<html>502 Bad Gateway</html>', {
      status: 200, // Broken proxy returning HTML on 200
      headers: { 'Content-Type': 'text/html' },
    });
  };

  const result = await generateText(
    { messages: [{ role: 'user', content: 'Ping' }], fetchFn: mockFetch },
    { GEMINI_API_KEY: 'test-key' }
  );

  assertEquals(result.success, false);
  assertEquals(result.diagnostic.errorCategory, 'bad-request');
  assertEquals(result.error?.includes('invalid response format'), true);
});

Deno.test('GeminiClient 16: checkGeminiHealth reports verified model capability without leaking secret', async () => {
  const mockFetch: typeof fetch = async () => {
    return new Response(
      JSON.stringify({
        models: [
          {
            name: 'models/gemini-3.8-flash',
            supportedGenerationMethods: ['generateContent'],
          },
          {
            name: 'models/gemini-3.5-flash',
            supportedGenerationMethods: ['generateContent'],
          },
        ],
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const health = await checkGeminiHealth(mockFetch, { GEMINI_API_KEY: 'test-secret-key-123' });

  assertEquals(health.provider, 'gemini');
  assertEquals(health.apiKeyPresent, true);
  assertEquals(health.configuredModel, 'gemini-3.8-flash');
  assertEquals(health.fallbackModel, 'gemini-3.5-flash');
  assertEquals(health.modelAvailable, true);
  assertEquals(health.canGenerate, true);
  assertEquals(health.canProcessImages, true);
  assertEquals((health as any).apiKey, undefined); // Never leaks secret
});

Deno.test('GeminiClient 17: Simulated 503 from gemini-3.8-flash triggers exactly one fallback to gemini-3.5-flash for /api/chat', async () => {
  const calledUrls: string[] = [];

  const mockFetch: typeof fetch = async (input) => {
    const url = String(input);
    calledUrls.push(url);

    if (url.includes('gemini-3.8-flash')) {
      // 1. gemini-3.8-flash returns 503
      return new Response(
        JSON.stringify({
          error: {
            code: 503,
            message: 'The model is overloaded. Please try again later.',
            status: 'UNAVAILABLE',
          },
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('gemini-3.5-flash')) {
      // 4. gemini-3.5-flash returns successfully
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: 'Bisection method cuts the search interval in half.' }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  };

  const response = await handleChatRequest(
    {
      messages: [{ role: 'user', content: 'Explain Bisection in one sentence.' }],
    },
    { GEMINI_API_KEY: 'mock-key-123' },
    mockFetch
  );

  // 3. Exactly one fallback attempt was made (total 2 calls)
  assertEquals(calledUrls.length, 2, 'Must make exactly two calls: primary then fallback');
  assert(calledUrls[0].includes('gemini-3.8-flash'), 'First call must be to primary gemini-3.8-flash');
  assert(calledUrls[1].includes('gemini-3.5-flash'), 'Second call must be to fallback gemini-3.5-flash');

  // 5. /api/chat ultimately returns HTTP 200
  assertEquals(response.httpStatus, 200);
  assertEquals(response.success, true);
  assertEquals(response.reply, 'Bisection method cuts the search interval in half.');

  // 7. Response identifies the model actually used internally
  assertEquals(response.modelUsed, 'gemini-3.5-flash');

  // 8. No retry loop (verified by calledUrls.length === 2)
});

Deno.test('GeminiClient 18: Simulated 503 from gemini-3.8-flash triggers fallback to gemini-3.5-flash for /api/problem-image', async () => {
  const calledUrls: string[] = [];

  const mockFetch: typeof fetch = async (input) => {
    const url = String(input);
    calledUrls.push(url);

    if (url.includes('gemini-3.8-flash')) {
      // 1. gemini-3.8-flash returns 503
      return new Response(
        JSON.stringify({
          error: {
            code: 503,
            message: 'Service Unavailable',
            status: 'UNAVAILABLE',
          },
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (url.includes('gemini-3.5-flash')) {
      // 4. gemini-3.5-flash returns successfully
      const jsonPayload = JSON.stringify({
        equation: 'x^3 - x - 4',
        method: 'bisection',
        lowerBound: 1,
        upperBound: 2,
        decimalPlaces: 3,
        confidence: 'high',
      });
      return new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: `\`\`\`json\n${jsonPayload}\n\`\`\`` }],
              },
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response('Not found', { status: 404 });
  };

  const response = await handleProblemImageRequest(
    {
      imageBase64: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
      imageMimeType: 'image/png',
    },
    { GEMINI_API_KEY: 'mock-key-123' },
    mockFetch
  );

  // 3. Exactly one fallback attempt was made (total 2 calls)
  assertEquals(calledUrls.length, 2, 'Must make exactly two calls: primary then fallback');
  assert(calledUrls[0].includes('gemini-3.8-flash'), 'First call must be to primary');
  assert(calledUrls[1].includes('gemini-3.5-flash'), 'Second call must be to fallback');

  // 6. /api/problem-image ultimately returns HTTP 200
  assertEquals(response.httpStatus, 200);
  assertEquals(response.success, true);
  assertEquals(response.problem?.equation, 'x^3 - x - 4');
  assertEquals(response.problem?.method, 'bisection');

  // 7. Response identifies the model actually used internally
  assertEquals(response.modelUsed, 'gemini-3.5-flash');
});

Deno.test('GeminiClient 19: Classification of 503 as server-unavailable and no retry loop when both models fail', async () => {
  const calledUrls: string[] = [];

  const mockFetch: typeof fetch = async (input) => {
    calledUrls.push(String(input));
    return new Response(
      JSON.stringify({ error: { code: 503, message: 'Google servers temporarily overloaded' } }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const result = await generateText(
    { messages: [{ role: 'user', content: 'Ping' }], fetchFn: mockFetch },
    { GEMINI_API_KEY: 'mock-key-123' }
  );

  assertEquals(result.success, false);
  // 2. Classifies as server-unavailable
  assertEquals(result.diagnostic.errorCategory, 'server-unavailable');
  assertEquals(result.diagnostic.httpStatus, 503);
  // 8. Exactly 2 calls (primary + 1 fallback), no infinite loop
  assertEquals(calledUrls.length, 2);
  assertEquals(result.retryable, true);
});

Deno.test('GeminiClient 20: Hard 404 does NOT trigger fallback attempt', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response(
      JSON.stringify({ error: { code: 404, message: 'models/gemini-3.8-flash not found' } }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const result = await generateText(
    { messages: [{ role: 'user', content: 'Ping' }], fetchFn: mockFetch },
    { GEMINI_API_KEY: 'mock-key-123' }
  );

  assertEquals(result.success, false);
  assertEquals(result.diagnostic.errorCategory, 'model-not-found');
  assertEquals(result.diagnostic.httpStatus, 404);
  // 9. Hard 404 does NOT trigger fallback
  assertEquals(callCount, 1, 'Hard 404 must NOT trigger fallback attempt');
  assertEquals(result.retryable, false);
});

Deno.test('GeminiClient 21: Hard authentication failure (401/403) does NOT trigger fallback', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response(
      JSON.stringify({ error: { code: 403, message: 'API key not valid. Please pass a valid API key.' } }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const result = await generateText(
    { messages: [{ role: 'user', content: 'Ping' }], fetchFn: mockFetch },
    { GEMINI_API_KEY: 'bad-key' }
  );

  assertEquals(result.success, false);
  assertEquals(result.diagnostic.errorCategory, 'auth');
  assertEquals(result.diagnostic.httpStatus, 403);
  // 10. Hard authentication failure does NOT trigger fallback
  assertEquals(callCount, 1, 'Hard auth error must NOT trigger fallback attempt');
  assertEquals(result.retryable, false);
});

Deno.test('GeminiClient 22: 429 quota/billing restriction does NOT blindly retry or fallback', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = async () => {
    callCount++;
    return new Response(
      JSON.stringify({
        error: {
          code: 429,
          message: 'Quota exceeded for quota metric GenerateContent requests per day. Please check your plan and billing details.',
          status: 'RESOURCE_EXHAUSTED',
        },
      }),
      { status: 429, headers: { 'Content-Type': 'application/json' } }
    );
  };

  const result = await generateText(
    { messages: [{ role: 'user', content: 'Ping' }], fetchFn: mockFetch },
    { GEMINI_API_KEY: 'mock-key-123' }
  );

  assertEquals(result.success, false);
  assertEquals(result.diagnostic.errorCategory, 'rate-limit');
  assertEquals(result.diagnostic.httpStatus, 429);
  // Quota/billing restriction must NOT retry or fallback
  assertEquals(callCount, 1, 'Exhausted quota/billing 429 must NOT blindly retry or fallback');
  assertEquals(result.retryable, false, 'Must mark retryable as false when quota or billing is exhausted');
});