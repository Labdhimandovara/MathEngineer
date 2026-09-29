import React, { useState } from 'react';
import { PageId } from '../types/index.ts';
import { PRACTICE_QUESTIONS, QuestionDifficulty, QuestionMethod } from '../data/practiceQuestions.ts';
import { QuestionCard } from '../components/practice/QuestionCard.tsx';
import { MethodComparison } from '../components/practice/MethodComparison.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { useProgress, isQuestionSolved } from '../services/progress/index.ts';
import { useLearningAttempts } from '../services/learning/index.ts';
import { useAssessmentHistory } from '../services/assessment/index.ts';
import { recommendNextPractice } from '../services/adaptive/index.ts';
import { setActivePracticeProblem } from '../services/problem/activeProblemStore.ts';
import { Compass, BarChart2, BookOpen, Filter, CheckCircle2, Sparkles, ArrowRight, Check } from 'lucide-react';

interface PracticeProps {
  onNavigate: (
    page: PageId,
    options?: {
      method?: string;
      action?: 'none' | 'myself' | 'hints' | 'solution';
      questionConfig?: any;
    }
  ) => void;
}

export const Practice: React.FC<PracticeProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'bank' | 'comparison'>('bank');
  const [methodFilter, setMethodFilter] = useState<'all' | QuestionMethod>('all');
  const [diffFilter, setDiffFilter] = useState<'all' | QuestionDifficulty>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'unsolved' | 'solved'>('all');

  const progressState = useProgress();
  const attempts = useLearningAttempts();
  const assessments = useAssessmentHistory();
  const recommendations = recommendNextPractice(attempts, assessments, { count: 3 });
  const [selectedRecIndex, setSelectedRecIndex] = useState<number>(0);
  const recommendation = recommendations[selectedRecIndex] || recommendations[0];

  const filteredQuestions = PRACTICE_QUESTIONS.filter((q) => {
    if (methodFilter !== 'all' && q.method !== methodFilter) return false;
    if (diffFilter !== 'all' && q.difficulty !== diffFilter) return false;
    if (statusFilter === 'solved' && !isQuestionSolved(progressState, q.id)) return false;
    if (statusFilter === 'unsolved' && isQuestionSolved(progressState, q.id)) return false;
    return true;
  });

  const totalSolvedCount = PRACTICE_QUESTIONS.filter((q) =>
    isQuestionSolved(progressState, q.id)
  ).length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Page Header */}
      <section className="space-y-2 pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cream">Question Bank & Labs</Badge>
            <Badge variant="neutral">{PRACTICE_QUESTIONS.length} Verified Problems</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-charcoal dark:text-charcoal-light mt-2 font-sans">
            Practice & Comparative Labs
          </h1>
          <p className="text-charcoal-muted dark:text-charcoal-subtle text-base max-w-2xl leading-relaxed">
            Targeted university-level question sets and side-by-side execution benchmarks for Numerical Techniques.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center p-1 bg-bg-surface dark:bg-bg-darkSurface border border-border-soft dark:border-border-dark rounded-me-lg self-start sm:self-center shrink-0">
          <button
            onClick={() => setActiveTab('bank')}
            className={`px-3 py-1.5 rounded-me text-xs font-medium transition-calm btn-press flex items-center gap-1.5 ${
              activeTab === 'bank'
                ? 'bg-lavender-light dark:bg-bg-darkCard text-charcoal dark:text-charcoal-light shadow-subtle border border-lavender-dusty/40 dark:border-border-dark'
                : 'text-charcoal-muted dark:text-charcoal-subtle hover:text-charcoal dark:hover:text-charcoal-light'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Question Bank</span>
            <span className="text-[10px] bg-bg-primary dark:bg-bg-darkDeep px-1.5 py-0.2 rounded-full border border-border-soft dark:border-border-dark">
              {PRACTICE_QUESTIONS.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1.5 rounded-me text-xs font-medium transition-calm btn-press flex items-center gap-1.5 ${
              activeTab === 'comparison'
                ? 'bg-lavender-light dark:bg-bg-darkCard text-charcoal dark:text-charcoal-light shadow-subtle border border-lavender-dusty/40 dark:border-border-dark'
                : 'text-charcoal-muted dark:text-charcoal-subtle hover:text-charcoal dark:hover:text-charcoal-light'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Method Comparison</span>
          </button>
        </div>
      </section>

      {/* Tab 1: Question Bank */}
      {activeTab === 'bank' && (
        <div className="space-y-6">
          {/* Recommended Problem Spotlight */}
          {recommendation && (
            <Card variant="cream" className="p-4 sm:p-5 border-2 border-lavender-dusty/60 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Sparkles className="w-4 h-4 text-lavender-deep" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-lavender-deep">
                    Targeted Recommendation
                  </span>
                  <Badge variant="neutral">{recommendation.difficulty}</Badge>
                  <span className="font-mono text-xs font-semibold text-charcoal">
                    {recommendation.questionId}
                  </span>
                  <Badge variant="cream">
                    {recommendation.type === 'remediation'
                      ? 'Remediation'
                      : recommendation.type === 'retry'
                      ? 'Retry Mistake'
                      : recommendation.type === 'progression'
                      ? 'Next Level'
                      : recommendation.type === 'mixed'
                      ? 'Method Comparison'
                      : 'Skill Variety'}
                  </Badge>
                </div>

                {recommendations.length > 1 && (
                  <div className="flex items-center gap-1.5 self-start sm:self-center bg-bg-surface/80 dark:bg-[#251A38] p-1 rounded-me border border-border-soft dark:border-[#382952]">
                    {recommendations.map((rec, idx) => (
                      <button
                        key={rec.id}
                        onClick={() => setSelectedRecIndex(idx)}
                        className={`px-2 py-0.5 text-[11px] rounded font-medium transition-calm ${
                          selectedRecIndex === idx
                            ? 'bg-lavender-light dark:bg-[#34244E] text-charcoal dark:text-[#F3F0FA] shadow-xs'
                            : 'text-charcoal-muted dark:text-[#B0A7C2] hover:text-charcoal dark:hover:text-[#F3F0FA]'
                        }`}
                      >
                        Option {idx + 1}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1.5 max-w-2xl">
                  <h3 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA]">{recommendation.title}</h3>
                  <div className="font-mono text-xs text-charcoal-muted dark:text-[#B0A7C2] bg-bg-surface dark:bg-[#251A38] px-2.5 py-1 rounded inline-block border border-border-soft/60 dark:border-[#382952]">
                    {recommendation.equation}
                  </div>
                  <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed pt-0.5">
                    <span className="font-medium text-charcoal dark:text-[#F3F0FA]">Why this problem:</span> {recommendation.reason}
                  </p>
                  {recommendation.evidence && recommendation.evidence.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {recommendation.evidence.slice(0, 2).map((ev, i) => (
                        <span key={i} className="text-[11px] bg-bg-primary dark:bg-[#1E1430] text-charcoal-muted dark:text-[#B0A7C2] px-2 py-0.5 rounded border border-border-soft/60 dark:border-[#382952]">
                          {ev}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap sm:flex-col gap-2 shrink-0 self-start sm:self-center">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      const target = PRACTICE_QUESTIONS.find((q) => q.id === recommendation.questionId);
                      if (target) {
                        const activeMethod = target.method === 'mixed' ? 'bisection' : target.method;
                        const config = {
                          questionId: target.id,
                          method: activeMethod,
                          equation: target.equation,
                          lowerBound: target.bounds[0],
                          upperBound: target.bounds[1],
                          decimalPlaces: target.decimalPlaces,
                          initialGuess: target.x0 ?? target.bounds[0],
                          title: target.title,
                        };
                        setActivePracticeProblem({
                          questionId: target.id,
                          source: 'practice',
                          equation: target.equation,
                          method: activeMethod,
                          lowerBound: target.bounds[0],
                          upperBound: target.bounds[1],
                          decimalPlaces: target.decimalPlaces,
                          initialGuess: target.x0 ?? target.bounds[0],
                          title: target.title,
                          boundsSource: 'supplied',
                        });
                        onNavigate('solve', {
                          action: 'myself',
                          method: activeMethod,
                          questionConfig: config,
                        });
                      }
                    }}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <span>Practice Now</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Button>

                  {recommendation.action === 'review' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigate('review', { method: recommendation.method })}
                      className="text-xs text-charcoal-muted hover:text-charcoal"
                    >
                      Review Method
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* Filter Bar */}
          <Card variant="surface" className="space-y-4 border-border-soft dark:border-border-dark p-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Method Filters */}
              <div className="space-y-1.5">
                <span className="text-xs font-semibold text-charcoal-muted dark:text-charcoal-subtle flex items-center gap-1">
                  <Filter className="w-3 h-3" />
                  <span>Method</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'all', label: 'All Methods' },
                    { id: 'bisection', label: 'Bisection' },
                    { id: 'false-position', label: 'False Position' },
                    { id: 'newton-raphson', label: 'Newton-Raphson' },
                    { id: 'mixed', label: 'Mixed / Exam' },
                  ].map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setMethodFilter(m.id as any)}
                      className={`px-2.5 py-1 rounded-me text-xs font-medium transition-calm btn-press border ${
                        methodFilter === m.id
                          ? 'bg-lavender-deep text-white border-lavender-deep dark:bg-lavender-deep shadow-xs'
                          : 'bg-bg-surface dark:bg-bg-darkCard text-charcoal-muted dark:text-charcoal-subtle hover:text-charcoal dark:hover:text-charcoal-light border-border-soft dark:border-border-dark'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Difficulty & Status Filters */}
              <div className="flex flex-wrap items-center gap-4">
                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-charcoal-muted dark:text-charcoal-subtle">Difficulty</span>
                  <select
                    value={diffFilter}
                    onChange={(e) => setDiffFilter(e.target.value as any)}
                    className="px-2.5 py-1 text-xs rounded-me border border-border-soft dark:border-border-dark bg-bg-surface dark:bg-bg-darkCard text-charcoal dark:text-charcoal-light focus-ring"
                  >
                    <option value="all">All Difficulties</option>
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <span className="text-xs font-semibold text-charcoal-muted dark:text-charcoal-subtle">Status</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-2.5 py-1 text-xs rounded-me border border-border-soft dark:border-border-dark bg-bg-surface dark:bg-bg-darkCard text-charcoal dark:text-charcoal-light focus-ring"
                  >
                    <option value="all">All Status</option>
                    <option value="unsolved">Unsolved</option>
                    <option value="solved">Solved</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Filter Summary */}
            <div className="flex items-center justify-between text-xs text-charcoal-muted pt-2 border-t border-border-soft/60">
              <span>
                Showing {filteredQuestions.length} of {PRACTICE_QUESTIONS.length} verified problems
              </span>
              <span>
                Solved: {totalSolvedCount} / {PRACTICE_QUESTIONS.length}
              </span>
            </div>
          </Card>

          {/* Question Grid */}
          {filteredQuestions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {filteredQuestions.map((q) => (
                <QuestionCard key={q.id} question={q} onNavigate={onNavigate} />
              ))}
            </div>
          ) : (
            <Card variant="cream" className="text-center py-12 space-y-3">
              <CheckCircle2 className="w-8 h-8 text-status-success mx-auto" />
              <h3 className="text-base font-semibold text-charcoal">
                No questions match the current filters
              </h3>
              <p className="text-xs text-charcoal-muted max-w-sm mx-auto">
                Try selecting &quot;All Methods&quot; or clearing your status filter to explore more questions.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setMethodFilter('all');
                  setDiffFilter('all');
                  setStatusFilter('all');
                }}
              >
                Reset Filters
              </Button>
            </Card>
          )}
        </div>
      )}

      {/* Tab 2: Method Comparison */}
      {activeTab === 'comparison' && <MethodComparison onNavigate={onNavigate} />}
    </div>
  );
};
