/**
 * LeoDistiller - Converts learnings into actionable context
 *
 * The heart of LEO AI's self-improvement capability.
 * Takes patterns, insights, and learnings and distills them into:
 * - System prompt enhancements
 * - Context injections for new sessions
 * - Proactive suggestions
 * - Error prevention hints
 */

import { LeoMemory, Pattern, Insight, CodeSnippet, LeoStats } from './LeoMemory';
import { LeoAnalyzer } from './LeoAnalyzer';

// ============================================
// Types
// ============================================

export interface DistilledContext {
  // System-level context to prepend to prompts
  systemContext: string;

  // Specific knowledge chunks for RAG-style injection
  knowledgeChunks: KnowledgeChunk[];

  // Proactive warnings based on past failures
  warnings: Warning[];

  // Relevant code snippets that might help
  relevantSnippets: RelevantSnippet[];

  // Success patterns that apply
  successPatterns: SuccessPattern[];

  // Metadata
  meta: {
    totalPatternsUsed: number;
    totalInsightsUsed: number;
    confidenceScore: number;
    timestamp: number;
  };
}

export interface KnowledgeChunk {
  type: 'insight' | 'pattern' | 'example';
  category: string;
  content: string;
  relevanceScore: number;
  sourceId: string;
}

export interface Warning {
  type: 'error-prone' | 'complexity' | 'performance' | 'security';
  message: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface RelevantSnippet {
  language: string;
  purpose: string;
  code: string;
  successRate: number;
  relevanceScore: number;
}

export interface SuccessPattern {
  name: string;
  description: string;
  approach: string;
  confidence: number;
}

export interface DistillationRequest {
  // Current context
  prompt?: string;
  currentFile?: string;
  language?: string;
  projectId?: string;
  tags?: string[];
  errors?: string[];

  // Distillation preferences
  maxChunks?: number;
  includeSnippets?: boolean;
  includeWarnings?: boolean;
  verbosity?: 'minimal' | 'normal' | 'detailed';
}

// ============================================
// LeoDistiller Class
// ============================================

export class LeoDistiller {
  private memory: LeoMemory;
  private analyzer: LeoAnalyzer;

  constructor(memory: LeoMemory, analyzer: LeoAnalyzer) {
    this.memory = memory;
    this.analyzer = analyzer;
    console.log('[LeoDistiller] Initialized');
  }

  // ============================================
  // Main Distillation
  // ============================================

  /**
   * Distill learned knowledge into actionable context
   */
  distill(request: DistillationRequest = {}): DistilledContext {
    const startTime = Date.now();
    console.log('[LeoDistiller] Starting distillation...');

    const maxChunks = request.maxChunks || 10;
    const verbosity = request.verbosity || 'normal';

    // Gather relevant patterns
    const relevantPatterns = this.analyzer.getRelevantPatterns({
      prompt: request.prompt,
      errors: request.errors,
      tags: request.tags,
      projectId: request.projectId,
    });

    // Gather insights
    const insights = this.gatherRelevantInsights(request);

    // Build knowledge chunks
    const knowledgeChunks = this.buildKnowledgeChunks(
      relevantPatterns,
      insights,
      maxChunks,
      request
    );

    // Build warnings from error patterns
    const warnings = request.includeWarnings !== false
      ? this.buildWarnings(relevantPatterns, request)
      : [];

    // Get relevant code snippets
    const relevantSnippets = request.includeSnippets !== false
      ? this.getRelevantSnippets(request)
      : [];

    // Extract success patterns
    const successPatterns = this.extractSuccessPatterns(relevantPatterns);

    // Build system context
    const systemContext = this.buildSystemContext(
      knowledgeChunks,
      warnings,
      successPatterns,
      verbosity
    );

    // Calculate overall confidence
    const confidenceScore = this.calculateConfidence(
      relevantPatterns,
      insights,
      knowledgeChunks
    );

    console.log(`[LeoDistiller] Distillation complete in ${Date.now() - startTime}ms`);
    console.log(`[LeoDistiller] Generated ${knowledgeChunks.length} chunks, ${warnings.length} warnings`);

    return {
      systemContext,
      knowledgeChunks,
      warnings,
      relevantSnippets,
      successPatterns,
      meta: {
        totalPatternsUsed: relevantPatterns.length,
        totalInsightsUsed: insights.length,
        confidenceScore,
        timestamp: Date.now(),
      },
    };
  }

  // ============================================
  // Knowledge Gathering
  // ============================================

  private gatherRelevantInsights(request: DistillationRequest): Insight[] {
    const allInsights: Insight[] = [];

    // Get most effective insights
    const effective = this.memory.getMostEffectiveInsights(20);
    allInsights.push(...effective);

    // Get category-specific insights
    if (request.tags) {
      for (const tag of request.tags) {
        const categoryInsights = this.memory.getInsightsByCategory(tag);
        allInsights.push(...categoryInsights.slice(0, 5));
      }
    }

    // Deduplicate by ID
    const seen = new Set<string>();
    return allInsights.filter(insight => {
      if (seen.has(insight.id)) return false;
      seen.add(insight.id);
      return true;
    });
  }

  private buildKnowledgeChunks(
    patterns: Pattern[],
    insights: Insight[],
    maxChunks: number,
    request: DistillationRequest
  ): KnowledgeChunk[] {
    const chunks: KnowledgeChunk[] = [];

    // Add insight-based chunks
    for (const insight of insights) {
      const relevance = this.calculateInsightRelevance(insight, request);
      if (relevance > 0.3) {
        chunks.push({
          type: 'insight',
          category: insight.category,
          content: insight.content,
          relevanceScore: relevance,
          sourceId: insight.id,
        });
      }
    }

    // Add pattern-based chunks
    for (const pattern of patterns) {
      if (pattern.solution) {
        const context = JSON.parse(pattern.context || '{}');
        chunks.push({
          type: 'pattern',
          category: pattern.type,
          content: this.formatPatternAsKnowledge(pattern),
          relevanceScore: pattern.confidence,
          sourceId: pattern.id,
        });
      }
    }

    // Sort by relevance and truncate
    chunks.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return chunks.slice(0, maxChunks);
  }

  private calculateInsightRelevance(insight: Insight, request: DistillationRequest): number {
    let score = insight.effectiveness;

    // Boost for category match
    if (request.tags) {
      for (const tag of request.tags) {
        if (insight.category.toLowerCase().includes(tag.toLowerCase())) {
          score += 0.2;
        }
      }
    }

    // Boost for error-related insights when errors present
    if (request.errors && request.errors.length > 0) {
      if (insight.category === 'error-resolution') {
        score += 0.3;
      }
    }

    // Boost for recent use
    const daysSinceUpdate = (Date.now() - insight.updatedAt) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate < 7) {
      score += 0.1;
    }

    return Math.min(1, score);
  }

  private formatPatternAsKnowledge(pattern: Pattern): string {
    const context = JSON.parse(pattern.context || '{}');

    switch (pattern.type) {
      case 'error':
        return `Error handling: When you see "${context.errorTemplate || 'this error'}", the solution is: ${pattern.solution}`;

      case 'code':
        return `Code pattern (${context.language || 'code'}): For ${context.commonUseCase || 'this use case'}, use: ${pattern.solution?.substring(0, 200)}...`;

      case 'workflow':
        return `Workflow tip: The sequence ${context.sequence?.join(' → ') || pattern.name} has a ${((context.successRate || 0) * 100).toFixed(0)}% success rate.`;

      case 'prompt':
        return `Effective prompting: Structure like "${context.template?.substring(0, 100)}..." achieves ${((context.successRate || 0) * 100).toFixed(0)}% success.`;

      default:
        return `${pattern.name}: ${pattern.description}`;
    }
  }

  // ============================================
  // Warning Generation
  // ============================================

  private buildWarnings(patterns: Pattern[], request: DistillationRequest): Warning[] {
    const warnings: Warning[] = [];

    // Check for error-prone patterns
    const errorPatterns = patterns.filter(p => p.type === 'error');
    for (const pattern of errorPatterns.slice(0, 3)) {
      const context = JSON.parse(pattern.context || '{}');
      if (context.occurrences > 3) {
        warnings.push({
          type: 'error-prone',
          message: `Watch out for: ${context.originalError?.substring(0, 50) || pattern.name}`,
          severity: context.occurrences > 10 ? 'high' : 'medium',
          suggestion: pattern.solution || undefined,
        });
      }
    }

    // Add language-specific warnings
    if (request.language) {
      const langWarnings = this.getLanguageSpecificWarnings(request.language, patterns);
      warnings.push(...langWarnings);
    }

    // Check for complexity warnings based on prompt
    if (request.prompt && request.prompt.length > 500) {
      warnings.push({
        type: 'complexity',
        message: 'Complex request detected. Consider breaking down into smaller tasks.',
        severity: 'low',
      });
    }

    return warnings;
  }

  private getLanguageSpecificWarnings(language: string, patterns: Pattern[]): Warning[] {
    const warnings: Warning[] = [];

    // Look for language-specific error patterns
    const langPatterns = patterns.filter(p => {
      const ctx = JSON.parse(p.context || '{}');
      return ctx.language === language;
    });

    if (langPatterns.length > 0) {
      const highOccurrence = langPatterns.filter(p => p.occurrences > 5);
      if (highOccurrence.length > 0) {
        warnings.push({
          type: 'error-prone',
          message: `Common ${language} issues detected in your projects. Review past solutions.`,
          severity: 'low',
        });
      }
    }

    return warnings;
  }

  // ============================================
  // Code Snippet Retrieval
  // ============================================

  private getRelevantSnippets(request: DistillationRequest): RelevantSnippet[] {
    const snippets: RelevantSnippet[] = [];

    if (request.language) {
      const langSnippets = this.memory.getSnippetsByLanguage(request.language);
      for (const snippet of langSnippets.slice(0, 5)) {
        snippets.push({
          language: snippet.language,
          purpose: snippet.purpose,
          code: snippet.code,
          successRate: snippet.successRate,
          relevanceScore: this.calculateSnippetRelevance(snippet, request),
        });
      }
    }

    // Search by prompt keywords
    if (request.prompt) {
      const keywords = this.extractKeywords(request.prompt);
      for (const keyword of keywords.slice(0, 3)) {
        const searchResults = this.memory.searchSnippets(keyword);
        for (const snippet of searchResults.slice(0, 2)) {
          if (!snippets.find(s => s.code === snippet.code)) {
            snippets.push({
              language: snippet.language,
              purpose: snippet.purpose,
              code: snippet.code,
              successRate: snippet.successRate,
              relevanceScore: this.calculateSnippetRelevance(snippet, request),
            });
          }
        }
      }
    }

    // Sort by relevance
    snippets.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return snippets.slice(0, 5);
  }

  private calculateSnippetRelevance(snippet: CodeSnippet, request: DistillationRequest): number {
    let score = snippet.successRate;

    // Language match boost
    if (request.language && snippet.language === request.language) {
      score += 0.2;
    }

    // Project match boost
    if (request.projectId && snippet.projectId === request.projectId) {
      score += 0.3;
    }

    // Tag match boost
    if (request.tags) {
      for (const tag of request.tags) {
        if (snippet.tags.includes(tag)) {
          score += 0.1;
        }
      }
    }

    return Math.min(1, score);
  }

  private extractKeywords(text: string): string[] {
    // Simple keyword extraction
    const stopWords = new Set(['the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
      'must', 'can', 'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
      'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under', 'again',
      'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'each',
      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same',
      'so', 'than', 'too', 'very', 's', 't', 'just', 'don', 'now', 'and', 'but', 'if', 'or',
      'because', 'until', 'while', 'it', 'this', 'that', 'these', 'those', 'i', 'me', 'my',
      'we', 'our', 'you', 'your', 'he', 'him', 'his', 'she', 'her', 'they', 'them', 'their']);

    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Count occurrences
    const counts = new Map<string, number>();
    for (const word of words) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }

    // Sort by frequency
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  // ============================================
  // Success Pattern Extraction
  // ============================================

  private extractSuccessPatterns(patterns: Pattern[]): SuccessPattern[] {
    const successPatterns: SuccessPattern[] = [];

    for (const pattern of patterns) {
      if (pattern.confidence >= 0.7 && pattern.solution) {
        const context = JSON.parse(pattern.context || '{}');

        successPatterns.push({
          name: pattern.name,
          description: pattern.description,
          approach: pattern.solution.substring(0, 300),
          confidence: pattern.confidence,
        });
      }
    }

    return successPatterns.slice(0, 5);
  }

  // ============================================
  // System Context Building
  // ============================================

  private buildSystemContext(
    chunks: KnowledgeChunk[],
    warnings: Warning[],
    successPatterns: SuccessPattern[],
    verbosity: 'minimal' | 'normal' | 'detailed'
  ): string {
    const sections: string[] = [];

    // Header
    sections.push('# LEO AI Context\n');
    sections.push('I have learned from previous sessions. Here is relevant knowledge:\n');

    // Warnings (always first)
    if (warnings.length > 0) {
      sections.push('## Warnings');
      for (const warning of warnings) {
        const severity = warning.severity === 'high' ? '⚠️' : warning.severity === 'medium' ? '⚡' : '💡';
        sections.push(`${severity} ${warning.message}`);
        if (warning.suggestion && verbosity !== 'minimal') {
          sections.push(`   Solution: ${warning.suggestion.substring(0, 100)}`);
        }
      }
      sections.push('');
    }

    // Knowledge chunks
    if (chunks.length > 0 && verbosity !== 'minimal') {
      sections.push('## Relevant Knowledge');
      const chunkLimit = verbosity === 'detailed' ? chunks.length : Math.min(5, chunks.length);
      for (const chunk of chunks.slice(0, chunkLimit)) {
        sections.push(`- [${chunk.category}] ${chunk.content}`);
      }
      sections.push('');
    }

    // Success patterns
    if (successPatterns.length > 0 && verbosity === 'detailed') {
      sections.push('## Proven Approaches');
      for (const pattern of successPatterns) {
        sections.push(`- ${pattern.name}: ${pattern.approach.substring(0, 150)}`);
      }
      sections.push('');
    }

    // Footer
    if (verbosity !== 'minimal') {
      sections.push('---');
      sections.push('Use this context to provide better assistance. Learn from past successes and avoid past failures.\n');
    }

    return sections.join('\n');
  }

  // ============================================
  // Confidence Calculation
  // ============================================

  private calculateConfidence(
    patterns: Pattern[],
    insights: Insight[],
    chunks: KnowledgeChunk[]
  ): number {
    if (patterns.length === 0 && insights.length === 0) {
      return 0.1; // Very low confidence without data
    }

    // Average pattern confidence
    const patternConfidence = patterns.length > 0
      ? patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length
      : 0;

    // Average insight effectiveness
    const insightEffectiveness = insights.length > 0
      ? insights.reduce((sum, i) => sum + i.effectiveness, 0) / insights.length
      : 0;

    // Chunk relevance
    const chunkRelevance = chunks.length > 0
      ? chunks.reduce((sum, c) => sum + c.relevanceScore, 0) / chunks.length
      : 0;

    // Weighted average
    return (patternConfidence * 0.4 + insightEffectiveness * 0.4 + chunkRelevance * 0.2);
  }

  // ============================================
  // Quick Methods for Common Use Cases
  // ============================================

  /**
   * Get a quick context injection for a session
   */
  getQuickContext(projectId?: string, language?: string): string {
    const distilled = this.distill({
      projectId,
      language,
      maxChunks: 5,
      includeSnippets: false,
      verbosity: 'minimal',
    });

    return distilled.systemContext;
  }

  /**
   * Get error-specific context
   */
  getErrorContext(errors: string[], language?: string): string {
    const distilled = this.distill({
      errors,
      language,
      maxChunks: 3,
      includeWarnings: true,
      verbosity: 'normal',
    });

    return distilled.systemContext;
  }

  /**
   * Get statistics about learned knowledge
   */
  getKnowledgeStats(): LeoStats & { insightBreakdown: { [category: string]: number } } {
    const stats = this.memory.getStats();

    // Get insight breakdown by category
    const insightBreakdown: { [category: string]: number } = {};
    for (const cat of stats.topCategories) {
      insightBreakdown[cat.category] = cat.count;
    }

    return {
      ...stats,
      insightBreakdown,
    };
  }
}

export default LeoDistiller;
