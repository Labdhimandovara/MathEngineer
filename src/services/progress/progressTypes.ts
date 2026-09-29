/**
 * Student Learning & Practice Progress Types
 * 
 * Tracks genuine student problem-solving activity, hint reliance,
 * challenge high scores, and battle history.
 */

export type MethodId = 'bisection' | 'false-position' | 'newton-raphson';

export interface MethodProgress {
  methodId: MethodId;
  lessonCompleted: boolean;
  solveWithMeCompleted: boolean;
  questionsAttempted: number;
  questionsSolved: number;
  hintsUsed: number;
  mistakesCount: number;
  totalTimeSeconds: number;
  lastPracticedAt?: string;
}

export interface QuestionAttemptRecord {
  id: string;
  questionId: string;
  methodId: MethodId | 'mixed';
  isCorrect: boolean;
  hintsUsed: number;
  timeSpentSeconds: number;
  timestamp: string; // ISO 8601
}

export interface ChallengeRecord {
  id: string;
  mode: 'sprint_60s' | 'battle';
  score: number;
  correctCount: number;
  totalQuestions: number;
  maxStreak: number;
  timestamp: string;
}

export interface BattleRecord {
  id: string;
  opponentName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  format: 'quick' | 'best_of_3' | 'best_of_5';
  playerScore: number;
  opponentScore: number;
  result: 'win' | 'loss' | 'draw';
  timestamp: string;
}

export interface StudentProgressState {
  version: number;
  createdAt: string;
  lastActiveDate: string; // 'YYYY-MM-DD'
  currentStreakDays: number;
  bestStreakDays: number;
  
  methods: Record<MethodId, MethodProgress>;
  attempts: QuestionAttemptRecord[];
  challenges: ChallengeRecord[];
  battles: BattleRecord[];
}
