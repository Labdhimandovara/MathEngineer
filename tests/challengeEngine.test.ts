import { assertEquals, assert } from 'jsr:@std/assert';
import {
  CHALLENGE_QUESTIONS,
  BOT_PROFILES,
} from '../src/services/challenge/challengeQuestions.ts';
import { simulateBotAnswer } from '../src/services/challenge/battleBot.ts';
import {
  resetProgress,
  loadProgress,
  recordChallengeResult,
  recordBattleResult,
} from '../src/services/progress/progressStore.ts';
import {
  getChallengeStats,
  getBattleStats,
} from '../src/services/progress/progressCalculations.ts';

Deno.test('Challenge Engine 1: Question bank has 15 valid questions with correct answers', () => {
  assertEquals(CHALLENGE_QUESTIONS.length, 15);

  for (const q of CHALLENGE_QUESTIONS) {
    assert(q.id);
    assert(q.question);
    assert(q.explanation);
    assert(q.correctAnswer);

    if (q.type === 'multiple_choice') {
      assert(q.options && q.options.length >= 2, `${q.id} missing MCQ options`);
      const hasAnswer = q.options.some(
        (opt) => opt.toLowerCase().trim() === q.correctAnswer.toLowerCase().trim()
      );
      assert(hasAnswer, `${q.id} options do not contain the correct answer "${q.correctAnswer}"`);
    } else if (q.type === 'numeric') {
      const parsed = parseFloat(q.correctAnswer);
      assert(!isNaN(parsed), `${q.id} numeric answer is not a valid number`);
      assert(q.tolerance !== undefined && q.tolerance > 0, `${q.id} missing tolerance`);
    }
  }
});

Deno.test('Challenge Engine 2: Bot profiles scale logically by difficulty', () => {
  const easy = BOT_PROFILES.easy;
  const medium = BOT_PROFILES.medium;
  const hard = BOT_PROFILES.hard;

  assert(easy.accuracyRate < medium.accuracyRate);
  assert(medium.accuracyRate < hard.accuracyRate);

  // Hard bot responds faster than easy bot
  assert(hard.minDelayMs < easy.minDelayMs);
  assert(hard.maxDelayMs < easy.maxDelayMs);
});

Deno.test('Challenge Engine 3: MathBot simulation generates answers within profile delay ranges', () => {
  const question = CHALLENGE_QUESTIONS[0];
  const easyProfile = BOT_PROFILES.easy;

  for (let i = 0; i < 10; i++) {
    const sim = simulateBotAnswer(question, 'easy');
    assert(
      sim.delayMs >= easyProfile.minDelayMs && sim.delayMs <= easyProfile.maxDelayMs,
      `Delay ${sim.delayMs} out of range [${easyProfile.minDelayMs}, ${easyProfile.maxDelayMs}]`
    );
    assert(typeof sim.isCorrect === 'boolean');
    assert(sim.answer.length > 0);
  }
});

Deno.test('Challenge Engine 4: High score recording and battle win tracking integrate with progress', () => {
  resetProgress();

  recordChallengeResult({
    mode: 'sprint_60s',
    score: 1250,
    correctCount: 11,
    totalQuestions: 12,
    maxStreak: 9,
  });

  let state = loadProgress();
  let cStats = getChallengeStats(state);
  assertEquals(cStats.totalPlayed, 1);
  assertEquals(cStats.bestScore, 1250);
  assertEquals(cStats.highestStreak, 9);

  recordBattleResult({
    opponentName: 'Novice Bot',
    difficulty: 'easy',
    format: 'quick',
    playerScore: 1,
    opponentScore: 0,
    result: 'win',
  });

  recordBattleResult({
    opponentName: 'Grandmaster Bot',
    difficulty: 'hard',
    format: 'best_of_3',
    playerScore: 1,
    opponentScore: 2,
    result: 'loss',
  });

  state = loadProgress();
  const bStats = getBattleStats(state);
  assertEquals(bStats.totalBattles, 2);
  assertEquals(bStats.wins, 1);
  assertEquals(bStats.losses, 1);
  assertEquals(bStats.winRate, 50);
});
