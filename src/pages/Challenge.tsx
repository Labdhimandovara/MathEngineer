import React, { useState } from 'react';
import { PageId } from '../types/index.ts';
import { SprintChallenge } from '../components/challenge/SprintChallenge.tsx';
import { BattleMode } from '../components/challenge/BattleMode.tsx';
import { Badge } from '../components/ui/Badge.tsx';
import { Card } from '../components/ui/Card.tsx';
import { useProgress, getChallengeStats, getBattleStats } from '../services/progress/index.ts';
import { Zap, Swords, Flame, Trophy } from 'lucide-react';

interface ChallengeProps {
  onNavigate: (
    page: PageId,
    options?: { method?: string; action?: 'none' | 'myself' | 'hints' | 'solution' }
  ) => void;
}

export const Challenge: React.FC<ChallengeProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'sprint' | 'battle'>('sprint');

  const progressState = useProgress();
  const chalStats = getChallengeStats(progressState);
  const batStats = getBattleStats(progressState);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <section className="space-y-2 pt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Badge variant="cream">Competitive Arena</Badge>
            <Badge variant="neutral">Rapid Mechanics</Badge>
          </div>
          <h1 className="text-3xl sm:text-4xl font-display font-semibold tracking-tight text-charcoal dark:text-[#F3F0FA] mt-2">
            Challenge & Battle Hub
          </h1>
          <p className="text-charcoal-muted dark:text-[#B0A7C2] text-base max-w-2xl leading-relaxed">
            Test your calculation reflexes, formula recall, and error-spotting speed with timed sprints
            and simulated opponents.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center p-1 bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] rounded-me-lg self-start sm:self-center shrink-0">
          <button
            onClick={() => setActiveTab('sprint')}
            className={`btn-press px-3 py-1.5 rounded-me text-xs font-medium transition-calm flex items-center gap-1.5 ${
              activeTab === 'sprint'
                ? 'bg-amber-500/10 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-500/30 dark:border-amber-700/40 shadow-subtle'
                : 'text-charcoal-muted dark:text-[#B0A7C2] hover:text-charcoal dark:hover:text-[#F3F0FA]'
            }`}
          >
            <Zap className="w-3.5 h-3.5 fill-amber-500 text-amber-600 dark:text-amber-400" />
            <span>60s Sprint</span>
          </button>

          <button
            onClick={() => setActiveTab('battle')}
            className={`btn-press px-3 py-1.5 rounded-me text-xs font-medium transition-calm flex items-center gap-1.5 ${
              activeTab === 'battle'
                ? 'bg-lavender-light dark:bg-[#34244E] text-charcoal dark:text-[#F3F0FA] border border-lavender-dusty dark:border-[#523A78] shadow-subtle'
                : 'text-charcoal-muted dark:text-[#B0A7C2] hover:text-charcoal dark:hover:text-[#F3F0FA]'
            }`}
          >
            <Swords className="w-3.5 h-3.5 text-lavender-deep dark:text-[#C5B8EB]" />
            <span>MathBot Battle</span>
          </button>
        </div>
      </section>

      {/* Quick Summary Pill Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] flex items-center justify-between shadow-subtle">
          <span className="text-charcoal-muted dark:text-[#B0A7C2]">Sprint High Score</span>
          <span className="font-mono font-bold text-charcoal dark:text-[#F3F0FA]">{chalStats.bestScore}</span>
        </div>
        <div className="p-3 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] flex items-center justify-between shadow-subtle">
          <span className="text-charcoal-muted dark:text-[#B0A7C2]">Max Sprint Streak</span>
          <span className="font-mono font-bold text-status-warning dark:text-amber-400 flex items-center gap-1">
            <Flame className="w-3 h-3 fill-amber-500" />
            {chalStats.highestStreak}
          </span>
        </div>
        <div className="p-3 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] flex items-center justify-between shadow-subtle">
          <span className="text-charcoal-muted dark:text-[#B0A7C2]">Battles Won</span>
          <span className="font-mono font-bold text-status-success dark:text-emerald-400">{batStats.wins}</span>
        </div>
        <div className="p-3 rounded-me bg-bg-surface dark:bg-[#1E1430] border border-border-soft dark:border-[#382952] flex items-center justify-between shadow-subtle">
          <span className="text-charcoal-muted dark:text-[#B0A7C2]">Battle Win Rate</span>
          <span className="font-mono font-bold text-charcoal dark:text-[#F3F0FA]">
            {batStats.totalBattles > 0 ? `${batStats.winRate}%` : '—'}
          </span>
        </div>
      </div>

      {/* Main Mode View */}
      {activeTab === 'sprint' ? (
        <SprintChallenge
          onNavigate={onNavigate}
          onSwitchToBattle={() => setActiveTab('battle')}
        />
      ) : (
        <BattleMode
          onNavigate={onNavigate}
          onSwitchToSprint={() => setActiveTab('sprint')}
        />
      )}
    </div>
  );
};
