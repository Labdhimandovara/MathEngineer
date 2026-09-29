import { assertEquals, assert } from 'jsr:@std/assert';
import {
  createInitialProgressState,
  loadProgress,
  saveProgress,
  recordQuestionAttempt,
  recordLessonCompleted,
  recordSolveWithMeCompleted,
  recordChallengeResult,
  recordBattleResult,
  resetProgress,
  PROGRESS_STORAGE_KEY,
} from '../src/services/progress/progressStore.ts';
import {
  getActiveStreak,
  getTotalAttempted,
  getTotalSolved,
  getTotalHintsUsed,
  getTopicsStudiedCount,
  getOverallAccuracy,
  getMethodProgressPercentage,
  getChallengeStats,
  getBattleStats,
  isQuestionSolved,
} from '../src/services/progress/progressCalculations.ts';

Deno.test('Progress Store 1: Initial state has 0 attempts and empty metrics', () => {
  resetProgress();
  const state = loadProgress();

  assertEquals(state.version, 1);
  assertEquals(state.currentStreakDays, 0);
  assertEquals(state.attempts.length, 0);
  assertEquals(state.challenges.length, 0);
  assertEquals(state.battles.length, 0);

  assertEquals(getTotalAttempted(state), 0);
  assertEquals(getTotalSolved(state), 0);
  assertEquals(getOverallAccuracy(state), 0);
  assertEquals(getTotalHintsUsed(state), 0);
  assertEquals(getTopicsStudiedCount(state), 0);
});

Deno.test('Progress Store 2: Recording an attempt updates attempts, method stats, and streak', () => {
  resetProgress();

  const attempt = recordQuestionAttempt({
    questionId: 'q-fp-1',
    methodId: 'false-position',
    isCorrect: true,
    hintsUsed: 2,
    timeSpentSeconds: 45,
  });

  assert(attempt.id.startsWith('att_'));
  assertEquals(attempt.isCorrect, true);
  assertEquals(attempt.hintsUsed, 2);

  const state = loadProgress();
  assertEquals(getTotalAttempted(state), 1);
  assertEquals(getTotalSolved(state), 1);
  assertEquals(isQuestionSolved(state, 'q-fp-1'), true);
  assertEquals(isQuestionSolved(state, 'q-fp-2'), false);
  assertEquals(state.methods['false-position'].questionsAttempted, 1);
  assertEquals(state.methods['false-position'].questionsSolved, 1);
  assertEquals(state.methods['false-position'].hintsUsed, 2);
  assertEquals(state.currentStreakDays, 1);
  assertEquals(getActiveStreak(state), 1);
});

Deno.test('Progress Store 3: Accuracy reflects genuine correct-to-attempted ratio', () => {
  resetProgress();

  recordQuestionAttempt({
    questionId: 'q-bis-1',
    methodId: 'bisection',
    isCorrect: true,
  });

  recordQuestionAttempt({
    questionId: 'q-bis-2',
    methodId: 'bisection',
    isCorrect: false,
  });

  const state = loadProgress();
  assertEquals(getTotalAttempted(state), 2);
  assertEquals(getTotalSolved(state), 1);
  assertEquals(getOverallAccuracy(state), 50);
});

Deno.test('Progress Store 4: Lesson and SolveWithMe completions update topics studied', () => {
  resetProgress();
  let state = loadProgress();
  assertEquals(getTopicsStudiedCount(state), 0);

  recordLessonCompleted('newton-raphson');
  state = loadProgress();
  assertEquals(state.methods['newton-raphson'].lessonCompleted, true);
  assertEquals(getTopicsStudiedCount(state), 1);

  recordSolveWithMeCompleted('bisection');
  state = loadProgress();
  assertEquals(state.methods['bisection'].solveWithMeCompleted, true);
  assertEquals(getTopicsStudiedCount(state), 2);

  // Method progress percentage calculation
  const bisPct = getMethodProgressPercentage(state.methods['bisection']);
  assertEquals(bisPct, 30); // 30% for solve with me
});

Deno.test('Progress Store 5: Challenge and battle records track high scores and stats', () => {
  resetProgress();

  recordChallengeResult({
    mode: 'sprint_60s',
    score: 850,
    correctCount: 7,
    totalQuestions: 8,
    maxStreak: 6,
  });

  recordChallengeResult({
    mode: 'sprint_60s',
    score: 1100,
    correctCount: 9,
    totalQuestions: 10,
    maxStreak: 8,
  });

  let state = loadProgress();
  const chalStats = getChallengeStats(state);
  assertEquals(chalStats.totalPlayed, 2);
  assertEquals(chalStats.bestScore, 1100);
  assertEquals(chalStats.highestStreak, 8);

  recordBattleResult({
    opponentName: 'MathBot',
    difficulty: 'medium',
    format: 'best_of_3',
    playerScore: 2,
    opponentScore: 1,
    result: 'win',
  });

  state = loadProgress();
  const batStats = getBattleStats(state);
  assertEquals(batStats.totalBattles, 1);
  assertEquals(batStats.wins, 1);
  assertEquals(batStats.winRate, 100);

  // Reset clears everything cleanly
  resetProgress();
  state = loadProgress();
  assertEquals(state.attempts.length, 0);
  assertEquals(state.challenges.length, 0);
  assertEquals(state.battles.length, 0);
});
