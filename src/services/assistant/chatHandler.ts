/**
 * Server-Side Chat Handler
 * 
 * Securely handles /api/chat requests using the unified Gemini client.
 * Sourced entirely from server environment variables (GEMINI_API_KEY or OPENAI_API_KEY).
 * Never exposes secrets to frontend clients.
 */

import {
  buildSystemPrompt,
  buildGroundedSystemPrompt,
  formatEducationalReply,
} from './systemPrompt.ts';
import { buildTutorSystemPrompt } from '../tutor/tutorPrompt.ts';
import { ChatRequestPayload, ChatResponsePayload } from './types.ts';
import {
  generateText,
  getGeminiConfig,
  readEnvVar,
  sanitizeSecret,
  classifyGeminiError,
} from '../gemini/geminiClient.ts';
import { classifyQuery } from '../knowledge/queryClassifier.ts';
import { searchKnowledge } from '../knowledge/knowledgeService.ts';
import { runDeterministicSolver } from '../problem/deterministicSolverAdapter.ts';

// Re-export environment reader and sanitization for test compatibility
export const getEnvVariable = readEnvVar;

export function sanitizeError(msg: string, secret?: string): string {
  return sanitizeSecret(msg, secret);
}

export function mapProviderStatusToMessage(status: number): string {
  const classification = classifyGeminiError(status);
  return classification.friendlyMessage;
}

/**
 * Handles incoming chat payload and dispatches to configured AI provider
 */
export async function handleChatRequest(
  payload: ChatRequestPayload,
  envOverride?: { GEMINI_API_KEY?: string; OPENAI_API_KEY?: string },
  fetchFn: typeof fetch = fetch,
  signal?: AbortSignal
): Promise<ChatResponsePayload> {
  const geminiConfig = getGeminiConfig(envOverride);
  const openaiKey = envOverride?.OPENAI_API_KEY ?? readEnvVar('OPENAI_API_KEY');

  const messages = payload?.messages || [];

  if (!Array.isArray(messages) || messages.length === 0) {
    return {
      success: false,
      error: 'No messages provided in request.',
      retryable: false,
      httpStatus: 400,
    };
  }

  // Assessment Safety Check: If assessment is active, block AI tutor assistance & Gemini calls
  if (
    payload?.tutorContext?.interactionContext?.isAssessmentActive ||
    (payload?.context as any)?.isAssessmentActive
  ) {
    return {
      success: false,
      error: 'AI tutor is paused during active assessment. Complete the quiz to review explanations.',
      retryable: false,
      httpStatus: 403,
    };
  }

  // Ensure verified deterministic solver output is attached if active problem parameters are present
  if (
    payload?.context &&
    !payload.context.verifiedSolverOutput &&
    payload.context.equation &&
    payload.context.method
  ) {
    const methodStr = payload.context.method.toLowerCase();
    if (
      methodStr === 'false-position' ||
      methodStr === 'bisection' ||
      methodStr === 'newton-raphson'
    ) {
      const solverData = runDeterministicSolver({
        method: methodStr as any,
        equation: payload.context.equation,
        lowerBound: payload.context.bounds ? payload.context.bounds[0] : undefined,
        upperBound: payload.context.bounds ? payload.context.bounds[1] : undefined,
        initialGuess: payload.context.x0,
        decimalPlaces: payload.context.decimalPlaces || 3,
      });
      if (solverData.converged) {
        payload.context.verifiedSolverOutput = solverData;
      }
    }
  }

  const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
  const userQuery = lastUserMsg?.content || '';
  const classification = classifyQuery(userQuery, payload?.context);

  const citations: string[] = [];
  let systemInstruction: string;

  if (payload?.customSystemInstruction) {
    systemInstruction = payload.customSystemInstruction;
  } else if (payload?.tutorContext) {
    systemInstruction = buildTutorSystemPrompt(payload.tutorContext);
    if (payload.tutorContext.courseContext?.citations) {
      for (const c of payload.tutorContext.courseContext.citations) {
        if (!citations.includes(c)) citations.push(c);
      }
    }
  } else {
    // 0. Selective Course Grounding & Intent Classification
    systemInstruction = buildSystemPrompt(payload?.context);

    const isProblemExplanation =
      Boolean(payload?.context?.method) &&
      (userQuery.toLowerCase().includes('solve') ||
        userQuery.toLowerCase().includes('explain') ||
        userQuery.toLowerCase().includes('detail') ||
        userQuery.toLowerCase().includes('step') ||
        userQuery.toLowerCase().includes('root') ||
        classification.intent === 'SOLVER_EXPLANATION' ||
        classification.intent === 'CURRENT_PROBLEM' ||
        classification.intent === 'COURSE_SPECIFIC');

    if (classification.intent === 'COURSE_SPECIFIC' || isProblemExplanation) {
      // If active context has a method (especially from an image problem), it takes strict precedence
      const targetMethod =
        (payload?.context?.method as any) || classification.targetMethod;

      const searchQuery =
        classification.intent === 'COURSE_SPECIFIC'
          ? userQuery
          : `${targetMethod} method formula procedure steps`;

      const matches = searchKnowledge(searchQuery, {
        method: targetMethod,
        topK: 3,
        minScore: 15,
      });

      if (matches.length > 0) {
        systemInstruction = buildGroundedSystemPrompt(payload?.context, matches);
        for (const m of matches) {
          citations.push(m.source);
        }
      }
    }
  }

  // 1. Google Gemini Provider (Primary)
  if (geminiConfig.apiKey) {
    const result = await generateText(
      {
        messages,
        systemInstruction,
        temperature: 0.2, // Low temperature for mathematical precision
        maxOutputTokens: 1000,
        fetchFn,
        signal,
      },
      envOverride
    );

    if (result.success && result.text) {
      return {
        success: true,
        reply: formatEducationalReply(result.text),
        provider: 'gemini',
        modelUsed: result.modelUsed,
        httpStatus: 200,
        diagnostic: result.diagnostic,
        queryIntent: classification.intent,
        citations: citations.length > 0 ? citations : undefined,
      };
    }

    return {
      success: false,
      error: result.error || 'MathEngineer could not generate a response.',
      retryable: result.retryable,
      provider: 'gemini',
      modelUsed: result.modelUsed,
      httpStatus: result.diagnostic.httpStatus,
      diagnostic: result.diagnostic,
      queryIntent: classification.intent,
      citations: citations.length > 0 ? citations : undefined,
    };
  }

  // 2. OpenAI Provider (Secondary fallback if configured)
  if (openaiKey) {
    try {
      const openAiMessages: any[] = [
        { role: 'system', content: systemInstruction },
      ];

      for (const m of messages) {
        if (m.imageBase64 && m.imageMimeType) {
          openAiMessages.push({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: [
              { type: 'text', text: m.content || 'Please analyze this mathematics problem.' },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${m.imageMimeType};base64,${m.imageBase64}`,
                },
              },
            ],
          });
        } else {
          openAiMessages.push({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: m.content,
          });
        }
      }

      const res = await fetchFn('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${openaiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: openAiMessages,
          temperature: 0.2,
          max_tokens: 1000,
        }),
        signal,
      });

      if (!res.ok) {
        let errMessage = `OpenAI API returned status ${res.status}`;
        try {
          const errData = await res.json();
          if (errData?.error?.message) {
            errMessage = errData.error.message;
          }
        } catch {}
        return {
          success: false,
          error: sanitizeSecret(errMessage, openaiKey),
          provider: 'openai',
          httpStatus: res.status,
        };
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content;

      return {
        success: true,
        reply: formatEducationalReply(reply || ''),
        provider: 'openai',
        httpStatus: 200,
      };
    } catch (err: any) {
      return {
        success: false,
        error: sanitizeSecret(
          `Failed to communicate with OpenAI provider: ${err?.message || err}`,
          openaiKey
        ),
        provider: 'openai',
        httpStatus: 500,
      };
    }
  }

  // 3. Unconfigured fallback
  return {
    success: false,
    error:
      'MathEngineer Assistant is not configured yet on the server. Please set the GEMINI_API_KEY environment variable to enable AI tutor responses. You can continue using all deterministic numerical solvers.',
    provider: 'none',
    httpStatus: 503,
  };
}