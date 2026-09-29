import React from 'react';
import { CheckCircle2, TrendingDown } from 'lucide-react';

interface IntervalConvergenceVisualizerProps {
  method: 'bisection' | 'false-position' | 'newton-raphson';
  lowerBound?: number;
  upperBound?: number;
  initialGuess?: number;
  root?: number;
  converged?: boolean;
  decimalPlaces?: number;
  iterationsCount?: number;
  stoppingReason?: string;
}

export const IntervalConvergenceVisualizer: React.FC<IntervalConvergenceVisualizerProps> = ({
  method,
  lowerBound,
  upperBound,
  initialGuess,
  root,
  converged = false,
  decimalPlaces = 3,
  iterationsCount,
  stoppingReason,
}) => {
  // If we don't have valid numbers, return null
  if (root === undefined || isNaN(root)) {
    return null;
  }

  const isBracketMethod = method === 'bisection' || method === 'false-position';
  const a = lowerBound !== undefined && !isNaN(lowerBound) ? lowerBound : root - 1;
  const b = upperBound !== undefined && !isNaN(upperBound) ? upperBound : root + 1;
  const minVal = Math.min(a, b, root, initialGuess ?? root);
  const maxVal = Math.max(a, b, root, initialGuess ?? root);
  const range = maxVal - minVal > 0 ? maxVal - minVal : 1;

  // Calculate percentage along the line (with 8% padding on edges)
  const getPercent = (val: number) => {
    const raw = ((val - minVal) / range) * 84 + 8;
    return Math.max(6, Math.min(94, raw));
  };

  const rootPct = getPercent(root);
  const aPct = isBracketMethod ? getPercent(a) : null;
  const bPct = isBracketMethod ? getPercent(b) : null;
  const guessPct = method === 'newton-raphson' && initialGuess !== undefined ? getPercent(initialGuess) : null;

  return (
    <div className="p-4 sm:p-5 rounded-me-lg bg-bg-surface dark:bg-bg-darkSurface border border-border-soft dark:border-border-dark shadow-subtle space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft dark:border-border-dark pb-2.5">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-lavender-deep dark:text-lavender-accent" />
          <span className="text-xs font-semibold text-charcoal dark:text-charcoal-light uppercase tracking-wider">
            {isBracketMethod ? 'Interval Convergence Geometry' : 'Tangent Root Trajectory'}
          </span>
        </div>

        {converged && (
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-status-success-bg dark:bg-[#1A2E20] text-status-success dark:text-[#76B885] border border-status-success/30 text-xs font-medium animate-fadeIn">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>✓ Converged in {iterationsCount ?? '—'} steps</span>
          </div>
        )}
      </div>

      {/* Axis Track */}
      <div className="relative pt-6 pb-6 px-4">
        {/* Track Line */}
        <div className="relative h-2 w-full bg-bg-neutral dark:bg-bg-darkCard rounded-full overflow-visible border border-border-soft dark:border-border-dark">
          {/* Bracket Highlight if bracket method */}
          {aPct !== null && bPct !== null && (
            <div
              className="absolute top-0 bottom-0 bg-lavender-soft/40 dark:bg-lavender-deep/30 rounded-full"
              style={{
                left: `${Math.min(aPct, bPct)}%`,
                width: `${Math.abs(bPct - aPct)}%`,
              }}
            />
          )}

          {/* Lower bound marker */}
          {aPct !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
              style={{ left: `${aPct}%` }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-status-danger border-2 border-white dark:border-bg-darkSurface shadow-xs" />
              <span className="text-[10px] font-mono text-charcoal-muted dark:text-charcoal-subtle mt-1.5 whitespace-nowrap">
                a = {a}
              </span>
            </div>
          )}

          {/* Upper bound marker */}
          {bPct !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
              style={{ left: `${bPct}%` }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-status-success border-2 border-white dark:border-bg-darkSurface shadow-xs" />
              <span className="text-[10px] font-mono text-charcoal-muted dark:text-charcoal-subtle mt-1.5 whitespace-nowrap">
                b = {b}
              </span>
            </div>
          )}

          {/* Initial guess marker for Newton-Raphson */}
          {guessPct !== null && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none"
              style={{ left: `${guessPct}%` }}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-bg-darkSurface shadow-xs" />
              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400 mt-1.5 whitespace-nowrap">
                x₀ = {initialGuess}
              </span>
            </div>
          )}

          {/* Root marker */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none z-10"
            style={{ left: `${rootPct}%` }}
          >
            <div className="w-4 h-4 rounded-full bg-lavender-deep dark:bg-lavender-accent border-2 border-white dark:border-bg-darkSurface shadow-subtle ring-2 ring-lavender-dusty/50" />
            <div className="absolute -top-7 px-2 py-0.5 bg-lavender-deep text-white dark:bg-lavender-accent dark:text-bg-darkDeep rounded text-[10px] font-mono font-bold whitespace-nowrap shadow-xs">
              Root x* ≈ {root.toFixed(decimalPlaces)}
            </div>
          </div>
        </div>
      </div>

      {/* Numerical Metrics Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-charcoal-muted dark:text-charcoal-subtle pt-1 bg-bg-primary/60 dark:bg-bg-darkDeep/40 p-2.5 rounded-me border border-border-soft/60 dark:border-border-dark/60 font-mono">
        <div>
          <span>Target Interval: </span>
          <span className="text-charcoal dark:text-charcoal-light font-semibold">
            {isBracketMethod ? `[${a}, ${b}]` : `x₀ = ${initialGuess ?? '—'}`}
          </span>
        </div>
        <div>
          <span>Calculated Root: </span>
          <span className="text-lavender-deep dark:text-lavender-accent font-bold">
            {root.toFixed(decimalPlaces)}
          </span>
        </div>
        {stoppingReason && (
          <div className="text-[11px] text-charcoal-subtle">
            Reason: {stoppingReason}
          </div>
        )}
      </div>
    </div>
  );
};
