import React, { useState, useEffect } from 'react';
import { Sparkles, Check, ArrowRight, Activity } from 'lucide-react';

interface StepData {
  title: string;
  badge: string;
  expression: string;
  detail: string;
  status: string;
}

const PIPELINE_STEPS: StepData[] = [
  {
    title: '1. Target Equation',
    badge: 'Problem Formulation',
    expression: 'x⁴ - 32 = 0',
    detail: 'Continuous polynomial function f(x) over ℝ',
    status: 'Nonlinear Root Search',
  },
  {
    title: '2. Intermediate Value Theorem',
    badge: 'Sign Bracket Search',
    expression: 'f(2) = -16 < 0  •  f(3) = +49 > 0',
    detail: 'Opposite signs guarantee at least one real root in [2, 3]',
    status: 'Bracket Found: [2, 3]',
  },
  {
    title: '3. Numerical Iteration',
    badge: 'False Position Chord',
    expression: 'x₁ = 2.2462  →  x₂ = 2.3681',
    detail: 'Linear interpolation replaces interval with precision secant',
    status: 'Iterating Chord...',
  },
  {
    title: '4. Error Criterion',
    badge: 'Convergence Check',
    expression: '|f(xₖ)| = 0.00008 < 10⁻⁴',
    detail: 'Tolerance satisfied in 3 steps with zero oscillation',
    status: '✓ Converged',
  },
  {
    title: '5. Deterministic Solution',
    badge: 'Canonical Result',
    expression: 'x* ≈ 2.3784',
    detail: 'Verified deterministic engineering root to 4 decimal places',
    status: 'Solution Complete',
  },
];

export const HeroMathAnimation: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    // Subtle cycle every 3.6s
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % PIPELINE_STEPS.length);
    }, 3600);
    return () => clearInterval(timer);
  }, []);

  const current = PIPELINE_STEPS[activeStep];

  return (
    <div className="w-full bg-gradient-to-br from-bg-surface via-lavender-subtle/40 to-bg-surface dark:from-bg-darkSurface dark:via-bg-darkCard dark:to-bg-darkSurface border border-border-soft dark:border-border-dark rounded-me-xl p-5 sm:p-6 shadow-card space-y-5 transition-calm">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border-soft dark:border-border-dark pb-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-me bg-lavender-light dark:bg-bg-darkAccent text-lavender-deep dark:text-lavender-accent flex items-center justify-center">
            <Activity className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-charcoal dark:text-charcoal-light uppercase tracking-wider">
            Deterministic Engine in Action
          </span>
        </div>
        <span className="text-[11px] font-mono text-lavender-deep dark:text-lavender-accent bg-lavender-light/60 dark:bg-bg-darkAccent px-2.5 py-0.5 rounded-full border border-lavender-soft/40 dark:border-border-dark">
          {current.badge}
        </span>
      </div>

      {/* Main Visual Display: Coordinate Curve + Pipeline Step */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
        {/* Step display (3 cols) */}
        <div className="md:col-span-3 space-y-3">
          <div className="text-xs font-medium text-charcoal-muted dark:text-charcoal-subtle">
            {current.title}
          </div>

          <div className="p-3.5 sm:p-4 rounded-me-lg bg-bg-primary/80 dark:bg-bg-darkDeep/60 border border-border-soft dark:border-border-dark/80 font-mono text-base sm:text-lg text-charcoal dark:text-charcoal-light flex items-center justify-between shadow-subtle min-h-[58px]">
            <span className="font-semibold tracking-wide text-lavender-deep dark:text-lavender-accent">
              {current.expression}
            </span>
            <span
              className={`text-xs px-2 py-0.5 rounded font-sans font-medium transition-colors ${
                current.status.includes('Converged') || current.status.includes('Complete')
                  ? 'bg-status-success-bg dark:bg-[#1A2E20] text-status-success dark:text-[#76B885] border border-status-success/30'
                  : 'bg-lavender-light dark:bg-bg-darkAccent text-lavender-deep dark:text-lavender-soft border border-lavender-soft/40 dark:border-border-dark'
              }`}
            >
              {current.status}
            </span>
          </div>

          <p className="text-xs text-charcoal-muted dark:text-charcoal-subtle leading-relaxed">
            {current.detail}
          </p>
        </div>

        {/* Real Coordinate Grid & Convergence Curve Plot (2 cols) */}
        <div className="md:col-span-2 relative h-36 w-full rounded-me bg-bg-primary/50 dark:bg-bg-darkDeep/80 border border-border-soft dark:border-border-dark overflow-hidden flex items-center justify-center p-2">
          {/* Subtle math grid */}
          <div className="absolute inset-0 bg-math-grid opacity-60" />

          {/* SVG mathematical curve f(x) = x^4 - 32 */}
          <svg
            viewBox="0 0 200 120"
            className="w-full h-full relative z-10 overflow-visible"
            aria-label="Root Convergence Curve"
          >
            {/* Coordinate axes */}
            <line x1="15" y1="85" x2="190" y2="85" stroke="currentColor" className="text-border-soft dark:text-border-dark" strokeWidth="1.5" />
            <line x1="40" y1="10" x2="40" y2="110" stroke="currentColor" className="text-border-soft dark:text-border-dark" strokeWidth="1.5" />
            
            {/* Axis labels */}
            <text x="185" y="98" fontSize="8" fill="currentColor" className="text-charcoal-muted dark:text-charcoal-subtle font-mono">x</text>
            <text x="32" y="18" fontSize="8" fill="currentColor" className="text-charcoal-muted dark:text-charcoal-subtle font-mono">y</text>
            <text x="75" y="96" fontSize="7" fill="currentColor" className="text-charcoal-muted dark:text-charcoal-subtle font-mono">a=2</text>
            <text x="160" y="96" fontSize="7" fill="currentColor" className="text-charcoal-muted dark:text-charcoal-subtle font-mono">b=3</text>

            {/* Smooth function curve f(x) passing through (x*, 85) */}
            <path
              d="M 45 105 Q 85 92 115 85 T 175 20"
              fill="none"
              stroke="#806B99"
              strokeWidth="2.5"
              className="dark:stroke-lavender-accent"
            />

            {/* Secant chord for False Position */}
            <line
              x1="75"
              y1="98"
              x2="165"
              y2="30"
              stroke="#C28236"
              strokeWidth="1.2"
              strokeDasharray="3 2"
              opacity="0.8"
            />

            {/* Bracket markers */}
            <circle cx="75" cy="98" r="3" fill="#C35652" />
            <circle cx="165" cy="30" r="3" fill="#4E7B58" />

            {/* Root point indicator at x* ≈ 115 */}
            <circle
              cx="115"
              cy="85"
              r={activeStep >= 3 ? '4.5' : '3.5'}
              fill="#806B99"
              className="dark:fill-lavender-accent transition-all duration-300"
            />
            
            {activeStep >= 3 && (
              <text
                x="110"
                y="75"
                fontSize="8"
                fontWeight="bold"
                fill="#4E7B58"
                className="font-mono animate-fadeIn"
              >
                x* ≈ 2.378
              </text>
            )}
          </svg>
        </div>
      </div>

      {/* Interactive Step Navigator Pills */}
      <div className="flex items-center justify-between gap-1.5 pt-1 overflow-x-auto">
        {PIPELINE_STEPS.map((step, idx) => {
          const isSelected = activeStep === idx;
          return (
            <button
              key={idx}
              onClick={() => setActiveStep(idx)}
              className={`flex-1 min-w-[70px] py-1.5 px-2 rounded-me text-[11px] font-medium transition-calm text-center btn-press border ${
                isSelected
                  ? 'bg-lavender-deep text-white dark:bg-lavender-deep border-lavender-deep shadow-subtle'
                  : 'bg-bg-primary/80 dark:bg-bg-darkCard text-charcoal-muted dark:text-charcoal-subtle border-border-soft dark:border-border-dark hover:border-lavender-soft'
              }`}
            >
              Step {idx + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
};
