export type ChallengeQuestionType = 'multiple_choice' | 'numeric';

export interface ChallengeQuestion {
  id: string;
  topic: 'bisection' | 'false-position' | 'newton-raphson' | 'theory';
  question: string;
  type: ChallengeQuestionType;
  options?: string[]; // 4 choices for multiple choice
  correctAnswer: string; // matched case-insensitively
  tolerance?: number; // for numeric answers
  explanation: string;
}

export type BattleDifficulty = 'easy' | 'medium' | 'hard';
export type BattleFormat = 'quick' | 'best_of_3' | 'best_of_5';

export interface BotProfile {
  name: string;
  title: string;
  difficulty: BattleDifficulty;
  accuracyRate: number; // 0 to 1
  minDelayMs: number;
  maxDelayMs: number;
}
