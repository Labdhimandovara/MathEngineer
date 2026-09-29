/**
 * Deterministic Local Course Retrieval Engine for MathEngineer
 * 
 * Provides fast, offline, deterministic retrieval across authoritative
 * course documents from Symbiosis Institute of Technology Pune (Dr. Ram Kishun Lodhi).
 * Strictly preserves method isolation and prevents cross-method contamination.
 */

import {
  KnowledgeChunk,
  KnowledgeStatus,
  RetrievalMatch,
  RetrievalOptions,
} from '../../types/knowledge.ts';
import { COURSE_DOCUMENTS, COURSE_CHUNKS } from '../../data/knowledge/courseKnowledgeBase.ts';

/**
 * Tokenizes and normalizes text into lower-case alphanumeric tokens
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

/**
 * Detects if a query explicitly mentions a particular numerical method
 */
export function detectMethodFromQuery(query: string): 'bisection' | 'false-position' | 'newton-raphson' | null {
  const q = query.toLowerCase();
  if (
    q.includes('newton') ||
    q.includes('raphson') ||
    q.includes('x0') ||
    q.includes('x_0') ||
    q.includes('initial guess') ||
    q.includes('tangent')
  ) {
    return 'newton-raphson';
  }
  if (
    q.includes('false position') ||
    q.includes('regula') ||
    q.includes('falsi') ||
    q.includes('chord')
  ) {
    return 'false-position';
  }
  if (
    q.includes('bisection') ||
    q.includes('midpoint method') ||
    q.includes('halving') ||
    q.includes('interval halving')
  ) {
    return 'bisection';
  }
  return null;
}

/**
 * Searches the authoritative course knowledge base deterministically
 */
export function searchKnowledge(
  query: string,
  options?: RetrievalOptions
): RetrievalMatch[] {
  if (!query || !query.trim()) {
    return [];
  }

  const normalizedQuery = query.toLowerCase().trim();
  const queryTokens = tokenize(normalizedQuery);
  const detectedMethod = detectMethodFromQuery(normalizedQuery);
  const targetMethod = options?.method || detectedMethod || null;

  const matches: { chunk: KnowledgeChunk; score: number; matchedKeywords: string[] }[] = [];

  for (const chunk of COURSE_CHUNKS) {
    let score = 0;
    const matchedKeywords: string[] = [];

    // 1. Method isolation & alignment
    if (targetMethod) {
      if (chunk.method === targetMethod) {
        score += 35; // Substantial boost for matching method
      } else {
        // Strong penalty to prevent Bisection chunks dominating Newton queries
        score -= 50;
      }
    }

    // 2. Unit filter
    if (options?.unit && chunk.unit.toLowerCase() !== options.unit.toLowerCase()) {
      continue;
    }

    // 3. Topic filter
    if (options?.topic && chunk.topic.toLowerCase() !== options.topic.toLowerCase()) {
      continue;
    }

    const chunkContentLower = chunk.content.toLowerCase();
    const chunkSectionLower = chunk.section.toLowerCase();
    const chunkTopicLower = chunk.topic.toLowerCase();

    // 4. Exact phrase matching in content or section
    if (chunkContentLower.includes(normalizedQuery)) {
      score += 45;
    } else if (chunkSectionLower.includes(normalizedQuery) || chunkTopicLower.includes(normalizedQuery)) {
      score += 35;
    }

    // 5. Keyword matching
    for (const kw of chunk.keywords) {
      const kwLower = kw.toLowerCase();
      if (normalizedQuery.includes(kwLower)) {
        score += 15;
        matchedKeywords.push(kw);
      } else {
        const kwTokens = tokenize(kwLower);
        const matchesAll = kwTokens.length > 0 && kwTokens.every((t) => queryTokens.includes(t));
        if (matchesAll) {
          score += 10;
          matchedKeywords.push(kw);
        }
      }
    }

    // 6. Token overlap with chunk section and topic
    for (const token of queryTokens) {
      if (chunkSectionLower.includes(token)) score += 4;
      if (chunkTopicLower.includes(token)) score += 4;
    }

    // 7. Negative Boundary check (unspecified topics)
    if (chunk.notSpecifiedInCourse && chunk.notSpecifiedInCourse.length > 0) {
      for (const item of chunk.notSpecifiedInCourse) {
        const itemClean = item.replace(/-/g, ' ');
        if (
          normalizedQuery.includes(itemClean) ||
          ((normalizedQuery.includes('zero') || normalizedQuery.includes(' 0') || normalizedQuery.includes('= 0')) &&
            (normalizedQuery.includes('derivative') || normalizedQuery.includes("f'"))) ||
          normalizedQuery.includes('division by zero') ||
          normalizedQuery.includes('division by 0')
        ) {
          score += 60; // High match for boundary detection
          matchedKeywords.push(item);
        }
      }
    }

    // 8. Specific high-signal educational phrases
    if (normalizedQuery.includes('choose x0') || normalizedQuery.includes('how is x0') || normalizedQuery.includes('initial guess')) {
      if (chunk.id === 'chunk-nr-initial-guess-x0') score += 40;
    }
    if (normalizedQuery.includes('stopping rule') || normalizedQuery.includes('when to stop') || normalizedQuery.includes('when do i stop')) {
      if (chunk.keywords.includes('stopping rule')) score += 35;
    }
    if (normalizedQuery.includes('formula') || normalizedQuery.includes('calculate')) {
      if (chunk.keywords.includes('formula')) score += 25;
    }
    if (normalizedQuery.includes('condition') || normalizedQuery.includes('f(a)') || normalizedQuery.includes('f(b)')) {
      if (chunk.id === 'chunk-bis-bracketing-condition') score += 30;
    }
    if (normalizedQuery.includes('midpoint')) {
      if (chunk.id === 'chunk-bis-algorithm-midpoint') score += 35;
    }
    if (normalizedQuery.includes('worked example') || normalizedQuery.includes('example')) {
      if (chunk.keywords.includes('worked example')) score += 35;
    }

    if (score > (options?.minScore ?? 10)) {
      matches.push({ chunk, score, matchedKeywords });
    }
  }

  // Sort descending by score
  matches.sort((a, b) => b.score - a.score);

  const topK = options?.topK ?? 3;
  return matches.slice(0, topK).map((m) => {
    let confidence: 'high' | 'medium' | 'low' = 'low';
    if (m.score >= 50) {
      confidence = 'high';
    } else if (m.score >= 25) {
      confidence = 'medium';
    }

    const doc = COURSE_DOCUMENTS.find((d) => d.id === m.chunk.documentId);
    const author = doc?.author || 'Dr. Ram Kishun Lodhi';
    const institution = doc?.institution || 'SIT Pune';
    const source = `[Source: ${m.chunk.unit} ${m.chunk.topic}, Page/Slide ${m.chunk.sourcePage}, ${author}, ${institution}]`;

    return {
      chunk: m.chunk,
      score: m.score,
      source,
      matchedKeywords: m.matchedKeywords,
      confidence,
    };
  });
}

/**
 * Returns safe diagnostic metadata about the course knowledge base
 */
export function getKnowledgeStatus(): KnowledgeStatus {
  const chunksByMethod: Record<string, number> = {};
  for (const chunk of COURSE_CHUNKS) {
    chunksByMethod[chunk.method] = (chunksByMethod[chunk.method] || 0) + 1;
  }

  return {
    documents: COURSE_DOCUMENTS.length,
    chunks: COURSE_CHUNKS.length,
    chunksByMethod,
    methods: ['bisection', 'false-position', 'newton-raphson'],
    sourceType: 'official-course',
    retrievalReady: true,
  };
}
