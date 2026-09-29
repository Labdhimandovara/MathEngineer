import React, { useMemo } from 'react';
import { LearningAttempt } from '../../types/learning.ts';
import { AdaptiveState } from '../../services/adaptive/adaptiveTypes.ts';
import { Card } from '../ui/Card.tsx';
import { Badge } from '../ui/Badge.tsx';
import {
  TrendingUp,
  BarChart3,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

interface LearningAnalyticsChartsProps {
  attempts: LearningAttempt[];
  adaptiveStates: Record<string, any>;
}

export function formatAdaptiveState(state: unknown): string {
  if (typeof state === 'string') {
    return state.replace(/-/g, ' ');
  }
  if (state && typeof state === 'object' && 'state' in (state as any)) {
    const inner = (state as any).state;
    if (typeof inner === 'string') return inner.replace(/-/g, ' ');
  }
  return 'not started';
}

export const LearningAnalyticsCharts: React.FC<LearningAnalyticsChartsProps> = ({
  attempts,
  adaptiveStates,
}) => {
  // 1. Group completed attempts by date (YYYY-MM-DD)
  const dateAggregates = useMemo(() => {
    const map = new Map<string, { date: string; attempts: number; correct: number }>();

    for (const att of attempts) {
      if (!att.startedAt) continue;
      const d = new Date(att.startedAt);
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
        d.getDate()
      ).padStart(2, '0')}`;

      const existing = map.get(dateKey) || { date: dateKey, attempts: 0, correct: 0 };
      existing.attempts += 1;
      if (att.status === 'completed' && att.correct === true) {
        existing.correct += 1;
      }
      map.set(dateKey, existing);
    }

    return Array.from(map.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }, [attempts]);

  // 2. Aggregate performance per method
  const methodStats = useMemo(() => {
    const methods = ['bisection', 'false-position', 'newton-raphson'] as const;
    const stats: {
      method: string;
      label: string;
      total: number;
      correct: number;
      accuracy: number;
      state: AdaptiveState;
    }[] = [];

    const labelMap: Record<string, string> = {
      bisection: 'Bisection',
      'false-position': 'False Position',
      'newton-raphson': 'Newton-Raphson',
    };

    for (const m of methods) {
      const methodAttempts = attempts.filter((a) => a.method === m);
      const total = methodAttempts.length;
      if (total === 0) continue; // Only show topics for which data exists

      const correct = methodAttempts.filter(
        (a) => a.status === 'completed' && a.correct === true
      ).length;
      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;

      const topicState = adaptiveStates[m];
      const resolvedState: AdaptiveState =
        typeof topicState === 'string'
          ? (topicState as AdaptiveState)
          : (topicState && typeof topicState === 'object' && 'state' in topicState && typeof (topicState as any).state === 'string')
          ? (topicState as any).state
          : 'not-started';

      stats.push({
        method: m,
        label: labelMap[m],
        total,
        correct,
        accuracy,
        state: resolvedState,
      });
    }

    return stats;
  }, [attempts, adaptiveStates]);

  const totalCompleted = attempts.filter((a) => a.status === 'completed').length;
  const isSparse = attempts.length > 0 && attempts.length < 3;
  const isEmpty = attempts.length === 0;

  // Format short date: e.g. "Oct 12"
  const formatShortDate = (dateStr: string) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between border-b border-border-soft dark:border-[#382952] pb-2">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-lavender-deep dark:text-[#C5B8EB]" />
          <h2 className="text-xl font-semibold text-charcoal dark:text-[#F3F0FA]">Visual Learning Trends</h2>
        </div>
        <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
          Based on {attempts.length} genuine attempt{attempts.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Empty State when no attempts exist */}
      {isEmpty && (
        <Card variant="surface" className="p-8 text-center space-y-3 dark:bg-[#1E1430] dark:border-[#382952]">
          <div className="w-10 h-10 rounded-full bg-lavender-light dark:bg-[#34244E] text-lavender-deep dark:text-[#C5B8EB] flex items-center justify-center mx-auto">
            <TrendingUp className="w-5 h-5" />
          </div>
          <h3 className="text-base font-semibold text-charcoal dark:text-[#F3F0FA]">Learning Analytics</h3>
          <p className="text-sm text-charcoal-muted dark:text-[#B0A7C2] max-w-md mx-auto">
            Complete a few problems to see your learning trends. As you solve, your daily
            practice volume, accuracy trend, and method proficiency will be graphed here.
          </p>
        </Card>
      )}

      {/* Sparse State when only 1 or 2 attempts exist */}
      {isSparse && (
        <Card variant="surface" className="p-6 space-y-3 border-dashed dark:bg-[#1E1430] dark:border-[#382952]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-lavender-deep dark:text-[#C5B8EB]" />
            <h3 className="text-sm font-semibold text-charcoal dark:text-[#F3F0FA]">Initial Learning Data</h3>
            <Badge variant="cream">{attempts.length} attempt{attempts.length === 1 ? '' : 's'} recorded</Badge>
          </div>
          <p className="text-xs text-charcoal-muted dark:text-[#B0A7C2] leading-relaxed">
            You have recorded {attempts.length} attempt{attempts.length === 1 ? '' : 's'}. Continuous
            daily trendlines will appear once 3 or more attempts are recorded to prevent misleading early graphs.
          </p>
        </Card>
      )}

      {/* Real Charts when 3+ attempts exist */}
      {!isEmpty && !isSparse && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Chart A: Attempts Over Time */}
          <Card variant="surface" className="space-y-4 p-5 dark:bg-[#1E1430] dark:border-[#382952]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal dark:text-[#F3F0FA] flex items-center gap-1.5">
                  <Calendar className="w-4 h-4 text-lavender-deep dark:text-[#C5B8EB]" />
                  <span>Attempts Over Time</span>
                </h3>
                <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">Daily problem-solving activity</p>
              </div>
              <Badge variant="lavender">{dateAggregates.length} active day{dateAggregates.length === 1 ? '' : 's'}</Badge>
            </div>

            {/* SVG Line Chart: Attempts */}
            <div className="w-full h-44 pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 130">
                {/* Horizontal guide lines */}
                <line x1="30" y1="20" x2="390" y2="20" stroke="currentColor" className="text-border-soft/60 dark:text-[#382952]" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="65" x2="390" y2="65" stroke="currentColor" className="text-border-soft/60 dark:text-[#382952]" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="30" y1="110" x2="390" y2="110" stroke="currentColor" className="text-border-soft dark:text-[#4A3868]" strokeWidth="1" />

                {(() => {
                  const maxAttempts = Math.max(...dateAggregates.map((d) => d.attempts), 3);
                  const n = dateAggregates.length;
                  const stepX = n > 1 ? (390 - 30) / (n - 1) : 0;

                  const points = dateAggregates.map((d, i) => {
                    const x = n === 1 ? 210 : 30 + i * stepX;
                    const y = 110 - (d.attempts / maxAttempts) * 90;
                    return { x, y, data: d };
                  });

                  const pathD = points.reduce(
                    (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                    ''
                  );

                  return (
                    <>
                      {/* Line */}
                      <path d={pathD} fill="none" stroke="currentColor" className="text-lavender-deep dark:text-[#A798CE]" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {/* Dots and Labels */}
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="4.5" className="fill-bg-surface dark:fill-[#1E1430] stroke-lavender-deep dark:stroke-[#A798CE]" strokeWidth="2.5" />
                          {/* Value above dot */}
                          <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fontWeight="600" className="fill-charcoal dark:fill-[#F3F0FA]">
                            {p.data.attempts}
                          </text>
                          {/* Date below baseline */}
                          <text x={p.x} y="125" textAnchor="middle" fontSize="9" className="fill-charcoal-muted dark:fill-[#B0A7C2]">
                            {formatShortDate(p.data.date)}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </Card>

          {/* Chart B: Accuracy Over Time */}
          <Card variant="surface" className="space-y-4 p-5 dark:bg-[#1E1430] dark:border-[#382952]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-charcoal dark:text-[#F3F0FA] flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-status-success dark:text-emerald-400" />
                  <span>Accuracy Trend Over Time</span>
                </h3>
                <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">Percentage of correct solutions</p>
              </div>
              <Badge variant="cream">0% to 100%</Badge>
            </div>

            {/* SVG Line Chart: Accuracy */}
            <div className="w-full h-44 pt-2">
              <svg className="w-full h-full overflow-visible" viewBox="0 0 400 130">
                {/* Reference lines at 100%, 50%, 0% */}
                <line x1="30" y1="20" x2="390" y2="20" stroke="currentColor" className="text-border-soft/60 dark:text-[#382952]" strokeWidth="1" strokeDasharray="3 3" />
                <text x="25" y="23" textAnchor="end" fontSize="9" className="fill-charcoal-muted dark:fill-[#B0A7C2]">100%</text>

                <line x1="30" y1="65" x2="390" y2="65" stroke="currentColor" className="text-border-soft/60 dark:text-[#382952]" strokeWidth="1" strokeDasharray="3 3" />
                <text x="25" y="68" textAnchor="end" fontSize="9" className="fill-charcoal-muted dark:fill-[#B0A7C2]">50%</text>

                <line x1="30" y1="110" x2="390" y2="110" stroke="currentColor" className="text-border-soft dark:text-[#4A3868]" strokeWidth="1" />
                <text x="25" y="113" textAnchor="end" fontSize="9" className="fill-charcoal-muted dark:fill-[#B0A7C2]">0%</text>

                {(() => {
                  const n = dateAggregates.length;
                  const stepX = n > 1 ? (390 - 30) / (n - 1) : 0;

                  const points = dateAggregates.map((d, i) => {
                    const pct = d.attempts > 0 ? (d.correct / d.attempts) * 100 : 0;
                    const x = n === 1 ? 210 : 30 + i * stepX;
                    const y = 110 - (pct / 100) * 90;
                    return { x, y, pct: Math.round(pct), date: d.date };
                  });

                  const pathD = points.reduce(
                    (acc, p, idx) => (idx === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
                    ''
                  );

                  return (
                    <>
                      <path d={pathD} fill="none" stroke="currentColor" className="text-status-success dark:text-emerald-400" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      {points.map((p, idx) => (
                        <g key={idx}>
                          <circle cx={p.x} cy={p.y} r="4" className="fill-bg-surface dark:fill-[#1E1430] stroke-status-success dark:stroke-emerald-400" strokeWidth="2" />
                          <text x={p.x} y={p.y - 7} textAnchor="middle" fontSize="10" fontWeight="600" className="fill-status-success dark:fill-emerald-400">
                            {p.pct}%
                          </text>
                          <text x={p.x} y="125" textAnchor="middle" fontSize="9" className="fill-charcoal-muted dark:fill-[#B0A7C2]">
                            {formatShortDate(p.date)}
                          </text>
                        </g>
                      ))}
                    </>
                  );
                })()}
              </svg>
            </div>
          </Card>
        </div>
      )}

      {/* Chart C: Topic Performance (Bar Chart) — Only displayed for topics with data */}
      {methodStats.length > 0 && (
        <Card variant="surface" className="p-5 space-y-4 dark:bg-[#1E1430] dark:border-[#382952]">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-charcoal dark:text-[#F3F0FA] flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-lavender-deep dark:text-[#C5B8EB]" />
                <span>Method Accuracy & Activity Breakdown</span>
              </h3>
              <p className="text-[11px] text-charcoal-muted dark:text-[#B0A7C2]">
                Completed questions across active Numerical Techniques
              </p>
            </div>
            <span className="text-xs text-charcoal-muted dark:text-[#B0A7C2]">
              {methodStats.length} topic{methodStats.length === 1 ? '' : 's'} studied
            </span>
          </div>

          <div className="space-y-4 pt-2">
            {methodStats.map((item) => (
              <div key={item.method} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-charcoal dark:text-[#F3F0FA]">{item.label}</span>
                    <Badge variant="neutral" className="capitalize text-[10px]">
                      {formatAdaptiveState(item.state)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-charcoal-muted dark:text-[#B0A7C2] text-[11px]">
                    <span>
                      {item.correct} / {item.total} correct
                    </span>
                    <span className="font-mono font-bold text-charcoal dark:text-[#F3F0FA]">
                      {item.accuracy}%
                    </span>
                  </div>
                </div>

                {/* Accuracy progress bar */}
                <div className="w-full h-3 bg-bg-neutral dark:bg-[#251A38] rounded-full overflow-hidden flex">
                  <div
                    className="h-full bg-lavender-deep dark:bg-[#8E79BD] transition-all duration-500 rounded-full"
                    style={{ width: `${item.accuracy}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Chart D: Learning State Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {[
          { key: 'consistent', label: 'Consistent', count: Object.values(adaptiveStates).filter((s) => s === 'consistent').length, color: 'text-status-success dark:text-emerald-300 bg-status-success-bg dark:bg-emerald-950/40 border-status-success/30 dark:border-emerald-800/40' },
          { key: 'developing', label: 'Developing', count: Object.values(adaptiveStates).filter((s) => s === 'developing').length, color: 'text-lavender-deep dark:text-[#C5B8EB] bg-lavender-light dark:bg-[#34244E] border-lavender-dusty/40 dark:border-[#4B3B6E]' },
          { key: 'practicing', label: 'Practicing', count: Object.values(adaptiveStates).filter((s) => s === 'practicing').length, color: 'text-charcoal dark:text-[#F3F0FA] bg-bg-neutral dark:bg-[#251A38] border-border-soft dark:border-[#382952]' },
          { key: 'needs-review', label: 'Needs Review', count: Object.values(adaptiveStates).filter((s) => s === 'needs-review').length, color: 'text-amber-800 dark:text-amber-300 bg-amber-500/10 dark:bg-amber-950/40 border-amber-500/20 dark:border-amber-800/40' },
          { key: 'introduced', label: 'Introduced', count: Object.values(adaptiveStates).filter((s) => s === 'introduced').length, color: 'text-charcoal-muted dark:text-[#B0A7C2] bg-bg-surface dark:bg-[#1E1430] border-border-soft dark:border-[#382952]' },
          { key: 'not-started', label: 'Not Started', count: Object.values(adaptiveStates).filter((s) => s === 'not-started').length, color: 'text-charcoal-subtle dark:text-[#8E83A3] bg-bg-primary dark:bg-[#171024] border-border-soft/60 dark:border-[#382952]' },
        ].map((st) => (
          <div key={st.key} className={`p-2.5 rounded-me border text-center space-y-0.5 ${st.color}`}>
            <div className="text-lg font-bold font-mono">{st.count}</div>
            <div className="text-[10px] font-medium leading-tight">{st.label}</div>
          </div>
        ))}
      </div>
    </section>
  );
};
