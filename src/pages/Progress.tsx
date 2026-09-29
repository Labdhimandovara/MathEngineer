import React from 'react';
import { PageId, QuestionLaunchConfig } from '../types/index.ts';
import {
  useProgress,
  resetProgress,
  getTotalAttempted,
  getTotalSolved,
  getActiveStreak,
  getTotalHintsUsed,
  getTopicsStudiedCount,
  getOverallAccuracy,
  getMethodProgressPercentage,
} from '../services/progress/index.ts';
import {
  useLearningAttempts,
  aggregateAllMethods,
  resetLearningHistory,
  TopicLearningState,
  MistakeCategory,
} from '../services/learning/index.ts';
import {
  deriveAdaptiveTopicStates,
  deriveLearningFocus,
  detectStrengths,
  detectWeakTopics as detectAdaptiveWeakTopics,
  buildSessionPlan,
  recommendNextPractice,
  AdaptiveState,
} from '../services/adaptive/index.ts';
import { PRACTICE_QUESTIONS } from '../data/practiceQuestions.ts';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { ProgressBar } from '../components/ui/ProgressBar.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import {
  ArrowRight,
  Flame,
  CheckCircle2,
  HelpCircle,
  BookOpen,
  RotateCcw,
  Target,
  Sparkles,
  Compass,
  AlertTriangle,
  History,
  TrendingUp,
  Clock,
  XCircle,
  Award,
  ListTodo,
} from 'lucide-react';
import { useAssessmentHistory } from '../services/assessment/index.ts';
import { LearningAnalyticsCharts } from '../components/progress/LearningAnalyticsCharts.tsx';

interface ProgressProps {
  onNavigate: (
    page: PageId,
    options?: {
      method?: string;
      action?: 'none' | 'myself' | 'hints' | 'solution';
      questionConfig?: QuestionLaunchConfig;
    }
  ) => void;
}

function getAdaptiveStateBadge(state: AdaptiveState) {
  switch (state) {
    case 'consistent':
      return {
        variant: 'cream' as const,
        label: 'Consistent',
        badgeBg: 'bg-status-success-bg dark:bg-emerald-950/40 text-status-success dark:text-emerald-300 border-status-success/30 dark:border-emerald-800/40',
        desc: 'Consistent unassisted calculation with low hint reliance',
      };
    case 'developing':
      return {
        variant: 'lavender' as const,
        label: 'Developing',
        badgeBg: 'bg-lavender-light dark:bg-[#34244E] text-lavender-deep dark:text-[#C5B8EB] border-lavender-dusty/40 dark:border-[#4B3B6E]',
        desc: 'Developing proficiency with positive accuracy',
      };
    case 'practicing':
      return {
        variant: 'neutral' as const,
        label: 'Practicing',
        badgeBg: 'bg-bg-neutral dark:bg-[#251A38] text-charcoal dark:text-[#F3F0FA] border-border-soft dark:border-[#382952]',
        desc: 'Active practice and initial problem sessions',
      };
    case 'needs-review':
      return {
        variant: 'cream' as const,
        label: 'Needs Review',
        badgeBg: 'bg-status-warning-bg/40 dark:bg-amber-950/40 text-status-warning dark:text-amber-300 border-status-warning/40 dark:border-amber-800/40',
        desc: 'Diagnostic signals indicate reinforcement needed',
      };
    case 'introduced':
      return {
        variant: 'neutral' as const,
        label: 'Introduced',
        badgeBg: 'bg-bg-surface text-charcoal border-border-soft',
        desc: 'Introductory problem completed',
      };
    case 'not-started':
    default:
      return {
        variant: 'neutral' as const,
        label: 'Not Started',
        badgeBg: 'bg-bg-primary text-charcoal-muted border-border-soft/60',
        desc: 'No problem attempts recorded yet',
      };
  }
}

function formatMistakeLabel(category: MistakeCategory): string {
  switch (category) {
    case 'rounding-error':
      return 'Rounding Precision';
    case 'wrong-bracket':
      return 'Bracketing Sign';
    case 'wrong-formula':
      return 'Formula Substitution';
    case 'wrong-function-evaluation':
      return 'Function Evaluation';
    case 'wrong-interval-selection':
      return 'Interval Selection';
    case 'arithmetic-error':
      return 'Arithmetic Step';
    case 'wrong-initial-guess':
      return 'Initial Guess x₀';
    case 'derivative-error':
      return 'Derivative Calculation';
    case 'stopping-condition-error':
      return 'Stopping Condition';
    default:
      return 'Calculation Step';
  }
}

export const Progress: React.FC<ProgressProps> = ({ onNavigate }) => {
  const state = useProgress();
  const attempts = useLearningAttempts();
  const assessmentHistory = useAssessmentHistory();
  const latestAssessment = assessmentHistory[0];

  const totalAttempted = getTotalAttempted(state);
  const totalSolved = getTotalSolved(state);
  const streakDays = getActiveStreak(state);
  const hintsUsed = getTotalHintsUsed(state);
  const topicsStudied = getTopicsStudiedCount(state);
  const accuracy = getOverallAccuracy(state);

  // Deterministic learning analytics & adaptive personalization (Phase 11)
  const methodPerformances = aggregateAllMethods(attempts);
  const adaptiveStates = deriveAdaptiveTopicStates(attempts, assessmentHistory);
  const learningFocus = deriveLearningFocus(attempts, assessmentHistory);
  const strengths = detectStrengths(attempts, assessmentHistory);
  const sessionPlan = buildSessionPlan(attempts, assessmentHistory);
  const adaptiveWeakTopics = detectAdaptiveWeakTopics(attempts, assessmentHistory);
  const recommendations = recommendNextPractice(attempts, assessmentHistory, { count: 3 });
  const recommendation = recommendations[0];

  const methodsList = [
    {
      id: 'bisection' as const,
      title: 'Bisection Method',
      subtitle: 'Interval halving for continuous equations',
      progress: state.methods.bisection,
      pct: getMethodProgressPercentage(state.methods.bisection),
      perf: methodPerformances['bisection'],
      adaptive: adaptiveStates['bisection'],
    },
    {
      id: 'false-position' as const,
      title: 'False Position Method (Regula Falsi)',
      subtitle: 'Linear chord interpolation',
      progress: state.methods['false-position'],
      pct: getMethodProgressPercentage(state.methods['false-position']),
      perf: methodPerformances['false-position'],
      adaptive: adaptiveStates['false-position'],
    },
    {
      id: 'newton-raphson' as const,
      title: 'Newton-Raphson Method',
      subtitle: 'Tangent line rapid convergence',
      progress: state.methods['newton-raphson'],
      pct: getMethodProgressPercentage(state.methods['newton-raphson']),
      perf: methodPerformances['newton-raphson'],
      adaptive: adaptiveStates['newton-raphson'],
    },
  ];

  const handleReset = () => {
    if (
      window.confirm(
        'Are you sure you want to reset all your learning records and attempt history?'
      )
    ) {
      resetProgress();
      resetLearningHistory();
    }
  };

  const isEmpty =
    totalAttempted === 0 &&
    topicsStudied === 0 &&
    attempts.length === 0;

  const handleLaunchRecommendation = () => {
    if (!recommendation) {
      onNavigate('practice');
      return;
    }
    const q = PRACTICE_QUESTIONS.find((item) => item.id === recommendation.questionId);
    if (q) {
      const activeMethod = q.method === 'mixed' ? 'bisection' : q.method;
      onNavigate('solve', {
        action: 'myself',
        method: activeMethod,
        questionConfig: {
          questionId: q.id,
          method: activeMethod,
          equation: q.equation,
          lowerBound: q.bounds[0],
          upperBound: q.bounds[1],
          decimalPlaces: q.decimalPlaces,
          initialGuess: q.x0 ?? q.bounds[0],
          title: q.title,
        },
      });
    } else {
      onNavigate('practice');
    }
  };

  const recentAttempts = [...attempts].reverse().slice(0, 8);

  return (
    <div className="space-y-10 animate-fadeIn">
      {/* Header */}
      <section className="space-y-2 pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cream">Student Learning Record</Badge>
            <Badge variant="neutral">Verified Persistence</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-charcoal dark:text-[#F3F0FA] mt-2">
            Your Learning Progress
          </h1>
          <p className="text-charcoal-muted dark:text-[#B0A7C2] text-base max-w-2xl leading-relaxed">
            Real problem-solving metrics, hint reliance, and method mastery across Numerical Techniques.
          </p>
        </div>

        {!isEmpty && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="self-start sm:self-center text-xs text-charcoal-muted dark:text-[#B0A7C2] hover:text-status-error dark:hover:text-rose-400 flex items-center gap-1.5 btn-press"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset History</span>
          </Button>
        )}
      </section>

      {/* Empty State Banner if no activity yet */}
      {isEmpty && (
        <Card variant="cream" className="border-border-soft dark:border-[#382952] dark:bg-[#1E1430] p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-lavender-deep dark:text-[#C5B8EB]" />
                <h3 className="text-lg font-semibold text-charcoal dark:text-[#F3F0FA]">
                  Start Your Learning Journey
                </h3>
              </div>
              <p className="text-sm text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
                You haven&apos;t attempted any problems yet. Explore a lesson,
                solve with guided hints, or test your understanding in Quiz Mode to see your statistics track here.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('learn')}
                className="flex items-center gap-1.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Explore Lessons</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('practice')}
                className="flex items-center gap-1.5"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>Solve Questions</span>
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* 4 Stat Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Topics Studied */}
        <Card variant="surface" className="space-y-2 dark:bg-[#1E1430] dark:border-[#382952]">
          <div className="flex items-center justify-between text-xs text-charcoal-muted dark:text-[#B0A7C2]">
            <span>Methods Explored</span>
            <BookOpen className="w-4 h-4 text-lavender-deep dark:text-[#C5B8EB]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {topicsStudied}
            <span className="text-sm font-normal text-charcoal-muted dark:text-[#B0A7C2] ml-1">/ 3</span>
          </div>
          <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">
            Bisection, False Position, Newton-Raphson
          </p>
        </Card>

        {/* Questions Solved */}
        <Card variant="surface" className="space-y-2 dark:bg-[#1E1430] dark:border-[#382952]">
          <div className="flex items-center justify-between text-xs text-charcoal-muted dark:text-[#B0A7C2]">
            <span>Questions Solved</span>
            <CheckCircle2 className="w-4 h-4 text-status-success dark:text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {totalSolved}
            <span className="text-xs font-normal text-charcoal-muted dark:text-[#B0A7C2] ml-1">
              ({totalAttempted} attempted)
            </span>
          </div>
          <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">
            {totalAttempted > 0 ? `${accuracy}% overall accuracy` : 'No attempts recorded yet'}
          </p>
        </Card>

        {/* Current Streak */}
        <Card variant="surface" className="space-y-2 dark:bg-[#1E1430] dark:border-[#382952]">
          <div className="flex items-center justify-between text-xs text-charcoal-muted dark:text-[#B0A7C2]">
            <span>Active Streak</span>
            <Flame
              className={`w-4 h-4 ${
                streakDays > 0 ? 'text-status-warning dark:text-amber-400 fill-amber-500' : 'text-charcoal-muted dark:text-[#B0A7C2]'
              }`}
            />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {streakDays}
            <span className="text-sm font-normal text-charcoal-muted dark:text-[#B0A7C2] ml-1">days</span>
          </div>
          <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">
            {streakDays > 0 ? 'Keep up daily problem solving' : 'Practice today to begin a streak'}
          </p>
        </Card>

        {/* Hints Requested */}
        <Card variant="surface" className="space-y-2 dark:bg-[#1E1430] dark:border-[#382952]">
          <div className="flex items-center justify-between text-xs text-charcoal-muted dark:text-[#B0A7C2]">
            <span>Hints Requested</span>
            <HelpCircle className="w-4 h-4 text-lavender-deep dark:text-[#C5B8EB]" />
          </div>
          <div className="text-2xl sm:text-3xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {hintsUsed}
          </div>
          <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">
            Progressive hints across sessions
          </p>
        </Card>
      </section>

      {/* Current Learning Focus (Phase 11) */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-lavender-deep dark:text-[#C5B8EB]" />
            <h2 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA]">Current Learning Focus</h2>
          </div>
          <Badge variant="cream">Adaptive Guidance</Badge>
        </div>

        <Card variant="surface" className="p-5 border-2 border-lavender-dusty/60 dark:border-[#523A78] dark:bg-[#1E1430] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5 max-w-2xl">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="lavender">{learningFocus.topic}</Badge>
                <span className="text-xs font-semibold uppercase tracking-wider text-charcoal-muted dark:text-[#B0A7C2]">
                  Focus Area
                </span>
                {learningFocus.targetQuestionId && (
                  <span className="font-mono text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB]">
                    {learningFocus.targetQuestionId}
                  </span>
                )}
              </div>
              <h3 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA]">{learningFocus.title}</h3>
              <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
                <span className="font-medium text-charcoal dark:text-[#F3F0FA]">Why this focus:</span> {learningFocus.reason}
              </p>
              {learningFocus.evidence.length > 0 && (
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {learningFocus.evidence.map((ev, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-bg-neutral dark:bg-[#251A38] text-charcoal-muted dark:text-[#B0A7C2] px-2 py-0.5 rounded border border-border-soft/60 dark:border-[#382952]"
                    >
                      {ev}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                if (learningFocus.suggestedAction === 'review') {
                  onNavigate('review', { method: learningFocus.method !== 'mixed' ? learningFocus.method : undefined });
                } else if (learningFocus.suggestedAction === 'quiz') {
                  onNavigate('quiz');
                } else if (learningFocus.targetQuestionId) {
                  const target = PRACTICE_QUESTIONS.find((q) => q.id === learningFocus.targetQuestionId);
                  if (target) {
                    const activeMethod = target.method === 'mixed' ? 'bisection' : target.method;
                    onNavigate('solve', {
                      action: 'myself',
                      method: activeMethod,
                      questionConfig: {
                        questionId: target.id,
                        method: activeMethod,
                        equation: target.equation,
                        lowerBound: target.bounds[0],
                        upperBound: target.bounds[1],
                        decimalPlaces: target.decimalPlaces,
                        initialGuess: target.x0 ?? target.bounds[0],
                        title: target.title,
                      },
                    });
                  }
                } else {
                  onNavigate('practice', { method: learningFocus.method !== 'mixed' ? learningFocus.method : undefined });
                }
              }}
              className="shrink-0 flex items-center gap-1.5 self-start sm:self-center"
            >
              <span>
                {learningFocus.suggestedAction === 'review'
                  ? 'Review Topic'
                  : learningFocus.suggestedAction === 'quiz'
                  ? 'Take Quick Quiz'
                  : 'Start Practice'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      </section>

      {/* Today's Focus: Session Plan (Phase 11) */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-lavender-deep dark:text-[#C5B8EB]" />
            <h2 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA]">Today&apos;s Focus (Recommended Session Plan)</h2>
          </div>
          <Badge variant="neutral">3 Step Plan</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {sessionPlan.steps.map((step) => (
            <Card
              key={step.stepNumber}
              variant="surface"
              className="p-4 border-border-soft dark:border-[#382952] dark:bg-[#1E1430] flex flex-col justify-between space-y-3 hover:border-lavender-dusty/50 transition-calm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-lavender-deep dark:text-[#C5B8EB] bg-lavender-light dark:bg-[#34244E] px-2 py-0.5 rounded">
                    Step {step.stepNumber}
                  </span>
                  <Badge variant={step.type === 'assessment' ? 'cream' : 'neutral'}>
                    {step.type.toUpperCase()}
                  </Badge>
                </div>
                <h4 className="text-sm font-semibold text-charcoal dark:text-[#F3F0FA]">{step.title}</h4>
                <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
                  {step.description}
                </p>
                {step.questionId && (
                  <span className="font-mono text-[10px] text-charcoal-muted dark:text-[#B0A7C2] inline-block bg-bg-neutral dark:bg-[#251A38] px-1.5 py-0.5 rounded">
                    {step.questionId}
                  </span>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (step.type === 'assessment') {
                    onNavigate('quiz');
                  } else if (step.type === 'review') {
                    onNavigate('review', { method: step.method !== 'mixed' ? step.method : undefined });
                  } else if (step.questionId) {
                    const target = PRACTICE_QUESTIONS.find((q) => q.id === step.questionId);
                    if (target) {
                      const activeMethod = target.method === 'mixed' ? 'bisection' : target.method;
                      onNavigate('solve', {
                        action: 'myself',
                        method: activeMethod,
                        questionConfig: {
                          questionId: target.id,
                          method: activeMethod,
                          equation: target.equation,
                          lowerBound: target.bounds[0],
                          upperBound: target.bounds[1],
                          decimalPlaces: target.decimalPlaces,
                          initialGuess: target.x0 ?? target.bounds[0],
                          title: target.title,
                        },
                      });
                    }
                  } else {
                    onNavigate('practice', { method: step.method !== 'mixed' ? step.method : undefined });
                  }
                }}
                className="w-full text-xs flex items-center justify-center gap-1.5"
              >
                <span>{step.type === 'assessment' ? 'Start Quiz' : step.type === 'review' ? 'Open Review' : 'Solve Step'}</span>
                <ArrowRight className="w-3 h-3" />
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* Visual Learning Trends & Real Analytics (Phase 13.1) */}
      <LearningAnalyticsCharts
        attempts={attempts}
        adaptiveStates={adaptiveStates}
      />

      {/* Recent Improvements & Demonstrated Strengths (Phase 11) */}
      {strengths.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-status-success dark:text-emerald-400" />
            <h2 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA]">Recent Improvements & Strengths</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {strengths.map((str) => (
              <Card key={str.method} variant="surface" className="p-4 border-status-success/30 dark:border-emerald-800/40 bg-status-success-bg/15 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <Badge variant="cream">{str.topic}</Badge>
                  <span className="text-[11px] font-medium text-status-success dark:text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Consistent Signal</span>
                  </span>
                </div>
                <h4 className="text-xs font-semibold text-charcoal dark:text-[#F3F0FA]">{str.description}</h4>
                <ul className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2] space-y-1 list-disc list-inside">
                  {str.evidence.map((ev, i) => (
                    <li key={i}>{ev}</li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Conservative Weak Topic Alert Banner */}
      {adaptiveWeakTopics.length > 0 && (
        <section className="space-y-3">
          {adaptiveWeakTopics.map((wt) => (
            <div
              key={wt.method}
              className="p-4 rounded-me border border-status-warning/40 dark:border-amber-800/40 bg-status-warning-bg/20 dark:bg-amber-950/20 space-y-2 animate-fadeIn"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-status-warning dark:text-amber-300 font-semibold text-xs uppercase tracking-wide">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Topic Requiring Review • {wt.topic}</span>
                </div>
                <Badge variant="cream">Diagnostic Signal</Badge>
              </div>
              <ul className="text-xs text-charcoal dark:text-[#F3F0FA] space-y-1 list-disc list-inside">
                {wt.reasons.map((r, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {r}
                  </li>
                ))}
              </ul>
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('practice', { method: wt.method })}
                  className="text-xs text-status-warning dark:text-amber-300 border-status-warning/30 dark:border-amber-800/40 hover:bg-status-warning-bg/40"
                >
                  Practice {wt.topic} Problems →
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onNavigate('review', { reviewFilter: 'needs-review' } as any)}
                  className="text-xs text-charcoal dark:text-[#F3F0FA] border-border-soft dark:border-[#382952] hover:bg-bg-neutral dark:hover:bg-[#251A38]"
                >
                  Review Related Questions
                </Button>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Active Methods Breakdown with Explainable Learning States */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-charcoal dark:text-[#F3F0FA]">
              Topic Mastery & Learning States
            </h2>
            <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
              Explainable state transitions based on attempt history and accuracy.
            </p>
          </div>
          <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">Syllabus: Numerical Techniques</span>
        </div>

        <Card variant="surface" className="space-y-5 dark:bg-[#1E1430] dark:border-[#382952]">
          {methodsList.map((m) => {
            const perf = m.perf;
            const adaptive = m.adaptive;
            const adaptiveState: AdaptiveState = adaptive ? adaptive.state : 'not-started';
            const stateBadge = getAdaptiveStateBadge(adaptiveState);

            return (
              <div
                key={m.id}
                className="space-y-3 pb-5 last:pb-0 border-b last:border-0 border-border-soft/60 dark:border-[#382952]"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold text-charcoal dark:text-[#F3F0FA]">{m.title}</h3>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${stateBadge.badgeBg}`}
                      >
                        {stateBadge.label}
                      </span>
                    </div>
                    <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] mt-0.5">{m.subtitle}</p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5 text-xs text-charcoal-muted dark:text-[#B0A7C2]">
                      {m.progress.lessonCompleted && (
                        <span className="px-1.5 py-0.5 rounded bg-status-success-bg dark:bg-[#122A1C] text-status-success dark:text-emerald-400 text-[10px]">
                          Lesson
                        </span>
                      )}
                      {m.progress.solveWithMeCompleted && (
                        <span className="px-1.5 py-0.5 rounded bg-lavender-light dark:bg-[#34244E] text-lavender-deep dark:text-[#C5B8EB] text-[10px]">
                          Solve
                        </span>
                      )}
                      <span className="text-[11px]">
                        {perf ? `${perf.questionsCompleted} completed` : `${m.progress.questionsSolved} solved`}
                      </span>
                    </div>
                    <span className="text-sm font-semibold text-charcoal dark:text-[#F3F0FA] min-w-[36px] text-right">
                      {perf && perf.questionsCompleted > 0 ? `${perf.accuracy}%` : `${m.pct}%`}
                    </span>
                  </div>
                </div>

                <ProgressBar value={perf && perf.questionsCompleted > 0 ? perf.accuracy : m.pct} size="sm" />

                {/* Granular Method Analytics & Adaptive Diagnostics Footer */}
                {adaptive && adaptive.completedAttempts > 0 && (
                  <div className="pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span>Weighted Accuracy: <strong className="text-charcoal dark:text-[#F3F0FA]">{adaptive.weightedAccuracy}%</strong></span>
                      <span>•</span>
                      <span>Unassisted: <strong className="text-charcoal dark:text-[#F3F0FA]">{adaptive.unassistedAccuracy}%</strong></span>
                      {adaptive.assessmentAttemptCount > 0 && (
                        <>
                          <span>•</span>
                          <span>Quiz Score: <strong className="text-charcoal dark:text-[#F3F0FA]">{adaptive.assessmentAccuracy}%</strong> ({adaptive.assessmentAttemptCount} q)</span>
                        </>
                      )}
                      <span>•</span>
                      <span>Avg hints: {adaptive.avgHints}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate('practice', { method: m.id })}
                        className="text-[11px] h-7 px-2"
                      >
                        Practice
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate('review', { method: m.id })}
                        className="text-[11px] h-7 px-2"
                      >
                        Review
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </Card>
      </section>

      {/* Recent Learning Attempt History */}
      {recentAttempts.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-lavender-deep dark:text-[#C5B8EB]" />
              <h2 className="text-lg font-semibold text-charcoal dark:text-[#F3F0FA]">
                Recent Attempt History
              </h2>
            </div>
            <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
              {attempts.length} total attempt{attempts.length === 1 ? '' : 's'} recorded
            </span>
          </div>

          <Card variant="surface" className="divide-y divide-border-soft/60 dark:divide-[#382952] dark:bg-[#1E1430] dark:border-[#382952]">
            {recentAttempts.map((att) => {
              const dateStr = new Date(att.startedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={att.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-medium text-charcoal dark:text-[#F3F0FA]">
                        {att.questionId}
                      </span>
                      <Badge variant="neutral">
                        {att.attemptNumber > 1 ? `Retry #${att.attemptNumber}` : 'Attempt #1'}
                      </Badge>
                      <Badge variant="cream">{att.topic}</Badge>
                      {att.status === 'completed' ? (
                        att.correct ? (
                          <span className="flex items-center gap-1 text-[11px] text-status-success dark:text-emerald-300 font-medium bg-status-success-bg dark:bg-emerald-950/40 px-2 py-0.5 rounded-me">
                            <CheckCircle2 className="w-3 h-3" />
                            Correct
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[11px] text-status-error dark:text-rose-300 font-medium bg-status-error-bg dark:bg-rose-950/40 px-2 py-0.5 rounded-me">
                            <XCircle className="w-3 h-3" />
                            Needs Review
                          </span>
                        )
                      ) : (
                        <span className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2] bg-bg-neutral dark:bg-[#251A38] px-2 py-0.5 rounded-me">
                          In Progress
                        </span>
                      )}
                    </div>

                    {att.mistakeCategories.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                        <span className="text-[10px] text-charcoal-muted dark:text-[#B0A7C2] font-medium">Diagnosed:</span>
                        {att.mistakeCategories.map((mc, idx) => (
                          <span
                            key={idx}
                            className="px-1.5 py-0.2 rounded bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] border border-amber-500/20 dark:border-amber-800/40"
                          >
                            {formatMistakeLabel(mc)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-4 text-charcoal-muted dark:text-[#B0A7C2] text-[11px] shrink-0">
                    <div className="flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>{att.hintsUsed} hints</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{att.durationSeconds}s</span>
                    </div>
                    <span>{dateStr}</span>
                    <button
                      onClick={() =>
                        onNavigate('review', {
                          reviewQuestionId: att.questionId,
                        } as any)
                      }
                      className="text-[11px] font-medium text-lavender-deep dark:text-[#C5B8EB] hover:text-charcoal dark:hover:text-[#F3F0FA] hover:underline transition-calm ml-1"
                    >
                      Review →
                    </button>
                  </div>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* Recent Assessment Performance */}
      {latestAssessment && latestAssessment.results && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Award className="w-4 h-4 text-lavender-deep dark:text-[#C5B8EB]" />
              <h2 className="text-lg font-semibold text-charcoal dark:text-[#F3F0FA]">
                Recent Assessment
              </h2>
            </div>
            <button
              onClick={() => onNavigate('quiz')}
              className="text-xs font-medium text-lavender-deep dark:text-[#C5B8EB] hover:text-charcoal dark:hover:text-[#F3F0FA] flex items-center gap-1 transition-calm"
            >
              <span>Assessment Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <Card variant="surface" className="p-4 sm:p-5 border-border-soft dark:border-[#382952] dark:bg-[#1E1430] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-charcoal dark:text-[#F3F0FA]">
                  {latestAssessment.title}
                </span>
                <span className="text-xs font-semibold text-status-success dark:text-emerald-300 bg-status-success-bg dark:bg-emerald-950/40 px-2 py-0.5 rounded-me">
                  {latestAssessment.results.correctCount}/{latestAssessment.results.totalQuestions} Correct ({latestAssessment.results.accuracy}%)
                </span>
                {latestAssessment.results.unassistedCorrectCount < latestAssessment.results.correctCount && (
                  <span className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">
                    ({latestAssessment.results.unassistedCorrectCount} unassisted)
                  </span>
                )}
              </div>
              <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
                Completed on {new Date(latestAssessment.completedAt || latestAssessment.startedAt).toLocaleDateString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })} • Total Time: {Math.round(latestAssessment.results.totalTimeSeconds / 60)}m {latestAssessment.results.totalTimeSeconds % 60}s
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('quiz')}
              className="text-xs self-start sm:self-center shrink-0"
            >
              Open Quiz Hub
            </Button>
          </Card>
        </section>
      )}
    </div>
  );
};
