/**
 * Speech Recognition and Speech Synthesis Service (Phase 13.3)
 * 
 * Uses standard browser Web Speech API with robust final/interim separation,
 * deduplication, and graceful fallback when unsupported.
 */

// Declare browser SpeechRecognition and SpeechSynthesis types safely for TypeScript & Deno
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
    speechSynthesis?: any;
    SpeechSynthesisUtterance?: any;
  }
}

export interface SpeechTranscriptData {
  finalTranscript: string;
  interimTranscript: string;
  combined: string;
  isFinal: boolean;
}

export interface SpeechRecognitionCallbacks {
  onResult: (data: SpeechTranscriptData) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

/**
 * Checks if the browser supports speech recognition
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Checks if the browser supports speech synthesis
 */
export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'speechSynthesis' in window && typeof (window as any).speechSynthesis?.speak === 'function';
}

let activeRecognitionInstance: any = null;

/**
 * Normalizes speech transcript:
 * - Collapses extra spaces
 * - Eliminates immediate repeated adjacent words/phrases caused by recognition engine stutter
 * - Preserves mathematical phrases and numbers intact
 */
export function normalizeVoiceTranscript(text: string): string {
  if (!text || typeof text !== 'string') return '';

  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,?!])/g, '$1')
    .trim();

  if (!cleaned) return '';

  const words = cleaned.split(' ');
  let i = 0;
  const result: string[] = [];

  while (i < words.length) {
    let matchedLen = 0;
    // Look ahead for repeated sequences of length from 12 down to 1
    const maxLen = Math.min(12, Math.floor((words.length - i) / 2));
    for (let len = maxLen; len >= 1; len--) {
      let isMatch = true;
      for (let k = 0; k < len; k++) {
        if (words[i + k].toLowerCase() !== words[i + len + k].toLowerCase()) {
          isMatch = false;
          break;
        }
      }
      if (isMatch) {
        matchedLen = len;
        break;
      }
    }

    if (matchedLen > 0) {
      for (let k = 0; k < matchedLen; k++) {
        result.push(words[i + k]);
      }
      i += matchedLen;
      // Skip any further consecutive identical repetitions of this sequence
      while (i + matchedLen <= words.length) {
        let isRepeat = true;
        for (let k = 0; k < matchedLen; k++) {
          if (words[i + k].toLowerCase() !== result[result.length - matchedLen + k].toLowerCase()) {
            isRepeat = false;
            break;
          }
        }
        if (isRepeat) {
          i += matchedLen;
        } else {
          break;
        }
      }
    } else {
      result.push(words[i]);
      i++;
    }
  }

  return result.join(' ').trim();
}

/**
 * Starts listening to the microphone and transcribes speech into text
 */
export function startSpeechRecognition(callbacks: SpeechRecognitionCallbacks): () => void {
  if (!isSpeechRecognitionSupported()) {
    callbacks.onError("Voice input isn't supported in this browser. You can type your question instead.");
    return () => {};
  }

  try {
    const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionClass();

    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const item = event.results[i];
        if (item && item[0]) {
          if (item.isFinal) {
            finalTranscript += (finalTranscript ? ' ' : '') + item[0].transcript.trim();
          } else {
            interimTranscript += (interimTranscript ? ' ' : '') + item[0].transcript.trim();
          }
        }
      }

      const cleanFinal = normalizeVoiceTranscript(finalTranscript);
      const cleanInterim = interimTranscript.trim();
      const combined = cleanFinal
        ? (cleanInterim ? `${cleanFinal} ${cleanInterim}` : cleanFinal)
        : cleanInterim;

      callbacks.onResult({
        finalTranscript: cleanFinal,
        interimTranscript: cleanInterim,
        combined: normalizeVoiceTranscript(combined),
        isFinal: event.results[event.results.length - 1]?.isFinal ?? false,
      });
    };

    recognition.onerror = (event: any) => {
      const err = event.error;
      let friendlyMessage = 'Voice input encountered an error. Please try again or type your question.';
      if (err === 'not-allowed') {
        friendlyMessage = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
      } else if (err === 'no-speech') {
        friendlyMessage = 'No speech was detected. Please try speaking again.';
      } else if (err === 'network') {
        friendlyMessage = 'Speech recognition requires a network connection.';
      }
      callbacks.onError(friendlyMessage);
    };

    recognition.onend = () => {
      activeRecognitionInstance = null;
      callbacks.onEnd();
    };

    activeRecognitionInstance = recognition;
    recognition.start();

    return () => {
      try {
        recognition.stop();
      } catch {
        // Ignore stop error if already stopped
      }
      activeRecognitionInstance = null;
    };
  } catch (err: any) {
    callbacks.onError(`Failed to start speech recognition: ${err?.message || err}`);
    return () => {};
  }
}

/**
 * Stops any active speech recognition
 */
export function stopSpeechRecognition(): void {
  if (activeRecognitionInstance) {
    try {
      activeRecognitionInstance.stop();
    } catch {
      // Ignore
    }
    activeRecognitionInstance = null;
  }
}

/**
 * Prepares mathematical and technical text for natural speech synthesis
 */
export function cleanTextForSpeech(text: string): string {
  return text
    // Replace f(x) with "f of x"
    .replace(/f\(([^)]+)\)/g, 'f of $1')
    // Replace x_(n+1) with "x sub n plus 1"
    .replace(/x_\(([^)]+)\)/g, (_, group) => `x sub ${group.replace(/\+/g, ' plus ')}`)
    .replace(/x_(\d+)/g, 'x sub $1')
    // Replace + sign
    .replace(/\+/g, ' plus ')
    // Replace markdown bold/italic
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    // Replace power signs ^2, ^3
    .replace(/\^2/g, ' squared')
    .replace(/\^3/g, ' cubed')
    .replace(/\^([0-9a-zA-Z]+)/g, ' to the power of $1')
    // Remove code ticks
    .replace(/`([^`]+)`/g, '$1')
    // Approximate sign
    .replace(/≈/g, ' approximately ')
    .replace(/·/g, ' times ')
    .replace(/≤/g, ' is less than or equal to ')
    .replace(/≥/g, ' is greater than or equal to ')
    .trim();
}

/**
 * Speaks text aloud using window.speechSynthesis
 */
export function speakText(text: string, onEnd?: () => void): void {
  if (!isSpeechSynthesisSupported()) return;

  stopSpeaking();

  const UtteranceClass = (window as any).SpeechSynthesisUtterance || (globalThis as any).SpeechSynthesisUtterance;
  if (!UtteranceClass) return;

  const cleaned = cleanTextForSpeech(text);
  const utterance = new UtteranceClass(cleaned);
  utterance.lang = 'en-US';
  utterance.rate = 1.0;
  utterance.pitch = 1.0;

  if (onEnd) {
    utterance.onend = () => onEnd();
    utterance.onerror = () => onEnd();
  }

  (window as any).speechSynthesis?.speak(utterance);
}

/**
 * Stops any active speech synthesis
 */
export function stopSpeaking(): void {
  if (isSpeechSynthesisSupported()) {
    try {
      (window as any).speechSynthesis?.cancel();
    } catch {
      // Ignore
    }
  }
}

/**
 * Checks if speech synthesis is currently speaking
 */
export function isSpeaking(): boolean {
  if (!isSpeechSynthesisSupported()) return false;
  return !!(window as any).speechSynthesis?.speaking;
}
