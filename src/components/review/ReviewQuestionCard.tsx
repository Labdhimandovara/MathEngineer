import React, { useState } from 'react';
import { GroupedReviewQuestion } from '../../services/review/reviewTypes.ts';
import { setActiveReviewProblem } from '../../services/problem/activeProblemStore.ts';
import { ReviewSolutionView } from './ReviewSolutionView.tsx';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import {
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  Eye,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Compass,
  Lightbulb,
  AlertTriangle,
} from 'lucide-react';

interface ReviewQuestionCardProps {
  question: GroupedReviewQuestion;
  onTryAgain: (question: GroupedReviewQuestion) => void;
  onSolutionViewed?: (attemptId: string) => void;
}

export const ReviewQuestionCard: React.FC<ReviewQuestionCardProps> = ({
  question,
  onTryAgain,
  onSolutionViewed,
}) => {
  const [isExpandedAttempts, setIsExpandedAttempts] = useState(false);
  const [isReviewingSolution, setIsReviewingSolution] = useState(false);

  const handleToggleSolution = () => {
    const next = !isReviewingSolution;
    setIsReviewingSolution(next);
    if (next) {
      const method = question.method === 'mixed' ? 'bisection' : question.method;
      setActiveReviewProblem({
        questionId: question.questionId,
        source: question.source as any,
        rawExtractedText: question.rawExtractedText,
        equation: question.equation,
        method: method as any,
        lowerBound: question.lowerBound,
        upperBound: question.upperBound,
        boundsSource: question.boundsSource,
        decimalPlaces: question.decimalPlaces,
        initialGuess: question.initialGuess,
      });
      if (onSolutionViewed && question.latestAttempt) {
        onSolutionViewed(question.latestAttempt.id);
      }
    }
  };

  const formattedDate = new Date(question.lastAttemptedAt).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const methodLabel =
    question.method === 'bisection'
      ? 'Bisection'
      : question.method === 'false-position'
      ? 'False Position'
      : question.method === 'newton-raphson'
      ? 'Newton-Raphson'
      : 'Mixed';

  const cardStatusBorder = question.latestIsCorrect
    ? 'border-status-success/30 dark:border-emerald-800/40 hover:border-status-success/50'
    : question.needsReview
    ? 'border-amber-500/40 dark:border-amber-700/50 hover:border-amber-500/60'
    : 'border-status-error/30 dark:border-rose-800/40 hover:border-status-error/50';

  return (
    <Card
      variant="surface"
      className={`p-4 sm:p-5 space-y-4 border transition-calm ${cardStatusBorder}`}
    >
      {/* Top Header: Method, Source, Status */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="lavender" className="capitalize font-medium">
            {methodLabel}
          </Badge>

          {question.source === 'image' ? (
            <Badge variant="neutral" className="flex items-center gap-1 text-[11px] bg-bg-neutral dark:bg-[#251A38]">
              <ImageIcon className="w-3 h-3 text-lavender-deep dark:text-[#C5B8EB]" />
              <span>Uploaded Image</span>
            </Badge>
          ) : (
            <Badge variant="neutral" className="flex items-center gap-1 text-[11px]">
              <Compass className="w-3 h-3 text-charcoal-muted dark:text-[#B0A7C2]" />
              <span>Practice Bank</span>
            </Badge>
          )}

          <span className="font-mono text-[10px] text-charcoal-muted dark:text-[#B0A7C2]">
            {question.questionId}
          </span>
        </div>

        {/* Status Pill */}
        <div>
          {question.latestIsCorrect ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-status-success dark:text-emerald-400 bg-status-success-bg dark:bg-[#122A1C]/50 px-2.5 py-0.5 rounded-me border border-status-success/20 dark:border-emerald-700/30">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Correct</span>
            </span>
          ) : question.needsReview ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 dark:bg-[#2D1D10]/50 px-2.5 py-0.5 rounded-me border border-amber-500/20 dark:border-amber-700/30">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Needs Review</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-status-error dark:text-rose-400 bg-status-error-bg dark:bg-[#2D1216]/50 px-2.5 py-0.5 rounded-me border border-status-error/20 dark:border-rose-700/30">
              <XCircle className="w-3.5 h-3.5" />
              <span>Incorrect</span>
            </span>
          )}
        </div>
      </div>

      {/* Question Details: Title, Equation, Parameters */}
      <div className="space-y-1.5">
        <h3 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA] leading-snug">
          {question.title}
        </h3>

        {question.equation && (
          <div className="p-2.5 rounded-me bg-bg-neutral/70 dark:bg-[#150F22]/80 font-mono text-xs sm:text-sm text-charcoal dark:text-[#F3F0FA] flex flex-wrap items-center justify-between gap-2 border border-border-soft/60 dark:border-[#382952]">
            <span>{question.equationDisplay || question.equation}</span>
            <span className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2] font-sans">
              Precision: {question.decimalPlaces} d.p.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 text-xs text-charcoal-muted dark:text-[#B0A7C2] pt-1">
          {question.lowerBound !== null && question.upperBound !== null && (
            <span>
              Interval: [{question.lowerBound}, {question.upperBound}]
              {question.boundsSource === 'discovered' && (
                <span className="ml-1 text-[10px] text-lavender-deep dark:text-[#C5B8EB] font-medium bg-lavender-light/60 dark:bg-[#34244E] px-1.5 py-0.5 rounded">
                  Discovered Bounds
                </span>
              )}
            </span>
          )}

          {question.initialGuess !== undefined && question.initialGuess !== null && (
            <span>Initial Guess x₀: {question.initialGuess}</span>
          )}
        </div>
      </div>

      {/* Aggregated Attempt Info Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-border-soft/50 text-xs text-charcoal-muted">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="font-medium text-charcoal">
            {question.totalAttempts} attempt{question.totalAttempts === 1 ? '' : 's'}
          </span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>{question.totalHintsUsed} hints used</span>
          </span>
          {question.solutionViewed && (
            <>
              <span>•</span>
              <span className="flex items-center gap-1 text-charcoal">
                <Eye className="w-3.5 h-3.5 text-lavender-deep" />
                <span>Solution viewed</span>
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px]">
          <Clock className="w-3 h-3 text-charcoal-muted" />
          <span>Last attempt: {formattedDate}</span>
        </div>
      </div>

      {/* Diagnosed Mistakes and Guidance */}
      {question.mistakeAdvice.length > 0 && (
        <div className="p-3 bg-amber-500/5 dark:bg-[#2A1D15]/40 rounded-me border border-amber-500/20 dark:border-amber-700/30 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-medium text-amber-900 dark:text-amber-300">
            <Lightbulb className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>How to approach it next time:</span>
          </div>

          <div className="space-y-1.5 pl-5">
            {question.mistakeAdvice.map((entry, idx) => (
              <div key={idx} className="space-y-0.5">
                <div className="font-medium text-amber-800 dark:text-amber-400 text-[11px]">
                  {entry.categoryLabel}
                </div>
                <p className="text-charcoal-muted dark:text-[#B0A7C2] text-[11px] leading-relaxed">
                  {entry.advice}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions: Review Solution, Try Again, View History */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleSolution}
            className="text-xs flex items-center gap-1.5 btn-press"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isReviewingSolution ? 'Hide Solution' : 'Review Solution'}</span>
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => onTryAgain(question)}
            className="text-xs flex items-center gap-1.5 btn-press"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </Button>
        </div>

        {question.totalAttempts > 1 && (
          <button
            onClick={() => setIsExpandedAttempts((prev) => !prev)}
            className="text-xs text-charcoal-muted dark:text-[#B0A7C2] hover:text-charcoal dark:hover:text-[#F3F0FA] flex items-center gap-1 transition-calm"
          >
            <span>{isExpandedAttempts ? 'Hide History' : `All Attempts (${question.totalAttempts})`}</span>
            {isExpandedAttempts ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Inline Deterministic Solution Regeneration (0 Gemini calls) */}
      {isReviewingSolution && (
        <div className="pt-2 border-t border-border-soft dark:border-[#382952]">
          <ReviewSolutionView
            method={question.method}
            equation={question.equation}
            lowerBound={question.lowerBound}
            upperBound={question.upperBound}
            initialGuess={question.initialGuess}
            decimalPlaces={question.decimalPlaces}
            questionId={question.questionId}
            boundsSource={question.boundsSource}
          />
        </div>
      )}

      {/* Expanded Attempt History Sublist */}
      {isExpandedAttempts && question.allAttempts.length > 0 && (
        <div className="pt-3 border-t border-border-soft dark:border-[#382952] space-y-2">
          <div className="text-[11px] font-medium text-charcoal-muted dark:text-[#B0A7C2] uppercase tracking-wider">
            Attempt Records for this Problem
          </div>
          <div className="divide-y divide-border-soft/60 dark:divide-[#382952] rounded-me border border-border-soft dark:border-[#382952] bg-bg-surface dark:bg-[#1E1430] overflow-hidden">
            {question.allAttempts.map((att) => {
              const attDate = new Date(att.startedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={att.id}
                  className="p-2.5 sm:px-3 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-charcoal dark:text-[#F3F0FA]">
                      Attempt #{att.attemptNumber}
                    </span>
                    {att.status === 'completed' ? (
                      att.correct ? (
                        <span className="text-[10px] text-status-success dark:text-emerald-400 bg-status-success-bg dark:bg-[#122A1C]/60 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Correct
                        </span>
                      ) : (
                        <span className="text-[10px] text-status-error dark:text-rose-400 bg-status-error-bg dark:bg-[#2D1216]/60 px-2 py-0.5 rounded font-medium flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> Incorrect
                        </span>
                      )
                    ) : (
                      <span className="text-[10px] text-charcoal-muted dark:text-[#B0A7C2] bg-bg-neutral dark:bg-[#251A38] px-2 py-0.5 rounded">
                        In Progress
                      </span>
                    )}

                    {att.solutionViewed && (
                      <span className="text-[10px] text-charcoal-muted dark:text-[#B0A7C2] flex items-center gap-1">
                        <Eye className="w-2.5 h-2.5" /> Solution viewed
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-charcoal-muted dark:text-[#B0A7C2] shrink-0">
                    <span>{att.hintsUsed} hints</span>
                    <span>•</span>
                    <span>{att.durationSeconds}s</span>
                    <span>•</span>
                    <span>{attDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Card>
  );
};
