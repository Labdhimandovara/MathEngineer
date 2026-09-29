import React, { useState, useEffect } from 'react';
import { PracticeQuestion } from '../../data/practiceQuestions.ts';
import { AssessmentAnswer } from '../../services/assessment/assessmentTypes.ts';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import {
  Flag,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
} from 'lucide-react';

interface QuizCardProps {
  question: PracticeQuestion;
  questionNumber: number;
  totalQuestions: number;
  answer?: AssessmentAnswer;
  isFlagged: boolean;
  onSaveAnswer: (val: string) => void;
  onToggleFlag: () => void;
  onNext: () => void;
  onPrev: () => void;
  onOpenSummary: () => void;
  onRevealSolution: () => void;
}

export const QuizCard: React.FC<QuizCardProps> = ({
  question,
  questionNumber,
  totalQuestions,
  answer,
  isFlagged,
  onSaveAnswer,
  onToggleFlag,
  onNext,
  onPrev,
  onOpenSummary,
  onRevealSolution,
}) => {
  const [inputValue, setInputValue] = useState<string>(
    answer?.submittedAnswer !== undefined ? String(answer.submittedAnswer) : ''
  );
  const [showSolutionWarning, setShowSolutionWarning] = useState<boolean>(false);

  useEffect(() => {
    setInputValue(
      answer?.submittedAnswer !== undefined ? String(answer.submittedAnswer) : ''
    );
    setShowSolutionWarning(false);
  }, [question.id, answer?.submittedAnswer]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    onSaveAnswer(val);
  };

  const methodLabel =
    question.method === 'bisection'
      ? 'Bisection Method'
      : question.method === 'false-position'
      ? 'False Position Method'
      : question.method === 'newton-raphson'
      ? 'Newton-Raphson Method'
      : 'Mixed Numerical';

  return (
    <Card variant="surface" className="p-5 sm:p-7 space-y-6 border-border-soft animate-fadeIn max-w-3xl mx-auto">
      {/* Top Header: Progress, Flag & Method */}
      <div className="flex items-center justify-between gap-3 border-b border-border-soft/60 pb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted">
            Question {questionNumber} of {totalQuestions}
          </span>
          <Badge variant="lavender">{methodLabel}</Badge>
          <Badge variant="neutral">{question.difficulty}</Badge>
          {answer?.isAnswered && (
            <span className="flex items-center gap-1 text-[11px] font-medium text-status-success bg-status-success-bg px-2 py-0.5 rounded-me">
              <CheckCircle2 className="w-3 h-3" />
              Recorded
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onToggleFlag}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-me text-xs font-medium transition-calm border ${
            isFlagged
              ? 'bg-amber-500/15 text-amber-800 border-amber-500/30'
              : 'text-charcoal-muted border-border-soft hover:text-charcoal hover:bg-bg-neutral'
          }`}
        >
          <Flag className={`w-3.5 h-3.5 ${isFlagged ? 'fill-amber-600 text-amber-600' : ''}`} />
          <span>{isFlagged ? 'Flagged' : 'Flag for Review'}</span>
        </button>
      </div>

      {/* Question Title & Description */}
      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-charcoal leading-snug">
          {question.title}
        </h3>
        <p className="text-xs text-charcoal-muted leading-relaxed">
          {question.description}
        </p>
      </div>

      {/* Target Equation & Bounds Card */}
      <div className="p-4 rounded-me bg-bg-primary/80 border border-border-soft space-y-2">
        <div className="text-[11px] font-medium text-charcoal-muted uppercase tracking-wider">
          Target Problem Equation
        </div>
        <div className="font-mono text-base font-semibold text-charcoal">
          {question.equationDisplay}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-charcoal-muted pt-1 border-t border-border-soft/60">
          <div>
            <span className="font-medium text-charcoal">Interval [a, b]:</span> [{question.bounds[0]}, {question.bounds[1]}]
          </div>
          {question.x0 !== undefined && (
            <div>
              <span className="font-medium text-charcoal">Initial Guess x₀:</span> {question.x0}
            </div>
          )}
          <div>
            <span className="font-medium text-charcoal">Required Precision:</span> {question.decimalPlaces} decimal places
          </div>
        </div>
      </div>

      {/* Answer Input Section */}
      <div className="space-y-2 pt-1">
        <label className="block text-xs font-medium text-charcoal">
          Enter Your Final Root Approximation:
        </label>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            placeholder={`e.g. ${question.expectedRoot.toFixed(question.decimalPlaces)}`}
            className="flex-1 max-w-xs font-mono text-sm px-3.5 py-2 rounded-me bg-bg-surface border border-border-soft focus:outline-none focus:ring-1 focus:ring-lavender-dusty text-charcoal placeholder:text-charcoal-muted/50"
          />
          {inputValue && (
            <span className="text-xs text-charcoal-muted italic">
              Saved automatically
            </span>
          )}
        </div>
        <p className="text-[11px] text-charcoal-muted">
          Round your answer to {question.decimalPlaces} decimal places before submitting.
        </p>
      </div>

      {/* Assistance Reveal (Discouraged during Assessment) */}
      <div className="pt-2 border-t border-border-soft/60">
        {!showSolutionWarning && !answer?.solutionViewed ? (
          <button
            type="button"
            onClick={() => setShowSolutionWarning(true)}
            className="text-[11px] text-charcoal-muted hover:text-charcoal flex items-center gap-1 transition-calm"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Need assistance? Reveal worked solution</span>
          </button>
        ) : showSolutionWarning && !answer?.solutionViewed ? (
          <div className="p-3 rounded-me bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 animate-fadeIn">
            <div className="flex items-center gap-1.5 font-medium text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Assistance Notice</span>
            </div>
            <p className="text-charcoal-muted text-[11px] leading-relaxed">
              Revealing the solution will mark this question as <strong>Assisted</strong> and record that a solution was viewed. It will not count as an unassisted correct response.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onRevealSolution();
                  setShowSolutionWarning(false);
                }}
                className="text-xs border-amber-500/40 text-amber-800 hover:bg-amber-500/20"
              >
                Confirm & View Solution
              </Button>
              <button
                type="button"
                onClick={() => setShowSolutionWarning(false)}
                className="text-xs text-charcoal-muted hover:text-charcoal px-2 py-1"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-me bg-bg-neutral border border-border-soft text-xs text-charcoal-muted space-y-1">
            <div className="font-medium text-charcoal flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-lavender-deep" />
              <span>Solution Viewed (Assisted Question)</span>
            </div>
            <p className="text-[11px]">
              Expected Root: ~{question.expectedRoot.toFixed(question.decimalPlaces)} (converges in {question.expectedIterations} iterations).
            </p>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-4 border-t border-border-soft/60 gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrev}
          disabled={questionNumber <= 1}
          className="text-xs flex items-center gap-1"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span>Previous</span>
        </Button>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSummary}
            className="text-xs"
          >
            Review & Submit
          </Button>

          {questionNumber < totalQuestions ? (
            <Button
              variant="primary"
              size="sm"
              onClick={onNext}
              className="text-xs flex items-center gap-1"
            >
              <span>Next</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              onClick={onOpenSummary}
              className="text-xs flex items-center gap-1"
            >
              <span>Finish Quiz</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
};
