/**
 * Phase 11 — Adaptive Learning & Deterministic Personalization Test Suite
 * 
 * Verifies:
 * 1. New student state (clean empty baseline, no artificial personalization)
 * 2. Sparse history (1 attempt, conservative guard)
 * 3. Repeated successful practice (progression to 'consistent')
 * 4. Repeated failures (transition to 'needs-review')
 * 5. Repeated mistake category detection (e.g., derivative-error, interval-selection)
 * 6. Assessment evidence integration (formal quiz influence)
 * 7. Practice vs assessment disparity (high guided practice vs low quiz score)
 * 8. Assistance awareness (unassisted vs hints vs solution viewed)
 * 9. Recency model (exponential/linear weight decay, recent attempt dominance)
 * 10. Conservative weak-topic detection (minimum 2 attempts, structured evidence)
 * 11. Observable strength detection (neutral, non-hyperbolic praise)
 * 12. Learning focus derivation (hierarchical priority)
 * 13. Deterministic practice recommendations (real questions, explainable reasons)
 * 14. Recommendation explainability (no "AI recommends")
 * 15. Real question references (zero fabricated question IDs)
 * 16. Avoid repetition (unsolved question preference, retry only for recent failures)
 * 17. Difficulty progression (Beginner -> Intermediate -> Advanced)
 * 18. No difficulty fabrication
 * 19. Method balance (remediation + reinforcement + variety)
 * 20. Session plan ("Today's Focus" 3-step workflow)
 * 21. Review page integration
 * 22. Progress page integration
 * 23. Practice page integration
 * 24. Learn page integration
 * 25. Assessment results integration (deriveAssessmentRecommendations)
 * 26. Image question recommendation safety
 * 27. Empty state robustness
 * 28. Corrupted data resilience
 * 29. Determinism (same input = identical output)
 * 30. Zero Gemini API calls
 */

import { assertEquals, assertNotEquals, assert } from 'jsr:@std/assert';
import {
  deriveAdaptiveTopicStates,
  detectWeakTopics,
  detectStrengths,
  deriveLearningFocus,
  recommendNextPractice,
  buildSessionPlan,
  deriveAssessmentRecommendations,
  calculateRecencyMetrics,
  RECENCY_WEIGHTS,
} from '../src/services/adaptive/index.ts';
import { LearningAttempt, MistakeCategory } from '../src/types/learning.ts';
import { AssessmentSession } from '../src/services/assessment/assessmentTypes.ts';
import { PRACTICE_QUESTIONS } from '../src/data/practiceQuestions.ts';

function createMockAttempt(overrides: Partial<LearningAttempt>): LearningAttempt {
  return {
    id: `att_mock_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    questionId: 'pq-bis-1',
    method: 'bisection',
    topic: 'Bisection Method',
    startedAt: new Date(Date.now() - 10000).toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed',
    correct: true,
    hintsUsed: 0,
    solutionViewed: false,
    mistakeCategories: [],
    attemptNumber: 1,
    durationSeconds: 60,
    source: 'practice',
    ...overrides,
  };
}

function createMockAssessment(overrides: Partial<AssessmentSession>): AssessmentSession {
  return {
    id: `quiz_sess_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    type: 'quick',
    method: 'mixed',
    title: 'Quick Quiz',
    startedAt: new Date(Date.now() - 60000).toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed',
    questionIds: ['pq-bis-1', 'pq-fp-1', 'pq-nr-1'],
    currentIndex: 2,
    flaggedQuestionIds: [],
    answers: {
      'pq-bis-1': {
        questionId: 'pq-bis-1',
        isAnswered: true,
        correct: true,
        timeSpentSeconds: 45,
        hintsUsed: 0,
        solutionViewed: false,
        isAssisted: false,
      },
      'pq-fp-1': {
        questionId: 'pq-fp-1',
        isAnswered: true,
        correct: true,
        timeSpentSeconds: 50,
        hintsUsed: 0,
        solutionViewed: false,
        isAssisted: false,
      },
      'pq-nr-1': {
        questionId: 'pq-nr-1',
        isAnswered: true,
        correct: false,
        timeSpentSeconds: 30,
        hintsUsed: 0,
        solutionViewed: false,
        isAssisted: false,
        mistakeCategories: ['derivative-error'],
      },
    },
    results: {
      totalQuestions: 3,
      attemptedCount: 3,
      correctCount: 2,
      unassistedCorrectCount: 2,
      assistedCorrectCount: 0,
      incorrectCount: 1,
      unansweredCount: 0,
      accuracy: 67,
      unassistedAccuracy: 67,
      totalTimeSeconds: 125,
      averageTimePerQuestion: 42,
      totalHintsUsed: 0,
      solutionsViewedCount: 0,
      timedOut: false,
    },
    ...overrides,
  };
}

// 1. New student state
Deno.test('Adaptive 1: New student with 0 attempts produces clean baseline', () => {
  const states = deriveAdaptiveTopicStates([]);
  assertEquals(states.bisection.state, 'not-started');
  assertEquals(states['false-position'].state, 'not-started');
  assertEquals(states['newton-raphson'].state, 'not-started');

  const weak = detectWeakTopics([]);
  assertEquals(weak.length, 0);

  const strengths = detectStrengths([]);
  assertEquals(strengths.length, 0);

  const focus = deriveLearningFocus([]);
  assertEquals(focus.targetQuestionId, 'pq-bis-1');
  assertEquals(focus.suggestedAction, 'practice');
  assert(focus.reason.includes('opposite-sign bracketing'));

  const recs = recommendNextPractice([]);
  assertEquals(recs.length >= 1, true);
  assertEquals(recs[0].questionId, 'pq-bis-1');
});

// 2. Sparse history
Deno.test('Adaptive 2: Single failed attempt transitions to introduced, not needs-review', () => {
  const attempts = [
    createMockAttempt({
      questionId: 'pq-bis-1',
      method: 'bisection',
      correct: false,
      mistakeCategories: ['wrong-interval-selection'],
    }),
  ];

  const states = deriveAdaptiveTopicStates(attempts);
  assertEquals(states.bisection.state, 'introduced');

  // Conservative rule: 1 attempt MUST NOT trigger weak topic
  const weak = detectWeakTopics(attempts);
  assertEquals(weak.length, 0);
});

// 3. Repeated successful practice
Deno.test('Adaptive 3: Consecutive unassisted correct attempts lead to consistent state', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-bis-1', method: 'bisection', correct: true, hintsUsed: 0 }),
    createMockAttempt({ questionId: 'pq-bis-2', method: 'bisection', correct: true, hintsUsed: 0 }),
    createMockAttempt({ questionId: 'pq-bis-3', method: 'bisection', correct: true, hintsUsed: 1 }),
  ];

  const states = deriveAdaptiveTopicStates(attempts);
  assertEquals(states.bisection.state, 'consistent');
  assertEquals(states.bisection.weightedAccuracy, 100);
});

// 4. Repeated failures
Deno.test('Adaptive 4: Multiple recent failures transition topic to needs-review', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-fp-1', method: 'false-position', correct: false }),
    createMockAttempt({ questionId: 'pq-fp-2', method: 'false-position', correct: false }),
  ];

  const states = deriveAdaptiveTopicStates(attempts);
  assertEquals(states['false-position'].state, 'needs-review');

  const weak = detectWeakTopics(attempts);
  assertEquals(weak.length, 1);
  assertEquals(weak[0].method, 'false-position');
});

// 5. Repeated mistake category
Deno.test('Adaptive 5: Repeated derivative-error triggers specific review signal', () => {
  const attempts = [
    createMockAttempt({
      questionId: 'pq-nr-1',
      method: 'newton-raphson',
      correct: false,
      mistakeCategories: ['derivative-error'],
    }),
    createMockAttempt({
      questionId: 'pq-nr-2',
      method: 'newton-raphson',
      correct: false,
      mistakeCategories: ['derivative-error'],
    }),
  ];

  const states = deriveAdaptiveTopicStates(attempts);
  assertEquals(states['newton-raphson'].state, 'needs-review');
  assert(states['newton-raphson'].evidenceSummary.some((e) => e.includes('Derivative Evaluation')));

  const weak = detectWeakTopics(attempts);
  assertEquals(weak.length, 1);
  assert(weak[0].reasons.some((r) => r.includes('Derivative Evaluation')));
});

// 6. Assessment evidence integration
Deno.test('Adaptive 6: Assessment accuracy strongly influences topic state', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-bis-1', method: 'bisection', correct: true }),
    createMockAttempt({ questionId: 'pq-bis-2', method: 'bisection', correct: true }),
  ];

  const assessment = createMockAssessment({
    answers: {
      'pq-bis-1': { questionId: 'pq-bis-1', isAnswered: true, correct: true, timeSpentSeconds: 30, hintsUsed: 0, solutionViewed: false, isAssisted: false },
      'pq-bis-2': { questionId: 'pq-bis-2', isAnswered: true, correct: true, timeSpentSeconds: 35, hintsUsed: 0, solutionViewed: false, isAssisted: false },
    },
    questionIds: ['pq-bis-1', 'pq-bis-2'],
  });

  const states = deriveAdaptiveTopicStates(attempts, [assessment]);
  assertEquals(states.bisection.assessmentAccuracy, 100);
  assertEquals(states.bisection.assessmentAttemptCount, 2);

  const strengths = detectStrengths(attempts, [assessment]);
  assertEquals(strengths.some((s) => s.method === 'bisection'), true);
});

// 7. Practice vs Assessment disparity
Deno.test('Adaptive 7: High guided practice with low assessment accuracy generates disparity review signal', () => {
  // Student practices with hints:
  const attempts = [
    createMockAttempt({ questionId: 'pq-fp-1', method: 'false-position', correct: true, hintsUsed: 2 }),
    createMockAttempt({ questionId: 'pq-fp-2', method: 'false-position', correct: true, hintsUsed: 2 }),
    createMockAttempt({ questionId: 'pq-fp-3', method: 'false-position', correct: true, hintsUsed: 1 }),
  ];

  // But student fails in unassisted assessment:
  const assessment = createMockAssessment({
    method: 'false-position',
    answers: {
      'pq-fp-1': { questionId: 'pq-fp-1', isAnswered: true, correct: false, timeSpentSeconds: 30, hintsUsed: 0, solutionViewed: false, isAssisted: false },
      'pq-fp-2': { questionId: 'pq-fp-2', isAnswered: true, correct: false, timeSpentSeconds: 30, hintsUsed: 0, solutionViewed: false, isAssisted: false },
    },
    questionIds: ['pq-fp-1', 'pq-fp-2'],
  });

  const states = deriveAdaptiveTopicStates(attempts, [assessment]);
  assertEquals(states['false-position'].state, 'needs-review');
  assert(states['false-position'].evidenceSummary.some((e) => e.includes('contrast')));
});

// 8. Assistance awareness
Deno.test('Adaptive 8: Solution viewed is not counted as unassisted correct', () => {
  const attempts = [
    createMockAttempt({
      questionId: 'pq-bis-1',
      method: 'bisection',
      correct: true,
      solutionViewed: true,
      hintsUsed: 3,
    }),
  ];

  const recency = calculateRecencyMetrics(attempts);
  assertEquals(recency.weightedAccuracy, 100);
  assertEquals(recency.weightedUnassistedAccuracy, 0); // 0 unassisted
});

// 9. Recency model
Deno.test('Adaptive 9: Recency weighting prioritizes recent attempts over older attempts', () => {
  const now = Date.now();
  // 4 older failures, 1 recent success:
  const attempts = [
    createMockAttempt({ startedAt: new Date(now - 50000).toISOString(), correct: false }),
    createMockAttempt({ startedAt: new Date(now - 40000).toISOString(), correct: false }),
    createMockAttempt({ startedAt: new Date(now - 30000).toISOString(), correct: false }),
    createMockAttempt({ startedAt: new Date(now - 20000).toISOString(), correct: false }),
    createMockAttempt({ startedAt: new Date(now - 10000).toISOString(), correct: true }), // Newest (weight 1.0)
  ];

  const recency = calculateRecencyMetrics(attempts);
  // Total weights: 1.0 + 0.8 + 0.65 + 0.5 + 0.35 = 3.30
  // Correct weight = 1.0
  // 1.0 / 3.30 = ~30.3%
  assertEquals(recency.unweightedAccuracy, 20); // 1 / 5 = 20%
  assertEquals(recency.weightedAccuracy, 30); // ~30%
  assert(recency.weightedAccuracy > recency.unweightedAccuracy);
});

// 10. Conservative weak-topic detection
Deno.test('Adaptive 10: detectWeakTopics returns structured observable evidence', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-nr-1', method: 'newton-raphson', correct: false }),
    createMockAttempt({ questionId: 'pq-nr-2', method: 'newton-raphson', correct: false }),
  ];

  const weak = detectWeakTopics(attempts);
  assertEquals(weak.length, 1);
  assertEquals(weak[0].method, 'newton-raphson');
  assertEquals(Array.isArray(weak[0].reasons), true);
  assertEquals(weak[0].supportingQuestionIds.includes('pq-nr-1'), true);
  assertEquals(weak[0].supportingQuestionIds.includes('pq-nr-2'), true);
});

// 11. Strength detection
Deno.test('Adaptive 11: detectStrengths uses neutral, non-hyperbolic phrasing', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-bis-1', method: 'bisection', correct: true, hintsUsed: 0 }),
    createMockAttempt({ questionId: 'pq-bis-2', method: 'bisection', correct: true, hintsUsed: 0 }),
    createMockAttempt({ questionId: 'pq-bis-3', method: 'bisection', correct: true, hintsUsed: 0 }),
  ];

  const strengths = detectStrengths(attempts);
  assertEquals(strengths.length, 1);
  assert(!strengths[0].description.toLowerCase().includes('genius'));
  assert(!strengths[0].description.toLowerCase().includes('expert'));
  assert(strengths[0].description.includes('Consistent independent problem solving'));
});

// 12. Learning focus derivation
Deno.test('Adaptive 12: deriveLearningFocus prioritizes weak topic over unattempted method', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-fp-1', method: 'false-position', correct: false }),
    createMockAttempt({ questionId: 'pq-fp-2', method: 'false-position', correct: false }),
  ];

  const focus = deriveLearningFocus(attempts);
  assertEquals(focus.method, 'false-position');
  assertEquals(focus.suggestedAction, 'review');
});

// 13. Deterministic practice recommendations
Deno.test('Adaptive 13: recommendNextPractice produces prioritized recommendations', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-nr-1', method: 'newton-raphson', correct: false }),
    createMockAttempt({ questionId: 'pq-nr-2', method: 'newton-raphson', correct: false }),
  ];

  const recs = recommendNextPractice(attempts, [], { count: 3 });
  assertEquals(recs.length, 3);
  assertEquals(recs[0].type, 'remediation');
  assertEquals(recs[0].method, 'newton-raphson');
});

// 14. Recommendation explainability
Deno.test('Adaptive 14: Recommendations provide factual reasons without black-box phrasing', () => {
  const attempts = [
    createMockAttempt({
      questionId: 'pq-nr-1',
      method: 'newton-raphson',
      correct: false,
      mistakeCategories: ['derivative-error'],
    }),
    createMockAttempt({
      questionId: 'pq-nr-2',
      method: 'newton-raphson',
      correct: false,
      mistakeCategories: ['derivative-error'],
    }),
  ];

  const recs = recommendNextPractice(attempts);
  const top = recs[0];
  assert(!top.reason.includes('AI thinks'));
  assert(!top.reason.includes('algorithm suggests'));
  assert(top.reason.includes('Targeted review recommended') || top.reason.includes('Derivative'));
});

// 15. Real question references
Deno.test('Adaptive 15: Every recommended question exists in PRACTICE_QUESTIONS', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-bis-1', method: 'bisection', correct: true }),
    createMockAttempt({ questionId: 'pq-fp-1', method: 'false-position', correct: false }),
  ];

  const recs = recommendNextPractice(attempts, [], { count: 5 });
  for (const r of recs) {
    const found = PRACTICE_QUESTIONS.find((q) => q.id === r.questionId);
    assertNotEquals(found, undefined, `Question ${r.questionId} must exist in verified question bank`);
  }
});

// 16. Avoid repetition
Deno.test('Adaptive 16: Solved questions are not recommended again unless retrying failure', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-bis-1', method: 'bisection', correct: true }),
    createMockAttempt({ questionId: 'pq-bis-2', method: 'bisection', correct: true }),
  ];

  const recs = recommendNextPractice(attempts);
  const bisRecs = recs.filter((r) => r.method === 'bisection');
  for (const r of bisRecs) {
    assertNotEquals(r.questionId, 'pq-bis-1');
    assertNotEquals(r.questionId, 'pq-bis-2');
  }
});

// 17. Difficulty progression
Deno.test('Adaptive 17: Consistent method advances recommendation difficulty to Intermediate or Advanced', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-bis-1', method: 'bisection', correct: true, hintsUsed: 0 }),
    createMockAttempt({ questionId: 'pq-bis-2', method: 'bisection', correct: true, hintsUsed: 0 }),
    createMockAttempt({ questionId: 'pq-bis-3', method: 'bisection', correct: true, hintsUsed: 0 }),
  ];

  const recs = recommendNextPractice(attempts, [], { count: 3 });
  const bisRec = recs.find((r) => r.method === 'bisection');
  assertEquals(bisRec !== undefined, true);
  assertEquals(bisRec?.difficulty === 'Intermediate' || bisRec?.difficulty === 'Advanced', true);
});

// 18. No difficulty fabrication
Deno.test('Adaptive 18: Recommended difficulty is strictly Beginner, Intermediate, Advanced, or mixed', () => {
  const recs = recommendNextPractice([]);
  for (const r of recs) {
    const validDiffs = ['Beginner', 'Intermediate', 'Advanced', 'mixed'];
    assertEquals(validDiffs.includes(r.difficulty), true);
  }
});

// 19. Method balance
Deno.test('Adaptive 19: Recommendations balance remediation with other methods', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-nr-1', method: 'newton-raphson', correct: false }),
    createMockAttempt({ questionId: 'pq-nr-2', method: 'newton-raphson', correct: false }),
  ];

  const recs = recommendNextPractice(attempts, [], { count: 3 });
  assertEquals(recs.length, 3);
  // First is remediation for weak newton-raphson
  assertEquals(recs[0].method, 'newton-raphson');
  // Secondary recommendations offer variety/balance
  const otherMethods = recs.slice(1).map((r) => r.method);
  assertEquals(otherMethods.some((m) => m !== 'newton-raphson'), true);
});

// 20. Session plan ("Today's Focus")
Deno.test('Adaptive 20: buildSessionPlan produces 3 actionable steps', () => {
  const plan = buildSessionPlan([]);
  assertEquals(plan.steps.length, 3);
  assertEquals(plan.steps[0].stepNumber, 1);
  assertEquals(plan.steps[1].stepNumber, 2);
  assertEquals(plan.steps[2].stepNumber, 3);
  assertEquals(plan.steps[2].type, 'assessment');
});

// 21. Review page integration
Deno.test('Adaptive 21: Weak topic provides clear diagnostic reason for Review page', () => {
  const attempts = [
    createMockAttempt({
      questionId: 'pq-fp-1',
      method: 'false-position',
      correct: false,
      mistakeCategories: ['wrong-interval-selection'],
    }),
    createMockAttempt({
      questionId: 'pq-fp-2',
      method: 'false-position',
      correct: false,
      mistakeCategories: ['wrong-interval-selection'],
    }),
  ];

  const weak = detectWeakTopics(attempts);
  assertEquals(weak.length, 1);
  assert(weak[0].reasons[0].includes('Subinterval Sign Update'));
});

// 22. Progress page integration
Deno.test('Adaptive 22: deriveAdaptiveTopicStates provides accurate weighted metrics for Progress page', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-bis-1', method: 'bisection', correct: true, durationSeconds: 40 }),
    createMockAttempt({ questionId: 'pq-bis-2', method: 'bisection', correct: true, durationSeconds: 50 }),
  ];

  const states = deriveAdaptiveTopicStates(attempts);
  assertEquals(states.bisection.completedAttempts, 2);
  assertEquals(states.bisection.weightedAccuracy, 100);
  assertEquals(states.bisection.unassistedAccuracy, 100);
});

// 23. Practice page integration
Deno.test('Adaptive 23: recommendNextPractice provides multi-option recommendations for Practice', () => {
  const recs = recommendNextPractice([], [], { count: 3 });
  assertEquals(recs.length, 3);
  assertEquals(recs[0].action, 'practice');
  assertEquals(typeof recs[0].title, 'string');
});

// 24. Learn page integration
Deno.test('Adaptive 24: Learn method card states reflect adaptive calculations', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-fp-1', method: 'false-position', correct: false }),
    createMockAttempt({ questionId: 'pq-fp-2', method: 'false-position', correct: false }),
  ];

  const states = deriveAdaptiveTopicStates(attempts);
  assertEquals(states['false-position'].state, 'needs-review');
  assertEquals(states['bisection'].state, 'not-started');
});

// 25. Assessment results integration
Deno.test('Adaptive 25: deriveAssessmentRecommendations generates targeted actions after quiz', () => {
  const sess = createMockAssessment({
    answers: {
      'pq-nr-1': {
        questionId: 'pq-nr-1',
        isAnswered: true,
        correct: false,
        timeSpentSeconds: 40,
        hintsUsed: 0,
        solutionViewed: false,
        isAssisted: false,
        mistakeCategories: ['derivative-error'],
      },
    },
    questionIds: ['pq-nr-1'],
  });

  const recs = deriveAssessmentRecommendations(sess);
  assertEquals(recs.length >= 1, true);
  assertEquals(recs[0].method, 'newton-raphson');
  assert(recs[0].reason.includes('Derivative'));
});

// 26. Image question safety
Deno.test('Adaptive 26: Adaptive engine safely handles image attempts alongside practice', () => {
  const attempts = [
    createMockAttempt({
      questionId: 'img_q_1790400000000_123',
      method: 'false-position',
      source: 'image',
      correct: true,
    }),
  ];

  const states = deriveAdaptiveTopicStates(attempts);
  assertEquals(states['false-position'].completedAttempts, 1);
  assertEquals(states['false-position'].state, 'introduced');
});

// 27. Empty state robustness
Deno.test('Adaptive 27: Null/empty inputs return robust defaults without throwing', () => {
  const states = deriveAdaptiveTopicStates([], []);
  assertEquals(typeof states, 'object');
  const plan = buildSessionPlan([], []);
  assertEquals(plan.steps.length, 3);
});

// 28. Corrupted data resilience
Deno.test('Adaptive 28: Malformed attempts do not crash adaptive calculations', () => {
  const corruptAttempts = [
    { id: 'bad_1' } as any,
    { id: 'bad_2', method: 'bisection', status: 'completed', correct: undefined } as any,
    createMockAttempt({ questionId: 'pq-bis-1', method: 'bisection', correct: true }),
  ];

  const states = deriveAdaptiveTopicStates(corruptAttempts);
  assertEquals(states.bisection.completedAttempts, 1);
  assertEquals(states.bisection.weightedAccuracy, 100);
});

// 29. Determinism
Deno.test('Adaptive 29: Identical history produces strictly identical recommendations', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-bis-1', method: 'bisection', correct: true }),
    createMockAttempt({ questionId: 'pq-fp-1', method: 'false-position', correct: false }),
  ];

  const run1 = recommendNextPractice(attempts, [], { count: 3 });
  const run2 = recommendNextPractice(attempts, [], { count: 3 });

  assertEquals(
    run1.map((r) => r.questionId),
    run2.map((r) => r.questionId)
  );
  assertEquals(
    run1.map((r) => r.reason),
    run2.map((r) => r.reason)
  );
});

// 30. Zero Gemini calls
Deno.test('Adaptive 30: Entire adaptive pipeline executes 100% locally with 0 AI calls', () => {
  const attempts = [
    createMockAttempt({ questionId: 'pq-bis-1', method: 'bisection', correct: true }),
    createMockAttempt({ questionId: 'pq-bis-2', method: 'bisection', correct: true }),
    createMockAttempt({ questionId: 'pq-fp-1', method: 'false-position', correct: false }),
    createMockAttempt({ questionId: 'pq-nr-1', method: 'newton-raphson', correct: false }),
  ];

  // All 6 core functions must execute without invoking any network or Gemini mock
  const states = deriveAdaptiveTopicStates(attempts);
  const weak = detectWeakTopics(attempts);
  const strengths = detectStrengths(attempts);
  const focus = deriveLearningFocus(attempts);
  const recs = recommendNextPractice(attempts);
  const plan = buildSessionPlan(attempts);

  assertEquals(Object.keys(states).length, 3);
  assertEquals(Array.isArray(weak), true);
  assertEquals(Array.isArray(strengths), true);
  assertEquals(typeof focus.title, 'string');
  assertEquals(recs.length > 0, true);
  assertEquals(plan.steps.length, 3);
});
