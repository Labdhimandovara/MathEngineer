import React, { useState, useEffect, useRef } from 'react';
import { CHALLENGE_QUESTIONS } from '../../services/challenge/challengeQuestions.ts';
import { ChallengeQuestion } from '../../services/challenge/challengeTypes.ts';
import { recordChallengeResult, useProgress } from '../../services/progress/index.ts';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import { Zap, Timer, Flame, CheckCircle2, XCircle, RotateCcw, Trophy, ArrowRight } from 'lucide-react';
import { PageId } from '../../types/index.ts';

interface SprintChallengeProps {
  onNavigate: (page: PageId) => void;
  onSwitchToBattle?: () => void;
}

export const SprintChallenge: React.FC<SprintChallengeProps> = ({ onNavigate, onSwitchToBattle }) => {
  const [gameState, setGameState] = useState<'ready' | 'running' | 'finished'>('ready');
  const [timeLeft, setTimeLeft] = useState<number>(60);
  const [questionIndex, setQuestionIndex] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [streak, setStreak] = useState<number>(0);
  const [maxStreak, setMaxStreak] = useState<number>(0);
  const [correctCount, setCorrectCount] = useState<number>(0);
  const [answeredCount, setAnsweredCount] = useState<number>(0);
  const [numericInput, setNumericInput] = useState<string>('');
  const [flashFeedback, setFlashFeedback] = useState<{
    text: string;
    type: 'correct' | 'wrong';
  } | null>(null);

  const shuffledQuestions = useRef<ChallengeQuestion[]>([]);
  const timerRef = useRef<number | null>(null);

  // Shuffle questions on initial mount or restart
  const startNewSprint = () => {
    shuffledQuestions.current = [...CHALLENGE_QUESTIONS].sort(() => Math.random() - 0.5);
    setGameState('running');
    setTimeLeft(60);
    setQuestionIndex(0);
    setScore(0);
    setStreak(0);
    setMaxStreak(0);
    setCorrectCount(0);
    setAnsweredCount(0);
    setNumericInput('');
    setFlashFeedback(null);
  };

  // Timer loop
  useEffect(() => {
    if (gameState === 'running') {
      timerRef.current = window.setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  // Handle timeout
  useEffect(() => {
    if (gameState === 'running' && timeLeft === 0) {
      setGameState('finished');
      recordChallengeResult({
        mode: 'sprint_60s',
        score,
        correctCount,
        totalQuestions: answeredCount,
        maxStreak,
      });
    }
  }, [timeLeft, gameState, score, correctCount, answeredCount, maxStreak]);

  const currentQuestion = shuffledQuestions.current[questionIndex % shuffledQuestions.current.length];

  const handleAnswerSubmit = (submittedAnswer: string) => {
    if (gameState !== 'running' || !currentQuestion) return;

    let isCorrect = false;

    if (currentQuestion.type === 'multiple_choice') {
      isCorrect =
        submittedAnswer.trim().toLowerCase() === currentQuestion.correctAnswer.trim().toLowerCase();
    } else {
      const userVal = parseFloat(submittedAnswer.trim());
      const correctVal = parseFloat(currentQuestion.correctAnswer);
      const tol = currentQuestion.tolerance || 0.02;
      isCorrect = !isNaN(userVal) && Math.abs(userVal - correctVal) <= tol;
    }

    setAnsweredCount((prev) => prev + 1);

    if (isCorrect) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > maxStreak) setMaxStreak(newStreak);

      const streakMultiplier = newStreak >= 8 ? 2.0 : newStreak >= 5 ? 1.5 : newStreak >= 3 ? 1.2 : 1.0;
      const points = Math.round(100 * streakMultiplier);

      setScore((prev) => prev + points);
      setCorrectCount((prev) => prev + 1);
      setFlashFeedback({
        text: `+${points} ${streakMultiplier > 1 ? `(${streakMultiplier}x Streak!)` : ''}`,
        type: 'correct',
      });
    } else {
      setStreak(0);
      setScore((prev) => Math.max(0, prev - 20));
      setFlashFeedback({
        text: 'Incorrect (-20)',
        type: 'wrong',
      });
    }

    // Clear numeric input and advance
    setNumericInput('');
    setQuestionIndex((prev) => prev + 1);

    setTimeout(() => {
      setFlashFeedback(null);
    }, 600);
  };

  const progressPercent = (timeLeft / 60) * 100;
  const isUrgent = timeLeft <= 10;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* State 1: Ready Screen */}
      {gameState === 'ready' && (
        <Card variant="surface" className="border-border-soft p-8 max-w-xl mx-auto text-center space-y-6">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto border border-amber-500/20 shadow-subtle">
            <Zap className="w-8 h-8 fill-amber-500" />
          </div>

          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-charcoal">60-Second Rapid Sprint</h2>
            <p className="text-xs text-charcoal-muted leading-relaxed max-w-md mx-auto">
              Test your speed and mastery of Numerical Techniques mechanics. Answer as many questions as
              possible within 60 seconds with streak multipliers!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-left p-4 rounded-me bg-bg-primary/80 border border-border-soft/60 text-xs">
            <div className="space-y-1">
              <span className="text-charcoal-muted font-medium">Scoring</span>
              <div className="font-semibold text-charcoal">+100 / correct</div>
            </div>
            <div className="space-y-1">
              <span className="text-charcoal-muted font-medium">Multiplier</span>
              <div className="font-semibold text-status-warning">Up to 2x streak</div>
            </div>
            <div className="space-y-1">
              <span className="text-charcoal-muted font-medium">Mistake</span>
              <div className="font-semibold text-charcoal-muted">-20 & resets streak</div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              size="lg"
              onClick={startNewSprint}
              className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              <Zap className="w-4 h-4 fill-white" />
              <span>Start 60s Challenge</span>
            </Button>
            {onSwitchToBattle && (
              <Button variant="outline" size="lg" onClick={onSwitchToBattle}>
                <span>Battle MathBot</span>
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* State 2: Active Challenge Running */}
      {gameState === 'running' && currentQuestion && (
        <Card variant="surface" className="border-border-soft max-w-2xl mx-auto space-y-6 p-6 relative overflow-hidden">
          {/* Top Timer & Score Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-charcoal-muted">Time Remaining:</span>
                <span
                  className={`font-mono text-base font-bold flex items-center gap-1 ${
                    isUrgent ? 'text-status-error animate-pulse' : 'text-charcoal'
                  }`}
                >
                  <Timer className="w-4 h-4" />
                  {timeLeft}s
                </span>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-xs">
                  <Flame
                    className={`w-4 h-4 ${
                      streak > 0 ? 'text-status-warning fill-amber-500' : 'text-charcoal-muted'
                    }`}
                  />
                  <span className="font-bold text-charcoal">{streak} streak</span>
                </div>
                <div className="font-mono text-base font-bold text-lavender-deep">
                  {score} pts
                </div>
              </div>
            </div>

            {/* Visual Timer Progress Bar */}
            <div className="w-full bg-bg-neutral h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ${
                  isUrgent ? 'bg-status-error' : 'bg-amber-500'
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Flash Feedback Popover */}
          {flashFeedback && (
            <div
              className={`absolute top-16 right-6 px-3 py-1 rounded-me text-xs font-bold animate-fadeIn ${
                flashFeedback.type === 'correct'
                  ? 'bg-status-success text-white'
                  : 'bg-status-error text-white'
              }`}
            >
              {flashFeedback.text}
            </div>
          )}

          {/* Question Display */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <Badge variant="cream">Question #{questionIndex + 1}</Badge>
              <span className="text-xs uppercase tracking-wider font-semibold text-charcoal-muted">
                {currentQuestion.topic}
              </span>
            </div>

            <h3 className="text-lg font-semibold text-charcoal leading-relaxed min-h-[50px]">
              {currentQuestion.question}
            </h3>

            {/* Multiple Choice Options */}
            {currentQuestion.type === 'multiple_choice' && currentQuestion.options && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {currentQuestion.options.map((opt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleAnswerSubmit(opt)}
                    className="p-3.5 rounded-me text-left text-xs font-medium border border-border-soft bg-bg-primary/60 hover:bg-lavender-light hover:border-lavender-dusty text-charcoal transition-all active:scale-[0.98]"
                  >
                    <span className="font-semibold text-lavender-deep mr-2">
                      {String.fromCharCode(65 + idx)}.
                    </span>
                    <span>{opt}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Numeric Input */}
            {currentQuestion.type === 'numeric' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (numericInput.trim()) {
                    handleAnswerSubmit(numericInput);
                  }
                }}
                className="flex items-center gap-2 pt-2"
              >
                <input
                  type="text"
                  autoFocus
                  value={numericInput}
                  onChange={(e) => setNumericInput(e.target.value)}
                  placeholder="Enter numeric answer..."
                  className="flex-1 px-4 py-2.5 text-sm font-mono rounded-me border border-border-soft bg-bg-surface focus:outline-none focus:border-amber-500"
                />
                <Button type="submit" variant="primary" className="bg-amber-600 hover:bg-amber-700 text-white">
                  Submit
                </Button>
              </form>
            )}
          </div>
        </Card>
      )}

      {/* State 3: Finished / Score Summary Screen */}
      {gameState === 'finished' && (
        <Card variant="surface" className="border-border-soft p-8 max-w-xl mx-auto text-center space-y-6 animate-fadeIn">
          <div className="w-16 h-16 rounded-2xl bg-status-success-bg text-status-success flex items-center justify-center mx-auto border border-status-success/30 shadow-subtle">
            <Trophy className="w-8 h-8" />
          </div>

          <div className="space-y-1">
            <h2 className="text-2xl font-bold text-charcoal">Sprint Complete!</h2>
            <p className="text-xs text-charcoal-muted">
              Results saved to your verified learning record
            </p>
          </div>

          {/* Big Score Display */}
          <div className="p-4 rounded-me bg-bg-primary/80 border border-border-soft/60 space-y-1">
            <div className="text-xs text-charcoal-muted uppercase tracking-wider font-semibold">
              Final Score
            </div>
            <div className="text-4xl font-extrabold text-charcoal font-mono">{score}</div>
          </div>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-3 gap-3 text-left p-4 rounded-me bg-bg-surface border border-border-soft/60 text-xs">
            <div className="space-y-1">
              <span className="text-charcoal-muted">Correct</span>
              <div className="font-semibold text-charcoal flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-status-success" />
                <span>
                  {correctCount} / {answeredCount}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-charcoal-muted">Accuracy</span>
              <div className="font-semibold text-charcoal">
                {answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0}%
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-charcoal-muted">Max Streak</span>
              <div className="font-semibold text-status-warning flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-500" />
                <span>{maxStreak}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Button
              variant="primary"
              onClick={startNewSprint}
              className="flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Play Again</span>
            </Button>
            <Button variant="outline" onClick={() => onNavigate('progress')}>
              <span>View in Progress</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
