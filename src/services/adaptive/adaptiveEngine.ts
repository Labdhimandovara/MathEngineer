/**
 * Deterministic Adaptive Learning & Personalization Engine (Phase 11)
 * 
 * Provides pure, testable functions for:
 * - deriveAdaptiveTopicStates: structured state across syllabus methods
 * - detectWeakTopics: conservative, multi-factor weak topic diagnostics
 * - detectStrengths: neutral descriptive pattern recognition of student success
 * - deriveLearningFocus: primary current learning direction
 * - recommendNextPractice: deterministic recommendation ranking with method balance
 * - buildSessionPlan: lightweight 3-step "Today's Focus"
 * - deriveAssessmentRecommendations: post-quiz actionable guidance
 * 
 * Guarantees:
 * - 0 Gemini API calls.
 * - 0 black-box scores.
 * - Every recommendation references verified PRACTICE_QUESTIONS or registered images.
 * - No difficulty or question fabrication.
 */

import { LearningAttempt, MistakeCategory } from '../../types/learning.ts';
import { AssessmentSession } from '../assessment/assessmentTypes.ts';
import { MethodId } from '../progress/progressTypes.ts';
import { PRACTICE_QUESTIONS, PracticeQuestion, QuestionDifficulty } from '../../data/practiceQuestions.ts';
import {
  AdaptiveState,
  AdaptiveTopicState,
  WeakTopicSignal,
  TopicStrength,
  LearningFocus,
  AdaptiveRecommendation,
  SessionPlan,
  SessionPlanStep,
  AssessmentRecommendation,
} from './adaptiveTypes.ts';
import { calculateRecencyMetrics } from './recencyModel.ts';
import { aggregateMistakes, formatMistakeLabel, getMethodDisplayName, METHOD_IDS } from '../learning/learningAnalytics.ts';

/**
 * Derives structured adaptive states for all supported syllabus methods
 */
export function deriveAdaptiveTopicStates(
  attempts: LearningAttempt[],
  assessments: AssessmentSession[] = []
): Record<MethodId, AdaptiveTopicState> {
  const result: Partial<Record<MethodId, AdaptiveTopicState>> = {};

  for (const method of METHOD_IDS) {
    const methodAttempts = attempts.filter((a) => a.method === method);
    const completedAttempts = methodAttempts.filter(
      (a) => a.status === 'completed' && a.correct !== undefined
    );

    // Filter assessments for this method or mixed containing this method
    const methodAssessments = assessments.filter(
      (s) => s.status === 'completed' && (s.method === method || s.method === 'mixed' || !s.method)
    );

    let assessmentCorrect = 0;
    let assessmentTotal = 0;
    for (const sess of methodAssessments) {
      for (const qId of sess.questionIds) {
        const q = PRACTICE_QUESTIONS.find((item) => item.id === qId);
        if (q && q.method === method) {
          const ans = sess.answers[qId];
          if (ans && ans.isAnswered) {
            assessmentTotal += 1;
            if (ans.correct) assessmentCorrect += 1;
          }
        }
      }
    }

    const assessmentAccuracy =
      assessmentTotal > 0 ? Math.round((assessmentCorrect / assessmentTotal) * 100) : 0;

    const recency = calculateRecencyMetrics(methodAttempts);
    const mistakes = aggregateMistakes(completedAttempts);
    const repeatedMistake = mistakes.find((m) => m.count >= 2);

    const solutionViewCount = completedAttempts.filter((a) => a.solutionViewed).length;
    const totalHints = completedAttempts.reduce((sum, a) => sum + (a.hintsUsed || 0), 0);
    const avgHints = completedAttempts.length > 0 ? parseFloat((totalHints / completedAttempts.length).toFixed(1)) : 0;

    // Last practiced timestamp
    const sortedCompleted = [...completedAttempts].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
    const lastPracticedAt = sortedCompleted[0]?.startedAt;

    // Determine state
    let state: AdaptiveState = 'not-started';
    const evidenceSummary: string[] = [];

    if (completedAttempts.length === 0) {
      state = 'not-started';
      evidenceSummary.push('No completed problem attempts recorded yet.');
    } else if (completedAttempts.length === 1) {
      state = 'introduced';
      evidenceSummary.push(
        `1 problem attempted (${completedAttempts[0].correct ? 'correct' : 'incorrect'}).`
      );
    } else {
      // Check for needs-review triggers
      const hasLowRecentAccuracy = recency.weightedAccuracy < 50;
      const hasRepeatedMistake = repeatedMistake !== undefined;
      const hasLowAssessmentAccuracy = assessmentTotal >= 2 && assessmentAccuracy < 50;

      // Conflict: high practice with hints, but low assessment
      const hasAssessmentConflict =
        assessmentTotal >= 2 &&
        assessmentAccuracy < 50 &&
        recency.unweightedAccuracy >= 65 &&
        avgHints >= 1.0;

      if (hasLowRecentAccuracy || hasRepeatedMistake || hasLowAssessmentAccuracy || hasAssessmentConflict) {
        state = 'needs-review';
        if (hasRepeatedMistake) {
          evidenceSummary.push(
            `Repeated error: ${formatMistakeLabel(repeatedMistake.category)} (${repeatedMistake.count} occurrences).`
          );
        }
        if (hasLowRecentAccuracy) {
          evidenceSummary.push(
            `Recent accuracy is ${recency.weightedAccuracy}% across last ${recency.totalConsidered} attempts.`
          );
        }
        if (hasAssessmentConflict) {
          evidenceSummary.push(
            `Independent quiz accuracy (${assessmentAccuracy}%) contrasts with guided practice reliance.`
          );
        } else if (hasLowAssessmentAccuracy) {
          evidenceSummary.push(
            `Assessment accuracy is ${assessmentAccuracy}% across ${assessmentTotal} quiz questions.`
          );
        }
      } else if (
        completedAttempts.length >= 3 &&
        recency.weightedAccuracy >= 75 &&
        recency.avgHintsUsed <= 1.5 &&
        recency.weightedUnassistedAccuracy >= 50
      ) {
        state = 'consistent';
        evidenceSummary.push(
          `Consistent unassisted accuracy (${recency.weightedAccuracy}% weighted) with low hint usage (${recency.avgHintsUsed} avg).`
        );
      } else if (
        completedAttempts.length >= 3 &&
        recency.weightedAccuracy >= 40
      ) {
        state = 'developing';
        evidenceSummary.push(
          `Developing proficiency (${recency.weightedAccuracy}% weighted accuracy across ${recency.totalConsidered} recent attempts).`
        );
      } else {
        state = 'practicing';
        evidenceSummary.push(
          `Active practice in progress (${completedAttempts.length} problems completed).`
        );
      }
    }

    result[method] = {
      method,
      topic: getMethodDisplayName(method),
      state,
      totalAttempts: methodAttempts.length,
      completedAttempts: completedAttempts.length,
      recentAccuracy: recency.unweightedAccuracy,
      weightedAccuracy: recency.weightedAccuracy,
      unassistedAccuracy: recency.weightedUnassistedAccuracy,
      assessmentAccuracy,
      assessmentAttemptCount: assessmentTotal,
      avgHints,
      solutionViewCount,
      recentMistakes: mistakes,
      lastPracticedAt,
      evidenceSummary,
    };
  }

  return result as Record<MethodId, AdaptiveTopicState>;
}

/**
 * Conservative evidence-based weak-topic detection
 */
export function detectWeakTopics(
  attempts: LearningAttempt[],
  assessments: AssessmentSession[] = []
): WeakTopicSignal[] {
  const states = deriveAdaptiveTopicStates(attempts, assessments);
  const signals: WeakTopicSignal[] = [];

  for (const method of METHOD_IDS) {
    const topicState = states[method];
    // Conservative rule: require at least 2 completed attempts
    if (topicState.completedAttempts < 2) continue;

    if (topicState.state === 'needs-review') {
      const methodAttempts = attempts.filter((a) => a.method === method && a.status === 'completed');
      const supportingIds = Array.from(
        new Set(methodAttempts.filter((a) => a.correct === false).map((a) => a.questionId))
      );

      const isSevere =
        topicState.weightedAccuracy < 35 ||
        (topicState.assessmentAttemptCount >= 2 && topicState.assessmentAccuracy < 40);

      signals.push({
        method,
        topic: topicState.topic,
        severity: isSevere ? 'needs-attention' : 'needs-review',
        reasons: topicState.evidenceSummary,
        supportingQuestionIds: supportingIds,
      });
    }
  }

  return signals;
}

/**
 * Detects observable positive strengths in neutral, descriptive language
 */
export function detectStrengths(
  attempts: LearningAttempt[],
  assessments: AssessmentSession[] = []
): TopicStrength[] {
  const states = deriveAdaptiveTopicStates(attempts, assessments);
  const strengths: TopicStrength[] = [];

  for (const method of METHOD_IDS) {
    const s = states[method];
    if (s.completedAttempts < 2) continue;

    const evidence: string[] = [];

    if (s.state === 'consistent') {
      evidence.push(
        `High weighted accuracy of ${s.weightedAccuracy}% with low hint reliance (${s.avgHints} avg hints).`
      );
    }

    if (s.assessmentAttemptCount >= 2 && s.assessmentAccuracy >= 80) {
      evidence.push(
        `Strong unassisted assessment accuracy of ${s.assessmentAccuracy}% across ${s.assessmentAttemptCount} quiz questions.`
      );
    }

    if (s.unassistedAccuracy >= 75) {
      evidence.push(
        `Demonstrated independent calculation capability with ${s.unassistedAccuracy}% unassisted accuracy.`
      );
    }

    if (evidence.length > 0) {
      strengths.push({
        method,
        topic: s.topic,
        description: `Consistent independent problem solving in ${s.topic}.`,
        evidence,
      });
    }
  }

  return strengths;
}

/**
 * Derives the single primary learning focus for the student
 */
export function deriveLearningFocus(
  attempts: LearningAttempt[],
  assessments: AssessmentSession[] = []
): LearningFocus {
  const completed = attempts.filter((a) => a.status === 'completed');
  const states = deriveAdaptiveTopicStates(attempts, assessments);
  const weakTopics = detectWeakTopics(attempts, assessments);

  // Case 0: Brand new student (0 attempts)
  if (completed.length === 0) {
    return {
      method: 'bisection',
      topic: 'Bisection Method',
      title: 'Getting Started: Opposite-Sign Bracketing',
      reason: 'Start with fundamental opposite-sign bracketing to establish core numerical foundations.',
      evidence: ['No previous problem attempts recorded.'],
      suggestedAction: 'practice',
      targetQuestionId: 'pq-bis-1',
    };
  }

  // Priority 1: Weak Topic remediation
  if (weakTopics.length > 0) {
    const weak = weakTopics[0];
    const targetQ = PRACTICE_QUESTIONS.find(
      (q) => q.method === weak.method && q.difficulty === 'Beginner'
    );
    return {
      method: weak.method,
      topic: weak.topic,
      title: `Reinforce ${weak.topic}`,
      reason: weak.reasons[0] || 'Targeted review recommended based on recent attempts.',
      evidence: weak.reasons,
      suggestedAction: 'review',
      targetQuestionId: targetQ?.id,
    };
  }

  // Priority 2: Unresolved failed question
  const lastFailed = [...completed]
    .reverse()
    .find((a) => a.correct === false && !completed.some((c) => c.questionId === a.questionId && c.correct === true));

  if (lastFailed) {
    const q = PRACTICE_QUESTIONS.find((item) => item.id === lastFailed.questionId);
    if (q) {
      return {
        method: lastFailed.method as MethodId,
        topic: getMethodDisplayName(lastFailed.method as MethodId),
        title: `Retry Unresolved Problem: ${q.title}`,
        reason: 'Solidify your calculation technique by retrying this recently attempted problem.',
        evidence: [`Previous attempt on ${q.id} was not fully converged.`],
        suggestedAction: 'practice',
        targetQuestionId: q.id,
      };
    }
  }

  // Priority 3: Unattempted Method (encourage balanced curriculum study)
  for (const m of METHOD_IDS) {
    if (states[m].state === 'not-started') {
      const q = PRACTICE_QUESTIONS.find((item) => item.method === m && item.difficulty === 'Beginner');
      return {
        method: m,
        topic: states[m].topic,
        title: `Explore ${states[m].topic}`,
        reason: `You have not yet practiced ${states[m].topic}. Try a starter problem.`,
        evidence: [`0 completed attempts recorded for ${states[m].topic}.`],
        suggestedAction: 'practice',
        targetQuestionId: q?.id,
      };
    }
  }

  // Priority 4: Progression / Assessment readiness
  const developingMethod = METHOD_IDS.find((m) => states[m].state === 'developing');
  if (developingMethod) {
    return {
      method: developingMethod,
      topic: states[developingMethod].topic,
      title: `Advance in ${states[developingMethod].topic}`,
      reason: 'Build consistent accuracy by tackling intermediate course problems.',
      evidence: states[developingMethod].evidenceSummary,
      suggestedAction: 'practice',
    };
  }

  // Priority 5: Consistent across methods -> challenge / mixed quiz
  return {
    method: 'mixed',
    topic: 'Mixed Numerical Techniques',
    title: 'Test Independent Mastery',
    reason: 'Demonstrated consistent performance across individual methods. Practice mixed problems or a timed quiz.',
    evidence: ['All active syllabus methods show developing or consistent proficiency.'],
    suggestedAction: 'quiz',
    targetQuestionId: 'pq-mix-1',
  };
}

/**
 * Deterministically recommends next practice problems with method balance
 */
export function recommendNextPractice(
  attempts: LearningAttempt[],
  assessments: AssessmentSession[] = [],
  options: { count?: number; excludeQuestionId?: string } = {}
): AdaptiveRecommendation[] {
  const targetCount = options.count ?? 3;
  const recommendations: AdaptiveRecommendation[] = [];
  const addedQuestionIds = new Set<string>();
  if (options.excludeQuestionId) {
    addedQuestionIds.add(options.excludeQuestionId);
  }

  const completed = attempts.filter((a) => a.status === 'completed');
  const solvedQuestionIds = new Set<string>();
  for (const a of completed) {
    if (a.correct === true) {
      solvedQuestionIds.add(a.questionId);
    }
  }

  const states = deriveAdaptiveTopicStates(attempts, assessments);
  const weakTopics = detectWeakTopics(attempts, assessments);

  // Strategy 1: Weak Topic Remediation (Priority 1)
  if (weakTopics.length > 0) {
    const weak = weakTopics[0];
    const candidate =
      PRACTICE_QUESTIONS.find((q) => q.method === weak.method && !solvedQuestionIds.has(q.id) && q.difficulty === 'Beginner') ||
      PRACTICE_QUESTIONS.find((q) => q.method === weak.method && !solvedQuestionIds.has(q.id) && q.difficulty === 'Intermediate') ||
      PRACTICE_QUESTIONS.find((q) => q.method === weak.method && !solvedQuestionIds.has(q.id)) ||
      PRACTICE_QUESTIONS.find((q) => q.method === weak.method);

    if (candidate && !addedQuestionIds.has(candidate.id)) {
      recommendations.push({
        id: `rec_weak_${candidate.id}`,
        questionId: candidate.id,
        method: candidate.method,
        type: 'remediation',
        title: candidate.title,
        difficulty: candidate.difficulty,
        equation: candidate.equationDisplay,
        reason: `Targeted review recommended: ${weak.reasons[0]}`,
        evidence: weak.reasons,
        priority: 1,
        action: 'review',
      });
      addedQuestionIds.add(candidate.id);
    }
  }

  // Strategy 2: Unresolved Problem Retry (Priority 2)
  const lastFailed = [...completed]
    .reverse()
    .find((a) => a.correct === false && !solvedQuestionIds.has(a.questionId));

  if (lastFailed) {
    const candidate = PRACTICE_QUESTIONS.find((q) => q.id === lastFailed.questionId);
    if (candidate && !addedQuestionIds.has(candidate.id)) {
      recommendations.push({
        id: `rec_retry_${candidate.id}`,
        questionId: candidate.id,
        method: candidate.method,
        type: 'retry',
        title: candidate.title,
        difficulty: candidate.difficulty,
        equation: candidate.equationDisplay,
        reason: 'Solidify your calculation technique by retrying this recently attempted problem.',
        evidence: [`Previous attempt on ${candidate.id} was not fully converged.`],
        priority: 2,
        action: 'retry',
      });
      addedQuestionIds.add(candidate.id);
    }
  }

  // Strategy 3: Method Balance & Variety (Avoid endless remediation!)
  // If we already added a remediation problem, pick a problem from a DIFFERENT method
  for (const m of METHOD_IDS) {
    if (recommendations.length >= targetCount) break;

    const mState = states[m];
    // Pick unsolved question matching current state difficulty
    let targetDiff: QuestionDifficulty = 'Beginner';
    if (mState.state === 'consistent') {
      targetDiff = 'Advanced';
    } else if (mState.state === 'developing') {
      targetDiff = 'Intermediate';
    }

    const candidate =
      PRACTICE_QUESTIONS.find((q) => q.method === m && !solvedQuestionIds.has(q.id) && q.difficulty === targetDiff) ||
      PRACTICE_QUESTIONS.find((q) => q.method === m && !solvedQuestionIds.has(q.id)) ||
      PRACTICE_QUESTIONS.find((q) => q.method === m && !addedQuestionIds.has(q.id));

    if (candidate && !addedQuestionIds.has(candidate.id)) {
      const isProgression = mState.state === 'consistent' || mState.state === 'developing';
      recommendations.push({
        id: `rec_${isProgression ? 'prog' : 'var'}_${candidate.id}`,
        questionId: candidate.id,
        method: candidate.method,
        type: isProgression ? 'progression' : 'variety',
        title: candidate.title,
        difficulty: candidate.difficulty,
        equation: candidate.equationDisplay,
        reason: isProgression
          ? `Progress to ${candidate.difficulty} level in ${mState.topic}.`
          : `Explore and practice fundamental problems in ${mState.topic}.`,
        evidence: mState.evidenceSummary,
        priority: isProgression ? 3 : 4,
        action: 'practice',
      });
      addedQuestionIds.add(candidate.id);
    }
  }

  // Strategy 4: Comparative Mixed problem if student has practiced multiple methods
  if (recommendations.length < targetCount) {
    const mixedCandidate = PRACTICE_QUESTIONS.find(
      (q) => q.method === 'mixed' && !solvedQuestionIds.has(q.id) && !addedQuestionIds.has(q.id)
    ) || PRACTICE_QUESTIONS.find((q) => q.method === 'mixed' && !addedQuestionIds.has(q.id));

    if (mixedCandidate) {
      recommendations.push({
        id: `rec_mix_${mixedCandidate.id}`,
        questionId: mixedCandidate.id,
        method: 'mixed',
        type: 'mixed',
        title: mixedCandidate.title,
        difficulty: mixedCandidate.difficulty,
        equation: mixedCandidate.equationDisplay,
        reason: 'Compare multiple numerical algorithms on the same equation to build exam versatility.',
        evidence: ['Reinforce method selection and speed benchmarks.'],
        priority: 5,
        action: 'practice',
      });
      addedQuestionIds.add(mixedCandidate.id);
    }
  }

  // Fallback for new students or fully completed questions: ensure at least 1 starter question
  if (recommendations.length === 0) {
    const starter = PRACTICE_QUESTIONS[0];
    recommendations.push({
      id: `rec_starter_${starter.id}`,
      questionId: starter.id,
      method: starter.method,
      type: 'variety',
      title: starter.title,
      difficulty: starter.difficulty,
      equation: starter.equationDisplay,
      reason: 'Begin your numerical methods study with this fundamental opposite-sign bracket problem.',
      evidence: ['Essential starting problem.'],
      priority: 1,
      action: 'practice',
    });
  }

  return recommendations.slice(0, targetCount);
}

/**
 * Generates a lightweight, non-mandatory 3-step session plan ("Today's Focus")
 */
export function buildSessionPlan(
  attempts: LearningAttempt[],
  assessments: AssessmentSession[] = []
): SessionPlan {
  const focus = deriveLearningFocus(attempts, assessments);
  const recommendations = recommendNextPractice(attempts, assessments, { count: 3 });
  const completed = attempts.filter((a) => a.status === 'completed');

  const steps: SessionPlanStep[] = [];

  // Step 1: Review or Warmup
  if (focus.suggestedAction === 'review') {
    steps.push({
      stepNumber: 1,
      title: 'Review Diagnostic Topic',
      type: 'review',
      description: focus.reason,
      method: focus.method,
      questionId: focus.targetQuestionId,
      completed: false,
    });
  } else {
    steps.push({
      stepNumber: 1,
      title: 'Warmup Problem',
      type: 'practice',
      description: 'Solve one targeted starter problem to calibrate precision.',
      method: recommendations[0]?.method || 'bisection',
      questionId: recommendations[0]?.questionId || 'pq-bis-1',
      completed: completed.length > 0,
    });
  }

  // Step 2: Core Practice Problem
  const coreRec = recommendations.find((r) => r.type === 'progression' || r.type === 'variety') || recommendations[0];
  steps.push({
    stepNumber: 2,
    title: 'Core Practice Problem',
    type: 'practice',
    description: coreRec ? coreRec.reason : 'Tackle a verified course problem with step-by-step validation.',
    method: coreRec?.method || 'bisection',
    questionId: coreRec?.questionId || 'pq-bis-2',
    completed: false,
  });

  // Step 3: Independent Check / Quiz
  steps.push({
    stepNumber: 3,
    title: 'Independent Assessment Check',
    type: 'assessment',
    description: 'Complete a 5-question Quick Quiz under unassisted conditions.',
    method: 'mixed',
    completed: assessments.some((a) => a.status === 'completed'),
  });

  return {
    generatedAt: new Date().toISOString(),
    focusMethod: focus.method,
    summary: focus.title,
    steps,
  };
}

/**
 * Derives actionable next steps for a student immediately after completing an assessment
 */
export function deriveAssessmentRecommendations(
  session: AssessmentSession,
  attempts: LearningAttempt[] = []
): AssessmentRecommendation[] {
  const recs: AssessmentRecommendation[] = [];
  if (!session.results) return recs;

  const res = session.results;

  // 1. Check for specific incorrect answers and mistakes in the quiz
  for (const qId of session.questionIds) {
    const ans = session.answers[qId];
    const q = PRACTICE_QUESTIONS.find((item) => item.id === qId);
    if (!q || !ans) continue;

    if (!ans.correct) {
      const mistake = ans.mistakeCategories?.[0];
      const mistakeReason = mistake
        ? `Review your calculation step: ${formatMistakeLabel(mistake)} was detected.`
        : `Root calculation did not reach required tolerance (${q.decimalPlaces} decimal places).`;

      recs.push({
        method: q.method,
        title: `Review ${q.title} (${q.id})`,
        reason: mistakeReason,
        actionText: 'Review Solution',
        targetQuestionId: q.id,
        targetPage: 'review',
      });
      break; // Only pick the first prominent mistake to avoid overwhelming
    }
  }

  // 2. Check for assisted questions in the quiz
  const assistedCount = session.questionIds.filter((qId) => session.answers[qId]?.isAssisted).length;
  if (assistedCount > 0) {
    recs.push({
      method: session.method || 'mixed',
      title: 'Practice Unassisted Solving',
      reason: `${assistedCount} quiz question(s) utilized hints or solutions. Try solving similar problems independently.`,
      actionText: 'Practice Independently',
      targetPage: 'practice',
    });
  }

  // 3. High score recognition or progression
  if (res.accuracy >= 80 && res.unassistedAccuracy >= 60) {
    recs.push({
      method: 'mixed',
      title: 'Advance to Timed Sprint',
      reason: `Excellent quiz accuracy (${res.accuracy}%). Challenge yourself in a 5-minute timed sprint.`,
      actionText: 'Take Timed Quiz',
      targetPage: 'quiz',
    });
  } else if (recs.length === 0) {
    // Perfect score fallback
    recs.push({
      method: session.method || 'mixed',
      title: 'Keep Up the Momentum',
      reason: 'All quiz answers satisfied required tolerances. Continue with daily practice.',
      actionText: 'Explore Questions',
      targetPage: 'practice',
    });
  }

  return recs;
}
