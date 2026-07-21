/**
 * CrossSessionAnalyzer - Deep analysis across terminal sessions
 *
 * This service analyzes patterns and similarities between different sessions to:
 * - Identify shared code patterns (similar imports, function names, error fixes)
 * - Detect workflow similarities (both sessions doing git workflows, testing, etc.)
 * - Find opportunities for code reuse between sessions
 * - Surface actionable insights to users
 *
 * Works in conjunction with CrossSessionAwareness and AI Core.
 */

import { getAICore } from './ai-core';
import { getCrossSessionAwareness, SessionActivity, CrossSessionSuggestion } from './CrossSessionAwareness';
import { Pattern, Interaction, CodeSnippet } from './ai-core/Memory';
import * as crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface SessionSimilarity {
  session1Id: string;
  session1Name: string;
  session2Id: string;
  session2Name: string;
  similarityScore: number; // 0-1
  sharedPatterns: SharedPattern[];
  sharedWorkflows: SharedWorkflow[];
  reuseOpportunities: ReuseOpportunity[];
  timestamp: number;
}

export interface SharedPattern {
  type: 'code' | 'error' | 'workflow' | 'prompt';
  name: string;
  description: string;
  occurrencesInSession1: number;
  occurrencesInSession2: number;
  confidence: number;
  example?: string;
}

export interface SharedWorkflow {
  workflow: string[];
  description: string;
  session1Occurrences: number;
  session2Occurrences: number;
  successRate: number;
}

export interface ReuseOpportunity {
  type: 'code-snippet' | 'solution' | 'workflow';
  title: string;
  description: string;
  sourceSessionId: string;
  targetSessionId: string;
  content: string;
  relevance: number;
  estimatedTimeSaved?: string;
}

export interface CrossSessionInsight {
  id: string;
  type: 'pattern-similarity' | 'workflow-match' | 'code-reuse' | 'error-solution' | 'collaboration';
  title: string;
  description: string;
  affectedSessions: string[];
  actionable: boolean;
  action?: string;
  priority: 'low' | 'medium' | 'high';
  timestamp: number;
  dismissed: boolean;
}

export interface SessionPatternSummary {
  sessionId: string;
  sessionName: string;
  topPatterns: {
    type: string;
    name: string;
    count: number;
    confidence: number;
  }[];
  dominantWorkflows: string[][];
  codeLanguages: string[];
  errorTypes: string[];
  activityLevel: 'low' | 'medium' | 'high';
  lastAnalyzed: number;
}

export interface CrossSessionAnalysisResult {
  totalSessions: number;
  similarities: SessionSimilarity[];
  insights: CrossSessionInsight[];
  sessionSummaries: SessionPatternSummary[];
  timestamp: number;
}

// ============================================
// CrossSessionAnalyzer Class
// ============================================

export class CrossSessionAnalyzer {
  private insights: Map<string, CrossSessionInsight> = new Map();
  private sessionPatternCache: Map<string, SessionPatternSummary> = new Map();
  private insightIdCounter = 0;
  private lastAnalysisTime = 0;

  // Cache duration: 5 minutes
  private readonly CACHE_DURATION_MS = 5 * 60 * 1000;

  constructor() {
    console.log('[CrossSessionAnalyzer] Initialized');
  }

  // ============================================
  // Main Analysis Methods
  // ============================================

  /**
   * Analyze all active sessions and find cross-session patterns
   */
  async analyzeAllSessions(): Promise<CrossSessionAnalysisResult> {
    console.log('[CrossSessionAnalyzer] Starting cross-session analysis...');

    const crossSessionAwareness = getCrossSessionAwareness();
    const aiCore = getAICore();

    // Get all sessions
    const allSessions = crossSessionAwareness.getActivityFeed();
    console.log(`[CrossSessionAnalyzer] Analyzing ${allSessions.length} sessions`);

    // Build session summaries
    const sessionSummaries: SessionPatternSummary[] = [];
    for (const session of allSessions) {
      const summary = await this.analyzeSession(session);
      sessionSummaries.push(summary);
      this.sessionPatternCache.set(session.sessionId, summary);
    }

    // Find similarities between all session pairs
    const similarities: SessionSimilarity[] = [];
    for (let i = 0; i < allSessions.length; i++) {
      for (let j = i + 1; j < allSessions.length; j++) {
        const similarity = await this.compareSessions(
          allSessions[i],
          allSessions[j],
          sessionSummaries[i],
          sessionSummaries[j]
        );

        if (similarity.similarityScore > 0.3) {
          similarities.push(similarity);
        }
      }
    }

    // Generate cross-session insights
    await this.generateInsights(allSessions, similarities);

    this.lastAnalysisTime = Date.now();

    const result: CrossSessionAnalysisResult = {
      totalSessions: allSessions.length,
      similarities: similarities.sort((a, b) => b.similarityScore - a.similarityScore),
      insights: Array.from(this.insights.values())
        .filter(i => !i.dismissed)
        .sort((a, b) => {
          // Sort by priority then timestamp
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
          if (priorityDiff !== 0) return priorityDiff;
          return b.timestamp - a.timestamp;
        }),
      sessionSummaries,
      timestamp: Date.now(),
    };

    console.log(`[CrossSessionAnalyzer] Analysis complete: ${similarities.length} similarities, ${result.insights.length} insights`);
    return result;
  }

  /**
   * Analyze a single session and build its pattern summary
   */
  private async analyzeSession(session: SessionActivity): Promise<SessionPatternSummary> {
    const aiCore = getAICore();

    // Get interactions for this session
    const interactions = aiCore.getSessionInteractions(session.sessionId);

    // Aggregate patterns
    const patternCounts = new Map<string, { pattern: Pattern; count: number }>();
    const workflows = new Set<string>();
    const languages = new Set<string>();
    const errorTypes = new Set<string>();

    for (const interaction of interactions) {
      // Count patterns
      for (const tag of interaction.tags) {
        // Tags often represent pattern types
        if (!patternCounts.has(tag)) {
          patternCounts.set(tag, { pattern: { type: 'code' } as Pattern, count: 0 });
        }
        patternCounts.get(tag)!.count++;
      }

      // Track languages from tags
      const langTags = interaction.tags.filter(t =>
        ['typescript', 'javascript', 'python', 'rust', 'go', 'java', 'cpp', 'c', 'ruby', 'php'].includes(t.toLowerCase())
      );
      langTags.forEach(lang => languages.add(lang));

      // Track errors
      for (const error of interaction.errorsCaught) {
        const errorType = this.extractErrorType(error);
        if (errorType) errorTypes.add(errorType);
      }
    }

    // Get high-confidence patterns from AI Core
    const allPatterns = aiCore.getPatterns(0.5);
    const sessionPatterns = allPatterns.filter(p =>
      p.projectIds.includes(session.projectId || '') ||
      interactions.some(i => i.id && p.context.includes(i.id))
    );

    // Top patterns by confidence and occurrence
    const topPatterns = sessionPatterns
      .sort((a, b) => b.confidence * b.occurrences - a.confidence * a.occurrences)
      .slice(0, 10)
      .map(p => ({
        type: p.type,
        name: p.name,
        count: p.occurrences,
        confidence: p.confidence,
      }));

    // Extract workflow sequences from tags
    const dominantWorkflows: string[][] = [];
    const tagSequences = interactions
      .sort((a, b) => a.timestamp - b.timestamp)
      .map(i => i.tags);

    // Find common sequences of 3+ tags
    for (let i = 0; i <= tagSequences.length - 3; i++) {
      const sequence = [
        tagSequences[i].join('+'),
        tagSequences[i + 1].join('+'),
        tagSequences[i + 2].join('+'),
      ].filter(s => s);

      if (sequence.length >= 2) {
        dominantWorkflows.push(sequence);
      }
    }

    // Determine activity level based on recent interactions
    const recentInteractions = interactions.filter(
      i => i.timestamp > Date.now() - 3600000 // Last hour
    );
    let activityLevel: 'low' | 'medium' | 'high' = 'low';
    if (recentInteractions.length > 10) activityLevel = 'high';
    else if (recentInteractions.length > 3) activityLevel = 'medium';

    return {
      sessionId: session.sessionId,
      sessionName: session.sessionName,
      topPatterns,
      dominantWorkflows: this.findCommonSequences(dominantWorkflows),
      codeLanguages: Array.from(languages),
      errorTypes: Array.from(errorTypes),
      activityLevel,
      lastAnalyzed: Date.now(),
    };
  }

  /**
   * Compare two sessions and find similarities
   */
  private async compareSessions(
    session1: SessionActivity,
    session2: SessionActivity,
    summary1: SessionPatternSummary,
    summary2: SessionPatternSummary
  ): Promise<SessionSimilarity> {
    const aiCore = getAICore();
    let similarityScore = 0;
    const sharedPatterns: SharedPattern[] = [];
    const sharedWorkflows: SharedWorkflow[] = [];
    const reuseOpportunities: ReuseOpportunity[] = [];

    // 1. Compare working directories
    if (session1.workingDir === session2.workingDir) {
      similarityScore += 0.3;
    }

    // 2. Compare project IDs
    if (session1.projectId && session1.projectId === session2.projectId) {
      similarityScore += 0.3;
    }

    // 3. Compare file overlaps
    const sharedFiles = session1.recentFiles.filter(f => session2.recentFiles.includes(f));
    if (sharedFiles.length > 0) {
      similarityScore += Math.min(0.2, sharedFiles.length * 0.05);
    }

    // 4. Compare patterns
    const patterns1 = new Set(summary1.topPatterns.map(p => p.name));
    const patterns2 = new Set(summary2.topPatterns.map(p => p.name));

    for (const p1 of summary1.topPatterns) {
      const p2 = summary2.topPatterns.find(p => p.name === p1.name);
      if (p2) {
        sharedPatterns.push({
          type: p1.type as any,
          name: p1.name,
          description: `Pattern used in both sessions`,
          occurrencesInSession1: p1.count,
          occurrencesInSession2: p2.count,
          confidence: (p1.confidence + p2.confidence) / 2,
        });
        similarityScore += 0.1 * Math.min(p1.confidence, p2.confidence);
      }
    }

    // 5. Compare workflows
    for (const workflow1 of summary1.dominantWorkflows) {
      for (const workflow2 of summary2.dominantWorkflows) {
        const similarity = this.workflowSimilarity(workflow1, workflow2);
        if (similarity > 0.7) {
          sharedWorkflows.push({
            workflow: workflow1,
            description: `Similar workflow pattern`,
            session1Occurrences: 1,
            session2Occurrences: 1,
            successRate: 0.8, // Estimated
          });
          similarityScore += 0.15;
        }
      }
    }

    // 6. Compare languages
    const sharedLanguages = summary1.codeLanguages.filter(l =>
      summary2.codeLanguages.includes(l)
    );
    if (sharedLanguages.length > 0) {
      similarityScore += Math.min(0.1, sharedLanguages.length * 0.05);
    }

    // 7. Compare error types (common problems)
    const sharedErrors = summary1.errorTypes.filter(e => summary2.errorTypes.includes(e));
    if (sharedErrors.length > 0) {
      similarityScore += 0.05;

      // Check if one session has solutions for errors in the other
      const interactions1 = aiCore.getSessionInteractions(session1.sessionId);
      const interactions2 = aiCore.getSessionInteractions(session2.sessionId);

      for (const error of sharedErrors) {
        // Find successful resolution in session1
        const resolution1 = interactions1.find(
          i => i.errorsCaught.some(e => this.extractErrorType(e) === error) &&
               i.outcome === 'success'
        );

        // Check if session2 has the same error unsolved
        const hasUnresolved2 = session2.recentErrors.some(e =>
          this.extractErrorType(e) === error
        );

        if (resolution1 && hasUnresolved2) {
          reuseOpportunities.push({
            type: 'solution',
            title: `Error solution available`,
            description: `Session "${session1.sessionName}" has a solution for ${error} that session "${session2.sessionName}" is experiencing`,
            sourceSessionId: session1.sessionId,
            targetSessionId: session2.sessionId,
            content: resolution1.response.substring(0, 500),
            relevance: 0.9,
            estimatedTimeSaved: '5-15 minutes',
          });
        }

        // Same check in reverse
        const resolution2 = interactions2.find(
          i => i.errorsCaught.some(e => this.extractErrorType(e) === error) &&
               i.outcome === 'success'
        );
        const hasUnresolved1 = session1.recentErrors.some(e =>
          this.extractErrorType(e) === error
        );

        if (resolution2 && hasUnresolved1) {
          reuseOpportunities.push({
            type: 'solution',
            title: `Error solution available`,
            description: `Session "${session2.sessionName}" has a solution for ${error} that session "${session1.sessionName}" is experiencing`,
            sourceSessionId: session2.sessionId,
            targetSessionId: session1.sessionId,
            content: resolution2.response.substring(0, 500),
            relevance: 0.9,
            estimatedTimeSaved: '5-15 minutes',
          });
        }
      }
    }

    // 8. Find code reuse opportunities
    const codeSnippets1 = aiCore.getSessionInteractions(session1.sessionId)
      .filter(i => i.codeChanged)
      .flatMap(i => this.extractCodeFromResponse(i.response));

    const codeSnippets2 = aiCore.getSessionInteractions(session2.sessionId)
      .filter(i => i.codeChanged)
      .flatMap(i => this.extractCodeFromResponse(i.response));

    // Look for similar code patterns
    for (const code1 of codeSnippets1) {
      for (const code2 of codeSnippets2) {
        const codeSimilarity = this.codeSimilarity(code1, code2);
        if (codeSimilarity > 0.8 && !reuseOpportunities.some(o => o.content.includes(code1.substring(0, 100)))) {
          reuseOpportunities.push({
            type: 'code-snippet',
            title: 'Similar code patterns detected',
            description: `Both sessions have similar code implementations`,
            sourceSessionId: session1.sessionId,
            targetSessionId: session2.sessionId,
            content: code1,
            relevance: codeSimilarity,
            estimatedTimeSaved: '10-30 minutes',
          });
        }
      }
    }

    // 9. Find workflow reuse opportunities
    if (sharedWorkflows.length > 0) {
      for (const workflow of sharedWorkflows) {
        if (workflow.successRate > 0.7) {
          reuseOpportunities.push({
            type: 'workflow',
            title: 'Proven workflow pattern',
            description: `Workflow "${workflow.workflow.join(' → ')}" has been successful in both sessions`,
            sourceSessionId: session1.sessionId,
            targetSessionId: session2.sessionId,
            content: workflow.workflow.join(' → '),
            relevance: workflow.successRate,
            estimatedTimeSaved: '15-45 minutes',
          });
        }
      }
    }

    return {
      session1Id: session1.sessionId,
      session1Name: session1.sessionName,
      session2Id: session2.sessionId,
      session2Name: session2.sessionName,
      similarityScore: Math.min(1, similarityScore),
      sharedPatterns,
      sharedWorkflows,
      reuseOpportunities: reuseOpportunities.slice(0, 5), // Limit to top 5
      timestamp: Date.now(),
    };
  }

  // ============================================
  // Insight Generation
  // ============================================

  /**
   * Generate actionable insights from session similarities
   */
  private async generateInsights(
    sessions: SessionActivity[],
    similarities: SessionSimilarity[]
  ): Promise<void> {
    // Clear old insights (keep only last 50)
    if (this.insights.size > 50) {
      const sorted = Array.from(this.insights.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);

      for (let i = 0; i < sorted.length - 25; i++) {
        if (sorted[i][1].dismissed) {
          this.insights.delete(sorted[i][0]);
        }
      }
    }

    // 1. High similarity insights
    for (const sim of similarities) {
      if (sim.similarityScore > 0.7) {
        this.createInsight({
          type: 'pattern-similarity',
          title: `Sessions "${sim.session1Name}" and "${sim.session2Name}" are highly similar`,
          description: `Similarity score: ${(sim.similarityScore * 100).toFixed(0)}%. ${sim.sharedPatterns.length} shared patterns, ${sim.sharedWorkflows.length} shared workflows.`,
          affectedSessions: [sim.session1Id, sim.session2Id],
          actionable: sim.reuseOpportunities.length > 0,
          action: sim.reuseOpportunities.length > 0
            ? `Check ${sim.reuseOpportunities.length} code reuse opportunities`
            : undefined,
          priority: sim.similarityScore > 0.85 ? 'high' : 'medium',
        });
      }
    }

    // 2. Code reuse opportunities
    for (const sim of similarities) {
      for (const opportunity of sim.reuseOpportunities) {
        if (opportunity.relevance > 0.8) {
          this.createInsight({
            type: 'code-reuse',
            title: opportunity.title,
            description: opportunity.description + ` (Could save ${opportunity.estimatedTimeSaved})`,
            affectedSessions: [opportunity.sourceSessionId, opportunity.targetSessionId],
            actionable: true,
            action: `Review and apply ${opportunity.type} from "${sim.session1Name}" to "${sim.session2Name}"`,
            priority: opportunity.relevance > 0.9 ? 'high' : 'medium',
          });
        }
      }
    }

    // 3. Workflow pattern insights
    const workflowClusters = this.clusterWorkflows(similarities);
    for (const cluster of workflowClusters) {
      if (cluster.sessions.length >= 3) {
        this.createInsight({
          type: 'workflow-match',
          title: `${cluster.sessions.length} sessions using similar workflow`,
          description: `Workflow: "${cluster.workflow.join(' → ')}" is being used across multiple sessions with ${(cluster.avgSuccessRate * 100).toFixed(0)}% success rate`,
          affectedSessions: cluster.sessions,
          actionable: true,
          action: 'Consider standardizing this workflow as a template',
          priority: cluster.avgSuccessRate > 0.8 ? 'high' : 'medium',
        });
      }
    }

    // 4. Error solution sharing
    for (const sim of similarities) {
      const errorSolutions = sim.reuseOpportunities.filter(o => o.type === 'solution');
      if (errorSolutions.length > 0) {
        for (const solution of errorSolutions) {
          this.createInsight({
            type: 'error-solution',
            title: solution.title,
            description: solution.description,
            affectedSessions: [solution.sourceSessionId, solution.targetSessionId],
            actionable: true,
            action: 'Apply solution to resolve current error',
            priority: 'high',
          });
        }
      }
    }

    // 5. Collaboration opportunities
    for (const sim of similarities) {
      if (sim.similarityScore > 0.6 && sim.sharedPatterns.length > 3) {
        const session1 = sessions.find(s => s.sessionId === sim.session1Id);
        const session2 = sessions.find(s => s.sessionId === sim.session2Id);

        if (session1 && session2 && session1.workingDir === session2.workingDir) {
          this.createInsight({
            type: 'collaboration',
            title: 'Potential collaboration opportunity',
            description: `Sessions "${sim.session1Name}" and "${sim.session2Name}" are working on the same project with similar patterns. Consider coordinating to avoid conflicts.`,
            affectedSessions: [sim.session1Id, sim.session2Id],
            actionable: true,
            action: 'Review file modifications to prevent conflicts',
            priority: 'medium',
          });
        }
      }
    }
  }

  /**
   * Create a new insight
   */
  private createInsight(
    data: Omit<CrossSessionInsight, 'id' | 'timestamp' | 'dismissed'>
  ): void {
    // Check if similar insight already exists
    for (const existing of this.insights.values()) {
      if (
        existing.type === data.type &&
        existing.title === data.title &&
        !existing.dismissed
      ) {
        // Update timestamp to keep it fresh
        existing.timestamp = Date.now();
        return;
      }
    }

    const id = `insight-${++this.insightIdCounter}-${Date.now()}`;
    const insight: CrossSessionInsight = {
      ...data,
      id,
      timestamp: Date.now(),
      dismissed: false,
    };

    this.insights.set(id, insight);
  }

  // ============================================
  // Helper Methods
  // ============================================

  /**
   * Extract error type from error message
   */
  private extractErrorType(error: string): string | null {
    const patterns = [
      /(\w+Error):/,
      /(ENOENT):/,
      /(EACCES):/,
      /npm ERR! (.+)/,
      /error\[(\w+)\]/,
      /(Build failed)/,
      /(Test failed)/,
    ];

    for (const pattern of patterns) {
      const match = error.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    // Fallback: first word
    const words = error.trim().split(/\s+/);
    return words[0] || null;
  }

  /**
   * Extract code blocks from AI response
   */
  private extractCodeFromResponse(response: string): string[] {
    const codeBlocks: string[] = [];
    const regex = /```[\w]*\n([\s\S]*?)```/g;
    let match;

    while ((match = regex.exec(response)) !== null) {
      if (match[1] && match[1].length > 20) {
        codeBlocks.push(match[1].trim());
      }
    }

    return codeBlocks;
  }

  /**
   * Calculate similarity between two code snippets
   */
  private codeSimilarity(code1: string, code2: string): number {
    // Normalize code
    const normalize = (code: string) => code
      .replace(/\/\/.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/['"`].*?['"`]/g, 'STR')
      .replace(/\d+/g, 'N')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const n1 = normalize(code1);
    const n2 = normalize(code2);

    if (n1 === n2) return 1.0;

    // Calculate Jaccard similarity based on lines
    const lines1 = new Set(n1.split('\n'));
    const lines2 = new Set(n2.split('\n'));

    const intersection = new Set([...lines1].filter(l => lines2.has(l)));
    const union = new Set([...lines1, ...lines2]);

    return intersection.size / union.size;
  }

  /**
   * Calculate similarity between two workflows
   */
  private workflowSimilarity(workflow1: string[], workflow2: string[]): number {
    if (workflow1.length === 0 || workflow2.length === 0) return 0;

    // Check for exact match
    if (JSON.stringify(workflow1) === JSON.stringify(workflow2)) return 1.0;

    // Check for subset match
    const longer = workflow1.length > workflow2.length ? workflow1 : workflow2;
    const shorter = workflow1.length <= workflow2.length ? workflow1 : workflow2;

    let matches = 0;
    for (const step of shorter) {
      if (longer.includes(step)) matches++;
    }

    return matches / longer.length;
  }

  /**
   * Find common sequences in an array of sequences
   */
  private findCommonSequences(sequences: string[][]): string[][] {
    const counts = new Map<string, { sequence: string[]; count: number }>();

    for (const seq of sequences) {
      const key = seq.join('|');
      const existing = counts.get(key) || { sequence: seq, count: 0 };
      existing.count++;
      counts.set(key, existing);
    }

    return Array.from(counts.values())
      .filter(c => c.count >= 2)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(c => c.sequence);
  }

  /**
   * Cluster workflows by similarity
   */
  private clusterWorkflows(similarities: SessionSimilarity[]): {
    workflow: string[];
    sessions: string[];
    avgSuccessRate: number;
  }[] {
    const clusters: Map<string, {
      workflow: string[];
      sessions: Set<string>;
      successRates: number[];
    }> = new Map();

    for (const sim of similarities) {
      for (const workflow of sim.sharedWorkflows) {
        const key = workflow.workflow.join('|');
        const existing = clusters.get(key) || {
          workflow: workflow.workflow,
          sessions: new Set<string>(),
          successRates: [],
        };

        existing.sessions.add(sim.session1Id);
        existing.sessions.add(sim.session2Id);
        existing.successRates.push(workflow.successRate);

        clusters.set(key, existing);
      }
    }

    return Array.from(clusters.values())
      .map(c => ({
        workflow: c.workflow,
        sessions: Array.from(c.sessions),
        avgSuccessRate: c.successRates.reduce((sum, r) => sum + r, 0) / c.successRates.length,
      }))
      .sort((a, b) => b.sessions.length - a.sessions.length);
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get similarities for a specific session
   */
  async getSessionSimilarities(sessionId: string): Promise<SessionSimilarity[]> {
    const result = await this.analyzeAllSessions();
    return result.similarities.filter(
      s => s.session1Id === sessionId || s.session2Id === sessionId
    );
  }

  /**
   * Get insights for a specific session
   */
  getSessionInsights(sessionId: string): CrossSessionInsight[] {
    return Array.from(this.insights.values())
      .filter(i => !i.dismissed && i.affectedSessions.includes(sessionId))
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.timestamp - a.timestamp;
      });
  }

  /**
   * Get all insights
   */
  getAllInsights(): CrossSessionInsight[] {
    return Array.from(this.insights.values())
      .filter(i => !i.dismissed)
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return b.timestamp - a.timestamp;
      });
  }

  /**
   * Dismiss an insight
   */
  dismissInsight(insightId: string): void {
    const insight = this.insights.get(insightId);
    if (insight) {
      insight.dismissed = true;
    }
  }

  /**
   * Get session pattern summary
   */
  async getSessionSummary(sessionId: string): Promise<SessionPatternSummary | null> {
    // Check cache first
    const cached = this.sessionPatternCache.get(sessionId);
    if (cached && Date.now() - cached.lastAnalyzed < this.CACHE_DURATION_MS) {
      return cached;
    }

    // Analyze fresh
    const crossSessionAwareness = getCrossSessionAwareness();
    const session = crossSessionAwareness.getSession(sessionId);
    if (!session) return null;

    const summary = await this.analyzeSession(session);
    this.sessionPatternCache.set(sessionId, summary);
    return summary;
  }

  /**
   * Clear all insights
   */
  clearInsights(): void {
    this.insights.clear();
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalInsights: this.insights.size,
      activeInsights: Array.from(this.insights.values()).filter(i => !i.dismissed).length,
      dismissedInsights: Array.from(this.insights.values()).filter(i => i.dismissed).length,
      cachedSessions: this.sessionPatternCache.size,
      lastAnalysisTime: this.lastAnalysisTime,
    };
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    this.insights.clear();
    this.sessionPatternCache.clear();
    console.log('[CrossSessionAnalyzer] Shutdown complete');
  }
}

// ============================================
// Singleton Instance
// ============================================

let instance: CrossSessionAnalyzer | null = null;

export function getCrossSessionAnalyzer(): CrossSessionAnalyzer {
  if (!instance) {
    instance = new CrossSessionAnalyzer();
  }
  return instance;
}

export function shutdownCrossSessionAnalyzer(): void {
  if (instance) {
    instance.shutdown();
    instance = null;
  }
}

export default CrossSessionAnalyzer;
