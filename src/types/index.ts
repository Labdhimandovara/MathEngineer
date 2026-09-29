export type PageId = 'home' | 'learn' | 'solve' | 'practice' | 'review' | 'quiz' | 'challenge' | 'progress';

export interface QuestionLaunchConfig {
  questionId: string;
  method: 'bisection' | 'false-position' | 'newton-raphson';
  equation: string;
  lowerBound: number;
  upperBound: number;
  decimalPlaces: number;
  initialGuess?: number; // x0 for Newton-Raphson
  title?: string;
  source?: 'practice' | 'assessment' | 'image' | 'review' | 'solve-manual';
  boundsSource?: 'supplied' | 'discovered' | 'manual' | 'missing';
  rawExtractedText?: string;
  imageThumbnailUrl?: string;
}

export interface MethodTopic {
  id: string;
  title: string;
  subtitle: string;
  status: 'active' | 'in-progress' | 'ready' | 'planned';
  progressPercentage: number;
  category: 'algebraic_transcendental' | 'linear_systems' | 'matrix_analysis';
  isMvp: boolean;
}

export interface PracticeProblem {
  id: string;
  title: string;
  method: string;
  categoryLabel: 'Practice' | 'Exam-style' | 'Numerical Techniques';
  difficulty: 'Fundamental' | 'Exam-style';
  estimatedMinutes: number;
  questionsCount: number;
}

export interface StudentProgressDemo {
  streakDays: number;
  topicsStudied: number;
  totalActiveTopics: number;
  questionsSolved: number;
  hintsUsed: number;
  lastActiveMethod: string;
}
