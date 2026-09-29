/**
 * Learning System Facade
 * 
 * Re-exports learning types, persistence store, analytics calculations,
 * and deterministic recommendations.
 */

export * from '../../types/learning.ts';
export * from './learningStore.ts';
export * from './learningAnalytics.ts';
export * from './recommendationService.ts';
