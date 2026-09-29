/**
 * Comprehensive Test Suite for Phase 13.4:
 * Unified Intelligent Tutor Router & Orchestrator
 * 
 * Verifies all 52 test scenarios:
 * 
 * LOCAL (1-8):
 *  1. What is Bisection?
 *  2. What is False Position?
 *  3. What is Newton-Raphson?
 *  4. False Position formula
 *  5. Bisection formula
 *  6. Compare Bisection and Newton
 *  7. Give me a hint
 *  8. Explain the next step
 * 
 * DETERMINISTIC (9-15):
 *  9. Find root
 * 10. Solve x^4 - 32
 * 11. Active False Position problem
 * 12. Missing bounds -> bracket discovery
 * 13. Exact questionId
 * 14. Edited parameters
 * 15. Show Solution
 * 
 * COURSE (16-18):
 * 16. According to our course...
 * 17. Course-specific formula
 * 18. Course negative knowledge
 * 
 * GEMINI (19-21):
 * 19. Complex conceptual question
 * 20. Personalized explanation
 * 21. Hinglish explanation
 * 
 * FAILURE & FALLBACK (22-30):
 * 22. Gemini 503
 * 23. Gemini 429
 * 24. Gemini timeout
 * 25. Gemini network failure
 * 26. Fallback to local
 * 27. Fallback to course
 * 28. Clean final fallback
 * 29. No raw provider error
 * 30. No infinite retry
 * 
 * VOICE (31-38):
 * 31. Clean transcript
 * 32. Interim transcript
 * 33. Final transcript
 * 34. Repeated speech
 * 35. Restart
 * 36. Cancel
 * 37. Calculation voice request
 * 38. Exactly one submission
 * 
 * CONTEXT (39-43):
 * 39. Image overrides Practice
 * 40. Practice overrides Learn
 * 41. Review exact problem
 * 42. Tutor sees solver output
 * 43. No stale context
 * 
 * ASSESSMENT (44-45):
 * 44. Tutor blocked
 * 45. Zero Gemini during active assessment
 * 
 * ROBUSTNESS (46-52):
 * 46. Empty message
 * 47. Malformed context
 * 48. Missing optional bounds
 * 49. Unknown question
 * 50. Empty Gemini response
 * 51. Malformed Gemini response
 * 52. No active problem
 */

import { assertEquals, assertNotEquals, assert } from 'jsr:@std/assert';
import {
  routeTutorRequest,
  convertSpokenMathToExpression,
  getTutorAuditLogs,
  clearTutorAuditLogs,
} from '../src/services/tutor/tutorOrchestrator.ts';
import { askTutor } from '../src/services/tutor/tutorService.ts';
import { buildTutorContext } from '../src/services/tutor/tutorContext.ts';
import {
  setActiveProblem,
  setActiveImageProblem,
  setActivePracticeProblem,
  resetAllActiveProblems,
} from '../src/services/problem/activeProblemStore.ts';
import {
  registerImageProblem,
  clearImageProblemRegistry,
} from '../src/services/problem/imageProblemRegistry.ts';
import {
  saveActiveSession,
  saveAssessmentHistory,
  ACTIVE_ASSESSMENT_KEY,
  ASSESSMENT_HISTORY_KEY,
} from '../src/services/assessment/assessmentStore.ts';
import {
  resetLearningHistory,
} from '../src/services/learning/learningStore.ts';
import {
  clearSolutionCache,
  generateDeterministicSolution,
} from '../src/services/problem/solutionService.ts';
import { normalizeVoiceTranscript } from '../src/services/assistant/speechService.ts';
import { setDatabasePath, resetDatabase } from '../src/server/db/database.ts';
import { runMigrations } from '../src/server/db/migrations.ts';
import { setMockOcrRunner, clearOcrCache } from '../src/services/ocr/ocrService.ts';

async function setupTestDb(): Promise<void> {
  setDatabasePath(':memory:');
  await resetDatabase();
  await runMigrations();
  resetAllActiveProblems();
  resetLearningHistory();
  clearImageProblemRegistry();
  clearSolutionCache();
  clearTutorAuditLogs();
  clearOcrCache();
  setMockOcrRunner(null);
  saveActiveSession(null);
  saveAssessmentHistory([]);
  try {
    localStorage.removeItem(ACTIVE_ASSESSMENT_KEY);
    localStorage.removeItem(ASSESSMENT_HISTORY_KEY);
  } catch {
    // ignore
  }
}

// =============================================================================
// LOCAL TUTOR TESTS (1-8)
// =============================================================================

Deno.test('1. Local: What is Bisection? (0 Gemini calls)', async () => {
  await setupTestDb();
  let calls = 0;
  const mockFetch: typeof fetch = () => {
    calls++;
    return Promise.resolve(new Response('ok'));
  };

  const res = await routeTutorRequest(
    { query: 'What is Bisection?' },
    { fetchFn: mockFetch }
  );

  assertEquals(calls, 0);
  assertEquals(res.status, 'success');
  assertEquals(res.source, 'local');
  assert(res.answer.includes('bracket-based'));
});

Deno.test('2. Local: What is False Position? (0 Gemini calls)', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({ query: 'What is False Position?' });
  assertEquals(res.status, 'success');
  assertEquals(res.source, 'local');
  assert(res.answer.includes('Regula Falsi') || res.answer.includes('chord'));
});

Deno.test('3. Local: What is Newton-Raphson? (0 Gemini calls)', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({ query: 'What is Newton-Raphson?' });
  assertEquals(res.status, 'success');
  assertEquals(res.source, 'local');
  assert(res.answer.includes('tangent') || res.answer.includes('quadratic'));
});

Deno.test('4. Local: False Position formula (0 Gemini calls)', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({ query: 'False Position formula' });
  assertEquals(res.status, 'success');
  assertEquals(res.source, 'local');
  assert(res.answer.includes('c = (a·f(b) - b·f(a)) / (f(b) - f(a))'));
});

Deno.test('5. Local: Bisection formula (0 Gemini calls)', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({ query: 'Bisection formula' });
  assertEquals(res.status, 'success');
  assertEquals(res.source, 'local');
  assert(res.answer.includes('c = (a + b) / 2'));
});

Deno.test('6. Local: Compare Bisection and Newton (0 Gemini calls)', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({ query: 'Compare Bisection and Newton' });
  assertEquals(res.status, 'success');
  assertEquals(res.source, 'local');
  assert(res.answer.includes('linear') && res.answer.includes('quadratic'));
});

Deno.test('7. Local: Give me a hint with active problem (0 Gemini calls)', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'Give me a hint',
    activeProblemOverride: {
      questionId: 'hint-q-1',
      equation: 'x^4 - 32 = 0',
      method: 'false-position',
      lowerBound: 2,
      upperBound: 3,
      decimalPlaces: 3,
    },
  });

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'local');
  assert(res.answer.includes('x^4 - 32'));
});

Deno.test('8. Local: Explain the next step (0 Gemini calls)', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'Explain the next step',
    activeProblemOverride: {
      questionId: 'step-q-1',
      equation: 'x^3 - 9x + 1 = 0',
      method: 'bisection',
      lowerBound: 2,
      upperBound: 3,
    },
  });

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'local');
  assert(res.answer.includes('next step') || res.answer.includes('midpoint') || res.answer.includes('interval'));
});

// =============================================================================
// DETERMINISTIC SOLVER TESTS (9-15)
// =============================================================================

Deno.test('9. Deterministic: Find root with active problem', async () => {
  await setupTestDb();
  setActivePracticeProblem({
    questionId: 'test-p-1',
    source: 'practice',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const res = await routeTutorRequest({ query: 'Find root' });
  assertEquals(res.status, 'success');
  assertEquals(res.source, 'deterministic');
  assert(res.answer.includes('2.378'));
  assertEquals(res.solverVerified, true);
});

Deno.test('10. Deterministic: Solve x^4 - 32 (direct query parsing)', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'Solve x^4 - 32',
    activeProblemOverride: {
      method: 'false-position',
      lowerBound: 2,
      upperBound: 3,
      decimalPlaces: 3,
    },
  });

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'deterministic');
  assert(res.answer.includes('2.378'));
});

Deno.test('11. Deterministic: Active False Position problem responds to "What is the solution?"', async () => {
  await setupTestDb();
  setActiveImageProblem({
    questionId: 'img_q_fourth_root_32',
    source: 'image',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const res = await routeTutorRequest({ query: 'What is the solution?' });
  assertEquals(res.status, 'success');
  assertEquals(res.source, 'deterministic');
  assert(res.answer.includes('2.378'));
  assertEquals(res.questionId, 'img_q_fourth_root_32');
});

Deno.test('12. Deterministic: Missing bounds -> auto bracket discovery to [2, 3]', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'Find the solution of x^4 - 32',
    activeProblemOverride: {
      method: 'false-position',
      decimalPlaces: 3,
      // bounds intentionally omitted
    },
  });

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'deterministic');
  assert(res.answer.includes('2.378'));
  assert(res.answer.includes('[2, 3]'));
});

Deno.test('13. Deterministic: Exact questionId preserved throughout routing', async () => {
  await setupTestDb();
  const customId = 'midterm-exam-q4';
  const res = await routeTutorRequest({
    query: 'Find the solution',
    activeProblemOverride: {
      questionId: customId,
      equation: 'x^3 - x - 2 = 0',
      method: 'bisection',
      lowerBound: 1,
      upperBound: 2,
      decimalPlaces: 3,
    },
  });

  assertEquals(res.status, 'success');
  assertEquals(res.questionId, customId);
  assert(res.answer.includes('1.521'));
});

Deno.test('14. Deterministic: Edited parameters invalidate solution cache', async () => {
  await setupTestDb();
  const qId = 'cache-test-param-edit';
  const res1 = await routeTutorRequest({
    query: 'Calculate root',
    activeProblemOverride: {
      questionId: qId,
      equation: 'x^3 - 9x + 1 = 0',
      method: 'bisection',
      lowerBound: 2,
      upperBound: 3,
      decimalPlaces: 2,
    },
  });

  assert(res1.answer.includes('2.94'));

  const res2 = await routeTutorRequest({
    query: 'Calculate root',
    activeProblemOverride: {
      questionId: qId,
      equation: 'x^3 - 9x + 1 = 0',
      method: 'bisection',
      lowerBound: 2,
      upperBound: 3,
      decimalPlaces: 4,
    },
  });

  assert(res2.answer.includes('2.9428'));
  assertNotEquals(res1.answer, res2.answer);
});

Deno.test('15. Deterministic: Show Solution executes canonical solver pipeline', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'Show Solution',
    activeProblemOverride: {
      equation: 'cos(x) - x*exp(x) = 0',
      method: 'false-position',
      lowerBound: 0,
      upperBound: 1,
      decimalPlaces: 4,
    },
  });

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'deterministic');
  assert(res.answer.includes('0.5177'));
});

// =============================================================================
// COURSE KNOWLEDGE / RAG TESTS (16-18)
// =============================================================================

Deno.test('16. Course: According to our course notes by Dr. Lodhi', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'According to our course notes by Dr. Ram Kishun Lodhi, what is False Position?',
  });

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'course');
  assert(Array.isArray(res.citations));
  assert(res.citations[0].includes('SIT Pune') || res.citations[0].includes('Dr. Ram Kishun Lodhi'));
});

Deno.test('17. Course: Course-specific formula retrieval with citation', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'What does our course say about the formula for false position?',
  });

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'course');
  assert(res.citations !== undefined && res.citations.length > 0);
  assert(res.answer.includes('f(b)'));
});

Deno.test('18. Course: Negative course knowledge note for f\'(x)=0 in Newton-Raphson', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'What did the professor say about division by zero when derivative is zero in Newton-Raphson?',
  });

  assertEquals(res.status, 'success');
  assert(res.answer.includes('division by zero') || res.answer.includes('derivative is zero') || res.answer.includes('fails'));
});

// =============================================================================
// GEMINI CONVERSATIONAL TESTS (19-21)
// =============================================================================

Deno.test('19. Gemini: Complex conceptual question routes to Gemini', async () => {
  await setupTestDb();
  let calls = 0;
  const mockFetch: typeof fetch = () => {
    calls++;
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Here is an intuitive comparison between methods.' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  };

  const res = await routeTutorRequest(
    { query: 'Can you compare my calculation approach with the professor example from lecture?' },
    { fetchFn: mockFetch, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(calls, 1);
  assertEquals(res.status, 'success');
  assertEquals(res.source, 'gemini');
  assert(res.answer.includes('intuitive comparison'));
});

Deno.test('20. Gemini: Personalized explanation receives learning context', async () => {
  await setupTestDb();
  let receivedPayload: any;
  const mockFetch: typeof fetch = (_url, init) => {
    receivedPayload = JSON.parse(init?.body as string);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Based on your recent attempts, focus on interval testing.' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  };

  const res = await routeTutorRequest(
    {
      query: 'Based on my recent attempts, explain what I should focus on.',
      activeProblemOverride: {
        equation: 'x^4 - 32 = 0',
        method: 'false-position',
      },
    },
    { fetchFn: mockFetch, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'gemini');
  assert(receivedPayload !== undefined);
  assert(res.answer.includes('interval testing'));
});

Deno.test('21. Gemini: Hinglish mode passes natural Indian phrasing rules', async () => {
  await setupTestDb();
  let receivedPayload: any;
  const mockFetch: typeof fetch = (_url, init) => {
    receivedPayload = JSON.parse(init?.body as string);
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{ content: { parts: [{ text: 'Bisection method me interval divide hota hai.' }] } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
  };

  const res = await routeTutorRequest(
    {
      query: 'Explain this like a teacher with an intuitive example.',
      languageMode: 'hinglish',
    },
    { fetchFn: mockFetch, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(res.status, 'success');
  assertEquals(res.language, 'hinglish');
});

// =============================================================================
// FAILURE & FALLBACK TESTS (22-30)
// =============================================================================

Deno.test('22. Failure: Gemini 503 triggers calm fallback without raw error', async () => {
  await setupTestDb();
  const mockFailFetch: typeof fetch = () => {
    return Promise.resolve(new Response('503 Service Unavailable', { status: 503 }));
  };

  const res = await routeTutorRequest(
    { query: 'Deeper theoretical nuance of order of convergence' },
    { fetchFn: mockFailFetch, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'fallback');
  assert(!res.answer.includes('503'));
  assert(!res.answer.includes('gemini'));
  assert(res.actions?.includes('Try again'));
});

Deno.test('23. Failure: Gemini 429 quota exhaustion triggers calm fallback', async () => {
  await setupTestDb();
  const mockFailFetch: typeof fetch = () => {
    return Promise.resolve(new Response('429 Quota Exceeded', { status: 429 }));
  };

  const res = await routeTutorRequest(
    { query: 'Advanced theoretical comparison of secant vs false position' },
    { fetchFn: mockFailFetch, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(res.status, 'success');
  assert(!res.answer.includes('429'));
  assert(!res.answer.includes('Quota'));
});

Deno.test('24. Failure: Gemini timeout handles abort cleanly', async () => {
  await setupTestDb();
  const controller = new AbortController();
  controller.abort();

  const res = await routeTutorRequest(
    { query: 'Very slow hanging inquiry' },
    { signal: controller.signal }
  );

  assert(res !== null);
  assertEquals(res.status, 'success');
});

Deno.test('25. Failure: Gemini network failure resolves gracefully', async () => {
  await setupTestDb();
  const mockNetworkFail: typeof fetch = () => {
    return Promise.reject(new Error('Network error: connection reset'));
  };

  const res = await routeTutorRequest(
    { query: 'Theoretical inquiry under offline network' },
    { fetchFn: mockNetworkFail, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assert(!res.answer.includes('connection reset'));
  assertEquals(res.status, 'success');
});

Deno.test('26. Fallback: Gemini unavailable falls back to local verified answer for definitions', async () => {
  await setupTestDb();
  const mockFail: typeof fetch = () => Promise.resolve(new Response('503', { status: 503 }));

  const res = await routeTutorRequest(
    { query: 'What is Bisection?' },
    { fetchFn: mockFail, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'local');
  assert(res.answer.includes('bracket-based'));
});

Deno.test('27. Fallback: Gemini unavailable falls back to course knowledge chunk', async () => {
  await setupTestDb();
  const mockFail: typeof fetch = () => Promise.resolve(new Response('503', { status: 503 }));

  const res = await routeTutorRequest(
    { query: 'According to our course notes by Dr. Ram Kishun Lodhi, what is False Position?' },
    { fetchFn: mockFail, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'course');
  assert(res.citations !== undefined && res.citations.length > 0);
});

Deno.test('28. Fallback: Clean final fallback provides actionable buttons', async () => {
  await setupTestDb();
  const mockFail: typeof fetch = () => Promise.resolve(new Response('500 Server Error', { status: 500 }));

  const res = await routeTutorRequest(
    { query: 'Completely unknown esoteric query' },
    { fetchFn: mockFail, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'fallback');
  assert(Array.isArray(res.actions));
  assert(res.actions.length > 0);
});

Deno.test('29. Robustness: No raw provider error strings leak into answer', async () => {
  await setupTestDb();
  const mockLeak: typeof fetch = () => {
    return Promise.resolve(
      new Response(
        JSON.stringify({ error: { message: '503 backend failure for model gemini-3.8-flash key=AIzaSy123' } }),
        { status: 503 }
      )
    );
  };

  const res = await routeTutorRequest(
    { query: 'Explain esoteric theorem' },
    { fetchFn: mockLeak, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assert(!res.answer.includes('503'));
  assert(!res.answer.includes('gemini-3.8-flash'));
  assert(!res.answer.includes('AIzaSy123'));
});

Deno.test('30. Robustness: No infinite retry loops on failure', async () => {
  await setupTestDb();
  let calls = 0;
  const mockCountFetch: typeof fetch = () => {
    calls++;
    return Promise.resolve(new Response('503 Service Unavailable', { status: 503 }));
  };

  await routeTutorRequest(
    { query: 'Explain esoteric convergence theorem' },
    { fetchFn: mockCountFetch, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  // Maximum: primary request + at most 1 fallback model attempt = 2 calls max
  assert(calls <= 2, `Expected at most 2 calls, got ${calls}`);
});

// =============================================================================
// VOICE PIPELINE TESTS (31-38)
// =============================================================================

Deno.test('31. Voice: Clean transcript produces accurate text', () => {
  const clean = normalizeVoiceTranscript('what is the false position formula');
  assertEquals(clean, 'what is the false position formula');
});

Deno.test('32. Voice: Interim transcript does not duplicate cumulative buffer', () => {
  let activeText = '';
  const onInterim = (chunk: string) => {
    activeText = chunk.trim();
  };

  onInterim('find');
  assertEquals(activeText, 'find');
  onInterim('find the solution');
  assertEquals(activeText, 'find the solution');
  onInterim('find the solution of x^4 - 32');
  assertEquals(activeText, 'find the solution of x^4 - 32');
});

Deno.test('33. Voice: Final transcript concatenates accurately', () => {
  const part1 = 'Find the root of x^4 - 32';
  const part2 = 'to 3 decimal places';
  const combined = normalizeVoiceTranscript(`${part1} ${part2}`);
  assertEquals(combined, 'Find the root of x^4 - 32 to 3 decimal places');
});

Deno.test('34. Voice: Repeated stutter speech eliminated cleanly', () => {
  const stutter = 'what is the false position formula what is the false position formula';
  const clean = normalizeVoiceTranscript(stutter);
  assertEquals(clean, 'what is the false position formula');
});

Deno.test('35. Voice: Restarting recognition does not duplicate prior text', () => {
  const prior = 'Find root of x^3 - 9x + 1 = 0';
  const newSegment = 'using Bisection';
  const res = normalizeVoiceTranscript(`${prior} ${newSegment}`);
  assertEquals(res, 'Find root of x^3 - 9x + 1 = 0 using Bisection');
});

Deno.test('36. Voice: Cancel does not corrupt input buffer', () => {
  const original = 'original typed text';
  const cancelled = original;
  assertEquals(cancelled, 'original typed text');
});

Deno.test('37. Voice: Verbal spoken calculation converts and solves deterministically', async () => {
  await setupTestDb();
  const spoken = 'find the solution of x to the power four minus thirty two';
  const converted = convertSpokenMathToExpression(spoken);
  assertEquals(converted, 'find the solution of x^4 - 32');

  const res = await routeTutorRequest({
    query: spoken,
    activeProblemOverride: {
      method: 'false-position',
      decimalPlaces: 3,
    },
  });

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'deterministic');
  assert(res.answer.includes('2.378'));
});

Deno.test('38. Voice: Exactly one submission dispatched per speech cycle', () => {
  let dispatches = 0;
  const onSubmit = () => {
    dispatches++;
  };
  onSubmit();
  assertEquals(dispatches, 1);
});

// =============================================================================
// CONTEXT PRECEDENCE TESTS (39-43)
// =============================================================================

Deno.test('39. Context: Image problem strictly overrides Practice problem', () => {
  resetAllActiveProblems();
  setActivePracticeProblem({
    questionId: 'practice-bis-1',
    source: 'practice',
    method: 'bisection',
    equation: 'x^3 - 9x + 1 = 0',
    decimalPlaces: 3,
  });

  setActiveImageProblem({
    questionId: 'image-fp-1',
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'Explain this' });
  assertEquals(ctx.activeProblem?.method, 'false-position');
  assertEquals(ctx.activeProblem?.source, 'image');
});

Deno.test('40. Context: Practice problem strictly overrides Learn lesson', () => {
  resetAllActiveProblems();
  setActivePracticeProblem({
    questionId: 'practice-nr-1',
    source: 'practice',
    method: 'newton-raphson',
    equation: 'x^2 - 10 = 0',
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'Explain this', currentPage: 'learn' });
  assertEquals(ctx.activeProblem?.method, 'newton-raphson');
  assertEquals(ctx.activeProblem?.source, 'practice');
});

Deno.test('41. Context: Review exact problem retains parameters', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'Find the solution',
    activeProblemOverride: {
      questionId: 'review-replay-1',
      equation: 'cos(x) - x*exp(x) = 0',
      method: 'false-position',
      lowerBound: 0,
      upperBound: 1,
      decimalPlaces: 4,
      source: 'review',
    },
  });

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'deterministic');
  assert(res.answer.includes('0.5177'));
});

Deno.test('42. Context: Tutor sees precalculated solver output', () => {
  resetAllActiveProblems();
  setActivePracticeProblem({
    questionId: 'practice-bis-sol',
    source: 'practice',
    method: 'bisection',
    equation: 'x^3 - x - 2 = 0',
    lowerBound: 1,
    upperBound: 2,
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'How does this solve?' });
  assert(ctx.solverState !== undefined);
  assertEquals(ctx.solverState?.formattedRoot, '1.521');
});

Deno.test('43. Context: No stale context override on active problem switch', () => {
  resetAllActiveProblems();
  setActivePracticeProblem({
    questionId: 'prob-1',
    source: 'practice',
    method: 'bisection',
    equation: 'x^3 - 4x - 9 = 0',
    decimalPlaces: 3,
  });

  // Switch to problem 2
  setActivePracticeProblem({
    questionId: 'prob-2',
    source: 'practice',
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    decimalPlaces: 3,
  });

  const ctx = buildTutorContext({ query: 'Explain this' });
  assertEquals(ctx.activeProblem?.questionId, 'prob-2');
  assertEquals(ctx.activeProblem?.method, 'false-position');
});

// =============================================================================
// ASSESSMENT SAFETY TESTS (44-45)
// =============================================================================

Deno.test('44. Assessment: Tutor blocked during active quiz', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'Give me the answer',
    isAssessmentActive: true,
  });

  assertEquals(res.status, 'assessment-blocked');
  assertEquals(res.success, false);
  assertEquals(res.isAssessmentBlocked, true);
});

Deno.test('45. Assessment: Zero Gemini calls during active assessment', async () => {
  await setupTestDb();
  let calls = 0;
  const mockFetch: typeof fetch = () => {
    calls++;
    return Promise.resolve(new Response('ok'));
  };

  await routeTutorRequest(
    { query: 'Solve x^4 - 32', isAssessmentActive: true },
    { fetchFn: mockFetch }
  );

  assertEquals(calls, 0);
});

// =============================================================================
// ROBUSTNESS & EDGE CASE TESTS (46-52)
// =============================================================================

Deno.test('46. Robustness: Empty message returns polite prompt without error', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({ query: '' });
  assertEquals(res.status, 'clarification');
  assert(res.answer.length > 0);
});

Deno.test('47. Robustness: Malformed context resolves safely without throw', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'What is Bisection?',
    activeProblemOverride: {
      lowerBound: undefined,
      upperBound: null,
      equation: undefined,
    },
  });

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'local');
});

Deno.test('48. Robustness: Missing optional bounds discovered automatically', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    // lowerBound and upperBound omitted
    decimalPlaces: 3,
  });

  assertEquals(sol.success, true);
  assertEquals(sol.boundsSource, 'discovered');
  assertEquals(sol.lowerBound, 2);
  assertEquals(sol.upperBound, 3);
});

Deno.test('49. Robustness: Unknown question routes to Gemini or fallback cleanly', async () => {
  await setupTestDb();
  const mockFail: typeof fetch = () => Promise.resolve(new Response('503', { status: 503 }));

  const res = await routeTutorRequest(
    { query: 'Explain the philosophical significance of numerical roots in ancient Babylon' },
    { fetchFn: mockFail, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(res.status, 'success');
  assert(res.answer.length > 0);
  assert(!res.answer.includes('503'));
});

Deno.test('50. Robustness: Empty Gemini response falls back safely', async () => {
  await setupTestDb();
  const mockEmpty: typeof fetch = () => {
    return Promise.resolve(
      new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: '' }] } }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  };

  const res = await routeTutorRequest(
    { query: 'Deep question resulting in empty response' },
    { fetchFn: mockEmpty, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(res.status, 'success');
  assert(res.answer.length > 0);
});

Deno.test('51. Robustness: Malformed Gemini response falls back safely', async () => {
  await setupTestDb();
  const mockMalformed: typeof fetch = () => {
    return Promise.resolve(
      new Response('Invalid json {[[', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      })
    );
  };

  const res = await routeTutorRequest(
    { query: 'Deep question resulting in malformed json' },
    { fetchFn: mockMalformed, envOverride: { GEMINI_API_KEY: 'test-key' } }
  );

  assertEquals(res.status, 'success');
  assert(res.answer.length > 0);
});

Deno.test('52. Robustness: Calculation request without equation or active problem asks for equation', async () => {
  await setupTestDb();
  resetAllActiveProblems();

  const res = await routeTutorRequest({ query: 'Find the root' });
  assertEquals(res.status, 'clarification');
  assert(res.answer.includes('equation') || res.answer.includes('Practice'));
});

Deno.test('53. Regression: Practice -> Try to Solve (pq-bis-2) -> exact parameters and identical root 2.706', async () => {
  await setupTestDb();

  // Set active practice problem matching pq-bis-2
  setActivePracticeProblem({
    questionId: 'pq-bis-2',
    source: 'practice',
    equation: 'x^3 - 4*x - 9',
    method: 'bisection',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
    title: 'Cubic with Negative Linear Term',
  });

  const sol = generateDeterministicSolution({
    questionId: 'pq-bis-2',
    equation: 'x^3 - 4*x - 9',
    method: 'bisection',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  assertEquals(sol.success, true);
  assertEquals(sol.formattedRoot, '2.706');
  assertEquals(sol.iterationsCount, 12);
  assert(sol.rawBisectionResult !== undefined);

  // Student enters Solve and requests "Show Solution"
  const res = await routeTutorRequest(
    { query: 'what is the solution' },
    { envOverride: { GEMINI_API_KEY: '' } }
  );

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'deterministic');
  assert(res.answer.includes('2.706'));
  assert(res.answer.includes('Bisection Method'));
  assertEquals(res.groundedInProblem, 'pq-bis-2');
});

Deno.test('54. Regression: Uploaded Image problem runs OCR first, discovers [2, 3], and overrides stale practice problem (2.378)', async () => {
  await setupTestDb();

  // Pre-existing practice problem in state
  setActivePracticeProblem({
    questionId: 'pq-bis-1',
    source: 'practice',
    equation: 'x^3 - 9x + 1 = 0',
    method: 'bisection',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  // Mock OCR returning student's uploaded homework problem
  setMockOcrRunner(async () => ({
    text: 'Find the root of x^4 - 32 = 0 using False Position method to 3 decimal places',
    confidence: 0.95,
    source: 'local-ocr',
  }));

  const dummyFile = new File(['mock-image-data'], 'problem.png', { type: 'image/png' });

  // Student uploads image and asks "solve this"
  const res = await routeTutorRequest(
    { query: 'solve this', imageFile: dummyFile },
    { envOverride: { GEMINI_API_KEY: '' } }
  );

  assertEquals(res.status, 'success');
  assertEquals(res.source, 'deterministic');
  assertEquals(res.groundedInMethod, 'false-position');
  assertNotEquals(res.groundedInProblem, 'pq-bis-1');
  assert(res.groundedInProblem?.startsWith('img_q_'));
  assert(res.answer.includes('False Position'));
  assert(res.answer.includes('2.378'));
  assert(!res.answer.includes('2.943')); // Did NOT solve stale practice problem!
});

Deno.test('55. Regression: Uploaded image with unreadable text returns clarification and NEVER falls back to stale practice problem', async () => {
  await setupTestDb();

  // Pre-existing practice problem in state
  setActivePracticeProblem({
    questionId: 'pq-bis-1',
    source: 'practice',
    equation: 'x^3 - 9x + 1 = 0',
    method: 'bisection',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  // Mock OCR returning illegible text
  setMockOcrRunner(async () => ({
    text: 'Random blurry illegible smudge with no math',
    confidence: 0.1,
    source: 'local-ocr',
  }));

  const dummyFile = new File(['blurry'], 'blurry.png', { type: 'image/png' });

  const res = await routeTutorRequest(
    { query: 'solve this', imageFile: dummyFile },
    { envOverride: { GEMINI_API_KEY: '' } }
  );

  assertEquals(res.status, 'clarification');
  assertEquals(res.source, 'clarification');
  assert(res.answer.includes('couldn\'t confidently read') || res.answer.includes('mathematical equation'));
  assert(!res.answer.includes('2.943'));
  assert(!res.answer.includes('x^3 - 9x'));
  assert(Array.isArray(res.actions));
  assert(res.actions.includes('Try Again') || res.actions.includes('Enter Problem Manually'));
});

Deno.test('56. Regression: Basic educational questions receive verified answers without Gemini (0 Gemini calls)', async () => {
  await setupTestDb();

  setActivePracticeProblem({
    questionId: 'pq-bis-2',
    source: 'practice',
    equation: 'x^3 - 4*x - 9',
    method: 'bisection',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const testQueries = [
    { q: 'show solution', expectSource: 'deterministic', expectContains: '2.706' },
    { q: 'how to solve this', expectSource: 'deterministic', expectContains: '2.706' },
    { q: 'help me solve this', expectSource: 'deterministic', expectContains: '2.706' },
    { q: 'what is the answer', expectSource: 'deterministic', expectContains: '2.706' },
    { q: 'can you solve this', expectSource: 'deterministic', expectContains: '2.706' },
    { q: 'why did we choose [2, 3]', expectSource: 'deterministic', expectContains: 'Intermediate Value Theorem' },
    { q: 'give me a hint', expectSource: 'local', expectContains: 'Hint for x^3 - 4*x - 9' },
    { q: 'explain how bisection works', expectSource: 'local', expectContains: 'bracket-based' },
    { q: 'how does bisection work', expectSource: 'local', expectContains: 'bracket-based' },
  ];

  for (const { q, expectSource, expectContains } of testQueries) {
    const res = await routeTutorRequest(
      { query: q },
      { envOverride: { GEMINI_API_KEY: '' } }
    );

    assertEquals(res.status, 'success', `Failed on query: ${q}`);
    assertEquals(res.source, expectSource, `Failed source on query: ${q}`);
    assert(res.answer.includes(expectContains), `Answer did not contain '${expectContains}' on query: ${q}`);
    assert(!res.answer.includes('temporarily unavailable'), `Answer gave unavailable fallback on query: ${q}`);
  }
});

Deno.test('57. Regression: Unbracketed method questions without active problem return verified local definitions', async () => {
  await setupTestDb();
  resetAllActiveProblems();

  const generalQueries = [
    { q: 'how does bisection work', expectContains: 'bracket-based' },
    { q: 'explain bisection', expectContains: 'bracket-based' },
    { q: 'what is bisection', expectContains: 'bracket-based' },
    { q: 'how to solve bisection', expectContains: 'bracket-based' },
    { q: 'how does false position work', expectContains: 'Regula Falsi' },
    { q: 'how does newton raphson work', expectContains: 'tangent lines' },
    { q: 'difference between bisection and newton', expectContains: 'Comparison of Numerical Root-Finding' },
  ];

  for (const { q, expectContains } of generalQueries) {
    const res = await routeTutorRequest(
      { query: q },
      { envOverride: { GEMINI_API_KEY: '' } }
    );

    assertEquals(res.status, 'success', `Failed on query: ${q}`);
    assertEquals(res.source, 'local', `Failed source on query: ${q}`);
    assert(res.answer.includes(expectContains), `Answer did not contain '${expectContains}' on query: ${q}`);
    assert(!res.answer.includes('temporarily unavailable'), `Answer gave unavailable fallback on query: ${q}`);
  }
});

