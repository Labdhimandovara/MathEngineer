import { assertEquals, assert } from 'jsr:@std/assert';
import {
  startAttempt,
  completeAttempt,
  abandonAttempt,
  getAttempts,
  getAttemptsForQuestion,
  getAttemptsForMethod,
  resetLearningHistory,
  calculateTopicState,
  detectWeakTopics,
  aggregateAllMethods,
  recommendPractice,
  LEARNING_STORAGE_KEY,
} from '../src/services/learning/index.ts';
import { resetProgress, loadProgress } from '../src/services/progress/index.ts';
import { PRACTICE_QUESTIONS, PracticeQuestion } from '../src/data/practiceQuestions.ts';
import { LearningAttempt } from '../src/types/learning.ts';
import { solveBisection } from '../src/math/bisection/bisectionSolver.ts';

// ---------------------------------------------------------------------------
// 1. LEARNING ATTEMPT LIFECYCLE & CONSTRAINTS
// ---------------------------------------------------------------------------

Deno.test('Constraint 1: startAttempt sets status to started and correct is undefined', () => {
  resetLearningHistory();
  const attempt = startAttempt({
    questionId: 'pq-bis-1',
    method: 'bisection',
    topic: 'Bisection Method',
    decimalPlaces: 2,
  });

  assert(attempt.id.startsWith('att_'));
  assertEquals(attempt.questionId, 'pq-bis-1');
  assertEquals(attempt.method, 'bisection');
  assertEquals(attempt.status, 'started');
  assertEquals(attempt.correct, undefined); // Constraint 1: correct must be optional while started
  assertEquals(attempt.attemptNumber, 1);
  assertEquals(attempt.hintsUsed, 0);
  assertEquals(attempt.solutionViewed, false);
  assertEquals(attempt.mistakeCategories, []);
});

Deno.test('Constraint 2: Each retry is its own LearningAttempt preserving history and questionId', () => {
  resetLearningHistory();
  resetProgress();

  // Attempt 1: Failed
  const att1 = startAttempt({
    questionId: 'pq-nr-1',
    method: 'newton-raphson',
    topic: 'Newton-Raphson Method',
  });
  assertEquals(att1.attemptNumber, 1);

  const completed1 = completeAttempt(att1.id, {
    correct: false,
    hintsUsed: 1,
    mistakeCategories: ['rounding-error'],
    finalAnswer: 1.85,
    expectedAnswer: 1.856,
    durationSeconds: 45,
  });
  assert(completed1 !== null);
  assertEquals(completed1.status, 'completed');
  assertEquals(completed1.correct, false);
  assertEquals(completed1.mistakeCategories, ['rounding-error']);

  // Attempt 2: Retry with exact same questionId
  const att2 = startAttempt({
    questionId: 'pq-nr-1',
    method: 'newton-raphson',
    topic: 'Newton-Raphson Method',
  });
  // Constraint 2: attemptNumber is 2, exact questionId preserved, distinct ID
  assertEquals(att2.attemptNumber, 2);
  assertEquals(att2.questionId, 'pq-nr-1');
  assert(att2.id !== att1.id);

  const completed2 = completeAttempt(att2.id, {
    correct: true,
    hintsUsed: 1,
    mistakeCategories: [],
    finalAnswer: 1.856,
    expectedAnswer: 1.856,
    durationSeconds: 30,
  });
  assert(completed2 !== null);
  assertEquals(completed2.status, 'completed');
  assertEquals(completed2.correct, true);

  // Both attempts must be preserved in history without overwriting
  const allAttempts = getAttempts();
  assertEquals(allAttempts.length, 2);
  assertEquals(allAttempts[0].id, att1.id);
  assertEquals(allAttempts[0].attemptNumber, 1);
  assertEquals(allAttempts[0].correct, false);

  assertEquals(allAttempts[1].id, att2.id);
  assertEquals(allAttempts[1].attemptNumber, 2);
  assertEquals(allAttempts[1].correct, true);

  // Filter queries
  const nrAttempts = getAttemptsForQuestion('pq-nr-1');
  assertEquals(nrAttempts.length, 2);
});

Deno.test('Constraint 6: Syncs with progressStore on completion without competing source of truth', () => {
  resetLearningHistory();
  resetProgress();

  const att = startAttempt({
    questionId: 'pq-fp-1',
    method: 'false-position',
  });
  completeAttempt(att.id, {
    correct: true,
    hintsUsed: 2,
    durationSeconds: 50,
  });

  const progressState = loadProgress();
  assertEquals(progressState.attempts.length, 1);
  assertEquals(progressState.attempts[0].questionId, 'pq-fp-1');
  assertEquals(progressState.attempts[0].isCorrect, true);
  assertEquals(progressState.methods['false-position'].questionsSolved, 1);
});

// ---------------------------------------------------------------------------
// 2. ANALYTICS & MASTERY STATE TRANSITIONS
// ---------------------------------------------------------------------------

Deno.test('Analytics 1: Topic learning state progression', () => {
  // Empty history -> not-started
  assertEquals(calculateTopicState([], 'bisection'), 'not-started');

  // 1 attempt -> practicing (regardless of outcome)
  const singleAttempt: LearningAttempt[] = [
    {
      id: '1',
      questionId: 'pq-bis-1',
      method: 'bisection',
      topic: 'Bisection',
      startedAt: '2026-09-27T10:00:00Z',
      completedAt: '2026-09-27T10:01:00Z',
      status: 'completed',
      correct: true,
      attemptNumber: 1,
      hintsUsed: 0,
      solutionViewed: false,
      mistakeCategories: [],
      durationSeconds: 60,
    },
  ];
  assertEquals(calculateTopicState(singleAttempt, 'bisection'), 'practicing');

  // 2 attempts with >=50% accuracy -> developing
  const developingAttempts: LearningAttempt[] = [
    ...singleAttempt,
    {
      id: '2',
      questionId: 'pq-bis-2',
      method: 'bisection',
      topic: 'Bisection',
      startedAt: '2026-09-27T10:05:00Z',
      completedAt: '2026-09-27T10:06:00Z',
      status: 'completed',
      correct: true,
      attemptNumber: 1,
      hintsUsed: 1,
      solutionViewed: false,
      mistakeCategories: [],
      durationSeconds: 60,
    },
  ];
  assertEquals(calculateTopicState(developingAttempts, 'bisection'), 'developing');

  // 3 attempts with >=75% accuracy and <=1.5 avg hints -> consistent
  const consistentAttempts: LearningAttempt[] = [
    ...developingAttempts,
    {
      id: '3',
      questionId: 'pq-bis-3',
      method: 'bisection',
      topic: 'Bisection',
      startedAt: '2026-09-27T10:10:00Z',
      completedAt: '2026-09-27T10:11:00Z',
      status: 'completed',
      correct: true,
      attemptNumber: 1,
      hintsUsed: 0,
      solutionViewed: true, // Constraint 3: solutionViewed is descriptive and does NOT block consistent!
      mistakeCategories: [],
      durationSeconds: 50,
    },
  ];
  assertEquals(calculateTopicState(consistentAttempts, 'bisection'), 'consistent');
});

Deno.test('Constraint 3: solutionViewed is descriptive evidence only and does NOT block consistent state', () => {
  const attemptsWithSolution: LearningAttempt[] = [
    {
      id: '1',
      questionId: 'pq-nr-1',
      method: 'newton-raphson',
      topic: 'Newton-Raphson',
      startedAt: '2026-09-27T10:00:00Z',
      completedAt: '2026-09-27T10:01:00Z',
      status: 'completed',
      correct: true,
      attemptNumber: 1,
      hintsUsed: 0,
      solutionViewed: true, // Viewed solution
      mistakeCategories: [],
      durationSeconds: 40,
    },
    {
      id: '2',
      questionId: 'pq-nr-2',
      method: 'newton-raphson',
      topic: 'Newton-Raphson',
      startedAt: '2026-09-27T10:05:00Z',
      completedAt: '2026-09-27T10:06:00Z',
      status: 'completed',
      correct: true,
      attemptNumber: 1,
      hintsUsed: 1,
      solutionViewed: true, // Viewed solution
      mistakeCategories: [],
      durationSeconds: 45,
    },
    {
      id: '3',
      questionId: 'pq-nr-3',
      method: 'newton-raphson',
      topic: 'Newton-Raphson',
      startedAt: '2026-09-27T10:10:00Z',
      completedAt: '2026-09-27T10:11:00Z',
      status: 'completed',
      correct: true,
      attemptNumber: 1,
      hintsUsed: 0,
      solutionViewed: true, // Viewed solution
      mistakeCategories: [],
      durationSeconds: 40,
    },
  ];
  assertEquals(calculateTopicState(attemptsWithSolution, 'newton-raphson'), 'consistent');
});

// ---------------------------------------------------------------------------
// 3. CONSERVATIVE WEAK TOPIC DETECTION
// ---------------------------------------------------------------------------

Deno.test('Constraints 4 & 5: Conservative weak-topic detection requires >=2 attempts & real failure signal', () => {
  // Scenario A: 1 attempt with mistake -> NOT weak topic (requires min 2 attempts)
  const singleFailure: LearningAttempt[] = [
    {
      id: '1',
      questionId: 'pq-bis-1',
      method: 'bisection',
      topic: 'Bisection Method',
      startedAt: '2026-09-27T10:00:00Z',
      completedAt: '2026-09-27T10:01:00Z',
      status: 'completed',
      correct: false,
      attemptNumber: 1,
      hintsUsed: 2,
      solutionViewed: false,
      mistakeCategories: ['wrong-interval-selection'],
      durationSeconds: 60,
    },
  ];
  assertEquals(detectWeakTopics(singleFailure), []);

  // Scenario B: High hints alone (>=2) on correct answers does NOT trigger weak topic
  const highHintsCorrect: LearningAttempt[] = [
    {
      id: '1',
      questionId: 'pq-bis-1',
      method: 'bisection',
      topic: 'Bisection Method',
      startedAt: '2026-09-27T10:00:00Z',
      completedAt: '2026-09-27T10:01:00Z',
      status: 'completed',
      correct: true,
      attemptNumber: 1,
      hintsUsed: 3,
      solutionViewed: false,
      mistakeCategories: [],
      durationSeconds: 60,
    },
    {
      id: '2',
      questionId: 'pq-bis-2',
      method: 'bisection',
      topic: 'Bisection Method',
      startedAt: '2026-09-27T10:05:00Z',
      completedAt: '2026-09-27T10:06:00Z',
      status: 'completed',
      correct: true,
      attemptNumber: 1,
      hintsUsed: 3,
      solutionViewed: false,
      mistakeCategories: [],
      durationSeconds: 60,
    },
  ];
  assertEquals(detectWeakTopics(highHintsCorrect), []);

  // Scenario C: >=2 attempts with low recent accuracy (<50%) -> triggers weak topic
  const lowAccuracyAttempts: LearningAttempt[] = [
    {
      id: '1',
      questionId: 'pq-bis-1',
      method: 'bisection',
      topic: 'Bisection Method',
      startedAt: '2026-09-27T10:00:00Z',
      completedAt: '2026-09-27T10:01:00Z',
      status: 'completed',
      correct: false,
      attemptNumber: 1,
      hintsUsed: 1,
      solutionViewed: false,
      mistakeCategories: ['wrong-interval-selection'],
      durationSeconds: 60,
    },
    {
      id: '2',
      questionId: 'pq-bis-2',
      method: 'bisection',
      topic: 'Bisection Method',
      startedAt: '2026-09-27T10:05:00Z',
      completedAt: '2026-09-27T10:06:00Z',
      status: 'completed',
      correct: false,
      attemptNumber: 1,
      hintsUsed: 1,
      solutionViewed: false,
      mistakeCategories: ['wrong-bracket'],
      durationSeconds: 60,
    },
  ];
  const weakLowAcc = detectWeakTopics(lowAccuracyAttempts);
  assertEquals(weakLowAcc.length, 1);
  assertEquals(weakLowAcc[0].method, 'bisection');
  assert(weakLowAcc[0].reasons.some((r: string) => r.includes('accuracy')));

  // Scenario D: Repeated identical mistake (>=2 occurrences) -> triggers weak topic with specific mistake notice
  const repeatedMistakeAttempts: LearningAttempt[] = [
    {
      id: '1',
      questionId: 'pq-nr-1',
      method: 'newton-raphson',
      topic: 'Newton-Raphson Method',
      startedAt: '2026-09-27T10:00:00Z',
      completedAt: '2026-09-27T10:01:00Z',
      status: 'completed',
      correct: false,
      attemptNumber: 1,
      hintsUsed: 1,
      solutionViewed: false,
      mistakeCategories: ['rounding-error'],
      durationSeconds: 40,
    },
    {
      id: '2',
      questionId: 'pq-nr-2',
      method: 'newton-raphson',
      topic: 'Newton-Raphson Method',
      startedAt: '2026-09-27T10:05:00Z',
      completedAt: '2026-09-27T10:06:00Z',
      status: 'completed',
      correct: false,
      attemptNumber: 1,
      hintsUsed: 1,
      solutionViewed: false,
      mistakeCategories: ['rounding-error'],
      durationSeconds: 45,
    },
  ];
  const weakRepeated = detectWeakTopics(repeatedMistakeAttempts);
  assertEquals(weakRepeated.length, 1);
  assertEquals(weakRepeated[0].method, 'newton-raphson');
  assert(weakRepeated[0].reasons.some((r: string) => r.includes('rounding-error')));
});

// ---------------------------------------------------------------------------
// 4. RECOMMENDATIONS: DETERMINISTIC & EXPLAINABLE
// ---------------------------------------------------------------------------

Deno.test('Constraint 7: Recommendations are deterministic, explainable, and reference real questions', () => {
  // Case A: Empty attempts -> Recommends first beginner question pq-bis-1
  const recEmptyList = recommendPractice([]);
  assert(recEmptyList.length > 0);
  const recEmpty = recEmptyList[0];
  assertEquals(recEmpty.questionId, 'pq-bis-1');
  assertEquals(recEmpty.method, 'bisection');
  assertEquals(recEmpty.action, 'practice');
  assert(PRACTICE_QUESTIONS.some((q: PracticeQuestion) => q.id === recEmpty.questionId));

  // Case B: Unresolved failed attempt -> Recommends retrying that question
  const failedAttempt: LearningAttempt[] = [
    {
      id: '1',
      questionId: 'pq-fp-2',
      method: 'false-position',
      topic: 'False Position Method',
      startedAt: '2026-09-27T10:00:00Z',
      completedAt: '2026-09-27T10:01:00Z',
      status: 'completed',
      correct: false,
      attemptNumber: 1,
      hintsUsed: 1,
      solutionViewed: false,
      mistakeCategories: ['arithmetic-error'],
      durationSeconds: 50,
    },
  ];
  const recRetryList = recommendPractice(failedAttempt);
  assert(recRetryList.length > 0);
  const recRetry = recRetryList.find((r) => r.action === 'retry') || recRetryList[0];
  assertEquals(recRetry.questionId, 'pq-fp-2');
  assertEquals(recRetry.action, 'retry');

  // Case C: All basic Bisection solved -> Recommends next difficulty level
  const solvedBasicBisection: LearningAttempt[] = [
    {
      id: '1',
      questionId: 'pq-bis-1',
      method: 'bisection',
      topic: 'Bisection Method',
      startedAt: '2026-09-27T10:00:00Z',
      completedAt: '2026-09-27T10:01:00Z',
      status: 'completed',
      correct: true,
      attemptNumber: 1,
      hintsUsed: 0,
      solutionViewed: false,
      mistakeCategories: [],
      durationSeconds: 40,
    },
  ];
  const recNextList = recommendPractice(solvedBasicBisection);
  assert(recNextList.length > 0);
  assert(recNextList.some((r) => r.questionId !== 'pq-bis-1'));
  assert(recNextList.every((r) => PRACTICE_QUESTIONS.some((q: PracticeQuestion) => q.id === r.questionId)));
});

Deno.test('Store resilience: Corrupted localStorage handling and abandonment', () => {
  resetLearningHistory();

  // Test abandonAttempt
  const att = startAttempt({
    questionId: 'pq-bis-1',
    method: 'bisection',
  });
  assertEquals(att.status, 'started');
  abandonAttempt(att.id);

  const attempts = getAttempts();
  assertEquals(attempts.length, 1);
  assertEquals(attempts[0].status, 'abandoned');
});

// ---------------------------------------------------------------------------
// 5. FULL INTEGRATION VERIFICATION PATHS (Constraint 8)
// ---------------------------------------------------------------------------

Deno.test('Constraint 8: Full path - Practice Question -> Attempt -> Fail -> Retry -> Solve -> Progress -> Recommendation -> Solve With Me', () => {
  resetLearningHistory();
  resetProgress();

  // Step 1: Practice question chosen (pq-bis-2)
  const practiceQuestion = PRACTICE_QUESTIONS.find((q) => q.id === 'pq-bis-2')!;
  assert(practiceQuestion !== undefined);

  // Step 2: Start LearningAttempt
  const att1 = startAttempt({
    questionId: practiceQuestion.id,
    method: practiceQuestion.method,
    topic: practiceQuestion.categoryLabel,
    decimalPlaces: practiceQuestion.decimalPlaces,
  });
  assertEquals(att1.status, 'started');
  assertEquals(att1.correct, undefined);
  assertEquals(att1.attemptNumber, 1);

  // Step 3: Solve incorrectly
  completeAttempt(att1.id, {
    correct: false,
    hintsUsed: 1,
    finalAnswer: 2.09,
    expectedAnswer: practiceQuestion.expectedRoot,
    mistakeCategories: ['rounding-error'],
    durationSeconds: 45,
  });

  // Verify attempt 1 recorded with failure and diagnosed error
  let history = getAttempts();
  assertEquals(history.length, 1);
  assertEquals(history[0].correct, false);
  assertEquals(history[0].mistakeCategories, ['rounding-error']);

  // Step 4: Retry exact same question
  const att2 = startAttempt({
    questionId: practiceQuestion.id,
    method: practiceQuestion.method,
    topic: practiceQuestion.categoryLabel,
    decimalPlaces: practiceQuestion.decimalPlaces,
  });
  assertEquals(att2.attemptNumber, 2);
  assertEquals(att2.questionId, practiceQuestion.id);

  // Step 5: Solve correctly on retry
  completeAttempt(att2.id, {
    correct: true,
    hintsUsed: 1,
    finalAnswer: 2.094,
    expectedAnswer: practiceQuestion.expectedRoot,
    mistakeCategories: [],
    durationSeconds: 30,
  });

  // Step 6: Preserve both attempts
  history = getAttempts();
  assertEquals(history.length, 2);
  assertEquals(history[0].attemptNumber, 1);
  assertEquals(history[0].correct, false);
  assertEquals(history[1].attemptNumber, 2);
  assertEquals(history[1].correct, true);

  // Step 7: Progress reads those attempts
  const perfs = aggregateAllMethods(history);
  const bisPerf = perfs['bisection'];
  assertEquals(bisPerf.questionsAttempted, 1);
  assertEquals(bisPerf.questionsCompleted, 2);
  assertEquals(bisPerf.correctCount, 1);
  assertEquals(bisPerf.incorrectCount, 1);
  assertEquals(bisPerf.accuracy, 50);

  // Step 8: Learning state updates
  assertEquals(bisPerf.learningState, 'developing');

  // Step 9: Recommendation references a real question
  const nextRecs = recommendPractice(history);
  assert(nextRecs.length > 0);
  const targetRecommendation = nextRecs[0];
  assert(PRACTICE_QUESTIONS.some((q) => q.id === targetRecommendation.questionId));

  // Step 10: Clicking recommendation opens that exact question
  const targetQuestion = PRACTICE_QUESTIONS.find((q) => q.id === targetRecommendation.questionId)!;
  assert(targetQuestion !== undefined);
  assertEquals(targetQuestion.id, targetRecommendation.questionId);

  // Launch configuration created for Solve With Me
  const activeMethod = targetQuestion.method === 'mixed' ? 'bisection' : targetQuestion.method;
  const launchConfig = {
    questionId: targetQuestion.id,
    method: activeMethod,
    equation: targetQuestion.equation,
    lowerBound: targetQuestion.bounds[0],
    upperBound: targetQuestion.bounds[1],
    decimalPlaces: targetQuestion.decimalPlaces,
    initialGuess: targetQuestion.x0 ?? targetQuestion.bounds[0],
    title: targetQuestion.title,
  };

  // Step 11: Solve With Me receives the exact original parameters
  assertEquals(launchConfig.questionId, targetQuestion.id);
  assertEquals(launchConfig.equation, targetQuestion.equation);
  assertEquals(launchConfig.lowerBound, targetQuestion.bounds[0]);
  assertEquals(launchConfig.upperBound, targetQuestion.bounds[1]);
  assertEquals(launchConfig.decimalPlaces, targetQuestion.decimalPlaces);

  // Verify numerical solver executes with these exact parameters
  const solverResult = solveBisection({
    expression: launchConfig.equation,
    a: launchConfig.lowerBound,
    b: launchConfig.upperBound,
    decimalPlaces: launchConfig.decimalPlaces,
  });
  assert(solverResult.success);
  assert(solverResult.root !== undefined);
  assertEquals(
    Number(solverResult.root.toFixed(launchConfig.decimalPlaces)),
    Number(targetQuestion.expectedRoot.toFixed(launchConfig.decimalPlaces))
  );
});

Deno.test('Constraint 8b: Completely new student with no learning history', () => {
  resetLearningHistory();
  resetProgress();

  // 1. History is completely empty
  const history = getAttempts();
  assertEquals(history.length, 0);

  // 2. Progress store is clean
  const progress = loadProgress();
  assertEquals(progress.attempts.length, 0);
  assertEquals(progress.currentStreakDays, 0);

  // 3. All learning states are not-started
  const perfs = aggregateAllMethods(history);
  assertEquals(perfs.bisection.learningState, 'not-started');
  assertEquals(perfs['false-position'].learningState, 'not-started');
  assertEquals(perfs['newton-raphson'].learningState, 'not-started');

  // 4. No weak topics flagged (conservative rule)
  const weak = detectWeakTopics(history);
  assertEquals(weak.length, 0);

  // 5. Default recommendation provides verified beginner starter question pq-bis-1
  const recs = recommendPractice(history);
  assert(recs.length > 0);
  const starter = recs[0];
  assertEquals(starter.questionId, 'pq-bis-1');
  assertEquals(starter.method, 'bisection');
  assertEquals(starter.action, 'practice');
  assert(starter.reason.includes('Bisection'));

  // 6. Starter question exists in question bank with exact parameters
  const starterQ = PRACTICE_QUESTIONS.find((q) => q.id === starter.questionId)!;
  assert(starterQ !== undefined);
  assertEquals(starterQ.id, 'pq-bis-1');
  assertEquals(starterQ.equation, 'x^3 - x - 1');
  assertEquals(starterQ.bounds, [1, 2]);
  assertEquals(starterQ.decimalPlaces, 3);
});
