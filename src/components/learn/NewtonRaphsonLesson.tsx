import React from 'react';
import { PageId } from '../../types/index.ts';
import { getNewtonRaphsonLessonContent } from '../../data/newtonRaphsonLessonContent.ts';
import { Card } from '../ui/Card.tsx';
import { Button } from '../ui/Button.tsx';
import { Badge } from '../ui/Badge.tsx';
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

interface NewtonRaphsonLessonProps {
  onNavigate: (
    page: PageId,
    options?: { action?: 'none' | 'myself' | 'hints' | 'solution'; method?: string }
  ) => void;
  onBackToCurriculum?: () => void;
}

export const NewtonRaphsonLesson: React.FC<NewtonRaphsonLessonProps> = ({
  onNavigate,
  onBackToCurriculum,
}) => {
  const content = getNewtonRaphsonLessonContent();
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
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-charcoal-muted dark:text-[#B0A7C2] border-b border-border-soft dark:border-[#382952] pb-3">
          <div className="flex items-center gap-2">
            {onBackToCurriculum ? (
              <button
                onClick={onBackToCurriculum}
                className="flex items-center gap-1 text-lavender-deep dark:text-[#C5B8EB] hover:text-lavender-deep/80 dark:hover:text-[#DDD4F5] font-medium transition-calm"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Curriculum Overview</span>
              </button>
            ) : null}
            {onBackToCurriculum && <span>/</span>}
            <span>Unit 01</span>
            <span>/</span>
            <span className="font-semibold text-charcoal dark:text-[#F3F0FA]">{content.methodTitle}</span>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="lavender">Unit 01</Badge>
            <Badge variant="neutral">University-focused</Badge>
          </div>
        </div>

        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-semibold tracking-tight text-charcoal dark:text-[#F3F0FA]">
            {content.methodTitle}
          </h1>
          <p className="text-base text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed max-w-2xl">
            {content.unitTitle}. An introduction to tangent-line root-finding for undergraduate engineering mathematics.
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
          <div className="p-3 bg-bg-primary/50 dark:bg-[#251A38] rounded border border-border-soft/60 dark:border-[#382952] font-mono text-base font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionA.rootDefinition.statement}
          </div>
          <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
            {sectionA.rootDefinition.explanation}
          </p>
        </div>

        {/* Equation Types */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <Card variant="surface" className="space-y-2 dark:bg-[#1E1430] dark:border-[#382952]">
            <div className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider">
              {sectionA.equationTypes.algebraic.name}
            </div>
            <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
              {sectionA.equationTypes.algebraic.description}
            </p>
            <div className="space-y-1 pt-1 font-mono text-xs text-charcoal dark:text-[#F3F0FA]">
              {sectionA.equationTypes.algebraic.examples.map((ex, i) => (
                <div key={i} className="p-1.5 bg-bg-primary/50 dark:bg-[#251A38] rounded border border-border-soft/60 dark:border-[#382952]">
                  {ex}
                </div>
              ))}
            </div>
          </Card>

          <Card variant="surface" className="space-y-2 dark:bg-[#1E1430] dark:border-[#382952]">
            <div className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider">
              {sectionA.equationTypes.transcendental.name}
            </div>
            <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
              {sectionA.equationTypes.transcendental.description}
            </p>
            <div className="space-y-1 pt-1 font-mono text-xs text-charcoal dark:text-[#F3F0FA]">
              {sectionA.equationTypes.transcendental.examples.map((ex, i) => (
                <div key={i} className="p-1.5 bg-bg-primary/50 dark:bg-[#251A38] rounded border border-border-soft/60 dark:border-[#382952]">
                  {ex}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Section B: The Newton-Raphson idea */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part B
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionB.title}
          </h2>
        </div>

        <Card variant="cream" className="space-y-3 dark:bg-[#1E1430] dark:border-[#382952]">
          <p className="text-sm text-charcoal dark:text-[#F3F0FA] leading-relaxed">
            {sectionB.concept}
          </p>
          <div className="p-3 bg-bg-surface dark:bg-[#251A38] rounded-me border border-border-soft dark:border-[#382952] text-xs text-charcoal dark:text-[#F3F0FA] space-y-1.5">
            <span className="font-semibold block">Geometric Tangent Line Construction:</span>
            <p className="text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">{sectionB.tangentIdea}</p>
            <p className="text-charcoal dark:text-[#F3F0FA] leading-relaxed pt-1">{sectionB.geometricPrinciple}</p>
          </div>
        </Card>
      </section>

      {/* Section C: Initial approximation */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part C
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionC.title}
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card variant="surface" className="space-y-2 dark:bg-[#1E1430] dark:border-[#382952]">
            <span className="text-xs font-semibold text-charcoal dark:text-[#F3F0FA] uppercase tracking-wider">
              1. Sign Change Bracket
            </span>
            <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
              {sectionC.initialBracketRequirement}
            </p>
          </Card>

          <Card variant="surface" className="space-y-2 dark:bg-[#1E1430] dark:border-[#382952]">
            <span className="text-xs font-semibold text-charcoal dark:text-[#F3F0FA] uppercase tracking-wider">
              2. Endpoint Magnitude Rule
            </span>
            <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
              {sectionC.x0SelectionRule}
            </p>
            <div className="font-mono text-sm font-semibold text-lavender-deep dark:text-[#C5B8EB] pt-0.5">
              {sectionC.mathCriterion}
            </div>
          </Card>
        </div>

        <div className="p-3.5 bg-bg-primary/50 dark:bg-[#251A38] rounded-me border border-border-soft dark:border-[#382952] text-xs text-charcoal dark:text-[#F3F0FA] leading-relaxed flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-status-success dark:text-emerald-400 shrink-0 mt-0.5" />
          <span>{sectionC.consequence}</span>
        </div>
      </section>

      {/* Section D: The Newton-Raphson formula */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part D
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionD.title}
          </h2>
        </div>

        <div className="p-4 rounded-me bg-bg-cream/40 dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] space-y-2">
          <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
            {sectionD.tangentDerivation}
          </p>
          <div className="p-3 bg-bg-surface dark:bg-[#251A38] rounded border border-border-soft dark:border-[#382952] font-mono text-base font-bold text-lavender-deep dark:text-[#C5B8EB] text-center">
            {sectionD.formula}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          {sectionD.steps.map((st) => (
            <div
              key={st.stepNumber}
              className="p-3 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] flex items-start gap-3 text-xs"
            >
              <span className="w-6 h-6 rounded-full bg-lavender-light dark:bg-[#34244E] text-lavender-deep dark:text-[#C5B8EB] font-mono font-bold flex items-center justify-center shrink-0">
                {st.stepNumber}
              </span>
              <div className="space-y-0.5">
                <span className="font-semibold text-charcoal dark:text-[#F3F0FA] block">{st.label}</span>
                <p className="text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">{st.instruction}</p>
                {st.mathFormula && (
                  <span className="font-mono text-lavender-deep dark:text-[#C5B8EB] font-semibold block pt-0.5">
                    {st.mathFormula}
                  </span>
                )}
              </div>
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

        <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          {sectionE.summary}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {sectionE.phases.map((ph, idx) => (
            <Card key={idx} variant="surface" className="space-y-1.5 text-xs dark:bg-[#1E1430] dark:border-[#382952]">
              <span className="font-semibold text-charcoal dark:text-[#F3F0FA]">{ph.phase}</span>
              <div className="font-mono text-[11px] text-lavender-deep dark:text-[#C5B8EB]">{ph.action}</div>
              <p className="text-charcoal-muted dark:text-[#B0A7C2] text-[11px] leading-relaxed pt-1">{ph.purpose}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* Section F: Iteration table */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part F
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionF.title}
          </h2>
        </div>

        <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          {sectionF.description}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sectionF.columns.map((col, idx) => (
            <div
              key={idx}
              className="p-3 bg-bg-surface dark:bg-[#1E1430] rounded-me border border-border-soft dark:border-[#382952] space-y-1 text-xs"
            >
              <div className="font-mono font-semibold text-charcoal dark:text-[#F3F0FA]">{col.header}</div>
              <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">{col.description}</p>
              <p className="text-[11px] text-lavender-deep dark:text-[#C5B8EB] pt-1">{col.roleInProcedure}</p>
            </div>
          ))}
        </div>

        <div className="p-3.5 bg-bg-primary/50 dark:bg-[#251A38] rounded-me border border-border-soft dark:border-[#382952] text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
          <strong className="text-charcoal dark:text-[#F3F0FA]">Tracing Tip:</strong> {sectionF.tracingGuide}
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

        <Card variant="cream" className="space-y-4 dark:bg-[#1E1430] dark:border-[#382952]">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border-soft dark:border-[#382952]">
            <div className="space-y-0.5">
              <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2] uppercase tracking-wider block">Course Example</span>
              <strong className="font-mono text-sm sm:text-base text-charcoal dark:text-[#F3F0FA]">
                {sectionG.equation}
              </strong>
            </div>
            <div className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
              Interval: <strong className="text-charcoal dark:text-[#F3F0FA]">[{sectionG.interval[0]}, {sectionG.interval[1]}]</strong> • x₀ ={' '}
              <strong className="text-charcoal dark:text-[#F3F0FA]">{sectionG.initialX0}</strong> • Target: <strong className="text-charcoal dark:text-[#F3F0FA]">{sectionG.requiredAccuracy}</strong>
            </div>
          </div>

          {/* Initial bracket check */}
          <div className="p-3 bg-bg-surface dark:bg-[#251A38] rounded-me border border-border-soft dark:border-[#382952] space-y-1.5 text-xs">
            <span className="font-semibold text-charcoal dark:text-[#F3F0FA] block">Derivative & Initial x₀ Check:</span>
            <div className="font-mono text-[11px] space-y-0.5 text-charcoal dark:text-[#F3F0FA]">
              <div className="text-lavender-deep dark:text-[#C5B8EB] font-semibold">{sectionG.derivative}</div>
              <div>{sectionG.initialCheck.f_a_calc}</div>
              <div>{sectionG.initialCheck.f_b_calc}</div>
            </div>
            <p className="text-charcoal-muted dark:text-[#B0A7C2] text-[11px] pt-1">
              {sectionG.initialCheck.conclusion}
            </p>
          </div>

          {/* Iteration table preview */}
          {sectionG.solverResult.success && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-charcoal dark:text-[#F3F0FA] block">
                Deterministic Iterations ({sectionG.solverResult.iterations_used} steps to convergence):
              </span>
              <div className="overflow-x-auto border border-border-soft dark:border-[#382952] rounded-me bg-bg-surface dark:bg-[#1E1430]">
                <table className="w-full text-xs text-left text-charcoal dark:text-[#F3F0FA] font-mono">
                  <thead className="bg-bg-primary/80 dark:bg-[#251A38] border-b border-border-soft dark:border-[#382952] text-[10px] font-sans font-semibold text-charcoal-muted dark:text-[#B0A7C2] uppercase">
                    <tr>
                      <th className="px-3 py-2">n</th>
                      <th className="px-3 py-2">x_n</th>
                      <th className="px-3 py-2">f(x_n)</th>
                      <th className="px-3 py-2">f'(x_n)</th>
                      <th className="px-3 py-2 text-lavender-deep dark:text-[#C5B8EB]">x_(n+1)</th>
                      <th className="px-3 py-2">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-soft/60 dark:divide-[#382952] text-[11px]">
                    {sectionG.solverResult.iterations.map((iter) => (
                      <tr key={iter.n} className="hover:bg-bg-primary/30 dark:hover:bg-[#251A38]/50">
                        <td className="px-3 py-1.5 text-charcoal-muted dark:text-[#B0A7C2]">{iter.n}</td>
                        <td className="px-3 py-1.5">{iter.x_n.toFixed(4)}</td>
                        <td className="px-3 py-1.5">{iter.f_x.toFixed(4)}</td>
                        <td className="px-3 py-1.5">{iter.f_prime_x.toFixed(4)}</td>
                        <td className="px-3 py-1.5 text-lavender-deep dark:text-[#C5B8EB] font-semibold">{iter.x_next.toFixed(4)}</td>
                        <td className="px-3 py-1.5 text-charcoal-muted dark:text-[#B0A7C2]">{iter.step_difference.toFixed(4)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="p-3 bg-bg-surface dark:bg-[#251A38] rounded-me border border-border-soft dark:border-[#382952] text-xs space-y-1">
                <div className="font-semibold text-charcoal dark:text-[#F3F0FA]">
                  Approximate Root: <span className="font-mono text-lavender-deep dark:text-[#C5B8EB]">x ≈ {sectionG.approximateRoot}</span>
                </div>
                <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">{sectionG.solverResult.stopping_reason}</p>
              </div>
            </div>
          )}
        </Card>
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

        <Card variant="surface" className="space-y-3 text-xs dark:bg-[#1E1430] dark:border-[#382952]">
          <div className="p-3 bg-bg-cream/40 dark:bg-[#251A38] rounded-me border border-border-soft dark:border-[#382952]">
            <span className="font-semibold text-charcoal dark:text-[#F3F0FA] block">Stopping Rule:</span>
            <p className="text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed mt-1">{sectionH.stoppingRule}</p>
          </div>
          <p className="text-charcoal dark:text-[#F3F0FA] leading-relaxed">{sectionH.demonstratedExplanation}</p>
          <p className="text-charcoal-muted dark:text-[#B0A7C2] text-[11px] italic pt-1">{sectionH.methodSpecificClarification}</p>
        </Card>
      </section>

      {/* Section I: Common mistakes */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part I
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionI.title}
          </h2>
        </div>

        <div className="space-y-3">
          {sectionI.items.map((it) => (
            <div
              key={it.id}
              className="p-3.5 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] space-y-1.5 text-xs"
            >
              <div className="font-semibold text-status-error dark:text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Mistake: {it.mistake}</span>
              </div>
              <p className="text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed pl-5">
                <strong className="text-charcoal dark:text-[#F3F0FA]">Correction:</strong> {it.correction}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Section J: Try Newton-Raphson yourself */}
      <section className="space-y-4 pt-2">
        <div className="flex items-center gap-2 border-b border-border-soft/60 dark:border-[#382952] pb-2">
          <span className="text-xs font-semibold text-lavender-deep dark:text-[#C5B8EB] uppercase tracking-wider font-mono">
            Part J
          </span>
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">
            {sectionJ.title}
          </h2>
        </div>

        <Card variant="cream" className="space-y-4 text-center sm:text-left dark:bg-[#1E1430] dark:border-[#382952]">
          <p className="text-xs sm:text-sm text-charcoal dark:text-[#F3F0FA] leading-relaxed">
            {sectionJ.description}
          </p>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-1">
            <Button
              variant="primary"
              size="md"
              onClick={() => onNavigate('solve', { action: 'myself', method: 'newton-raphson' })}
              className="w-full sm:w-auto"
            >
              <span>{sectionJ.tryMyselfCTA.label}</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => onNavigate('practice')}
              className="w-full sm:w-auto"
            >
              <span>{sectionJ.practiceCTA.label}</span>
            </Button>
          </div>
        </Card>
      </section>
    </article>
  );
};
