import React from 'react';
import { PageId } from '../types/index.ts';
import {
  useProgress,
  getActiveStreak,
  getTotalSolved,
  getTotalHintsUsed,
  getMethodProgressPercentage,
} from '../services/progress/index.ts';
import { PRACTICE_QUESTIONS } from '../data/practiceQuestions.ts';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { ProgressBar } from '../components/ui/ProgressBar.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { HeroMathAnimation } from '../components/home/HeroMathAnimation.tsx';
import {
  ArrowRight,
  BookOpen,
  Compass,
  PenTool,
  CheckCircle2,
  Flame,
  HelpCircle,
  Sparkles,
} from 'lucide-react';

interface HomeProps {
  onNavigate: (
    page: PageId,
    options?: { method?: string; action?: 'none' | 'myself' | 'hints' | 'solution' }
  ) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const progressState = useProgress();
  const streakDays = getActiveStreak(progressState);
  const totalSolved = getTotalSolved(progressState);
  const hintsUsed = getTotalHintsUsed(progressState);

  const activeMethods = [
    {
      id: 'bisection',
      title: 'Bisection Method',
      pct: getMethodProgressPercentage(progressState.methods.bisection),
    },
    {
      id: 'false-position',
      title: 'False Position Method',
      pct: getMethodProgressPercentage(progressState.methods['false-position']),
    },
    {
      id: 'newton-raphson',
      title: 'Newton-Raphson Method',
      pct: getMethodProgressPercentage(progressState.methods['newton-raphson']),
    },
  ];

  const recommendedQuestion = PRACTICE_QUESTIONS[0]; // Course classic x^3 - x - 1

  return (
    <div className="space-y-12 animate-fadeIn">
      {/* Editorial Hero Section */}
      <section className="space-y-6 pt-3 pb-2 text-left">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="cream">Undergraduate Mathematics</Badge>
          <Badge variant="lavender">Deterministic Numerical Techniques</Badge>
        </div>

        <div className="space-y-3 max-w-3xl">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight text-charcoal dark:text-charcoal-light font-semibold leading-[1.2]">
            <span className="font-serif italic font-normal text-lavender-deep dark:text-lavender-accent block sm:inline">
              Engineering Mathematics,{' '}
            </span>
            understood step by step.
          </h1>
          <p className="text-charcoal-muted dark:text-charcoal-subtle text-base sm:text-lg leading-relaxed max-w-2xl font-sans">
            Strengthen your mathematical intuition with deterministic step-by-step algorithms,
            verified interval convergence, progressive hints, and focused university problem sets.
          </p>
        </div>

        {/* Hero Actions */}
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <Button
            variant="primary"
            size="lg"
            onClick={() => onNavigate('learn')}
            className="flex items-center gap-2 shadow-card"
          >
            <span>Start Learning</span>
            <ArrowRight className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="lg"
            onClick={() => onNavigate('practice')}
            className="flex items-center gap-2"
          >
            <Compass className="w-4 h-4 text-lavender-deep dark:text-lavender-accent" />
            <span>Explore Topics</span>
          </Button>
        </div>

        {/* Signature MathEngineer Animation & Convergence Showcase */}
        <div className="pt-3">
          <HeroMathAnimation />
        </div>
      </section>

      {/* Primary Section: Continue Learning Card */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-semibold text-charcoal dark:text-charcoal-light font-sans">
              Continue Learning
            </h2>
            <span className="text-xs text-charcoal-muted dark:text-charcoal-subtle">• Numerical Techniques</span>
          </div>
          <button
            onClick={() => onNavigate('learn')}
            className="text-xs font-medium text-lavender-deep dark:text-lavender-accent hover:text-charcoal dark:hover:text-charcoal-light flex items-center gap-1 transition-calm btn-press"
          >
            <span>View all topics</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <Card variant="surface" className="border-border-soft dark:border-border-dark">
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border-soft/60 dark:border-border-dark/60">
              <div>
                <span className="text-xs font-semibold text-lavender-deep dark:text-lavender-accent tracking-wider uppercase">
                  Active Unit
                </span>
                <h3 className="text-xl font-semibold text-charcoal dark:text-charcoal-light mt-0.5 font-sans">
                  Numerical Solution of Equations
                </h3>
                <p className="text-xs text-charcoal-muted dark:text-charcoal-subtle mt-1">
                  Bisection, Regula Falsi, and Newton-Raphson methods
                </p>
              </div>
              <Button
                variant="primary"
                onClick={() => onNavigate('solve', { method: 'bisection', action: 'myself' })}
                className="self-start sm:self-auto"
              >
                <span>Launch Interactive Solver</span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>

            {/* Methods Progress in Active Scope */}
            <div className="space-y-4">
              <span className="text-xs font-medium text-charcoal-muted dark:text-charcoal-subtle">
                Method Progress
              </span>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {activeMethods.map((topic) => (
                  <div
                    key={topic.id}
                    onClick={() => onNavigate('learn')}
                    className="p-4 rounded-me bg-bg-primary/70 dark:bg-bg-darkCard/60 border border-border-soft/70 dark:border-border-dark hover:border-lavender-dusty/60 dark:hover:border-lavender-accent/40 cursor-pointer transition-calm space-y-2.5 btn-press"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-charcoal dark:text-charcoal-light">
                        {topic.title}
                      </span>
                      <span className="text-xs font-medium text-charcoal-muted dark:text-charcoal-subtle">
                        {topic.pct}%
                      </span>
                    </div>
                    <ProgressBar value={topic.pct} size="sm" />
                    <div className="flex items-center justify-between text-[11px] text-charcoal-muted dark:text-charcoal-subtle pt-1">
                      <span>
                        {topic.pct > 0 ? `${topic.pct}% mastered` : 'Ready to start'}
                      </span>
                      <span className="text-lavender-deep dark:text-lavender-accent font-medium">Explore</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      </section>

      {/* Two Column Section: Today's Practice & Student Streak/Progress Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Today's Practice (2 columns) */}
        <section className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal dark:text-charcoal-light font-sans">
              Recommended Practice
            </h2>
            <Badge variant="neutral">Curated Problem</Badge>
          </div>

          <Card variant="cream" className="space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Badge variant="lavender">{recommendedQuestion.categoryLabel}</Badge>
                  <span className="text-xs text-charcoal-muted dark:text-charcoal-subtle">
                    {recommendedQuestion.difficulty} • ~{recommendedQuestion.estimatedMinutes} mins
                  </span>
                </div>
                <h3 className="text-lg font-semibold text-charcoal dark:text-charcoal-light pt-1 font-sans">
                  {recommendedQuestion.title}
                </h3>
                <p className="text-sm text-charcoal-muted dark:text-charcoal-subtle">
                  Equation: <code className="font-mono bg-bg-surface dark:bg-bg-darkDeep px-1.5 py-0.5 rounded border border-border-soft dark:border-border-dark text-charcoal dark:text-charcoal-light">{recommendedQuestion.equationDisplay}</code> on interval [{recommendedQuestion.bounds[0]}, {recommendedQuestion.bounds[1]}]
                </p>
              </div>
            </div>

            <p className="text-sm text-charcoal dark:text-charcoal-light leading-relaxed bg-bg-surface/80 dark:bg-bg-darkDeep/60 p-3.5 rounded-me border border-border-soft/60 dark:border-border-dark/60 font-sans">
              {recommendedQuestion.description}
            </p>

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2 text-xs text-charcoal-muted dark:text-charcoal-subtle">
                <span>Verified Target</span>
                <span>•</span>
                <span>Root ~{recommendedQuestion.expectedRoot}</span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => onNavigate('practice')}
              >
                <span>Open in Practice Bank</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </Card>
        </section>

        {/* Student Consistency & Progress Overview (1 column) */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-charcoal dark:text-charcoal-light font-sans">
              Your Record
            </h2>
            <Badge variant="cream">Live</Badge>
          </div>

          <Card variant="surface" className="space-y-5">
            {/* Streak Widget */}
            <div className="flex items-center justify-between pb-4 border-b border-border-soft/60 dark:border-border-dark/60">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-me bg-status-warning-bg dark:bg-amber-950/40 flex items-center justify-center text-status-warning">
                  <Flame
                    className={`w-5 h-5 ${
                      streakDays > 0 ? 'text-status-warning fill-amber-500' : 'text-charcoal-muted dark:text-charcoal-subtle'
                    }`}
                  />
                </div>
                <div>
                  <div className="text-base font-semibold text-charcoal dark:text-charcoal-light font-sans">
                    {streakDays} Day Streak
                  </div>
                  <div className="text-xs text-charcoal-muted dark:text-charcoal-subtle">
                    {streakDays > 0 ? 'Active study streak' : 'Practice to start streak'}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-3 rounded-me bg-bg-primary/80 dark:bg-bg-darkCard/50 border border-border-soft/60 dark:border-border-dark">
                <div className="text-xs text-charcoal-muted dark:text-charcoal-subtle flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                  <span>Solved</span>
                </div>
                <div className="text-xl font-semibold text-charcoal dark:text-charcoal-light mt-1 font-mono">
                  {totalSolved}
                </div>
                <div className="text-[11px] text-charcoal-muted dark:text-charcoal-subtle">Questions completed</div>
              </div>

              <div className="p-3 rounded-me bg-bg-primary/80 dark:bg-bg-darkCard/50 border border-border-soft/60 dark:border-border-dark">
                <div className="text-xs text-charcoal-muted dark:text-charcoal-subtle flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-lavender-deep dark:text-lavender-accent" />
                  <span>Hints used</span>
                </div>
                <div className="text-xl font-semibold text-charcoal dark:text-charcoal-light mt-1 font-mono">
                  {hintsUsed}
                </div>
                <div className="text-[11px] text-charcoal-muted dark:text-charcoal-subtle">Progressive hints</div>
              </div>
            </div>

            {/* Learning Principle */}
            <div className="p-3 rounded-me bg-bg-cream/40 dark:bg-bg-darkCard/40 border border-border-soft/50 dark:border-border-dark text-xs text-charcoal-muted dark:text-charcoal-subtle space-y-1">
              <div className="font-semibold text-charcoal dark:text-charcoal-light">Study Principle</div>
              <p className="leading-relaxed">
                Attempt steps independently first. Hints are tiered from conceptual reminders to concrete formulas.
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onNavigate('progress')}
            >
              <span>View Full Progress</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Card>
        </section>
      </div>

      {/* Platform Navigation Cards */}
      <section className="space-y-4 pt-4">
        <h2 className="text-lg font-semibold text-charcoal dark:text-charcoal-light font-sans">
          Explore MathEngineer
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            onClick={() => onNavigate('learn')}
            className="p-5 rounded-me-lg bg-bg-surface dark:bg-bg-darkSurface border border-border-soft dark:border-border-dark hover:border-lavender-dusty/60 dark:hover:border-lavender-accent/40 cursor-pointer transition-calm space-y-2 group shadow-subtle btn-press"
          >
            <div className="w-8 h-8 rounded-me bg-lavender-light dark:bg-bg-darkAccent flex items-center justify-center text-lavender-deep dark:text-lavender-accent group-hover:bg-lavender-soft/30 transition-calm">
              <BookOpen className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-charcoal dark:text-charcoal-light group-hover:text-lavender-deep dark:group-hover:text-lavender-accent transition-calm font-sans">
              Learn Modules
            </h3>
            <p className="text-xs text-charcoal-muted dark:text-charcoal-subtle leading-relaxed">
              Master Bisection, Regula Falsi, and Newton-Raphson through structured 10-part lessons.
            </p>
          </div>

          <div
            onClick={() => onNavigate('solve')}
            className="p-5 rounded-me-lg bg-bg-surface dark:bg-bg-darkSurface border border-border-soft dark:border-border-dark hover:border-lavender-dusty/60 dark:hover:border-lavender-accent/40 cursor-pointer transition-calm space-y-2 group shadow-subtle btn-press"
          >
            <div className="w-8 h-8 rounded-me bg-lavender-light dark:bg-bg-darkAccent flex items-center justify-center text-lavender-deep dark:text-lavender-accent group-hover:bg-lavender-soft/30 transition-calm">
              <PenTool className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-charcoal dark:text-charcoal-light group-hover:text-lavender-deep dark:group-hover:text-lavender-accent transition-calm font-sans">
              Interactive Solver
            </h3>
            <p className="text-xs text-charcoal-muted dark:text-charcoal-subtle leading-relaxed">
              Step through iterations with immediate validation, mistake diagnosis, and explained solutions.
            </p>
          </div>

          <div
            onClick={() => onNavigate('practice')}
            className="p-5 rounded-me-lg bg-bg-surface dark:bg-bg-darkSurface border border-border-soft dark:border-border-dark hover:border-lavender-dusty/60 dark:hover:border-lavender-accent/40 cursor-pointer transition-calm space-y-2 group shadow-subtle btn-press"
          >
            <div className="w-8 h-8 rounded-me bg-lavender-light dark:bg-bg-darkAccent flex items-center justify-center text-lavender-deep dark:text-lavender-accent group-hover:bg-lavender-soft/30 transition-calm">
              <Compass className="w-4 h-4" />
            </div>
            <h3 className="text-base font-semibold text-charcoal dark:text-charcoal-light group-hover:text-lavender-deep dark:group-hover:text-lavender-accent transition-calm font-sans">
              Practice Bank
            </h3>
            <p className="text-xs text-charcoal-muted dark:text-charcoal-subtle leading-relaxed">
              20 verified problems across methods, difficulty levels, and a side-by-side Method Comparison tool.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
