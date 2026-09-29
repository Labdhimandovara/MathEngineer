/**
 * Phase 13.5 Test Suite:
 * Final Tutor Teaching + Hinglish + Solution Completeness Fix
 * 
 * Verifies all 25 specific test scenarios:
 *  1. Hinglish request explicitly detected from query ("Explain in Hinglish") -> switches mode & persists
 *  2. Hinglish query with active problem returns complete Hinglish breakdown
 *  3. Hinglish query without active problem returns friendly Hinglish greeting
 *  4. Compound queries strip language directive ("What is bisection in Hinglish")
 *  5. "Explain in English" switches back to English & persists preference
 *  6. False Position x^4 - 32 = 0 generates complete 7-section solution
 *  7. Complete solution: Given section contains equation, method, interval, and precision
 *  8. Complete solution: Step 1 contains initial bracket check (IVT) with f(a), f(b)
 *  9. Complete solution: Step 2 contains explicit False Position formula
 * 10. Complete solution: Step 3 contains markdown iteration table
 * 11. Complete solution: Step 4 contains stopping condition
 * 12. Complete solution: Final Answer contains verified root 2.378
 * 13. Complete solution: Easy Explanation contains pedagogical teacher explanation
 * 14. Bisection complete solution contains 7 sections and midpoint formula
 * 15. Newton-Raphson complete solution contains derivative, initial guess, and 7 sections
 * 16. Complete solution in Hinglish renders natural Hindi grammar in Latin script with English math terms
 * 17. Speech text for complete solution is concise and avoids markdown table pipes
 * 18. Grounding metadata in TutorResponse matches active problem method (false-position)
 * 19. Grounding metadata in TutorResponse includes groundedEquation (x^4 - 32 = 0)
 * 20. Grounding metadata eliminates stale newton-raphson (x^4 - x - 10)
 * 21. Image problem upload immediately overrides prior Practice/Solve context in grounding metadata
 * 22. "Why did we choose [2, 3]?" in Hinglish returns natural Hinglish IVT explanation
 * 23. Formula requests in Hinglish return natural Hinglish formula guide
 * 24. Next step requests in Hinglish return natural Hinglish next step guide
 * 25. Definitions in Hinglish return natural Hinglish definitions
 */

import { assertEquals, assertNotEquals, assert } from 'jsr:@std/assert';
import {
  routeTutorRequest,
  convertSpokenMathToExpression,
  clearTutorAuditLogs,
} from '../src/services/tutor/tutorOrchestrator.ts';
import {
  getLanguageMode,
  setLanguageMode,
} from '../src/services/tutor/languageMode.ts';
import {
  formatCompleteDeterministicSolution,
  formatSolutionSpeechText,
} from '../src/services/tutor/solutionFormatter.ts';
import {
  setActiveProblem,
  setActiveImageProblem,
  setActivePracticeProblem,
  resetAllActiveProblems,
  getActiveAssistantContext,
} from '../src/services/problem/activeProblemStore.ts';
import {
  clearImageProblemRegistry,
} from '../src/services/problem/imageProblemRegistry.ts';
import {
  resetLearningHistory,
} from '../src/services/learning/learningStore.ts';
import {
  clearSolutionCache,
  generateDeterministicSolution,
} from '../src/services/problem/solutionService.ts';
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
  setLanguageMode('english');
}

// -----------------------------------------------------------------------------
// HINGLISH LANGUAGE SWITCHING & PERSISTENCE (1-5)
// -----------------------------------------------------------------------------

Deno.test('1. Hinglish request explicitly detected from query ("Explain in Hinglish") -> switches mode & persists', async () => {
  await setupTestDb();
  assertEquals(getLanguageMode(), 'english');

  const res = await routeTutorRequest({ query: 'Explain in Hinglish' });
  assertEquals(res.status, 'success');
  assertEquals(res.language, 'hinglish');
  assertEquals(getLanguageMode(), 'hinglish');
});

Deno.test('2. Hinglish query with active problem returns complete Hinglish explanation of active problem', async () => {
  await setupTestDb();
  setActiveImageProblem({
    questionId: 'img_test_fp',
    source: 'image',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const res = await routeTutorRequest({ query: 'Explain in Hinglish' });
  assertEquals(res.status, 'success');
  assertEquals(res.language, 'hinglish');
  assert(res.answer.includes('False Position'));
  assert(res.answer.includes('x^4 - 32'));
  assert(res.answer.includes('2.378'));
  assert(res.answer.includes('Given'));
  assert(res.answer.includes('Aasan bhasha me samjhein'));
});

Deno.test('3. Hinglish query without active problem returns friendly Hinglish greeting', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({ query: 'Explain in Hinglish' });
  assertEquals(res.status, 'success');
  assertEquals(res.language, 'hinglish');
  assert(res.answer.includes('Ab se main sab kuch natural Hinglish me explain karunga'));
});

Deno.test('4. Compound queries strip language directive ("What is bisection in Hinglish")', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({ query: 'What is bisection in Hinglish?' });
  assertEquals(res.status, 'success');
  assertEquals(res.language, 'hinglish');
  assertEquals(res.source, 'local');
  assert(res.answer.includes('Bisection method ek bracket-based'));
  assertEquals(getLanguageMode(), 'hinglish');
});

Deno.test('5. "Explain in English" switches back to English & persists preference', async () => {
  await setupTestDb();
  setLanguageMode('hinglish');
  assertEquals(getLanguageMode(), 'hinglish');

  const res = await routeTutorRequest({ query: 'Explain in English' });
  assertEquals(res.status, 'success');
  assertEquals(res.language, 'english');
  assertEquals(getLanguageMode(), 'english');
  assert(res.answer.includes('standard English'));
});

// -----------------------------------------------------------------------------
// COMPLETE 7-SECTION SOLUTION (6-13)
// -----------------------------------------------------------------------------

Deno.test('6. False Position x^4 - 32 = 0 generates complete 7-section solution', async () => {
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

  const res = await routeTutorRequest({ query: 'Show solution' });
  assertEquals(res.status, 'success');
  assertEquals(res.source, 'deterministic');
  assertEquals(res.solverVerified, true);

  // Check that all 7 sections are present
  assert(res.answer.includes('### Given'));
  assert(res.answer.includes('### Step 1 — Initial Bracket Check (IVT)'));
  assert(res.answer.includes('### Step 2 — False Position Iteration Formula'));
  assert(res.answer.includes('### Step 3 — Iteration Table'));
  assert(res.answer.includes('### Step 4 — Stopping Condition'));
  assert(res.answer.includes('### Final Answer'));
  assert(res.answer.includes('### Easy Explanation'));
});

Deno.test('7. Complete solution: Given section contains equation, method, interval, and precision', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const formatted = formatCompleteDeterministicSolution(sol, 'english');
  assert(formatted.includes('Equation: x^4 - 32 = 0'));
  assert(formatted.includes('Method: False Position'));
  assert(formatted.includes('Starting Interval: [2, 3]'));
  assert(formatted.includes('Target Precision: 3 decimal places'));
});

Deno.test('8. Complete solution: Step 1 contains initial bracket check (IVT) with f(a), f(b)', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const formatted = formatCompleteDeterministicSolution(sol, 'english');
  assert(formatted.includes('f(a) = f(2) = -16.0000'));
  assert(formatted.includes('f(b) = f(3) = 49.0000'));
  assert(formatted.includes('f(2) · f(3) < 0'));
  assert(formatted.includes('Intermediate Value Theorem'));
});

Deno.test('9. Complete solution: Step 2 contains explicit False Position formula', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const formatted = formatCompleteDeterministicSolution(sol, 'english');
  assert(formatted.includes('c = \\frac{a \\cdot f(b) - b \\cdot f(a)}{f(b) - f(a)}'));
});

Deno.test('10. Complete solution: Step 3 contains markdown iteration table', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const formatted = formatCompleteDeterministicSolution(sol, 'english');
  assert(formatted.includes('| Iteration | a | b | f(a) | f(b) | c | f(c) | Updated Interval |'));
  assert(formatted.includes('| 1 | 2.000 | 3.000 |'));
  assert(formatted.includes('2.246'));
  assert(sol.iterationsCount === 7);
});

Deno.test('11. Complete solution: Step 4 contains stopping condition', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const formatted = formatCompleteDeterministicSolution(sol, 'english');
  assert(formatted.includes('### Step 4 — Stopping Condition'));
  assert(formatted.includes('7'));
});

Deno.test('12. Complete solution: Final Answer contains verified root 2.378', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const formatted = formatCompleteDeterministicSolution(sol, 'english');
  assert(formatted.includes('### Final Answer'));
  assert(formatted.includes('**2.378**'));
});

Deno.test('13. Complete solution: Easy Explanation contains pedagogical teacher explanation', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const formatted = formatCompleteDeterministicSolution(sol, 'english');
  assert(formatted.includes('### Easy Explanation'));
  assert(formatted.includes('Intuitive Teacher Walkthrough'));
  assert(formatted.includes('chord'));
});

// -----------------------------------------------------------------------------
// BISECTION & NEWTON-RAPHSON COMPLETE SOLUTIONS (14-15)
// -----------------------------------------------------------------------------

Deno.test('14. Bisection complete solution contains 7 sections and midpoint formula', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^3 - 9x + 1 = 0',
    method: 'bisection',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 2,
  });

  const formatted = formatCompleteDeterministicSolution(sol, 'english');
  assert(formatted.includes('### Given'));
  assert(formatted.includes('### Step 1 — Initial Bracket Check (IVT)'));
  assert(formatted.includes('### Step 2 — Bisection Iteration Formula'));
  assert(formatted.includes('$$c = \\frac{a + b}{2}$$'));
  assert(formatted.includes('| Iteration | a | b | f(a) | f(b) | Midpoint c | f(c) | Updated Interval |'));
  assert(formatted.includes('### Final Answer'));
  assert(formatted.includes('2.94') || formatted.includes('2.9'));
});

Deno.test('15. Newton-Raphson complete solution contains derivative, initial guess, and 7 sections', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^4 - x - 10 = 0',
    method: 'newton-raphson',
    initialGuess: 2,
    decimalPlaces: 3,
  });

  const formatted = formatCompleteDeterministicSolution(sol, 'english');
  assert(formatted.includes('### Given'));
  assert(formatted.includes('### Step 1 — Derivative & Initial Condition'));
  assert(formatted.includes('### Step 2 — Newton-Raphson Iteration Formula'));
  assert(formatted.includes('| Iteration | x_n | f(x_n) | f\'(x_n) | x_{n+1} | |x_{n+1} - x_n| |'));
  assert(formatted.includes('### Final Answer'));
  assert(formatted.includes('1.856'));
});

// -----------------------------------------------------------------------------
// HINGLISH QUALITY & SPEECH TEXT (16-17)
// -----------------------------------------------------------------------------

Deno.test('16. Complete solution in Hinglish renders natural Hindi grammar in Latin script with English math terms', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const formatted = formatCompleteDeterministicSolution(sol, 'hinglish');
  assert(formatted.includes('False Position (Regula Falsi)'));
  assert(formatted.includes('Intermediate Value Theorem (IVT) ke mutabiq'));
  assert(formatted.includes('Linear secant chord formula'));
  assert(formatted.includes('Agar f(a) · f(c) < 0 hai, to root [a, c] me hai'));
  assert(formatted.includes('Is prakar, x^4 - 32 = 0 ka real root 3 decimal places tak **2.378** hai.'));
  assert(formatted.includes('Aasan bhasha me samjhein'));
});

Deno.test('17. Speech text for complete solution is concise and avoids markdown table pipes', async () => {
  await setupTestDb();
  const sol = generateDeterministicSolution({
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const speechEn = formatSolutionSpeechText(sol, 'english');
  assert(!speechEn.includes('|'));
  assert(!speechEn.includes('###'));
  assert(speechEn.includes('2.378'));

  const speechHi = formatSolutionSpeechText(sol, 'hinglish');
  assert(!speechHi.includes('|'));
  assert(!speechHi.includes('###'));
  assert(speechHi.includes('2.378'));
  assert(speechHi.includes('verified root'));
});

// -----------------------------------------------------------------------------
// GROUNDING METADATA ACCURACY (18-21)
// -----------------------------------------------------------------------------

Deno.test('18. Grounding metadata in TutorResponse matches active problem method (false-position)', async () => {
  await setupTestDb();
  setActiveImageProblem({
    questionId: 'img_test_root32',
    source: 'image',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const res = await routeTutorRequest({ query: 'Find the solution' });
  assertEquals(res.status, 'success');
  assertEquals(res.groundedInMethod, 'false-position');
  assertEquals(res.groundedInProblem, 'img_test_root32');
});

Deno.test('19. Grounding metadata in TutorResponse includes groundedEquation (x^4 - 32 = 0)', async () => {
  await setupTestDb();
  setActiveImageProblem({
    questionId: 'img_test_root32',
    source: 'image',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const res = await routeTutorRequest({ query: 'Find the root' });
  assertEquals(res.status, 'success');
  assertEquals(res.groundedEquation, 'x^4 - 32 = 0');
  assertEquals(res.groundedSource, 'image');
});

Deno.test('20. Grounding metadata eliminates stale newton-raphson (x^4 - x - 10)', async () => {
  await setupTestDb();
  // Simulate active practice problem being set
  setActivePracticeProblem({
    questionId: 'pq-newton-stale',
    source: 'practice',
    equation: 'x^4 - x - 10 = 0',
    method: 'newton-raphson',
    lowerBound: 1,
    upperBound: 2,
    initialGuess: 2,
    decimalPlaces: 3,
  });

  // Now an image problem is uploaded and activated
  setActiveImageProblem({
    questionId: 'img_fresh_fp',
    source: 'image',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const liveContext = getActiveAssistantContext('solve');
  assertEquals(liveContext.method, 'false-position');
  assertEquals(liveContext.equation, 'x^4 - 32 = 0');
  assertEquals(liveContext.source, 'image');

  const res = await routeTutorRequest({ query: 'Solve this' });
  assertEquals(res.groundedInMethod, 'false-position');
  assertEquals(res.groundedEquation, 'x^4 - 32 = 0');
  assertNotEquals(res.groundedInMethod, 'newton-raphson');
  assertNotEquals(res.groundedEquation, 'x^4 - x - 10');
});

Deno.test('21. Image problem upload immediately overrides prior Practice/Solve context in grounding metadata', async () => {
  await setupTestDb();
  const mockImage = new File(['mock content'], 'fourth_root_32.png', { type: 'image/png' });

  setMockOcrRunner(async () => {
    return {
      text: 'Find the fourth root of 32 by false position method',
      confidence: 0.95,
      provider: 'mock',
      source: 'local-ocr',
    };
  });

  const res = await routeTutorRequest({
    query: 'Solve this photo',
    imageFile: mockImage,
  });

  assertEquals(res.status, 'success');
  assertEquals(res.groundedInMethod, 'false-position');
  assertEquals(res.groundedEquation, 'x^4 - 32 = 0');
  assertEquals(res.groundedSource, 'image');
  assert(res.answer.includes('2.378'));
});

// -----------------------------------------------------------------------------
// HINGLISH TOPIC EXPLANATIONS (22-25)
// -----------------------------------------------------------------------------

Deno.test('22. "Why did we choose [2, 3]?" in Hinglish returns natural Hinglish IVT explanation', async () => {
  await setupTestDb();
  setActiveImageProblem({
    questionId: 'img_test_root32',
    source: 'image',
    equation: 'x^4 - 32 = 0',
    method: 'false-position',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });

  const res = await routeTutorRequest({
    query: 'Why did we choose [2, 3] in Hinglish?',
  });

  assertEquals(res.status, 'success');
  assertEquals(res.language, 'hinglish');
  assert(res.answer.includes('Intermediate Value Theorem (IVT) ke mutabiq'));
  assert(res.answer.includes('f(2) aur f(3) opposite signs ke hone chahiye'));
});

Deno.test('23. Formula requests in Hinglish return natural Hinglish formula guide', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'What is the formula in Hinglish?',
    activeProblemOverride: {
      equation: 'x^4 - 32 = 0',
      method: 'false-position',
    },
  });

  assertEquals(res.status, 'success');
  assertEquals(res.language, 'hinglish');
  assert(res.answer.includes('False Position (Regula Falsi) Formula'));
  assert(res.answer.includes('Chord Intercept Formula'));
});

Deno.test('24. Next step requests in Hinglish return natural Hinglish next step guide', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'Explain the next step in Hinglish',
    activeProblemOverride: {
      equation: 'x^4 - 32 = 0',
      method: 'false-position',
      lowerBound: 2,
      upperBound: 3,
      decimalPlaces: 3,
    },
  });

  assertEquals(res.status, 'success');
  assertEquals(res.language, 'hinglish');
  assert(res.answer.includes('Hint for x^4 - 32 = 0') || res.answer.includes('Next step for x^4 - 32 = 0'));
  assert(res.answer.includes('Chord formula apply karein'));
});

Deno.test('25. Definitions in Hinglish return natural Hinglish definitions', async () => {
  await setupTestDb();
  const res = await routeTutorRequest({
    query: 'What is Newton-Raphson in Hinglish?',
  });

  assertEquals(res.status, 'success');
  assertEquals(res.language, 'hinglish');
  assert(res.answer.includes('tangent lines ki madad se roots find karta hai'));
  assert(res.answer.includes('quadratic'));
});
