/**
 * Calculations & Dynamic Metrics from Student Progress State
 * 
 * Provides truthful, derived statistics with zero hardcoded or fake numbers.
 */

import { StudentProgressState, MethodId, MethodProgress } from './progressTypes.ts';

export function getActiveStreak(state: StudentProgressState): number {
  if (!state.lastActiveDate || state.currentStreakDays === 0) {
    return 0;
  }

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const today = `${year}-${month}-${day}`;

  const d = new Date();
  d.setDate(d.getDate() - 1);
  const yYear = d.getFullYear();
  const yMonth = String(d.getMonth() + 1).padStart(2, '0');
  const yDay = String(d.getDate()).padStart(2, '0');
  const yesterday = `${yYear}-${yMonth}-${yDay}`;

  if (state.lastActiveDate === today || state.lastActiveDate === yesterday) {
    return state.currentStreakDays;
  }

  // Streak expired if not active today or yesterday
  return 0;
}

export function getTotalAttempted(state: StudentProgressState): number {
  return state.attempts.length;
}

export function getTotalSolved(state: StudentProgressState): number {
  // Count unique questions solved
  const solvedIds = new Set<string>();
  for (const att of state.attempts) {
    if (att.isCorrect) {
      solvedIds.add(att.questionId);
    }
  }
  return solvedIds.size;
}

export function getTotalHintsUsed(state: StudentProgressState): number {
  return Object.values(state.methods).reduce((sum, m) => sum + m.hintsUsed, 0);
}

export function getTopicsStudiedCount(state: StudentProgressState): number {
  const methods = Object.values(state.methods);
  return methods.filter(
    (m) => m.lessonCompleted || m.solveWithMeCompleted || m.questionsAttempted > 0
  ).length;
}

export function getOverallAccuracy(state: StudentProgressState): number {
  if (state.attempts.length === 0) return 0;
  const correct = state.attempts.filter((a) => a.isCorrect).length;
  return Math.round((correct / state.attempts.length) * 100);
}

export function getMethodProgressPercentage(
  m: MethodProgress,
  totalMethodQuestions: number = 5
): number {
  let score = 0;
  if (m.lessonCompleted) score += 30;
  if (m.solveWithMeCompleted) score += 30;

  // Remaining 40% from practice questions solved
  const practicePortion = Math.min(
    40,
    Math.round((m.questionsSolved / Math.max(1, totalMethodQuestions)) * 40)
  );
  score += practicePortion;

  return Math.min(100, score);
}

export function isQuestionSolved(state: StudentProgressState, questionId: string): boolean {
  return state.attempts.some((a) => a.questionId === questionId && a.isCorrect);
}

export function getQuestionAttemptsCount(state: StudentProgressState, questionId: string): number {
  return state.attempts.filter((a) => a.questionId === questionId).length;
}

export interface ChallengeStats {
  totalPlayed: number;
  bestScore: number;
  highestStreak: number;
  avgScore: number;
}

export function getChallengeStats(state: StudentProgressState): ChallengeStats {
  const sprints = state.challenges.filter((c) => c.mode === 'sprint_60s');
  if (sprints.length === 0) {
    return {
      totalPlayed: 0,
      bestScore: 0,
      highestStreak: 0,
      avgScore: 0,
    };
  }

  const bestScore = Math.max(...sprints.map((s) => s.score));
  const highestStreak = Math.max(...sprints.map((s) => s.maxStreak));
  const sumScores = sprints.reduce((acc, s) => acc + s.score, 0);
  const avgScore = Math.round(sumScores / sprints.length);

  return {
    totalPlayed: sprints.length,
    bestScore,
    highestStreak,
    avgScore,
  };
}

export interface BattleStats {
  totalBattles: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
}

export function getBattleStats(state: StudentProgressState): BattleStats {
  const battles = state.battles;
  if (battles.length === 0) {
    return {
      totalBattles: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
    };
  }

  const wins = battles.filter((b) => b.result === 'win').length;
  const losses = battles.filter((b) => b.result === 'loss').length;
  const draws = battles.filter((b) => b.result === 'draw').length;
  const winRate = Math.round((wins / battles.length) * 100);

  return {
    totalBattles: battles.length,
    wins,
    losses,
    draws,
    winRate,
  };
}
