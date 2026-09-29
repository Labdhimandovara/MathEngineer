/**
 * Shared Gemini Types & Diagnostic Interfaces
 * 
 * Provides safe, strict, categorized error classifications
 * and request/response specifications for Google Gemini models.
 */

export type GeminiErrorCategory =
  | 'bad-request'
  | 'auth'
  | 'model-not-found'
  | 'rate-limit'
  | 'server-unavailable'
  | 'network'
  | 'tls'
  | 'unknown';

export interface GeminiDiagnostic {
  provider: 'gemini';
  model: string;
  operation: 'chat' | 'problem-image' | 'diagnostic';
  httpStatus: number | null;
  errorCategory: GeminiErrorCategory | null;
  message: string;
}

export interface GeminiConfig {
  apiKey: string | null;
  model: string;
  fallbackModel: string | null;
  tls: string;
}

export interface GenerateTextOptions {
  messages: Array<{
    role: 'user' | 'assistant' | 'system' | 'model';
    content: string;
    imageBase64?: string;
    imageMimeType?: string;
  }>;
  systemInstruction?: string;
  temperature?: number;
  maxOutputTokens?: number;
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
}

export interface GenerateVisionOptions {
  imageBase64: string;
  imageMimeType: string;
  prompt?: string;
  systemInstruction?: string;
  temperature?: number;
  responseMimeType?: string;
  fetchFn?: typeof fetch;
  signal?: AbortSignal;
}

export interface GeminiGenerationResult {
  success: boolean;
  text?: string;
  error?: string;
  retryable: boolean;
  diagnostic: GeminiDiagnostic;
  modelUsed?: string;
}

export interface GeminiHealthStatus {
  provider: 'gemini';
  apiKeyPresent: boolean;
  configuredModel: string;
  fallbackModel: string | null;
  modelAvailable: boolean;
  canGenerate: boolean;
  canProcessImages: boolean;
  tls: string;
  error?: string;
}