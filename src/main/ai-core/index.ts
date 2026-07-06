/**
 * AI Core Module Exports
 *
 * Flowrider's self-improving learning system.
 * It observes, learns, and improves from every interaction.
 */

export { Memory, Interaction, Pattern, Insight, CodeSnippet, AIStats } from './Memory';
export { Collector, SessionContext, FeedbackSignal, CollectedInteraction } from './Collector';
export { Analyzer, AnalysisResult, PatternCandidate } from './Analyzer';
export { Distiller, DistilledContext, DistillationRequest, KnowledgeChunk, Warning, RelevantSnippet, SuccessPattern } from './Distiller';
export { AICore, AICoreConfig, AICoreStatus, getAICore, shutdownAICore } from './AICore';
