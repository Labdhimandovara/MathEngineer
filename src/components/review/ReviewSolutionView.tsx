import React, { useMemo } from 'react';
import { solveBisection, BisectionResult } from '../../math/bisection/index.ts';
import { solveFalsePosition, FalsePositionResult } from '../../math/falsePosition/index.ts';
import { solveNewtonRaphson, NewtonRaphsonResult } from '../../math/newtonRaphson/index.ts';
import { normalizeEquationToExpression, findInitialBracket } from '../../math/bracketSearch/index.ts';
import { updateRegisteredImageProblem } from '../../services/problem/imageProblemRegistry.ts';
import { BoundsSource } from '../../services/problemImage/problemImageTypes.ts';
import { Badge } from '../ui/Badge.tsx';
import { CheckCircle2, AlertCircle, Calculator, ChevronRight, Hash, Sparkles } from 'lucide-react';

import { generateDeterministicSolution, DeterministicSolutionResult } from '../../services/problem/solutionService.ts';

interface ReviewSolutionViewProps {
  method: 'bisection' | 'false-position' | 'newton-raphson' | 'mixed';
  equation: string;
  lowerBound?: number | null;
  upperBound?: number | null;
  initialGuess?: number | null;
  decimalPlaces?: number;
  questionId?: string;
  boundsSource?: BoundsSource;
}

export const ReviewSolutionView: React.FC<ReviewSolutionViewProps> = ({
  method,
  equation,
  lowerBound,
  upperBound,
  initialGuess,
  decimalPlaces = 3,
  questionId,
  boundsSource,
}) => {
  const cleanExpr = useMemo(() => normalizeEquationToExpression(equation), [equation]);

  // Canonical deterministic execution
  const solution: DeterministicSolutionResult = useMemo(() => {
    return generateDeterministicSolution({
      questionId,
      equation,
      method: method === 'mixed' ? 'bisection' : method,
      lowerBound,
      upperBound,
      initialGuess,
      decimalPlaces,
      boundsSource,
    });
  }, [method, equation, lowerBound, upperBound, initialGuess, decimalPlaces, questionId, boundsSource]);

  const solverOutput = {
    error: solution.success ? undefined : solution.error,
    bisection: solution.rawBisectionResult,
    falsePosition: solution.rawFalsePositionResult,
    newtonRaphson: solution.rawNewtonResult,
    effectiveA: solution.lowerBound,
    effectiveB: solution.upperBound,
    isDiscovered: solution.boundsSource === 'discovered',
    discoveredExplanation: solution.bracketDiscovery?.explanation,
  };

  if (solverOutput.error) {
    return (
      <div className="p-4 rounded-me bg-status-error-bg/60 border border-status-error/30 text-xs text-status-error space-y-1 animate-fadeIn">
        <div className="font-semibold flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Cannot Regenerate Deterministic Solution</span>
        </div>
        <p>{solverOutput.error}</p>
      </div>
    );
  }

  // 1. BISECTION SOLUTION VIEW
  if (solverOutput.bisection) {
    const res = solverOutput.bisection as BisectionResult;
    const aVal = solverOutput.effectiveA ?? lowerBound;
    const bVal = solverOutput.effectiveB ?? upperBound;

    return (
      <div className="space-y-4 pt-2 text-xs text-charcoal animate-fadeIn">
        {/* Discovered Bounds Alert */}
        {solverOutput.isDiscovered && (
          <div className="p-2.5 bg-lavender-light/70 border border-lavender-dusty/60 rounded-me text-charcoal space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-lavender-deep">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Bounds source: Deterministically discovered [{aVal}, {bVal}]</span>
            </div>
            <p className="text-[11px] text-charcoal-muted">
              Using deterministically discovered interval [{aVal}, {bVal}] because original problem bounds were unspecified. Sign changes: f({aVal}) and f({bVal}) have opposite signs.
            </p>
          </div>
        )}

        <div className="p-3 bg-bg-surface border border-border-soft rounded-me space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-charcoal flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-lavender-deep" />
              <span>Bisection Method Solution (f(x) = {cleanExpr})</span>
            </div>
            {res.success ? (
              <Badge variant="cream" className="text-status-success font-medium">
                Converged to {res.formattedRoot || res.root?.toFixed(decimalPlaces)}
              </Badge>
            ) : (
              <Badge variant="neutral" className="text-status-error">
                Did not converge
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-charcoal-muted pt-1 border-t border-border-soft/60">
            <div>
              <span className="font-medium text-charcoal">Initial Interval:</span> [{aVal}, {bVal}]
              {solverOutput.isDiscovered && (
                <span className="ml-1 text-[10px] text-lavender-deep font-semibold"> (Discovered)</span>
              )}
            </div>
            <div>
              <span className="font-medium text-charcoal">Midpoint Formula:</span> c = (a + b) / 2
            </div>
            <div>
              <span className="font-medium text-charcoal">Tolerance:</span> {decimalPlaces} decimal places
            </div>
          </div>
        </div>

        {/* Iteration Table */}
        {res.iterations && res.iterations.length > 0 && (
          <div className="overflow-x-auto rounded-me border border-border-soft">
            <table className="w-full text-left text-[11px] border-collapse bg-bg-surface">
              <thead>
                <tr className="bg-bg-neutral/80 text-charcoal-muted border-b border-border-soft">
                  <th className="py-1.5 px-2.5 font-medium">#</th>
                  <th className="py-1.5 px-2.5 font-medium">a</th>
                  <th className="py-1.5 px-2.5 font-medium">b</th>
                  <th className="py-1.5 px-2.5 font-medium text-lavender-deep font-semibold">c (midpoint)</th>
                  <th className="py-1.5 px-2.5 font-medium">f(c)</th>
                  <th className="py-1.5 px-2.5 font-medium">Next Interval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft/50">
                {res.iterations.map((it) => (
                  <tr key={it.n} className={it.is_stopping_met ? 'bg-status-success-bg/30 font-medium' : ''}>
                    <td className="py-1.5 px-2.5 text-charcoal-muted">{it.n}</td>
                    <td className="py-1.5 px-2.5 font-mono">{it.a.toFixed(decimalPlaces + 1)}</td>
                    <td className="py-1.5 px-2.5 font-mono">{it.b.toFixed(decimalPlaces + 1)}</td>
                    <td className="py-1.5 px-2.5 font-mono font-medium text-charcoal">
                      {it.midpoint.toFixed(decimalPlaces + 1)}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-charcoal-muted">
                      {it.f_midpoint.toFixed(4)}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-[10px]">
                      [{it.next_interval[0].toFixed(decimalPlaces)}, {it.next_interval[1].toFixed(decimalPlaces)}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {res.stopping_reason && (
          <p className="text-[11px] text-charcoal-muted italic">
            Stopping Criterion: {res.stopping_reason}
          </p>
        )}
      </div>
    );
  }

  // 2. FALSE POSITION SOLUTION VIEW
  if (solverOutput.falsePosition) {
    const res = solverOutput.falsePosition as FalsePositionResult;
    const aVal = solverOutput.effectiveA ?? lowerBound;
    const bVal = solverOutput.effectiveB ?? upperBound;

    return (
      <div className="space-y-4 pt-2 text-xs text-charcoal animate-fadeIn">
        {/* Discovered Bounds Alert */}
        {solverOutput.isDiscovered && (
          <div className="p-2.5 bg-lavender-light/70 border border-lavender-dusty/60 rounded-me text-charcoal space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-lavender-deep">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Bounds source: Deterministically discovered [{aVal}, {bVal}]</span>
            </div>
            <p className="text-[11px] text-charcoal-muted">
              Using deterministically discovered interval [{aVal}, {bVal}] because original problem bounds were unspecified. Sign changes: f({aVal}) and f({bVal}) have opposite signs.
            </p>
          </div>
        )}

        <div className="p-3 bg-bg-surface border border-border-soft rounded-me space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-charcoal flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-lavender-deep" />
              <span>False Position Solution (f(x) = {cleanExpr})</span>
            </div>
            {res.success ? (
              <Badge variant="cream" className="text-status-success font-medium">
                Converged to {res.formattedRoot || res.root?.toFixed(decimalPlaces)}
              </Badge>
            ) : (
              <Badge variant="neutral" className="text-status-error">
                Did not converge
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-charcoal-muted pt-1 border-t border-border-soft/60">
            <div>
              <span className="font-medium text-charcoal">Initial Interval:</span> [{aVal}, {bVal}]
              {solverOutput.isDiscovered && (
                <span className="ml-1 text-[10px] text-lavender-deep font-semibold"> (Discovered)</span>
              )}
            </div>
            <div>
              <span className="font-medium text-charcoal">Formula:</span> c = (a·f(b) - b·f(a)) / (f(b) - f(a))
            </div>
            <div>
              <span className="font-medium text-charcoal">Tolerance:</span> {decimalPlaces} decimal places
            </div>
          </div>
        </div>

        {/* Iteration Table */}
        {res.iterations && res.iterations.length > 0 && (
          <div className="overflow-x-auto rounded-me border border-border-soft">
            <table className="w-full text-left text-[11px] border-collapse bg-bg-surface">
              <thead>
                <tr className="bg-bg-neutral/80 text-charcoal-muted border-b border-border-soft">
                  <th className="py-1.5 px-2.5 font-medium">#</th>
                  <th className="py-1.5 px-2.5 font-medium">a</th>
                  <th className="py-1.5 px-2.5 font-medium">b</th>
                  <th className="py-1.5 px-2.5 font-medium text-lavender-deep font-semibold">c (chord root)</th>
                  <th className="py-1.5 px-2.5 font-medium">f(c)</th>
                  <th className="py-1.5 px-2.5 font-medium">Next Interval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft/50">
                {res.iterations.map((it) => (
                  <tr key={it.n} className={it.is_stopping_met ? 'bg-status-success-bg/30 font-medium' : ''}>
                    <td className="py-1.5 px-2.5 text-charcoal-muted">{it.n}</td>
                    <td className="py-1.5 px-2.5 font-mono">{it.a.toFixed(decimalPlaces + 1)}</td>
                    <td className="py-1.5 px-2.5 font-mono">{it.b.toFixed(decimalPlaces + 1)}</td>
                    <td className="py-1.5 px-2.5 font-mono font-medium text-charcoal">
                      {it.c.toFixed(decimalPlaces + 1)}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-charcoal-muted">
                      {it.f_c.toFixed(4)}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-[10px]">
                      [{it.next_interval[0].toFixed(decimalPlaces)}, {it.next_interval[1].toFixed(decimalPlaces)}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {res.stopping_reason && (
          <p className="text-[11px] text-charcoal-muted italic">
            Stopping Criterion: {res.stopping_reason}
          </p>
        )}
      </div>
    );
  }

  // 3. NEWTON-RAPHSON SOLUTION VIEW
  if (solverOutput.newtonRaphson) {
    const res = solverOutput.newtonRaphson as NewtonRaphsonResult;
    const x0Val = initialGuess !== undefined && initialGuess !== null ? initialGuess : upperBound ?? lowerBound ?? 1;

    return (
      <div className="space-y-4 pt-2 text-xs text-charcoal animate-fadeIn">
        <div className="p-3 bg-bg-surface border border-border-soft rounded-me space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-medium text-charcoal flex items-center gap-1.5">
              <Calculator className="w-3.5 h-3.5 text-lavender-deep" />
              <span>Newton-Raphson Solution (f(x) = {cleanExpr})</span>
            </div>
            {res.success ? (
              <Badge variant="cream" className="text-status-success font-medium">
                Converged to {res.formattedRoot || res.root?.toFixed(decimalPlaces)}
              </Badge>
            ) : (
              <Badge variant="neutral" className="text-status-error">
                Did not converge
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-charcoal-muted pt-1 border-t border-border-soft/60">
            <div>
              <span className="font-medium text-charcoal">Initial Guess x₀:</span> {x0Val}
            </div>
            <div>
              <span className="font-medium text-charcoal">Derivative f'(x):</span> {res.derivative_expression || 'f\'(x)'}
            </div>
            <div>
              <span className="font-medium text-charcoal">Tolerance:</span> {decimalPlaces} decimal places
            </div>
          </div>
        </div>

        {/* Iteration Table */}
        {res.iterations && res.iterations.length > 0 && (
          <div className="overflow-x-auto rounded-me border border-border-soft">
            <table className="w-full text-left text-[11px] border-collapse bg-bg-surface">
              <thead>
                <tr className="bg-bg-neutral/80 text-charcoal-muted border-b border-border-soft">
                  <th className="py-1.5 px-2.5 font-medium">#</th>
                  <th className="py-1.5 px-2.5 font-medium">xₙ</th>
                  <th className="py-1.5 px-2.5 font-medium">f(xₙ)</th>
                  <th className="py-1.5 px-2.5 font-medium">f'(xₙ)</th>
                  <th className="py-1.5 px-2.5 font-medium text-lavender-deep font-semibold">xₙ₊₁</th>
                  <th className="py-1.5 px-2.5 font-medium">|xₙ₊₁ - xₙ|</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft/50">
                {res.iterations.map((it) => (
                  <tr key={it.n} className={it.is_stopping_met ? 'bg-status-success-bg/30 font-medium' : ''}>
                    <td className="py-1.5 px-2.5 text-charcoal-muted">{it.n}</td>
                    <td className="py-1.5 px-2.5 font-mono">{it.x_n.toFixed(decimalPlaces + 1)}</td>
                    <td className="py-1.5 px-2.5 font-mono text-charcoal-muted">{it.f_xn.toFixed(4)}</td>
                    <td className="py-1.5 px-2.5 font-mono text-charcoal-muted">{it.f_prime_xn.toFixed(4)}</td>
                    <td className="py-1.5 px-2.5 font-mono font-medium text-charcoal">
                      {it.x_next.toFixed(decimalPlaces + 1)}
                    </td>
                    <td className="py-1.5 px-2.5 font-mono text-[10px]">
                      {it.error.toFixed(decimalPlaces + 2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {res.stopping_reason && (
          <p className="text-[11px] text-charcoal-muted italic">
            Stopping Criterion: {res.stopping_reason}
          </p>
        )}
      </div>
    );
  }

  return null;
};
