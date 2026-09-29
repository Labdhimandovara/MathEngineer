/**
 * Progress Store & Persistence Engine
 * 
 * Stores student activity in localStorage under 'mathengineer_progress_v1'.
 * Resilient against corrupted storage, quotas, and server-side/test environments.
 */

import {
  StudentProgressState,
  MethodId,
  MethodProgress,
  QuestionAttemptRecord,
  ChallengeRecord,
  BattleRecord,
} from './progressTypes.ts';

export const PROGRESS_STORAGE_KEY = 'mathengineer_progress_v1';

export function createInitialProgressState(): StudentProgressState {
  const createMethodProgress = (methodId: MethodId): MethodProgress => ({
    methodId,
    lessonCompleted: false,
    solveWithMeCompleted: false,
    questionsAttempted: 0,
    questionsSolved: 0,
    hintsUsed: 0,
    mistakesCount: 0,
    totalTimeSeconds: 0,
  });

  return {
    version: 1,
    createdAt: new Date().toISOString(),
    lastActiveDate: '',
    currentStreakDays: 0,
    bestStreakDays: 0,
    methods: {
      bisection: createMethodProgress('bisection'),
      'false-position': createMethodProgress('false-position'),
      'newton-raphson': createMethodProgress('newton-raphson'),
    },
    attempts: [],
    challenges: [],
    battles: [],
  };
}

let inMemoryState: StudentProgressState = createInitialProgressState();
const listeners = new Set<(state: StudentProgressState) => void>();

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getYesterdayString(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function loadProgress(): StudentProgressState {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed && parsed.version === 1 && parsed.methods) {
          inMemoryState = parsed;
          return inMemoryState;
        }
      }
    }
  } catch (err) {
    console.warn('Unable to load progress from localStorage:', err);
  }
  return inMemoryState;
}

export function saveProgress(state: StudentProgressState): void {
  inMemoryState = state;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
    }
  } catch (err) {
    console.warn('Unable to save progress to localStorage:', err);
  }
  notifyListeners();
}

function notifyListeners(): void {
  for (const listener of listeners) {
    try {
      listener(inMemoryState);
    } catch (err) {
      console.error('Error in progress listener:', err);
    }
  }
}

export function subscribeProgress(listener: (state: StudentProgressState) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function updateStreak(state: StudentProgressState): void {
  const today = getTodayString();
  const yesterday = getYesterdayString();

  if (state.lastActiveDate === today) {
    // Already recorded activity today
    return;
  }

  if (state.lastActiveDate === yesterday) {
    state.currentStreakDays += 1;
  } else {
    state.currentStreakDays = 1;
  }

  if (state.currentStreakDays > state.bestStreakDays) {
    state.bestStreakDays = state.currentStreakDays;
  }

  state.lastActiveDate = today;
}

export function recordQuestionAttempt(data: {
  questionId: string;
  methodId: MethodId | 'mixed';
  isCorrect: boolean;
  hintsUsed?: number;
  mistakesCount?: number;
  timeSpentSeconds?: number;
}): QuestionAttemptRecord {
  const state = loadProgress();
  updateStreak(state);

  const hintsUsed = data.hintsUsed || 0;
  const timeSpentSeconds = data.timeSpentSeconds || 0;
  const mistakesCount = data.mistakesCount || 0;

  const attempt: QuestionAttemptRecord = {
    id: `att_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    questionId: data.questionId,
    methodId: data.methodId,
    isCorrect: data.isCorrect,
    hintsUsed,
    timeSpentSeconds,
    timestamp: new Date().toISOString(),
  };

  state.attempts.push(attempt);

  // Update method stats if specific method
  if (data.methodId !== 'mixed' && state.methods[data.methodId]) {
    const m = state.methods[data.methodId];
    m.questionsAttempted += 1;
    if (data.isCorrect) {
      m.questionsSolved += 1;
    }
    m.hintsUsed += hintsUsed;
    m.mistakesCount += mistakesCount;
    m.totalTimeSeconds += timeSpentSeconds;
    m.lastPracticedAt = attempt.timestamp;
  }

  saveProgress(state);
  return attempt;
}

export function recordLessonCompleted(methodId: MethodId): void {
  const state = loadProgress();
  updateStreak(state);
  if (state.methods[methodId]) {
    state.methods[methodId].lessonCompleted = true;
    state.methods[methodId].lastPracticedAt = new Date().toISOString();
    saveProgress(state);
  }
}

export function recordSolveWithMeCompleted(methodId: MethodId): void {
  const state = loadProgress();
  updateStreak(state);
  if (state.methods[methodId]) {
    state.methods[methodId].solveWithMeCompleted = true;
    state.methods[methodId].lastPracticedAt = new Date().toISOString();
    saveProgress(state);
  }
}

export function recordChallengeResult(challenge: {
  mode: 'sprint_60s' | 'battle';
  score: number;
  correctCount: number;
  totalQuestions: number;
  maxStreak: number;
}): ChallengeRecord {
  const state = loadProgress();
  updateStreak(state);

  const record: ChallengeRecord = {
    id: `chal_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    mode: challenge.mode,
    score: challenge.score,
    correctCount: challenge.correctCount,
    totalQuestions: challenge.totalQuestions,
    maxStreak: challenge.maxStreak,
    timestamp: new Date().toISOString(),
  };

  state.challenges.push(record);
  saveProgress(state);
  return record;
}

export function recordBattleResult(battle: {
  opponentName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  format: 'quick' | 'best_of_3' | 'best_of_5';
  playerScore: number;
  opponentScore: number;
  result: 'win' | 'loss' | 'draw';
}): BattleRecord {
  const state = loadProgress();
  updateStreak(state);

  const record: BattleRecord = {
    id: `bat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    opponentName: battle.opponentName,
    difficulty: battle.difficulty,
    format: battle.format,
    playerScore: battle.playerScore,
    opponentScore: battle.opponentScore,
    result: battle.result,
    timestamp: new Date().toISOString(),
  };

  state.battles.push(record);
  saveProgress(state);
  return record;
}

export function resetProgress(): void {
  const fresh = createInitialProgressState();
  saveProgress(fresh);
}
