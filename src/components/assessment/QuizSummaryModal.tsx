import React from 'react';
import { AssessmentSession } from '../../services/assessment/assessmentTypes.ts';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import {
  CheckCircle2,
  AlertCircle,
  Flag,
  ArrowRight,
  X,
  HelpCircle,
} from 'lucide-react';

interface QuizSummaryModalProps {
  session: AssessmentSession;
  onSelectQuestion: (index: number) => void;
  onSubmit: () => void;
  onClose: () => void;
}

export const QuizSummaryModal: React.FC<QuizSummaryModalProps> = ({
  session,
  onSelectQuestion,
  onSubmit,
  onClose,
}) => {
  const totalQuestions = session.questionIds.length;
  const answeredCount = Object.values(session.answers).filter((a) => a.isAnswered).length;
  const unansweredCount = totalQuestions - answeredCount;
  const flaggedCount = session.flaggedQuestionIds.length;

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <Card
        variant="surface"
        className="w-full max-w-lg p-5 sm:p-7 space-y-6 border-border-soft shadow-lg animate-scaleIn max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-soft/60 pb-3">
          <div>
            <h3 className="text-lg font-semibold text-charcoal">
              Assessment Summary
            </h3>
            <p className="text-xs text-charcoal-muted">
              Review your answers before final submission
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-charcoal-muted hover:text-charcoal hover:bg-bg-neutral"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Metric pills */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 rounded-me bg-status-success-bg/40 border border-status-success/20">
            <div className="text-xl font-bold text-status-success">{answeredCount}</div>
            <div className="text-[11px] text-charcoal-muted">Answered</div>
          </div>

          <div className={`p-3 rounded-me border ${
            unansweredCount > 0
              ? 'bg-amber-500/10 border-amber-500/20'
              : 'bg-bg-neutral border-border-soft'
          }`}>
            <div className={`text-xl font-bold ${unansweredCount > 0 ? 'text-amber-700' : 'text-charcoal-muted'}`}>
              {unansweredCount}
            </div>
            <div className="text-[11px] text-charcoal-muted">Unanswered</div>
          </div>

          <div className="p-3 rounded-me bg-bg-neutral border border-border-soft">
            <div className="text-xl font-bold text-charcoal">{flaggedCount}</div>
            <div className="text-[11px] text-charcoal-muted">Flagged</div>
          </div>
        </div>

        {/* Questions Jump Grid */}
        <div className="space-y-2">
          <div className="text-xs font-medium text-charcoal flex items-center justify-between">
            <span>Questions Overview:</span>
            <span className="text-[11px] text-charcoal-muted">Click any question to edit</span>
          </div>

          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {session.questionIds.map((qId, idx) => {
              const ans = session.answers[qId];
              const isAnswered = ans?.isAnswered;
              const isFlagged = session.flaggedQuestionIds.includes(qId);
              const isCurrent = session.currentIndex === idx;

              return (
                <button
                  key={qId}
                  onClick={() => {
                    onSelectQuestion(idx);
                    onClose();
                  }}
                  className={`relative h-10 rounded-me border text-xs font-semibold flex items-center justify-center transition-calm ${
                    isCurrent
                      ? 'ring-2 ring-lavender-dusty'
                      : ''
                  } ${
                    isAnswered
                      ? 'bg-status-success-bg/80 text-status-success border-status-success/40'
                      : 'bg-bg-surface text-charcoal-muted border-border-soft hover:border-lavender-dusty'
                  }`}
                >
                  <span>{idx + 1}</span>
                  {isFlagged && (
                    <Flag className="w-2.5 h-2.5 fill-amber-500 text-amber-500 absolute top-1 right-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Warning if unanswered questions exist */}
        {unansweredCount > 0 && (
          <div className="p-3 rounded-me bg-amber-500/10 border border-amber-500/20 text-xs text-amber-900 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
            <span>
              You have {unansweredCount} unanswered question{unansweredCount === 1 ? '' : 's'}. They will be marked as incorrect upon submission.
            </span>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t border-border-soft/60 gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs"
          >
            Continue Assessment
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={onSubmit}
            className="text-xs flex items-center gap-1.5"
          >
            <span>Submit Assessment</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>
    </div>
  );
};
