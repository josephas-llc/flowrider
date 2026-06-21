/**
 * LeoAnalyzer - Pattern detection and learning engine
 *
 * Analyzes collected interactions to:
 * - Detect recurring patterns (code, errors, workflows)
 * - Build confidence scores based on outcomes
 * - Generate insights from pattern clusters
 * - Learn from user feedback
 */

import { LeoMemory, Pattern, Insight, Interaction, CodeSnippet } from './LeoMemory';
import * as crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface PatternCandidate {
  type: Pattern['type'];
  name: string;
  description: string;
  context: any;
  solution?: string;
  interactionIds: string[];
}

export interface AnalysisResult {
  patternsDetected: number;
  patternsUpdated: number;
  insightsGenerated: number;
  snippetsIndexed: number;
}

export interface ClusterConfig {
  minOccurrences: number;
  confidenceThreshold: number;
  timeWindowMs: number;
}

// ============================================
// Pattern Detectors
// ============================================

abstract class PatternDetector {
  abstract type: Pattern['type'];
  abstract detect(interactions: Interaction[]): PatternCandidate[];
}

/**
 * Detects recurring error patterns and their solutions
 */
class ErrorPatternDetector extends PatternDetector {
  type: Pattern['type'] = 'error';

  detect(interactions: Interaction[]): PatternCandidate[] {
    const errorMap = new Map<string, {
      error: string;
      occurrences: number;
      solutions: Map<string, { count: number; successRate: number }>;
      interactionIds: string[];
    }>();

    // Collect error patterns
    for (const interaction of interactions) {
      for (const error of interaction.errorsCaught) {
        const normalizedError = this.normalizeError(error);
        const existing = errorMap.get(normalizedError) || {
          error,
          occurrences: 0,
          solutions: new Map<string, { count: number; successRate: number }>(),
          interactionIds: [] as string[],
        };

        existing.occurrences++;
        existing.interactionIds.push(interaction.id);

        // If there was a successful resolution, track the solution
        if (interaction.outcome === 'success' && interaction.response) {
          const solutionKey = this.extractSolutionKey(interaction.response);
          const solutionStats = existing.solutions.get(solutionKey) || { count: 0, successRate: 0 };
          solutionStats.count++;
          solutionStats.successRate = (solutionStats.successRate * (solutionStats.count - 1) + 1) / solutionStats.count;
          existing.solutions.set(solutionKey, solutionStats);
        }

        errorMap.set(normalizedError, existing);
      }
    }

    // Convert to pattern candidates
    const candidates: PatternCandidate[] = [];
    for (const [key, data] of errorMap) {
      if (data.occurrences >= 2) {
        // Find best solution
        let bestSolution: string | undefined;
        let bestSuccessRate = 0;
        for (const [solution, stats] of data.solutions) {
          if (stats.successRate > bestSuccessRate) {
            bestSuccessRate = stats.successRate;
            bestSolution = solution;
          }
        }

        candidates.push({
          type: 'error',
          name: `Error: ${data.error.substring(0, 50)}`,
          description: `Recurring error pattern with ${data.occurrences} occurrences`,
          context: {
            errorTemplate: key,
            originalError: data.error,
            occurrences: data.occurrences,
            solutionSuccessRate: bestSuccessRate,
          },
          solution: bestSolution,
          interactionIds: data.interactionIds,
        });
      }
    }

    return candidates;
  }

  private normalizeError(error: string): string {
    return error
      .replace(/\d+/g, 'N')
      .replace(/['"`].*?['"`]/g, 'STR')
      .replace(/0x[a-fA-F0-9]+/g, 'ADDR')
      .replace(/\/[\w\/\-\.]+/g, 'PATH')
      .toLowerCase()
      .trim();
  }

  private extractSolutionKey(response: string): string {
    // Extract the key action from the response
    const codeMatch = response.match(/```[\w]*\n([\s\S]*?)```/);
    if (codeMatch) {
      return crypto.createHash('md5').update(codeMatch[1]).digest('hex').substring(0, 12);
    }
    return crypto.createHash('md5').update(response.substring(0, 500)).digest('hex').substring(0, 12);
  }
}

/**
 * Detects code patterns (common snippets, idioms)
 */
class CodePatternDetector extends PatternDetector {
  type: Pattern['type'] = 'code';

  detect(interactions: Interaction[]): PatternCandidate[] {
    const codePatterns = new Map<string, {
      pattern: string;
      language: string;
      occurrences: number;
      contexts: string[];
      interactionIds: string[];
    }>();

    for (const interaction of interactions) {
      if (!interaction.codeChanged) continue;

      // Extract code blocks from response
      const codeBlocks = this.extractCodeBlocks(interaction.response);

      for (const block of codeBlocks) {
        const patternKey = this.generatePatternKey(block.code);
        const existing = codePatterns.get(patternKey) || {
          pattern: block.code,
          language: block.language,
          occurrences: 0,
          contexts: [],
          interactionIds: [],
        };

        existing.occurrences++;
        existing.interactionIds.push(interaction.id);

        // Track context (what prompts led to this code)
        if (interaction.tags.length > 0) {
          existing.contexts.push(interaction.tags.join(','));
        }

        codePatterns.set(patternKey, existing);
      }
    }

    // Convert to candidates (only patterns that appear multiple times)
    const candidates: PatternCandidate[] = [];
    for (const [key, data] of codePatterns) {
      if (data.occurrences >= 2) {
        const commonContext = this.findCommonContext(data.contexts);
        candidates.push({
          type: 'code',
          name: `${data.language} pattern: ${this.summarizeCode(data.pattern)}`,
          description: `Common ${data.language} code pattern used ${data.occurrences} times`,
          context: {
            language: data.language,
            patternKey: key,
            commonUseCase: commonContext,
            occurrences: data.occurrences,
          },
          solution: data.pattern,
          interactionIds: data.interactionIds,
        });
      }
    }

    return candidates;
  }

  private extractCodeBlocks(text: string): { language: string; code: string }[] {
    const blocks: { language: string; code: string }[] = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      blocks.push({
        language: match[1] || 'unknown',
        code: match[2].trim(),
      });
    }
    return blocks;
  }

  private generatePatternKey(code: string): string {
    // Normalize code to find similar patterns
    const normalized = code
      .replace(/\/\/.*$/gm, '') // Remove comments
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/['"`].*?['"`]/g, 'STR')
      .replace(/\d+/g, 'N')
      .replace(/\s+/g, ' ')
      .trim();

    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  private summarizeCode(code: string): string {
    const lines = code.split('\n').filter(l => l.trim());
    if (lines.length === 0) return 'empty';

    // Try to find a function/class name
    const funcMatch = lines[0].match(/(?:function|def|const|let|var)\s+(\w+)/);
    const classMatch = lines[0].match(/(?:class|interface)\s+(\w+)/);

    if (funcMatch) return funcMatch[1];
    if (classMatch) return classMatch[1];

    return lines[0].substring(0, 40).trim();
  }

  private findCommonContext(contexts: string[]): string {
    if (contexts.length === 0) return 'general';

    // Find most common tag combination
    const counts = new Map<string, number>();
    for (const ctx of contexts) {
      counts.set(ctx, (counts.get(ctx) || 0) + 1);
    }

    let maxCount = 0;
    let mostCommon = 'general';
    for (const [ctx, count] of counts) {
      if (count > maxCount) {
        maxCount = count;
        mostCommon = ctx;
      }
    }

    return mostCommon;
  }
}

/**
 * Detects workflow patterns (sequences of actions)
 */
class WorkflowPatternDetector extends PatternDetector {
  type: Pattern['type'] = 'workflow';

  detect(interactions: Interaction[]): PatternCandidate[] {
    // Group interactions by session and project
    const sessionGroups = new Map<string, Interaction[]>();
    for (const interaction of interactions) {
      const key = `${interaction.sessionId}:${interaction.projectId || 'none'}`;
      const group = sessionGroups.get(key) || [];
      group.push(interaction);
      sessionGroups.set(key, group);
    }

    const workflowPatterns = new Map<string, {
      sequence: string[];
      occurrences: number;
      successRate: number;
      interactionIds: string[];
    }>();

    // Analyze each session for workflow sequences
    for (const [, group] of sessionGroups) {
      // Sort by timestamp
      const sorted = [...group].sort((a, b) => a.timestamp - b.timestamp);

      // Extract tag sequences
      const tagSequence = sorted.map(i => i.tags.join('+') || 'general');

      // Look for repeated subsequences
      for (let windowSize = 2; windowSize <= Math.min(5, tagSequence.length); windowSize++) {
        for (let i = 0; i <= tagSequence.length - windowSize; i++) {
          const subsequence = tagSequence.slice(i, i + windowSize);
          const key = subsequence.join(' -> ');

          const existing = workflowPatterns.get(key) || {
            sequence: subsequence,
            occurrences: 0,
            successRate: 0,
            interactionIds: [],
          };

          existing.occurrences++;

          // Calculate success rate for this workflow
          const relevantInteractions = sorted.slice(i, i + windowSize);
          const successCount = relevantInteractions.filter(int => int.outcome === 'success').length;
          existing.successRate = (existing.successRate * (existing.occurrences - 1) + successCount / windowSize) / existing.occurrences;

          existing.interactionIds.push(...relevantInteractions.map(int => int.id));

          workflowPatterns.set(key, existing);
        }
      }
    }

    // Convert to candidates
    const candidates: PatternCandidate[] = [];
    for (const [key, data] of workflowPatterns) {
      if (data.occurrences >= 3) {
        candidates.push({
          type: 'workflow',
          name: `Workflow: ${data.sequence.slice(0, 3).join(' → ')}`,
          description: `Common workflow sequence with ${data.occurrences} occurrences and ${(data.successRate * 100).toFixed(0)}% success rate`,
          context: {
            sequence: data.sequence,
            successRate: data.successRate,
            occurrences: data.occurrences,
          },
          interactionIds: [...new Set(data.interactionIds)],
        });
      }
    }

    return candidates;
  }
}

/**
 * Detects prompt patterns (effective ways of asking for things)
 */
class PromptPatternDetector extends PatternDetector {
  type: Pattern['type'] = 'prompt';

  detect(interactions: Interaction[]): PatternCandidate[] {
    // Group similar prompts by hash
    const promptGroups = new Map<string, {
      template: string;
      interactions: Interaction[];
      avgFeedback: number;
      successRate: number;
    }>();

    for (const interaction of interactions) {
      const hash = interaction.promptHash;
      const existing = promptGroups.get(hash) || {
        template: this.extractTemplate(interaction.prompt),
        interactions: [],
        avgFeedback: 0,
        successRate: 0,
      };

      existing.interactions.push(interaction);
      promptGroups.set(hash, existing);
    }

    // Calculate metrics and generate candidates
    const candidates: PatternCandidate[] = [];
    for (const [hash, data] of promptGroups) {
      if (data.interactions.length < 2) continue;

      // Calculate success rate
      const successCount = data.interactions.filter(i => i.outcome === 'success').length;
      data.successRate = successCount / data.interactions.length;

      // Calculate average feedback
      const feedbackInteractions = data.interactions.filter(i => i.userFeedback !== null);
      if (feedbackInteractions.length > 0) {
        data.avgFeedback = feedbackInteractions.reduce((sum, i) => sum + (i.userFeedback || 0), 0) / feedbackInteractions.length;
      }

      // Only include patterns with decent success rates
      if (data.successRate >= 0.5) {
        candidates.push({
          type: 'prompt',
          name: `Prompt pattern: ${data.template.substring(0, 40)}`,
          description: `Effective prompt pattern with ${(data.successRate * 100).toFixed(0)}% success rate`,
          context: {
            promptHash: hash,
            template: data.template,
            successRate: data.successRate,
            avgFeedback: data.avgFeedback,
            occurrences: data.interactions.length,
          },
          interactionIds: data.interactions.map(i => i.id),
        });
      }
    }

    return candidates;
  }

  private extractTemplate(prompt: string): string {
    // Create a generic template from the prompt
    return prompt
      .replace(/['"`].*?['"`]/g, '<STRING>')
      .replace(/\d+/g, '<NUM>')
      .replace(/\/[\w\/\-\.]+/g, '<PATH>')
      .substring(0, 200);
  }
}

// ============================================
// LeoAnalyzer Class
// ============================================

export class LeoAnalyzer {
  private memory: LeoMemory;
  private detectors: PatternDetector[];
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(memory: LeoMemory) {
    this.memory = memory;
    this.detectors = [
      new ErrorPatternDetector(),
      new CodePatternDetector(),
      new WorkflowPatternDetector(),
      new PromptPatternDetector(),
    ];
    console.log('[LeoAnalyzer] Initialized with', this.detectors.length, 'detectors');
  }

  // ============================================
  // Analysis Methods
  // ============================================

  /**
   * Run full analysis on recent interactions
   */
  async analyze(config?: Partial<ClusterConfig>): Promise<AnalysisResult> {
    const conf: ClusterConfig = {
      minOccurrences: config?.minOccurrences || 2,
      confidenceThreshold: config?.confidenceThreshold || 0.5,
      timeWindowMs: config?.timeWindowMs || 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    console.log('[LeoAnalyzer] Starting analysis...');

    // Get recent interactions
    const interactions = this.memory.getRecentInteractions(1000);
    console.log(`[LeoAnalyzer] Analyzing ${interactions.length} interactions`);

    const result: AnalysisResult = {
      patternsDetected: 0,
      patternsUpdated: 0,
      insightsGenerated: 0,
      snippetsIndexed: 0,
    };

    // Run each detector
    for (const detector of this.detectors) {
      const candidates = detector.detect(interactions);
      console.log(`[LeoAnalyzer] ${detector.type} detector found ${candidates.length} candidates`);

      for (const candidate of candidates) {
        const processed = this.processPatternCandidate(candidate, conf);
        if (processed.isNew) {
          result.patternsDetected++;
        } else {
          result.patternsUpdated++;
        }
      }
    }

    // Generate insights from patterns
    const insights = await this.generateInsights();
    result.insightsGenerated = insights.length;

    console.log('[LeoAnalyzer] Analysis complete:', result);
    return result;
  }

  /**
   * Process a pattern candidate (create or update pattern)
   */
  private processPatternCandidate(
    candidate: PatternCandidate,
    config: ClusterConfig
  ): { isNew: boolean; patternId: string } {
    // Check if pattern already exists
    const existing = this.memory.findPatternByName(candidate.name);

    if (existing) {
      // Update existing pattern
      const newOccurrences = existing.occurrences + 1;
      const newConfidence = this.calculateConfidence(candidate, newOccurrences);

      // Merge project IDs
      const allProjectIds = new Set([
        ...existing.projectIds,
        ...candidate.interactionIds.map(id => {
          const int = this.memory.getInteraction(id);
          return int?.projectId;
        }).filter((p): p is string => p !== null && p !== undefined),
      ]);

      this.memory.updatePattern(existing.id, {
        occurrences: newOccurrences,
        confidence: newConfidence,
        lastSeen: Date.now(),
        projectIds: [...allProjectIds],
        solution: candidate.solution || existing.solution,
      });

      return { isNew: false, patternId: existing.id };
    } else {
      // Create new pattern
      const confidence = this.calculateConfidence(candidate, candidate.interactionIds.length);

      if (confidence >= config.confidenceThreshold) {
        const projectIds = candidate.interactionIds
          .map(id => {
            const int = this.memory.getInteraction(id);
            return int?.projectId;
          })
          .filter((p): p is string => p !== null && p !== undefined);

        const patternId = this.memory.savePattern({
          type: candidate.type,
          name: candidate.name,
          description: candidate.description,
          confidence,
          occurrences: candidate.interactionIds.length,
          lastSeen: Date.now(),
          context: JSON.stringify(candidate.context),
          solution: candidate.solution || null,
          projectIds: [...new Set(projectIds)],
        });

        return { isNew: true, patternId };
      }

      return { isNew: false, patternId: '' };
    }
  }

  /**
   * Calculate confidence score for a pattern
   */
  private calculateConfidence(candidate: PatternCandidate, occurrences: number): number {
    // Base confidence from occurrences (logarithmic scale)
    let confidence = Math.min(0.9, 0.3 + Math.log10(occurrences) * 0.3);

    // Boost for patterns with solutions
    if (candidate.solution) {
      confidence += 0.1;
    }

    // Boost based on context richness
    if (candidate.context) {
      const contextKeys = Object.keys(candidate.context);
      confidence += Math.min(0.1, contextKeys.length * 0.02);
    }

    return Math.min(0.99, confidence);
  }

  // ============================================
  // Insight Generation
  // ============================================

  /**
   * Generate insights from detected patterns
   */
  private async generateInsights(): Promise<Insight[]> {
    const insights: Insight[] = [];
    const patterns = this.memory.getHighConfidencePatterns(0.6);

    console.log(`[LeoAnalyzer] Generating insights from ${patterns.length} patterns`);

    // Group patterns by type for cross-pattern insights
    const patternsByType = new Map<string, Pattern[]>();
    for (const pattern of patterns) {
      const group = patternsByType.get(pattern.type) || [];
      group.push(pattern);
      patternsByType.set(pattern.type, group);
    }

    // Generate insights for error patterns
    const errorPatterns = patternsByType.get('error') || [];
    for (const pattern of errorPatterns) {
      if (pattern.solution) {
        const context = JSON.parse(pattern.context || '{}');
        const insightId = this.memory.saveInsight({
          type: 'learned',
          category: 'error-resolution',
          content: `When encountering "${context.errorTemplate || 'this error'}": ${pattern.solution}`,
          confidence: pattern.confidence,
          sourcePatternIds: [pattern.id],
          sourceInteractionIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          useCount: 0,
          effectiveness: pattern.confidence,
        });
        insights.push(this.memory.getInsightsByCategory('error-resolution').find(i => i.id === insightId)!);
      }
    }

    // Generate insights for workflow patterns
    const workflowPatterns = patternsByType.get('workflow') || [];
    for (const pattern of workflowPatterns) {
      const context = JSON.parse(pattern.context || '{}');
      if (context.successRate > 0.7 && context.sequence) {
        const insightId = this.memory.saveInsight({
          type: 'inferred',
          category: 'workflow-optimization',
          content: `Effective workflow: ${context.sequence.join(' → ')} (${(context.successRate * 100).toFixed(0)}% success rate)`,
          confidence: pattern.confidence * context.successRate,
          sourcePatternIds: [pattern.id],
          sourceInteractionIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          useCount: 0,
          effectiveness: context.successRate,
        });
        insights.push(this.memory.getInsightsByCategory('workflow-optimization').find(i => i.id === insightId)!);
      }
    }

    // Generate insights for prompt patterns
    const promptPatterns = patternsByType.get('prompt') || [];
    for (const pattern of promptPatterns) {
      const context = JSON.parse(pattern.context || '{}');
      if (context.successRate > 0.8 && context.template) {
        const insightId = this.memory.saveInsight({
          type: 'distilled',
          category: 'prompt-technique',
          content: `Effective prompt structure: ${context.template.substring(0, 100)}`,
          confidence: pattern.confidence,
          sourcePatternIds: [pattern.id],
          sourceInteractionIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          useCount: 0,
          effectiveness: context.successRate,
        });
        insights.push(this.memory.getInsightsByCategory('prompt-technique').find(i => i.id === insightId)!);
      }
    }

    // Cross-pattern insights (combinations that work well together)
    insights.push(...this.generateCrossPatternInsights(patterns));

    return insights.filter(i => i !== undefined);
  }

  /**
   * Find relationships between different patterns
   */
  private generateCrossPatternInsights(patterns: Pattern[]): Insight[] {
    const insights: Insight[] = [];

    // Find patterns that often co-occur in the same projects
    const projectPatterns = new Map<string, Pattern[]>();
    for (const pattern of patterns) {
      for (const projectId of pattern.projectIds) {
        const group = projectPatterns.get(projectId) || [];
        group.push(pattern);
        projectPatterns.set(projectId, group);
      }
    }

    // Look for common pattern combinations
    for (const [projectId, projectPats] of projectPatterns) {
      if (projectPats.length >= 3) {
        const types = [...new Set(projectPats.map(p => p.type))];
        if (types.length >= 2) {
          const insightId = this.memory.saveInsight({
            type: 'inferred',
            category: 'project-pattern',
            content: `Project ${projectId.substring(0, 8)} uses a combination of ${types.join(', ')} patterns effectively`,
            confidence: 0.6,
            sourcePatternIds: projectPats.map(p => p.id),
            sourceInteractionIds: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
            useCount: 0,
            effectiveness: 0.6,
          });
          insights.push(this.memory.getInsightsByCategory('project-pattern').find(i => i.id === insightId)!);
        }
      }
    }

    return insights.filter(i => i !== undefined);
  }

  // ============================================
  // Background Analysis
  // ============================================

  /**
   * Start background analysis (runs periodically)
   */
  startBackgroundAnalysis(intervalMs: number = 5 * 60 * 1000): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    this.analysisInterval = setInterval(() => {
      this.analyze().catch(err => {
        console.error('[LeoAnalyzer] Background analysis failed:', err);
      });
    }, intervalMs);

    // Run initial analysis
    this.analyze().catch(console.error);

    console.log(`[LeoAnalyzer] Background analysis started (every ${intervalMs / 1000}s)`);
  }

  /**
   * Stop background analysis
   */
  stopBackgroundAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
      console.log('[LeoAnalyzer] Background analysis stopped');
    }
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get patterns relevant to a given context
   */
  getRelevantPatterns(context: {
    prompt?: string;
    errors?: string[];
    tags?: string[];
    projectId?: string;
  }): Pattern[] {
    const allPatterns = this.memory.getHighConfidencePatterns(0.5);
    const relevant: { pattern: Pattern; score: number }[] = [];

    for (const pattern of allPatterns) {
      let score = pattern.confidence;
      const patternContext = JSON.parse(pattern.context || '{}');

      // Boost score for project match
      if (context.projectId && pattern.projectIds.includes(context.projectId)) {
        score += 0.2;
      }

      // Boost for error match
      if (context.errors && pattern.type === 'error') {
        for (const error of context.errors) {
          if (patternContext.errorTemplate && error.toLowerCase().includes(patternContext.errorTemplate.substring(0, 20).toLowerCase())) {
            score += 0.3;
          }
        }
      }

      // Boost for tag match
      if (context.tags) {
        for (const tag of context.tags) {
          if (pattern.name.toLowerCase().includes(tag.toLowerCase()) ||
              pattern.description.toLowerCase().includes(tag.toLowerCase())) {
            score += 0.1;
          }
        }
      }

      if (score > pattern.confidence) {
        relevant.push({ pattern, score });
      }
    }

    // Sort by score and return patterns
    return relevant
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => r.pattern);
  }
}

export default LeoAnalyzer;
