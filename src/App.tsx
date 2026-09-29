import React, { useState, useEffect } from 'react';
import { PageId, QuestionLaunchConfig } from './types/index.ts';
import { Header } from './components/layout/Header.tsx';
import { MobileNav } from './components/layout/MobileNav.tsx';
import { Footer } from './components/layout/Footer.tsx';
import { Home } from './pages/Home.tsx';
import { Learn } from './pages/Learn.tsx';
import { Solve } from './pages/Solve.tsx';
import { Practice } from './pages/Practice.tsx';
import { Challenge } from './pages/Challenge.tsx';
import { Progress } from './pages/Progress.tsx';
import { Review } from './pages/Review.tsx';
import { Quiz } from './pages/Quiz.tsx';
import { MathAssistant } from './components/assistant/MathAssistant.tsx';
import { AssistantSolverContext } from './services/assistant/types.ts';
import {
  useActiveAssistantContext,
  setActiveLearnLesson,
} from './services/problem/activeProblemStore.ts';
import {
  getAllImageProblems,
  hydrateImageProblemsFromBackend,
} from './services/problem/imageProblemRegistry.ts';
import {
  loadLearningAttempts,
  hydrateLearningAttemptsFromBackend,
} from './services/learning/learningStore.ts';
import {
  getAssessmentHistory,
  hydrateAssessmentHistoryFromBackend,
} from './services/assessment/assessmentStore.ts';
import { syncBatchToBackend } from './services/api/persistenceClient.ts';
import { useTheme } from './services/theme/useTheme.ts';

export const App: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const [currentPage, setCurrentPage] = useState<PageId>('home');
  const [solveInitialAction, setSolveInitialAction] = useState<
    'none' | 'myself' | 'hints' | 'solution'
  >('none');
  const [solveInitialMethod, setSolveInitialMethod] = useState<
    'bisection' | 'false-position' | 'newton-raphson'
  >('bisection');
  const [solveQuestionConfig, setSolveQuestionConfig] = useState<QuestionLaunchConfig | null>(null);
  const [isAssistantOpen, setIsAssistantOpen] = useState<boolean>(false);
  const [learnActiveLesson, setLearnActiveLesson] = useState<
    'bisection' | 'false-position' | 'newton-raphson' | null
  >('bisection');

  const [reviewInitialQuestionId, setReviewInitialQuestionId] = useState<string | undefined>(undefined);
  const [reviewInitialFilter, setReviewInitialFilter] = useState<any>('all');

  // Sync learn active lesson to activeProblemStore
  useEffect(() => {
    setActiveLearnLesson(learnActiveLesson);
  }, [learnActiveLesson]);

  // One-time startup synchronization & migration to backend DB
  useEffect(() => {
    async function initSync() {
      try {
        const MIGRATION_KEY = 'mathengineer_backend_migrated_v1';
        let migrated = false;
        try {
          migrated = Boolean(localStorage.getItem(MIGRATION_KEY));
        } catch {
          // SSR or restricted
        }

        if (!migrated) {
          const imageProblems = getAllImageProblems();
          const attempts = loadLearningAttempts();
          const assessments = getAssessmentHistory();
          if (imageProblems.length > 0 || attempts.length > 0 || assessments.length > 0) {
            await syncBatchToBackend({
              imageProblems,
              attempts,
              assessments,
            });
          }
          try {
            localStorage.setItem(MIGRATION_KEY, 'true');
          } catch {
            // ignore
          }
        }

        // Hydrate latest data from backend into client memory/cache
        await hydrateImageProblemsFromBackend();
        await hydrateLearningAttemptsFromBackend();
        await hydrateAssessmentHistoryFromBackend();
      } catch {
        // Offline or server not yet reachable
      }
    }

    initSync();
  }, []);

  // Scroll to top upon navigating to a new page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  const handleNavigate = (
    page: PageId,
    options?: {
      action?: 'none' | 'myself' | 'hints' | 'solution';
      method?: string;
      questionConfig?: QuestionLaunchConfig;
      reviewQuestionId?: string;
      reviewFilter?: string;
    }
  ) => {
    if (options?.action) {
      setSolveInitialAction(options.action);
    } else if (page === 'solve') {
      setSolveInitialAction('none');
    }

    if (options?.questionConfig) {
      setSolveQuestionConfig(options.questionConfig);
      setSolveInitialMethod(options.questionConfig.method);
    } else if (page !== 'solve') {
      // Clear specific question when leaving solve page
      setSolveQuestionConfig(null);
    }

    if (options?.reviewQuestionId !== undefined) {
      setReviewInitialQuestionId(options.reviewQuestionId);
    } else if (page !== 'review') {
      setReviewInitialQuestionId(undefined);
    }

    if (options?.reviewFilter) {
      setReviewInitialFilter(options.reviewFilter);
    } else if (page !== 'review') {
      setReviewInitialFilter('all');
    }

    if (options?.method && !options?.questionConfig) {
      if (
        options.method === 'bisection' ||
        options.method === 'false-position' ||
        options.method === 'newton-raphson'
      ) {
        setSolveInitialMethod(options.method);
      }
    }

    setCurrentPage(page);
  };

  // Authoritative assistant context from activeProblemStore (Image -> Practice -> Learn -> Generic)
  const assistantContext = useActiveAssistantContext(currentPage);

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary dark:bg-bg-dark text-charcoal dark:text-charcoal-light transition-colors duration-200">
      {/* Main Header with desktop nav & controls */}
      <Header
        currentPage={currentPage}
        onNavigate={handleNavigate}
        isDarkMode={isDark}
        onToggleDarkMode={toggleTheme}
      />

      {/* Main Page Content Shell with subtle 200ms page transitions */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 pb-24 md:pb-12">
        <div key={currentPage} className="animate-fadeIn animate-slideUp">
          {currentPage === 'home' && <Home onNavigate={handleNavigate} />}
          {currentPage === 'learn' && (
            <Learn
              onNavigate={handleNavigate}
              onActiveLessonChange={setLearnActiveLesson}
            />
          )}
          {currentPage === 'solve' && (
            <Solve
              initialAction={solveInitialAction}
              initialMethod={solveInitialMethod}
              questionConfig={solveQuestionConfig}
            />
          )}
          {currentPage === 'practice' && <Practice onNavigate={handleNavigate} />}
          {currentPage === 'review' && (
            <Review
              onNavigate={handleNavigate}
              initialQuestionId={reviewInitialQuestionId}
              initialFilter={reviewInitialFilter}
            />
          )}
          {currentPage === 'quiz' && <Quiz onNavigate={handleNavigate} />}
          {currentPage === 'challenge' && <Challenge onNavigate={handleNavigate} />}
          {currentPage === 'progress' && <Progress onNavigate={handleNavigate} />}
        </div>
      </main>

      {/* Embedded MathEngineer Assistant */}
      <MathAssistant
        isOpen={isAssistantOpen}
        onToggle={() => setIsAssistantOpen((prev) => !prev)}
        context={assistantContext}
      />

      {/* Footer */}
      <Footer />

      {/* Mobile Bottom Navigation Bar */}
      <MobileNav currentPage={currentPage} onNavigate={handleNavigate} />
    </div>
  );
};

export default App;
