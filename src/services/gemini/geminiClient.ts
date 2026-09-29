/**
 * Centralized Google Gemini Client & Diagnostic Engine
 * 
 * Provides unified, secure, server-side communication with Gemini APIs.
 * Supports primary model gemini-3.8-flash with verified gemini-3.5-flash fallback.
 * Strictly prevents secret leakage and categorizes errors deterministically.
 */

import {
  GeminiConfig,
  GeminiDiagnostic,
  GeminiErrorCategory,
  GeminiGenerationResult,
  GeminiHealthStatus,
  GenerateTextOptions,
  GenerateVisionOptions,
} from './geminiTypes.ts';

// Cached health check to prevent wasteful API roundtrips
let cachedHealth: { timestamp: number; data: GeminiHealthStatus } | null = null;
const HEALTH_CACHE_TTL_MS = 30 * 1000; // 30 seconds

/**
 * Safely extracts environment variables across Deno and Node environments
 */
export function readEnvVar(key: string): string | undefined {
  try {
    if (typeof (globalThis as any).Deno !== 'undefined' && (globalThis as any).Deno.env) {
      const val = (globalThis as any).Deno.env.get(key);
      if (val) return val;
    }
  } catch {
    // Permission restricted
  }

  try {
    if (typeof process !== 'undefined' && process.env) {
      const val = process.env[key];
      if (val) return val;
    }
  } catch {
    // Process env unavailable
  }

  try {
    if (typeof (globalThis as any).Deno !== 'undefined' && (globalThis as any).Deno.readTextFileSync) {
      const content = (globalThis as any).Deno.readTextFileSync('.env');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx !== -1) {
            const k = trimmed.slice(0, eqIdx).trim();
            const v = trimmed.slice(eqIdx + 1).trim();
            if (k === key) return v;
          }
        }
      }
    }
  } catch {
    // .env not accessible
  }

  return undefined;
}

/**
 * Returns current Gemini configuration sourced server-side only.
 * Never logs or exposes the API key.
 */
export function getGeminiConfig(envOverride?: {
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  GEMINI_FALLBACK_MODEL?: string;
}): GeminiConfig {
  const apiKey = envOverride?.GEMINI_API_KEY ?? readEnvVar('GEMINI_API_KEY') ?? null;
  const model =
    envOverride?.GEMINI_MODEL ??
    readEnvVar('GEMINI_MODEL') ??
    'gemini-3.8-flash';
  const fallbackModel =
    envOverride?.GEMINI_FALLBACK_MODEL ??
    readEnvVar('GEMINI_FALLBACK_MODEL') ??
    'gemini-3.5-flash';
  const tls = readEnvVar('DENO_TLS_CA_STORE') || 'system';

  return {
    apiKey,
    model,
    fallbackModel,
    tls,
  };
}

/**
 * Strips API keys, bearer tokens, and base64 payloads from error messages
 */
export function sanitizeSecret(text: string, secret?: string | null): string {
  if (!text) return '';
  let cleaned = text;
  if (secret) {
    cleaned = cleaned.split(secret).join('[REDACTED]');
  }
  // Generic Google API key pattern redact
  cleaned = cleaned.replace(/key=[^&\s]+/gi, 'key=[REDACTED]');
  cleaned = cleaned.replace(/AIza[0-9A-Za-z-_]{35}/g, '[REDACTED_API_KEY]');
  cleaned = cleaned.replace(/AQ\.[0-9A-Za-z-_]{45,60}/g, '[REDACTED_API_KEY]');
  return cleaned;
}

/**
 * Strips data URL prefixes from base64 strings so Google API receives raw base64
 */
export function stripBase64Prefix(base64: string): string {
  if (!base64) return '';
  return base64.replace(/^data:image\/[^;]+;base64,/, '').trim();
}

/**
 * Deterministically classifies provider failures into strict categories
 */
export function classifyGeminiError(
  status: number | null,
  rawMessage?: string,
  isTlsOrNet?: boolean
): { category: GeminiErrorCategory; friendlyMessage: string; retryable: boolean } {
  const msg = (rawMessage || '').toLowerCase();

  // 1. Check TLS / Certificate errors
  if (
    msg.includes('unknownissuer') ||
    msg.includes('invalid peer certificate') ||
    msg.includes('certificate') ||
    msg.includes('cert_') ||
    msg.includes('tls')
  ) {
    return {
      category: 'tls',
      friendlyMessage: 'A secure connection to Google Gemini could not be established (TLS error).',
      retryable: false,
    };
  }

  // 2. Network / connection errors
  if (
    status === null ||
    isTlsOrNet ||
    msg.includes('econnrefused') ||
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('etimedout')
  ) {
    return {
      category: 'network',
      friendlyMessage: 'Network connection to Google Gemini failed. Please check internet connection.',
      retryable: true,
    };
  }

  // 3. HTTP Status code mapping
  switch (status) {
    case 400:
      return {
        category: 'bad-request',
        friendlyMessage: 'The request could not be processed.',
        retryable: false,
      };
    case 401:
    case 403:
      return {
        category: 'auth',
        friendlyMessage: 'MathEngineer could not authenticate with the AI service.',
        retryable: false,
      };
    case 404:
      return {
        category: 'model-not-found',
        friendlyMessage: 'The configured AI model is unavailable.',
        retryable: false,
      };
    case 429: {
      const isQuotaOrBillingExhausted =
        msg.includes('quota') ||
        msg.includes('billing') ||
        msg.includes('plan') ||
        msg.includes('credit');
      return {
        category: 'rate-limit',
        friendlyMessage: isQuotaOrBillingExhausted
          ? 'MathEngineer AI quota has been reached for this account. Please check your plan or billing details.'
          : 'MathEngineer has reached the current AI request limit. Please try again later.',
        retryable: !isQuotaOrBillingExhausted,
      };
    }
    case 500:
      return {
        category: 'server-unavailable',
        friendlyMessage: 'Something went wrong. Please try again.',
        retryable: true,
      };
    case 503:
      return {
        category: 'server-unavailable',
        friendlyMessage: 'MathEngineer is temporarily busy. Please try again.',
        retryable: true,
      };
    default:
      return {
        category: 'unknown',
        friendlyMessage: 'Something went wrong. Please try again.',
        retryable: false,
      };
  }
}

/**
 * Builds the canonical Google REST generateContent URL ensuring exactly one `models/` prefix
 */
export function buildGeminiUrl(model: string, apiKey: string): string {
  // Strip any accidental leading 'models/' from model name
  const cleanModel = model.replace(/^models\//, '');
  return `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;
}

/**
 * Generates conversational or instructional text responses via Gemini
 */
export async function generateText(
  options: GenerateTextOptions,
  envOverride?: {
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    GEMINI_FALLBACK_MODEL?: string;
  }
): Promise<GeminiGenerationResult> {
  const config = getGeminiConfig(envOverride);
  const fetchFn = options.fetchFn ?? fetch;

  if (!config.apiKey) {
    const diagnostic: GeminiDiagnostic = {
      provider: 'gemini',
      model: config.model,
      operation: 'chat',
      httpStatus: null,
      errorCategory: 'auth',
      message: 'GEMINI_API_KEY is not available to the server process.',
    };
    return {
      success: false,
      error: 'Chat service is not configured. Please set GEMINI_API_KEY on the server.',
      retryable: false,
      diagnostic,
    };
  }

  // Build request payload
  const contents = options.messages.map((m) => {
    const role = m.role === 'assistant' || m.role === 'model' ? 'model' : 'user';
    const parts: any[] = [];

    if (m.imageBase64 && m.imageMimeType) {
      parts.push({
        inline_data: {
          mime_type: m.imageMimeType,
          data: stripBase64Prefix(m.imageBase64),
        },
      });
    }

    if (m.content && m.content.trim()) {
      parts.push({ text: m.content.trim() });
    }

    return { role, parts };
  });

  const bodyPayload: any = {
    contents,
    generationConfig: {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxOutputTokens ?? 1000,
    },
  };

  if (options.systemInstruction) {
    bodyPayload.system_instruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  // Model sequence: primary first. Fallback only on retryable server-unavailable (503) or rate-limit (429)
  const candidateModels = [config.model];
  if (config.fallbackModel && config.fallbackModel !== config.model) {
    candidateModels.push(config.fallbackModel);
  }

  let lastDiagnostic: GeminiDiagnostic = {
    provider: 'gemini',
    model: config.model,
    operation: 'chat',
    httpStatus: null,
    errorCategory: null,
    message: '',
  };
  let lastFriendlyError = 'MathEngineer could not generate a response.';
  let lastRetryable = false;

  for (let i = 0; i < candidateModels.length; i++) {
    const activeModel = candidateModels[i];
    const isPrimary = i === 0;

    try {
      const url = buildGeminiUrl(activeModel, config.apiKey);
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        signal: options.signal,
      });

      console.log(`[GeminiClient] POST /api/chat Model: ${activeModel} Status: ${res.status}`);

      if (!res.ok) {
        let errDetail = `Provider returned HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) {
            errDetail = sanitizeSecret(errJson.error.message, config.apiKey);
          }
        } catch {
          // ignore json parse error
        }

        const classification = classifyGeminiError(res.status, errDetail);
        lastDiagnostic = {
          provider: 'gemini',
          model: activeModel,
          operation: 'chat',
          httpStatus: res.status,
          errorCategory: classification.category,
          message: errDetail,
        };
        const resolvedError =
          errDetail && errDetail !== `Provider returned HTTP ${res.status}`
            ? errDetail
            : classification.friendlyMessage;
        lastFriendlyError = resolvedError;
        lastRetryable = classification.retryable;

        // ONLY fallback if temporary 503 or retryable 429 (not exhausted quota/billing) and another model exists
        if ((res.status === 503 || (res.status === 429 && classification.retryable)) && isPrimary && candidateModels.length > 1) {
          console.warn(`[GeminiClient] Temporary ${res.status} on ${activeModel}, attempting verified fallback ${candidateModels[1]}...`);
          continue;
        }

        return {
          success: false,
          error: lastFriendlyError,
          retryable: lastRetryable,
          diagnostic: lastDiagnostic,
          modelUsed: activeModel,
        };
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        lastDiagnostic = {
          provider: 'gemini',
          model: activeModel,
          operation: 'chat',
          httpStatus: 200,
          errorCategory: 'bad-request',
          message: 'Received non-JSON response from Gemini API.',
        };
        return {
          success: false,
          error: 'MathEngineer received an invalid response format from the AI service.',
          retryable: true,
          diagnostic: lastDiagnostic,
          modelUsed: activeModel,
        };
      }

      const candidates = Array.isArray(data?.candidates) ? data.candidates : [];
      const parts = Array.isArray(candidates[0]?.content?.parts) ? candidates[0].content.parts : [];
      const reply = parts[0]?.text;

      if (typeof reply !== 'string' || !reply.trim()) {
        lastDiagnostic = {
          provider: 'gemini',
          model: activeModel,
          operation: 'chat',
          httpStatus: 200,
          errorCategory: 'unknown',
          message: 'Empty candidate text in Gemini response.',
        };
        return {
          success: false,
          error: 'No reply received from Gemini model.',
          retryable: true,
          diagnostic: lastDiagnostic,
          modelUsed: activeModel,
        };
      }

      return {
        success: true,
        text: reply.trim(),
        retryable: false,
        modelUsed: activeModel,
        diagnostic: {
          provider: 'gemini',
          model: activeModel,
          operation: 'chat',
          httpStatus: 200,
          errorCategory: null,
          message: 'Success',
        },
      };
    } catch (err: any) {
      if (options.signal?.aborted) {
        return {
          success: false,
          error: 'Request was cancelled.',
          retryable: false,
          diagnostic: {
            provider: 'gemini',
            model: activeModel,
            operation: 'chat',
            httpStatus: null,
            errorCategory: 'unknown',
            message: 'Request aborted by client',
          },
        };
      }

      const rawMsg = err?.message || String(err);
      const sanitized = sanitizeSecret(rawMsg, config.apiKey);
      const classification = classifyGeminiError(null, sanitized, true);

      lastDiagnostic = {
        provider: 'gemini',
        model: activeModel,
        operation: 'chat',
        httpStatus: null,
        errorCategory: classification.category,
        message: sanitized,
      };
      lastFriendlyError = classification.friendlyMessage;
      lastRetryable = classification.retryable;

      // Only attempt fallback on network if primary
      if (isPrimary && candidateModels.length > 1 && classification.retryable) {
        continue;
      }

      break;
    }
  }

  return {
    success: false,
    error: lastFriendlyError,
    retryable: lastRetryable,
    diagnostic: lastDiagnostic,
  };
}

/**
 * Generates structured JSON or visual extraction from problem photos via Gemini
 */
export async function generateVision(
  options: GenerateVisionOptions,
  envOverride?: {
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    GEMINI_FALLBACK_MODEL?: string;
  }
): Promise<GeminiGenerationResult> {
  const config = getGeminiConfig(envOverride);
  const fetchFn = options.fetchFn ?? fetch;

  if (!config.apiKey) {
    const diagnostic: GeminiDiagnostic = {
      provider: 'gemini',
      model: config.model,
      operation: 'problem-image',
      httpStatus: null,
      errorCategory: 'auth',
      message: 'GEMINI_API_KEY is not available to the server process.',
    };
    return {
      success: false,
      error: 'Gemini Vision is not configured on the server. Please set GEMINI_API_KEY.',
      retryable: false,
      diagnostic,
    };
  }

  const rawBase64 = stripBase64Prefix(options.imageBase64);
  const bodyPayload: any = {
    contents: [
      {
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: options.imageMimeType,
              data: rawBase64,
            },
          },
          {
            text: options.prompt || 'Extract the mathematical problem specification from this image according to the system instructions. Output JSON only.',
          },
        ],
      },
    ],
    generationConfig: {
      temperature: options.temperature ?? 0.1,
      response_mime_type: options.responseMimeType ?? 'application/json',
    },
  };

  if (options.systemInstruction) {
    bodyPayload.system_instruction = {
      parts: [{ text: options.systemInstruction }],
    };
  }

  const candidateModels = [config.model];
  if (config.fallbackModel && config.fallbackModel !== config.model) {
    candidateModels.push(config.fallbackModel);
  }

  let lastDiagnostic: GeminiDiagnostic = {
    provider: 'gemini',
    model: config.model,
    operation: 'problem-image',
    httpStatus: null,
    errorCategory: null,
    message: '',
  };
  let lastFriendlyError = 'Failed to extract problem from image.';
  let lastRetryable = false;

  for (let i = 0; i < candidateModels.length; i++) {
    const activeModel = candidateModels[i];
    const isPrimary = i === 0;

    try {
      const url = buildGeminiUrl(activeModel, config.apiKey);
      const res = await fetchFn(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload),
        signal: options.signal,
      });

      console.log(`[GeminiClient] POST /api/problem-image Model: ${activeModel} Status: ${res.status}`);

      if (!res.ok) {
        let errDetail = `Provider returned HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson?.error?.message) {
            errDetail = sanitizeSecret(errJson.error.message, config.apiKey);
          }
        } catch {
          // ignore
        }

        const classification = classifyGeminiError(res.status, errDetail);
        lastDiagnostic = {
          provider: 'gemini',
          model: activeModel,
          operation: 'problem-image',
          httpStatus: res.status,
          errorCategory: classification.category,
          message: errDetail,
        };
        const resolvedError =
          errDetail && errDetail !== `Provider returned HTTP ${res.status}`
            ? errDetail
            : classification.friendlyMessage;
        lastFriendlyError = resolvedError;
        lastRetryable = classification.retryable;

        // ONLY fallback if temporary 503 or retryable 429 (not exhausted quota/billing) and another model exists
        if ((res.status === 503 || (res.status === 429 && classification.retryable)) && isPrimary && candidateModels.length > 1) {
          console.warn(`[GeminiClient] Temporary ${res.status} on ${activeModel}, attempting verified fallback ${candidateModels[1]}...`);
          continue;
        }

        return {
          success: false,
          error: lastFriendlyError,
          retryable: lastRetryable,
          diagnostic: lastDiagnostic,
          modelUsed: activeModel,
        };
      }

      let data: any;
      try {
        data = await res.json();
      } catch {
        lastDiagnostic = {
          provider: 'gemini',
          model: activeModel,
          operation: 'problem-image',
          httpStatus: 200,
          errorCategory: 'bad-request',
          message: 'Received non-JSON response from Vision AI service.',
        };
        return {
          success: false,
          error: 'MathEngineer received an invalid response format from the Vision AI service.',
          retryable: true,
          diagnostic: lastDiagnostic,
          modelUsed: activeModel,
        };
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText || typeof rawText !== 'string' || !rawText.trim()) {
        lastDiagnostic = {
          provider: 'gemini',
          model: activeModel,
          operation: 'problem-image',
          httpStatus: 200,
          errorCategory: 'unknown',
          message: 'No extraction text returned from Gemini Vision.',
        };
        return {
          success: false,
          error: 'No extraction text returned from Gemini Vision.',
          retryable: true,
          diagnostic: lastDiagnostic,
          modelUsed: activeModel,
        };
      }

      return {
        success: true,
        text: rawText.trim(),
        retryable: false,
        modelUsed: activeModel,
        diagnostic: {
          provider: 'gemini',
          model: activeModel,
          operation: 'problem-image',
          httpStatus: 200,
          errorCategory: null,
          message: 'Success',
        },
      };
    } catch (err: any) {
      if (options.signal?.aborted) {
        return {
          success: false,
          error: 'Image extraction was cancelled.',
          retryable: false,
          diagnostic: {
            provider: 'gemini',
            model: activeModel,
            operation: 'problem-image',
            httpStatus: null,
            errorCategory: 'unknown',
            message: 'Extraction aborted by client',
          },
        };
      }

      const rawMsg = err?.message || String(err);
      const sanitized = sanitizeSecret(rawMsg, config.apiKey);
      const classification = classifyGeminiError(null, sanitized, true);

      lastDiagnostic = {
        provider: 'gemini',
        model: activeModel,
        operation: 'problem-image',
        httpStatus: null,
        errorCategory: classification.category,
        message: sanitized,
      };
      lastFriendlyError = classification.friendlyMessage;
      lastRetryable = classification.retryable;

      if (isPrimary && candidateModels.length > 1 && classification.retryable) {
        continue;
      }

      break;
    }
  }

  return {
    success: false,
    error: lastFriendlyError,
    retryable: lastRetryable,
    diagnostic: lastDiagnostic,
  };
}

/**
 * Performs a safe health check on the Gemini integration without leaking keys
 */
export async function checkGeminiHealth(
  fetchFn: typeof fetch = fetch,
  envOverride?: {
    GEMINI_API_KEY?: string;
    GEMINI_MODEL?: string;
    GEMINI_FALLBACK_MODEL?: string;
  }
): Promise<GeminiHealthStatus> {
  const now = Date.now();
  if (cachedHealth && now - cachedHealth.timestamp < HEALTH_CACHE_TTL_MS) {
    return cachedHealth.data;
  }

  const config = getGeminiConfig(envOverride);

  if (!config.apiKey) {
    const status: GeminiHealthStatus = {
      provider: 'gemini',
      apiKeyPresent: false,
      configuredModel: config.model,
      fallbackModel: config.fallbackModel,
      modelAvailable: false,
      canGenerate: false,
      canProcessImages: false,
      tls: config.tls,
      error: 'GEMINI_API_KEY is not available to the server process.',
    };
    cachedHealth = { timestamp: now, data: status };
    return status;
  }

  try {
    const listUrl = `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`;
    const res = await fetchFn(listUrl);

    if (!res.ok) {
      const status: GeminiHealthStatus = {
        provider: 'gemini',
        apiKeyPresent: true,
        configuredModel: config.model,
        fallbackModel: config.fallbackModel,
        modelAvailable: false,
        canGenerate: false,
        canProcessImages: false,
        tls: config.tls,
        error: `Model check returned HTTP ${res.status}`,
      };
      cachedHealth = { timestamp: now, data: status };
      return status;
    }

    const data = await res.json();
    const models: any[] = Array.isArray(data?.models) ? data.models : [];
    const cleanConfigured = config.model.replace(/^models\//, '');
    const foundModel = models.find(
      (m: any) => m.name === `models/${cleanConfigured}` || m.name === cleanConfigured
    );

    const modelAvailable = !!foundModel;
    const canGenerate = !!foundModel?.supportedGenerationMethods?.includes('generateContent');
    const canProcessImages = modelAvailable && canGenerate;

    const status: GeminiHealthStatus = {
      provider: 'gemini',
      apiKeyPresent: true,
      configuredModel: config.model,
      fallbackModel: config.fallbackModel,
      modelAvailable,
      canGenerate,
      canProcessImages,
      tls: config.tls,
    };
    cachedHealth = { timestamp: now, data: status };
    return status;
  } catch (err: any) {
    const classification = classifyGeminiError(null, err?.message, true);
    const status: GeminiHealthStatus = {
      provider: 'gemini',
      apiKeyPresent: true,
      configuredModel: config.model,
      fallbackModel: config.fallbackModel,
      modelAvailable: false,
      canGenerate: false,
      canProcessImages: false,
      tls: config.tls,
      error: classification.friendlyMessage,
    };
    cachedHealth = { timestamp: now, data: status };
    return status;
  }
}