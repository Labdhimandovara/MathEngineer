/**
 * Client-Side Assistant Service
 * 
 * Orchestrates communication with the /api/chat endpoint.
 * Encapsulates image validation, base64 encoding, and context serialization.
 */

import {
  AssistantSolverContext,
  ChatMessage,
  ChatRequestMessage,
  ChatRequestPayload,
  ChatResponsePayload,
} from './types.ts';

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const SUPPORTED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates an image file before uploading
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No image file was provided.' };
  }

  if (!SUPPORTED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported image format (${file.type || 'unknown'}). Please upload a JPG, JPEG, PNG, or WEBP image.`,
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `Image file is too large (${sizeMb} MB). Maximum allowed size is 5 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Converts a browser File object to a base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Strip data URL prefix if present: "data:image/png;base64,..." -> "..."
      const commaIndex = result.indexOf(',');
      if (commaIndex !== -1) {
        resolve(result.substring(commaIndex + 1));
      } else {
        resolve(result);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

/**
 * Sanitizes solver context to guarantee JSON serializability
 */
function sanitizeContext(ctx?: AssistantSolverContext): AssistantSolverContext | undefined {
  if (!ctx || typeof ctx !== 'object') return undefined;
  try {
    return {
      questionId: typeof ctx.questionId === 'string' ? ctx.questionId : undefined,
      method: typeof ctx.method === 'string' ? ctx.method : undefined,
      equation: typeof ctx.equation === 'string' ? ctx.equation : undefined,
      bounds:
        Array.isArray(ctx.bounds) &&
        ctx.bounds.length === 2 &&
        typeof ctx.bounds[0] === 'number' &&
        typeof ctx.bounds[1] === 'number' &&
        isFinite(ctx.bounds[0]) &&
        isFinite(ctx.bounds[1])
          ? [ctx.bounds[0], ctx.bounds[1]]
          : undefined,
      x0: typeof ctx.x0 === 'number' && isFinite(ctx.x0) ? ctx.x0 : undefined,
      decimalPlaces:
        typeof ctx.decimalPlaces === 'number' && isFinite(ctx.decimalPlaces)
          ? ctx.decimalPlaces
          : undefined,
      currentStep: typeof ctx.currentStep === 'string' ? ctx.currentStep : undefined,
      currentIteration:
        typeof ctx.currentIteration === 'number' && isFinite(ctx.currentIteration)
          ? ctx.currentIteration
          : undefined,
      studentAnswer:
        typeof ctx.studentAnswer === 'string' || typeof ctx.studentAnswer === 'number'
          ? ctx.studentAnswer
          : undefined,
      lastError: typeof ctx.lastError === 'string' ? ctx.lastError : undefined,
      currentLessonSection:
        typeof ctx.currentLessonSection === 'string' ? ctx.currentLessonSection : undefined,
      currentPage: typeof ctx.currentPage === 'string' ? ctx.currentPage : undefined,
    };
  } catch {
    return undefined;
  }
}

/**
 * Sends a chat message with optional image and structured solver context
 */
export async function sendChatMessage(
  params: {
    messages: ChatMessage[];
    userText: string;
    imageFile?: File;
    context?: AssistantSolverContext;
  },
  signal?: AbortSignal
): Promise<ChatResponsePayload> {
  const { messages, userText, imageFile, context } = params;

  if (!userText.trim() && !imageFile) {
    return {
      success: false,
      error: 'Please enter a question or upload an image.',
      retryable: false,
    };
  }

  let imageBase64: string | undefined;
  let imageMimeType: string | undefined;

  if (imageFile) {
    const validation = validateImageFile(imageFile);
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error || 'Invalid image file.',
        retryable: false,
      };
    }

    try {
      imageBase64 = await fileToBase64(imageFile);
      imageMimeType = imageFile.type;
    } catch (err: any) {
      return {
        success: false,
        error: `Failed to read the image file: ${err?.message || err}`,
        retryable: false,
      };
    }
  }

  // Build the message history ensuring all content is string-safe
  const requestMessages: ChatRequestMessage[] = messages
    .filter((m) => !m.isError)
    .map((m) => ({
      role: m.role,
      content: typeof m.text === 'string' ? m.text : String(m.text || ''),
    }));

  // Append latest user message
  requestMessages.push({
    role: 'user',
    content: userText.trim(),
    imageBase64,
    imageMimeType,
  });

  const payload: ChatRequestPayload = {
    messages: requestMessages,
    context: sanitizeContext(context),
  };

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal,
    });

    if (!response.ok) {
      let errorMsg =
        response.status === 404
          ? 'The configured AI model or chat endpoint is unavailable.'
          : response.status === 503
          ? 'MathEngineer is temporarily busy. Please try again.'
          : response.status === 429
          ? 'MathEngineer has reached the current AI request limit. Please try again later.'
          : `Server returned status ${response.status}.`;

      try {
        const errJson = await response.json();
        if (typeof errJson?.error === 'string' && errJson.error.trim()) {
          errorMsg = errJson.error.trim();
        }
      } catch {
        // Fallback to errorMsg
      }

      console.warn('[Assistant Client] /api/chat error status:', response.status);

      return {
        success: false,
        error: errorMsg,
        retryable: response.status >= 500 || response.status === 429,
      };
    }

    let data: any;
    try {
      data = await response.json();
    } catch {
      return {
        success: false,
        error: 'MathEngineer received an invalid response from the chat server.',
        retryable: true,
      };
    }

    if (data?.success === true && typeof data?.reply === 'string' && data.reply.trim().length > 0) {
      return {
        success: true,
        reply: data.reply.trim(),
        provider: data.provider || 'gemini',
      };
    }

    return {
      success: false,
      error:
        typeof data?.error === 'string' && data.error.trim().length > 0
          ? data.error.trim()
          : 'MathEngineer could not generate a response.',
      retryable: true,
      provider: data?.provider,
    };
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      return {
        success: false,
        error: 'Request was cancelled.',
        retryable: false,
      };
    }

    console.warn('[Assistant Client] Network failure in sendChatMessage:', err?.message || err);

    return {
      success: false,
      error:
        'MathEngineer Assistant is temporarily unavailable. You can continue using the deterministic solver.',
      retryable: true,
    };
  }
}
