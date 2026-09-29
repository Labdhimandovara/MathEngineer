import React, { useState, useEffect } from 'react';
import { FalsePositionResult, FalsePositionIteration } from '../../math/falsePosition/types.ts';
import {
  FalsePositionSessionState,
  createFalsePositionInteractiveSession,
  getFalsePositionStepContext,
  processFalsePositionBracketCheck,
  processFalsePositionApproximation,
  processFalsePositionFApproximation,
  processFalsePositionIntervalChoice,
  requestFalsePositionHint,
} from '../../math/falsePosition/interactiveSolver.ts';
import {
  getFalsePositionBracketCheckContent,
  getFalsePositionApproximationContent,
  getFalsePositionFApproximationContent,
  getFalsePositionIntervalChoiceContent,
} from '../../data/falsePositionEducationalContent.ts';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ArrowRight,
  Eye,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SolveWithMeFalsePositionProps {
  falsePositionResult: FalsePositionResult;
  problemExpression?: string;
  onShowSolution?: () => void;
  onComplete?: (stats: { hintsUsed: number; stepsCompleted: number }) => void;
}

export const SolveWithMeFalsePosition: React.FC<SolveWithMeFalsePositionProps> = ({
  falsePositionResult,
  problemExpression = 'cos(x) - x*exp(x) = 0',
  onShowSolution,
  onComplete,
}) => {
  const [session, setSession] = useState<FalsePositionSessionState>(() =>
    createFalsePositionInteractiveSession(falsePositionResult)
  );

  const hasReportedCompletionRef = React.useRef(false);

  useEffect(() => {
    if (session.isCompleted && !hasReportedCompletionRef.current) {
      hasReportedCompletionRef.current = true;
      onComplete?.({
        hintsUsed: session.totalHintsUsed,
        stepsCompleted: session.independentStepsCompleted,
      });
    }
  }, [session.isCompleted, onComplete, session.totalHintsUsed, session.independentStepsCompleted]);

  // Form input states
  const [userFaInput, setUserFaInput] = useState('');
  const [userFbInput, setUserFbInput] = useState('');
  const [userCInput, setUserCInput] = useState('');
  const [userFcInput, setUserFcInput] = useState('');

  // Expandable "Why are we doing this?" toggle
  const [isWhyOpen, setIsWhyOpen] = useState(false);

  // Selected history iteration to review
  const [reviewingIterationIndex, setReviewingIterationIndex] = useState<number | null>(null);

  // Clean expression for display
  const cleanedExpr = problemExpression.replace(/=\s*0$/, '').trim();

  // Reset inputs when problem changes
  useEffect(() => {
    setSession(createFalsePositionInteractiveSession(falsePositionResult));
    setUserFaInput('');
    setUserFbInput('');
    setUserCInput('');
    setUserFcInput('');
    setIsWhyOpen(false);
    setReviewingIterationIndex(null);
  }, [falsePositionResult, problemExpression]);

  // Error state from solver
  if (!falsePositionResult.success) {
    return (
      <div className="p-5 rounded-me bg-status-error-bg border border-status-error/30 text-status-error text-xs space-y-2">
        <div className="font-semibold flex items-center gap-1.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Cannot Begin Interactive Solving</span>
        </div>
        <p className="leading-relaxed">{falsePositionResult.error}</p>
        <p className="text-charcoal-muted pt-1">
          Adjust the initial interval [a, b] in the problem definition so that f(a) and f(b) have opposite signs.
        </p>
      </div>
    );
  }

  // Exact root at boundary found prior to iteration
  if (session.isCompleted && session.totalIterations === 0) {
    return (
      <div className="p-6 rounded-me-lg bg-bg-surface border border-border-soft space-y-4 text-center">
        <div className="w-10 h-10 rounded-full bg-status-success-bg text-status-success flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-semibold text-charcoal">Problem Completed</h3>
        <p className="text-xs text-charcoal-muted max-w-md mx-auto">
          {falsePositionResult.stopping_reason}
        </p>
        <div className="p-3 bg-bg-cream/40 rounded-me border border-border-soft inline-block text-xs font-mono">
          Exact Root: x = {falsePositionResult.formattedRoot}
        </div>
      </div>
    );
  }

  const currentIter: FalsePositionIteration | undefined =
    falsePositionResult.iterations[session.currentIterationIndex];
  const stepContext = getFalsePositionStepContext(session, falsePositionResult, cleanedExpr);

  let activeContent = {
    whyAreWeDoingThis: '',
    hints: ['', '', ''] as [string, string, string],
    correctExplanation: '',
  };

  if (session.currentStep === 'bracket_check') {
    const a = falsePositionResult.initialEvaluation?.a ?? 0;
    const b = falsePositionResult.initialEvaluation?.b ?? 1;
    const fa = falsePositionResult.initialEvaluation?.f_a ?? 0;
    const fb = falsePositionResult.initialEvaluation?.f_b ?? 0;
    activeContent = getFalsePositionBracketCheckContent(cleanedExpr, a, b, fa, fb);
  } else if (session.currentStep === 'approximation') {
    activeContent = getFalsePositionApproximationContent(stepContext);
  } else if (session.currentStep === 'f_approximation') {
    activeContent = getFalsePositionFApproximationContent(stepContext);
  } else if (session.currentStep === 'interval_choice') {
    activeContent = getFalsePositionIntervalChoiceContent(stepContext);
  }

  // Handlers
  const handleVerifyBracket = (e: React.FormEvent) => {
    e.preventDefault();
    const fa = parseFloat(userFaInput);
    const fb = parseFloat(userFbInput);
    if (isNaN(fa) || isNaN(fb)) return;

    setSession((prev) =>
      processFalsePositionBracketCheck(prev, falsePositionResult, fa, fb, cleanedExpr)
    );
  };

  const handleVerifyApproximation = (e: React.FormEvent) => {
    e.preventDefault();
    const c = parseFloat(userCInput);
    if (isNaN(c)) return;

    setSession((prev) =>
      processFalsePositionApproximation(prev, falsePositionResult, c, cleanedExpr)
    );
    setUserCInput('');
  };

  const handleVerifyFApproximation = (e: React.FormEvent) => {
    e.preventDefault();
    const fc = parseFloat(userFcInput);
    if (isNaN(fc)) return;

    setSession((prev) =>
      processFalsePositionFApproximation(prev, falsePositionResult, fc, cleanedExpr)
    );
    setUserFcInput('');
  };

  const handleChooseInterval = (choice: 'replace_a' | 'replace_b') => {
    setSession((prev) =>
      processFalsePositionIntervalChoice(prev, falsePositionResult, choice, cleanedExpr)
    );
  };

  const handleRequestHint = () => {
    setSession((prev) => requestFalsePositionHint(prev));
  };

  const handleRestart = () => {
    hasReportedCompletionRef.current = false;
    setSession(createFalsePositionInteractiveSession(falsePositionResult));
    setUserFaInput('');
    setUserFbInput('');
    setUserCInput('');
    setUserFcInput('');
    setIsWhyOpen(false);
    setReviewingIterationIndex(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Session Progress Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-soft">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="lavender">False Position (Regula Falsi)</Badge>
          {!session.isCompleted && (
            <span className="text-xs text-charcoal-muted">
              Iteration {session.currentIterationIndex + 1} of {session.totalIterations}
            </span>
          )}
          {session.totalHintsUsed > 0 && (
            <span className="text-[11px] text-charcoal-muted px-2 py-0.5 rounded bg-bg-surface border border-border-soft">
              Hints used: {session.totalHintsUsed}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRestart}
            className="text-xs text-charcoal-muted hover:text-charcoal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Over</span>
          </Button>
          {onShowSolution && (
            <Button
              variant="outline"
              size="sm"
              onClick={onShowSolution}
              className="text-xs"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Show Solution</span>
            </Button>
          )}
        </div>
      </div>

      {/* Lightweight History Breadcrumb Bar */}
      {session.completedIterations.length > 0 && (
        <div className="bg-bg-surface p-3 rounded-me border border-border-soft space-y-2">
          <div className="flex items-center justify-between text-[11px] text-charcoal-muted">
            <span className="font-semibold uppercase tracking-wider">Iteration History</span>
            <span>Click any completed iteration to inspect</span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {falsePositionResult.iterations.map((iter, idx) => {
              const isCompleted = idx < session.completedIterations.length;
              const isCurrent = idx === session.currentIterationIndex && !session.isCompleted;
              const isReviewing = reviewingIterationIndex === idx;

              return (
                <button
                  key={iter.n}
                  type="button"
                  disabled={!isCompleted && !isCurrent}
                  onClick={() => {
                    if (isCompleted) {
                      setReviewingIterationIndex(isReviewing ? null : idx);
                    }
                  }}
                  className={`px-2.5 py-1 rounded text-xs font-mono transition-calm flex items-center gap-1 border ${
                    isReviewing
                      ? 'bg-lavender-deep text-white border-lavender-deep shadow-subtle'
                      : isCompleted
                      ? 'bg-status-success-bg text-status-success border-status-success/30 hover:bg-status-success-bg/80 cursor-pointer'
                      : isCurrent
                      ? 'bg-lavender-light text-lavender-deep border-lavender-dusty font-semibold'
                      : 'bg-bg-primary/50 text-charcoal-subtle border-border-soft/60 cursor-not-allowed opacity-50'
                  }`}
                >
                  <span>Iter {iter.n + 1}</span>
                  {isCompleted && <span>✓</span>}
                  {isCurrent && <span>← Current</span>}
                </button>
              );
            })}
          </div>

          {/* Quick Review Drawer for completed iteration */}
          {reviewingIterationIndex !== null && session.completedIterations[reviewingIterationIndex] && (
            <div className="p-3 bg-bg-cream/40 rounded border border-border-soft text-xs font-mono space-y-1 mt-2 animate-fadeIn">
              <div className="flex items-center justify-between text-charcoal font-semibold">
                <span>Iteration {reviewingIterationIndex + 1} Summary:</span>
                <button
                  type="button"
                  onClick={() => setReviewingIterationIndex(null)}
                  className="text-charcoal-muted hover:text-charcoal text-[11px] font-sans"
                >
                  ✕ Close Review
                </button>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-charcoal-muted">
                <div>a = {session.completedIterations[reviewingIterationIndex].a.toFixed(5)}</div>
                <div>b = {session.completedIterations[reviewingIterationIndex].b.toFixed(5)}</div>
                <div>x = {session.completedIterations[reviewingIterationIndex].c.toFixed(5)}</div>
                <div>f(x) = {session.completedIterations[reviewingIterationIndex].f_c.toFixed(5)}</div>
              </div>
              {session.completedIterations[reviewingIterationIndex].hintsUsedForIteration !== undefined && (
                <div className="text-[11px] text-charcoal-muted pt-1 font-sans">
                  Hints requested for this iteration: {session.completedIterations[reviewingIterationIndex].hintsUsedForIteration}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Main Interactive Solving Card */}
      <Card variant="surface" className="p-6 space-y-6">
        {/* Step Indicator Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft pb-4">
          <div className="space-y-1">
            <div className="text-xs font-semibold uppercase tracking-wider text-lavender-deep">
              {session.currentStep === 'bracket_check' && 'Step 1 of 4'}
              {session.currentStep === 'approximation' && 'Step 2 of 4'}
              {session.currentStep === 'f_approximation' && 'Step 3 of 4'}
              {session.currentStep === 'interval_choice' && 'Step 4 of 4'}
              {session.currentStep === 'completed' && 'Goal Reached'}
            </div>
            <h3 className="text-base font-semibold text-charcoal">
              {session.currentStep === 'bracket_check' && 'Check the Initial Bracket'}
              {session.currentStep === 'approximation' && 'Calculate False Position Approximation (x)'}
              {session.currentStep === 'f_approximation' && 'Evaluate the Function f(x)'}
              {session.currentStep === 'interval_choice' && 'Select the Next Interval'}
              {session.currentStep === 'completed' && 'Problem Completed'}
            </h3>
          </div>

          <Badge variant="cream">
            {session.currentStep === 'completed'
              ? 'Finished'
              : `Active Iteration: n = ${session.currentIterationIndex}`}
          </Badge>
        </div>

        {/* Step 1: Initial Bracket Check */}
        {session.currentStep === 'bracket_check' && (
          <form onSubmit={handleVerifyBracket} className="space-y-4">
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Verify that the function changes sign across the endpoints{' '}
              <strong className="font-mono text-charcoal">
                a = {falsePositionResult.initialEvaluation?.a}
              </strong>{' '}
              and{' '}
              <strong className="font-mono text-charcoal">
                b = {falsePositionResult.initialEvaluation?.b}
              </strong>. Evaluate f(a) and f(b).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal block">
                  Calculate f({falsePositionResult.initialEvaluation?.a})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. 1"
                  value={userFaInput}
                  onChange={(e) => setUserFaInput(e.target.value)}
                  className="w-full bg-bg-primary/60 border border-border-soft rounded-me px-3 py-2 text-xs font-mono text-charcoal focus-ring transition-calm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-charcoal block">
                  Calculate f({falsePositionResult.initialEvaluation?.b})
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="e.g. -2.17798"
                  value={userFbInput}
                  onChange={(e) => setUserFbInput(e.target.value)}
                  className="w-full bg-bg-primary/60 border border-border-soft rounded-me px-3 py-2 text-xs font-mono text-charcoal focus-ring transition-calm"
                />
              </div>
            </div>

            <Button type="submit" variant="primary" size="sm">
              <span>Verify Bracket</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>
        )}

        {/* Step 2: Calculate False Position Approximation */}
        {session.currentStep === 'approximation' && currentIter && (
          <form onSubmit={handleVerifyApproximation} className="space-y-4">
            <div className="p-3.5 rounded-me bg-bg-cream/40 border border-border-soft space-y-1.5 text-xs">
              <span className="font-semibold text-charcoal block">Active Interval Bounds:</span>
              <div className="font-mono text-charcoal-muted grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px]">
                <div>• a = {currentIter.a.toFixed(5)}, f(a) = {currentIter.f_a.toFixed(5)}</div>
                <div>• b = {currentIter.b.toFixed(5)}, f(b) = {currentIter.f_b.toFixed(5)}</div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-charcoal-muted leading-relaxed">
                Use the course False Position secant formula to calculate the candidate root x:
              </p>
              <div className="p-2.5 bg-bg-primary/80 rounded-me border border-border-soft font-mono text-xs text-center text-lavender-deep font-semibold">
                x = [a·f(b) - b·f(a)] / [f(b) - f(a)]
              </div>
              <p className="text-[11px] text-charcoal-muted font-mono text-center">
                x = [({currentIter.a.toFixed(5)})({currentIter.f_b.toFixed(5)}) - ({currentIter.b.toFixed(5)})({currentIter.f_a.toFixed(5)})] / [({currentIter.f_b.toFixed(5)}) - ({currentIter.f_a.toFixed(5)})]
              </p>
            </div>

            <div className="space-y-1.5 max-w-xs">
              <label className="text-xs font-medium text-charcoal block">
                Enter your approximation x
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 0.31467"
                value={userCInput}
                onChange={(e) => setUserCInput(e.target.value)}
                className="w-full bg-bg-primary/60 border border-border-soft rounded-me px-3 py-2 text-xs font-mono text-charcoal focus-ring transition-calm"
              />
            </div>

            <Button type="submit" variant="primary" size="sm">
              <span>Check Approximation</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>
        )}

        {/* Step 3: Evaluate f(x) */}
        {session.currentStep === 'f_approximation' && currentIter && (
          <form onSubmit={handleVerifyFApproximation} className="space-y-4">
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Now evaluate the function at the newly found approximation{' '}
              <strong className="font-mono text-charcoal">
                x = {currentIter.c.toFixed(5)}
              </strong>:
            </p>

            <div className="p-2.5 bg-bg-primary/80 rounded-me border border-border-soft font-mono text-xs text-center text-charcoal">
              f({currentIter.c.toFixed(5)}) = {cleanedExpr.replace(/x/g, `(${currentIter.c.toFixed(5)})`)}
            </div>

            <div className="space-y-1.5 max-w-xs">
              <label className="text-xs font-medium text-charcoal block">
                Calculate f({currentIter.c.toFixed(5)})
              </label>
              <input
                type="number"
                step="any"
                required
                placeholder="e.g. 0.51987"
                value={userFcInput}
                onChange={(e) => setUserFcInput(e.target.value)}
                className="w-full bg-bg-primary/60 border border-border-soft rounded-me px-3 py-2 text-xs font-mono text-charcoal focus-ring transition-calm"
              />
            </div>

            <Button type="submit" variant="primary" size="sm">
              <span>Check Function Value</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </form>
        )}

        {/* Step 4: Choose Next Interval */}
        {session.currentStep === 'interval_choice' && currentIter && (
          <div className="space-y-4">
            <p className="text-xs text-charcoal-muted leading-relaxed">
              Compare the sign of{' '}
              <strong className="font-mono text-charcoal">
                f(x) = {currentIter.f_c.toFixed(5)} ({currentIter.f_c > 0 ? '+ve' : '-ve'})
              </strong>{' '}
              with the interval endpoints:
            </p>

            <div className="p-3 bg-bg-primary/60 rounded-me border border-border-soft grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono text-charcoal">
              <div>• f(a) = f({currentIter.a.toFixed(5)}) = {currentIter.f_a.toFixed(5)} ({currentIter.f_a > 0 ? '+ve' : '-ve'})</div>
              <div>• f(b) = f({currentIter.b.toFixed(5)}) = {currentIter.f_b.toFixed(5)} ({currentIter.f_b > 0 ? '+ve' : '-ve'})</div>
            </div>

            <div className="p-3 bg-bg-cream/40 rounded-me border border-border-soft text-xs text-charcoal space-y-1">
              <strong>Course Rule:</strong>
              <p className="text-charcoal-muted leading-relaxed">
                Replace the endpoint having the <strong>SAME sign</strong> as f(x) with x so that the new interval continues to have opposite endpoint signs.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChooseInterval('replace_a')}
                className="p-4 h-auto flex flex-col items-start gap-1 text-left"
              >
                <span className="font-semibold text-charcoal">
                  Replace a with x
                </span>
                <span className="text-[11px] text-charcoal-muted font-mono">
                  New interval: [{currentIter.c.toFixed(5)}, {currentIter.b.toFixed(5)}]
                </span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => handleChooseInterval('replace_b')}
                className="p-4 h-auto flex flex-col items-start gap-1 text-left"
              >
                <span className="font-semibold text-charcoal">
                  Replace b with x
                </span>
                <span className="text-[11px] text-charcoal-muted font-mono">
                  New interval: [{currentIter.a.toFixed(5)}, {currentIter.c.toFixed(5)}]
                </span>
              </Button>
            </div>
          </div>
        )}

        {/* Calm Step Feedback Banner */}
        {session.stepFeedback.status === 'correct' && (
          <div className="p-3.5 rounded-me bg-status-success-bg border border-status-success/30 text-status-success text-xs space-y-1 animate-fadeIn">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{session.stepFeedback.message}</span>
            </div>
            {session.stepExplanation && (
              <p className="text-charcoal pl-6 leading-relaxed">
                {session.stepExplanation}
              </p>
            )}
          </div>
        )}

        {session.stepFeedback.status === 'incorrect' && session.stepFeedback.message && (
          <div className="p-3.5 rounded-me bg-status-warning-bg border border-status-warning/40 text-status-warning text-xs space-y-1.5 animate-fadeIn">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{session.stepFeedback.message}</span>
            </div>
            {session.stepFeedback.userValue && (
              <div className="text-[11px] text-charcoal-muted pl-6 font-mono">
                Submitted: {session.stepFeedback.userValue}
              </div>
            )}
          </div>
        )}

        {/* Progressive Hints & Step Explanation Toolbar */}
        {!session.isCompleted && (
          <div className="pt-3 border-t border-border-soft/70 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* Progressive Hint Button */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-charcoal-muted">Need help?</span>
                <Button
                  variant="outline"
                  size="sm"
                  type="button"
                  disabled={session.hintsRevealedForCurrentStep >= 3}
                  onClick={handleRequestHint}
                  className="text-xs"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-status-warning" />
                  <span>
                    {session.hintsRevealedForCurrentStep === 0
                      ? 'Give me a hint'
                      : session.hintsRevealedForCurrentStep < 3
                      ? `Give me another hint (${session.hintsRevealedForCurrentStep}/3)`
                      : 'All 3 hints revealed'}
                  </span>
                </Button>
              </div>

              {/* "Why are we doing this?" Expandable Toggle */}
              {activeContent.whyAreWeDoingThis && (
                <button
                  type="button"
                  onClick={() => setIsWhyOpen((prev) => !prev)}
                  className="text-xs text-lavender-deep hover:text-charcoal flex items-center gap-1 transition-calm py-1 px-2 rounded hover:bg-bg-primary"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>Why are we doing this?</span>
                  {isWhyOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>

            {/* Revealed Hints Display (Stacked) */}
            {session.hintsRevealedForCurrentStep > 0 && (
              <div className="space-y-2 pt-1 animate-fadeIn">
                {activeContent.hints
                  .slice(0, session.hintsRevealedForCurrentStep)
                  .map((hintText, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-me bg-bg-cream/40 border border-border-soft text-xs text-charcoal space-y-0.5"
                    >
                      <div className="font-semibold text-lavender-deep text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Lightbulb className="w-3 h-3 text-status-warning" />
                        <span>Hint {idx + 1}</span>
                      </div>
                      <p className="leading-relaxed pl-4">{hintText}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* "Why are we doing this?" Expanded Panel */}
            {isWhyOpen && activeContent.whyAreWeDoingThis && (
              <div className="p-3.5 rounded-me bg-bg-primary/80 border border-border-soft text-xs text-charcoal leading-relaxed animate-fadeIn space-y-1">
                <div className="font-semibold text-charcoal flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-lavender-deep" />
                  <span>Mathematical Purpose</span>
                </div>
                <p className="text-charcoal-muted">{activeContent.whyAreWeDoingThis}</p>
              </div>
            )}
          </div>
        )}

        {/* Completed Problem Banner */}
        {session.isCompleted && (
          <div className="p-6 rounded-me-lg bg-bg-cream/40 border border-border-soft space-y-5 text-center">
            <div className="w-12 h-12 rounded-full bg-status-success-bg text-status-success flex items-center justify-center mx-auto shadow-subtle">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-xl font-semibold text-charcoal">
                Problem completed.
              </h3>
              <p className="text-xs text-charcoal-muted max-w-md mx-auto">
                {falsePositionResult.stopping_reason}
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
              <div className="p-3 bg-bg-surface rounded-me border border-border-soft">
                <span className="text-[11px] text-charcoal-muted block">Identified Root</span>
                <strong className="text-base font-mono text-charcoal">
                  x ≈ {falsePositionResult.formattedRoot}
                </strong>
              </div>
              <div className="p-3 bg-bg-surface rounded-me border border-border-soft">
                <span className="text-[11px] text-charcoal-muted block">Total Iterations</span>
                <strong className="text-base font-mono text-charcoal">
                  {falsePositionResult.iterations_used}
                </strong>
              </div>
              <div className="p-3 bg-bg-surface rounded-me border border-border-soft">
                <span className="text-[11px] text-charcoal-muted block">Independent Steps</span>
                <strong className="text-base font-mono text-charcoal">
                  {session.independentStepsCompleted}
                </strong>
              </div>
              <div className="p-3 bg-bg-surface rounded-me border border-border-soft">
                <span className="text-[11px] text-charcoal-muted block">Total Hints Used</span>
                <strong className="text-base font-mono text-charcoal">
                  {session.totalHintsUsed}
                </strong>
              </div>
            </div>

            <div className="pt-2 flex justify-center gap-3">
              {onShowSolution && (
                <Button variant="primary" size="sm" onClick={onShowSolution}>
                  <Eye className="w-3.5 h-3.5" />
                  <span>Review Solution Table</span>
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Completed Iterations Table */}
      {session.completedIterations.length > 0 && (
        <Card variant="surface" className="p-4 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-charcoal">Completed Iterations</span>
            <span className="text-charcoal-muted font-mono">
              {session.completedIterations.length} completed
            </span>
          </div>

          <div className="overflow-x-auto border border-border-soft rounded-me bg-bg-surface">
            <table className="w-full text-xs text-left text-charcoal">
              <thead className="bg-bg-primary/80 border-b border-border-soft text-[11px] font-semibold text-charcoal-muted uppercase">
                <tr>
                  <th className="px-3 py-2">n</th>
                  <th className="px-3 py-2">a_n</th>
                  <th className="px-3 py-2">b_n</th>
                  <th className="px-3 py-2">x_(n+1)</th>
                  <th className="px-3 py-2">f(x_(n+1))</th>
                  <th className="px-3 py-2">Next Interval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft/60 font-mono text-[11px]">
                {session.completedIterations.map((it) => (
                  <tr key={it.n} className="hover:bg-bg-primary/30 transition-calm">
                    <td className="px-3 py-1.5 text-charcoal-muted">{it.n}</td>
                    <td className="px-3 py-1.5">{it.a.toFixed(5)}</td>
                    <td className="px-3 py-1.5">{it.b.toFixed(5)}</td>
                    <td className="px-3 py-1.5 text-lavender-deep font-semibold">
                      {it.c.toFixed(5)}
                    </td>
                    <td className="px-3 py-1.5">{it.f_c.toFixed(5)}</td>
                    <td className="px-3 py-1.5 text-charcoal-muted">
                      [{it.next_interval[0].toFixed(5)}, {it.next_interval[1].toFixed(5)}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};
