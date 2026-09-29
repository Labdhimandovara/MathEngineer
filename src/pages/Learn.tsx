import React, { useState } from 'react';
import { PageId } from '../types/index.ts';
import { SYLLABUS_TOPICS } from '../data/syllabus.ts';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { ProgressBar } from '../components/ui/ProgressBar.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { ArrowRight, BookOpen, Clock, CheckCircle2, Lock, Sparkles, RotateCcw } from 'lucide-react';
import { BisectionLesson } from '../components/learn/BisectionLesson.tsx';
import { FalsePositionLesson } from '../components/learn/FalsePositionLesson.tsx';
import { NewtonRaphsonLesson } from '../components/learn/NewtonRaphsonLesson.tsx';
import { useLearningAttempts, aggregateAllMethods } from '../services/learning/index.ts';
import { useAssessmentHistory } from '../services/assessment/index.ts';
import { deriveAdaptiveTopicStates } from '../services/adaptive/index.ts';

interface LearnProps {
  onNavigate: (
    page: PageId,
    options?: { action?: 'none' | 'myself' | 'hints' | 'solution'; method?: string }
  ) => void;
  onActiveLessonChange?: (method: 'bisection' | 'false-position' | 'newton-raphson' | null) => void;
}

export const Learn: React.FC<LearnProps> = ({ onNavigate, onActiveLessonChange }) => {
  const [selectedLesson, setSelectedLesson] = useState<
    'bisection' | 'false-position' | 'newton-raphson' | null
  >('bisection');

  const attempts = useLearningAttempts();
  const assessments = useAssessmentHistory();
  const methodPerformances = aggregateAllMethods(attempts);
  const adaptiveStates = deriveAdaptiveTopicStates(attempts, assessments);

  React.useEffect(() => {
    onActiveLessonChange?.(selectedLesson);
  }, [selectedLesson, onActiveLessonChange]);

  const activeTopics = SYLLABUS_TOPICS.filter((t) => t.isMvp);
  const upcomingTopics = SYLLABUS_TOPICS.filter((t) => !t.isMvp);

  // If a lesson is selected, render the corresponding course-grounded lesson
  if (selectedLesson === 'bisection') {
    return (
      <BisectionLesson
        onNavigate={onNavigate}
        onBackToCurriculum={() => setSelectedLesson(null)}
      />
    );
  }

  if (selectedLesson === 'false-position') {
    return (
      <FalsePositionLesson
        onNavigate={onNavigate}
        onBackToCurriculum={() => setSelectedLesson(null)}
      />
    );
  }

  if (selectedLesson === 'newton-raphson') {
    return (
      <NewtonRaphsonLesson
        onNavigate={onNavigate}
        onBackToCurriculum={() => setSelectedLesson(null)}
      />
    );
  }

  // Otherwise, render Curriculum Overview
  return (
    <div className="space-y-12 animate-fadeIn max-w-4xl mx-auto">
      {/* Course Header */}
      <section className="space-y-3 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="cream">Curriculum</Badge>
            <Badge variant="neutral">University-focused</Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLesson('bisection')}
              className="text-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Bisection</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLesson('false-position')}
              className="text-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>False Position</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedLesson('newton-raphson')}
              className="text-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Newton-Raphson</span>
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-charcoal dark:text-[#F3F0FA] font-sans">
            Numerical Techniques
          </h1>
          <p className="text-charcoal-muted dark:text-[#B0A7C2] text-base max-w-2xl mt-1.5 leading-relaxed">
            Standard undergraduate engineering curriculum for computational methods and root-finding algorithms.
          </p>
        </div>
      </section>

      {/* Unit 01: Numerical solution of algebraic and transcendental equations */}
      <section className="space-y-6">
        <div className="border-b border-border-soft dark:border-[#382952] pb-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider">
              Unit 01
            </span>
            <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA] font-sans">
              Numerical solution of algebraic and transcendental equations
            </h2>
          </div>
          <Badge variant="lavender">Active Unit</Badge>
        </div>

        {/* Active Topics */}
        <div className="space-y-4">
          {activeTopics.map((topic, index) => {
            const isStarted = topic.progressPercentage > 0;
            const topicLessonKey = topic.id as 'bisection' | 'false-position' | 'newton-raphson';

            return (
              <Card
                key={topic.id}
                variant="surface"
                className="dark:bg-[#1E1430] dark:border-[#382952] hover:border-lavender-dusty/60 dark:hover:border-[#5C4580] transition-calm"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  {/* Topic Details */}
                  <div className="space-y-2 max-w-xl">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-serif text-sm font-semibold text-lavender-deep dark:text-[#C5B8EB] w-6">
                        0{index + 1}.
                      </span>
                      <h3 className="text-lg font-semibold text-charcoal dark:text-[#F3F0FA]">
                        {topic.title}
                      </h3>
                      <Badge variant="lavender">Interactive Lesson Ready</Badge>
                      {(() => {
                        const adaptive = adaptiveStates[topic.id as 'bisection' | 'false-position' | 'newton-raphson'];
                        if (!adaptive || adaptive.state === 'not-started') return null;
                        if (adaptive.state === 'needs-review') {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-warning-bg/40 dark:bg-amber-950/40 text-status-warning dark:text-amber-300 border border-status-warning/40 dark:border-amber-800/40">
                              Needs Review
                            </span>
                          );
                        }
                        if (adaptive.state === 'consistent') {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-status-success-bg dark:bg-emerald-950/40 text-status-success dark:text-emerald-300 border border-status-success/30 dark:border-emerald-800/40">
                              Consistent
                            </span>
                          );
                        }
                        if (adaptive.state === 'developing') {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-lavender-light dark:bg-[#34244E] text-lavender-deep dark:text-[#C5B8EB] border border-lavender-dusty/40 dark:border-[#4B3B6E]">
                              Developing
                            </span>
                          );
                        }
                        if (adaptive.state === 'practicing') {
                          return (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-neutral dark:bg-[#251A38] text-charcoal dark:text-[#F3F0FA] border border-border-soft dark:border-[#382952]">
                              Practicing
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] pl-8 leading-relaxed">
                      {topic.subtitle}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-charcoal-muted dark:text-[#B0A7C2] pl-8 pt-1">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-lavender-deep dark:text-[#C5B8EB]" />
                        <span>10 Course Steps</span>
                      </div>
                      <span>•</span>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-charcoal-muted dark:text-[#B0A7C2]" />
                        <span>Self-paced</span>
                      </div>
                    </div>
                  </div>

                  {/* Progress and Action */}
                  <div className="flex flex-col sm:flex-row md:flex-col items-start md:items-end justify-between gap-4 md:w-56 shrink-0">
                    <div className="w-full space-y-1.5 text-right">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-charcoal-muted dark:text-[#B0A7C2] flex items-center gap-1">
                          {isStarted ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-status-success dark:text-emerald-400" />
                          ) : null}
                          <span>Progress</span>
                        </span>
                        <span className="font-medium text-charcoal dark:text-[#F3F0FA]">
                          {topic.progressPercentage}%
                        </span>
                      </div>
                      <ProgressBar value={topic.progressPercentage} size="sm" />
                    </div>

                    <div className="flex items-center gap-2 w-full">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setSelectedLesson(topicLessonKey)}
                        className="flex-1"
                      >
                        <span>Open Lesson</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onNavigate('solve', { action: 'myself', method: topic.id })}
                        className="text-xs"
                        title="Try it myself in Solve workspace"
                      >
                        Try
                      </Button>
                    </div>

                    {(() => {
                      const perf = methodPerformances[topic.id as MethodId];
                      const adaptive = adaptiveStates[topic.id as 'bisection' | 'false-position' | 'newton-raphson'];

                      if (adaptive && adaptive.state === 'needs-review') {
                        return (
                          <div className="flex items-center gap-2 w-full pt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onNavigate('review', { method: topic.id } as any)}
                              className="flex-1 text-[11px] text-status-warning dark:text-amber-300 border-status-warning/40 dark:border-amber-800/40 hover:bg-status-warning-bg/30"
                            >
                              <span>Review</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => onNavigate('practice', { method: topic.id })}
                              className="flex-1 text-[11px]"
                            >
                              <span>Practice</span>
                            </Button>
                          </div>
                        );
                      }
                      if (perf && perf.questionsAttempted > 0) {
                        return (
                          <button
                            onClick={() => onNavigate('review', { method: topic.id } as any)}
                            className="text-xs text-lavender-deep dark:text-[#C5B8EB] hover:text-charcoal dark:hover:text-[#F3F0FA] flex items-center gap-1 font-medium transition-calm self-end pt-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Review attempts ({perf.questionsAttempted})</span>
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Confirmed Upcoming Topics from the Syllabus */}
      <section className="space-y-4 pt-4">
        <div className="border-b border-border-soft dark:border-[#382952] pb-3 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-charcoal-muted dark:text-[#B0A7C2] uppercase tracking-wider">
              Upcoming Modules
            </span>
            <h2 className="text-lg font-semibold text-charcoal dark:text-[#F3F0FA]">
              Confirmed Syllabus Roadmap
            </h2>
          </div>
          <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">Coming in subsequent releases</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {upcomingTopics.map((topic) => (
            <div
              key={topic.id}
              className="p-4 rounded-me-lg bg-bg-primary/50 dark:bg-[#1E1430]/70 border border-border-soft/70 dark:border-[#382952] flex items-start justify-between gap-3 text-charcoal-muted dark:text-[#B0A7C2]"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-charcoal dark:text-[#F3F0FA]">
                    {topic.title}
                  </h4>
                </div>
                <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
                  {topic.subtitle}
                </p>
              </div>
              <div className="p-1.5 rounded-me bg-bg-neutral/70 dark:bg-[#251A38] text-charcoal-subtle dark:text-[#8E83A3]">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
