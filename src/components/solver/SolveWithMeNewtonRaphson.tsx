import React, { useState } from 'react';
import {
  NewtonRaphsonResult,
  NewtonRaphsonSessionState,
} from '../../math/newtonRaphson/types.ts';
import {
  createNewtonRaphsonInteractiveSession,
  getNewtonRaphsonStepContext,
  processNewtonRaphsonCheckX0,
  processNewtonRaphsonEvaluateFx,
  processNewtonRaphsonEvaluateFPrime,
  processNewtonRaphsonApplyFormula,
  processNewtonRaphsonCheckStopping,
  requestNewtonRaphsonHint,
} from '../../math/newtonRaphson/interactiveSolver.ts';
import {
  getNewtonCheckX0Content,
  getNewtonEvaluateFxContent,
  getNewtonEvaluateFPrimeContent,
  getNewtonApplyFormulaContent,
  getNewtonCheckStoppingContent,
} from '../../data/newtonRaphsonEducationalContent.ts';
import { Button } from '../ui/Button.tsx';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import {
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  History,
  RotateCcw,
  Eye,
  HelpCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface SolveWithMeNewtonRaphsonProps {
  newtonResult: NewtonRaphsonResult;
  problemExpression: string;
  onShowSolution?: () => void;
  onComplete?: (stats: { hintsUsed: number; stepsCompleted: number }) => void;
}

export const SolveWithMeNewtonRaphson: React.FC<SolveWithMeNewtonRaphsonProps> = ({
  newtonResult,
  problemExpression,
  onShowSolution,
  onComplete,
}) => {
  const [session, setSession] = useState<NewtonRaphsonSessionState>(() =>
    createNewtonRaphsonInteractiveSession(newtonResult, problemExpression)
  );

  const [inputVal, setInputVal] = useState<string>('');
  const [isWhyOpen, setIsWhyOpen] = useState<boolean>(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const hasReportedCompletionRef = React.useRef(false);

  // Re-initialize session if solver result or equation changes
  React.useEffect(() => {
    hasReportedCompletionRef.current = false;
    setSession(createNewtonRaphsonInteractiveSession(newtonResult, problemExpression));
    setInputVal('');
  }, [newtonResult, problemExpression]);

  React.useEffect(() => {
    if (session.isComplete && !hasReportedCompletionRef.current) {
      hasReportedCompletionRef.current = true;
      onComplete?.({
        hintsUsed: session.totalHintsUsed,
        stepsCompleted: session.completedIterations.length,
      });
    }
  }, [session.isComplete, onComplete, session.totalHintsUsed, session.completedIterations.length]);

  if (!newtonResult.success) {
    return (
      <div className="p-4 rounded-me bg-status-error-bg border border-status-error/30 text-status-error text-xs space-y-1">
        <div className="font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Cannot Start Interactive Newton-Raphson Session</span>
        </div>
        <p>{newtonResult.error || 'The solver encountered an issue.'}</p>
      </div>
    );
  }

  const {
    currentStep,
    currentIterationIndex,
    isComplete,
    lastFeedback,
    hintsRevealedForCurrentStep,
    totalHintsUsed,
    highestHintLevelUsed,
    completedIterations,
  } = session;

  const context = getNewtonRaphsonStepContext(session);

  // Active step educational content
  let currentEducationalContent;
  switch (currentStep) {
    case 'check_x0':
      currentEducationalContent = getNewtonCheckX0Content(context);
      break;
    case 'evaluate_fx':
      currentEducationalContent = getNewtonEvaluateFxContent(context);
      break;
    case 'evaluate_fprime':
      currentEducationalContent = getNewtonEvaluateFPrimeContent(context);
      break;
    case 'apply_formula':
      currentEducationalContent = getNewtonApplyFormulaContent(context);
      break;
    case 'check_stopping': {
      const isStoppingMet = session.activeIteration?.is_stopping_met ?? false;
      currentEducationalContent = getNewtonCheckStoppingContent(context, isStoppingMet);
      break;
    }
  }

  const handleRequestHint = () => {
    const { state: updatedState } = requestNewtonRaphsonHint(session);
    setSession(updatedState);
  };

  const handleResetSession = () => {
    hasReportedCompletionRef.current = false;
    setSession(createNewtonRaphsonInteractiveSession(newtonResult, problemExpression));
    setInputVal('');
  };

  const handleSubmitStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    if (currentStep === 'check_x0') {
      const num = parseFloat(inputVal.trim());
      const { state: nextState } = processNewtonRaphsonCheckX0(session, num);
      setSession(nextState);
      if (nextState.currentStep !== 'check_x0') setInputVal('');
    } else if (currentStep === 'evaluate_fx') {
      const num = parseFloat(inputVal.trim());
      const { state: nextState } = processNewtonRaphsonEvaluateFx(session, num);
      setSession(nextState);
      if (nextState.currentStep !== 'evaluate_fx') setInputVal('');
    } else if (currentStep === 'evaluate_fprime') {
      const num = parseFloat(inputVal.trim());
      const { state: nextState } = processNewtonRaphsonEvaluateFPrime(session, num);
      setSession(nextState);
      if (nextState.currentStep !== 'evaluate_fprime') setInputVal('');
    } else if (currentStep === 'apply_formula') {
      const num = parseFloat(inputVal.trim());
      const { state: nextState } = processNewtonRaphsonApplyFormula(session, num);
      setSession(nextState);
      if (nextState.currentStep !== 'apply_formula') setInputVal('');
    } else if (currentStep === 'check_stopping') {
      const decision = inputVal.trim().toLowerCase() as 'stop' | 'continue';
      const { state: nextState } = processNewtonRaphsonCheckStopping(session, decision);
      setSession(nextState);
      setInputVal('');
    }
  };

  const revealedHints = currentEducationalContent
    ? currentEducationalContent.hints.slice(0, hintsRevealedForCurrentStep)
    : [];

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-soft">
        <div className="flex items-center gap-2">
          <Badge variant="lavender">Newton-Raphson</Badge>
          <span className="text-xs text-charcoal-muted">•</span>
          <span className="text-xs font-semibold text-charcoal">
            {isComplete
              ? 'Problem Completed'
              : `Iteration ${currentIterationIndex + 1} of ~${newtonResult.iterations_used}`}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {totalHintsUsed > 0 && (
            <span className="text-xs text-charcoal-muted">
              Hints used: <strong>{totalHintsUsed}</strong>
            </span>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsHistoryOpen((prev) => !prev)}
            className="text-xs text-charcoal-muted hover:text-charcoal"
          >
            <History className="w-3.5 h-3.5" />
            <span>History ({completedIterations.length})</span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleResetSession}
            className="text-xs text-charcoal-muted hover:text-charcoal"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restart</span>
          </Button>
        </div>
      </div>

      {/* History Drawer */}
      {isHistoryOpen && (
        <Card variant="surface" className="space-y-3 border-border-soft animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">
              Completed Iterations History
            </span>
            <button
              onClick={() => setIsHistoryOpen(false)}
              className="text-xs text-charcoal-muted hover:text-charcoal"
            >
              Close
            </button>
          </div>

          {completedIterations.length === 0 ? (
            <p className="text-xs text-charcoal-muted">No iterations completed yet.</p>
          ) : (
            <div className="overflow-x-auto border border-border-soft rounded-me">
              <table className="w-full text-xs text-left text-charcoal font-mono">
                <thead className="bg-bg-primary/80 border-b border-border-soft text-[10px] font-sans font-semibold text-charcoal-muted uppercase">
                  <tr>
                    <th className="px-3 py-2">Iter</th>
                    <th className="px-3 py-2">x_n</th>
                    <th className="px-3 py-2">f(x_n)</th>
                    <th className="px-3 py-2">f'(x_n)</th>
                    <th className="px-3 py-2 text-lavender-deep">x_(n+1)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-soft/60 text-[11px]">
                  {completedIterations.map((rec) => (
                    <tr key={rec.iteration} className="hover:bg-bg-primary/20">
                      <td className="px-3 py-1.5 text-charcoal-muted">{rec.iteration}</td>
                      <td className="px-3 py-1.5">{rec.x_n.toFixed(4)}</td>
                      <td className="px-3 py-1.5">{rec.f_x.toFixed(4)}</td>
                      <td className="px-3 py-1.5">{rec.f_prime_x.toFixed(4)}</td>
                      <td className="px-3 py-1.5 text-lavender-deep font-semibold">
                        {rec.x_next.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      )}

      {/* 2. Completion Screen */}
      {isComplete ? (
        <Card variant="cream" className="space-y-6 text-center py-8">
          <div className="w-12 h-12 rounded-full bg-status-success-bg text-status-success mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-semibold text-charcoal">
              Problem Solved Successfully!
            </h3>
            <p className="text-xs text-charcoal-muted leading-relaxed">
              You worked through the Newton-Raphson tangent line iterations to identify the root correct to 3 decimal places.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-lg mx-auto text-left">
            <div className="p-3 rounded-me bg-bg-surface border border-border-soft space-y-1">
              <span className="text-[11px] text-charcoal-muted block">Identified Root</span>
              <strong className="font-mono text-base text-lavender-deep">
                x ≈ {newtonResult.formattedRoot}
              </strong>
            </div>

            <div className="p-3 rounded-me bg-bg-surface border border-border-soft space-y-1">
              <span className="text-[11px] text-charcoal-muted block">Iterations</span>
              <strong className="font-mono text-base text-charcoal">
                {completedIterations.length} steps
              </strong>
            </div>

            <div className="p-3 rounded-me bg-bg-surface border border-border-soft space-y-1">
              <span className="text-[11px] text-charcoal-muted block">Hint Usage</span>
              <strong className="font-mono text-base text-charcoal">
                {totalHintsUsed} total hints
              </strong>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {onShowSolution && (
              <Button variant="primary" size="md" onClick={onShowSolution}>
                <Eye className="w-4 h-4" />
                <span>Show Explained Solution</span>
              </Button>
            )}
            <Button variant="outline" size="md" onClick={handleResetSession}>
              <RotateCcw className="w-4 h-4" />
              <span>Solve Again</span>
            </Button>
          </div>
        </Card>
      ) : (
        /* 3. Active Step Card */
        <div className="space-y-5">
          <Card variant="surface" className="space-y-5 border-border-soft shadow-subtle">
            {/* Step header */}
            <div className="flex items-center justify-between pb-3 border-b border-border-soft">
              <div className="space-y-0.5">
                <span className="text-[10px] font-semibold text-lavender-deep uppercase tracking-wider font-mono">
                  Iteration {currentIterationIndex + 1} • {currentStep.replace('_', ' ').toUpperCase()}
                </span>
                <h3 className="text-base font-semibold text-charcoal">
                  {currentStep === 'check_x0' && 'Confirm Initial Approximation x₀'}
                  {currentStep === 'evaluate_fx' && `Evaluate Function f(x_${currentIterationIndex})`}
                  {currentStep === 'evaluate_fprime' && `Evaluate Derivative f'(x_${currentIterationIndex})`}
                  {currentStep === 'apply_formula' && `Calculate x_${currentIterationIndex + 1} with Newton Formula`}
                  {currentStep === 'check_stopping' && 'Check Decimal Place Agreement'}
                </h3>
              </div>

              <div className="text-right font-mono text-xs text-charcoal-muted">
                x_{currentIterationIndex} ={' '}
                <strong className="text-charcoal">{context.x_n.toFixed(4)}</strong>
              </div>
            </div>

            {/* Step formulation & instructions */}
            <div className="space-y-2 text-xs">
              {currentStep === 'check_x0' && (
                <p className="text-charcoal-muted leading-relaxed">
                  The interval is [{context.a}, {context.b}]. In the course procedure, select the endpoint x₀ whose magnitude |f(x)| is closer to zero.
                </p>
              )}

              {currentStep === 'evaluate_fx' && (
                <div className="space-y-1">
                  <p className="text-charcoal-muted leading-relaxed">
                    Substitute x = <strong>{context.x_n.toFixed(4)}</strong> into f(x) ={' '}
                    <span className="font-mono">{problemExpression}</span>.
                  </p>
                  <div className="font-mono text-charcoal p-2 bg-bg-primary/50 rounded border border-border-soft/60">
                    f({context.x_n.toFixed(4)}) = ?
                  </div>
                </div>
              )}

              {currentStep === 'evaluate_fprime' && (
                <div className="space-y-1">
                  <p className="text-charcoal-muted leading-relaxed">
                    Evaluate the derivative f'(x) ={' '}
                    <span className="font-mono">{session.derivativeExpression}</span> at x ={' '}
                    <strong>{context.x_n.toFixed(4)}</strong>.
                  </p>
                  <div className="font-mono text-charcoal p-2 bg-bg-primary/50 rounded border border-border-soft/60">
                    f'({context.x_n.toFixed(4)}) = ?
                  </div>
                </div>
              )}

              {currentStep === 'apply_formula' && (
                <div className="space-y-1">
                  <p className="text-charcoal-muted leading-relaxed">
                    Apply the Newton-Raphson formula:{' '}
                    <span className="font-mono font-semibold">
                      x_(n+1) = x_n - f(x_n) / f'(x_n)
                    </span>
                  </p>
                  <div className="font-mono text-charcoal p-2 bg-bg-primary/50 rounded border border-border-soft/60 text-[11px]">
                    x_{currentIterationIndex + 1} = {context.x_n.toFixed(4)} - ({context.f_x.toFixed(4)}) / ({context.f_prime_x.toFixed(4)})
                  </div>
                </div>
              )}

              {currentStep === 'check_stopping' && (
                <div className="space-y-2">
                  <p className="text-charcoal-muted leading-relaxed">
                    Compare consecutive approximations:
                  </p>
                  <div className="p-3 bg-bg-primary/50 rounded border border-border-soft/60 font-mono text-xs space-y-1 text-charcoal">
                    <div>x_{currentIterationIndex} = {context.x_n.toFixed(4)}</div>
                    <div>x_{currentIterationIndex + 1} = {context.x_next.toFixed(4)}</div>
                    <div className="text-charcoal-muted pt-1 text-[11px] font-sans">
                      Do they agree to {context.decimalPlaces} decimal places? Type <strong>stop</strong> or <strong>continue</strong>.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmitStep} className="space-y-3 pt-1">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputVal}
                  onChange={(e) => setInputVal(e.target.value)}
                  placeholder={
                    currentStep === 'check_stopping'
                      ? 'Type stop or continue'
                      : 'Enter calculated value (e.g. 1.856)'
                  }
                  className="flex-1 bg-bg-primary/60 border border-border-soft rounded-me px-3.5 py-2.5 text-sm text-charcoal focus-ring transition-calm font-mono"
                  autoFocus
                />
                <Button variant="primary" size="md" type="submit">
                  <span>Verify Step</span>
                </Button>
              </div>

              {currentStep === 'check_stopping' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      const { state: nextState } = processNewtonRaphsonCheckStopping(session, 'continue');
                      setSession(nextState);
                      setInputVal('');
                    }}
                    className="text-xs"
                  >
                    Continue Iterating
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    type="button"
                    onClick={() => {
                      const { state: nextState } = processNewtonRaphsonCheckStopping(session, 'stop');
                      setSession(nextState);
                      setInputVal('');
                    }}
                    className="text-xs"
                  >
                    Stop (Agree to 3 decimal places)
                  </Button>
                </div>
              )}
            </form>

            {/* Last feedback banner */}
            {lastFeedback && (
              <div
                className={`p-3.5 rounded-me text-xs leading-relaxed space-y-1 ${
                  lastFeedback.isCorrect
                    ? 'bg-status-success-bg/50 border border-status-success/30 text-charcoal'
                    : 'bg-status-error-bg border border-status-error/30 text-status-error'
                }`}
              >
                <div className="font-semibold flex items-center gap-1.5">
                  {lastFeedback.isCorrect ? (
                    <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-status-error shrink-0" />
                  )}
                  <span>{lastFeedback.message}</span>
                </div>
                {lastFeedback.explanation && (
                  <p className="text-charcoal-muted pl-5">{lastFeedback.explanation}</p>
                )}
              </div>
            )}

            {/* "Why are we doing this?" Collapsible Drawer */}
            {currentEducationalContent && (
              <div className="pt-2 border-t border-border-soft">
                <button
                  type="button"
                  onClick={() => setIsWhyOpen((prev) => !prev)}
                  className="flex items-center justify-between w-full text-xs font-medium text-charcoal-muted hover:text-charcoal transition-calm"
                >
                  <div className="flex items-center gap-1.5 text-lavender-deep">
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Why are we doing this?</span>
                  </div>
                  {isWhyOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {isWhyOpen && (
                  <div className="mt-2.5 p-3.5 rounded-me bg-bg-cream/40 border border-border-soft text-xs text-charcoal-muted leading-relaxed animate-fadeIn">
                    {currentEducationalContent.whyAreWeDoingThis}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* 4. Progressive 3-Level Hints Card */}
          {currentEducationalContent && (
            <Card variant="cream" className="space-y-3 border-border-soft">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-charcoal">
                  <Lightbulb className="w-3.5 h-3.5 text-status-warning" />
                  <span>Progressive Guidance</span>
                  {hintsRevealedForCurrentStep > 0 && (
                    <span className="text-charcoal-muted text-[11px] font-normal">
                      ({hintsRevealedForCurrentStep}/3 revealed)
                    </span>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRequestHint}
                  disabled={hintsRevealedForCurrentStep >= 3}
                  className="text-xs bg-bg-surface"
                >
                  {hintsRevealedForCurrentStep === 0 && 'Give me a hint'}
                  {hintsRevealedForCurrentStep > 0 &&
                    hintsRevealedForCurrentStep < 3 &&
                    `Give me another hint (${hintsRevealedForCurrentStep}/3)`}
                  {hintsRevealedForCurrentStep >= 3 && 'All 3 hints revealed'}
                </Button>
              </div>

              {/* Stacked Hint Cards */}
              {revealedHints.length > 0 && (
                <div className="space-y-2 pt-1 animate-fadeIn">
                  {revealedHints.map((hintText, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-me bg-bg-surface border border-border-soft text-xs text-charcoal space-y-1"
                    >
                      <span className="text-[10px] uppercase font-semibold text-lavender-deep tracking-wider block">
                        Hint {idx + 1}{' '}
                        {idx === 0
                          ? '• Concept'
                          : idx === 1
                          ? '• Formula & Substitution'
                          : '• Direct Guidance'}
                      </span>
                      <p className="text-charcoal-muted leading-relaxed">{hintText}</p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
