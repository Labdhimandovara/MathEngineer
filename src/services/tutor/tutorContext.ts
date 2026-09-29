/**
 * Central Tutor Context Builder & Intent Classifier (Phase 13)
 * 
 * Assembles a structured, minimal, highly relevant TutorContext.
 * Respects strict precedence:
 *   1. Active Image Problem (Highest Priority: wins over Learn, Practice, or defaults)
 *   2. Active Practice / Solve Problem
 *   3. Active Review Problem
 *   4. Active Quiz / Assessment Context
 *   5. Active Learn Lesson
 *   6. Generic Assistant Context
 * 
 * Never allows stale Learn/Practice context to override the active problem.
 * Attaches authoritative deterministic solver state, selective course RAG,
 * and adaptive learning focus without dumping raw application state.
 */

import {
  TutorContext,
  TutorIntent,
  TutorActiveProblem,
  TutorLearningContext,
  TutorCourseContext,
  LanguageMode,
} from './tutorTypes.ts';
import { getLanguageMode } from './languageMode.ts';
import {
  getActiveAssistantContext,
  getActiveProblem,
} from '../problem/activeProblemStore.ts';
import { runDeterministicSolver } from '../problem/deterministicSolverAdapter.ts';
import { getAttempts } from '../learning/learningStore.ts';
import { getAssessmentHistory, getActiveSession } from '../assessment/assessmentStore.ts';
import {
  deriveAdaptiveTopicStates,
  deriveLearningFocus,
  detectWeakTopics,
} from '../adaptive/index.ts';
import { classifyQuery } from '../knowledge/queryClassifier.ts';
import { searchKnowledge } from '../knowledge/knowledgeService.ts';
import { PageId } from '../../types/index.ts';

/**
 * Deterministically classifies the user's educational intent
 */
export function classifyTutorIntent(query: string, activeProblem?: TutorActiveProblem): TutorIntent {
  const q = query.toLowerCase().trim();

  // 1. Solution / Answer requests
  if (
    q.includes('show solution') ||
    q.includes('show me the complete solution') ||
    q.includes('full solution') ||
    q.includes('give me the answer') ||
    q.includes('what is the final root')
  ) {
    return 'SHOW_SOLUTION';
  }

  // 2. Mistake / Error diagnosis
  if (
    q.includes('why is my') ||
    q.includes('why wrong') ||
    q.includes('where is my mistake') ||
    q.includes('what did i do wrong') ||
    q.includes('why was my answer wrong') ||
    q.includes('why did it fail')
  ) {
    return 'WHY_WRONG';
  }

  // 3. Hints
  if (
    q === 'hint' ||
    q.includes('give me a hint') ||
    q.includes('give hint') ||
    q.includes('i am stuck') ||
    q.includes('stuck') ||
    q.includes('need a clue')
  ) {
    return 'GIVE_HINT';
  }

  // 4. Step explanation
  if (
    q.includes('why do we replace') ||
    q.includes('why replace b') ||
    q.includes('why replace a') ||
    q.includes('why divide by') ||
    q.includes('explain this step') ||
    q.includes('what is the next step') ||
    q.includes('next step')
  ) {
    return 'EXPLAIN_STEP';
  }

  // 5. Verification / Checking
  if (
    q.includes('check my work') ||
    q.includes('is this correct') ||
    q.includes('did i do this right') ||
    q.includes('verify my answer')
  ) {
    return 'CHECK_MY_WORK';
  }

  // 6. Course-specific queries
  if (
    q.includes('according to our course') ||
    q.includes('our course') ||
    q.includes('in our syllabus') ||
    q.includes('syllabus') ||
    q.includes('course') ||
    q.includes('dr. ram kishun') ||
    q.includes('lodhi') ||
    q.includes('sit pune') ||
    q.includes('course worked example') ||
    q.includes('the professor') ||
    q.includes('professor') ||
    q.includes('how does our professor')
  ) {
    return 'COURSE_QUESTION';
  }

  // 7. Method Comparison
  if (
    q.includes('which method') ||
    q.includes('compare') ||
    q.includes('bisection vs') ||
    q.includes('better method') ||
    q.includes('faster convergence')
  ) {
    return 'COMPARE_METHODS';
  }

  // 8. Practice recommendation
  if (
    q.includes('what should i practice') ||
    q.includes('what next') ||
    q.includes('recommend practice')
  ) {
    return 'PRACTICE_RECOMMENDATION';
  }

  // 9. Image problem specific
  if (activeProblem?.source === 'image' && (q.includes('this photo') || q.includes('this image') || q.includes('extracted'))) {
    return 'IMAGE_PROBLEM_HELP';
  }

  // 10. Conceptual explanation
  if (
    q.startsWith('explain') ||
    q.startsWith('what is') ||
    q.startsWith('how does') ||
    q.includes('concept') ||
    q.includes('formula')
  ) {
    return 'EXPLAIN_CONCEPT';
  }

  return 'GENERAL_HELP';
}

/**
 * Builds the centralized, typed TutorContext
 */
export function buildTutorContext(params: {
  query: string;
  currentPage?: string;
  isAssessmentActive?: boolean;
  activeProblemOverride?: Partial<TutorActiveProblem>;
  languageMode?: LanguageMode;
  responseMode?: 'text' | 'voice';
}): TutorContext {
  const currentPage = (params.currentPage || 'home') as PageId;
  const rawContext = getActiveAssistantContext(currentPage);

  // 1. Resolve Active Problem respecting precedence
  let activeProblem: TutorActiveProblem | undefined;

  if (rawContext && (rawContext.equation || rawContext.questionId || rawContext.source === 'image' || rawContext.method)) {
    activeProblem = {
      questionId: rawContext.questionId,
      source: rawContext.source || (rawContext.currentPage === 'learn' ? 'learn' : undefined),
      title: rawContext.questionId ? `Problem ${rawContext.questionId}` : undefined,
      equation: rawContext.equation,
      method: rawContext.method as any,
      lowerBound: rawContext.bounds ? rawContext.bounds[0] : null,
      upperBound: rawContext.bounds ? rawContext.bounds[1] : null,
      boundsSource: rawContext.boundsSource,
      decimalPlaces: rawContext.decimalPlaces,
      initialGuess: rawContext.x0,
      currentStep: rawContext.currentStep,
      currentIteration: rawContext.currentIteration,
      studentAnswer: rawContext.studentAnswer,
      lastError: rawContext.lastError,
      bracketDiscovery: rawContext.bracketDiscovery,
      verifiedSolverOutput: rawContext.verifiedSolverOutput,
    };
  }

  // Apply overrides if supplied
  if (params.activeProblemOverride) {
    activeProblem = {
      ...activeProblem,
      ...params.activeProblemOverride,
    };
  }

  // Ensure deterministic solver output is precalculated for any problem with equation and method
  if (activeProblem && activeProblem.equation && activeProblem.method && !activeProblem.verifiedSolverOutput) {
    const methodStr = activeProblem.method.toLowerCase();
    if (methodStr === 'bisection' || methodStr === 'false-position' || methodStr === 'newton-raphson') {
      const solverData = runDeterministicSolver({
        method: methodStr as any,
        equation: activeProblem.equation,
        lowerBound: activeProblem.lowerBound,
        upperBound: activeProblem.upperBound,
        initialGuess: activeProblem.initialGuess,
        decimalPlaces: activeProblem.decimalPlaces || 3,
      });
      activeProblem.verifiedSolverOutput = solverData;
    }
  }

  // 2. Classify Intent
  const intent = classifyTutorIntent(params.query, activeProblem);

  // 3. Adaptive Learning Context (Phase 11)
  let learningContext: TutorLearningContext | undefined;
  try {
    const attempts = getAttempts();
    const assessments = getAssessmentHistory();
    if (attempts.length > 0) {
      const states = deriveAdaptiveTopicStates(attempts, assessments);
      const focus = deriveLearningFocus(attempts, assessments);
      const weak = detectWeakTopics(attempts, assessments);
      const targetMethod = (activeProblem?.method as any) || focus.method;

      learningContext = {
        topicState: states[targetMethod as keyof typeof states],
        currentFocus: focus,
        weakTopics: weak,
        recentMistakes: states[targetMethod as keyof typeof states]?.recentMistakes,
      };
    }
  } catch {
    // Non-blocking
  }

  // 4. Course RAG Context (Phase 7)
  let courseContext: TutorCourseContext | undefined;
  const isCourseSpecific =
    intent === 'COURSE_QUESTION' ||
    params.query.toLowerCase().includes('course') ||
    params.query.toLowerCase().includes('professor') ||
    params.query.toLowerCase().includes('lodhi') ||
    params.query.toLowerCase().includes('sit');

  if (isCourseSpecific) {
    try {
      const classification = classifyQuery(params.query, rawContext);
      const targetMethod = (rawContext?.method as any) || classification.targetMethod;

      const matches = searchKnowledge(params.query, {
        method: targetMethod,
        topK: 3,
        minScore: 15,
      });

      if (matches.length > 0) {
        const citations = Array.from(new Set(matches.map((m) => m.source)));
        let negativeNote: string | undefined;

        // Check for negative knowledge (e.g. derivative zero in Newton)
        const isDerivZero =
          params.query.toLowerCase().includes('derivative') &&
          (params.query.toLowerCase().includes('zero') || params.query.toLowerCase().includes("f'"));
        if (isDerivZero) {
          negativeNote = 'Official course slides do not provide a workaround or continuation rule when f\'(x) = 0. The course notes that division by zero makes the formula undefined.';
        }

        courseContext = {
          chunks: matches.map((m) => m.chunk),
          citations,
          negativeKnowledgeNote: negativeNote,
        };
      }
    } catch {
      // Non-blocking
    }
  }

  // 5. Assessment Safety Flag
  const activeQuiz = getActiveSession();
  const isAssessmentActive =
    params.isAssessmentActive ?? (currentPage === 'quiz' && activeQuiz !== null && activeQuiz.status === 'active');

  const languageMode = params.languageMode || getLanguageMode();

  return {
    activeProblem,
    solverState: activeProblem?.verifiedSolverOutput,
    learningContext,
    courseContext,
    interactionContext: {
      currentPage,
      isAssessmentActive,
      tutorMode: intent,
    },
    languageMode,
    responseMode: params.responseMode || 'text',
  };
}
