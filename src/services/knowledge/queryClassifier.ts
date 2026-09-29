/**
 * Course-Specific Query Classifier for MathEngineer Assistant
 * 
 * Classifies student queries into:
 * - COURSE_SPECIFIC: Requires retrieval from official course knowledge base
 * - CURRENT_PROBLEM: Relies on deterministic solver state & active step context
 * - SOLVER_EXPLANATION: Algorithmic step-by-step guidance
 * - GENERAL: Direct Gemini answer without RAG overhead
 */

import { QueryClassificationResult } from '../../types/knowledge.ts';
import { AssistantSolverContext } from '../assistant/types.ts';
import { detectMethodFromQuery } from './knowledgeService.ts';

export function classifyQuery(
  query: string,
  context?: AssistantSolverContext
): QueryClassificationResult {
  const q = (query || '').toLowerCase().trim();
  const detectedMethod = detectMethodFromQuery(q);

  // 1. Current Problem Intent Detection
  const currentProblemKeywords = [
    'my answer',
    'my step',
    'my calculation',
    'my root',
    'why is my',
    'why did you replace',
    'is this correct',
    'check my',
    'current problem',
    'current step',
    'x1 wrong',
    'x2 wrong',
    'x3 wrong',
    'f(x) wrong',
    'solve this in detail',
    'solve in detail',
    'solve this',
    'detailed solution',
    'explain this problem',
    'how to solve this',
  ];
  const isCurrentProblem =
    currentProblemKeywords.some((kw) => q.includes(kw)) ||
    (context?.equation &&
      (q.includes('this equation') ||
        q.includes('this problem') ||
        q.includes('current') ||
        q.includes('solve this') ||
        q.includes('solve')));

  if (isCurrentProblem) {
    return {
      intent: 'CURRENT_PROBLEM',
      confidence: 0.9,
      targetMethod: (context?.method as any) || detectedMethod || undefined,
      explanation: 'Student is asking about their current interactive calculation or solver state.',
    };
  }

  // 2. Course-Specific Intent Detection
  const courseSpecificPhrases = [
    'according to our course',
    'according to the course',
    'our notes',
    'course notes',
    'in our class',
    'dr. lodhi',
    'dr ram kishun',
    'symbiosis',
    'sit pune',
    'our syllabus',
    'course formula',
    'course rule',
    'stopping rule',
    'stopping convention',
    'how is x0 selected',
    'how do i choose x0',
    'how to choose x0',
    'what condition must f(a)',
    'condition for existence',
    'bracketing condition',
    'midpoint calculation',
    'taylor derivation',
    'taylor series derivation',
    'worked example',
    'derivative zero',
    "f'(x) = 0",
    'what does our course say',
    'what did our notes say',
    'transcendental equation',
    'algebraic equation',
  ];

  const hasCoursePhrase = courseSpecificPhrases.some((phrase) => q.includes(phrase));

  // Concept questions about specific methods taught in Unit-I
  const methodConceptPhrases = [
    'what is the bisection method',
    'what is bisection',
    'bisection method',
    'false position formula',
    'regula falsi formula',
    'what is false position',
    'what is regula falsi',
    'newton-raphson formula',
    'newton raphson formula',
    'what is newton raphson',
    'when do i stop',
    'when to stop',
    'how do i calculate the midpoint',
    'how do i update the interval',
  ];
  const hasMethodConcept = methodConceptPhrases.some((phrase) => q.includes(phrase));

  if (hasCoursePhrase || hasMethodConcept || (context?.currentLessonSection && detectedMethod)) {
    return {
      intent: 'COURSE_SPECIFIC',
      confidence: 0.85,
      targetMethod: detectedMethod || (context?.method as any) || undefined,
      explanation: 'Query asks about official course conventions, rules, formulas, or slides.',
    };
  }

  // 3. Solver Explanation
  if (
    q.includes('step through') ||
    q.includes('show all iterations') ||
    q.includes('solve this with me') ||
    q.includes('solve this in detail') ||
    q.includes('solve in detail') ||
    q.includes('detailed solution') ||
    q.includes('explain step by step')
  ) {
    return {
      intent: 'SOLVER_EXPLANATION',
      confidence: 0.8,
      targetMethod: (context?.method as any) || detectedMethod || undefined,
      explanation: 'Student requested procedural solver steps.',
    };
  }

  // 4. Default to General
  return {
    intent: 'GENERAL',
    confidence: 0.7,
    targetMethod: detectedMethod || undefined,
    explanation: 'General mathematical or comparative inquiry not requiring official course notes.',
  };
}
