import { defineConfig, Plugin, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { handleChatRequest } from './src/services/assistant/chatHandler.ts';
import { handleProblemImageRequest } from './src/services/problemImage/problemImageHandler.ts';
import { checkGeminiHealth } from './src/services/gemini/geminiClient.ts';
import { getKnowledgeStatus, searchKnowledge } from './src/services/knowledge/knowledgeService.ts';

function apiChatPlugin(env: Record<string, string>): Plugin {
  const chatMiddleware = (req: any, res: any, next: any) => {
    const rawUrl = (req.originalUrl || req.url || '').split('?')[0];

    // 1. Intercept /api/ai-status (Diagnostic health endpoint)
    if (rawUrl === '/api/ai-status' || rawUrl === '/api/ai-status/') {
      checkGeminiHealth(fetch, {
        GEMINI_API_KEY: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
      })
        .then((status) => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(status));
        })
        .catch((err) => {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              provider: 'gemini',
              error: err?.message || 'Error checking AI status',
            })
          );
        });
      return;
    }

    // 2. Intercept /api/chat
    if (rawUrl === '/api/chat' || rawUrl === '/api/chat/') {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }));
        return;
      }

      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const result = await handleChatRequest(payload, {
            GEMINI_API_KEY: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
            OPENAI_API_KEY: env.OPENAI_API_KEY || process.env.OPENAI_API_KEY,
          });

          res.statusCode = result.success ? 200 : (result.httpStatus || 500);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Server processing error' }));
        }
      });
      return;
    }

    // 3. Intercept /api/problem-image
    if (rawUrl === '/api/problem-image' || rawUrl === '/api/problem-image/') {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }));
        return;
      }

      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });

      req.on('end', async () => {
        try {
          const payload = JSON.parse(body || '{}');
          const result = await handleProblemImageRequest(payload, {
            GEMINI_API_KEY: env.GEMINI_API_KEY || process.env.GEMINI_API_KEY,
          });

          res.statusCode = result.success ? 200 : (result.httpStatus || 500);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Problem image extraction error' }));
        }
      });
      return;
    }

    // 4. Intercept /api/knowledge-status
    if (rawUrl === '/api/knowledge-status' || rawUrl === '/api/knowledge-status/') {
      const status = getKnowledgeStatus();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(status));
      return;
    }

    // 5. Intercept /api/knowledge-search
    if (rawUrl === '/api/knowledge-search' || rawUrl === '/api/knowledge-search/') {
      if (req.method !== 'POST') {
        res.statusCode = 405;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ success: false, error: 'Method not allowed. Use POST.' }));
        return;
      }

      let body = '';
      req.on('data', (chunk: any) => {
        body += chunk;
      });

      req.on('end', () => {
        try {
          const payload = JSON.parse(body || '{}');
          const results = searchKnowledge(payload.query || '', {
            method: payload.method,
            unit: payload.unit,
            topic: payload.topic,
            topK: payload.topK,
          });
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: true, count: results.length, results }));
        } catch (err: any) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ success: false, error: err?.message || 'Knowledge search error' }));
        }
      });
      return;
    }

    next();
  };

  return {
    name: 'api-chat-middleware',
    configureServer(server) {
      server.middlewares.use(chatMiddleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(chatMiddleware);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [react(), apiChatPlugin(env)],
    server: {
      port: 5173,
      host: true,
    },
    preview: {
      port: 4173,
      host: true,
    },
  };
});
