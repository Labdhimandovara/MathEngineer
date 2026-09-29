/**
 * Knowledge Base & RAG Retrieval Types for MathEngineer
 * 
 * Defines typed models for official course documents, educational chunks,
 * retrieval scoring, and query intent classification.
 */

export interface KnowledgeDocument {
  id: string;
  unit: string;
  topic: string;
  method?: 'bisection' | 'false-position' | 'newton-raphson';
  title: string;
  sourceType: 'official-course';
  sourceFile: string;
  author?: string;
  department?: string;
  institution?: string;
  pageCount?: number;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  unit: string;
  method: 'bisection' | 'false-position' | 'newton-raphson';
  topic: string;
  section: string;
  sourcePage: number;
  sourceSlide?: number;
  content: string;
  equations?: string[];
  keywords: string[];
  sourceType: 'official-course';
  /**
   * Explicit negative knowledge: questions that are NOT specified in the course notes,
   * used to prevent hallucinations (e.g., derivative = 0 handling).
   */
  notSpecifiedInCourse?: string[];
}

export interface RetrievalMatch {
  chunk: KnowledgeChunk;
  score: number;
  source: string;
  matchedKeywords: string[];
  confidence: 'high' | 'medium' | 'low';
}

export interface RetrievalOptions {
  method?: 'bisection' | 'false-position' | 'newton-raphson' | string;
  unit?: string;
  topic?: string;
  topK?: number;
  minScore?: number;
}

export type QueryIntent =
  | 'GENERAL'
  | 'COURSE_SPECIFIC'
  | 'CURRENT_PROBLEM'
  | 'SOLVER_EXPLANATION';

export interface QueryClassificationResult {
  intent: QueryIntent;
  confidence: number;
  targetMethod?: 'bisection' | 'false-position' | 'newton-raphson';
  explanation: string;
}

export interface KnowledgeStatus {
  documents: number;
  chunks: number;
  chunksByMethod: Record<string, number>;
  methods: string[];
  sourceType: 'official-course';
  retrievalReady: boolean;
}
