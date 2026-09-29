import React, { useState } from 'react';
import { PracticeQuestion } from '../../data/practiceQuestions.ts';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import { Button } from '../ui/Button.tsx';
import {
  useProgress,
  isQuestionSolved,
} from '../../services/progress/index.ts';
import {
  startAttempt,
  completeAttempt,
  MistakeCategory,
} from '../../services/learning/index.ts';
import { PageId, QuestionLaunchConfig } from '../../types/index.ts';
import { setActivePracticeProblem } from '../../services/problem/activeProblemStore.ts';
import {
  CheckCircle2,
  HelpCircle,
  Play,
  RotateCcw,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Split,
  X,
  Eye,
} from 'lucide-react';

interface QuestionCardProps {
  question: PracticeQuestion;
  onNavigate: (
    page: PageId,
    options?: {
      method?: string;
      action?: 'none' | 'myself' | 'hints' | 'solution';
      questionConfig?: QuestionLaunchConfig;
    }
  ) => void;
}

function classifyPracticeMistake(
  parsed: number,
  expected: number,
  bounds: [number, number],
  tolerance: number,
  x0?: number
): MistakeCategory {
  const diff = Math.abs(parsed - expected);
  if (diff < Math.max(0.08, tolerance * 8)) {
    return 'rounding-error';
  }
  if (parsed < Math.min(bounds[0], bounds[1]) - 0.5 || parsed > Math.max(bounds[0], bounds[1]) + 0.5) {
    return 'wrong-interval-selection';
  }
  if (x0 !== undefined && Math.abs(parsed - x0) < 0.01) {
    return 'wrong-initial-guess';
  }
  return 'arithmetic-error';
}

export const QuestionCard: React.FC<QuestionCardProps> = ({ question, onNavigate }) => {
  const progressState = useProgress();
  const alreadySolved = isQuestionSolved(progressState, question.id);

  const [userAnswer, setUserAnswer] = useState<string>('');
  const [feedback, setFeedback] = useState<{
    type: 'idle' | 'success' | 'incorrect';
    message?: string;
  }>({ type: 'idle' });
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [showMethodChooser, setShowMethodChooser] = useState<boolean>(false);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'myself' | 'solution'>('myself');

  const handleCheckAnswer = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(userAnswer.trim());
    if (isNaN(parsed)) {
      setFeedback({
        type: 'incorrect',
        message: 'Please enter a valid numeric approximation (e.g. 1.325).',
      });
      return;
    }

    const tolerance = Math.pow(10, -question.decimalPlaces) * 1.5;
    const diff = Math.abs(parsed - question.expectedRoot);
    const isCorrect = diff <= tolerance;

    // Use current active attempt or start a fresh one for this submission
    let currentId = activeAttemptId;
    if (!currentId) {
      const newAtt = startAttempt({
        questionId: question.id,
        method: question.method,
        topic: question.categoryLabel,
        decimalPlaces: question.decimalPlaces,
      });
      currentId = newAtt.id;
    }

    if (isCorrect) {
      completeAttempt(currentId, {
        correct: true,
        hintsUsed: hintLevel,
        finalAnswer: parsed,
        expectedAnswer: question.expectedRoot,
        mistakeCategories: [],
      });
      setActiveAttemptId(null); // Cleared so retry starts a fresh attempt
      setFeedback({
        type: 'success',
        message: `Spot on! Root is ~${question.expectedRoot.toFixed(question.decimalPlaces)} (converged in ${question.expectedIterations} iterations).`,
      });
    } else {
      const mistake = classifyPracticeMistake(
        parsed,
        question.expectedRoot,
        question.bounds,
        tolerance,
        question.x0
      );
      completeAttempt(currentId, {
        correct: false,
        hintsUsed: hintLevel,
        finalAnswer: parsed,
        expectedAnswer: question.expectedRoot,
        mistakeCategories: [mistake],
      });
      setActiveAttemptId(null); // Cleared so any next attempt is a new session
      const advice =
        mistake === 'rounding-error'
          ? 'You are very close! Check your rounding or decimal precision.'
          : mistake === 'wrong-interval-selection'
          ? `Your answer lies outside the expected interval [${question.bounds[0]}, ${question.bounds[1]}].`
          : 'Double check your intermediate calculations or request a hint!';
      setFeedback({
        type: 'incorrect',
        message: `Not quite. Your value was ${parsed}, differing from the target root ~${question.expectedRoot.toFixed(
          question.decimalPlaces
        )}. ${advice}`,
      });
    }
  };

  const handleRevealNextHint = () => {
    if (hintLevel < question.conceptNotes.length) {
      if (!activeAttemptId) {
        const newAtt = startAttempt({
          questionId: question.id,
          method: question.method,
          topic: question.categoryLabel,
          decimalPlaces: question.decimalPlaces,
        });
        setActiveAttemptId(newAtt.id);
      }
      setHintLevel((prev) => prev + 1);
    }
  };

  const handleLaunchSolve = (
    chosenMethod?: 'bisection' | 'false-position' | 'newton-raphson',
    action: 'myself' | 'solution' = 'myself'
  ) => {
    const activeMethod = chosenMethod || (question.method === 'mixed' ? undefined : question.method);

    if (!activeMethod) {
      setPendingAction(action);
      setShowMethodChooser(true);
      return;
    }

    const config: QuestionLaunchConfig = {
      questionId: question.id,
      method: activeMethod,
      equation: question.equation,
      lowerBound: question.bounds[0],
      upperBound: question.bounds[1],
      decimalPlaces: question.decimalPlaces,
      initialGuess: question.x0 ?? question.bounds[0],
      title: question.title,
    };

    setActivePracticeProblem({
      questionId: question.id,
      source: 'practice',
      equation: question.equation,
      method: activeMethod,
      lowerBound: question.bounds[0],
      upperBound: question.bounds[1],
      decimalPlaces: question.decimalPlaces,
      initialGuess: question.x0 ?? question.bounds[0],
      title: question.title,
      boundsSource: 'supplied',
    });

    onNavigate('solve', {
      action,
      method: activeMethod,
      questionConfig: config,
    });
  };

  const difficultyVariant =
    question.difficulty === 'Beginner'
      ? 'neutral'
      : question.difficulty === 'Intermediate'
      ? 'cream'
      : 'lavender';

  return (
    <Card
      variant="surface"
      className={`space-y-4 border transition-calm relative ${
        alreadySolved
          ? 'border-status-success/40 bg-status-success-bg/10 dark:bg-[#1A2E20]/20'
          : 'border-border-soft dark:border-border-dark hover:border-lavender-dusty/60 dark:hover:border-lavender-accent/40'
      }`}
    >
      {/* Top Header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <Badge variant="cream">{question.categoryLabel}</Badge>
            <Badge variant={difficultyVariant}>{question.difficulty}</Badge>
            {alreadySolved && (
              <span className="flex items-center gap-1 text-[11px] text-status-success dark:text-[#76B885] font-medium bg-status-success-bg dark:bg-[#1A2E20] px-2 py-0.5 rounded-me border border-status-success/20">
                <CheckCircle2 className="w-3 h-3" />
                Solved
              </span>
            )}
          </div>
          <span className="text-xs font-mono text-charcoal-muted dark:text-charcoal-subtle">
            {question.decimalPlaces} decimal places
          </span>
        </div>

        <h4 className="text-base font-semibold text-charcoal dark:text-charcoal-light font-sans">{question.title}</h4>
      </div>

      {/* Equation display box */}
      <div className="p-3 rounded-me bg-bg-primary/70 dark:bg-bg-darkDeep/70 border border-border-soft/60 dark:border-border-dark/60 space-y-1">
        <div className="font-mono text-sm font-semibold text-charcoal dark:text-charcoal-light">
          {question.equationDisplay}
        </div>
        <div className="text-xs text-charcoal-muted dark:text-charcoal-subtle flex items-center justify-between">
          <span>Interval: [{question.bounds[0]}, {question.bounds[1]}]</span>
          {question.x0 !== undefined && <span>Initial x₀ = {question.x0}</span>}
        </div>
      </div>

      <p className="text-xs text-charcoal-muted dark:text-charcoal-subtle leading-relaxed">
        {question.description}
      </p>

      {/* Hints Accordion if unlocked */}
      {hintLevel > 0 && (
        <div className="space-y-1.5 p-3 rounded-me bg-lavender-light/40 dark:bg-bg-darkCard border border-lavender-dusty/40 dark:border-border-dark text-xs">
          <div className="font-semibold text-charcoal dark:text-charcoal-light flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-lavender-deep dark:text-lavender-accent" />
            <span>Progressive Hints ({hintLevel}/{question.conceptNotes.length})</span>
          </div>
          <ul className="space-y-1 text-charcoal-muted dark:text-charcoal-subtle pt-1 list-disc list-inside">
            {question.conceptNotes.slice(0, hintLevel).map((note, idx) => (
              <li key={idx} className="leading-relaxed">
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Answer Checker Form */}
      <form onSubmit={handleCheckAnswer} className="space-y-2.5 pt-1">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            placeholder={`e.g. ${question.expectedRoot.toFixed(question.decimalPlaces)}`}
            className="flex-1 px-3 py-1.5 text-xs font-mono rounded-me border border-border-soft dark:border-border-dark bg-bg-surface dark:bg-bg-darkDeep text-charcoal dark:text-charcoal-light focus-ring"
          />
          <Button type="submit" variant="primary" size="sm" className="text-xs shrink-0">
            Check Answer
          </Button>
        </div>

        {/* Feedback message */}
        {feedback.type !== 'idle' && (
          <div
            className={`p-2.5 rounded-me text-xs leading-relaxed animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-status-success-bg dark:bg-[#1A2E20] text-status-success dark:text-[#76B885] font-medium border border-status-success/30'
                : 'bg-status-error-bg dark:bg-[#2E1A1A] text-status-error dark:text-[#E57373] border border-status-error/30'
            }`}
          >
            {feedback.message}
          </div>
        )}
      </form>

      {/* Mixed Question Method Selector Modal/Popover */}
      {showMethodChooser && (
        <div className="p-3.5 rounded-me bg-bg-surface dark:bg-bg-darkSurface border-2 border-lavender-dusty dark:border-lavender-deep shadow-card space-y-3 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal dark:text-charcoal-light">
              <Split className="w-3.5 h-3.5 text-lavender-deep dark:text-lavender-accent" />
              <span>Choose a Method to Solve:</span>
            </div>
            <button
              onClick={() => setShowMethodChooser(false)}
              className="text-charcoal-muted dark:text-charcoal-subtle hover:text-charcoal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setShowMethodChooser(false);
                handleLaunchSolve('bisection', pendingAction);
              }}
              className="p-2 rounded-me bg-bg-primary dark:bg-bg-darkCard hover:bg-lavender-light dark:hover:bg-bg-darkAccent border border-border-soft dark:border-border-dark text-left text-xs font-medium transition-calm btn-press"
            >
              <div className="font-semibold text-charcoal dark:text-charcoal-light">Bisection</div>
              <div className="text-[10px] text-charcoal-muted dark:text-charcoal-subtle">Interval halving</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMethodChooser(false);
                handleLaunchSolve('false-position', pendingAction);
              }}
              className="p-2 rounded-me bg-bg-primary dark:bg-bg-darkCard hover:bg-lavender-light dark:hover:bg-bg-darkAccent border border-border-soft dark:border-border-dark text-left text-xs font-medium transition-calm btn-press"
            >
              <div className="font-semibold text-charcoal dark:text-charcoal-light">False Position</div>
              <div className="text-[10px] text-charcoal-muted dark:text-charcoal-subtle">Regula Falsi chord</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowMethodChooser(false);
                handleLaunchSolve('newton-raphson', pendingAction);
              }}
              className="p-2 rounded-me bg-bg-primary dark:bg-bg-darkCard hover:bg-lavender-light dark:hover:bg-bg-darkAccent border border-border-soft dark:border-border-dark text-left text-xs font-medium transition-calm btn-press"
            >
              <div className="font-semibold text-charcoal dark:text-charcoal-light">Newton-Raphson</div>
              <div className="text-[10px] text-charcoal-muted dark:text-charcoal-subtle">Tangent slope</div>
            </button>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border-soft/60 gap-2">
        <div className="flex items-center gap-2">
          {hintLevel < question.conceptNotes.length && (
            <button
              type="button"
              onClick={handleRevealNextHint}
              className="text-xs text-lavender-deep hover:text-charcoal flex items-center gap-1 transition-calm"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Hint {hintLevel + 1}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {alreadySolved && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('review', { reviewQuestionId: question.id } as any)}
              className="text-xs flex items-center gap-1.5 text-lavender-deep border-lavender-dusty/50 hover:bg-lavender-light/40"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Review</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLaunchSolve(undefined, 'solution')}
            className="text-xs flex items-center gap-1.5 text-charcoal-muted hover:text-charcoal"
            title="Inspect deterministic step-by-step solution"
          >
            <Eye className="w-3 h-3" />
            <span>Show Solution</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={() => handleLaunchSolve(undefined, 'myself')}
            className="text-xs flex items-center gap-1.5"
          >
            <Play className="w-3 h-3" />
            <span>Solve With Me</span>
          </Button>
        </div>
      </div>
    </Card>
  );
};
