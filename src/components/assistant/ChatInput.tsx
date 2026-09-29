import React, { useState } from 'react';
import { Send, Sparkles, Square } from 'lucide-react';
import { ImageInput } from './ImageInput.tsx';
import { VoiceInput } from './VoiceInput.tsx';
import { Button } from '../ui/Button.tsx';

import { AssistantSolverContext } from '../../services/assistant/types.ts';
import { LanguageMode } from '../../services/tutor/tutorTypes.ts';

interface ChatInputProps {
  onSendMessage: (text: string, imageFile?: File) => void;
  onStop?: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  attachedImageFile?: File | null;
  onSelectImage?: (file: File | null) => void;
  placeholder?: string;
  context?: AssistantSolverContext;
  languageMode?: LanguageMode;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onStop,
  isLoading = false,
  disabled = false,
  attachedImageFile: externalImageFile,
  onSelectImage: externalSelectImage,
  placeholder = 'Ask a question about this step or numerical method...',
  context,
  languageMode = 'english',
}) => {
  const [internalImageFile, setInternalImageFile] = useState<File | null>(null);
  const [inputText, setInputText] = useState<string>('');

  const activeImageFile = externalImageFile !== undefined ? externalImageFile : internalImageFile;
  const setActiveImageFile = externalSelectImage || setInternalImageFile;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || disabled) return;
    if (!inputText.trim() && !activeImageFile) return;

    onSendMessage(inputText.trim(), activeImageFile || undefined);
    setInputText('');
    baseInputRef.current = '';
    setActiveImageFile(null);
  };

  const baseInputRef = React.useRef<string>('');

  const handleListeningChange = (isListening: boolean) => {
    if (isListening) {
      baseInputRef.current = inputText.trim();
    } else {
      baseInputRef.current = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleTranscribe = (text: string, _isFinal?: boolean) => {
    const base = baseInputRef.current;
    const cleanSpeech = text.trim();
    if (!cleanSpeech) return;
    setInputText(base ? `${base} ${cleanSpeech}` : cleanSpeech);
  };

  const quickChips = React.useMemo(() => {
    const chips: string[] = [];
    if (context?.lastError) {
      chips.push(languageMode === 'hinglish' ? 'Mera answer galat kyu tha?' : 'Why was my answer wrong?');
    }
    chips.push(languageMode === 'hinglish' ? 'Ek hint do' : 'Give me a hint');
    chips.push(languageMode === 'hinglish' ? 'Agla step samjhao' : 'Explain the next step');
    if (languageMode === 'english') {
      chips.push('Explain in Hinglish');
    } else {
      chips.push('Explain in English');
    }
    chips.push('Compare Bisection vs Newton');
    chips.push(languageMode === 'hinglish' ? 'Formula kya hai?' : 'What is the formula?');
    return chips;
  }, [context?.lastError, languageMode]);

  const effectivePlaceholder = disabled
    ? 'AI tutor is paused during active assessment.'
    : activeImageFile
    ? 'Ask about this problem image...'
    : placeholder;

  return (
    <div className="space-y-2.5">
      {/* Quick Prompt Chips */}
      {!disabled && (
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {quickChips.map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setInputText(chip);
              }}
              disabled={isLoading || disabled}
              className="btn-press text-[11px] bg-bg-surface dark:bg-[#1E1430] hover:bg-bg-cream/60 dark:hover:bg-[#251A38] border border-border-soft dark:border-[#382952] hover:border-lavender-dusty px-2.5 py-1 rounded-me text-charcoal-muted dark:text-[#B0A7C2] hover:text-charcoal dark:hover:text-[#F3F0FA] transition-calm shrink-0 shadow-subtle"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Input container */}
      <div className="bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] focus-within:border-lavender-dusty dark:focus-within:border-lavender-accent rounded-me-lg p-2.5 shadow-subtle space-y-2">
        {/* Attached image preview if selected */}
        <ImageInput
          selectedFile={activeImageFile}
          onSelectImage={setActiveImageFile}
          disabled={isLoading || disabled}
        />

        {/* Text area */}
        <textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={effectivePlaceholder}
          rows={2}
          disabled={isLoading || disabled}
          className="w-full bg-transparent border-0 resize-none text-xs text-charcoal dark:text-[#F3F0FA] placeholder:text-charcoal-muted dark:placeholder:text-[#B0A7C2]/60 focus:ring-0 focus:outline-none p-1 leading-relaxed disabled:opacity-50"
          aria-label="Ask MathEngineer a question"
        />

        {/* Bottom controls bar: attach photo, voice, send */}
        <div className="flex items-center justify-between pt-1 border-t border-border-soft/50 dark:border-[#382952]">
          <div className="flex items-center gap-2">
            <VoiceInput
              onTranscribe={handleTranscribe}
              onListeningChange={handleListeningChange}
              disabled={isLoading || disabled}
            />
          </div>

          {isLoading ? (
            <Button
              variant="outline"
              size="sm"
              onClick={onStop}
              className="text-xs text-status-error dark:text-rose-400 border-status-error/40 hover:bg-status-error-bg/30 flex items-center gap-1.5 btn-press"
              title="Stop assistant response"
              aria-label="Stop response"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleSubmit()}
              disabled={disabled || (!inputText.trim() && !activeImageFile)}
              className="text-xs btn-press"
              title="Send question (Enter)"
              aria-label="Send question"
            >
              <span>Ask</span>
              <Send className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};
