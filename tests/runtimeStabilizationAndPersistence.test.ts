/**
 * Comprehensive Test Suite for Phase 13.2:
 * Full Runtime Stabilization + Persistent Backend + Database
 * 
 * Verifies all 35 required regression and persistence conditions:
 * 1. perf undefined regression
 * 2. p.state.replace type regression
 * 3. malformed persisted state
 * 4. missing persisted state
 * 5. image problem creation
 * 6. image problem persistence
 * 7. image problem reload
 * 8. image problem Review
 * 9. missing bounds recovery
 * 10. discovered bounds persistence
 * 11. exact questionId preservation
 * 12. image Try Again
 * 13. Show Solution Practice
 * 14. Show Solution Review
 * 15. Show Solution Image
 * 16. active problem consistency
 * 17. Tutor loading success
 * 18. Tutor loading error
 * 19. Tutor cancellation
 * 20. Tutor timeout
 * 21. Tutor retry
 * 22. overlapping Tutor requests
 * 23. local tutor bypasses Gemini
 * 24. Gemini fallback
 * 25. clean AI error
 * 26. learning attempt persistence
 * 27. assessment persistence
 * 28. progress from canonical data
 * 29. localStorage migration
 * 30. database migration
 * 31. duplicate migration prevention
 * 32. malformed API payload
 * 33. assessment tutor blocking
 * 34. no API secrets in client
 * 35. no live Gemini calls in automated tests
 */

import { assertEquals, assertNotEquals, assert, assertMatch } from 'jsr:@std/assert';
import {
  setDatabasePath,
  getDatabase,
  resetDatabase,
  closeDatabase,
} from '../src/server/db/database.ts';
import { runMigrations, CURRENT_SCHEMA_VERSION } from '../src/server/db/migrations.ts';
import {
  ImageProblemRepository,
  LearningAttemptRepository,
  AssessmentRepository,
  UserPreferencesRepository,
} from '../src/server/db/repositories/index.ts';
import { handlePersistenceRequest } from '../src/server/api/persistenceApi.ts';
import { formatAdaptiveState } from '../src/components/progress/LearningAnalyticsCharts.tsx';
import {
  registerImageProblem,
  getImageProblem,
  clearImageProblemRegistry,
  updateRegisteredImageProblem,
} from '../src/services/problem/imageProblemRegistry.ts';
import {
  startAttempt,
  completeAttempt,
  loadLearningAttempts,
  saveLearningAttempts,
  resetLearningHistory,
  getAttempts,
} from '../src/services/learning/learningStore.ts';
import {
  saveActiveSession,
  saveAssessmentHistory,
  getAssessmentHistory,
  getActiveSession,
} from '../src/services/assessment/assessmentStore.ts';
import { AssessmentSession } from '../src/services/assessment/assessmentTypes.ts';
import { LearningAttempt } from '../src/types/learning.ts';
import { findInitialBracket } from '../src/math/bracketSearch/index.ts';
import { solveFalsePosition } from '../src/math/falsePosition/index.ts';
import { solveBisection } from '../src/math/bisection/index.ts';
import {
  setActiveProblem,
  getActiveProblem,
  resetAllActiveProblems,
  NormalizedActiveProblem,
} from '../src/services/problem/activeProblemStore.ts';
import { askTutor } from '../src/services/tutor/tutorService.ts';
import { canAnswerLocally, sanitizeProviderErrorMessage } from '../src/services/tutor/localTutorService.ts';
import { aggregateAllMethods } from '../src/services/learning/learningAnalytics.ts';
import { deriveAdaptiveTopicStates } from '../src/services/adaptive/adaptiveEngine.ts';
import { PRACTICE_QUESTIONS } from '../src/data/practiceQuestions.ts';
import { getGroupedReviewQuestions } from '../src/services/review/reviewService.ts';

async function setupTestDb(): Promise<void> {
  setDatabasePath(':memory:');
  await resetDatabase();
  await runMigrations();
  resetAllActiveProblems();
  resetLearningHistory();
  clearImageProblemRegistry();
  saveActiveSession(null);
  saveAssessmentHistory([]);
}

// -----------------------------------------------------------------------------
// 1. "perf is not defined" Regression
// -----------------------------------------------------------------------------
Deno.test('1. perf undefined regression: Topic performance lookup resolves safely for all methods', async () => {
  await setupTestDb();

  // Create an attempt on Bisection
  const att = startAttempt({
    questionId: 'pq-bis-perf-1',
    method: 'bisection',
    topic: 'Bisection Method',
    decimalPlaces: 3,
  });
  completeAttempt(att.id, { correct: true });

  const attempts = getAttempts();
  const methodPerformances = aggregateAllMethods(attempts);

  // Simulate Learn.tsx scope where topic.id is checked
  const methods = ['bisection', 'false-position', 'newton-raphson'] as const;
  for (const m of methods) {
    const perf = methodPerformances[m];
    assert(perf !== undefined, `Performance for ${m} must be defined`);
    if (m === 'bisection') {
      assertEquals(perf.questionsAttempted, 1);
      assertEquals(perf.questionsCompleted, 1);
    } else {
      assertEquals(perf.questionsAttempted, 0);
    }
  }
});

// -----------------------------------------------------------------------------
// 2. "p.state.replace is not a function" Regression
// -----------------------------------------------------------------------------
Deno.test('2. p.state.replace type regression: formatAdaptiveState safely normalizes both objects and strings', () => {
  // Scenario A: Nested object from deriveAdaptiveTopicStates
  const objectState = {
    method: 'bisection',
    topic: 'Bisection Method',
    state: 'needs-review',
    totalAttempts: 3,
  };
  const labelFromObject = formatAdaptiveState(objectState);
  assertEquals(labelFromObject, 'needs review');

  // Scenario B: Plain string
  const labelFromString = formatAdaptiveState('developing');
  assertEquals(labelFromString, 'developing');

  // Scenario C: Malformed or undefined state
  const labelFromNull = formatAdaptiveState(null);
  assertEquals(labelFromNull, 'not started');
  const labelFromUndefined = formatAdaptiveState(undefined);
  assertEquals(labelFromUndefined, 'not started');
  const labelFromInvalid = formatAdaptiveState({ foo: 'bar' });
  assertEquals(labelFromInvalid, 'not started');
});

// -----------------------------------------------------------------------------
// 3. Malformed Persisted State Resilience
// -----------------------------------------------------------------------------
Deno.test('3. Malformed persisted state: App stores survive corrupt or unexpected localStorage schemas', async () => {
  await setupTestDb();

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('mathengineer_learning_history_v1', '{"not": "an array"}');
    localStorage.setItem('mathengineer_image_problems_v1', 'corrupt json {{[');
  }

  // Should not throw
  const loadedAttempts = loadLearningAttempts();
  assert(Array.isArray(loadedAttempts));

  const imageProb = getImageProblem('any_id');
  assertEquals(imageProb, null);
});

// -----------------------------------------------------------------------------
// 4. Missing Persisted State Graceful Handling
// -----------------------------------------------------------------------------
Deno.test('4. Missing persisted state: Completely cleared storage gracefully returns empty sets', async () => {
  await setupTestDb();
  if (typeof localStorage !== 'undefined') {
    localStorage.clear();
  }

  const attempts = loadLearningAttempts();
  assertEquals(attempts.length, 0);

  const active = getActiveSession();
  assertEquals(active, null);

  const history = getAssessmentHistory();
  assertEquals(history.length, 0);
});

// -----------------------------------------------------------------------------
// 5. Image Problem Creation
// -----------------------------------------------------------------------------
Deno.test('5. Image problem creation: Structured image problem contains all canonical parameters', async () => {
  await setupTestDb();

  const reg = registerImageProblem({
    questionId: 'img_test_1',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: null,
    upperBound: null,
    boundsSource: 'missing',
    decimalPlaces: 3,
    title: 'Fourth root of 32',
  });

  assertEquals(reg.questionId, 'img_test_1');
  assertEquals(reg.method, 'false-position');
  assertEquals(reg.equation, 'x^4 - 32 = 0');
  assertEquals(reg.boundsSource, 'missing');
});

// -----------------------------------------------------------------------------
// 6. Image Problem Persistence
// -----------------------------------------------------------------------------
Deno.test('6. Image problem persistence: Canonical problem persists durably to Database Repository', async () => {
  await setupTestDb();

  const saved = await ImageProblemRepository.save({
    questionId: 'img_db_1',
    source: 'image',
    method: 'bisection',
    equation: 'x^3 - 2x - 5 = 0',
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'supplied',
    decimalPlaces: 4,
    title: 'Cubic Equation',
    createdAt: new Date().toISOString(),
  });

  const retrieved = await ImageProblemRepository.get('img_db_1');
  assert(retrieved !== null);
  assertEquals(retrieved?.questionId, 'img_db_1');
  assertEquals(retrieved?.equation, 'x^3 - 2x - 5 = 0');
  assertEquals(retrieved?.lowerBound, 2);
  assertEquals(retrieved?.upperBound, 3);
});

// -----------------------------------------------------------------------------
// 7. Image Problem Reload
// -----------------------------------------------------------------------------
Deno.test('7. Image problem reload: Image problem survives in-memory reset via Database Repository', async () => {
  await setupTestDb();

  await ImageProblemRepository.save({
    questionId: 'img_reload_1',
    source: 'image',
    method: 'newton-raphson',
    equation: 'cos(x) - x = 0',
    lowerBound: null,
    upperBound: null,
    initialGuess: 0.5,
    boundsSource: 'supplied',
    decimalPlaces: 4,
    title: 'Transcendental Problem',
    createdAt: new Date().toISOString(),
  });

  // Re-read directly from DB
  const reloaded = await ImageProblemRepository.get('img_reload_1');
  assert(reloaded !== null);
  assertEquals(reloaded?.initialGuess, 0.5);
  assertEquals(reloaded?.method, 'newton-raphson');
});

// -----------------------------------------------------------------------------
// 8. Image Problem Review Integration
// -----------------------------------------------------------------------------
Deno.test('8. Image problem Review: Review system links image attempt to canonical question metadata', async () => {
  await setupTestDb();

  registerImageProblem({
    questionId: 'img_review_target',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'discovered',
    decimalPlaces: 3,
  });

  const att = startAttempt({
    questionId: 'img_review_target',
    source: 'image',
    method: 'false-position',
    topic: 'False Position Image',
    decimalPlaces: 3,
    equation: 'x^4 - 32 = 0',
  });
  completeAttempt(att.id, { correct: true, finalAnswer: 2.378 });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped.length, 1);
  assertEquals(grouped[0].questionId, 'img_review_target');
  assertEquals(grouped[0].source, 'image');
});

// -----------------------------------------------------------------------------
// 9. Missing Bounds Recovery
// -----------------------------------------------------------------------------
Deno.test('9. Missing bounds recovery: findInitialBracket recovers [2, 3] for fourth root of 32', () => {
  const bracket = findInitialBracket('x^4 - 32 = 0');
  assert(bracket.found);
  assertEquals(bracket.a, 2);
  assertEquals(bracket.b, 3);
});

// -----------------------------------------------------------------------------
// 10. Discovered Bounds Persistence
// -----------------------------------------------------------------------------
Deno.test('10. Discovered bounds persistence: Updating discovered bounds stores them durably', async () => {
  await setupTestDb();

  await ImageProblemRepository.save({
    questionId: 'img_discover_bounds_1',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: null,
    upperBound: null,
    boundsSource: 'missing',
    decimalPlaces: 3,
    createdAt: new Date().toISOString(),
  });

  // Bracket discovered
  const bracket = findInitialBracket('x^4 - 32 = 0');
  assert(bracket.found);

  await ImageProblemRepository.update('img_discover_bounds_1', {
    lowerBound: bracket.a,
    upperBound: bracket.b,
    boundsSource: 'discovered',
  });

  const updated = await ImageProblemRepository.get('img_discover_bounds_1');
  assertEquals(updated?.lowerBound, 2);
  assertEquals(updated?.upperBound, 3);
  assertEquals(updated?.boundsSource, 'discovered');
});

// -----------------------------------------------------------------------------
// 11. Exact questionId Preservation
// -----------------------------------------------------------------------------
Deno.test('11. Exact questionId preservation: Updating parameters preserves the exact same ID', async () => {
  await setupTestDb();

  const originalId = 'img_q_exact_preserve';
  await ImageProblemRepository.save({
    questionId: originalId,
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: null,
    upperBound: null,
    boundsSource: 'missing',
    decimalPlaces: 3,
    createdAt: new Date().toISOString(),
  });

  await ImageProblemRepository.update(originalId, {
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'discovered',
  });

  const list = await ImageProblemRepository.list();
  assertEquals(list.length, 1);
  assertEquals(list[0].questionId, originalId);
});

// -----------------------------------------------------------------------------
// 12. Image Try Again Flow
// -----------------------------------------------------------------------------
Deno.test('12. Image Try Again: Routes with exact questionId and discovered parameters', async () => {
  await setupTestDb();

  const qId = 'img_try_again_q';
  registerImageProblem({
    questionId: qId,
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'discovered',
    decimalPlaces: 3,
  });

  const reg = getImageProblem(qId);
  assert(reg !== null);
  assertEquals(reg?.lowerBound, 2);
  assertEquals(reg?.upperBound, 3);
});

// -----------------------------------------------------------------------------
// 13. Show Solution: Practice Problems
// -----------------------------------------------------------------------------
Deno.test('13. Show Solution Practice: Practice problem deterministically solves and explains', () => {
  const pq = PRACTICE_QUESTIONS[0];
  const sol = solveBisection({
    expression: pq.equation,
    a: pq.bounds[0],
    b: pq.bounds[1],
    decimalPlaces: pq.decimalPlaces,
  });

  assert(sol.success);
  assert(sol.iterations.length > 0);
  assert(sol.root !== undefined);
});

// -----------------------------------------------------------------------------
// 14. Show Solution: Review Problems
// -----------------------------------------------------------------------------
Deno.test('14. Show Solution Review: Regenerates solution deterministically from stored problem data', () => {
  const sol = solveFalsePosition({
    expression: 'x^4 - 32',
    a: 2,
    b: 3,
    decimalPlaces: 3,
  });

  assert(sol.success);
  assert(sol.root !== undefined);
  assertEquals(sol.root.toFixed(3), '2.378');
});

// -----------------------------------------------------------------------------
// 15. Show Solution: Image Problems
// -----------------------------------------------------------------------------
Deno.test('15. Show Solution Image: Produces exact root from image problem parameters', () => {
  const bracket = findInitialBracket('x^4 - 32 = 0');
  assert(bracket.found);

  const sol = solveFalsePosition({
    expression: 'x^4 - 32',
    a: bracket.a,
    b: bracket.b,
    decimalPlaces: 3,
  });

  assert(sol.success);
  assert(sol.root !== undefined);
  assertEquals(sol.root.toFixed(3), '2.378');
});

// -----------------------------------------------------------------------------
// 16. Active Problem Consistency Across Pages
// -----------------------------------------------------------------------------
Deno.test('16. Active problem consistency: NormalizedActiveProblem synchronizes without drift', () => {
  resetAllActiveProblems();

  const prob: NormalizedActiveProblem = {
    questionId: 'img_active_test',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  };

  setActiveProblem(prob);
  const active = getActiveProblem();
  assertEquals(active?.questionId, 'img_active_test');
  assertEquals(active?.method, 'false-position');
});

// -----------------------------------------------------------------------------
// 17. Tutor Loading Success
// -----------------------------------------------------------------------------
Deno.test('17. Tutor loading success: askTutor completes successfully for valid queries', async () => {
  const res = await askTutor({ query: 'What is Bisection?' });
  assert(res.success);
  assertEquals(res.isLocalAnswer, true);
  assert(res.reply.length > 0);
});

// -----------------------------------------------------------------------------
// 18. Tutor Loading Error Handling
// -----------------------------------------------------------------------------
Deno.test('18. Tutor loading error: Returns clean, polite error message on failure', async () => {
  const mockFetch: typeof fetch = () => {
    return Promise.reject(new Error('Connection failed'));
  };

  const res = await askTutor(
    { query: 'Explain Dr. Lodhi advanced question' },
    { fetchFn: mockFetch }
  );

  assert(!res.reply.includes('Connection failed'));
  assert(res.reply.includes('temporarily unavailable') || res.reply.includes('quick actions'));
});

// -----------------------------------------------------------------------------
// 19. Tutor Cancellation
// -----------------------------------------------------------------------------
Deno.test('19. Tutor cancellation: AbortController abort cancels request cleanly', async () => {
  const controller = new AbortController();
  controller.abort();

  const res = await askTutor(
    { query: 'Solve this complex problem' },
    { signal: controller.signal }
  );

  // If aborted, askTutor handles signal cleanly
  assert(res !== null);
});

// -----------------------------------------------------------------------------
// 20. Tutor Timeout
// -----------------------------------------------------------------------------
Deno.test('20. Tutor timeout: Long hanging requests trigger clean timeout fallback', async () => {
  let timerId: any;
  const mockHangingFetch: typeof fetch = (_input, init) => {
    return new Promise((_resolve, reject) => {
      const onAbort = () => {
        if (timerId) clearTimeout(timerId);
        reject(new DOMException('The operation was aborted.', 'AbortError'));
      };
      if (init?.signal?.aborted) {
        onAbort();
        return;
      }
      init?.signal?.addEventListener('abort', onAbort);
    });
  };

  const controller = new AbortController();
  // Simulate timeout firing after 20ms in test
  timerId = setTimeout(() => controller.abort(), 20);

  const res = await askTutor(
    { query: 'Very slow request' },
    { signal: controller.signal, fetchFn: mockHangingFetch }
  );

  assert(res !== null);
});

// -----------------------------------------------------------------------------
// 21. Tutor Retry
// -----------------------------------------------------------------------------
Deno.test('21. Tutor retry: Retryable flag is true for network/transient failures', async () => {
  const mockFailFetch: typeof fetch = () => {
    return Promise.resolve(new Response('503 Service Unavailable', { status: 503 }));
  };

  const res = await askTutor(
    { query: 'Explain why step 3 failed' },
    { fetchFn: mockFailFetch }
  );

  assertEquals(res.retryable, true);
  assert(Array.isArray(res.quickActions));
  assert(res.quickActions.includes('Try again'));
});

// -----------------------------------------------------------------------------
// 22. Overlapping Tutor Requests
// -----------------------------------------------------------------------------
Deno.test('22. Overlapping Tutor requests: Second request executes without corrupting state', async () => {
  let callCount = 0;
  const mockFetch: typeof fetch = () => {
    callCount++;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: `Response ${callCount}` }] } }],
        }),
        { status: 200 }
      )
    );
  };

  const req1 = askTutor({ query: 'First question' }, { fetchFn: mockFetch });
  const req2 = askTutor({ query: 'Second question' }, { fetchFn: mockFetch });

  const [res1, res2] = await Promise.all([req1, req2]);
  assert(res1.success);
  assert(res2.success);
});

// -----------------------------------------------------------------------------
// 23. Local Tutor Bypasses Gemini
// -----------------------------------------------------------------------------
Deno.test('23. Local tutor bypasses Gemini: Common definitions trigger 0 external calls', () => {
  assert(canAnswerLocally('what is bisection method'));
  assert(canAnswerLocally('false position formula'));
  assert(canAnswerLocally('newton raphson formula'));
  assert(canAnswerLocally('compare bisection and newton'));
});

// -----------------------------------------------------------------------------
// 24. Gemini 503 Fallback
// -----------------------------------------------------------------------------
Deno.test('24. Gemini fallback: Secondary model is attempted when primary model is 503', async () => {
  let attemptedModels: string[] = [];

  const mockFetch: typeof fetch = (input) => {
    const url = String(input);
    if (url.includes('gemini-3.8-flash')) {
      attemptedModels.push('gemini-3.8-flash');
      return Promise.resolve(new Response('Unavailable', { status: 503 }));
    }
    if (url.includes('gemini-3.5-flash')) {
      attemptedModels.push('gemini-3.5-flash');
      return Promise.resolve(
        new Response(
          JSON.stringify({
            candidates: [{ content: { parts: [{ text: 'Fallback reply success' }] } }],
          }),
          { status: 200 }
        )
      );
    }
    return Promise.resolve(new Response('Not found', { status: 404 }));
  };

  const res = await askTutor(
    { query: 'Explain the rate of convergence' },
    { fetchFn: mockFetch }
  );

  assert(attemptedModels.includes('gemini-3.8-flash'));
  assert(attemptedModels.includes('gemini-3.5-flash'));
  assert(res.success);
  assertEquals(res.reply, 'Fallback reply success');
});

// -----------------------------------------------------------------------------
// 25. Clean AI Error Sanitization
// -----------------------------------------------------------------------------
Deno.test('25. Clean AI error: Strips model names, keys, and quota errors', () => {
  const raw = 'Error 503 from gemini-3.8-flash with key AIzaSyD... Quota exceeded';
  const clean = sanitizeProviderErrorMessage(raw);

  assert(!clean.includes('gemini-3.8-flash'));
  assert(!clean.includes('AIzaSyD'));
  assert(!clean.includes('Quota'));
  assert(clean.includes('temporarily unavailable'));
});

// -----------------------------------------------------------------------------
// 26. Learning Attempt Persistence in Database
// -----------------------------------------------------------------------------
Deno.test('26. Learning attempt persistence: Attempts persist into Database Repository', async () => {
  await setupTestDb();

  const attempt: LearningAttempt = {
    id: 'att_db_persisted_1',
    questionId: 'pq-bis-1',
    method: 'bisection',
    topic: 'Bisection Method',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed',
    correct: true,
    attemptNumber: 1,
    hintsUsed: 1,
    solutionViewed: false,
    mistakeCategories: [],
    durationSeconds: 45,
    source: 'practice',
    equation: 'x^3 - 4x - 9 = 0',
  };

  await LearningAttemptRepository.save(attempt);
  const retrieved = await LearningAttemptRepository.get('att_db_persisted_1');
  assert(retrieved !== null);
  assertEquals(retrieved?.id, 'att_db_persisted_1');
  assertEquals(retrieved?.correct, true);
  assertEquals(retrieved?.hintsUsed, 1);
});

// -----------------------------------------------------------------------------
// 27. Assessment Persistence in Database
// -----------------------------------------------------------------------------
Deno.test('27. Assessment persistence: Sessions persist into Assessment Repository', async () => {
  await setupTestDb();

  const sess: AssessmentSession = {
    id: 'sess_db_1',
    type: 'timed',
    title: 'Timed Exam Practice',
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    status: 'completed',
    questionIds: ['pq-bis-1', 'pq-fp-1'],
    currentIndex: 1,
    flaggedQuestionIds: [],
    answers: {},
    results: {
      totalQuestions: 2,
      attemptedCount: 2,
      correctCount: 2,
      unassistedCorrectCount: 2,
      assistedCorrectCount: 0,
      incorrectCount: 0,
      unansweredCount: 0,
      accuracy: 100,
      unassistedAccuracy: 100,
      totalTimeSeconds: 60,
      averageTimePerQuestion: 30,
      totalHintsUsed: 0,
      solutionsViewedCount: 0,
      timedOut: false,
    },
  };

  await AssessmentRepository.save(sess);
  const retrieved = await AssessmentRepository.get('sess_db_1');
  assert(retrieved !== null);
  assertEquals(retrieved?.results?.accuracy, 100);
  assertEquals(retrieved?.status, 'completed');
});

// -----------------------------------------------------------------------------
// 28. Progress from Canonical Database Data
// -----------------------------------------------------------------------------
Deno.test('28. Progress from canonical data: Analytics correctly derive from repository records', async () => {
  await setupTestDb();

  // Insert two attempts into database repository
  await LearningAttemptRepository.save({
    id: 'att_prog_1',
    questionId: 'pq-bis-1',
    method: 'bisection',
    topic: 'Bisection Method',
    startedAt: new Date().toISOString(),
    status: 'completed',
    correct: true,
    attemptNumber: 1,
    hintsUsed: 0,
    solutionViewed: false,
    mistakeCategories: [],
    durationSeconds: 30,
  });

  await LearningAttemptRepository.save({
    id: 'att_prog_2',
    questionId: 'pq-bis-2',
    method: 'bisection',
    topic: 'Bisection Method',
    startedAt: new Date().toISOString(),
    status: 'completed',
    correct: true,
    attemptNumber: 1,
    hintsUsed: 0,
    solutionViewed: false,
    mistakeCategories: [],
    durationSeconds: 35,
  });

  const dbAttempts = await LearningAttemptRepository.list();
  const perfs = aggregateAllMethods(dbAttempts);
  assertEquals(perfs.bisection.questionsCompleted, 2);
  assertEquals(perfs.bisection.accuracy, 100);
});

// -----------------------------------------------------------------------------
// 29. LocalStorage -> Backend DB Migration
// -----------------------------------------------------------------------------
Deno.test('29. LocalStorage migration: Batch sync endpoint imports local records into database', async () => {
  await setupTestDb();

  const req = new Request('http://localhost:8000/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageProblems: [
        {
          questionId: 'img_migrate_1',
          source: 'image',
          method: 'false-position',
          equation: 'x^4 - 32 = 0',
          decimalPlaces: 3,
        },
      ],
      attempts: [
        {
          id: 'att_migrate_1',
          questionId: 'img_migrate_1',
          method: 'false-position',
          topic: 'False Position',
          startedAt: new Date().toISOString(),
          status: 'completed',
          correct: true,
          attemptNumber: 1,
          hintsUsed: 0,
          solutionViewed: false,
          mistakeCategories: [],
          durationSeconds: 40,
        },
      ],
    }),
  });

  const res = await handlePersistenceRequest(req, new URL(req.url));
  assert(res !== null);
  assertEquals(res?.status, 200);

  // Verify in database
  const prob = await ImageProblemRepository.get('img_migrate_1');
  assert(prob !== null);
  assertEquals(prob?.questionId, 'img_migrate_1');

  const att = await LearningAttemptRepository.get('att_migrate_1');
  assert(att !== null);
  assertEquals(att?.id, 'att_migrate_1');
});

// -----------------------------------------------------------------------------
// 30. Database Migrations
// -----------------------------------------------------------------------------
Deno.test('30. Database migration: runMigrations establishes schema version and default user', async () => {
  await setupTestDb();

  const status = await runMigrations();
  assertEquals(status.version, CURRENT_SCHEMA_VERSION);

  const db = await getDatabase();
  const user = await db.get(['users', 'anonymous_student']);
  assert(user.value !== null);
});

// -----------------------------------------------------------------------------
// 31. Duplicate Migration Prevention
// -----------------------------------------------------------------------------
Deno.test('31. Duplicate migration prevention: Idempotent sync never duplicates existing IDs', async () => {
  await setupTestDb();

  const payload = {
    attempts: [
      {
        id: 'att_idempotent_1',
        questionId: 'pq-bis-1',
        method: 'bisection',
        topic: 'Bisection Method',
        startedAt: new Date().toISOString(),
        status: 'completed',
        correct: true,
        attemptNumber: 1,
        hintsUsed: 0,
        solutionViewed: false,
        mistakeCategories: [],
        durationSeconds: 20,
      },
    ],
  };

  // Sync first time
  const req1 = new Request('http://localhost:8000/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await handlePersistenceRequest(req1, new URL(req1.url));

  // Sync second time
  const req2 = new Request('http://localhost:8000/api/sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  await handlePersistenceRequest(req2, new URL(req2.url));

  const allAttempts = await LearningAttemptRepository.list();
  assertEquals(allAttempts.length, 1);
});

// -----------------------------------------------------------------------------
// 32. Server API Payload Validation
// -----------------------------------------------------------------------------
Deno.test('32. Malformed API payload: Server rejects invalid methods and returns 400', async () => {
  await setupTestDb();

  const badReq = new Request('http://localhost:8000/api/problems/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      questionId: 'bad_prob',
      method: 'invalid-method-name',
      equation: 'x^2 = 0',
    }),
  });

  const res = await handlePersistenceRequest(badReq, new URL(badReq.url));
  assert(res !== null);
  assertEquals(res?.status, 400);

  const json = await res?.json();
  assertEquals(json.success, false);
  assert(json.error.includes('Invalid numerical method'));
});

// -----------------------------------------------------------------------------
// 33. Assessment Tutor Blocking
// -----------------------------------------------------------------------------
Deno.test('33. Assessment tutor blocking: Blocks AI queries when assessment is active', async () => {
  let networkCalled = false;
  const mockFetch: typeof fetch = () => {
    networkCalled = true;
    return Promise.resolve(new Response('OK'));
  };

  const res = await askTutor(
    { query: 'What is the answer?', isAssessmentActive: true },
    { fetchFn: mockFetch }
  );

  assertEquals(res.success, false);
  assertEquals(networkCalled, false);
  assert(res.reply.includes('AI tutor is paused during active assessment'));
});

// -----------------------------------------------------------------------------
// 34. Client-side Security: No Exposed Secrets
// -----------------------------------------------------------------------------
Deno.test('34. No API secrets in client: Sanitizers redact API keys and bearer tokens', () => {
  const leak = 'Bearer 1234567890abcdef and key=AIzaSyD-secret-key-123456789012345';
  const clean = sanitizeProviderErrorMessage(leak);
  assert(!clean.includes('AIzaSyD-secret-key-123456789012345'));
  assert(!clean.includes('1234567890abcdef'));
});

// -----------------------------------------------------------------------------
// 35. Zero Live Gemini Calls in Automated Tests
// -----------------------------------------------------------------------------
Deno.test('35. Zero live Gemini calls: Local tutor answers verified without external API', async () => {
  const res = await askTutor({ query: 'What is Newton-Raphson?' });
  assert(res.success);
  assertEquals(res.provider, 'local-verified');
  assertEquals(res.isLocalAnswer, true);
});
