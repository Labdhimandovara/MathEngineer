import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  X,
  Sparkles,
  Bot,
  RotateCcw,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  AssistantSolverContext,
  ChatMessage as ChatMessageType,
} from '../../services/assistant/types.ts';
import { sendChatMessage } from '../../services/assistant/assistantService.ts';
import { formatMethodName } from '../../services/assistant/systemPrompt.ts';
import { useLanguageMode } from '../../services/tutor/languageMode.ts';
import { askTutor } from '../../services/tutor/tutorService.ts';
import {
  getActiveAssistantContext,
  useActiveAssistantContext,
} from '../../services/problem/activeProblemStore.ts';
import { ChatMessage } from './ChatMessage.tsx';
import { ChatInput } from './ChatInput.tsx';
import { Badge } from '../ui/Badge.tsx';

interface MathAssistantProps {
  context?: AssistantSolverContext;
  isOpen: boolean;
  onToggle: () => void;
  externalAttachedImage?: File | null;
  onClearExternalAttachedImage?: () => void;
}

export const MathAssistant: React.FC<MathAssistantProps> = ({
  context,
  isOpen,
  onToggle,
  externalAttachedImage = null,
  onClearExternalAttachedImage,
}) => {
  const { languageMode, toggleMode } = useLanguageMode();
  const liveContext = useActiveAssistantContext(context?.currentPage);
  const activeContext = liveContext || context;
  const [messages, setMessages] = useState<ChatMessageType[]>([
    {
      id: 'welcome-msg',
      role: 'assistant',
      text:
        'Hello! I am your MathEngineer tutor. Ask me anything about numerical methods, course formulas, why a step was taken, or upload a photo of a problem to inspect.',
      timestamp: Date.now(),
    },
  ]);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [attachedImage, setAttachedImage] = useState<File | null>(null);
  const [lastFailedInput, setLastFailedInput] = useState<{ text: string; file?: File } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRequestIdRef = useRef<number>(0);
  const timeoutRef = useRef<any>(null);

  // Sync external attached image
  useEffect(() => {
    if (externalAttachedImage) {
      setAttachedImage(externalAttachedImage);
    }
  }, [externalAttachedImage]);

  // Clean up in-flight requests and timers on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsLoading(false);
  };

  const handleSendMessage = async (text: string, file?: File) => {
    const userImageFile = file || attachedImage || undefined;
    let previewDataUrl: string | undefined;

    if (userImageFile) {
      previewDataUrl = URL.createObjectURL(userImageFile);
    }

    const newUserMsg: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      text,
      timestamp: Date.now(),
      imageUrl: previewDataUrl,
      imageName: userImageFile?.name,
      contextSnapshot: context,
    };

    setMessages((prev) => [...prev, newUserMsg]);
    setIsLoading(true);
    setAttachedImage(null);
    if (onClearExternalAttachedImage) onClearExternalAttachedImage();

    // Increment request ID to ignore stale responses
    const currentRequestId = ++activeRequestIdRef.current;

    // Cancel any previous in-flight assistant request
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Safety timeout: 20 seconds maximum
    const timeoutId = setTimeout(() => {
      if (activeRequestIdRef.current === currentRequestId && !controller.signal.aborted) {
        controller.abort();
        setIsLoading(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `timeout-${Date.now()}`,
            role: 'assistant',
            text: 'The request took longer than expected. You can try again or use the quick actions below.',
            timestamp: Date.now(),
            isError: true,
            retryable: true,
            quickActions: ['Give me a hint', 'Explain the formula', 'Try again'],
          } as any,
        ]);
      }
    }, 20000);
    timeoutRef.current = timeoutId;

    try {
      // Call tutor service with language mode and context
      const response = await askTutor(
        {
          query: text,
          conversationHistory: [...messages, newUserMsg],
          imageFile: userImageFile,
          languageMode,
          currentPage: context?.currentPage,
          isAssessmentActive: context?.isAssessmentActive,
        },
        { signal: controller.signal }
      );

      if (activeRequestIdRef.current !== currentRequestId || controller.signal.aborted) {
        return;
      }

      if (response.success && response.reply) {
        setLastFailedInput(null);

        // Authoritative resolution of grounding context (Phase 13.5 Stale Context Fix)
        // Ensures response's actual method and equation strictly override any stale parent props
        const latestContext = getActiveAssistantContext(context?.currentPage);
        const resolvedMethod = response.groundedInMethod || latestContext?.method || context?.method;
        const resolvedEquation =
          (response as any).groundedEquation || latestContext?.equation || context?.equation;
        const resolvedSource =
          (response as any).groundedSource ||
          (response.groundedInProblem?.startsWith('img_') ? 'image' : latestContext?.source || context?.source);
        const resolvedQuestionId =
          response.groundedInProblem || latestContext?.questionId || context?.questionId;

        const effectiveSnapshot: AssistantSolverContext = {
          ...context,
          ...latestContext,
          method: resolvedMethod as any,
          equation: resolvedEquation,
          source: resolvedSource as any,
          questionId: resolvedQuestionId,
        };

        const assistantMsg: ChatMessageType = {
          id: `assistant-${Date.now()}`,
          role: 'assistant',
          text: response.reply,
          timestamp: Date.now(),
          contextSnapshot: effectiveSnapshot,
          ...(response.speechText ? { speechText: response.speechText } : {}),
          ...(response.quickActions ? { quickActions: response.quickActions } : {}),
        } as any;
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        setLastFailedInput({ text, file: userImageFile });
        const fallbackQuickActions = response.quickActions || [
          'Give me a hint',
          'Explain the formula',
          'Explain the next step',
          'Try again',
        ];
        const errorMsg: ChatMessageType = {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text:
            typeof response.reply === 'string' && response.reply.trim()
              ? response.reply.trim()
              : typeof response.error === 'string' && response.error.trim()
              ? response.error.trim()
              : 'AI Tutor is temporarily unavailable. Try one of the quick actions below, or continue solving without AI.',
          timestamp: Date.now(),
          isError: !context?.isAssessmentActive,
          retryable: response.retryable ?? true,
          quickActions: fallbackQuickActions,
        } as any;
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err: any) {
      if (activeRequestIdRef.current !== currentRequestId || controller.signal.aborted) {
        return;
      }
      setLastFailedInput({ text, file: userImageFile });
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          text: 'MathEngineer Assistant is temporarily unavailable. You can continue using the deterministic solver.',
          timestamp: Date.now(),
          isError: true,
          retryable: true,
        },
      ]);
    } finally {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (activeRequestIdRef.current === currentRequestId) {
        setIsLoading(false);
      }
    }
  };

  const handleRetry = () => {
    if (lastFailedInput && !isLoading) {
      // Remove trailing error message before re-trying
      setMessages((prev) => prev.filter((m) => !m.isError));
      handleSendMessage(lastFailedInput.text, lastFailedInput.file);
    }
  };

  const handleClearHistory = () => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setLastFailedInput(null);
    setMessages([
      {
        id: `reset-${Date.now()}`,
        role: 'assistant',
        text: 'Conversation reset. What can I help you understand next?',
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button (when closed) */}
      {!isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-40 bg-lavender-deep hover:bg-lavender-deep/90 text-white rounded-full px-4 py-3 shadow-lg flex items-center gap-2 text-xs font-semibold tracking-wide transition-all hover:scale-105 focus-ring btn-press"
          aria-label="Open MathEngineer Assistant"
        >
          <MessageSquare className="w-4 h-4 fill-current" />
          <span>Ask MathEngineer</span>
        </button>
      )}

      {/* Floating / Slide-out Drawer Panel (when open) */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="MathEngineer Conversational Assistant"
          className="fixed bottom-4 right-4 z-50 w-full sm:w-[420px] h-[580px] max-h-[90vh] bg-bg-surface dark:bg-[#181124] border border-border-soft dark:border-[#382952] rounded-me-lg shadow-2xl flex flex-col overflow-hidden animate-fadeIn"
        >
          {/* Header */}
          <div className="p-3.5 bg-bg-cream/50 dark:bg-[#1F162E] border-b border-border-soft dark:border-[#382952] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-lavender-light dark:bg-[#34244E] text-lavender-deep dark:text-[#C5B8EB] flex items-center justify-center font-serif text-xs font-bold border border-lavender-dusty dark:border-[#523A78]">
                ME
              </div>
              <div>
                <h3 className="text-xs font-semibold text-charcoal dark:text-[#F3F0FA]">
                  MathEngineer Assistant
                </h3>
                <span className="text-[10px] text-charcoal-muted dark:text-[#B0A7C2] block">
                  Calm Numerical Methods Tutor
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={toggleMode}
                className={`btn-press px-2 py-0.5 text-[10px] font-semibold tracking-wider rounded border transition-calm ${
                  languageMode === 'hinglish'
                    ? 'bg-lavender-deep text-white border-lavender-deep shadow-xs'
                    : 'bg-bg-surface dark:bg-[#251A38] text-charcoal dark:text-[#F3F0FA] border-border-soft dark:border-[#382952] hover:border-lavender-dusty'
                }`}
                title={`Language: ${languageMode === 'english' ? 'English (Click for Hinglish)' : 'Hinglish (Click for English)'}`}
                aria-label={`Toggle language mode. Current: ${languageMode}`}
              >
                {languageMode === 'english' ? 'ENG' : 'HINGLISH'}
              </button>
              <button
                type="button"
                onClick={handleClearHistory}
                className="p-1.5 rounded text-charcoal-muted dark:text-[#B0A7C2] hover:text-charcoal dark:hover:text-[#F3F0FA] hover:bg-bg-surface dark:hover:bg-[#251A38] transition-calm btn-press"
                title="Restart chat"
                aria-label="Clear chat history"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={onToggle}
                className="p-1.5 rounded text-charcoal-muted dark:text-[#B0A7C2] hover:text-charcoal dark:hover:text-[#F3F0FA] hover:bg-bg-surface dark:hover:bg-[#251A38] transition-calm btn-press"
                title="Close chat"
                aria-label="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Assessment Paused Banner */}
          {context?.isAssessmentActive && (
            <div className="px-3.5 py-2 bg-amber-500/10 dark:bg-amber-950/40 border-b border-amber-500/20 dark:border-amber-700/30 text-amber-900 dark:text-amber-300 text-xs flex items-center gap-2 shrink-0">
              <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-[11px] leading-tight">
                AI tutor is paused during active assessment. Complete the quiz to review explanations.
              </span>
            </div>
          )}

          {/* Active solver context banner if present */}
          {activeContext?.method && !context?.isAssessmentActive && (
            <div className="px-3.5 py-1.5 bg-bg-primary/70 dark:bg-[#1E1430] border-b border-border-soft/60 dark:border-[#382952] text-[11px] text-charcoal-muted dark:text-[#B0A7C2] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-1.5 h-1.5 rounded-full bg-lavender-deep dark:bg-[#A798CE] shrink-0" />
                <span className="font-semibold text-charcoal dark:text-[#F3F0FA] truncate">
                  {formatMethodName(activeContext.method)}
                  {activeContext.source === 'image' && ' (Image Problem)'}
                </span>
                {activeContext.equation && (
                  <span className="font-mono text-charcoal dark:text-[#F3F0FA] truncate">
                    ({activeContext.equation})
                  </span>
                )}
              </div>
              {activeContext.currentStep && (
                <span className="text-[10px] text-lavender-deep dark:text-[#C5B8EB] uppercase font-semibold shrink-0">
                  {activeContext.currentStep.replace('_', ' ')}
                </span>
              )}
            </div>
          )}

          {/* Message Stream */}
          <div className="flex-1 p-3.5 space-y-4 overflow-y-auto">
            {messages.map((msg) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRetry={msg.isError ? handleRetry : undefined}
                onQuickAction={(action) => handleSendMessage(action)}
              />
            ))}

            {isLoading && (
              <div className="flex gap-2.5 items-center text-xs text-charcoal-muted dark:text-[#B0A7C2] pl-1 animate-fadeIn">
                <div className="w-6 h-6 rounded-full bg-lavender-light dark:bg-[#34244E] flex items-center justify-center font-serif text-[10px] font-bold text-lavender-deep dark:text-[#C5B8EB] shrink-0">
                  ME
                </div>
                <div className="flex items-center gap-1.5 py-1 px-2.5 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952]">
                  <span className="w-1.5 h-1.5 rounded-full bg-lavender-deep dark:bg-lavender-accent animate-pulse" />
                  <span className="w-1.5 h-1.5 rounded-full bg-lavender-deep dark:bg-lavender-accent animate-pulse [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-lavender-deep dark:bg-lavender-accent animate-pulse [animation-delay:300ms]" />
                  <span className="text-[11px] ml-1">Reasoning through steps...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <div className="p-3 bg-bg-surface dark:bg-[#181124] border-t border-border-soft dark:border-[#382952] shrink-0">
            <ChatInput
              onSendMessage={handleSendMessage}
              onStop={handleStop}
              isLoading={isLoading}
              disabled={Boolean(context?.isAssessmentActive)}
              attachedImageFile={attachedImage}
              onSelectImage={setAttachedImage}
              context={activeContext}
              languageMode={languageMode}
            />
          </div>
        </div>
      )}
    </>
  );
};
