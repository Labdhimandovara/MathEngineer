/**
 * Course Knowledge Base, Selective RAG & Grounding Test Suite
 * 
 * Verifies Phase 7 requirements:
 * 1. Document metadata completeness
 * 2. Educational chunks structure
 * 3. Bisection retrieval (concept, bracketing condition, midpoint, stopping rule)
 * 4. False Position retrieval (formula, sign update, stopping rule)
 * 5. Newton-Raphson retrieval (initial guess x0 rule, stopping rule, worked example)
 * 6. Method isolation (Newton query is not dominated by Bisection)
 * 7. Negative boundary detection (derivative-zero handling is NOT_SPECIFIED_BY_COURSE)
 * 8. Weak / irrelevant query handling
 * 9. Query classification (COURSE_SPECIFIC, GENERAL, CURRENT_PROBLEM, SOLVER_EXPLANATION)
 * 10. Grounded prompt assembly with authentic SIT Pune citations
 * 11. No fabricated page numbers or sources
 * 12. Context size limits
 * 13. Knowledge status diagnostics
 */

import { assertEquals, assertNotEquals, assert } from 'jsr:@std/assert';
import { COURSE_DOCUMENTS, COURSE_CHUNKS } from '../src/data/knowledge/courseKnowledgeBase.ts';
import {
  searchKnowledge,
  detectMethodFromQuery,
  getKnowledgeStatus,
} from '../src/services/knowledge/knowledgeService.ts';
import { classifyQuery } from '../src/services/knowledge/queryClassifier.ts';
import { buildGroundedSystemPrompt } from '../src/services/assistant/systemPrompt.ts';

Deno.test('CourseKnowledge 1: Document metadata is authentic and complete for SIT Pune', () => {
  assertEquals(COURSE_DOCUMENTS.length, 3);

  const bisDoc = COURSE_DOCUMENTS.find((d) => d.method === 'bisection');
  assert(bisDoc !== undefined);
  assertEquals(bisDoc.author, 'Dr. Ram Kishun Lodhi');
  assertEquals(bisDoc.institution, 'Symbiosis Institute of Technology Pune');
  assertEquals(bisDoc.unit, 'Unit-I');
  assertEquals(bisDoc.pageCount, 10);

  const fpDoc = COURSE_DOCUMENTS.find((d) => d.method === 'false-position');
  assert(fpDoc !== undefined);
  assertEquals(fpDoc.author, 'Dr. Ram Kishun Lodhi');
  assertEquals(fpDoc.pageCount, 8);

  const nrDoc = COURSE_DOCUMENTS.find((d) => d.method === 'newton-raphson');
  assert(nrDoc !== undefined);
  assertEquals(nrDoc.author, 'Dr. Ram Kishun Lodhi');
  assertEquals(nrDoc.pageCount, 8);
});

Deno.test('CourseKnowledge 2: Chunk structure and educational categories are preserved', () => {
  assert(COURSE_CHUNKS.length >= 15);
  for (const chunk of COURSE_CHUNKS) {
    assert(chunk.id.length > 0);
    assert(chunk.topic.length > 0);
    assert(chunk.section.length > 0);
    assert(chunk.content.length > 30);
    assert(chunk.keywords.length > 0);
    assert(chunk.sourcePage >= 1 && chunk.sourcePage <= 10);
    assertEquals(chunk.sourceType, 'official-course');
  }
});

Deno.test('CourseKnowledge 3: Bisection concept and bracketing condition retrieval', () => {
  // Query 1: Concept
  const conceptMatches = searchKnowledge('What is the Bisection Method?');
  assert(conceptMatches.length > 0);
  assertEquals(conceptMatches[0].chunk.method, 'bisection');
  assert(conceptMatches[0].confidence === 'high' || conceptMatches[0].confidence === 'medium');

  // Query 2: Condition for f(a) and f(b)
  const conditionMatches = searchKnowledge('What condition must f(a) and f(b) satisfy for root existence?');
  assert(conditionMatches.length > 0);
  assertEquals(conditionMatches[0].chunk.id, 'chunk-bis-bracketing-condition');
  assert(conditionMatches[0].chunk.content.includes('opposite signs'));
});

Deno.test('CourseKnowledge 4: Bisection midpoint and stopping rule retrieval', () => {
  // Query 1: Midpoint
  const midpointMatches = searchKnowledge('How do I calculate the midpoint in Bisection?');
  assert(midpointMatches.length > 0);
  assertEquals(midpointMatches[0].chunk.id, 'chunk-bis-algorithm-midpoint');
  assert(midpointMatches[0].chunk.content.includes('(a + b) / 2'));

  // Query 2: Stopping rule
  const stopMatches = searchKnowledge('When do I stop the Bisection method?');
  assert(stopMatches.length > 0);
  assertEquals(stopMatches[0].chunk.id, 'chunk-bis-stopping-rule');
  assert(stopMatches[0].chunk.content.includes('two decimal places'));
});

Deno.test('CourseKnowledge 5: False Position formula and sign update retrieval', () => {
  // Query 1: Formula
  const formulaMatches = searchKnowledge('What is the False Position formula?');
  assert(formulaMatches.length > 0);
  assertEquals(formulaMatches[0].chunk.method, 'false-position');
  assertEquals(formulaMatches[0].chunk.id, 'chunk-fp-formula-derivation');
  assert(formulaMatches[0].chunk.content.includes('(a * f(b) - b * f(a))'));

  // Query 2: Interval update
  const updateMatches = searchKnowledge('How do I update the interval in False Position?');
  assert(updateMatches.length > 0);
  assertEquals(updateMatches[0].chunk.id, 'chunk-fp-interval-sign-update');
  assert(updateMatches[0].chunk.content.includes('same sign as f(a)'));
});

Deno.test('CourseKnowledge 6: False Position stopping rule retrieval', () => {
  const matches = searchKnowledge('When do I stop False Position?');
  assert(matches.length > 0);
  assertEquals(matches[0].chunk.method, 'false-position');
  assertEquals(matches[0].chunk.id, 'chunk-fp-stopping-rule');
  assert(matches[0].chunk.content.includes('successive approximations are approximately equal'));
});

Deno.test('CourseKnowledge 7: Newton-Raphson initial guess x0 selection rule', () => {
  const matches = searchKnowledge('According to our course, how is x0 selected in Newton-Raphson?');
  assert(matches.length > 0);
  assertEquals(matches[0].chunk.method, 'newton-raphson');
  assertEquals(matches[0].chunk.id, 'chunk-nr-initial-guess-x0');
  assert(matches[0].chunk.content.includes('close to 0'));
  assert(matches[0].chunk.content.includes('take x0 = 2'));
});

Deno.test('CourseKnowledge 8: Newton-Raphson formula and stopping rule retrieval', () => {
  // Query 1: Formula
  const formulaMatches = searchKnowledge('What is the Newton-Raphson formula?');
  assert(formulaMatches.length > 0);
  assertEquals(formulaMatches[0].chunk.method, 'newton-raphson');
  assertEquals(formulaMatches[0].chunk.id, 'chunk-nr-formula');

  // Query 2: Stopping rule
  const stopMatches = searchKnowledge('When do I stop Newton-Raphson?');
  assert(stopMatches.length > 0);
  assertEquals(stopMatches[0].chunk.method, 'newton-raphson');
  assertEquals(stopMatches[0].chunk.id, 'chunk-nr-stopping-rule');
  assert(stopMatches[0].chunk.content.includes('x3 = x2'));
});

Deno.test('CourseKnowledge 9: Method isolation ensures Newton query is not dominated by Bisection', () => {
  const matches = searchKnowledge('Newton-Raphson iteration stopping rule');
  assert(matches.length > 0);
  assertEquals(matches[0].chunk.method, 'newton-raphson');
  assertNotEquals(matches[0].chunk.method, 'bisection');
});

Deno.test('CourseKnowledge 10: Negative boundary detection (derivative zero is NOT_SPECIFIED_BY_COURSE)', () => {
  const matches = searchKnowledge('What does our course say about derivative zero in Newton-Raphson?');
  assert(matches.length > 0);
  const boundaryMatch = matches.find((m) => m.chunk.id === 'chunk-negative-boundaries');
  assert(boundaryMatch !== undefined);
  assert(boundaryMatch.chunk.content.includes('NOT_SPECIFIED_BY_COURSE'));
  assert(boundaryMatch.chunk.content.includes("f'(x) = 0"));
});

Deno.test('CourseKnowledge 11: Weak or unrelated queries return low confidence or empty results', () => {
  const matches = searchKnowledge('What is quantum entanglement and string theory?');
  if (matches.length > 0) {
    assertEquals(matches[0].confidence, 'low');
  }
});

Deno.test('CourseKnowledge 12: Query classification detects COURSE_SPECIFIC queries', () => {
  const r1 = classifyQuery('According to our course, how do I choose x0?');
  assertEquals(r1.intent, 'COURSE_SPECIFIC');
  assertEquals(r1.targetMethod, 'newton-raphson');

  const r2 = classifyQuery('What did our notes say about False Position formula?');
  assertEquals(r2.intent, 'COURSE_SPECIFIC');
  assertEquals(r2.targetMethod, 'false-position');

  const r3 = classifyQuery('What is the Bisection Method?');
  assertEquals(r3.intent, 'COURSE_SPECIFIC');
  assertEquals(r3.targetMethod, 'bisection');
});

Deno.test('CourseKnowledge 13: Query classification detects GENERAL and CURRENT_PROBLEM queries', () => {
  const general = classifyQuery('Compare Bisection and Newton');
  assertEquals(general.intent, 'GENERAL');

  const problem = classifyQuery('Why is my x2 wrong?', {
    method: 'bisection',
    equation: 'x^3 - x - 2',
  });
  assertEquals(problem.intent, 'CURRENT_PROBLEM');
});

Deno.test('CourseKnowledge 14: Grounded system prompt builds authentic SIT Pune citations', () => {
  const matches = searchKnowledge('How is x0 selected in Newton-Raphson?');
  const groundedPrompt = buildGroundedSystemPrompt(
    { method: 'newton-raphson' },
    matches
  );

  assert(groundedPrompt.includes('OFFICIAL COURSE MATERIAL GROUNDING'));
  assert(groundedPrompt.includes('Dr. Ram Kishun Lodhi'));
  assert(groundedPrompt.includes('Symbiosis Institute of Technology Pune'));
  assert(groundedPrompt.includes('Slide 5') || groundedPrompt.includes('Page/Slide 5'));
  assert(groundedPrompt.includes('STRICT GROUNDING RULES'));
});

Deno.test('CourseKnowledge 15: Source citations do not fabricate unknown slide numbers', () => {
  const matches = searchKnowledge('What is the False Position formula?');
  assert(matches.length > 0);
  const citation = matches[0].source;
  assert(citation.includes('Unit-I'));
  assert(citation.includes('Dr. Ram Kishun Lodhi'));
  assert(citation.includes('Page/Slide 3'));
});

Deno.test('CourseKnowledge 16: TopK caps retrieved context size', () => {
  const matches = searchKnowledge('root iteration formula', { topK: 2 });
  assert(matches.length <= 2);
});

Deno.test('CourseKnowledge 17: getKnowledgeStatus reports accurate diagnostic counts', () => {
  const status = getKnowledgeStatus();
  assertEquals(status.documents, 3);
  assert(status.chunks >= 15);
  assertEquals(status.sourceType, 'official-course');
  assertEquals(status.retrievalReady, true);
  assert(status.chunksByMethod['bisection'] >= 5);
  assert(status.chunksByMethod['false-position'] >= 5);
  assert(status.chunksByMethod['newton-raphson'] >= 5);
});
