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
export {
  ContextMemory,
  SessionSummary,
  DailyDigest,
  ProjectContext,
  InferredGoal,
  UnfinishedTask,
  WeeklyTheme,
  ContextRestoration
} from './ContextMemory';
export {
  ResourceRecommender,
  Resource,
  ResourceRecommendation,
  LearningGap,
  ResourceRequest,
  ResourceType,
  UserResource,
  EngagementType,
  RecommendationContext
} from './ResourceRecommender';
export {
  OntologyBuilder,
  OntologyCategory,
  OntologyCrossReference,
  OntologySnapshot,
  OntologyTree,
  OntologyTreeNode,
  OntologyExportJSON,
  OntologyExportGraph,
  OntologyStats,
  EvolutionMetrics,
  GrowthArea
} from './OntologyBuilder';
export {
  UserProfiler,
  Interest,
  Domain,
  SkillProgression,
  UserProfile,
  Activity
} from './UserProfiler';
export { getUserProfiler, shutdownUserProfiler } from './UserProfiler.integration';
export { GoalInference, InferredGoal as ZoixGoal, GoalProgress, GoalLevel, SessionContext as GoalSessionContext, CareerTrajectory } from './GoalInference';

export {
  SkillTracker,
  SkillMetrics,
  Milestone,
  SkillHistorySnapshot,
  ProgressionAnalysis,
  MasteryPrediction,
  ActivityContext,
  SkillLevel,
  ProgressionRate,
  getSkillTracker
} from './SkillTracker';

export {
  TaskOutcomes,
  TaskOutcomeRecord,
  TaskOutcome,
  TaskCategory,
  CostLedgerEntry,
  RoutingStats,
  ProviderStats,
  ModelStats,
  CategoryStats,
  DailySummary,
  getTaskOutcomes,
  shutdownTaskOutcomes
} from './TaskOutcomes';
