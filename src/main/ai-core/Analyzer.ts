/**
 * Analyzer - Pattern detection and learning engine
 *
 * Analyzes collected interactions to:
 * - Detect recurring patterns (code, errors, workflows)
 * - Build confidence scores based on outcomes
 * - Generate insights from pattern clusters
 * - Learn from user feedback
 */

import { Memory, Pattern, Insight, Interaction, CodeSnippet } from './Memory';
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
 * Detects recurring error patterns and their solutions from terminal output
 */
class ErrorPatternDetector extends PatternDetector {
  type: Pattern['type'] = 'error';

  detect(interactions: Interaction[]): PatternCandidate[] {
    const errorMap = new Map<string, {
      error: string;
      occurrences: number;
      solutions: Map<string, { count: number; successRate: number }>;
      interactionIds: string[];
      errorType: string;
      stackTrace?: string;
    }>();

    // Collect error patterns from both interaction errors and responses
    for (const interaction of interactions) {
      // Parse errors from both errorsCaught and raw response text
      const allErrors = [
        ...interaction.errorsCaught,
        ...this.parseTerminalErrors(interaction.response),
        ...this.parseTerminalErrors(interaction.prompt)
      ];

      for (const error of allErrors) {
        const errorInfo = this.parseErrorStructure(error);
        const normalizedError = this.normalizeError(errorInfo.message);

        const existing = errorMap.get(normalizedError) || {
          error: errorInfo.message,
          occurrences: 0,
          solutions: new Map<string, { count: number; successRate: number }>(),
          interactionIds: [] as string[],
          errorType: errorInfo.type,
          stackTrace: errorInfo.stackTrace,
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
          name: `${data.errorType}: ${data.error.substring(0, 50)}`,
          description: `Recurring ${data.errorType} pattern with ${data.occurrences} occurrences`,
          context: {
            errorTemplate: key,
            originalError: data.error,
            errorType: data.errorType,
            occurrences: data.occurrences,
            solutionSuccessRate: bestSuccessRate,
            stackTrace: data.stackTrace,
          },
          solution: bestSolution,
          interactionIds: data.interactionIds,
        });
      }
    }

    return candidates;
  }

  /**
   * Parse errors from terminal output
   */
  private parseTerminalErrors(text: string): string[] {
    const errors: string[] = [];

    // JavaScript/TypeScript errors
    const jsErrorPatterns = [
      /(?:Error|Exception):\s*(.+?)(?:\n|$)/gi,
      /(?:TypeError|ReferenceError|SyntaxError|RangeError):\s*(.+?)(?:\n|$)/gi,
      /Uncaught\s+(?:\w+)?Error:\s*(.+?)(?:\n|$)/gi,
    ];

    // Python errors
    const pythonErrorPatterns = [
      /(?:Traceback.*?\n)?((?:File|line)\s+"[^"]+".+?(?:Error|Exception):\s*.+?)(?:\n\n|\n$)/gis,
      /(?:NameError|ValueError|TypeError|AttributeError|KeyError|IndexError):\s*(.+?)(?:\n|$)/gi,
    ];

    // Shell/System errors
    const shellErrorPatterns = [
      /(?:bash|sh|zsh):\s*(?:line\s+\d+:)?\s*(.+?)(?:\n|$)/gi,
      /command\s+not\s+found:\s*(.+?)(?:\n|$)/gi,
      /permission\s+denied:\s*(.+?)(?:\n|$)/gi,
      /fatal:\s*(.+?)(?:\n|$)/gi,
    ];

    // Git errors
    const gitErrorPatterns = [
      /fatal:\s*(.+?)(?:\n|$)/gi,
      /error:\s*(.+?)(?:\n|$)/gi,
      /CONFLICT\s*\([^)]+\):\s*(.+?)(?:\n|$)/gi,
    ];

    // NPM/Yarn errors
    const npmErrorPatterns = [
      /npm\s+ERR!\s*(.+?)(?:\n|$)/gi,
      /error\s+An unexpected error occurred:\s*(.+?)(?:\n|$)/gi,
      /ENOENT:\s*(.+?)(?:\n|$)/gi,
    ];

    // Build errors
    const buildErrorPatterns = [
      /error\s+TS\d+:\s*(.+?)(?:\n|$)/gi,
      /ERROR in\s+(.+?)(?:\n|$)/gi,
      /Build failed with\s+\d+\s+errors?:\s*(.+?)(?:\n|$)/gi,
    ];

    // Test failures
    const testErrorPatterns = [
      /FAIL\s+(.+?)(?:\n|$)/gi,
      /Test failed:\s*(.+?)(?:\n|$)/gi,
      /AssertionError:\s*(.+?)(?:\n|$)/gi,
    ];

    const allPatterns = [
      ...jsErrorPatterns,
      ...pythonErrorPatterns,
      ...shellErrorPatterns,
      ...gitErrorPatterns,
      ...npmErrorPatterns,
      ...buildErrorPatterns,
      ...testErrorPatterns,
    ];

    for (const pattern of allPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[1].trim().length > 0) {
          errors.push(match[1].trim());
        }
      }
    }

    return errors;
  }

  /**
   * Parse error structure to extract type, message, and stack trace
   */
  private parseErrorStructure(errorText: string): {
    type: string;
    message: string;
    stackTrace?: string;
  } {
    // Try to extract error type
    const typeMatch = errorText.match(/^([\w]+Error|Exception|FAIL|fatal|CONFLICT|npm ERR!):/i);
    const errorType = typeMatch ? typeMatch[1] : 'Error';

    // Extract stack trace if present
    const stackMatch = errorText.match(/at\s+(?:\w+\s+)?\([^)]+\)|at\s+[^\n]+/g);
    const stackTrace = stackMatch ? stackMatch.join('\n') : undefined;

    // Extract message (first line or up to stack trace)
    let message = errorText;
    if (typeMatch) {
      message = errorText.substring(typeMatch[0].length).trim();
    }
    if (stackTrace) {
      message = message.split(/\n\s*at\s+/)[0].trim();
    }
    message = message.split('\n')[0].trim();

    return {
      type: errorType,
      message: message.substring(0, 500),
      stackTrace,
    };
  }

  private normalizeError(error: string): string {
    return error
      .replace(/\d+/g, 'N')
      .replace(/['"`].*?['"`]/g, 'STR')
      .replace(/0x[a-fA-F0-9]+/g, 'ADDR')
      .replace(/\/[\w\/\-\.]+/g, 'PATH')
      .replace(/\b[a-f0-9]{8,}\b/g, 'HASH')
      .replace(/line\s+\d+/gi, 'line N')
      .replace(/column\s+\d+/gi, 'column N')
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
 * Detects code patterns (common snippets, idioms) from terminal output
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
      patternType: string;
      imports: string[];
    }>();

    for (const interaction of interactions) {
      if (!interaction.codeChanged) continue;

      // Extract code blocks from response and terminal output
      const codeBlocks = [
        ...this.extractCodeBlocks(interaction.response),
        ...this.extractCodeBlocks(interaction.prompt),
        ...this.extractInlineCode(interaction.response),
      ];

      for (const block of codeBlocks) {
        const patternKey = this.generatePatternKey(block.code);
        const patternInfo = this.analyzeCodePattern(block.code, block.language);

        const existing = codePatterns.get(patternKey) || {
          pattern: block.code,
          language: block.language,
          occurrences: 0,
          contexts: [],
          interactionIds: [],
          patternType: patternInfo.type,
          imports: patternInfo.imports,
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
          name: `${data.language} ${data.patternType}: ${this.summarizeCode(data.pattern)}`,
          description: `Common ${data.language} ${data.patternType} pattern used ${data.occurrences} times`,
          context: {
            language: data.language,
            patternKey: key,
            patternType: data.patternType,
            commonUseCase: commonContext,
            occurrences: data.occurrences,
            imports: data.imports,
          },
          solution: data.pattern,
          interactionIds: data.interactionIds,
        });
      }
    }

    return candidates;
  }

  /**
   * Extract markdown code blocks
   */
  private extractCodeBlocks(text: string): { language: string; code: string }[] {
    const blocks: { language: string; code: string }[] = [];
    const regex = /```(\w*)\n([\s\S]*?)```/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const lang = match[1] || this.detectLanguage(match[2]);
      blocks.push({
        language: lang,
        code: match[2].trim(),
      });
    }
    return blocks;
  }

  /**
   * Extract inline code patterns from terminal output
   */
  private extractInlineCode(text: string): { language: string; code: string }[] {
    const blocks: { language: string; code: string }[] = [];

    // Function definitions
    const functionPatterns = [
      // JavaScript/TypeScript
      /((?:export\s+)?(?:async\s+)?function\s+\w+\s*\([^)]*\)\s*\{[^}]{10,200}\})/g,
      /((?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>\s*\{[^}]{10,200}\})/g,
      // Python
      /(def\s+\w+\s*\([^)]*\):\s*\n(?:\s{4}|\t)[^\n]+(?:\n(?:\s{4}|\t)[^\n]+)*)/g,
      // Classes
      /(class\s+\w+(?:\s+extends\s+\w+)?(?:\s+implements\s+\w+)?\s*\{[^}]{10,500}\})/g,
    ];

    // Import/require statements
    const importPatterns = [
      /(import\s+(?:{[^}]+}|\w+)\s+from\s+['"][^'"]+['"])/g,
      /(const\s+(?:{[^}]+}|\w+)\s*=\s*require\(['"][^'"]+['"]\))/g,
      /(from\s+\w+(?:\.\w+)*\s+import\s+(?:\w+|(?:\w+\s*,\s*)*\w+))/g,
    ];

    // Common idioms
    const idiomPatterns = [
      // Promise chains
      /(\w+\s*\.\s*then\([^)]+\)\s*\.\s*catch\([^)]+\))/g,
      // Array methods
      /(\w+\s*\.\s*(?:map|filter|reduce|forEach)\s*\([^)]{10,100}\))/g,
      // React hooks
      /(use(?:State|Effect|Context|Reducer|Callback|Memo)\s*\([^)]+\))/g,
    ];

    const allPatterns = [...functionPatterns, ...importPatterns, ...idiomPatterns];

    for (const pattern of allPatterns) {
      let match;
      while ((match = pattern.exec(text)) !== null) {
        if (match[1] && match[1].length >= 10) {
          blocks.push({
            language: this.detectLanguage(match[1]),
            code: match[1].trim(),
          });
        }
      }
    }

    return blocks;
  }

  /**
   * Detect programming language from code
   */
  private detectLanguage(code: string): string {
    if (/\bdef\s+\w+\s*\(|import\s+\w+|from\s+\w+\s+import/.test(code)) return 'python';
    if (/\bfunction\s+\w+|const\s+\w+\s*=|let\s+\w+|var\s+\w+|import\s+{|require\(/.test(code)) return 'javascript';
    if (/interface\s+\w+|type\s+\w+\s*=|enum\s+\w+/.test(code)) return 'typescript';
    if (/public\s+class|private\s+\w+|@Override/.test(code)) return 'java';
    if (/fn\s+\w+|let\s+mut\s+|impl\s+\w+/.test(code)) return 'rust';
    if (/func\s+\w+|package\s+\w+|import\s+\(/.test(code)) return 'go';
    if (/\bnamespace\s+\w+|using\s+\w+/.test(code)) return 'csharp';
    if (/\bdo\s*\{|\$\w+\s*=/.test(code)) return 'bash';
    return 'unknown';
  }

  /**
   * Analyze code to determine pattern type
   */
  private analyzeCodePattern(code: string, language: string): {
    type: string;
    imports: string[];
  } {
    const imports: string[] = [];

    // Extract imports
    const importMatches = [
      ...code.matchAll(/import\s+(?:{([^}]+)}|(\w+))\s+from\s+['"]([^'"]+)['"]/g),
      ...code.matchAll(/require\(['"]([^'"]+)['"]\)/g),
      ...code.matchAll(/from\s+([\w.]+)\s+import\s+([\w,\s]+)/g),
    ];

    for (const match of importMatches) {
      if (match[3]) imports.push(match[3]);
      if (match[1]) imports.push(match[1]);
    }

    // Determine pattern type
    if (/\b(?:class|interface|type)\s+\w+/.test(code)) return { type: 'type-definition', imports };
    if (/\b(?:function|def|func)\s+\w+/.test(code)) return { type: 'function', imports };
    if (/\b(?:const|let|var)\s+\w+\s*=\s*(?:async\s*)?\(/.test(code)) return { type: 'arrow-function', imports };
    if (/\bimport\s+|require\(|from\s+\w+\s+import/.test(code)) return { type: 'import', imports };
    if (/\bexport\s+(?:default\s+)?(?:class|function|const)/.test(code)) return { type: 'export', imports };
    if (/\.\s*(?:map|filter|reduce|forEach)\s*\(/.test(code)) return { type: 'array-method', imports };
    if (/\.\s*then\s*\(/.test(code)) return { type: 'promise', imports };
    if (/use(?:State|Effect|Context|Reducer|Callback|Memo)\s*\(/.test(code)) return { type: 'react-hook', imports };
    if (/async\s+function|await\s+/.test(code)) return { type: 'async', imports };

    return { type: 'snippet', imports };
  }

  private generatePatternKey(code: string): string {
    // Normalize code to find similar patterns
    const normalized = code
      .replace(/\/\/.*$/gm, '') // Remove single-line comments
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi-line comments
      .replace(/#.*$/gm, '') // Remove Python comments
      .replace(/['"`].*?['"`]/g, 'STR')
      .replace(/\b\d+\b/g, 'N')
      .replace(/\b[a-f0-9]{8,}\b/g, 'HASH')
      .replace(/\s+/g, ' ')
      .trim();

    return crypto.createHash('md5').update(normalized).digest('hex');
  }

  private summarizeCode(code: string): string {
    const lines = code.split('\n').filter(l => l.trim());
    if (lines.length === 0) return 'empty';

    // Try to find a function/class name
    const funcMatch = code.match(/(?:function|def|func|fn)\s+(\w+)/);
    const classMatch = code.match(/(?:class|interface|type)\s+(\w+)/);
    const constMatch = code.match(/(?:const|let|var)\s+(\w+)/);
    const exportMatch = code.match(/export\s+(?:default\s+)?(?:class|function)?\s*(\w+)/);

    if (funcMatch) return funcMatch[1];
    if (classMatch) return classMatch[1];
    if (exportMatch && exportMatch[1]) return exportMatch[1];
    if (constMatch) return constMatch[1];

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
 * Detects workflow patterns (sequences of actions) from terminal commands
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
      commands: string[][];
      occurrences: number;
      successRate: number;
      interactionIds: string[];
      workflowType: string;
    }>();

    // Analyze each session for workflow sequences
    for (const [, group] of sessionGroups) {
      // Sort by timestamp
      const sorted = [...group].sort((a, b) => a.timestamp - b.timestamp);

      // Extract command sequences from terminal output
      const commandSequences = this.extractCommandSequences(sorted);

      // Also extract tag sequences for semantic patterns
      const tagSequence = sorted.map(i => i.tags.join('+') || 'general');

      // Look for repeated command subsequences
      for (const cmdSeq of commandSequences) {
        if (cmdSeq.commands.length >= 2) {
          const workflowType = this.classifyWorkflow(cmdSeq.commands);
          const key = cmdSeq.commands.map(c => c.type).join(' -> ');

          const existing = workflowPatterns.get(key) || {
            sequence: cmdSeq.commands.map(c => c.type),
            commands: [],
            occurrences: 0,
            successRate: 0,
            interactionIds: [],
            workflowType,
          };

          existing.occurrences++;
          existing.commands.push(cmdSeq.commands.map(c => c.command));

          // Calculate success rate
          const successCount = cmdSeq.interactions.filter(int => int.outcome === 'success').length;
          existing.successRate = (existing.successRate * (existing.occurrences - 1) + successCount / cmdSeq.interactions.length) / existing.occurrences;

          existing.interactionIds.push(...cmdSeq.interactions.map(int => int.id));

          workflowPatterns.set(key, existing);
        }
      }

      // Look for tag-based workflow patterns
      for (let windowSize = 2; windowSize <= Math.min(5, tagSequence.length); windowSize++) {
        for (let i = 0; i <= tagSequence.length - windowSize; i++) {
          const subsequence = tagSequence.slice(i, i + windowSize);
          const key = `tag:${subsequence.join(' -> ')}`;

          const existing = workflowPatterns.get(key) || {
            sequence: subsequence,
            commands: [],
            occurrences: 0,
            successRate: 0,
            interactionIds: [],
            workflowType: 'semantic',
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
        const exampleCommands = data.commands.length > 0 ? data.commands[0] : [];
        candidates.push({
          type: 'workflow',
          name: `${data.workflowType} Workflow: ${data.sequence.slice(0, 3).join(' → ')}`,
          description: `Common ${data.workflowType} workflow with ${data.occurrences} occurrences and ${(data.successRate * 100).toFixed(0)}% success rate`,
          context: {
            sequence: data.sequence,
            workflowType: data.workflowType,
            successRate: data.successRate,
            occurrences: data.occurrences,
            exampleCommands,
          },
          interactionIds: [...new Set(data.interactionIds)],
        });
      }
    }

    return candidates;
  }

  /**
   * Extract command sequences from interactions
   */
  private extractCommandSequences(interactions: Interaction[]): Array<{
    commands: Array<{ type: string; command: string }>;
    interactions: Interaction[];
  }> {
    const sequences: Array<{
      commands: Array<{ type: string; command: string }>;
      interactions: Interaction[];
    }> = [];

    let currentSequence: Array<{ type: string; command: string }> = [];
    let currentInteractions: Interaction[] = [];

    for (const interaction of interactions) {
      const commands = this.extractCommands(interaction.prompt + '\n' + interaction.response);

      if (commands.length > 0) {
        currentSequence.push(...commands);
        currentInteractions.push(interaction);
      } else if (currentSequence.length > 0) {
        // End of sequence
        sequences.push({
          commands: [...currentSequence],
          interactions: [...currentInteractions],
        });
        currentSequence = [];
        currentInteractions = [];
      }
    }

    // Don't forget the last sequence
    if (currentSequence.length > 0) {
      sequences.push({
        commands: currentSequence,
        interactions: currentInteractions,
      });
    }

    return sequences;
  }

  /**
   * Extract commands from terminal text
   */
  private extractCommands(text: string): Array<{ type: string; command: string }> {
    const commands: Array<{ type: string; command: string }> = [];

    // Git commands
    const gitPatterns = [
      /(?:^|\n|\$|\>)\s*(git\s+(?:add|commit|push|pull|clone|checkout|branch|merge|rebase|status|diff|log|stash|fetch|reset|rm|mv)(?:\s+[^\n]+)?)/gim,
    ];

    // NPM/Yarn/Package manager commands
    const npmPatterns = [
      /(?:^|\n|\$|\>)\s*((?:npm|yarn|pnpm|bun)\s+(?:install|i|add|remove|run|start|build|test|dev|deploy)(?:\s+[^\n]+)?)/gim,
    ];

    // Test commands
    const testPatterns = [
      /(?:^|\n|\$|\>)\s*((?:npm|yarn|pnpm)\s+(?:test|t)(?:\s+[^\n]+)?)/gim,
      /(?:^|\n|\$|\>)\s*((?:jest|vitest|mocha|pytest|cargo\s+test)(?:\s+[^\n]+)?)/gim,
    ];

    // Build commands
    const buildPatterns = [
      /(?:^|\n|\$|\>)\s*((?:npm|yarn|pnpm)\s+(?:run\s+)?build(?:\s+[^\n]+)?)/gim,
      /(?:^|\n|\$|\>)\s*((?:webpack|vite|rollup|tsc|babel)(?:\s+[^\n]+)?)/gim,
      /(?:^|\n|\$|\>)\s*((?:make|cargo\s+build|go\s+build|mvn\s+package)(?:\s+[^\n]+)?)/gim,
    ];

    // Deploy commands
    const deployPatterns = [
      /(?:^|\n|\$|\>)\s*((?:npm|yarn)\s+run\s+deploy(?:\s+[^\n]+)?)/gim,
      /(?:^|\n|\$|\>)\s*((?:vercel|netlify|heroku|aws|gcloud|docker)(?:\s+[^\n]+)?)/gim,
    ];

    // File/directory commands
    const filePatterns = [
      /(?:^|\n|\$|\>)\s*((?:ls|cd|mkdir|rm|cp|mv|touch|cat|grep|find)(?:\s+[^\n]+)?)/gim,
    ];

    // Code execution
    const execPatterns = [
      /(?:^|\n|\$|\>)\s*((?:node|python|python3|ruby|java|go\s+run)(?:\s+[^\n]+)?)/gim,
    ];

    const patternTypes = [
      { patterns: gitPatterns, type: 'git' },
      { patterns: npmPatterns, type: 'package' },
      { patterns: testPatterns, type: 'test' },
      { patterns: buildPatterns, type: 'build' },
      { patterns: deployPatterns, type: 'deploy' },
      { patterns: filePatterns, type: 'file' },
      { patterns: execPatterns, type: 'exec' },
    ];

    for (const { patterns, type } of patternTypes) {
      for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
          if (match[1]) {
            commands.push({
              type,
              command: match[1].trim(),
            });
          }
        }
      }
    }

    return commands;
  }

  /**
   * Classify workflow type based on command sequence
   */
  private classifyWorkflow(commands: Array<{ type: string; command: string }>): string {
    const types = commands.map(c => c.type);
    const typeSet = new Set(types);

    // Git workflows
    if (typeSet.has('git') && types.filter(t => t === 'git').length >= 2) {
      if (types.includes('test') || types.includes('build')) {
        return 'git-ci';
      }
      return 'git';
    }

    // CI/CD workflows
    if ((typeSet.has('test') && typeSet.has('build')) ||
        (typeSet.has('build') && typeSet.has('deploy'))) {
      return 'ci-cd';
    }

    // Development workflows
    if (typeSet.has('package') && (typeSet.has('exec') || typeSet.has('test'))) {
      return 'development';
    }

    // Testing workflow
    if (types.filter(t => t === 'test').length >= 2) {
      return 'testing';
    }

    // Build workflow
    if (types.filter(t => t === 'build').length >= 1) {
      return 'build';
    }

    // File management
    if (types.filter(t => t === 'file').length >= 2) {
      return 'file-management';
    }

    return 'general';
  }
}

/**
 * Detects prompt patterns (effective ways of asking for things) from terminal
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
      promptStructure: string;
      commonKeywords: string[];
    }>();

    for (const interaction of interactions) {
      const hash = interaction.promptHash;
      const structure = this.analyzePromptStructure(interaction.prompt);
      const existing = promptGroups.get(hash) || {
        template: this.extractTemplate(interaction.prompt),
        interactions: [],
        avgFeedback: 0,
        successRate: 0,
        promptStructure: structure.type,
        commonKeywords: structure.keywords,
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
          name: `${data.promptStructure} Prompt: ${data.template.substring(0, 40)}`,
          description: `Effective ${data.promptStructure} prompt with ${(data.successRate * 100).toFixed(0)}% success rate`,
          context: {
            promptHash: hash,
            template: data.template,
            promptStructure: data.promptStructure,
            successRate: data.successRate,
            avgFeedback: data.avgFeedback,
            occurrences: data.interactions.length,
            commonKeywords: data.commonKeywords,
          },
          interactionIds: data.interactions.map(i => i.id),
        });
      }
    }

    return candidates;
  }

  /**
   * Analyze the structure and intent of a prompt
   */
  private analyzePromptStructure(prompt: string): {
    type: string;
    keywords: string[];
  } {
    const keywords: string[] = [];
    const lower = prompt.toLowerCase();

    // Question patterns
    if (/^(?:how|what|why|when|where|who|which|can|could|would|should|is|are|does|do)\s/i.test(prompt)) {
      keywords.push('question');
    }

    // Command patterns
    if (/^(?:please|can you|could you|would you)\s/i.test(prompt)) {
      keywords.push('polite-request');
    }

    // Imperative patterns
    if (/^(?:make|create|build|fix|update|add|remove|delete|implement|write|generate|refactor|optimize)\s/i.test(prompt)) {
      keywords.push('imperative');
    }

    // Context-providing patterns
    if (/(?:given|assuming|considering|with|using|in the context of)/i.test(prompt)) {
      keywords.push('contextual');
    }

    // Example-providing patterns
    if (/(?:for example|such as|like|e\.g\.|i\.e\.)/i.test(prompt)) {
      keywords.push('example-driven');
    }

    // Constraint patterns
    if (/(?:must|should|need to|have to|required|ensure|make sure)/i.test(prompt)) {
      keywords.push('constrained');
    }

    // Debugging patterns
    if (/(?:error|bug|issue|problem|not working|doesn't work|fails|failing)/i.test(prompt)) {
      keywords.push('debugging');
    }

    // Explanation patterns
    if (/(?:explain|describe|tell me|what does|how does|why does)/i.test(prompt)) {
      keywords.push('explanation');
    }

    // Code-specific patterns
    if (/(?:function|class|method|variable|import|export|type|interface)/i.test(prompt)) {
      keywords.push('code-focused');
    }

    // Multi-step patterns
    if (/(?:first|then|next|finally|after that|step \d+)/i.test(prompt)) {
      keywords.push('multi-step');
    }

    // Determine primary type
    let type = 'general';
    if (keywords.includes('question')) type = 'question';
    else if (keywords.includes('imperative')) type = 'command';
    else if (keywords.includes('debugging')) type = 'debug';
    else if (keywords.includes('explanation')) type = 'explanation';
    else if (keywords.includes('polite-request')) type = 'request';

    return { type, keywords };
  }

  /**
   * Extract a generic template from the prompt for pattern matching
   */
  private extractTemplate(prompt: string): string {
    // Create a generic template from the prompt
    let template = prompt
      .replace(/['"`].*?['"`]/g, '<STRING>')
      .replace(/\b\d+(?:\.\d+)?\b/g, '<NUM>')
      .replace(/\/[\w\/\-\.]+/g, '<PATH>')
      .replace(/\b[a-f0-9]{8,}\b/g, '<HASH>')
      .replace(/\b(?:my|your|our|their)\s+\w+/gi, '<POSSESSIVE>')
      .substring(0, 200);

    // Extract common Claude Code prompt patterns
    template = this.extractClaudePatterns(template);

    return template;
  }

  /**
   * Extract common Claude Code prompt patterns
   */
  private extractClaudePatterns(text: string): string {
    // Common Claude Code patterns
    const patterns = [
      // File operations
      { pattern: /(?:read|open|show|display|view)\s+(?:the\s+)?file\s+<PATH>/gi, replacement: 'Read file <PATH>' },
      { pattern: /(?:edit|modify|change|update)\s+(?:the\s+)?file\s+<PATH>/gi, replacement: 'Edit file <PATH>' },
      { pattern: /(?:create|write|make)\s+(?:a\s+)?(?:new\s+)?file\s+<PATH>/gi, replacement: 'Create file <PATH>' },

      // Code operations
      { pattern: /(?:add|implement|create)\s+(?:a\s+)?(?:new\s+)?(?:function|method|class)\s+\w+/gi, replacement: 'Add <CODE_ELEMENT>' },
      { pattern: /(?:fix|repair|correct)\s+(?:the\s+)?(?:bug|error|issue)/gi, replacement: 'Fix <ERROR>' },
      { pattern: /(?:refactor|improve|optimize)\s+(?:the\s+)?\w+/gi, replacement: 'Refactor <CODE>' },

      // Testing
      { pattern: /(?:write|create|add)\s+(?:a\s+)?test(?:s)?\s+for/gi, replacement: 'Write test for <TARGET>' },
      { pattern: /(?:run|execute)\s+(?:the\s+)?tests?/gi, replacement: 'Run tests' },

      // Documentation
      { pattern: /(?:add|write|create)\s+(?:a\s+)?(?:comment|documentation|doc)/gi, replacement: 'Add documentation' },
      { pattern: /(?:explain|describe)\s+(?:what|how|why)/gi, replacement: 'Explain <TOPIC>' },

      // Search/Find
      { pattern: /(?:find|search|locate|look for)\s+/gi, replacement: 'Find <TARGET>' },
      { pattern: /(?:where|which)\s+(?:is|are)\s+/gi, replacement: 'Locate <TARGET>' },
    ];

    let result = text;
    for (const { pattern, replacement } of patterns) {
      result = result.replace(pattern, replacement);
    }

    return result;
  }
}

// ============================================
// Analyzer Class
// ============================================

export class Analyzer {
  private memory: Memory;
  private detectors: PatternDetector[];
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(memory: Memory) {
    this.memory = memory;
    this.detectors = [
      new ErrorPatternDetector(),
      new CodePatternDetector(),
      new WorkflowPatternDetector(),
      new PromptPatternDetector(),
    ];
    console.log('[Analyzer] Initialized with', this.detectors.length, 'detectors');
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

    console.log('[Analyzer] Starting analysis...');

    // Get recent interactions
    const interactions = this.memory.getRecentInteractions(1000);
    console.log(`[Analyzer] Analyzing ${interactions.length} interactions`);

    const result: AnalysisResult = {
      patternsDetected: 0,
      patternsUpdated: 0,
      insightsGenerated: 0,
      snippetsIndexed: 0,
    };

    // Run each detector
    for (const detector of this.detectors) {
      const candidates = detector.detect(interactions);
      console.log(`[Analyzer] ${detector.type} detector found ${candidates.length} candidates`);

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

    console.log('[Analyzer] Analysis complete:', result);
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

    console.log(`[Analyzer] Generating insights from ${patterns.length} patterns`);

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
        console.error('[Analyzer] Background analysis failed:', err);
      });
    }, intervalMs);

    // Run initial analysis
    this.analyze().catch(console.error);

    console.log(`[Analyzer] Background analysis started (every ${intervalMs / 1000}s)`);
  }

  /**
   * Stop background analysis
   */
  stopBackgroundAnalysis(): void {
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
      console.log('[Analyzer] Background analysis stopped');
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

export default Analyzer;
