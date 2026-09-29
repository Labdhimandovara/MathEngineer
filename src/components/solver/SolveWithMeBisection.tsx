import React, { useState, useEffect } from 'react';
import { BisectionResult, BisectionIteration } from '../../math/bisection';
import {
  InteractiveSessionState,
  createInteractiveSession,
  requestHint,
  getStepContext,
  processBracketCheck,
  processMidpoint,
  processFMidpoint,
  processIntervalChoice,
} from '../../math/bisection/interactiveSolver';
import {
  getBracketCheckContent,
  getMidpointContent,
  getFMidpointContent,
  getIntervalChoiceContent,
} from '../../data/bisectionEducationalContent';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import {
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  ChevronRight,
  Eye,
  HelpCircle,
  Lightbulb,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SolveWithMeBisectionProps {
  bisectionResult: BisectionResult;
  problemExpression?: string;
  onShowSolution: () => void;
  onComplete?: (stats: { hintsUsed: number; stepsCompleted: number }) => void;
}

export const SolveWithMeBisection: React.FC<SolveWithMeBisectionProps> = ({
  bisectionResult,
  problemExpression = 'x^3 - 9x + 1 = 0',
  onShowSolution,
  onComplete,
}) => {
  const [session, setSession] = useState<InteractiveSessionState>(() =>
    createInteractiveSession(bisectionResult)
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
  const [userMidpointInput, setUserMidpointInput] = useState('');
  const [userFMidpointInput, setUserFMidpointInput] = useState('');

  // Expandable "Why are we doing this?" toggle
  const [isWhyOpen, setIsWhyOpen] = useState(false);

  // Selected history iteration to review
  const [reviewingIterationIndex, setReviewingIterationIndex] = useState<number | null>(null);

  // Clean expression for display
  const cleanedExpr = problemExpression.replace(/=\s*0$/, '').trim();

  // Re-initialize session when problem input changes
  useEffect(() => {
    setSession(createInteractiveSession(bisectionResult));
    setUserFaInput('');
    setUserFbInput('');
    setUserMidpointInput('');
    setUserFMidpointInput('');
    setIsWhyOpen(false);
    setReviewingIterationIndex(null);
  }, [bisectionResult, problemExpression]);

  // If solver produced an error (e.g. initial interval has no sign change)
  if (!bisectionResult.success) {
    return (
      <div className="p-5 rounded-me bg-status-error-bg border border-status-error/30 text-status-error text-xs space-y-2">
        <div className="font-semibold flex items-center gap-1.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Cannot Begin Interactive Solving</span>
        </div>
        <p className="leading-relaxed">{bisectionResult.error}</p>
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
          {bisectionResult.stopping_reason}
        </p>
        <div className="pt-2">
          <Button variant="primary" size="sm" onClick={onShowSolution}>
            <span>View Solution Summary</span>
          </Button>
        </div>
      </div>
    );
  }

  const currentIter: BisectionIteration | undefined =
    bisectionResult.iterations[session.currentIterationIndex];

  // Derive current step educational content
  const stepContext = getStepContext(session, bisectionResult, cleanedExpr);
  let activeContent = {
    whyAreWeDoingThis: '',
    hints: ['', '', ''] as [string, string, string],
    correctExplanation: '',
  };

  if (session.currentStep === 'bracket_check') {
    const a = bisectionResult.initialEvaluation?.a ?? 0;
    const b = bisectionResult.initialEvaluation?.b ?? 0;
    const fa = bisectionResult.initialEvaluation?.f_a ?? 0;
    const fb = bisectionResult.initialEvaluation?.f_b ?? 0;
    activeContent = getBracketCheckContent(cleanedExpr, a, b, fa, fb);
  } else if (session.currentStep === 'midpoint') {
    activeContent = getMidpointContent(stepContext);
  } else if (session.currentStep === 'f_midpoint') {
    activeContent = getFMidpointContent(stepContext);
  } else if (session.currentStep === 'interval_choice') {
    activeContent = getIntervalChoiceContent(stepContext);
  }

  // Handlers for step submission
  const handleSubmitBracket = (e: React.FormEvent) => {
    e.preventDefault();
    const fa = parseFloat(userFaInput.trim());
    const fb = parseFloat(userFbInput.trim());
    if (isNaN(fa) || isNaN(fb)) {
      setSession((prev) => ({
        ...prev,
        stepFeedback: {
          status: 'incorrect',
          message: 'Please enter valid numerical values for both f(a₀) and f(b₀).',
          userValue: `f(a₀)=${userFaInput}, f(b₀)=${userFbInput}`,
        },
      }));
      return;
    }
    const nextState = processBracketCheck(session, bisectionResult, fa, fb, cleanedExpr);
    setSession(nextState);
  };

  const handleSubmitMidpoint = (e: React.FormEvent) => {
    e.preventDefault();
    const m = parseFloat(userMidpointInput.trim());
    if (isNaN(m)) {
      setSession((prev) => ({
        ...prev,
        stepFeedback: {
          status: 'incorrect',
          message: 'Please enter a valid numeric value for the midpoint.',
          userValue: userMidpointInput,
        },
      }));
      return;
    }
    const nextState = processMidpoint(session, bisectionResult, m, cleanedExpr);
    setSession(nextState);
    if (nextState.stepFeedback.status === 'correct') {
      setUserMidpointInput('');
    }
  };

  const handleSubmitFMidpoint = (e: React.FormEvent) => {
    e.preventDefault();
    const fval = parseFloat(userFMidpointInput.trim());
    if (isNaN(fval)) {
      setSession((prev) => ({
        ...prev,
        stepFeedback: {
          status: 'incorrect',
          message: 'Please enter a valid numeric value for f(x).',
          userValue: userFMidpointInput,
        },
      }));
      return;
    }
    const nextState = processFMidpoint(session, bisectionResult, fval, cleanedExpr);
    setSession(nextState);
    if (nextState.stepFeedback.status === 'correct') {
      setUserFMidpointInput('');
    }
  };

  const handleSelectInterval = (choice: 'left' | 'right') => {
    const nextState = processIntervalChoice(session, bisectionResult, choice, cleanedExpr);
    setSession(nextState);
  };

  const handleRequestHint = () => {
    const nextState = requestHint(session);
    setSession(nextState);
  };

  const handleResetSession = () => {
    hasReportedCompletionRef.current = false;
    setSession(createInteractiveSession(bisectionResult));
    setUserFaInput('');
    setUserFbInput('');
    setUserMidpointInput('');
    setUserFMidpointInput('');
    setIsWhyOpen(false);
    setReviewingIterationIndex(null);
  };

  const iterationNumber = session.currentIterationIndex + 1;
  const totalIterationsCount = bisectionResult.iterations.length;

  return (
    <div className="space-y-6">
      {/* Top Header & Session Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-soft">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="lavender">Solve with Me</Badge>
          {!session.isCompleted && (
            <span className="text-xs text-charcoal-muted">
              Iteration {iterationNumber} of {totalIterationsCount}
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
            onClick={handleResetSession}
            className="text-xs text-charcoal-muted hover:text-charcoal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Start Over</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onShowSolution}
            className="text-xs"
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Show Solution</span>
          </Button>
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
            {bisectionResult.iterations.map((iter, idx) => {
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
                <div>a = {session.completedIterations[reviewingIterationIndex].a.toFixed(4)}</div>
                <div>b = {session.completedIterations[reviewingIterationIndex].b.toFixed(4)}</div>
                <div>x = {session.completedIterations[reviewingIterationIndex].midpoint.toFixed(4)}</div>
                <div>f(x) = {session.completedIterations[reviewingIterationIndex].f_midpoint.toFixed(4)}</div>
              </div>
              {session.completedIterations[reviewingIterationIndex].hintsUsedForIteration !== undefined && (
                <div className="text-[11px] text-charcoal-muted pt-1">
                  Hints requested for this iteration: {session.completedIterations[reviewingIterationIndex].hintsUsedForIteration}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Completion View */}
      {session.isCompleted && (
        <Card variant="cream" className="space-y-6 py-8">
          <div className="text-center space-y-2 max-w-lg mx-auto">
            <div className="w-12 h-12 rounded-full bg-status-success-bg text-status-success flex items-center justify-center mx-auto shadow-subtle">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-semibold text-charcoal">Problem completed.</h2>
            <p className="text-xs text-charcoal-muted">
              {bisectionResult.stopping_reason}
            </p>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left">
            <div className="p-3 bg-bg-surface rounded-me border border-border-soft">
              <span className="text-[11px] text-charcoal-muted block">Identified Root</span>
              <strong className="text-base font-mono text-charcoal">
                x ≈ {bisectionResult.formattedRoot}
              </strong>
            </div>
            <div className="p-3 bg-bg-surface rounded-me border border-border-soft">
              <span className="text-[11px] text-charcoal-muted block">Iterations</span>
              <strong className="text-base font-mono text-charcoal">
                {session.completedIterations.length}
              </strong>
            </div>
            <div className="p-3 bg-bg-surface rounded-me border border-border-soft">
              <span className="text-[11px] text-charcoal-muted block">Steps Completed</span>
              <strong className="text-base font-mono text-charcoal">
                {session.independentStepsCompleted}
              </strong>
            </div>
            <div className="p-3 bg-bg-surface rounded-me border border-border-soft">
              <span className="text-[11px] text-charcoal-muted block">Hints Used</span>
              <strong className="text-base font-mono text-charcoal">
                {session.totalHintsUsed}
              </strong>
            </div>
          </div>

          {/* Learning Reflection: Concepts Practiced */}
          <div className="max-w-xl mx-auto p-4 bg-bg-surface rounded-me-lg border border-border-soft text-left space-y-2.5">
            <span className="text-xs font-semibold text-charcoal uppercase tracking-wider block">
              Review your solution — Concepts Practiced
            </span>
            <ul className="text-xs text-charcoal-muted space-y-1.5 list-disc pl-4">
              <li>
                <strong>Bracketing a root:</strong> Verified that f(a) · f(b) &lt; 0 so Bolzano's theorem guarantees a root in the interval.
              </li>
              <li>
                <strong>Calculating midpoints:</strong> Computed x_(n+1) = (a_n + b_n) / 2 to systematically halve the search interval.
              </li>
              <li>
                <strong>Evaluating f(x):</strong> Substituted midpoints into f(x) to test sign behavior without relying on guesswork.
              </li>
              <li>
                <strong>Selecting the next interval:</strong> Retained the sub-interval where endpoint signs remain opposite.
              </li>
            </ul>
          </div>

          <div className="pt-2 flex justify-center gap-3">
            <Button variant="primary" onClick={onShowSolution}>
              <span>View Complete Solution Table</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" onClick={handleResetSession}>
              <span>Solve Again</span>
            </Button>
          </div>
        </Card>
      )}

      {/* Active Step Canvas (when not completed) */}
      {!session.isCompleted && currentIter && (
        <Card variant="surface" className="space-y-5">
          {/* Step 1: Bracket Check (Iteration 0) */}
          {session.currentStep === 'bracket_check' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-lavender-deep uppercase tracking-wider">
                  Step 1 — Initial Bracket Check
                </span>
                <h3 className="text-lg font-semibold text-charcoal mt-0.5">
                  Calculate f(a₀) and f(b₀).
                </h3>
                <p className="text-xs text-charcoal-muted mt-1 leading-relaxed">
                  Evaluate the function at the initial endpoints a₀ = {currentIter.a} and b₀ = {currentIter.b} to verify that a sign change exists.
                </p>
              </div>

              <form onSubmit={handleSubmitBracket} className="space-y-4 pt-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-charcoal block">
                      f(a₀) = f({currentIter.a})
                    </label>
                    <input
                      type="text"
                      value={userFaInput}
                      onChange={(e) => setUserFaInput(e.target.value)}
                      placeholder="Enter value"
                      className="w-full bg-bg-primary/50 border border-border-soft rounded-me px-3.5 py-2.5 text-sm font-mono text-charcoal focus-ring transition-calm"
                      autoFocus
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-charcoal block">
                      f(b₀) = f({currentIter.b})
                    </label>
                    <input
                      type="text"
                      value={userFbInput}
                      onChange={(e) => setUserFbInput(e.target.value)}
                      placeholder="Enter value"
                      className="w-full bg-bg-primary/50 border border-border-soft rounded-me px-3.5 py-2.5 text-sm font-mono text-charcoal focus-ring transition-calm"
                    />
                  </div>
                </div>

                <Button variant="primary" size="md" type="submit">
                  <span>Submit Bracket Values</span>
                </Button>
              </form>
            </div>
          )}

          {/* Step 2: Midpoint Calculation */}
          {session.currentStep === 'midpoint' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-lavender-deep uppercase tracking-wider">
                  Iteration {iterationNumber} — Step 1: Midpoint
                </span>
                <h3 className="text-lg font-semibold text-charcoal mt-0.5">
                  Calculate the midpoint.
                </h3>
                <p className="text-xs text-charcoal-muted mt-1">
                  Interval bounds: <span className="font-mono">a_{currentIter.n} = {currentIter.a.toFixed(4)}</span>,{' '}
                  <span className="font-mono">b_{currentIter.n} = {currentIter.b.toFixed(4)}</span>.
                </p>
              </div>

              <div className="p-3 bg-bg-cream/40 rounded-me border border-border-soft/70 font-mono text-xs text-charcoal">
                x_{iterationNumber} = (a_{currentIter.n} + b_{currentIter.n}) / 2
              </div>

              <form onSubmit={handleSubmitMidpoint} className="space-y-4 pt-1 max-w-sm">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-charcoal block">
                    x_{iterationNumber} =
                  </label>
                  <input
                    type="text"
                    value={userMidpointInput}
                    onChange={(e) => setUserMidpointInput(e.target.value)}
                    placeholder="Enter midpoint value"
                    className="w-full bg-bg-primary/50 border border-border-soft rounded-me px-3.5 py-2.5 text-sm font-mono text-charcoal focus-ring transition-calm"
                    autoFocus
                  />
                </div>

                <Button variant="primary" size="md" type="submit">
                  <span>Submit Midpoint</span>
                </Button>
              </form>
            </div>
          )}

          {/* Step 3: Midpoint Function Value */}
          {session.currentStep === 'f_midpoint' && (
            <div className="space-y-4">
              <div>
                <span className="text-xs font-semibold text-lavender-deep uppercase tracking-wider">
                  Iteration {iterationNumber} — Step 2: Function Value
                </span>
                <h3 className="text-lg font-semibold text-charcoal mt-0.5">
                  Now calculate f(x_{iterationNumber}).
                </h3>
                <p className="text-xs text-charcoal-muted mt-1">
                  Evaluate the function at the midpoint <span className="font-mono">x_{iterationNumber} = {currentIter.midpoint.toFixed(4)}</span>.
                </p>
              </div>

              <form onSubmit={handleSubmitFMidpoint} className="space-y-4 pt-1 max-w-sm">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-charcoal block">
                    f(x_{iterationNumber}) = f({currentIter.midpoint.toFixed(4)})
                  </label>
                  <input
                    type="text"
                    value={userFMidpointInput}
                    onChange={(e) => setUserFMidpointInput(e.target.value)}
                    placeholder="Enter function value"
                    className="w-full bg-bg-primary/50 border border-border-soft rounded-me px-3.5 py-2.5 text-sm font-mono text-charcoal focus-ring transition-calm"
                    autoFocus
                  />
                </div>

                <Button variant="primary" size="md" type="submit">
                  <span>Submit Function Value</span>
                </Button>
              </form>
            </div>
          )}

          {/* Step 4: Interval Selection */}
          {session.currentStep === 'interval_choice' && (
            <div className="space-y-5">
              <div>
                <span className="text-xs font-semibold text-lavender-deep uppercase tracking-wider">
                  Iteration {iterationNumber} — Step 3: Choose Next Interval
                </span>
                <h3 className="text-lg font-semibold text-charcoal mt-0.5">
                  Which interval contains the root?
                </h3>
                <p className="text-xs text-charcoal-muted mt-1">
                  Compare the signs of the function values at the endpoints and the midpoint.
                </p>
              </div>

              {/* Display relevant function values */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-me bg-bg-primary/70 border border-border-soft text-xs font-mono space-y-1">
                  <div className="text-[11px] text-charcoal-muted">Left Endpoint</div>
                  <div className="text-charcoal font-semibold">f(a_{currentIter.n}) = {currentIter.f_a.toFixed(4)}</div>
                  <div className="text-[10px] text-charcoal-muted uppercase">
                    Sign: {currentIter.f_a >= 0 ? 'Positive (+)' : 'Negative (−)'}
                  </div>
                </div>

                <div className="p-3 rounded-me bg-lavender-light/50 border border-lavender-soft/60 text-xs font-mono space-y-1">
                  <div className="text-[11px] text-lavender-deep">Midpoint</div>
                  <div className="text-charcoal font-semibold">f(x_{iterationNumber}) = {currentIter.f_midpoint.toFixed(4)}</div>
                  <div className="text-[10px] text-charcoal-muted uppercase">
                    Sign: {currentIter.f_midpoint >= 0 ? 'Positive (+)' : 'Negative (−)'}
                  </div>
                </div>

                <div className="p-3 rounded-me bg-bg-primary/70 border border-border-soft text-xs font-mono space-y-1">
                  <div className="text-[11px] text-charcoal-muted">Right Endpoint</div>
                  <div className="text-charcoal font-semibold">f(b_{currentIter.n}) = {currentIter.f_b.toFixed(4)}</div>
                  <div className="text-[10px] text-charcoal-muted uppercase">
                    Sign: {currentIter.f_b >= 0 ? 'Positive (+)' : 'Negative (−)'}
                  </div>
                </div>
              </div>

              {/* Two Selectable Interval Option Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <button
                  type="button"
                  onClick={() => handleSelectInterval('left')}
                  className="p-5 rounded-me-lg bg-bg-surface border border-border-soft hover:border-lavender-deep text-left transition-calm space-y-2 group shadow-subtle focus-ring"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-charcoal group-hover:text-lavender-deep transition-calm">
                      Option A
                    </span>
                    <span className="text-[11px] text-charcoal-muted">[a_{currentIter.n}, x_{iterationNumber}]</span>
                  </div>
                  <div className="text-base font-mono font-semibold text-charcoal">
                    [{currentIter.a.toFixed(4)}, {currentIter.midpoint.toFixed(4)}]
                  </div>
                  <p className="text-xs text-charcoal-muted">
                    Root lies between lower bound and midpoint.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectInterval('right')}
                  className="p-5 rounded-me-lg bg-bg-surface border border-border-soft hover:border-lavender-deep text-left transition-calm space-y-2 group shadow-subtle focus-ring"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-charcoal group-hover:text-lavender-deep transition-calm">
                      Option B
                    </span>
                    <span className="text-[11px] text-charcoal-muted">[x_{iterationNumber}, b_{currentIter.n}]</span>
                  </div>
                  <div className="text-base font-mono font-semibold text-charcoal">
                    [{currentIter.midpoint.toFixed(4)}, {currentIter.b.toFixed(4)}]
                  </div>
                  <p className="text-xs text-charcoal-muted">
                    Root lies between midpoint and upper bound.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Calm Feedback Display (Correct or Diagnostic Mistake) */}
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
        </Card>
      )}
    </div>
  );
};
