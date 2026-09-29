import React, { useState, useMemo } from 'react';
import { solveBisection } from '../../math/bisection/bisectionSolver.ts';
import { solveFalsePosition } from '../../math/falsePosition/falsePositionSolver.ts';
import { solveNewtonRaphson } from '../../math/newtonRaphson/newtonRaphsonSolver.ts';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
import { ArrowRight, BarChart2, CheckCircle2, AlertTriangle, Play } from 'lucide-react';
import { PageId } from '../../types/index.ts';

interface MethodComparisonProps {
  onNavigate: (
    page: PageId,
    options?: { method?: string; action?: 'none' | 'myself' | 'hints' | 'solution' }
  ) => void;
}

interface PresetOption {
  id: string;
  name: string;
  equation: string;
  equationDisplay: string;
  a: number;
  b: number;
  decimalPlaces: number;
  description: string;
}

const PRESET_EQUATIONS: PresetOption[] = [
  {
    id: 'cubic-benchmark',
    name: 'Course Classic Cubic: x³ - 2x - 5 = 0',
    equation: 'x^3 - 2*x - 5',
    equationDisplay: 'x³ - 2x - 5 = 0',
    a: 2,
    b: 3,
    decimalPlaces: 3,
    description: 'The standard polynomial benchmark found in both False Position and Newton-Raphson course slides.',
  },
  {
    id: 'transcendental-cos-exp',
    name: 'Transcendental: cos(x) - x·eˣ = 0',
    equation: 'cos(x) - x*exp(x)',
    equationDisplay: 'cos(x) - x·eˣ = 0',
    a: 0,
    b: 1,
    decimalPlaces: 4,
    description: 'Course PPT Example 2 for False Position with oscillating trigonometric and exponential terms.',
  },
  {
    id: 'quartic-primary',
    name: 'Quartic Polynomial: x⁴ - x - 10 = 0',
    equation: 'x^4 - x - 10',
    equationDisplay: 'x⁴ - x - 10 = 0',
    a: 1,
    b: 2,
    decimalPlaces: 3,
    description: 'Primary Newton-Raphson course example illustrating fast tangent convergence.',
  },
  {
    id: 'cubic-unit',
    name: 'Cubic: x³ - x - 1 = 0',
    equation: 'x^3 - x - 1',
    equationDisplay: 'x³ - x - 1 = 0',
    a: 1,
    b: 2,
    decimalPlaces: 3,
    description: 'Classic equation demonstrating bracketing vs tangent mechanics on unit interval.',
  },
];

export const MethodComparison: React.FC<MethodComparisonProps> = ({ onNavigate }) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>('cubic-benchmark');
  const [customEquation, setCustomEquation] = useState<string>('x^3 - 2*x - 5');
  const [customA, setCustomA] = useState<number>(2);
  const [customB, setCustomB] = useState<number>(3);
  const [customDp, setCustomDp] = useState<number>(3);
  const [isCustom, setIsCustom] = useState<boolean>(false);

  const activeEquation = isCustom
    ? customEquation
    : PRESET_EQUATIONS.find((p) => p.id === selectedPresetId)?.equation || 'x^3 - 2*x - 5';
  const activeA = isCustom
    ? customA
    : PRESET_EQUATIONS.find((p) => p.id === selectedPresetId)?.a ?? 2;
  const activeB = isCustom
    ? customB
    : PRESET_EQUATIONS.find((p) => p.id === selectedPresetId)?.b ?? 3;
  const activeDp = isCustom
    ? customDp
    : PRESET_EQUATIONS.find((p) => p.id === selectedPresetId)?.decimalPlaces ?? 3;

  // Run all 3 deterministic solvers on current parameters
  const comparisonResults = useMemo(() => {
    const bisResult = solveBisection({
      expression: activeEquation,
      a: activeA,
      b: activeB,
      decimalPlaces: activeDp,
      maxIterations: 40,
    });

    const fpResult = solveFalsePosition({
      expression: activeEquation,
      a: activeA,
      b: activeB,
      decimalPlaces: activeDp,
      maxIterations: 40,
    });

    const nrResult = solveNewtonRaphson({
      expression: activeEquation,
      a: activeA,
      b: activeB,
      decimalPlaces: activeDp,
      maxIterations: 30,
    });

    return { bisResult, fpResult, nrResult };
  }, [activeEquation, activeA, activeB, activeDp]);

  const { bisResult, fpResult, nrResult } = comparisonResults;

  const maxIter = Math.max(
    bisResult.iterations.length || 1,
    fpResult.iterations.length || 1,
    nrResult.iterations.length || 1
  );

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Intro Header */}
      <section className="space-y-2">
        <div className="flex items-center gap-2">
          <Badge variant="cream">Comparative Laboratory</Badge>
          <Badge variant="neutral">Deterministic Execution</Badge>
        </div>
        <h2 className="text-2xl sm:text-3xl font-semibold text-charcoal">
          Method Comparison Tool
        </h2>
        <p className="text-sm text-charcoal-muted max-w-2xl leading-relaxed">
          Run Bisection, False Position, and Newton-Raphson simultaneously on the exact same equation.
          Observe differences in speed, step count, and convergence behavior.
        </p>
      </section>

      {/* Preset Selector Card */}
      <Card variant="surface" className="space-y-5 border-border-soft dark:border-[#382952] dark:bg-[#1E1430]">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-charcoal dark:text-[#F3F0FA] uppercase tracking-wider">
              Select Preset Equation or Test Custom
            </label>
            <button
              onClick={() => setIsCustom(!isCustom)}
              className="text-xs font-medium text-lavender-deep dark:text-[#C5B8EB] hover:text-charcoal dark:hover:text-[#F3F0FA] transition-calm"
            >
              {isCustom ? 'Switch to Preset Equations' : 'Test Custom Equation'}
            </button>
          </div>

          {!isCustom ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PRESET_EQUATIONS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setSelectedPresetId(preset.id)}
                  className={`p-3.5 rounded-me text-left transition-calm border ${
                    selectedPresetId === preset.id
                      ? 'bg-lavender-light/50 dark:bg-[#34244E] border-lavender-dusty/80 dark:border-[#7A61BA] shadow-subtle'
                      : 'bg-bg-primary/50 dark:bg-[#251A38] border-border-soft dark:border-[#382952] hover:bg-bg-surface dark:hover:bg-[#2D2140] hover:border-lavender-dusty/40 dark:hover:border-[#523A78]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-charcoal dark:text-[#F3F0FA]">{preset.name}</span>
                    <Badge variant="neutral">{preset.decimalPlaces} dp</Badge>
                  </div>
                  <div className="font-mono text-xs text-lavender-deep dark:text-[#C5B8EB] font-medium mt-1">
                    {preset.equationDisplay} on [{preset.a}, {preset.b}]
                  </div>
                  <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2] mt-1 leading-relaxed">
                    {preset.description}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">Equation Expression f(x)</label>
                <input
                  type="text"
                  value={customEquation}
                  onChange={(e) => setCustomEquation(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-me border border-border-soft dark:border-[#382952] bg-bg-surface dark:bg-[#251A38] text-charcoal dark:text-[#F3F0FA] focus:outline-none focus:border-lavender-dusty dark:focus:border-[#7A61BA]"
                  placeholder="e.g. x^3 - 2*x - 5"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">Interval [a, b]</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={customA}
                    onChange={(e) => setCustomA(parseFloat(e.target.value) || 0)}
                    className="w-1/2 px-2 py-1.5 text-xs font-mono rounded-me border border-border-soft dark:border-[#382952] bg-bg-surface dark:bg-[#251A38] text-charcoal dark:text-[#F3F0FA]"
                  />
                  <input
                    type="number"
                    value={customB}
                    onChange={(e) => setCustomB(parseFloat(e.target.value) || 0)}
                    className="w-1/2 px-2 py-1.5 text-xs font-mono rounded-me border border-border-soft dark:border-[#382952] bg-bg-surface dark:bg-[#251A38] text-charcoal dark:text-[#F3F0FA]"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">Decimal Places</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={customDp}
                  onChange={(e) => setCustomDp(parseInt(e.target.value, 10) || 3)}
                  className="w-full px-3 py-1.5 text-xs font-mono rounded-me border border-border-soft dark:border-[#382952] bg-bg-surface dark:bg-[#251A38] text-charcoal dark:text-[#F3F0FA]"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* 3-Method Comparison Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Bisection Method Card */}
        <Card variant="surface" className="space-y-4 border-border-soft dark:border-[#382952] dark:bg-[#1E1430] relative overflow-hidden">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="neutral">Bracketing Method</Badge>
              <span className="text-[11px] font-mono text-charcoal-muted dark:text-[#B0A7C2]">p = 1 (Linear)</span>
            </div>
            <h3 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA]">Bisection Method</h3>
            <p className="text-xs font-mono text-lavender-deep dark:text-[#C5B8EB]">x_(n+1) = (a + b) / 2</p>
          </div>

          {bisResult.success ? (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-me bg-bg-primary/80 dark:bg-[#251A38] border border-border-soft/60 dark:border-[#382952] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal-muted dark:text-[#B0A7C2]">Iterations Needed</span>
                  <span className="text-lg font-bold text-charcoal dark:text-[#F3F0FA]">
                    {bisResult.iterations.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal-muted dark:text-[#B0A7C2]">Approximate Root</span>
                  <span className="font-mono font-semibold text-charcoal dark:text-[#F3F0FA]">
                    {bisResult.root?.toFixed(activeDp)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2] space-y-1 leading-relaxed">
                <div>
                  <strong className="text-charcoal dark:text-[#F3F0FA]">Guarantee:</strong> Always converges if f(a)·f(b) &lt; 0.
                </div>
                <div>
                  <strong className="text-charcoal dark:text-[#F3F0FA]">Trade-off:</strong> Slowest convergence; cuts error by exactly 50% each step.
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onNavigate('solve', {
                    method: 'bisection',
                    action: 'myself',
                  })
                }
                className="w-full text-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                <span>Solve With Bisection</span>
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-me bg-status-error-bg dark:bg-rose-950/40 text-status-error dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{bisResult.error}</span>
            </div>
          )}
        </Card>

        {/* False Position Method Card */}
        <Card variant="surface" className="space-y-4 border-border-soft dark:border-[#382952] dark:bg-[#1E1430] relative overflow-hidden">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="cream">Interpolation Method</Badge>
              <span className="text-[11px] font-mono text-charcoal-muted dark:text-[#B0A7C2]">Linear / Chord</span>
            </div>
            <h3 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA]">False Position</h3>
            <p className="text-xs font-mono text-lavender-deep dark:text-[#C5B8EB]">
              x = (a·f(b) - b·f(a)) / (f(b) - f(a))
            </p>
          </div>

          {fpResult.success ? (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-me bg-bg-primary/80 dark:bg-[#251A38] border border-border-soft/60 dark:border-[#382952] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal-muted dark:text-[#B0A7C2]">Iterations Needed</span>
                  <span className="text-lg font-bold text-charcoal dark:text-[#F3F0FA]">
                    {fpResult.iterations.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal-muted dark:text-[#B0A7C2]">Approximate Root</span>
                  <span className="font-mono font-semibold text-charcoal dark:text-[#F3F0FA]">
                    {fpResult.root?.toFixed(activeDp)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2] space-y-1 leading-relaxed">
                <div>
                  <strong className="text-charcoal dark:text-[#F3F0FA]">Guarantee:</strong> Always converges while bracketing the root.
                </div>
                <div>
                  <strong className="text-charcoal dark:text-[#F3F0FA]">Trade-off:</strong> Much faster than bisection, but one bound may become pinned.
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  onNavigate('solve', {
                    method: 'false-position',
                    action: 'myself',
                  })
                }
                className="w-full text-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                <span>Solve With False Position</span>
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-me bg-status-error-bg dark:bg-rose-950/40 text-status-error dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{fpResult.error}</span>
            </div>
          )}
        </Card>

        {/* Newton-Raphson Method Card */}
        <Card variant="surface" className="space-y-4 border-border-soft dark:border-[#382952] dark:bg-[#1E1430] relative overflow-hidden">
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Badge variant="lavender">Open Tangent Method</Badge>
              <span className="text-[11px] font-mono text-charcoal-muted dark:text-[#B0A7C2]">p = 2 (Quadratic)</span>
            </div>
            <h3 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA]">Newton-Raphson</h3>
            <p className="text-xs font-mono text-lavender-deep dark:text-[#C5B8EB]">
              x_(n+1) = x_n - f(x_n) / f&apos;(x_n)
            </p>
          </div>

          {nrResult.success ? (
            <div className="space-y-3 pt-1">
              <div className="p-3 rounded-me bg-bg-primary/80 dark:bg-[#251A38] border border-border-soft/60 dark:border-[#382952] space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal-muted dark:text-[#B0A7C2]">Iterations Needed</span>
                  <span className="text-lg font-bold text-status-success dark:text-emerald-400">
                    {nrResult.iterations.length}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-charcoal-muted dark:text-[#B0A7C2]">Approximate Root</span>
                  <span className="font-mono font-semibold text-charcoal dark:text-[#F3F0FA]">
                    {nrResult.root?.toFixed(activeDp)}
                  </span>
                </div>
              </div>

              <div className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2] space-y-1 leading-relaxed">
                <div>
                  <strong className="text-charcoal dark:text-[#F3F0FA]">Guarantee:</strong> Quadratic convergence near simple root.
                </div>
                <div>
                  <strong className="text-charcoal dark:text-[#F3F0FA]">Trade-off:</strong> Requires analytic derivative f&apos;(x); fails if f&apos;(x_n) = 0.
                </div>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() =>
                  onNavigate('solve', {
                    method: 'newton-raphson',
                    action: 'myself',
                  })
                }
                className="w-full text-xs flex items-center justify-center gap-1.5"
              >
                <Play className="w-3 h-3" />
                <span>Solve With Newton-Raphson</span>
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-me bg-status-error-bg dark:bg-rose-950/40 text-status-error dark:text-rose-300 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{nrResult.error}</span>
            </div>
          )}
        </Card>
      </div>

      {/* Visual Iteration Comparison Bar */}
      <Card variant="surface" className="space-y-4 border-border-soft dark:border-[#382952] dark:bg-[#1E1430]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-lavender-deep dark:text-[#C5B8EB]" />
            <h3 className="text-sm font-semibold text-charcoal dark:text-[#F3F0FA]">
              Iteration Efficiency Comparison
            </h3>
          </div>
          <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
            Fewer iterations = Faster convergence
          </span>
        </div>

        <div className="space-y-3 pt-2">
          {/* Bisection Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-charcoal dark:text-[#F3F0FA]">Bisection Method</span>
              <span className="font-mono text-charcoal-muted dark:text-[#B0A7C2]">
                {bisResult.iterations.length} iterations
              </span>
            </div>
            <div className="w-full bg-bg-neutral dark:bg-[#251A38] h-3 rounded-full overflow-hidden">
              <div
                className="bg-charcoal-muted dark:bg-[#8E79BD] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round((bisResult.iterations.length / maxIter) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* False Position Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-charcoal dark:text-[#F3F0FA]">False Position Method</span>
              <span className="font-mono text-charcoal-muted dark:text-[#B0A7C2]">
                {fpResult.iterations.length} iterations
              </span>
            </div>
            <div className="w-full bg-bg-neutral dark:bg-[#251A38] h-3 rounded-full overflow-hidden">
              <div
                className="bg-lavender-deep dark:bg-[#A693C2] h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round((fpResult.iterations.length / maxIter) * 100)}%`,
                }}
              />
            </div>
          </div>

          {/* Newton-Raphson Bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-charcoal dark:text-[#F3F0FA]">Newton-Raphson Method</span>
              <span className="font-mono text-status-success dark:text-emerald-400 font-semibold">
                {nrResult.iterations.length} iterations
              </span>
            </div>
            <div className="w-full bg-bg-neutral dark:bg-[#251A38] h-3 rounded-full overflow-hidden">
              <div
                className="bg-status-success dark:bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round((nrResult.iterations.length / maxIter) * 100)}%`,
                }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Course Theory Grounding */}
      <Card variant="cream" className="space-y-2 border-border-soft dark:border-[#382952] dark:bg-[#1E1430] p-4">
        <h4 className="text-xs font-semibold text-charcoal dark:text-[#F3F0FA] uppercase tracking-wider">
          University Curriculum Takeaway (Dr. Ram Kishun Lodhi, SIT Pune)
        </h4>
        <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          <strong className="text-charcoal dark:text-[#F3F0FA]">Why is Newton-Raphson so fast?</strong> Newton-Raphson possesses quadratic convergence (order p = 2).
          Once the approximation enters the neighborhood of a simple root, the number of accurate decimal places roughly doubles with every single iteration.
          In contrast, Bisection reduces the interval length by exactly half each step (order p = 1), requiring roughly 3.32 iterations per decimal digit of precision.
        </p>
      </Card>
    </div>
  );
};
