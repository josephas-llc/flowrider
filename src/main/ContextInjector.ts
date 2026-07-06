/**
 * ContextInjector - Prepends AI System learned context to prompts
 *
 * This is the "APPLY" step of the learning loop:
 * OBSERVE → ANALYZE → LEARN → APPLY
 *
 * When a user sends a prompt to Claude Code, we can optionally
 * prepend relevant context that AI System has learned from past
 * interactions.
 */

import { getAICore } from './ai-core';

export interface ContextInjectionConfig {
  enabled: boolean;
  maxTokens: number;  // Max tokens for injected context
  includePatterns: boolean;
  includeSnippets: boolean;
  includeWarnings: boolean;
}

const DEFAULT_CONFIG: ContextInjectionConfig = {
  enabled: true,
  maxTokens: 500,
  includePatterns: true,
  includeSnippets: true,
  includeWarnings: true,
};

export class ContextInjector {
  private config: ContextInjectionConfig;

  constructor(config: Partial<ContextInjectionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get context to prepend to a prompt
   */
  getContextForPrompt(options: {
    prompt: string;
    projectId?: string;
    language?: string;
    sessionId?: string;
  }): string | null {
    if (!this.config.enabled) return null;

    const aiCore = getAICore();
    if (!aiCore.getStatus().enabled) return null;

    try {
      // Get distilled context from AI System
      const context = aiCore.getContext({
        prompt: options.prompt,
        projectId: options.projectId,
        language: options.language,
      });

      // Build the context string
      const parts: string[] = [];

      // Add warnings first (most important)
      if (this.config.includeWarnings && context.warnings.length > 0) {
        parts.push('⚠️ WARNINGS FROM PAST EXPERIENCE:');
        context.warnings.slice(0, 3).forEach(w => {
          parts.push(`  - ${w.message}`);
        });
      }

      // Add success patterns
      if (context.successPatterns.length > 0) {
        parts.push('✓ SUCCESS PATTERNS:');
        context.successPatterns.slice(0, 3).forEach(p => {
          parts.push(`  - ${p.description}`);
        });
      }

      // Add relevant snippets
      if (this.config.includeSnippets && context.relevantSnippets.length > 0) {
        parts.push('📝 RELEVANT CODE SNIPPETS:');
        context.relevantSnippets.slice(0, 2).forEach(s => {
          parts.push(`  [${s.language}] ${s.purpose}`);
          // Don't include full code to save tokens
        });
      }

      if (parts.length === 0) return null;

      // Format as a comment block that won't interfere with the actual prompt
      const contextBlock = [
        '<!-- AI System Context (learned from past sessions) -->',
        ...parts,
        '<!-- End AI System Context -->',
        '',
      ].join('\n');

      // Check token estimate
      const estimatedTokens = Math.ceil(contextBlock.length / 4);
      if (estimatedTokens > this.config.maxTokens) {
        // Truncate if too long
        return this.truncateContext(contextBlock, this.config.maxTokens);
      }

      return contextBlock;

    } catch (err) {
      console.error('[ContextInjector] Error getting context:', err);
      return null;
    }
  }

  /**
   * Get quick context for error recovery
   */
  getErrorContext(errors: string[], language?: string): string | null {
    if (!this.config.enabled) return null;

    const aiCore = getAICore();
    if (!aiCore.getStatus().enabled) return null;

    try {
      const context = aiCore.getErrorContext(errors, language);
      if (!context || context === 'No relevant error patterns found.') {
        return null;
      }

      return [
        '<!-- AI System Error Context -->',
        context,
        '<!-- End AI System Error Context -->',
        '',
      ].join('\n');

    } catch (err) {
      console.error('[ContextInjector] Error getting error context:', err);
      return null;
    }
  }

  /**
   * Truncate context to fit within token limit
   */
  private truncateContext(context: string, maxTokens: number): string {
    const maxChars = maxTokens * 4;
    if (context.length <= maxChars) return context;

    // Truncate and add closing
    const truncated = context.slice(0, maxChars - 50);
    const lastNewline = truncated.lastIndexOf('\n');
    return truncated.slice(0, lastNewline) + '\n<!-- ... truncated -->\n';
  }

  /**
   * Update configuration
   */
  setConfig(config: Partial<ContextInjectionConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): ContextInjectionConfig {
    return { ...this.config };
  }

  /**
   * Enable context injection
   */
  enable(): void {
    this.config.enabled = true;
  }

  /**
   * Disable context injection
   */
  disable(): void {
    this.config.enabled = false;
  }
}

// Singleton instance
let instance: ContextInjector | null = null;

export function getContextInjector(): ContextInjector {
  if (!instance) {
    instance = new ContextInjector();
  }
  return instance;
}
