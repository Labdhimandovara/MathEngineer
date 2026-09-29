import { ChallengeQuestion, BattleDifficulty, BotProfile } from './challengeTypes.ts';
import { BOT_PROFILES } from './challengeQuestions.ts';

export interface BotSimulationResult {
  isCorrect: boolean;
  delayMs: number;
  answer: string;
}

export function simulateBotAnswer(
  question: ChallengeQuestion,
  difficulty: BattleDifficulty
): BotSimulationResult {
  const profile: BotProfile = BOT_PROFILES[difficulty] || BOT_PROFILES.medium;

  const delayMs = Math.round(
    profile.minDelayMs + Math.random() * (profile.maxDelayMs - profile.minDelayMs)
  );

  const isCorrect = Math.random() < profile.accuracyRate;

  let answer: string;
  if (isCorrect) {
    answer = question.correctAnswer;
  } else {
    // Generate believable wrong answer
    if (question.type === 'multiple_choice' && question.options) {
      const wrongOptions = question.options.filter(
        (opt) => opt.toLowerCase().trim() !== question.correctAnswer.toLowerCase().trim()
      );
      answer = wrongOptions[Math.floor(Math.random() * wrongOptions.length)] || 'None of these';
    } else {
      const num = parseFloat(question.correctAnswer);
      answer = isNaN(num) ? '0' : (num * 1.35).toFixed(2);
    }
  }

  return {
    isCorrect,
    delayMs,
    answer,
  };
}
