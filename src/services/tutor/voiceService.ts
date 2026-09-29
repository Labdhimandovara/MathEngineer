/**
 * Voice Input & Speech Synthesis Service for AI Tutor (Phase 13)
 * 
 * Provides:
 * - Speech-to-Text input with robust error handling (permission, cancellation, unsupported)
 * - Text-to-Speech natural reading with mathematical pronunciation formatting
 * - Play/pause/stop state management
 * 
 * Speech output converts formulas and notation into student-friendly spoken language:
 * e.g. "x₁ = 1.871" -> "x one equals one point eight seven one"
 * e.g. "f'(x)" -> "f prime of x"
 */

import {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
  startSpeechRecognition as baseStartRecognition,
  stopSpeechRecognition as baseStopRecognition,
  speakText as baseSpeakText,
  stopSpeaking as baseStopSpeaking,
  isSpeaking as baseIsSpeaking,
  SpeechRecognitionCallbacks,
} from '../assistant/speechService.ts';

export {
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
};

/**
 * Enhanced mathematical pronunciation filter for Text-to-Speech
 */
export function formatMathForSpeech(text: string): string {
  if (!text || typeof text !== 'string') return '';

  return (
    text
      // Remove code blocks and inline ticks
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`([^`]+)`/g, '$1')
      // Remove markdown bold
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      // Remove Markdown headers and bullets
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/^[-*•]\s+/gm, '')
      // Remove JSON artifacts
      .replace(/\{[^{}]*\}/g, '')
      // Math: derivatives f'(x) -> f prime of x, f''(x) -> f double prime of x
      .replace(/f''\(([^)]+)\)/g, 'f double prime of $1')
      .replace(/f'\(([^)]+)\)/g, 'f prime of $1')
      .replace(/f'\s*([a-zA-Z0-9_]+)/g, 'f prime of $1')
      // Math: functions f(x), f(a), f(b), f(x_n)
      .replace(/f\(([^)]+)\)/g, 'f of $1')
      // Math: subscripts with expressions: x_(n+1), x_{n+1}
      .replace(/x_[({]([^)}]+)[)}]/g, (_, expr) => `x sub ${expr.replace(/\+/g, ' plus ').replace(/-/g, ' minus ')}`)
      // Math: subscripts with digits/letters: x_0, x_1, x_n, x_k
      .replace(/x_([a-zA-Z0-9]+)/g, 'x sub $1')
      .replace(/\bx([0-9]+)\b/g, 'x sub $1')
      // Math: Greek letters
      .replace(/α/g, 'alpha')
      .replace(/β/g, 'beta')
      .replace(/ξ/g, 'xi')
      // Math: Powers x^4 -> x to the fourth power, x^2 -> x squared, x^3 -> x cubed
      .replace(/x\^2/g, 'x squared')
      .replace(/x\^3/g, 'x cubed')
      .replace(/x\^4/g, 'x to the fourth power')
      .replace(/\^([0-9]+)/g, ' to the power of $1')
      // Math: Comparisons and operators
      .replace(/·/g, ' times ')
      .replace(/\*/g, ' times ')
      .replace(/≈/g, ' approximately ')
      .replace(/!=|≠/g, ' is not equal to ')
      .replace(/<=|≤/g, ' is less than or equal to ')
      .replace(/>=|≥/g, ' is greater than or equal to ')
      .replace(/</g, ' is less than ')
      .replace(/>/g, ' is greater than ')
      .replace(/=/g, ' equals ')
      .replace(/\+/g, ' plus ')
      .replace(/-/g, ' minus ')
      .replace(/\//g, ' over ')
      // Decimal numbers pronunciation clarity: "1.871" -> "1 point 8 7 1"
      .replace(/(\d+)\.(\d+)/g, (_, intPart, decPart) => {
        const spokenDec = decPart.split('').join(' ');
        return `${intPart} point ${spokenDec}`;
      })
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Starts speech recognition with cancellation and error callbacks
 */
export function startVoiceRecognition(callbacks: SpeechRecognitionCallbacks): () => void {
  return baseStartRecognition(callbacks);
}

/**
 * Stops ongoing speech recognition
 */
export function stopVoiceRecognition(): void {
  baseStopRecognition();
}

/**
 * Speaks text using browser SpeechSynthesis with natural math pronunciation
 */
export function speakTutorResponse(text: string, onEnd?: () => void): void {
  const speechText = formatMathForSpeech(text);
  baseSpeakText(speechText, onEnd);
}

/**
 * Stops ongoing speech synthesis
 */
export function stopTutorSpeech(): void {
  baseStopSpeaking();
}

/**
 * Checks whether speech synthesis is actively speaking
 */
export function isTutorSpeaking(): boolean {
  return baseIsSpeaking();
}
