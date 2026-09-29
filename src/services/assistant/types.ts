/**
 * Type Definitions for MathEngineer Conversational Assistant
 */

export interface AssistantSolverContext {
  questionId?: string;
  source?: 'image' | 'practice' | 'assessment' | 'review' | 'solve-manual' | 'learn';
  rawExtractedText?: string;
  method?: 'bisection' | 'false-position' | 'newton-raphson' | string;
  equation?: string;
  bounds?: [number, number];
  boundsSource?: 'supplied' | 'discovered' | 'manual' | 'missing';
  x0?: number;
  decimalPlaces?: number;
  currentStep?: string;
  currentIteration?: number;
  studentAnswer?: string | number;
  lastError?: string;
  currentLessonSection?: string;
  currentPage?: string;
  isAssessmentActive?: boolean;
  bracketDiscovery?: {
    a: number;
    b: number;
    fa: number;
    fb: number;
    explanation?: string[];
  };
  verifiedSolverOutput?: {
    converged: boolean;
    root?: number;
    formattedRoot?: string;
    iterationsCount: number;
    iterationsSummary: string;
    stoppingReason?: string;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: number;
  imageUrl?: string; // Data URL for preview
  imageName?: string;
  isError?: boolean;
  retryable?: boolean;
  contextSnapshot?: AssistantSolverContext;
}

export interface ChatRequestMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  imageBase64?: string;
  imageMimeType?: string;
}

export interface ChatRequestPayload {
  messages: ChatRequestMessage[];
  context?: AssistantSolverContext;
  tutorContext?: any;
  customSystemInstruction?: string;
}

export type ChatResponsePayload =
  | {
      success: true;
      reply: string;
      error?: undefined;
      retryable?: undefined;
      provider?: 'gemini' | 'openai' | 'none';
      modelUsed?: string;
      httpStatus?: number | null;
      diagnostic?: any;
      queryIntent?: string;
      citations?: string[];
    }
  | {
      success: false;
      reply?: undefined;
      error: string;
      retryable?: boolean;
      provider?: 'gemini' | 'openai' | 'none';
      modelUsed?: string;
      httpStatus?: number | null;
      diagnostic?: any;
      queryIntent?: string;
      citations?: string[];
    };

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'stopped';
