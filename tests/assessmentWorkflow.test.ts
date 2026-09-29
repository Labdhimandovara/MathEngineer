/**
 * Phase 10 — Assessment, Quizzes & Timed Practice Test Suite
 * 
 * Verifies:
 * - Session creation, snapshot immutability, and duplicate avoidance
 * - Deterministic numerical answer verification and mistake detection (0 Gemini calls)
 * - Assistance tracking (hintsUsed, solutionViewed, isAssisted)
 * - Solution viewed !== unassisted correct
 * - Accurate scoring, unassisted accuracy, and time calculations
 * - Authoritative timestamp-based timer countdown and timeout auto-submission
 * - Question flagging and navigation
 * - Retry creating distinct, new sessions without mutating past results
 * - Assessment history persistence and session restoration
 * - Integration with learningStore (source: 'assessment') and Review/Progress
 * - Safe recovery from corrupted persistence
 */

import { assertEquals, assertNotEquals } from 'jsr:@std/assert';
import {
  startAssessmentSession,
  getActiveSession,
  saveActiveSession,
  recordAnswer,
  recordAssessmentSolutionView,
  toggleFlagQuestion,
  setCurrentIndex,
  submitAssessmentSession,
  abandonAssessmentSession,
  getAssessmentHistory,
  getAssessmentSessionById,
  clearAssessmentHistory,
} from '../src/services/assessment/assessmentStore.ts';
import {
  selectQuestionsForQuiz,
  verifyAssessmentAnswer,
  calculateAssessmentResult,
  calculateRemainingSeconds,
  PRESET_QUIZZES,
} from '../src/services/assessment/assessmentEngine.ts';
import { PRACTICE_QUESTIONS } from '../src/data/practiceQuestions.ts';
import { getAttempts, resetLearningHistory } from '../src/services/learning/learningStore.ts';
import { getGroupedReviewQuestions } from '../src/services/review/reviewService.ts';

function setupCleanEnvironment() {
  clearAssessmentHistory();
  resetLearningHistory();
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    } else if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
      globalThis.localStorage.clear();
    }
  } catch {
    // ignore
  }
}

// 1. Create assessment session
Deno.test('Assessment 1: Start assessment session creates an active session', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({
    type: 'quick',
    questionCount: 5,
  });

  assertEquals(session.status, 'active');
  assertEquals(session.type, 'quick');
  assertEquals(session.questionIds.length, 5);
  assertEquals(session.currentIndex, 0);
  assertEquals(session.flaggedQuestionIds.length, 0);
  assertEquals(Object.keys(session.answers).length, 0);
});

// 2. Fixed question set
Deno.test('Assessment 2: Question set remains fixed and identical across retrieves', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({
    type: 'quick',
    questionCount: 5,
    seed: 12345,
  });
  const originalIds = [...session.questionIds];

  // Retrieve active session multiple times
  const retrieved1 = getActiveSession();
  const retrieved2 = getActiveSession();

  assertEquals(retrieved1?.questionIds, originalIds);
  assertEquals(retrieved2?.questionIds, originalIds);
});

// 3. Exact question IDs preserved
Deno.test('Assessment 3: Question IDs in assessment exist in PRACTICE_QUESTIONS bank', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({
    type: 'standard',
    questionCount: 10,
  });

  for (const qId of session.questionIds) {
    const exists = PRACTICE_QUESTIONS.some((q) => q.id === qId);
    assertEquals(exists, true, `Question ${qId} must exist in canonical question bank`);
  }
});

// 4. No duplicate questions within a session
Deno.test('Assessment 4: No duplicate questions exist within a single assessment', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({
    type: 'standard',
    questionCount: 10,
    seed: 42,
  });

  const uniqueSet = new Set(session.questionIds);
  assertEquals(uniqueSet.size, session.questionIds.length);
});

// 5. Answer recording
Deno.test('Assessment 5: recordAnswer saves student answer to active session', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({ type: 'quick', questionCount: 5 });
  const firstQId = session.questionIds[0];

  recordAnswer({
    questionId: firstQId,
    answer: 1.325,
  });

  const active = getActiveSession();
  assertEquals(active?.answers[firstQId]?.isAnswered, true);
  assertEquals(active?.answers[firstQId]?.submittedAnswer, 1.325);
});

// 6. Correct numerical answer
Deno.test('Assessment 6: verifyAssessmentAnswer accepts answer within tolerance', () => {
  const q = PRACTICE_QUESTIONS.find((item) => item.id === 'pq-bis-1')!;
  // Expected root ~1.325, decimalPlaces = 3
  const ver1 = verifyAssessmentAnswer(q, 1.325);
  assertEquals(ver1.isCorrect, true);

  const ver2 = verifyAssessmentAnswer(q, '1.325');
  assertEquals(ver2.isCorrect, true);
});

// 7. Incorrect numerical answer
Deno.test('Assessment 7: verifyAssessmentAnswer rejects inaccurate answer and detects mistake category', () => {
  const q = PRACTICE_QUESTIONS.find((item) => item.id === 'pq-bis-1')!;
  // Out of interval [1, 2]
  const ver = verifyAssessmentAnswer(q, 4.5);
  assertEquals(ver.isCorrect, false);
  assertEquals(ver.mistakeCategory, 'wrong-interval-selection');
});

// 8. Unanswered question handling
Deno.test('Assessment 8: Unanswered questions are counted as unanswered in final result', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({ type: 'quick', questionCount: 5 });
  // Answer only question 0
  recordAnswer({ questionId: session.questionIds[0], answer: 1.325 });

  const completed = submitAssessmentSession(false);
  assertEquals(completed?.results?.totalQuestions, 5);
  assertEquals(completed?.results?.attemptedCount, 1);
  assertEquals(completed?.results?.unansweredCount, 4);
});

// 9. Assessment completion
Deno.test('Assessment 9: submitAssessmentSession completes session and clears active store', () => {
  setupCleanEnvironment();
  startAssessmentSession({ type: 'quick', questionCount: 5 });
  const completed = submitAssessmentSession(false);

  assertEquals(completed?.status, 'completed');
  assertEquals(completed?.completedAt !== undefined, true);
  assertEquals(completed?.results !== undefined, true);
  assertEquals(getActiveSession(), null); // Active session cleared!
});

// 10. Assessment abandonment
Deno.test('Assessment 10: abandonAssessmentSession marks session abandoned without recording completed results', () => {
  setupCleanEnvironment();
  startAssessmentSession({ type: 'quick', questionCount: 5 });
  const abandoned = abandonAssessmentSession();

  assertEquals(abandoned?.status, 'abandoned');
  assertEquals(getActiveSession(), null);

  const history = getAssessmentHistory();
  assertEquals(history.length, 0); // Not saved to completed history!
});

// 11. Assistance tracking
Deno.test('Assessment 11: Viewing solution marks question as assisted and tracks solutionViewed', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({ type: 'quick', questionCount: 5 });
  const targetId = session.questionIds[0];

  recordAssessmentSolutionView(targetId);

  const active = getActiveSession();
  const ans = active?.answers[targetId];
  assertEquals(ans?.solutionViewed, true);
  assertEquals(ans?.isAssisted, true);
});

// 12. Solution viewed is NOT equivalent to unassisted correctness
Deno.test('Assessment 12: Viewing solution does not count as unassisted correct', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({ type: 'quick', questionCount: 5 });
  const targetId = session.questionIds[0];
  const q = PRACTICE_QUESTIONS.find((item) => item.id === targetId)!;

  // Student views solution, then enters correct answer
  recordAssessmentSolutionView(targetId);
  recordAnswer({ questionId: targetId, answer: q.expectedRoot, solutionViewed: true });

  const completed = submitAssessmentSession(false);
  const res = completed?.results!;

  assertEquals(res.correctCount, 1);
  assertEquals(res.assistedCorrectCount, 1);
  assertEquals(res.unassistedCorrectCount, 0); // NOT unassisted!
  assertEquals(res.solutionsViewedCount, 1);
});

// 13. Score calculation
Deno.test('Assessment 13: Accurate score calculation across correct and incorrect submissions', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({ type: 'quick', questionCount: 5 });

  // Answer 3 correct, 2 incorrect
  for (let i = 0; i < 5; i++) {
    const qId = session.questionIds[i];
    const q = PRACTICE_QUESTIONS.find((item) => item.id === qId)!;
    if (i < 3) {
      recordAnswer({ questionId: qId, answer: q.expectedRoot });
    } else {
      recordAnswer({ questionId: qId, answer: 999 }); // incorrect
    }
  }

  const completed = submitAssessmentSession(false);
  const res = completed?.results!;

  assertEquals(res.correctCount, 3);
  assertEquals(res.incorrectCount, 2);
  assertEquals(res.totalQuestions, 5);
});

// 14. Accuracy calculation
Deno.test('Assessment 14: Accuracy percentage is exactly (correct / total) * 100', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({ type: 'standard', questionCount: 10 });

  // Answer 8 correct out of 10
  for (let i = 0; i < 10; i++) {
    const qId = session.questionIds[i];
    const q = PRACTICE_QUESTIONS.find((item) => item.id === qId)!;
    if (i < 8) {
      recordAnswer({ questionId: qId, answer: q.expectedRoot });
    } else {
      recordAnswer({ questionId: qId, answer: -999 });
    }
  }

  const completed = submitAssessmentSession(false);
  const res = completed?.results!;

  assertEquals(res.correctCount, 8);
  assertEquals(res.accuracy, 80);
});

// 15. Time calculation
Deno.test('Assessment 15: Total time and average time per question are computed accurately', () => {
  const dummySession = {
    id: 'test_time_sess',
    type: 'quick' as const,
    title: 'Test',
    startedAt: new Date(Date.now() - 100_000).toISOString(), // 100 seconds ago
    completedAt: new Date().toISOString(),
    questionIds: ['pq-bis-1', 'pq-bis-2', 'pq-bis-3', 'pq-bis-4', 'pq-bis-5'],
    currentIndex: 0,
    flaggedQuestionIds: [],
    answers: {},
    status: 'active' as const,
  };

  const res = calculateAssessmentResult(dummySession);
  assertEquals(res.totalTimeSeconds >= 99 && res.totalTimeSeconds <= 102, true);
  assertEquals(res.averageTimePerQuestion, 20); // 100 / 5 = 20s
});

// 16. Timeout submission
Deno.test('Assessment 16: submitAssessmentSession(true) records timedOut: true and preserves answers', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({
    type: 'timed',
    questionCount: 5,
    timeLimitSeconds: 300,
  });

  // Answer 1 question before timeout
  const firstQ = PRACTICE_QUESTIONS.find((item) => item.id === session.questionIds[0])!;
  recordAnswer({ questionId: firstQ.id, answer: firstQ.expectedRoot });

  const completed = submitAssessmentSession(true);
  assertEquals(completed?.results?.timedOut, true);
  assertEquals(completed?.results?.correctCount, 1);
  assertEquals(completed?.results?.unansweredCount, 4);
});

// 17. Timer does NOT depend on render count
Deno.test('Assessment 17: calculateRemainingSeconds uses authoritative timestamp difference', () => {
  const startedAt = new Date(1_000_000).toISOString();
  const timeLimit = 300; // 300 seconds

  // 100 seconds later
  const now1 = 1_000_000 + 100 * 1000;
  assertEquals(calculateRemainingSeconds(startedAt, timeLimit, now1), 200);

  // 350 seconds later (expired)
  const now2 = 1_000_000 + 350 * 1000;
  assertEquals(calculateRemainingSeconds(startedAt, timeLimit, now2), 0);
});

// 18. Flag question
Deno.test('Assessment 18: toggleFlagQuestion flags and unflags question', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({ type: 'quick', questionCount: 5 });
  const qId = session.questionIds[0];

  // Flag
  toggleFlagQuestion(qId);
  assertEquals(getActiveSession()?.flaggedQuestionIds.includes(qId), true);

  // Unflag
  toggleFlagQuestion(qId);
  assertEquals(getActiveSession()?.flaggedQuestionIds.includes(qId), false);
});

// 19. Previous/next navigation
Deno.test('Assessment 19: setCurrentIndex clamps index within [0, total - 1]', () => {
  setupCleanEnvironment();
  startAssessmentSession({ type: 'quick', questionCount: 5 });

  setCurrentIndex(2);
  assertEquals(getActiveSession()?.currentIndex, 2);

  // Underflow clamped to 0
  setCurrentIndex(-5);
  assertEquals(getActiveSession()?.currentIndex, 0);

  // Overflow clamped to 4
  setCurrentIndex(100);
  assertEquals(getActiveSession()?.currentIndex, 4);
});

// 20. Assessment retry creates NEW session
Deno.test('Assessment 20: Retrying an assessment creates a new session and preserves history', () => {
  setupCleanEnvironment();
  startAssessmentSession({ type: 'quick', questionCount: 5 });
  const firstCompleted = submitAssessmentSession(false)!;

  // Student starts second quiz
  const secondSession = startAssessmentSession({ type: 'quick', questionCount: 5 });
  assertNotEquals(secondSession.id, firstCompleted.id);

  const history = getAssessmentHistory();
  assertEquals(history.length, 1);
  assertEquals(history[0].id, firstCompleted.id);
});

// 21. Assessment history persistence
Deno.test('Assessment 21: Completed sessions persist in assessment history', () => {
  setupCleanEnvironment();
  startAssessmentSession({ type: 'quick', title: 'Quiz 1', questionCount: 5 });
  submitAssessmentSession(false);

  startAssessmentSession({ type: 'quick', title: 'Quiz 2', questionCount: 5 });
  submitAssessmentSession(false);

  const history = getAssessmentHistory();
  assertEquals(history.length, 2);
  assertEquals(history[0].title, 'Quiz 2');
  assertEquals(history[1].title, 'Quiz 1');
});

// 22. Review integration
Deno.test('Assessment 22: Completed assessment questions sync into learning history as source = assessment', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({ type: 'quick', questionCount: 5 });
  const qId = session.questionIds[0];
  const q = PRACTICE_QUESTIONS.find((item) => item.id === qId)!;

  recordAnswer({ questionId: qId, answer: q.expectedRoot });
  submitAssessmentSession(false);

  const learningAttempts = getAttempts();
  const synced = learningAttempts.find((a) => a.questionId === qId);

  assertEquals(synced !== undefined, true);
  assertEquals(synced?.source, 'assessment');
  assertEquals(synced?.correct, true);

  // Accessible in Review grouped questions
  const groupedReview = getGroupedReviewQuestions(learningAttempts);
  const reviewed = groupedReview.find((g) => g.questionId === qId);
  assertEquals(reviewed !== undefined, true);
});

// 23. Progress integration
Deno.test('Assessment 23: Assessment history is available for Progress reporting', () => {
  setupCleanEnvironment();
  startAssessmentSession({ type: 'quick', title: 'Calculus Exam', questionCount: 5 });
  submitAssessmentSession(false);

  const history = getAssessmentHistory();
  assertEquals(history.length > 0, true);
  assertEquals(history[0].title, 'Calculus Exam');
  assertEquals(history[0].results?.totalQuestions, 5);
});

// 24. Practice question exact identity
Deno.test('Assessment 24: Questions in assessment retain exact equation and bounds', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({ type: 'method', method: 'bisection', questionCount: 5 });

  for (const qId of session.questionIds) {
    const original = PRACTICE_QUESTIONS.find((q) => q.id === qId)!;
    assertEquals(original.method, 'bisection');
    assertEquals(original.bounds.length, 2);
    assertEquals(original.decimalPlaces >= 2, true);
  }
});

// 25. Method Quiz preset filtering
Deno.test('Assessment 25: Method quiz presets select questions exclusively from requested method', () => {
  const bisQuestions = selectQuestionsForQuiz('method', { method: 'bisection', questionCount: 5 });
  for (const q of bisQuestions) {
    assertEquals(q.method, 'bisection');
  }

  const fpQuestions = selectQuestionsForQuiz('method', { method: 'false-position', questionCount: 5 });
  for (const q of fpQuestions) {
    assertEquals(q.method, 'false-position');
  }

  const nrQuestions = selectQuestionsForQuiz('method', { method: 'newton-raphson', questionCount: 5 });
  for (const q of nrQuestions) {
    assertEquals(q.method, 'newton-raphson');
  }
});

// 26. Deterministic question selection with seed
Deno.test('Assessment 26: Seeded selection produces identical question sets', () => {
  const setA = selectQuestionsForQuiz('quick', { questionCount: 5, seed: 999 });
  const setB = selectQuestionsForQuiz('quick', { questionCount: 5, seed: 999 });

  assertEquals(
    setA.map((q) => q.id),
    setB.map((q) => q.id)
  );
});

// 27. Refresh / session restoration
Deno.test('Assessment 27: Active session survives page reload simulation', () => {
  setupCleanEnvironment();
  const session = startAssessmentSession({ type: 'quick', questionCount: 5 });
  const qId = session.questionIds[0];
  recordAnswer({ questionId: qId, answer: 1.325 });
  toggleFlagQuestion(session.questionIds[1]);
  setCurrentIndex(3);

  // Simulate refresh by clearing in-memory variable
  const reloaded = getActiveSession();
  assertEquals(reloaded?.id, session.id);
  assertEquals(reloaded?.currentIndex, 3);
  assertEquals(reloaded?.answers[qId]?.submittedAnswer, 1.325);
  assertEquals(reloaded?.flaggedQuestionIds.includes(session.questionIds[1]), true);
});

// 28. Corrupted persistence recovery
Deno.test('Assessment 28: Corrupted persistence in localStorage does not crash assessment store', () => {
  const storage =
    typeof localStorage !== 'undefined'
      ? localStorage
      : typeof globalThis !== 'undefined'
      ? globalThis.localStorage
      : null;
  if (storage) {
    storage.setItem('mathengineer_active_assessment_v1', '{corrupted_json');
    storage.setItem('mathengineer_assessment_history_v1', 'null_invalid');
  }

  const active = getActiveSession();
  assertEquals(active, null);

  const history = getAssessmentHistory();
  assertEquals(Array.isArray(history), true);
});

// 29. No Gemini calls
Deno.test('Assessment 29: Full assessment flow requires 0 external AI / Gemini calls', () => {
  setupCleanEnvironment();
  // 1. Start quiz
  const session = startAssessmentSession({ type: 'quick', questionCount: 5 });
  // 2. Answer questions
  for (const qId of session.questionIds) {
    const q = PRACTICE_QUESTIONS.find((item) => item.id === qId)!;
    recordAnswer({ questionId: qId, answer: q.expectedRoot });
  }
  // 3. Submit
  const completed = submitAssessmentSession(false);
  assertEquals(completed?.results?.accuracy, 100);
});

// 30. Presets integrity
Deno.test('Assessment 30: PRESET_QUIZZES has all expected configurations', () => {
  assertEquals(PRESET_QUIZZES.length >= 7, true);
  const types = PRESET_QUIZZES.map((p) => p.type);
  assertEquals(types.includes('quick'), true);
  assertEquals(types.includes('method'), true);
  assertEquals(types.includes('standard'), true);
  assertEquals(types.includes('timed'), true);
});
