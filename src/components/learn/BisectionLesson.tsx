import React from 'react';
import { PageId } from '../../types';
import { getBisectionLessonContent } from '../../data/bisectionLessonContent';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import {
  BookOpen,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  HelpCircle,
  Table as TableIcon,
  Compass,
  AlertTriangle,
} from 'lucide-react';

interface BisectionLessonProps {
  onNavigate: (
    page: PageId,
    options?: { action?: 'none' | 'myself' | 'hints' | 'solution' }
  ) => void;
  onBackToCurriculum?: () => void;
}

export const BisectionLesson: React.FC<BisectionLessonProps> = ({
  onNavigate,
  onBackToCurriculum,
}) => {
  const content = getBisectionLessonContent();
  const {
    sectionA,
    sectionB,
    sectionC,
    sectionD,
    sectionE,
    sectionF,
    sectionG,
    sectionH,
    sectionI,
    sectionJ,
  } = content;

  return (
    <article className="space-y-12 max-w-4xl mx-auto animate-fadeIn pb-12">
      {/* Breadcrumb & Navigation Header */}
      <header className="space-y-4 pt-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-charcoal-muted border-b border-border-soft pb-3">
          <div className="flex items-center gap-2">
            {onBackToCurriculum ? (
              <button
                onClick={onBackToCurriculum}
                className="flex items-center gap-1 text-lavender-deep dark:text-[#C5B8EB] hover:text-lavender-deep/80 font-medium transition-calm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Curriculum Overview</span>
              </button>
            ) : null}
            {onBackToCurriculum && <span>/</span>}
            <span>Unit 01</span>
            <span>/</span>
            <span className="font-semibold text-charcoal dark:text-[#F3F0FA]">Bisection Method</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="lavender">Unit 01</Badge>
            <Badge variant="neutral">University-focused</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-charcoal dark:text-[#F3F0FA]">
            {content.methodTitle}
          </h1>
          <p className="text-base text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed max-w-2xl">
            {content.unitTitle}. An introduction to iterative root-finding for undergraduate engineering mathematics.
          </p>
        </div>
      </header>

      {/* Section A: What are we trying to find? */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part A
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionA.title}
          </h2>
        </div>

        <p className="text-sm text-charcoal dark:text-[#F3F0FA] leading-relaxed">
          {sectionA.context}
        </p>

        {/* Root Definition Box */}
        <div className="p-4 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] space-y-2">
          <div className="text-xs font-semibold text-charcoal dark:text-[#F3F0FA] uppercase tracking-wider">
            Definition of a Root
          </div>
          <p className="text-sm text-charcoal dark:text-[#F3F0FA] leading-relaxed">
            {sectionA.rootDefinition.statement}
          </p>
          <div className="py-1">
            <span className="font-mono text-base bg-bg-cream/60 dark:bg-[#282033] px-3 py-1 rounded border border-border-soft dark:border-[#382952] inline-block text-lavender-deep dark:text-[#C5B8EB] font-semibold">
              {sectionA.rootDefinition.notation}
            </span>
          </div>
          <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
            {sectionA.rootDefinition.explanation}
          </p>
        </div>

        {/* Equation Types */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          <div className="p-4 rounded-me bg-bg-primary/50 dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] space-y-2">
            <h3 className="text-sm font-semibold text-charcoal dark:text-[#F3F0FA]">
              {sectionA.equationTypes.algebraic.name}
            </h3>
            <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
              {sectionA.equationTypes.algebraic.description}
            </p>
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-medium text-charcoal-subtle dark:text-[#9A92A0] uppercase">Examples:</span>
              {sectionA.equationTypes.algebraic.examples.map((ex) => (
                <div key={ex} className="font-mono text-xs text-charcoal dark:text-[#F3F0FA] bg-bg-surface dark:bg-[#251A38] px-2 py-1 rounded border border-border-soft/60 dark:border-[#382952]">
                  {ex}
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-me bg-bg-primary/50 dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] space-y-2">
            <h3 className="text-sm font-semibold text-charcoal dark:text-[#F3F0FA]">
              {sectionA.equationTypes.transcendental.name}
            </h3>
            <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
              {sectionA.equationTypes.transcendental.description}
            </p>
            <div className="space-y-1 pt-1">
              <span className="text-[11px] font-medium text-charcoal-subtle dark:text-[#9A92A0] uppercase">Examples:</span>
              {sectionA.equationTypes.transcendental.examples.map((ex) => (
                <div key={ex} className="font-mono text-xs text-charcoal dark:text-[#F3F0FA] bg-bg-surface dark:bg-[#251A38] px-2 py-1 rounded border border-border-soft/60 dark:border-[#382952]">
                  {ex}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Section B: The Bisection idea */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part B
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionB.title}
          </h2>
        </div>

        <p className="text-sm text-charcoal dark:text-[#F3F0FA] leading-relaxed">
          {sectionB.concept}
        </p>

        <p className="text-sm text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          {sectionB.halvingExplanation}
        </p>

        <div className="p-4 rounded-me bg-bg-cream/40 dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] text-xs text-charcoal dark:text-[#F3F0FA] leading-relaxed">
          <strong className="text-lavender-deep dark:text-[#C5B8EB]">Core Principle:</strong> {sectionB.trappingPrinciple}
        </div>
      </section>

      {/* Section C: When can we use the initial interval? */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part C
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionC.title}
          </h2>
        </div>

        <p className="text-sm text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          Before applying the Bisection procedure, the search interval{' '}
          <span className="font-mono font-medium text-charcoal dark:text-[#F3F0FA]">[a, b]</span> must satisfy the following initial conditions:
        </p>

        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3.5 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952]">
            <span className="font-mono text-xs font-bold text-lavender-deep dark:text-[#C5B8EB] bg-lavender-soft/40 dark:bg-[#34244E] px-2 py-0.5 rounded shrink-0 mt-0.5">
              1
            </span>
            <div className="space-y-1 text-xs">
              <strong className="text-charcoal dark:text-[#F3F0FA] block">Continuity Condition</strong>
              <p className="text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
                {sectionC.continuityCondition}
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952]">
            <span className="font-mono text-xs font-bold text-lavender-deep dark:text-[#C5B8EB] bg-lavender-soft/40 dark:bg-[#34244E] px-2 py-0.5 rounded shrink-0 mt-0.5">
              2
            </span>
            <div className="space-y-1 text-xs">
              <strong className="text-charcoal dark:text-[#F3F0FA] block">Opposite Sign Condition</strong>
              <p className="text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
                {sectionC.oppositeSignCondition}
              </p>
              <div className="py-1">
                <span className="font-mono font-bold text-charcoal dark:text-[#F3F0FA] bg-bg-primary dark:bg-[#251A38] px-2 py-0.5 rounded border border-border-soft dark:border-[#382952]">
                  {sectionC.signNotation}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-me bg-status-success-bg/40 dark:bg-[#122A1C]/50 border border-status-success/30 dark:border-emerald-800/40 text-xs text-charcoal dark:text-[#F3F0FA] leading-relaxed">
          <strong className="text-status-success dark:text-emerald-400">Result:</strong> {sectionC.consequence}
        </div>
      </section>

      {/* Section D: The Bisection procedure */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part D
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionD.title}
          </h2>
        </div>

        <div className="space-y-2.5">
          {sectionD.steps.map((step) => (
            <div
              key={step.stepNumber}
              className="p-3.5 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex items-start gap-3">
                <span className="font-mono text-xs font-bold text-lavender-deep dark:text-[#C5B8EB] bg-lavender-soft/40 dark:bg-[#34244E] px-2 py-0.5 rounded shrink-0">
                  {step.stepNumber}
                </span>
                <div className="space-y-0.5">
                  <h4 className="text-xs font-semibold text-charcoal dark:text-[#F3F0FA]">
                    {step.label}
                  </h4>
                  <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
                    {step.instruction}
                  </p>
                </div>
              </div>

              {step.mathFormula && (
                <div className="sm:text-right shrink-0 pl-8 sm:pl-0">
                  <span className="font-mono text-xs font-semibold text-charcoal dark:text-[#F3F0FA] bg-bg-cream/60 dark:bg-[#282033] px-2.5 py-1 rounded border border-border-soft/70 dark:border-[#382952]">
                    {step.mathFormula}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Section E: Understand one iteration */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part E
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionE.title}
          </h2>
        </div>

        <p className="text-sm text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          {sectionE.summary}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {sectionE.phases.map((ph, idx) => (
            <div
              key={idx}
              className="p-4 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] space-y-1.5"
            >
              <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] block font-mono">
                {ph.phase}
              </span>
              <p className="text-xs font-medium text-charcoal dark:text-[#F3F0FA]">
                {ph.action}
              </p>
              <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
                {ph.purpose}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section F: Understand the iteration table */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part F
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionF.title}
          </h2>
        </div>

        <p className="text-sm text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          {sectionF.description}
        </p>

        <div className="overflow-x-auto border border-border-soft dark:border-[#382952] rounded-me bg-bg-surface dark:bg-[#1E1430]">
          <table className="w-full text-xs text-left text-charcoal dark:text-[#F3F0FA]">
            <thead className="bg-bg-primary/80 dark:bg-[#251A38] border-b border-border-soft dark:border-[#382952] text-[11px] font-semibold text-charcoal-muted dark:text-[#B0A7C2] uppercase">
              <tr>
                <th className="px-3.5 py-2.5 font-mono">Column Header</th>
                <th className="px-3.5 py-2.5">Description</th>
                <th className="px-3.5 py-2.5">Role in Bisection</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-soft/60 dark:divide-[#382952]">
              {sectionF.columns.map((col) => (
                <tr key={col.header} className="hover:bg-bg-primary/30 dark:hover:bg-[#251A38]/50 transition-calm">
                  <td className="px-3.5 py-2.5 font-mono font-semibold text-lavender-deep dark:text-[#C5B8EB]">
                    {col.header}
                  </td>
                  <td className="px-3.5 py-2.5 text-charcoal dark:text-[#F3F0FA]">
                    {col.description}
                  </td>
                  <td className="px-3.5 py-2.5 text-charcoal-muted dark:text-[#B0A7C2] text-[11px]">
                    {col.roleInProcedure}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3.5 rounded-me bg-bg-cream/40 dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          <strong className="text-charcoal dark:text-[#F3F0FA]">Tracing Guide:</strong> {sectionF.tracingGuide}
        </div>
      </section>

      {/* Section G: Worked example */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part G
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionG.title}
          </h2>
        </div>

        {/* Problem Header */}
        <div className="p-4 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-mono text-base font-semibold text-charcoal dark:text-[#F3F0FA]">
              {sectionG.equation}
            </div>
            <Badge variant="lavender">Course Worked Example</Badge>
          </div>
          <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
            Initial interval: <strong className="text-charcoal dark:text-[#F3F0FA] font-mono">[{sectionG.interval[0]}, {sectionG.interval[1]}]</strong> • Target accuracy: <strong className="text-charcoal dark:text-[#F3F0FA]">{sectionG.requiredAccuracy}</strong>
          </p>
        </div>

        {/* Initial Check */}
        <div className="p-3.5 rounded-me bg-bg-primary/50 dark:bg-[#251A38] border border-border-soft dark:border-[#382952] space-y-1.5 text-xs">
          <span className="font-semibold text-charcoal dark:text-[#F3F0FA] block">Initial Sign Verification:</span>
          <div className="font-mono space-y-0.5 text-charcoal-muted dark:text-[#B0A7C2]">
            <div>• {sectionG.initialCheck.f_a_calc}</div>
            <div>• {sectionG.initialCheck.f_b_calc}</div>
          </div>
          <p className="text-charcoal dark:text-[#F3F0FA] text-[11px] pt-1">
            {sectionG.initialCheck.conclusion}
          </p>
        </div>

        {/* Iteration Table (Computed dynamically from deterministic solver) */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-charcoal-muted dark:text-[#B0A7C2]">
            <span>Iteration Table (Generated by deterministic Bisection engine)</span>
            <span className="font-mono text-[11px]">{sectionG.solverResult.iterations.length} iterations</span>
          </div>

          <div className="overflow-x-auto border border-border-soft dark:border-[#382952] rounded-me bg-bg-surface dark:bg-[#1E1430]">
            <table className="w-full text-xs text-left text-charcoal dark:text-[#F3F0FA]">
              <thead className="bg-bg-primary/80 dark:bg-[#251A38] border-b border-border-soft dark:border-[#382952] text-[11px] font-semibold text-charcoal-muted dark:text-[#B0A7C2] uppercase">
                <tr>
                  <th className="px-3 py-2.5">n</th>
                  <th className="px-3 py-2.5">a_n</th>
                  <th className="px-3 py-2.5">b_n</th>
                  <th className="px-3 py-2.5">x_(n+1) = (a_n + b_n)/2</th>
                  <th className="px-3 py-2.5">f(x_(n+1))</th>
                  <th className="px-3 py-2.5">Next Interval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft/60 dark:divide-[#382952] font-mono">
                {sectionG.solverResult.iterations.map((iter) => (
                  <tr
                    key={iter.n}
                    className={`hover:bg-bg-primary/40 dark:hover:bg-[#251A38]/50 transition-calm ${
                      iter.is_stopping_met ? 'bg-status-success-bg/40 dark:bg-emerald-950/40 font-semibold text-status-success dark:text-emerald-300' : ''
                    }`}
                  >
                    <td className="px-3 py-2 text-charcoal-muted dark:text-[#B0A7C2]">{iter.n}</td>
                    <td className="px-3 py-2">{iter.a.toFixed(4)}</td>
                    <td className="px-3 py-2">{iter.b.toFixed(4)}</td>
                    <td className="px-3 py-2 text-lavender-deep dark:text-[#C5B8EB] font-semibold">
                      {iter.midpoint.toFixed(4)}
                    </td>
                    <td className="px-3 py-2">
                      {iter.f_midpoint >= 0
                        ? ` ${iter.f_midpoint.toFixed(4)}`
                        : iter.f_midpoint.toFixed(4)}
                    </td>
                    <td className="px-3 py-2 text-charcoal-muted dark:text-[#B0A7C2]">
                      [{iter.next_interval[0].toFixed(4)}, {iter.next_interval[1].toFixed(4)}]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Result Callout */}
        <div className="p-4 rounded-me bg-bg-cream/40 dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div>
            <span className="text-charcoal-muted dark:text-[#B0A7C2]">Approximate Root:</span>{' '}
            <strong className="text-base text-charcoal dark:text-[#F3F0FA] font-mono ml-1">
              x ≈ {sectionG.approximateRoot}
            </strong>
            <span className="text-charcoal-muted dark:text-[#B0A7C2] ml-2">
              (correct to {sectionG.requiredAccuracy})
            </span>
          </div>
          <div className="text-charcoal-muted dark:text-[#B0A7C2]">
            Iterations used: <strong className="text-charcoal dark:text-[#F3F0FA]">{sectionG.solverResult.iterations_used}</strong>
          </div>
        </div>
      </section>

      {/* Section H: When do we stop? */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part H
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionH.title}
          </h2>
        </div>

        <p className="text-sm text-charcoal dark:text-[#F3F0FA] leading-relaxed">
          {sectionH.stoppingRule}
        </p>

        <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          {sectionH.demonstratedExplanation}
        </p>

        <div className="p-3.5 rounded-me bg-bg-primary/60 dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          <strong className="text-charcoal dark:text-[#F3F0FA]">Course Context:</strong> {sectionH.methodSpecificClarification}
        </div>
      </section>

      {/* Section I: Common mistakes / things to check */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
              Part I
            </span>
            <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
              {sectionI.title}
            </h2>
          </div>
          <Badge variant="cream">{sectionI.category}</Badge>
        </div>

        <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          {sectionI.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {sectionI.items.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] space-y-1.5"
            >
              <div className="flex items-center gap-1.5 text-status-warning dark:text-amber-400 text-xs font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{item.mistake}</span>
              </div>
              <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
                {item.correction}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section J: Try Bisection yourself */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part J
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionJ.title}
          </h2>
        </div>

        <p className="text-sm text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          {sectionJ.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
          {/* Action 1: Solve With Me */}
          <div className="p-5 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-lavender-dusty/80 dark:border-[#4B3B6E] hover:border-lavender-deep dark:hover:border-[#7A61BA] transition-calm space-y-3 flex flex-col justify-between shadow-subtle">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider">
                Guided Step Experience
              </span>
              <h3 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA]">
                {sectionJ.tryMyselfCTA.label}
              </h3>
              <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
                {sectionJ.tryMyselfCTA.description}
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('solve', { action: 'myself' })}
              className="w-full justify-center"
            >
              <span>{sectionJ.tryMyselfCTA.label}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Action 2: Practice Problems */}
          <div className="p-5 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] hover:border-border-soft/80 dark:hover:border-[#4B3B6E] transition-calm space-y-3 flex flex-col justify-between">
            <div className="space-y-1.5">
              <span className="text-xs font-semibold text-charcoal-muted dark:text-[#B0A7C2] uppercase tracking-wider">
                Question Bank
              </span>
              <h3 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA]">
                {sectionJ.practiceCTA.label}
              </h3>
              <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
                {sectionJ.practiceCTA.description}
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('practice')}
              className="w-full justify-center"
            >
              <span>{sectionJ.practiceCTA.label}</span>
              <Compass className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </section>
    </article>
  );
};
