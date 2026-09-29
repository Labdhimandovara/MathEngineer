import React, { useState } from 'react';
import { FalsePositionResult } from '../../math/falsePosition/types.ts';
import {
  generateFalsePositionExplainedSolution,
  FalsePositionIterationStepExplanation,
} from '../../data/falsePositionSolutionExplanation.ts';
import { Button } from '../ui/Button.tsx';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Table as TableIcon,
  CheckCircle2,
  BookOpen,
  HelpCircle,
  AlertCircle,
} from 'lucide-react';

interface ExplainedSolutionFalsePositionProps {
  falsePositionResult: FalsePositionResult;
  problemExpression: string;
  decimalPlaces: number;
}

export const ExplainedSolutionFalsePosition: React.FC<ExplainedSolutionFalsePositionProps> = ({
  falsePositionResult,
  problemExpression,
  decimalPlaces,
}) => {
  const [currentIterationIndex, setCurrentIterationIndex] = useState(0);
  const [showAllSteps, setShowAllSteps] = useState(false);
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  const explainedData = generateFalsePositionExplainedSolution(
    falsePositionResult,
    problemExpression,
    decimalPlaces
  );

  // If solver produced an error (e.g. initial interval has no sign change)
  if (!falsePositionResult.success || !explainedData) {
    return (
      <div className="p-5 rounded-me bg-status-error-bg border border-status-error/30 text-status-error text-xs space-y-2">
        <div className="font-semibold flex items-center gap-1.5 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Cannot Generate Explained Solution</span>
        </div>
        <p className="leading-relaxed">{falsePositionResult.error}</p>
        <p className="text-charcoal-muted pt-1">
          Adjust the initial interval [a, b] in the problem definition so that f(a) and f(b) have opposite signs.
        </p>
      </div>
    );
  }

  const { overview, iterations, finalSummary } = explainedData;
  const totalIterations = iterations.length;

  const currentIter: FalsePositionIterationStepExplanation | undefined =
    iterations[currentIterationIndex];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 1. Solution Overview Card */}
      <Card variant="cream" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border-soft">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-lavender-deep uppercase tracking-wider">
              Educational Walkthrough
            </span>
            <span className="text-xs text-charcoal-muted">•</span>
            <Badge variant="lavender">{overview.methodName}</Badge>
          </div>
          <div className="text-xs text-charcoal-muted">
            Accuracy target: <strong>{finalSummary.accuracyDecimalPlaces} decimal places</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-me bg-bg-surface border border-border-soft space-y-1">
            <span className="text-charcoal-muted block">Equation</span>
            <strong className="font-mono text-charcoal text-sm">
              f(x) = {explainedData.problem.expression}
            </strong>
          </div>
          <div className="p-3 rounded-me bg-bg-surface border border-border-soft space-y-1">
            <span className="text-charcoal-muted block">Initial Interval</span>
            <strong className="font-mono text-charcoal text-sm">
              [a₀ = {explainedData.problem.initialA}, b₀ = {explainedData.problem.initialB}]
            </strong>
          </div>
          <div className="p-3 rounded-me bg-bg-surface border border-border-soft space-y-1">
            <span className="text-charcoal-muted block">Total Iterations</span>
            <strong className="font-mono text-charcoal text-sm">
              {totalIterations} steps to convergence
            </strong>
          </div>
        </div>

        <div className="space-y-2 bg-bg-surface/80 p-3 rounded-me border border-border-soft/60 text-xs text-charcoal leading-relaxed">
          <p>
            <strong>Method Principle:</strong> {overview.corePrinciple}
          </p>
          <p className="text-charcoal-muted text-[11px] font-mono">
            {overview.chordEquationDescription}
          </p>
        </div>
      </Card>

      {/* 2. Step Navigation Controls & View Mode Toggle */}
      {totalIterations > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border-soft">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-charcoal uppercase tracking-wider">
              {showAllSteps ? 'Full Walkthrough View' : 'Step-by-Step View'}
            </span>
            {!showAllSteps && (
              <span className="text-xs text-charcoal-muted">
                (Iteration {currentIterationIndex + 1} of {totalIterations})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAllSteps((prev) => !prev)}
              className="text-xs"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{showAllSteps ? 'Paged Step View' : 'Show All Steps'}</span>
            </Button>

            {!showAllSteps && (
              <div className="flex items-center gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentIterationIndex === 0}
                  onClick={() => setCurrentIterationIndex((prev) => Math.max(0, prev - 1))}
                  className="text-xs"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Previous</span>
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={currentIterationIndex === totalIterations - 1}
                  onClick={() =>
                    setCurrentIterationIndex((prev) => Math.min(totalIterations - 1, prev + 1))
                  }
                  className="text-xs"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 3. Detailed Step Explanations (Paged or All) */}
      <div className="space-y-6">
        {(showAllSteps ? iterations : currentIter ? [currentIter] : []).map(
          (iter: FalsePositionIterationStepExplanation) => (
            <Card
              key={iter.n}
              variant="surface"
              className="space-y-5 border-border-soft shadow-subtle hover:border-lavender-dusty/60 transition-calm"
            >
              {/* Header for Iteration */}
              <div className="flex items-center justify-between pb-3 border-b border-border-soft">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-lavender-light text-lavender-deep flex items-center justify-center font-serif text-xs font-semibold">
                    {iter.iterationNumber}
                  </span>
                  <h3 className="text-base font-semibold text-charcoal">
                    Iteration {iter.iterationNumber} (n = {iter.n})
                  </h3>
                </div>
                {iter.isStoppingMet && (
                  <Badge variant="success">Stopping Condition Satisfied</Badge>
                )}
              </div>

              {/* 4 Educational Sub-steps */}
              <div className="space-y-4">
                {/* Step 1 — Current interval */}
                <div className="p-3.5 bg-bg-primary/50 rounded-me border border-border-soft/70 space-y-1 text-xs">
                  <div className="font-semibold text-charcoal flex items-center gap-1.5">
                    <span className="text-lavender-deep font-mono font-bold">1.</span>
                    <span>Current Search Interval</span>
                  </div>
                  <p className="text-charcoal-muted leading-relaxed pl-4">
                    {iter.intervalExplanation}
                  </p>
                  <div className="pl-4 font-mono font-semibold text-charcoal pt-0.5">
                    Interval: [{iter.a.toFixed(4)}, {iter.b.toFixed(4)}]
                  </div>
                </div>

                {/* Step 2 — False Position Secant Approximation */}
                <div className="p-3.5 bg-bg-primary/50 rounded-me border border-border-soft/70 space-y-1 text-xs">
                  <div className="font-semibold text-charcoal flex items-center gap-1.5">
                    <span className="text-lavender-deep font-mono font-bold">2.</span>
                    <span>Calculate False Position Approximation</span>
                  </div>
                  <div className="pl-4 font-mono space-y-0.5 pt-1 text-charcoal">
                    <div className="text-charcoal-muted">{iter.formulaDisplay}</div>
                    <div className="text-[11px] text-charcoal-muted">{iter.substitutionDisplay}</div>
                    <div>
                      Approximation x_{iter.iterationNumber} ={' '}
                      <strong className="text-lavender-deep">{iter.approximationResult}</strong>
                    </div>
                  </div>
                </div>

                {/* Step 3 — Evaluate the function */}
                <div className="p-3.5 bg-bg-primary/50 rounded-me border border-border-soft/70 space-y-1 text-xs">
                  <div className="font-semibold text-charcoal flex items-center gap-1.5">
                    <span className="text-lavender-deep font-mono font-bold">3.</span>
                    <span>Evaluate the Function at x_{iter.iterationNumber}</span>
                  </div>
                  <div className="pl-4 font-mono space-y-0.5 pt-1 text-charcoal">
                    <div>
                      {iter.functionFormula} ={' '}
                      <strong className="text-charcoal">{iter.functionResult}</strong>{' '}
                      <span className="text-charcoal-muted font-sans">
                        ({iter.functionSign})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Step 4 — Decide next interval */}
                <div className="p-3.5 bg-bg-cream/40 rounded-me border border-border-soft/70 space-y-2 text-xs">
                  <div className="font-semibold text-charcoal flex items-center gap-1.5">
                    <span className="text-lavender-deep font-mono font-bold">4.</span>
                    <span>Decide the Next Interval</span>
                  </div>

                  <div className="pl-4 space-y-1.5">
                    {/* Function value signs comparison */}
                    <div className="flex flex-wrap items-center gap-3 font-mono text-[11px] text-charcoal-muted">
                      <span>{iter.f_a_display}</span>
                      <span>•</span>
                      <span className="font-semibold text-charcoal">
                        {iter.f_c_display}
                      </span>
                      <span>•</span>
                      <span>{iter.f_b_display}</span>
                    </div>

                    <p className="text-charcoal leading-relaxed">
                      {iter.signComparisonExplanation}
                    </p>

                    <div className="pt-1 flex items-center gap-2">
                      <span className="text-charcoal-muted">Next retained interval:</span>
                      <span className="font-mono font-bold text-lavender-deep bg-bg-surface px-2 py-0.5 rounded border border-border-soft">
                        {iter.retainedIntervalDisplay}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          )
        )}
      </div>

      {/* 4. Final Answer & Stopping Condition Summary */}
      <Card variant="cream" className="space-y-5 border-border-soft">
        <div className="flex items-center gap-2 pb-2 border-b border-border-soft">
          <CheckCircle2 className="w-5 h-5 text-status-success" />
          <h3 className="text-lg font-semibold text-charcoal">Solution Summary</h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-bg-surface rounded-me border border-border-soft space-y-1">
            <span className="text-xs text-charcoal-muted block">Identified Root</span>
            <div className="text-2xl font-mono font-bold text-charcoal">
              x ≈ {finalSummary.formattedRoot}
            </div>
            <span className="text-[11px] text-charcoal-muted block">
              To {finalSummary.accuracyDecimalPlaces} decimal places
            </span>
          </div>

          <div className="p-4 bg-bg-surface rounded-me border border-border-soft space-y-1">
            <span className="text-xs text-charcoal-muted block">Iterations Used</span>
            <div className="text-2xl font-mono font-bold text-charcoal">
              {finalSummary.iterationsUsed}
            </div>
            <span className="text-[11px] text-charcoal-muted block">
              False Position steps
            </span>
          </div>

          <div className="p-4 bg-bg-surface rounded-me border border-border-soft space-y-1">
            <span className="text-xs text-charcoal-muted block">Accuracy Standard</span>
            <div className="text-base font-semibold text-charcoal">
              Course Decimal Places
            </div>
            <span className="text-[11px] text-charcoal-muted block">
              Successive approximations agree
            </span>
          </div>
        </div>

        {/* Why this is the answer section */}
        <div className="p-4 bg-bg-surface rounded-me border border-border-soft space-y-1.5 text-xs">
          <div className="font-semibold text-charcoal flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-lavender-deep" />
            <span>Why this is the answer</span>
          </div>
          <p className="text-charcoal-muted leading-relaxed">
            {finalSummary.whyThisIsTheAnswer}
          </p>
        </div>
      </Card>

      {/* 5. Expandable Complete Numerical Table */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setIsTableExpanded((prev) => !prev)}
          className="w-full p-4 rounded-me-lg bg-bg-surface border border-border-soft hover:border-lavender-dusty flex items-center justify-between text-xs font-medium text-charcoal transition-calm shadow-subtle"
        >
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-lavender-deep" />
            <span>View Complete Numerical Iteration Table</span>
            <span className="text-charcoal-muted">
              ({totalIterations} iterations total)
            </span>
          </div>
          {isTableExpanded ? (
            <ChevronUp className="w-4 h-4 text-charcoal-muted" />
          ) : (
            <ChevronDown className="w-4 h-4 text-charcoal-muted" />
          )}
        </button>

        {isTableExpanded && (
          <div className="overflow-x-auto border border-border-soft rounded-me-lg bg-bg-surface shadow-subtle animate-fadeIn">
            <table className="w-full text-xs text-left text-charcoal">
              <thead className="bg-bg-primary/80 border-b border-border-soft text-[11px] font-semibold text-charcoal-muted uppercase">
                <tr>
                  <th className="px-3.5 py-3">n</th>
                  <th className="px-3.5 py-3">a_n</th>
                  <th className="px-3.5 py-3">b_n</th>
                  <th className="px-3.5 py-3">f(a_n)</th>
                  <th className="px-3.5 py-3">f(b_n)</th>
                  <th className="px-3.5 py-3">x_(n+1)</th>
                  <th className="px-3.5 py-3">f(x_(n+1))</th>
                  <th className="px-3.5 py-3">Next Interval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft/60 font-mono">
                {falsePositionResult.iterations.map((iter) => (
                  <tr
                    key={iter.n}
                    className={`hover:bg-bg-primary/40 transition-calm ${
                      iter.is_stopping_met ? 'bg-status-success-bg/40 font-semibold' : ''
                    }`}
                  >
                    <td className="px-3.5 py-2.5 text-charcoal-muted">{iter.n}</td>
                    <td className="px-3.5 py-2.5">{iter.a.toFixed(4)}</td>
                    <td className="px-3.5 py-2.5">{iter.b.toFixed(4)}</td>
                    <td className="px-3.5 py-2.5">{iter.f_a.toFixed(4)}</td>
                    <td className="px-3.5 py-2.5">{iter.f_b.toFixed(4)}</td>
                    <td className="px-3.5 py-2.5 text-lavender-deep font-semibold">
                      {iter.c.toFixed(4)}
                    </td>
                    <td className="px-3.5 py-2.5">
                      {iter.f_c >= 0 ? ` ${iter.f_c.toFixed(4)}` : iter.f_c.toFixed(4)}
                    </td>
                    <td className="px-3.5 py-2.5 text-charcoal-muted">
                      [{iter.next_interval[0].toFixed(4)}, {iter.next_interval[1].toFixed(4)}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
