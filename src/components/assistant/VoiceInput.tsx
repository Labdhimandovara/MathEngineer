import React, { useState, useEffect } from 'react';
import { Mic, Square, AlertCircle, Loader2 } from 'lucide-react';
import {
  isSpeechRecognitionSupported,
  startSpeechRecognition,
  stopSpeechRecognition,
  SpeechTranscriptData,
} from '../../services/assistant/speechService.ts';
import { VoiceState } from '../../services/assistant/types.ts';

export interface VoiceInputProps {
  onTranscribe: (text: string, isFinal?: boolean) => void;
  onListeningChange?: (isListening: boolean) => void;
  disabled?: boolean;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({
  onTranscribe,
  onListeningChange,
  disabled = false,
}) => {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const supported = isSpeechRecognitionSupported();

  useEffect(() => {
    return () => {
      stopSpeechRecognition();
      onListeningChange?.(false);
    };
  }, []);

  const handleToggleListening = () => {
    if (disabled) return;
    setErrorMessage(null);

    if (voiceState === 'listening') {
      stopSpeechRecognition();
      setVoiceState('idle');
      onListeningChange?.(false);
      return;
    }

    if (!supported) {
      setErrorMessage("Voice input isn't supported in this browser. You can type your question instead.");
      return;
    }

    setVoiceState('listening');
    onListeningChange?.(true);

    startSpeechRecognition({
      onResult: (data: SpeechTranscriptData) => {
        if (data.combined.trim()) {
          onTranscribe(data.combined, data.isFinal);
        }
      },
      onError: (err: string) => {
        setErrorMessage(err);
        setVoiceState('idle');
        onListeningChange?.(false);
      },
      onEnd: () => {
        setVoiceState('idle');
        onListeningChange?.(false);
      },
    });
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        type="button"
        onClick={handleToggleListening}
        disabled={disabled}
        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-me border transition-calm ${
          voiceState === 'listening'
            ? 'bg-status-error text-white border-status-error animate-pulse'
            : 'bg-bg-surface text-charcoal-muted hover:text-charcoal border-border-soft hover:border-lavender-dusty'
        }`}
        title={
          !supported
            ? "Voice input isn't supported in this browser"
            : voiceState === 'listening'
            ? 'Listening... Click to stop'
            : 'Ask question by voice'
        }
        aria-label={voiceState === 'listening' ? 'Stop voice recording' : 'Start voice input'}
      >
        {voiceState === 'listening' ? (
          <>
            <Square className="w-3.5 h-3.5 fill-current" />
            <span className="font-medium">Stop</span>
          </>
        ) : (
          <>
            <Mic className="w-3.5 h-3.5 text-lavender-deep" />
            <span>Voice</span>
          </>
        )}
      </button>

      {/* Floating tooltip/alert if unsupported or error */}
      {errorMessage && (
        <div className="absolute bottom-full left-0 mb-2 w-64 p-2 bg-charcoal text-white text-[11px] rounded shadow-card z-50 flex items-start gap-1.5 animate-fadeIn">
          <AlertCircle className="w-3.5 h-3.5 text-status-warning shrink-0 mt-0.5" />
          <div className="flex-1">
            <p>{errorMessage}</p>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-[10px] text-white/70 hover:text-white underline pt-1 block"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
