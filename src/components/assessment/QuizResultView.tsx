import React, { useState } from 'react';
import { AssessmentSession } from '../../services/assessment/assessmentTypes.ts';
import { PRACTICE_QUESTIONS } from '../../data/practiceQuestions.ts';
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
  AlertTriangle,
  ArrowRight,
  Compass,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PageId } from '../../types/index.ts';
import { formatMistakeLabel, getMistakeAdvice } from '../../services/review/reviewService.ts';
import { deriveAssessmentRecommendations } from '../../services/adaptive/index.ts';
import { Sparkles } from 'lucide-react';

interface QuizResultViewProps {
  session: AssessmentSession;
  onTryAgain: () => void;
  onReturnToQuizzes: () => void;
  onNavigateToReview: (questionId?: string) => void;
  onNavigate?: (page: PageId, options?: any) => void;
}

export const QuizResultView: React.FC<QuizResultViewProps> = ({
  session,
  onTryAgain,
  onReturnToQuizzes,
  onNavigateToReview,
}) => {
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);

  const results = session.results;
  if (!results) {
    return null;
  }

  const minutes = Math.floor(results.totalTimeSeconds / 60);
  const seconds = results.totalTimeSeconds % 60;
  const timeFormatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
      {/* Top Banner Card */}
      <Card variant="surface" className="p-6 sm:p-8 space-y-6 border-border-soft text-center sm:text-left">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Badge variant="cream">Assessment Results</Badge>
              {results.timedOut && (
                <Badge variant="neutral" className="text-amber-700 bg-amber-500/10">
                  Timed Out
                </Badge>
              )}
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold text-charcoal">
              {session.title}
            </h2>
            <p className="text-xs text-charcoal-muted">
              Completed on {new Date(session.completedAt || session.startedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>

          {/* Large Score Pill */}
          <div className="p-4 rounded-me bg-bg-primary/80 border border-border-soft flex items-center justify-center sm:justify-end gap-4 shrink-0">
            <div className="text-center sm:text-right">
              <div className="text-3xl sm:text-4xl font-bold text-charcoal">
                {results.correctCount} <span className="text-base font-normal text-charcoal-muted">/ {results.totalQuestions}</span>
              </div>
              <div className="text-xs font-medium text-status-success mt-0.5">
                {results.accuracy}% Accuracy
              </div>
            </div>
          </div>
        </div>

        {/* Descriptive Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border-soft/60 text-xs">
          <div className="p-3 rounded-me bg-bg-neutral/70 space-y-0.5">
            <div className="text-[11px] text-charcoal-muted">Unassisted Correct</div>
            <div className="text-base font-semibold text-charcoal">
              {results.unassistedCorrectCount}
            </div>
            <div className="text-[10px] text-charcoal-muted">
              {results.unassistedAccuracy}% unassisted
            </div>
          </div>

          <div className="p-3 rounded-me bg-bg-neutral/70 space-y-0.5">
            <div className="text-[11px] text-charcoal-muted">Total Time</div>
            <div className="text-base font-semibold text-charcoal">
              {timeFormatted}
            </div>
            <div className="text-[10px] text-charcoal-muted">
              ~{results.averageTimePerQuestion}s per question
            </div>
          </div>

          <div className="p-3 rounded-me bg-bg-neutral/70 space-y-0.5">
            <div className="text-[11px] text-charcoal-muted">Incorrect / Missed</div>
            <div className="text-base font-semibold text-charcoal">
              {results.incorrectCount + results.unansweredCount}
            </div>
            <div className="text-[10px] text-charcoal-muted">
              {results.unansweredCount} unanswered
            </div>
          </div>

          <div className="p-3 rounded-me bg-bg-neutral/70 space-y-0.5">
            <div className="text-[11px] text-charcoal-muted">Assistance Used</div>
            <div className="text-base font-semibold text-charcoal">
              {results.solutionsViewedCount}
            </div>
            <div className="text-[10px] text-charcoal-muted">
              {results.solutionsViewedCount > 0 ? 'Solution viewed' : 'No assistance used'}
            </div>
          </div>
        </div>

        {/* Action CTAs */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigateToReview()}
              className="text-xs flex items-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Review in Review Hub</span>
            </Button>

            <Button
              variant="primary"
              size="sm"
              onClick={onTryAgain}
              className="text-xs flex items-center gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Try Again (New Quiz)</span>
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={onReturnToQuizzes}
            className="text-xs text-charcoal-muted hover:text-charcoal"
          >
            Return to Quizzes
          </Button>
        </div>
      </Card>

      {/* What to work on next (Phase 11 Adaptive Personalization) */}
      {(() => {
        const assessmentRecs = deriveAssessmentRecommendations(session);
        if (assessmentRecs.length === 0) return null;

        return (
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-lavender-deep" />
              <h3 className="text-base font-semibold text-charcoal">What to Work on Next</h3>
              <Badge variant="cream">Adaptive Next Steps</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assessmentRecs.map((rec, i) => (
                <Card
                  key={i}
                  variant="surface"
                  className="p-4 border-border-soft space-y-2 flex flex-col justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="lavender">{rec.method}</Badge>
                      <h4 className="text-xs font-semibold text-charcoal">{rec.title}</h4>
                    </div>
                    <p className="text-xs text-charcoal-muted leading-relaxed">
                      {rec.reason}
                    </p>
                  </div>
                  <div className="pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (rec.targetPage === 'review') {
                          onNavigateToReview(rec.targetQuestionId);
                        } else if (rec.targetPage === 'quiz') {
                          onTryAgain();
                        } else if (onNavigate) {
                          onNavigate('practice', { method: rec.method !== 'mixed' ? rec.method : undefined });
                        } else {
                          onReturnToQuizzes();
                        }
                      }}
                      className="text-xs w-full flex items-center justify-center gap-1.5"
                    >
                      <span>{rec.actionText}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Question-by-Question Breakdown List */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold text-charcoal">
          Question Breakdown ({session.questionIds.length})
        </h3>

        <div className="space-y-3">
          {session.questionIds.map((qId, idx) => {
            const question = PRACTICE_QUESTIONS.find((q) => q.id === qId);
            const ans = session.answers[qId];
            if (!question) return null;

            const isCorrect = ans?.correct === true;
            const isUnanswered = !ans || !ans.isAnswered;
            const isAssisted = ans?.isAssisted || false;
            const isExpanded = expandedQuestionId === qId;

            return (
              <Card
                key={qId}
                variant="surface"
                className="p-4 sm:p-5 border-border-soft space-y-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-charcoal">
                      #{idx + 1}
                    </span>
                    <Badge variant="lavender">{question.method}</Badge>
                    <span className="font-mono text-[10px] text-charcoal-muted">
                      {question.id}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-status-success bg-status-success-bg px-2 py-0.5 rounded-me">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Correct</span>
                      </span>
                    ) : isUnanswered ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-charcoal-muted bg-bg-neutral px-2 py-0.5 rounded-me">
                        Unanswered
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-status-error bg-status-error-bg px-2 py-0.5 rounded-me">
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Incorrect</span>
                      </span>
                    )}

                    {isAssisted && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800 bg-amber-500/15 px-2 py-0.5 rounded-me">
                        <Eye className="w-3 h-3" />
                        <span>Assisted</span>
                      </span>
                    )}
                  </div>
                </div>

                <div className="space-y-1">
                  <h4 className="text-sm font-semibold text-charcoal">
                    {question.title}
                  </h4>
                  <div className="font-mono text-xs text-charcoal-muted">
                    {question.equationDisplay}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1 border-t border-border-soft/60">
                  <div>
                    <span className="text-charcoal-muted">Your Answer: </span>
                    <span className="font-mono font-medium text-charcoal">
                      {ans?.submittedAnswer !== undefined ? String(ans.submittedAnswer) : 'None'}
                    </span>
                  </div>
                  <div>
                    <span className="text-charcoal-muted">Expected Root: </span>
                    <span className="font-mono font-medium text-charcoal">
                      ~{question.expectedRoot.toFixed(question.decimalPlaces)}
                    </span>
                  </div>
                </div>

                {ans?.mistakeCategories && ans.mistakeCategories.length > 0 && (
                  <div className="p-2.5 rounded-me bg-amber-500/5 border border-amber-500/20 text-xs space-y-1">
                    <div className="font-medium text-amber-900">
                      Diagnosed: {formatMistakeLabel(ans.mistakeCategories[0])}
                    </div>
                    <p className="text-[11px] text-charcoal-muted">
                      {getMistakeAdvice(ans.mistakeCategories[0])}
                    </p>
                  </div>
                )}

                <div className="flex items-center justify-end pt-1">
                  <button
                    onClick={() => onNavigateToReview(question.id)}
                    className="text-xs font-medium text-lavender-deep hover:text-charcoal flex items-center gap-1 transition-calm"
                  >
                    <span>Review in Review Hub</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
