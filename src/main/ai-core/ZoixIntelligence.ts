/**
 * ZoixIntelligence - The Intelligence Layer that ties ZOIX services together
 *
 * This service aggregates data from:
 * - SkillTracker (skill progression, milestones)
 * - UserProfiler (interests, domains)
 * - KnowledgeGraph (concept relationships)
 * - ContextMemory (session context)
 * - GoalInference (user objectives)
 *
 * And generates:
 * - Contextual AI suggestions based on user profile
 * - "You're getting better at X" notifications
 * - Cross-session recommendations
 * - Learning path suggestions
 */

import { getSkillTracker, ProgressionAnalysis, Milestone, SkillLevel } from './SkillTracker';
import { KnowledgeGraph, Concept, KnowledgeGap, getKnowledgeGraph } from './KnowledgeGraph';

// ============================================
// Types
// ============================================

export interface ZoixInsight {
  id: string;
  type: 'skill_improvement' | 'level_up' | 'milestone' | 'recommendation' | 'learning_gap' | 'cross_session';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
  domain?: string;
  actionable: boolean;
  actions?: InsightAction[];
  createdAt: number;
  expiresAt?: number;
  dismissed: boolean;
}

export interface InsightAction {
  label: string;
  type: 'navigate' | 'command' | 'external';
  payload: string;
}

export interface SkillProgressNotification {
  domain: string;
  previousLevel: SkillLevel;
  currentLevel: SkillLevel;
  progressionRate: 'improving' | 'stable' | 'declining';
  message: string;
  celebratory: boolean;
}

export interface CrossSessionRecommendation {
  id: string;
  type: 'related_concept' | 'common_pattern' | 'skill_transfer' | 'workflow_optimization';
  title: string;
  description: string;
  fromSession?: string;
  toSession?: string;
  confidence: number;
  concepts: string[];
}

export interface IntelligenceSummary {
  totalInsights: number;
  pendingInsights: ZoixInsight[];
  recentMilestones: Milestone[];
  improvingSkills: { domain: string; rate: string }[];
  topConcepts: { name: string; occurrences: number }[];
  knowledgeGaps: KnowledgeGap[];
  recommendations: CrossSessionRecommendation[];
}

// ============================================
// Skill Progression Messages
// ============================================

const IMPROVEMENT_MESSAGES = {
  improving: [
    "You're getting better at {domain}!",
    "Nice progress on {domain}!",
    "Your {domain} skills are improving!",
    "Keep it up with {domain}!",
    "{domain} is looking stronger!",
  ],
  level_up: [
    "Level up! You've reached {level} in {domain}!",
    "Congrats! You're now {level} at {domain}!",
    "Achievement unlocked: {level} in {domain}!",
    "You've advanced to {level} level in {domain}!",
  ],
  milestone: [
    "Milestone achieved: {name}!",
    "You've earned: {name}!",
    "New achievement: {name}!",
  ],
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ============================================
// ZoixIntelligence Class
// ============================================

export class ZoixIntelligence {
  private insights: Map<string, ZoixInsight> = new Map();
  private lastCheckTime: number = 0;
  private checkInterval: number = 60000; // Check every minute
  private notifiedMilestones: Set<string> = new Set();
  private notifiedLevelUps: Map<string, SkillLevel> = new Map();

  constructor() {
    console.log('[ZoixIntelligence] Initialized');
  }

  // ============================================
  // Core Intelligence Methods
  // ============================================

  /**
   * Generate insights by analyzing all ZOIX services
   */
  async generateInsights(): Promise<ZoixInsight[]> {
    const newInsights: ZoixInsight[] = [];

    try {
      // Check skill progression
      const skillInsights = await this.checkSkillProgression();
      newInsights.push(...skillInsights);

      // Check for new milestones
      const milestoneInsights = await this.checkMilestones();
      newInsights.push(...milestoneInsights);

      // Check knowledge gaps
      const gapInsights = await this.checkKnowledgeGaps();
      newInsights.push(...gapInsights);

      // Generate cross-session recommendations
      const crossSessionInsights = await this.generateCrossSessionInsights();
      newInsights.push(...crossSessionInsights);

      // Add new insights to the map
      for (const insight of newInsights) {
        this.insights.set(insight.id, insight);
      }

      this.lastCheckTime = Date.now();
    } catch (error) {
      console.error('[ZoixIntelligence] Error generating insights:', error);
    }

    return newInsights;
  }

  /**
   * Get all pending (non-dismissed) insights
   */
  getPendingInsights(): ZoixInsight[] {
    return Array.from(this.insights.values())
      .filter(i => !i.dismissed && (!i.expiresAt || i.expiresAt > Date.now()))
      .sort((a, b) => {
        // Sort by priority then by date
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.createdAt - a.createdAt;
      });
  }

  /**
   * Dismiss an insight
   */
  dismissInsight(insightId: string): boolean {
    const insight = this.insights.get(insightId);
    if (insight) {
      insight.dismissed = true;
      return true;
    }
    return false;
  }

  /**
   * Get a comprehensive intelligence summary
   */
  async getSummary(): Promise<IntelligenceSummary> {
    const skillTracker = getSkillTracker();
    const knowledgeGraph = getKnowledgeGraph();

    // Get recent milestones
    const recentMilestones = skillTracker.getRecentAchievements(7);

    // Get improving skills
    const domains = skillTracker.getAllDomains();
    const improvingSkills: { domain: string; rate: string }[] = [];
    for (const domain of domains) {
      const analysis = skillTracker.getProgressionAnalysis(domain);
      if (analysis && analysis.progressionRate === 'improving') {
        improvingSkills.push({
          domain,
          rate: analysis.progressionRate,
        });
      }
    }

    // Get top concepts from knowledge graph (sorted by occurrences)
    const stats = knowledgeGraph.getStats();
    const graphData = knowledgeGraph.getKnowledgeGraph();
    const sortedConcepts = [...graphData.concepts].sort((a, b) => b.occurrences - a.occurrences);
    const topConcepts = sortedConcepts.slice(0, 5).map((c: Concept) => ({
      name: c.name,
      occurrences: c.occurrences,
    }));

    // Get knowledge gaps
    const knowledgeGaps = knowledgeGraph.getKnowledgeGaps().slice(0, 3);

    // Get cross-session recommendations
    const recommendations = await this.getCrossSessionRecommendations();

    return {
      totalInsights: this.insights.size,
      pendingInsights: this.getPendingInsights().slice(0, 5),
      recentMilestones: recentMilestones.slice(0, 3),
      improvingSkills: improvingSkills.slice(0, 5),
      topConcepts,
      knowledgeGaps,
      recommendations: recommendations.slice(0, 3),
    };
  }

  // ============================================
  // Skill Progression Notifications
  // ============================================

  private async checkSkillProgression(): Promise<ZoixInsight[]> {
    const insights: ZoixInsight[] = [];
    const skillTracker = getSkillTracker();
    const domains = skillTracker.getAllDomains();

    for (const domain of domains) {
      const analysis = skillTracker.getProgressionAnalysis(domain);
      if (!analysis) continue;

      // Check for level ups
      const lastNotifiedLevel = this.notifiedLevelUps.get(domain);
      if (lastNotifiedLevel && lastNotifiedLevel !== analysis.currentLevel) {
        // Level changed!
        const levelOrder: SkillLevel[] = ['novice', 'intermediate', 'proficient', 'expert'];
        const oldIndex = levelOrder.indexOf(lastNotifiedLevel);
        const newIndex = levelOrder.indexOf(analysis.currentLevel);

        if (newIndex > oldIndex) {
          // Level up!
          insights.push(this.createLevelUpInsight(domain, lastNotifiedLevel, analysis.currentLevel));
        }
      }
      this.notifiedLevelUps.set(domain, analysis.currentLevel);

      // Check for improving skills (only notify occasionally)
      if (analysis.progressionRate === 'improving') {
        const shouldNotify = Math.random() < 0.1; // 10% chance to notify
        if (shouldNotify) {
          insights.push(this.createImprovementInsight(domain, analysis));
        }
      }
    }

    return insights;
  }

  private async checkMilestones(): Promise<ZoixInsight[]> {
    const insights: ZoixInsight[] = [];
    const skillTracker = getSkillTracker();

    // Get milestones from the last hour
    const recentMilestones = skillTracker.getRecentAchievements(1);

    for (const milestone of recentMilestones) {
      if (!this.notifiedMilestones.has(milestone.id)) {
        insights.push(this.createMilestoneInsight(milestone));
        this.notifiedMilestones.add(milestone.id);
      }
    }

    return insights;
  }

  private async checkKnowledgeGaps(): Promise<ZoixInsight[]> {
    const insights: ZoixInsight[] = [];

    try {
      const knowledgeGraph = getKnowledgeGraph();
      const gaps = knowledgeGraph.getKnowledgeGaps();

      // Only create insights for high-confidence gaps
      for (const gap of gaps.slice(0, 2)) {
        if (gap.confidence > 0.7) {
          insights.push({
            id: `gap-${gap.id}`,
            type: 'learning_gap',
            title: 'Knowledge Gap Detected',
            message: gap.description,
            priority: 'medium',
            actionable: true,
            actions: gap.suggestions.slice(0, 2).map((s: string) => ({
              label: s,
              type: 'external' as const,
              payload: `https://google.com/search?q=${encodeURIComponent(s)}`,
            })),
            createdAt: Date.now(),
            expiresAt: Date.now() + 24 * 60 * 60 * 1000, // Expires in 24 hours
            dismissed: false,
          });
        }
      }
    } catch (error) {
      // Knowledge graph might not have enough data yet
    }

    return insights;
  }

  // ============================================
  // Cross-Session Intelligence
  // ============================================

  private async generateCrossSessionInsights(): Promise<ZoixInsight[]> {
    const insights: ZoixInsight[] = [];

    try {
      const knowledgeGraph = getKnowledgeGraph();
      const clusters = knowledgeGraph.getKnowledgeClusters();

      // Find clusters that span multiple categories (cross-domain knowledge)
      for (const cluster of clusters.slice(0, 3)) {
        if (cluster.coherence > 0.6 && cluster.conceptIds.length >= 3) {
          insights.push({
            id: `cluster-${cluster.id}`,
            type: 'cross_session',
            title: `Knowledge Pattern: ${cluster.name}`,
            message: `You're building expertise in ${cluster.description}. This knowledge connects across your projects.`,
            priority: 'low',
            actionable: false,
            createdAt: Date.now(),
            expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // Expires in 7 days
            dismissed: false,
          });
        }
      }
    } catch (error) {
      // Knowledge graph might not have enough data
    }

    return insights;
  }

  async getCrossSessionRecommendations(): Promise<CrossSessionRecommendation[]> {
    const recommendations: CrossSessionRecommendation[] = [];

    try {
      const knowledgeGraph = getKnowledgeGraph();
      const skillTracker = getSkillTracker();

      // Find concepts that appear frequently together (get top concepts by sorting)
      const graphData = knowledgeGraph.getKnowledgeGraph();
      const topConcepts = [...graphData.concepts]
        .sort((a, b) => b.occurrences - a.occurrences)
        .slice(0, 10);

      for (let i = 0; i < topConcepts.length - 1; i++) {
        const concept1 = topConcepts[i];
        const relations = knowledgeGraph.getRelatedConcepts(concept1.name, 3);

        for (const relation of relations) {
          if (relation.strength > 0.5) {
            recommendations.push({
              id: `rec-${concept1.id}-${relation.concept.id}`,
              type: 'related_concept',
              title: `${concept1.name} + ${relation.concept.name}`,
              description: `These technologies work well together. Consider exploring their integration.`,
              confidence: relation.strength,
              concepts: [concept1.name, relation.concept.name],
            });
          }
        }
      }

      // Find skill transfer opportunities
      const domains = skillTracker.getAllDomains();
      const expertDomains = domains.filter(d => skillTracker.getSkillLevel(d) === 'expert');
      const noviceDomains = domains.filter(d => skillTracker.getSkillLevel(d) === 'novice');

      // Helper to find a concept by name
      const findConceptByName = (name: string): Concept | undefined => {
        return graphData.concepts.find(c =>
          c.name.toLowerCase() === name.toLowerCase() ||
          c.aliases.some(a => a.toLowerCase() === name.toLowerCase())
        );
      };

      for (const expert of expertDomains) {
        for (const novice of noviceDomains) {
          // Check if these domains are related
          const expertConcept = findConceptByName(expert);
          const noviceConcept = findConceptByName(novice);

          if (expertConcept && noviceConcept) {
            const relations = knowledgeGraph.getRelatedConcepts(expertConcept.name, 10);
            const isRelated = relations.some((r: { concept: Concept; strength: number }) => r.concept.id === noviceConcept.id);

            if (isRelated) {
              recommendations.push({
                id: `transfer-${expert}-${novice}`,
                type: 'skill_transfer',
                title: `Apply ${expert} skills to ${novice}`,
                description: `Your expertise in ${expert} could help you learn ${novice} faster.`,
                confidence: 0.7,
                concepts: [expert, novice],
              });
            }
          }
        }
      }
    } catch (error) {
      // Services might not have enough data yet
    }

    return recommendations.slice(0, 5);
  }

  // ============================================
  // Insight Creation Helpers
  // ============================================

  private createLevelUpInsight(domain: string, previous: SkillLevel, current: SkillLevel): ZoixInsight {
    const template = pickRandom(IMPROVEMENT_MESSAGES.level_up);
    const message = template
      .replace('{level}', current)
      .replace('{domain}', domain);

    return {
      id: `levelup-${domain}-${Date.now()}`,
      type: 'level_up',
      title: 'Skill Level Up!',
      message,
      priority: 'high',
      domain,
      actionable: false,
      createdAt: Date.now(),
      dismissed: false,
    };
  }

  private createImprovementInsight(domain: string, analysis: ProgressionAnalysis): ZoixInsight {
    const template = pickRandom(IMPROVEMENT_MESSAGES.improving);
    const message = template.replace('{domain}', domain);

    return {
      id: `improvement-${domain}-${Date.now()}`,
      type: 'skill_improvement',
      title: 'Skill Improvement',
      message,
      priority: 'medium',
      domain,
      actionable: false,
      createdAt: Date.now(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // Expires in 24 hours
      dismissed: false,
    };
  }

  private createMilestoneInsight(milestone: Milestone): ZoixInsight {
    const template = pickRandom(IMPROVEMENT_MESSAGES.milestone);
    const message = template.replace('{name}', milestone.name);

    return {
      id: `milestone-${milestone.id}`,
      type: 'milestone',
      title: 'Achievement Unlocked!',
      message: `${message}\n${milestone.description}`,
      priority: 'high',
      domain: milestone.domain,
      actionable: false,
      createdAt: Date.now(),
      dismissed: false,
    };
  }

  // ============================================
  // Contextual Suggestions
  // ============================================

  /**
   * Get contextual suggestions for a session based on user profile
   */
  async getContextualSuggestions(sessionContext: {
    projectPath?: string;
    currentFiles?: string[];
    recentCommands?: string[];
  }): Promise<string[]> {
    const suggestions: string[] = [];

    try {
      const skillTracker = getSkillTracker();
      const knowledgeGraph = getKnowledgeGraph();

      // Get user's top skills
      const domains = skillTracker.getAllDomains();
      const expertDomains = domains.filter(d => {
        const level = skillTracker.getSkillLevel(d);
        return level === 'expert' || level === 'proficient';
      });

      // Helper to find a concept by name
      const graphData = knowledgeGraph.getKnowledgeGraph();
      const findConceptByName = (name: string): Concept | undefined => {
        return graphData.concepts.find(c =>
          c.name.toLowerCase() === name.toLowerCase() ||
          c.aliases.some(a => a.toLowerCase() === name.toLowerCase())
        );
      };

      // Get related concepts
      for (const domain of expertDomains.slice(0, 3)) {
        const concept = findConceptByName(domain);
        if (concept) {
          const related = knowledgeGraph.getRelatedConcepts(concept.name, 2);
          for (const rel of related) {
            suggestions.push(`Consider using ${rel.concept.name} with your ${domain} expertise`);
          }
        }
      }

      // Add skill-based suggestions
      const weakDomains = domains.filter(d => {
        const metrics = skillTracker.getSkillMetrics(d);
        return metrics && metrics.errorsPerDay > 3;
      });

      for (const domain of weakDomains.slice(0, 2)) {
        suggestions.push(`Focus on improving your ${domain} skills - high error rate detected`);
      }
    } catch (error) {
      // Fallback suggestions
      suggestions.push('Start by exploring the codebase');
    }

    return suggestions.slice(0, 5);
  }
}

// ============================================
// Singleton Export
// ============================================

let instance: ZoixIntelligence | null = null;

export function getZoixIntelligence(): ZoixIntelligence {
  if (!instance) {
    instance = new ZoixIntelligence();
  }
  return instance;
}

export default ZoixIntelligence;
