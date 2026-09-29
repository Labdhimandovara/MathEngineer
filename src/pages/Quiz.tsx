import React, { useState, useEffect } from 'react';
import { PageId } from '../types/index.ts';
import {
  PRESET_QUIZZES,
  calculateRemainingSeconds,
} from '../services/assessment/assessmentEngine.ts';
import {
  startAssessmentSession,
  useActiveAssessment,
  useAssessmentHistory,
  recordAnswer,
  recordAssessmentSolutionView,
  toggleFlagQuestion,
  setCurrentIndex,
  submitAssessmentSession,
  abandonAssessmentSession,
} from '../services/assessment/assessmentStore.ts';
import {
  AssessmentSession,
  QuizPresetConfig,
} from '../services/assessment/assessmentTypes.ts';
import { PRACTICE_QUESTIONS } from '../data/practiceQuestions.ts';
import { QuizCard } from '../components/assessment/QuizCard.tsx';
import { QuizSummaryModal } from '../components/assessment/QuizSummaryModal.tsx';
import { QuizResultView } from '../components/assessment/QuizResultView.tsx';
import { Card } from '../components/ui/Card.tsx';
import { Button } from '../components/ui/Button.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import {
  Award,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Compass,
  ArrowRight,
  Flame,
  Zap,
  HelpCircle,
  X,
  Play,
} from 'lucide-react';

interface QuizProps {
  onNavigate: (page: PageId, options?: any) => void;
}

export const Quiz: React.FC<QuizProps> = ({ onNavigate }) => {
  const activeSession = useActiveAssessment();
  const history = useAssessmentHistory();

  const [inspectingSession, setInspectingSession] = useState<AssessmentSession | null>(null);
  const [isSummaryOpen, setIsSummaryOpen] = useState<boolean>(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  // Authoritative countdown timer for timed assessments
  useEffect(() => {
    if (!activeSession || !activeSession.timeLimitSeconds || activeSession.status !== 'active') {
      setRemainingSeconds(null);
      return;
    }

    const updateTimer = () => {
      const rem = calculateRemainingSeconds(
        activeSession.startedAt,
        activeSession.timeLimitSeconds!
      );
      setRemainingSeconds(rem);

      if (rem <= 0) {
        // Automatic timeout submission
        submitAssessmentSession(true);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.id, activeSession?.startedAt, activeSession?.timeLimitSeconds, activeSession?.status]);

  // Handle starting a preset quiz
  const handleStartPreset = (preset: QuizPresetConfig) => {
    setInspectingSession(null);
    startAssessmentSession({
      type: preset.type,
      title: preset.title,
      method: preset.method,
      questionCount: preset.questionCount,
      timeLimitSeconds: preset.timeLimitSeconds,
    });
  };

  // 1. RENDER RESULT VIEW IF INSPECTING COMPLETED SESSION
  if (inspectingSession && inspectingSession.status === 'completed') {
    return (
      <div className="space-y-6">
        <QuizResultView
          session={inspectingSession}
          onTryAgain={() => {
            setInspectingSession(null);
            startAssessmentSession({
              type: inspectingSession.type,
              method: inspectingSession.method,
              timeLimitSeconds: inspectingSession.timeLimitSeconds,
              questionCount: inspectingSession.questionIds.length,
            });
          }}
          onReturnToQuizzes={() => setInspectingSession(null)}
          onNavigateToReview={(questionId) => {
            onNavigate('review', { reviewQuestionId: questionId });
          }}
          onNavigate={onNavigate}
        />
      </div>
    );
  }

  // 2. RENDER ACTIVE QUIZ SESSION
  if (activeSession && activeSession.status === 'active') {
    const currentQId = activeSession.questionIds[activeSession.currentIndex];
    const currentQuestion = PRACTICE_QUESTIONS.find((q) => q.id === currentQId);
    const currentAnswer = activeSession.answers[currentQId];
    const isFlagged = activeSession.flaggedQuestionIds.includes(currentQId);

    // Format timer
    let timerDisplay = '';
    if (remainingSeconds !== null) {
      const mins = Math.floor(remainingSeconds / 60);
      const secs = remainingSeconds % 60;
      timerDisplay = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }

    return (
      <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto">
        {/* Top Active Session Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] rounded-me shadow-subtle">
          <div className="flex items-center gap-2.5">
            <span className="font-semibold text-sm text-charcoal dark:text-[#F3F0FA]">
              {activeSession.title}
            </span>
            <Badge variant="cream">
              Question {activeSession.currentIndex + 1} of {activeSession.questionIds.length}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            {remainingSeconds !== null && (
              <div
                className={`flex items-center gap-1.5 px-3 py-1 rounded-me text-xs font-mono font-semibold border transition-all ${
                  remainingSeconds < 60
                    ? 'bg-status-error-bg dark:bg-[#2D1216] text-status-error dark:text-rose-400 border-status-error/40 dark:border-rose-700/50 animate-pulse'
                    : 'bg-bg-primary dark:bg-[#251A38] text-charcoal dark:text-[#F3F0FA] border-border-soft dark:border-[#382952]'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{timerDisplay}</span>
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (window.confirm('Are you sure you want to abandon this assessment? Your progress will not be recorded.')) {
                  abandonAssessmentSession();
                }
              }}
              className="text-xs text-charcoal-muted dark:text-[#B0A7C2] hover:text-status-error dark:hover:text-rose-400 btn-press"
            >
              Abandon
            </Button>
          </div>
        </div>

        {/* Current Question Card */}
        {currentQuestion && (
          <QuizCard
            question={currentQuestion}
            questionNumber={activeSession.currentIndex + 1}
            totalQuestions={activeSession.questionIds.length}
            answer={currentAnswer}
            isFlagged={isFlagged}
            onSaveAnswer={(val) => {
              recordAnswer({ questionId: currentQId, answer: val });
            }}
            onToggleFlag={() => toggleFlagQuestion(currentQId)}
            onNext={() => setCurrentIndex(activeSession.currentIndex + 1)}
            onPrev={() => setCurrentIndex(activeSession.currentIndex - 1)}
            onOpenSummary={() => setIsSummaryOpen(true)}
            onRevealSolution={() => recordAssessmentSolutionView(currentQId)}
          />
        )}

        {/* Summary Modal before submission */}
        {isSummaryOpen && (
          <QuizSummaryModal
            session={activeSession}
            onSelectQuestion={(idx) => setCurrentIndex(idx)}
            onSubmit={() => {
              setIsSummaryOpen(false);
              const completed = submitAssessmentSession(false);
              if (completed) {
                setInspectingSession(completed);
              }
            }}
            onClose={() => setIsSummaryOpen(false)}
          />
        )}
      </div>
    );
  }

  // 3. RENDER ASSESSMENT HUB LANDING PAGE (NO ACTIVE QUIZ)
  return (
    <div className="space-y-8 animate-fadeIn max-w-5xl mx-auto">
      {/* Header */}
      <section className="space-y-2 pt-2">
        <div className="flex items-center gap-2">
          <Badge variant="cream">Assessment & Quizzes</Badge>
          <Badge variant="neutral">Reduced Assistance</Badge>
        </div>
        <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-charcoal dark:text-[#F3F0FA] mt-2">
          Test Your Understanding
        </h1>
        <p className="text-charcoal-muted dark:text-[#B0A7C2] text-base max-w-2xl leading-relaxed">
          Measure your current mastery under unassisted conditions. Solve problems without immediate hints, verify your roots, and test your exam pace.
        </p>
      </section>

      {/* Preset Quiz Options Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-charcoal dark:text-[#F3F0FA]">
            Available Assessment Formats
          </h2>
          <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
            {PRESET_QUIZZES.length} assessment formats
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_QUIZZES.map((quiz) => (
            <Card
              key={quiz.id}
              variant="surface"
              className="p-5 flex flex-col justify-between space-y-4 border-border-soft hover:border-lavender-dusty/60 dark:hover:border-lavender-dusty/50 transition-calm"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={quiz.type === 'timed' ? 'neutral' : 'lavender'}>
                    {quiz.type === 'timed' ? 'Timed' : quiz.type === 'method' ? 'Method' : 'General'}
                  </Badge>
                  <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2] font-medium">
                    {quiz.questionCount} Questions
                  </span>
                </div>

                <h3 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA] leading-snug">
                  {quiz.title}
                </h3>

                <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
                  {quiz.subtitle}
                </p>
              </div>

              <div className="pt-2 border-t border-border-soft/60 dark:border-[#382952] flex items-center justify-between gap-2">
                {quiz.timeLimitSeconds ? (
                  <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-lavender-deep dark:text-[#C5B8EB]" />
                    <span>{Math.round(quiz.timeLimitSeconds / 60)} mins</span>
                  </span>
                ) : (
                  <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">Untimed</span>
                )}

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleStartPreset(quiz)}
                  className="text-xs flex items-center gap-1 btn-press"
                >
                  <span>Start Quiz</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* Assessment History Section */}
      <section className="space-y-4 pt-4 border-t border-border-soft dark:border-[#382952]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-lavender-deep dark:text-[#C5B8EB]" />
            <h2 className="text-lg font-semibold text-charcoal dark:text-[#F3F0FA]">
              Past Assessment History
            </h2>
          </div>
          {history.length > 0 && (
            <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
              {history.length} completed
            </span>
          )}
        </div>

        {history.length === 0 ? (
          <Card variant="surface" className="p-8 text-center space-y-2 border-border-soft max-w-lg mx-auto">
            <p className="text-sm font-medium text-charcoal dark:text-[#F3F0FA]">
              No previous assessments recorded yet
            </p>
            <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
              Complete your first quiz above to track unassisted performance and test readiness over time.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {history.map((sess) => {
              const res = sess.results;
              const dateStr = new Date(sess.completedAt || sess.startedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <Card
                  key={sess.id}
                  variant="surface"
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-border-soft hover:border-lavender-dusty/60 dark:hover:border-lavender-dusty/50 transition-calm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-charcoal dark:text-[#F3F0FA]">
                        {sess.title}
                      </span>
                      <Badge variant="neutral">{sess.type}</Badge>
                      {res && (
                        <span className="text-xs font-semibold text-status-success dark:text-emerald-400 bg-status-success-bg dark:bg-[#122A1C]/50 px-2 py-0.5 rounded-me">
                          {res.accuracy}% Accuracy ({res.correctCount}/{res.totalQuestions})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-charcoal-muted dark:text-[#B0A7C2] flex items-center gap-3">
                      <span>{dateStr}</span>
                      {res && <span>Time: {Math.round(res.totalTimeSeconds / 60)}m {res.totalTimeSeconds % 60}s</span>}
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setInspectingSession(sess)}
                    className="text-xs self-start sm:self-center btn-press"
                  >
                    View Details
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
