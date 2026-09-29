/**
 * Deterministic Practice Recommendation Service for MathEngineer
 * 
 * Generates transparent, explainable recommendations strictly tied to
 * mathematically verified problems in PRACTICE_QUESTIONS.
 * 
 * Prioritization:
 * 1. Weak Topic Remediation (conservative evidence)
 * 2. Unresolved Problem Retries (most recent failed attempt)
 * 3. Unexplored Methods (methods with 0 attempts)
 * 4. Progressive Skill Advancement (next unsolved difficulty level)
 * 
 * Never fabricates question IDs. Zero AI dependencies.
 */

import { LearningAttempt, PracticeRecommendation } from '../../types/learning.ts';
import { PRACTICE_QUESTIONS, PracticeQuestion } from '../../data/practiceQuestions.ts';
import {
  detectWeakTopics,
  calculateTopicState,
  getMethodDisplayName,
  METHOD_IDS,
} from './learningAnalytics.ts';
import { MethodId } from '../progress/progressTypes.ts';

export function recommendPractice(
  attempts: LearningAttempt[],
  allQuestions: PracticeQuestion[] = PRACTICE_QUESTIONS
): PracticeRecommendation[] {
  const recommendations: PracticeRecommendation[] = [];
  const addedQuestionIds = new Set<string>();

  // 1. Determine which questions have already been solved correctly
  const solvedQuestionIds = new Set<string>();
  for (const a of attempts) {
    if (a.status === 'completed' && a.correct === true) {
      solvedQuestionIds.add(a.questionId);
    }
  }

  // 2. Priority 1: Weak Topic Remediation
  const weakTopics = detectWeakTopics(attempts);
  for (const weak of weakTopics) {
    // Find an unsolved question for this weak method (prefer Beginner, then Intermediate)
    const candidates = allQuestions.filter(
      (q) => q.method === weak.method && !solvedQuestionIds.has(q.id)
    );
    const targetQ =
      candidates.find((q) => q.difficulty === 'Beginner') ||
      candidates.find((q) => q.difficulty === 'Intermediate') ||
      candidates[0];

    if (targetQ && !addedQuestionIds.has(targetQ.id)) {
      recommendations.push({
        questionId: targetQ.id,
        title: targetQ.title,
        method: targetQ.method,
        difficulty: targetQ.difficulty.toLowerCase() as any,
        equation: targetQ.equationDisplay,
        reason: `Targeted review recommended: ${weak.reasons[0]}`,
        action: 'review',
      });
      addedQuestionIds.add(targetQ.id);
    }
  }

  // 3. Priority 2: Unresolved Retry (most recently failed question not yet solved)
  const completedAttempts = attempts.filter((a) => a.status === 'completed');
  const lastFailed = [...completedAttempts]
    .reverse()
    .find((a) => a.correct === false && !solvedQuestionIds.has(a.questionId));

  if (lastFailed) {
    const targetQ = allQuestions.find((q) => q.id === lastFailed.questionId);
    if (targetQ && !addedQuestionIds.has(targetQ.id)) {
      recommendations.push({
        questionId: targetQ.id,
        title: targetQ.title,
        method: targetQ.method,
        difficulty: targetQ.difficulty.toLowerCase() as any,
        equation: targetQ.equationDisplay,
        reason: 'Solidify your calculation technique by retrying this recently attempted problem.',
        action: 'retry',
      });
      addedQuestionIds.add(targetQ.id);
    }
  }

  // 4. Priority 3: Unattempted Methods (encourage balanced curriculum study)
  for (const method of METHOD_IDS) {
    const hasAttempts = attempts.some((a) => a.method === method);
    if (!hasAttempts) {
      const firstQ = allQuestions.find(
        (q) => q.method === method && q.difficulty === 'Beginner'
      );
      if (firstQ && !addedQuestionIds.has(firstQ.id)) {
        recommendations.push({
          questionId: firstQ.id,
          title: firstQ.title,
          method: firstQ.method,
          difficulty: firstQ.difficulty.toLowerCase() as any,
          equation: firstQ.equationDisplay,
          reason: `Explore ${getMethodDisplayName(method)}: start with this fundamental problem.`,
          action: 'practice',
        });
        addedQuestionIds.add(firstQ.id);
      }
    }
  }

  // 5. Priority 4: Progressive Skill Advancement for developing/consistent methods
  for (const method of METHOD_IDS) {
    const state = calculateTopicState(attempts, method);
    if (state === 'developing' || state === 'consistent') {
      const nextQ = allQuestions.find(
        (q) =>
          q.method === method &&
          !solvedQuestionIds.has(q.id) &&
          (state === 'consistent' ? q.difficulty === 'Advanced' : q.difficulty === 'Intermediate')
      );
      if (nextQ && !addedQuestionIds.has(nextQ.id)) {
        recommendations.push({
          questionId: nextQ.id,
          title: nextQ.title,
          method: nextQ.method,
          difficulty: nextQ.difficulty.toLowerCase() as any,
          equation: nextQ.equationDisplay,
          reason: `Advance your proficiency in ${getMethodDisplayName(method)} with this higher-level problem.`,
          action: 'practice',
        });
        addedQuestionIds.add(nextQ.id);
      }
    }
  }

  // 6. Default Fallback for New Students (Empty History)
  if (recommendations.length === 0) {
    const starterQ = allQuestions.find((q) => q.id === 'pq-bis-1') || allQuestions[0];
    if (starterQ) {
      recommendations.push({
        questionId: starterQ.id,
        title: starterQ.title,
        method: starterQ.method,
        difficulty: starterQ.difficulty.toLowerCase() as any,
        equation: starterQ.equationDisplay,
        reason: 'Begin your numerical methods practice with this fundamental Bisection problem.',
        action: 'practice',
      });
    }
  }

  return recommendations.slice(0, 3);
}
