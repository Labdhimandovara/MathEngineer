/**
 * Adaptive Learning & Deterministic Personalization Facade (Phase 11)
 * 
 * Re-exports:
 * - Types (AdaptiveState, AdaptiveTopicState, WeakTopicSignal, AdaptiveRecommendation, SessionPlan, etc.)
 * - Recency Model (calculateRecencyMetrics, RECENCY_WEIGHTS)
 * - Engine (deriveAdaptiveTopicStates, detectWeakTopics, detectStrengths,
 *           deriveLearningFocus, recommendNextPractice, buildSessionPlan,
 *           deriveAssessmentRecommendations)
 */

export * from './adaptiveTypes.ts';
export * from './recencyModel.ts';
export * from './adaptiveEngine.ts';
