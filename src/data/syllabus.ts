import { MethodTopic, PracticeProblem, StudentProgressDemo } from '../types/index.ts';

export const COURSE_TITLE = "Numerical Techniques";

// Confirmed syllabus topics from syllabus guidelines
export const SYLLABUS_TOPICS: MethodTopic[] = [
  // Active MVP Methods
  {
    id: 'bisection',
    title: 'Bisection Method',
    subtitle: 'Numerical solution of algebraic and transcendental equations',
    status: 'ready',
    progressPercentage: 0,
    category: 'algebraic_transcendental',
    isMvp: true,
  },
  {
    id: 'false-position',
    title: 'False Position Method',
    subtitle: 'Numerical solution of algebraic and transcendental equations',
    status: 'ready',
    progressPercentage: 0,
    category: 'algebraic_transcendental',
    isMvp: true,
  },
  {
    id: 'newton-raphson',
    title: 'Newton-Raphson Method',
    subtitle: 'Numerical solution of algebraic and transcendental equations',
    status: 'ready',
    progressPercentage: 0,
    category: 'algebraic_transcendental',
    isMvp: true,
  },

  // Future Confirmed Syllabus Modules
  {
    id: 'error-analysis',
    title: 'Error Analysis',
    subtitle: 'Numerical Techniques',
    status: 'planned',
    progressPercentage: 0,
    category: 'algebraic_transcendental',
    isMvp: false,
  },
  {
    id: 'linear-systems-iterative',
    title: 'Solution of Linear Systems by Iterative Methods',
    subtitle: 'Numerical Techniques',
    status: 'planned',
    progressPercentage: 0,
    category: 'linear_systems',
    isMvp: false,
  },
  {
    id: 'gauss-jacobi',
    title: 'Gauss-Jacobi Method',
    subtitle: 'Iterative solution of linear systems',
    status: 'planned',
    progressPercentage: 0,
    category: 'linear_systems',
    isMvp: false,
  },
  {
    id: 'gauss-seidel',
    title: 'Gauss-Seidel Method',
    subtitle: 'Iterative solution of linear systems',
    status: 'planned',
    progressPercentage: 0,
    category: 'linear_systems',
    isMvp: false,
  },
  {
    id: 'matrix-norm',
    title: 'Matrix Norm',
    subtitle: 'Matrix analysis',
    status: 'planned',
    progressPercentage: 0,
    category: 'matrix_analysis',
    isMvp: false,
  },
  {
    id: 'condition-number',
    title: 'Condition Number',
    subtitle: 'Matrix analysis',
    status: 'planned',
    progressPercentage: 0,
    category: 'matrix_analysis',
    isMvp: false,
  },
];

// Clean sample practice problems using strictly neutral labels ("Practice", "Exam-style", "Numerical Techniques")
export const PRACTICE_PROBLEMS: PracticeProblem[] = [
  {
    id: 'p-1',
    title: 'Finding Root of Polynomial by Bisection',
    method: 'Bisection Method',
    categoryLabel: 'Practice',
    difficulty: 'Fundamental',
    estimatedMinutes: 15,
    questionsCount: 3,
  },
  {
    id: 'p-2',
    title: 'Transcendental Equation Root Approximation',
    method: 'False Position Method',
    categoryLabel: 'Exam-style',
    difficulty: 'Exam-style',
    estimatedMinutes: 20,
    questionsCount: 2,
  },
  {
    id: 'p-3',
    title: 'Iterative Convergence with Tangent Method',
    method: 'Newton-Raphson Method',
    categoryLabel: 'Numerical Techniques',
    difficulty: 'Exam-style',
    estimatedMinutes: 20,
    questionsCount: 2,
  },
  {
    id: 'p-4',
    title: 'Interval Bracket Verification & Step Practice',
    method: 'Bisection Method',
    categoryLabel: 'Practice',
    difficulty: 'Fundamental',
    estimatedMinutes: 10,
    questionsCount: 1,
  },
];

// Initial truthful baseline for any legacy imports
export const DEFAULT_STUDENT_PROGRESS: StudentProgressDemo = {
  streakDays: 0,
  topicsStudied: 0,
  totalActiveTopics: 3,
  questionsSolved: 0,
  hintsUsed: 0,
  lastActiveMethod: 'Bisection Method',
};
