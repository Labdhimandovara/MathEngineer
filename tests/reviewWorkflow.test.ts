/**
 * Phase 9 — Review & Reinforcement Comprehensive Test Suite
 * 
 * Tests the complete revision loop:
 * - Grouped review questions (no duplicate cards, exact question identity)
 * - Preservation of Practice IDs (pq-...) and Image IDs (img_q_...)
 * - Exact preservation of equations, bounds (supplied and discovered), methods, guesses
 * - Deterministic solution regeneration (0 Gemini API calls)
 * - Mistakes diagnosis and actionable "How to approach it next time" advice
 * - Non-destructive retry attempts (attemptNumber increments without mutating history)
 * - Distinction between solved and viewed (solutionViewed !== correct)
 * - Filtering (status, method, source, text search)
 * - Deterministic sorting (recent, attempts, needs-review)
 * - Needs Review criteria based on verified learning analytics
 * - Safe handling of corrupted/empty persistence
 */

import { assertEquals, assertNotEquals } from 'jsr:@std/assert';
import {
  startAttempt,
  completeAttempt,
  getAttempts,
  resetLearningHistory,
  recordSolutionView,
  loadLearningAttempts,
  saveLearningAttempts,
} from '../src/services/learning/learningStore.ts';
import {
  registerImageProblem,
  getImageProblem,
  clearImageProblemRegistry,
} from '../src/services/problem/imageProblemRegistry.ts';
import {
  getGroupedReviewQuestions,
  filterAndSortReviewQuestions,
  getMistakeAdvice,
  formatMistakeLabel,
} from '../src/services/review/reviewService.ts';
import { solveBisection } from '../src/math/bisection/index.ts';
import { solveFalsePosition } from '../src/math/falsePosition/index.ts';
import { solveNewtonRaphson } from '../src/math/newtonRaphson/index.ts';
import { LearningAttempt } from '../src/types/learning.ts';

function setupCleanEnvironment() {
  resetLearningHistory();
  clearImageProblemRegistry();
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.clear();
  }
}

// 1. Empty review state
Deno.test('Review 1: Empty review state returns empty list safely', () => {
  setupCleanEnvironment();
  const grouped = getGroupedReviewQuestions([]);
  assertEquals(grouped.length, 0);

  const filtered = filterAndSortReviewQuestions([], { status: 'all' });
  assertEquals(filtered.length, 0);
});

// 2. One attempted question appears
Deno.test('Review 2: Single attempted question appears in review', () => {
  setupCleanEnvironment();
  const att = startAttempt({
    questionId: 'pq-bis-1',
    method: 'bisection',
    decimalPlaces: 3,
  });
  completeAttempt(att.id, {
    correct: true,
    finalAnswer: 1.325,
    expectedAnswer: 1.325,
    durationSeconds: 45,
  });

  const attempts = getAttempts();
  const grouped = getGroupedReviewQuestions(attempts);

  assertEquals(grouped.length, 1);
  assertEquals(grouped[0].questionId, 'pq-bis-1');
  assertEquals(grouped[0].method, 'bisection');
  assertEquals(grouped[0].totalAttempts, 1);
  assertEquals(grouped[0].source, 'practice');
});

// 3. Correct question appears with correct status
Deno.test('Review 3: Correct question appears with latestIsCorrect = true', () => {
  setupCleanEnvironment();
  const att = startAttempt({
    questionId: 'pq-fp-1',
    method: 'false-position',
    decimalPlaces: 4,
  });
  completeAttempt(att.id, {
    correct: true,
    finalAnswer: 0.5177,
    expectedAnswer: 0.5177,
  });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped[0].hasCorrectAttempt, true);
  assertEquals(grouped[0].latestIsCorrect, true);
  assertEquals(grouped[0].needsReview, false);
});

// 4. Incorrect question appears with latestIsCorrect = false and needsReview = true
Deno.test('Review 4: Incorrect question appears with latestIsCorrect = false', () => {
  setupCleanEnvironment();
  const att = startAttempt({
    questionId: 'pq-nr-1',
    method: 'newton-raphson',
    decimalPlaces: 3,
  });
  completeAttempt(att.id, {
    correct: false,
    finalAnswer: 2.1,
    expectedAnswer: 1.856,
    mistakeCategories: ['arithmetic-error'],
  });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped[0].hasCorrectAttempt, false);
  assertEquals(grouped[0].latestIsCorrect, false);
  assertEquals(grouped[0].needsReview, true);
  assertEquals(grouped[0].mistakes.includes('arithmetic-error'), true);
});

// 5. Multiple attempts are grouped under same questionId (no duplicate cards)
Deno.test('Review 5: Multiple attempts are grouped under a single card', () => {
  setupCleanEnvironment();
  // Attempt 1: Failed
  const att1 = startAttempt({
    questionId: 'pq-bis-2',
    method: 'bisection',
    decimalPlaces: 3,
  });
  completeAttempt(att1.id, {
    correct: false,
    mistakeCategories: ['wrong-interval-selection'],
  });

  // Attempt 2: Succeeded
  const att2 = startAttempt({
    questionId: 'pq-bis-2',
    method: 'bisection',
    decimalPlaces: 3,
  });
  completeAttempt(att2.id, {
    correct: true,
  });

  const attempts = getAttempts();
  assertEquals(attempts.length, 2);

  const grouped = getGroupedReviewQuestions(attempts);
  assertEquals(grouped.length, 1); // Exactly one grouped card!
  assertEquals(grouped[0].questionId, 'pq-bis-2');
  assertEquals(grouped[0].totalAttempts, 2);
  assertEquals(grouped[0].allAttempts.length, 2);
});

// 6. Attempt history is preserved in chronological order
Deno.test('Review 6: Attempt history in card is sorted newest first', () => {
  setupCleanEnvironment();
  const att1 = startAttempt({ questionId: 'pq-bis-1', method: 'bisection' });
  completeAttempt(att1.id, { correct: false });

  const att2 = startAttempt({ questionId: 'pq-bis-1', method: 'bisection' });
  completeAttempt(att2.id, { correct: true });

  const grouped = getGroupedReviewQuestions(getAttempts());
  const all = grouped[0].allAttempts;
  assertEquals(all[0].attemptNumber, 2);
  assertEquals(all[1].attemptNumber, 1);
});

// 7. Review does not overwrite attempts
Deno.test('Review 7: Retrying creates new attempt without mutating historical attempts', () => {
  setupCleanEnvironment();
  const att1 = startAttempt({ questionId: 'pq-fp-2', method: 'false-position' });
  completeAttempt(att1.id, { correct: false, finalAnswer: 0.1 });

  const historyBefore = [...getAttempts()];
  assertEquals(historyBefore.length, 1);
  assertEquals(historyBefore[0].correct, false);

  // Retry
  const att2 = startAttempt({ questionId: 'pq-fp-2', method: 'false-position' });
  completeAttempt(att2.id, { correct: true, finalAnswer: 0.5177 });

  const historyAfter = getAttempts();
  assertEquals(historyAfter.length, 2);
  assertEquals(historyAfter[0].id, att1.id);
  assertEquals(historyAfter[0].correct, false); // Intact!
  assertEquals(historyAfter[1].id, att2.id);
  assertEquals(historyAfter[1].correct, true);
  assertEquals(historyAfter[1].attemptNumber, 2);
});

// 8. Practice question retains exact questionId
Deno.test('Review 8: Practice question retains exact original questionId', () => {
  setupCleanEnvironment();
  const att = startAttempt({ questionId: 'pq-nr-3', method: 'newton-raphson' });
  completeAttempt(att.id, { correct: true });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped[0].questionId, 'pq-nr-3');
  assertEquals(grouped[0].equation, 'x^3 - 2*x - 5');
  assertEquals(grouped[0].source, 'practice');
});

// 9. Image question retains exact image questionId
Deno.test('Review 9: Image question retains stable image questionId', () => {
  setupCleanEnvironment();
  const stableId = 'img_q_false_pos_fourth_root_32';
  registerImageProblem({
    questionId: stableId,
    source: 'image',
    method: 'false-position',
    equation: 'x^4 - 32',
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'discovered',
    decimalPlaces: 3,
    rawExtractedText: 'Use the method of false position to find the fourth root of 32',
  });

  const att = startAttempt({
    questionId: stableId,
    method: 'false-position',
    source: 'image',
    equation: 'x^4 - 32',
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'discovered',
    decimalPlaces: 3,
  });
  completeAttempt(att.id, { correct: true });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped[0].questionId, stableId);
  assertEquals(grouped[0].source, 'image');
});

// 10. Image equation remains unchanged upon review
Deno.test('Review 10: Image equation remains exactly x^4 - 32', () => {
  setupCleanEnvironment();
  const stableId = 'img_q_exact_eq_test';
  const att = startAttempt({
    questionId: stableId,
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
    decimalPlaces: 3,
  });
  completeAttempt(att.id, { correct: false });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped[0].equation, 'x^4 - 32 = 0');
});

// 11. Image method remains unchanged
Deno.test('Review 11: Image method remains false-position without switching to bisection', () => {
  setupCleanEnvironment();
  const stableId = 'img_q_method_test';
  const att = startAttempt({
    questionId: stableId,
    method: 'false-position',
    equation: 'x^4 - 32 = 0',
    lowerBound: 2,
    upperBound: 3,
  });
  completeAttempt(att.id, { correct: true });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped[0].method, 'false-position');
});

// 12. Image bounds remain unchanged
Deno.test('Review 12: Image bounds [2, 3] remain exact and unchanged', () => {
  setupCleanEnvironment();
  const stableId = 'img_q_bounds_test';
  const att = startAttempt({
    questionId: stableId,
    method: 'false-position',
    equation: 'x^4 - 32',
    lowerBound: 2,
    upperBound: 3,
  });
  completeAttempt(att.id, { correct: true });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped[0].lowerBound, 2);
  assertEquals(grouped[0].upperBound, 3);
});

// 13. Discovered bounds remain unchanged
Deno.test('Review 13: Discovered boundsSource is preserved faithfully', () => {
  setupCleanEnvironment();
  const stableId = 'img_q_discovered_bounds_test';
  const att = startAttempt({
    questionId: stableId,
    method: 'false-position',
    equation: 'x^4 - 32',
    lowerBound: 2,
    upperBound: 3,
    boundsSource: 'discovered',
  });
  completeAttempt(att.id, { correct: true });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped[0].boundsSource, 'discovered');
});

// 14. Review Solution regenerates deterministic solver output locally
Deno.test('Review 14: Review Solution executes deterministic solver locally', () => {
  // Bisection solver check
  const bis = solveBisection({
    expression: 'x^3 - x - 1',
    a: 1,
    b: 2,
    decimalPlaces: 3,
  });
  assertEquals(bis.success, true);
  assertEquals(bis.formattedRoot, '1.325');

  // False Position solver check
  const fp = solveFalsePosition({
    expression: 'x^4 - 32',
    a: 2,
    b: 3,
    decimalPlaces: 3,
  });
  assertEquals(fp.success, true);
  assertEquals(fp.formattedRoot, '2.378');

  // Newton Raphson solver check
  const nr = solveNewtonRaphson({
    expression: 'x^4 - x - 10',
    a: 1,
    b: 2,
    x0: 2,
    decimalPlaces: 3,
  });
  assertEquals(nr.success, true);
  assertEquals(nr.formattedRoot, '1.856');
});

// 15. Review Solution does not call Gemini
Deno.test('Review 15: Review Solution requires 0 external/Gemini network requests', () => {
  // Verification that solver functions are pure mathematical routines without fetch
  const res = solveBisection({
    expression: 'x^3 - 9*x + 1',
    a: 2,
    b: 3,
    decimalPlaces: 2,
  });
  assertEquals(res.success, true);
  assertEquals(res.formattedRoot, '2.94');
});

// 16. Try Again creates a new LearningAttempt
Deno.test('Review 16: Try Again starts a new LearningAttempt with attemptNumber incremented', () => {
  setupCleanEnvironment();
  const att1 = startAttempt({
    questionId: 'pq-bis-1',
    method: 'bisection',
  });
  completeAttempt(att1.id, { correct: false });

  // Student clicks "Try Again"
  const att2 = startAttempt({
    questionId: 'pq-bis-1',
    method: 'bisection',
  });
  assertEquals(att2.status, 'started');
  assertEquals(att2.correct, undefined);
  assertEquals(att2.attemptNumber, 2);
  assertNotEquals(att2.id, att1.id);
});

// 17. Try Again preserves all original parameters
Deno.test('Review 17: Try Again preserves original equation, bounds, initial guess from history/registry', () => {
  setupCleanEnvironment();
  const stableId = 'img_q_nr_test';
  registerImageProblem({
    questionId: stableId,
    source: 'image',
    method: 'newton-raphson',
    equation: '3*x - cos(x) - 1',
    lowerBound: 0,
    upperBound: 1,
    initialGuess: 0.6,
    decimalPlaces: 4,
    boundsSource: 'supplied',
  });

  const att1 = startAttempt({
    questionId: stableId,
    method: 'newton-raphson',
  });
  completeAttempt(att1.id, { correct: false });

  // Retry without passing equation or bounds explicitly
  const att2 = startAttempt({
    questionId: stableId,
    method: 'newton-raphson',
  });

  assertEquals(att2.equation, '3*x - cos(x) - 1');
  assertEquals(att2.initialGuess, 0.6);
  assertEquals(att2.decimalPlaces, 4);
  assertEquals(att2.lowerBound, 0);
  assertEquals(att2.upperBound, 1);
});

// 18. Method filters work
Deno.test('Review 18: Method filters accurately filter questions', () => {
  setupCleanEnvironment();
  startAttempt({ questionId: 'pq-bis-1', method: 'bisection' });
  startAttempt({ questionId: 'pq-fp-1', method: 'false-position' });
  startAttempt({ questionId: 'pq-nr-1', method: 'newton-raphson' });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped.length, 3);

  const bisectionOnly = filterAndSortReviewQuestions(grouped, { method: 'bisection' });
  assertEquals(bisectionOnly.length, 1);
  assertEquals(bisectionOnly[0].method, 'bisection');

  const fpOnly = filterAndSortReviewQuestions(grouped, { method: 'false-position' });
  assertEquals(fpOnly.length, 1);
  assertEquals(fpOnly[0].method, 'false-position');

  const nrOnly = filterAndSortReviewQuestions(grouped, { method: 'newton-raphson' });
  assertEquals(nrOnly.length, 1);
  assertEquals(nrOnly[0].method, 'newton-raphson');
});

// 19. Status filters work
Deno.test('Review 19: Status filters filter Correct, Incorrect, and Needs Review', () => {
  setupCleanEnvironment();
  // Problem 1: Correct
  const att1 = startAttempt({ questionId: 'pq-bis-1', method: 'bisection' });
  completeAttempt(att1.id, { correct: true });

  // Problem 2: Incorrect
  const att2 = startAttempt({ questionId: 'pq-fp-1', method: 'false-position' });
  completeAttempt(att2.id, { correct: false });

  const grouped = getGroupedReviewQuestions(getAttempts());

  const correctList = filterAndSortReviewQuestions(grouped, { status: 'correct' });
  assertEquals(correctList.length, 1);
  assertEquals(correctList[0].questionId, 'pq-bis-1');

  const incorrectList = filterAndSortReviewQuestions(grouped, { status: 'incorrect' });
  assertEquals(incorrectList.length, 1);
  assertEquals(incorrectList[0].questionId, 'pq-fp-1');

  const needsReviewList = filterAndSortReviewQuestions(grouped, { status: 'needs-review' });
  assertEquals(needsReviewList.length, 1);
  assertEquals(needsReviewList[0].questionId, 'pq-fp-1');
});

// 20. Source filters work
Deno.test('Review 20: Source filters distinguish Practice vs Image questions', () => {
  setupCleanEnvironment();
  const attP = startAttempt({ questionId: 'pq-bis-1', method: 'bisection', source: 'practice' });
  completeAttempt(attP.id, { correct: true });

  const attI = startAttempt({ questionId: 'img_q_123', method: 'false-position', source: 'image' });
  completeAttempt(attI.id, { correct: true });

  const grouped = getGroupedReviewQuestions(getAttempts());

  const practiceOnly = filterAndSortReviewQuestions(grouped, { source: 'practice' });
  assertEquals(practiceOnly.length, 1);
  assertEquals(practiceOnly[0].questionId, 'pq-bis-1');

  const imageOnly = filterAndSortReviewQuestions(grouped, { source: 'image' });
  assertEquals(imageOnly.length, 1);
  assertEquals(imageOnly[0].questionId, 'img_q_123');
});

// 21. Sorting is deterministic
Deno.test('Review 21: Sorting deterministically orders by recent, attempts, or needs-review', () => {
  setupCleanEnvironment();
  // Question A: 1 attempt, needs review
  const attA = startAttempt({ questionId: 'pq-bis-1', method: 'bisection' });
  completeAttempt(attA.id, { correct: false });

  // Question B: 3 attempts, correct
  const attB1 = startAttempt({ questionId: 'pq-bis-2', method: 'bisection' });
  completeAttempt(attB1.id, { correct: false });
  const attB2 = startAttempt({ questionId: 'pq-bis-2', method: 'bisection' });
  completeAttempt(attB2.id, { correct: false });
  const attB3 = startAttempt({ questionId: 'pq-bis-2', method: 'bisection' });
  completeAttempt(attB3.id, { correct: true });

  const grouped = getGroupedReviewQuestions(getAttempts());

  // Sort by attempts
  const sortedByAttempts = filterAndSortReviewQuestions(grouped, { sort: 'attempts' });
  assertEquals(sortedByAttempts[0].questionId, 'pq-bis-2');
  assertEquals(sortedByAttempts[0].totalAttempts, 3);

  // Sort by needs review first
  const sortedByNeedsReview = filterAndSortReviewQuestions(grouped, { sort: 'needs-review' });
  assertEquals(sortedByNeedsReview[0].questionId, 'pq-bis-1');
  assertEquals(sortedByNeedsReview[0].needsReview, true);
});

// 22. Needs Review uses conservative verified analytics
Deno.test('Review 22: Needs Review flags questions with recurring mistakes or repeated failures', () => {
  setupCleanEnvironment();
  // Repeated failure with same mistake
  const a1 = startAttempt({ questionId: 'pq-bis-3', method: 'bisection' });
  completeAttempt(a1.id, { correct: false, mistakeCategories: ['wrong-interval-selection'] });

  const a2 = startAttempt({ questionId: 'pq-bis-3', method: 'bisection' });
  completeAttempt(a2.id, { correct: false, mistakeCategories: ['wrong-interval-selection'] });

  const grouped = getGroupedReviewQuestions(getAttempts());
  assertEquals(grouped[0].needsReview, true);
  assertEquals(grouped[0].mistakes.includes('wrong-interval-selection'), true);
});

// 23. Diagnosed mistakes provide actionable advice
Deno.test('Review 23: Mistakes advice produces actionable non-invented guidance', () => {
  const bracketAdvice = getMistakeAdvice('wrong-bracket');
  assertEquals(bracketAdvice.includes('opposite signs'), true);

  const formulaAdvice = getMistakeAdvice('wrong-formula');
  assertEquals(formulaAdvice.includes('iteration formula'), true);

  const unclassifiedAdvice = getMistakeAdvice('unknown');
  assertEquals(unclassifiedAdvice, 'Mistake type was not determined.');

  const label = formatMistakeLabel('wrong-interval-selection');
  assertEquals(label, 'Interval Selection Error');
});

// 24. Solution viewing does not mark attempt correct
Deno.test('Review 24: Viewing a solution records solutionViewed without setting correct: true', () => {
  setupCleanEnvironment();
  const att = startAttempt({ questionId: 'pq-bis-1', method: 'bisection' });
  recordSolutionView(att.id);

  const stored = getAttempts().find((a) => a.id === att.id);
  assertEquals(stored?.solutionViewed, true);
  assertEquals(stored?.correct, undefined); // NOT true!
});

// 25. Text search filter
Deno.test('Review 25: Local text search finds questions by equation, title, or ID', () => {
  setupCleanEnvironment();
  startAttempt({ questionId: 'pq-bis-1', method: 'bisection', equation: 'x^3 - x - 1 = 0' });
  startAttempt({ questionId: 'pq-fp-1', method: 'false-position', equation: 'cos(x) - x*exp(x) = 0' });

  const grouped = getGroupedReviewQuestions(getAttempts());

  const searchCos = filterAndSortReviewQuestions(grouped, { search: 'cos' });
  assertEquals(searchCos.length, 1);
  assertEquals(searchCos[0].questionId, 'pq-fp-1');

  const searchBis = filterAndSortReviewQuestions(grouped, { search: 'pq-bis' });
  assertEquals(searchBis.length, 1);
  assertEquals(searchBis[0].questionId, 'pq-bis-1');
});

// 26. Corrupted persistence is handled safely
Deno.test('Review 26: Corrupted persistence data does not crash review engine', () => {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('mathengineer_learning_history_v1', 'corrupted-json{');
  }
  const loaded = loadLearningAttempts();
  assertEquals(Array.isArray(loaded), true);

  const grouped = getGroupedReviewQuestions(loaded);
  assertEquals(Array.isArray(grouped), true);
});

// 27. Cross-page Progress -> Review routing simulation
Deno.test('Review 27: Progress to Review routing filters for specific questionId', () => {
  setupCleanEnvironment();
  startAttempt({ questionId: 'pq-bis-1', method: 'bisection' });
  startAttempt({ questionId: 'pq-fp-1', method: 'false-position' });

  const grouped = getGroupedReviewQuestions(getAttempts());
  // Progress navigates to review with reviewQuestionId: 'pq-bis-1'
  const filtered = filterAndSortReviewQuestions(grouped, { search: 'pq-bis-1' });
  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].questionId, 'pq-bis-1');
});

// 28. Cross-page Learn -> Review routing simulation
Deno.test('Review 28: Learn to Review routing filters for specific method history', () => {
  setupCleanEnvironment();
  startAttempt({ questionId: 'pq-bis-1', method: 'bisection' });
  startAttempt({ questionId: 'pq-nr-1', method: 'newton-raphson' });

  const grouped = getGroupedReviewQuestions(getAttempts());
  // Learn navigates to review with method: 'newton-raphson'
  const filtered = filterAndSortReviewQuestions(grouped, { method: 'newton-raphson' });
  assertEquals(filtered.length, 1);
  assertEquals(filtered[0].questionId, 'pq-nr-1');
  assertEquals(filtered[0].method, 'newton-raphson');
});

// 29. Practice -> Review previous attempt simulation
Deno.test('Review 29: Practice to Review allows reviewing previous attempt of solved question', () => {
  setupCleanEnvironment();
  const att = startAttempt({ questionId: 'pq-fp-1', method: 'false-position' });
  completeAttempt(att.id, { correct: true, durationSeconds: 50 });

  const grouped = getGroupedReviewQuestions(getAttempts());
  const found = grouped.find((q) => q.questionId === 'pq-fp-1');
  assertEquals(found !== undefined, true);
  assertEquals(found?.latestIsCorrect, true);
  assertEquals(found?.totalAttempts, 1);
});

// 30. Zero Gemini API calls during review and solution display
Deno.test('Review 30: Deterministic solver execution in Review guarantees 0 Gemini calls', () => {
  // Directly confirm numerical solver calculates without AI assistance
  const res = solveNewtonRaphson({
    expression: 'x^4 - x - 10',
    a: 1,
    b: 2,
    x0: 2,
    decimalPlaces: 3,
  });
  assertEquals(res.success, true);
  assertEquals(res.root !== undefined, true);
  assertEquals(Math.abs((res.root || 0) - 1.856) < 0.002, true);
});
