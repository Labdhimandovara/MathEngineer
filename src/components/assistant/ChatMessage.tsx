import React, { useState, useEffect } from 'react';
import { Volume2, Square, Copy, Check, Sparkles, User, AlertCircle, RotateCcw } from 'lucide-react';
import { ChatMessage as ChatMessageType } from '../../services/assistant/types.ts';
import {
  speakText,
  stopSpeaking,
  isSpeaking,
  isSpeechSynthesisSupported,
} from '../../services/assistant/speechService.ts';
import { formatMethodName } from '../../services/assistant/systemPrompt.ts';
import { formatMathForSpeech } from '../../services/tutor/voiceService.ts';

interface ChatMessageProps {
  message: ChatMessageType;
  onReadAloud?: (text: string) => void;
  onRetry?: () => void;
  onQuickAction?: (actionText: string) => void;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  onReadAloud,
  onRetry,
  onQuickAction,
}) => {
  const [copied, setCopied] = useState(false);
  const [isPlayingSpeech, setIsPlayingSpeech] = useState(false);
  const canSynthesize = isSpeechSynthesisSupported();

  // Defensive string-safety: ensure text is never an object or undefined
  const safeText =
    typeof message?.text === 'string'
      ? message.text
      : typeof (message as any)?.content === 'string'
      ? (message as any).content
      : typeof message?.text === 'object' && message?.text !== null
      ? JSON.stringify(message.text)
      : String(message?.text || 'MathEngineer could not display this message.');

  useEffect(() => {
    const interval = setInterval(() => {
      if (isPlayingSpeech && !isSpeaking()) {
        setIsPlayingSpeech(false);
      }
    }, 300);
    return () => clearInterval(interval);
  }, [isPlayingSpeech]);

  const handleCopy = () => {
    navigator.clipboard.writeText(safeText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleSpeak = () => {
    if (isPlayingSpeech) {
      stopSpeaking();
      setIsPlayingSpeech(false);
    } else {
      setIsPlayingSpeech(true);
      const textToSpeak = (message as any)?.speechText || formatMathForSpeech(safeText);
      speakText(textToSpeak, () => {
        setIsPlayingSpeech(false);
      });
      if (onReadAloud) onReadAloud(textToSpeak);
    }
  };

  const isUser = message?.role === 'user';
  const isError = Boolean(message?.isError);

  return (
    <div
      className={`flex gap-3 text-xs leading-relaxed animate-fadeIn ${
        isUser ? 'justify-end' : 'justify-start'
      }`}
    >
      {/* Assistant Avatar */}
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-lavender-light dark:bg-[#34244E] text-lavender-deep dark:text-[#C5B8EB] flex items-center justify-center shrink-0 border border-lavender-dusty dark:border-[#523A78] font-serif text-[11px] font-bold">
          ME
        </div>
      )}

      {/* Message Bubble Container */}
      <div
        className={`max-w-[85%] sm:max-w-[78%] rounded-me-lg p-3.5 space-y-2 shadow-subtle ${
          isError
            ? 'bg-status-error-bg dark:bg-[#2D1216]/60 border border-status-error/30 dark:border-rose-700/50 text-status-error dark:text-rose-300'
            : isUser
            ? 'bg-lavender-deep text-white border border-lavender-deep ml-auto shadow-subtle'
            : 'bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] text-charcoal dark:text-[#F3F0FA]'
        }`}
      >
        {/* Attached image preview if user uploaded one */}
        {message.imageUrl && (
          <div className="rounded overflow-hidden border border-white/20 mb-2">
            <img
              src={message.imageUrl}
              alt={message.imageName || 'Uploaded mathematics problem'}
              className="max-h-48 w-full object-contain bg-black/10"
            />
          </div>
        )}

        {/* Message Text with readable linebreaks */}
        <div className="whitespace-pre-wrap font-sans text-xs">
          {safeText}
        </div>

        {/* Context snapshot tag if present */}
        {message?.contextSnapshot?.method && !isUser && (
          <div className="text-[10px] text-charcoal-muted dark:text-[#B0A7C2] border-t border-border-soft/60 dark:border-[#382952] pt-1.5 flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold uppercase tracking-wider">Grounded in:</span>
            <span className="font-medium text-charcoal dark:text-[#F3F0FA]">
              {formatMethodName(message.contextSnapshot.method)}
              {message.contextSnapshot.source === 'image' ? ' — current image problem' : ''}
            </span>
            {message.contextSnapshot.equation && (
              <span className="font-mono text-charcoal-subtle dark:text-[#8D82A2]">({message.contextSnapshot.equation})</span>
            )}
          </div>
        )}

        {/* Action toolbar for assistant messages */}
        {!isUser && !isError && (
          <div className="flex items-center gap-2 pt-1 border-t border-border-soft/40 dark:border-[#382952]/60 text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">
            {canSynthesize && (
              <button
                type="button"
                onClick={handleToggleSpeak}
                className="flex items-center gap-1 hover:text-charcoal dark:hover:text-[#F3F0FA] transition-calm"
                title={isPlayingSpeech ? 'Stop reading aloud' : 'Read answer aloud'}
                aria-label={isPlayingSpeech ? 'Stop reading' : 'Read answer aloud'}
              >
                {isPlayingSpeech ? (
                  <>
                    <Square className="w-3 h-3 text-status-error fill-current" />
                    <span className="text-status-error font-medium">Stop</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3 h-3" />
                    <span>Read aloud</span>
                  </>
                )}
              </button>
            )}

            <span>•</span>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1 hover:text-charcoal dark:hover:text-[#F3F0FA] transition-calm"
              title="Copy message text"
              aria-label="Copy message"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-status-success dark:text-emerald-400" />
                  <span className="text-status-success dark:text-emerald-400 font-medium">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Action toolbar for assistant error messages (Retry) */}
        {!isUser && isError && typeof onRetry === 'function' && (
          <div className="flex items-center gap-2 pt-1 border-t border-status-error/20 text-[11px]">
            <button
              type="button"
              onClick={onRetry}
              className="flex items-center gap-1 font-semibold text-status-error dark:text-rose-400 hover:underline transition-calm"
              title="Try sending again"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Retry</span>
            </button>
          </div>
        )}

        {/* Quick Action buttons (for hints, formulas, fallbacks) */}
        {!isUser && (message as any)?.quickActions && (message as any).quickActions.length > 0 && typeof onQuickAction === 'function' && (
          <div className="pt-2 border-t border-border-soft/60 dark:border-[#382952] flex flex-wrap gap-1.5 animate-fadeIn">
            {((message as any).quickActions as string[]).map((action, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => onQuickAction(action)}
                className="btn-press px-2.5 py-1 rounded bg-bg-primary dark:bg-[#251A38] hover:bg-lavender-light/70 dark:hover:bg-[#34244E] border border-border-soft dark:border-[#382952] text-[11px] font-medium text-charcoal dark:text-[#F3F0FA] hover:text-lavender-deep dark:hover:text-[#C5B8EB] transition-calm cursor-pointer shadow-subtle"
              >
                {action}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* User Avatar */}
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-bg-neutral dark:bg-[#251A38] text-charcoal dark:text-[#F3F0FA] flex items-center justify-center shrink-0 border border-border-soft dark:border-[#382952] text-xs">
          <User className="w-3.5 h-3.5" />
        </div>
      )}
    </div>
  );
};
