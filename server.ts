/**
 * Standalone Deno Production HTTP Server
 * 
 * Serves compiled static frontend assets from dist/ and handles POST /api/chat.
 */

import { handleChatRequest } from './src/services/assistant/chatHandler.ts';
import { handleProblemImageRequest } from './src/services/problemImage/problemImageHandler.ts';
import { checkGeminiHealth } from './src/services/gemini/geminiClient.ts';
import { handlePersistenceRequest } from './src/server/api/persistenceApi.ts';
import { runMigrations } from './src/server/db/migrations.ts';

const PORT = parseInt(Deno.env.get('PORT') || '8000', 10);

// Initialize DB schema and migrations on server boot
await runMigrations().catch((err) => {
  console.warn('Startup migration notice:', err?.message || err);
});

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

Deno.serve({ port: PORT }, async (req: Request) => {
  const url = new URL(req.url);

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // 1. Check Persistence API routes (problems, attempts, assessments, sync, preferences, image binaries)
  const persistenceResponse = await handlePersistenceRequest(req, url);
  if (persistenceResponse) {
    // Add CORS headers to persistence response
    for (const [key, value] of Object.entries(corsHeaders)) {
      persistenceResponse.headers.set(key, value);
    }
    return persistenceResponse;
  }

  // 1. Handle AI Status Diagnostic API
  const apiResponse = (data: unknown, status = 200) => {
    return new Response(JSON.stringify(data), {
      status,
      headers: {
        'Content-Type': 'application/json',
        ...corsHeaders,
      },
    });
  };

  // 1. Handle AI Status Diagnostic API
  if (url.pathname === '/api/ai-status' || url.pathname === '/api/ai-status/') {
    try {
      const status = await checkGeminiHealth();
      return apiResponse(status, 200);
    } catch (err: any) {
      return apiResponse({ provider: 'gemini', error: err?.message || 'Error checking AI status' }, 500);
    }
  }

  // 2. Handle Assistant API
  if (url.pathname === '/api/chat' || url.pathname === '/api/chat/') {
    if (req.method !== 'POST') {
      return apiResponse({ success: false, error: 'Method not allowed. Use POST.' }, 405);
    }

    try {
      const payload = await req.json();
      const result = await handleChatRequest(payload);
      return apiResponse(result, result.success ? 200 : (result.httpStatus || 500));
    } catch (err: any) {
      return apiResponse({ success: false, error: err?.message || 'Server error processing chat request.' }, 500);
    }
  }

  // 3. Handle Problem Image Extraction API
  if (url.pathname === '/api/problem-image' || url.pathname === '/api/problem-image/') {
    if (req.method !== 'POST') {
      return apiResponse({ success: false, error: 'Method not allowed. Use POST.' }, 405);
    }

    try {
      const payload = await req.json();
      const result = await handleProblemImageRequest(payload);
      return apiResponse(result, result.success ? 200 : (result.httpStatus || 500));
    } catch (err: any) {
      return apiResponse({ success: false, error: err?.message || 'Server error processing problem image.' }, 500);
    }
  }

  // 4. Handle Knowledge Status Diagnostic API
  if (url.pathname === '/api/knowledge-status' || url.pathname === '/api/knowledge-status/') {
    const status = getKnowledgeStatus();
    return apiResponse(status, 200);
  }

  // 5. Handle Knowledge Search Diagnostic API
  if (url.pathname === '/api/knowledge-search' || url.pathname === '/api/knowledge-search/') {
    if (req.method !== 'POST') {
      return apiResponse({ success: false, error: 'Method not allowed. Use POST.' }, 405);
    }

    try {
      const payload = await req.json();
      const results = searchKnowledge(payload.query || '', {
        method: payload.method,
        unit: payload.unit,
        topic: payload.topic,
        topK: payload.topK,
      });
      return apiResponse({ success: true, count: results.length, results }, 200);
    } catch (err: any) {
      return apiResponse({ success: false, error: err?.message || 'Knowledge search error' }, 500);
    }
  }

  // 2. Serve Static Assets from dist/
  let filePath = `./dist${url.pathname === '/' ? '/index.html' : url.pathname}`;
  try {
    const file = await Deno.readFile(filePath);
    let contentType = 'text/plain';
    if (filePath.endsWith('.html')) contentType = 'text/html';
    else if (filePath.endsWith('.js')) contentType = 'application/javascript';
    else if (filePath.endsWith('.css')) contentType = 'text/css';
    else if (filePath.endsWith('.png')) contentType = 'image/png';
    else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
    else if (filePath.endsWith('.svg')) contentType = 'image/svg+xml';
    else if (filePath.endsWith('.json')) contentType = 'application/json';

    return new Response(file, {
      status: 200,
      headers: { 'Content-Type': contentType },
    });
  } catch {
    // Single-page app fallback: serve index.html for unrecognized routes
    try {
      const indexHtml = await Deno.readFile('./dist/index.html');
      return new Response(indexHtml, {
        status: 200,
        headers: { 'Content-Type': 'text/html' },
      });
    } catch {
      return new Response('Not found', { status: 404 });
    }
  }
});
