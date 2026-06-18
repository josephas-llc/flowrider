/**
 * Token Parser for Claude CLI Output
 *
 * Parses Claude's terminal output to extract token usage and cost information.
 * Works with real Claude CLI output format.
 */

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  model: string;
}

// Claude pricing per 1M tokens (as of 2024)
const PRICING = {
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3.0, output: 15.0 },
  'claude-3.5-haiku': { input: 0.25, output: 1.25 },
  'claude-sonnet-4': { input: 3.0, output: 15.0 },
  'claude-opus-4': { input: 15.0, output: 75.0 },
  'default': { input: 3.0, output: 15.0 },
};

/**
 * Parse token usage from Claude CLI output
 * Claude CLI typically shows token counts in formats like:
 * - "Tokens: 1234 input, 567 output"
 * - "Input tokens: 1234 | Output tokens: 567"
 * - Or in the status bar at bottom
 */
export function parseTokensFromOutput(output: string): TokenUsage | null {
  // Pattern 1: "Tokens: X input, Y output" or similar
  const pattern1 = /(\d+(?:,\d+)*)\s*input.*?(\d+(?:,\d+)*)\s*output/i;

  // Pattern 2: "Input tokens: X" and "Output tokens: Y"
  const pattern2Input = /input\s*tokens?[:\s]+(\d+(?:,\d+)*)/i;
  const pattern2Output = /output\s*tokens?[:\s]+(\d+(?:,\d+)*)/i;

  // Pattern 3: Token count in brackets like "[1234 → 567]"
  const pattern3 = /\[(\d+(?:,\d+)*)\s*[→>]\s*(\d+(?:,\d+)*)\]/;

  // Pattern 4: Cost display like "$0.0123"
  const costPattern = /\$(\d+\.?\d*)/;

  // Pattern 5: Model detection
  const modelPattern = /(claude-[\w.-]+)/i;

  let inputTokens = 0;
  let outputTokens = 0;
  let model = 'default';

  // Try pattern 1
  const match1 = output.match(pattern1);
  if (match1) {
    inputTokens = parseInt(match1[1].replace(/,/g, ''));
    outputTokens = parseInt(match1[2].replace(/,/g, ''));
  }

  // Try pattern 2
  if (inputTokens === 0) {
    const inputMatch = output.match(pattern2Input);
    const outputMatch = output.match(pattern2Output);
    if (inputMatch) inputTokens = parseInt(inputMatch[1].replace(/,/g, ''));
    if (outputMatch) outputTokens = parseInt(outputMatch[1].replace(/,/g, ''));
  }

  // Try pattern 3
  if (inputTokens === 0) {
    const match3 = output.match(pattern3);
    if (match3) {
      inputTokens = parseInt(match3[1].replace(/,/g, ''));
      outputTokens = parseInt(match3[2].replace(/,/g, ''));
    }
  }

  // Detect model
  const modelMatch = output.match(modelPattern);
  if (modelMatch) {
    model = modelMatch[1].toLowerCase();
  }

  if (inputTokens === 0 && outputTokens === 0) {
    return null;
  }

  const totalTokens = inputTokens + outputTokens;
  const estimatedCost = calculateCost(inputTokens, outputTokens, model);

  return {
    inputTokens,
    outputTokens,
    totalTokens,
    estimatedCost,
    model,
  };
}

/**
 * Calculate cost based on token usage
 */
export function calculateCost(
  inputTokens: number,
  outputTokens: number,
  model: string = 'default'
): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING.default;
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

/**
 * Detect activity level from output
 * Useful for determining if a session is actively working
 */
export function detectActivityLevel(output: string): 'idle' | 'thinking' | 'working' | 'complete' {
  const lowerOutput = output.toLowerCase();

  if (lowerOutput.includes('thinking') || lowerOutput.includes('analyzing')) {
    return 'thinking';
  }
  if (lowerOutput.includes('writing') || lowerOutput.includes('editing') || lowerOutput.includes('creating')) {
    return 'working';
  }
  if (lowerOutput.includes('done') || lowerOutput.includes('complete') || lowerOutput.includes('finished')) {
    return 'complete';
  }

  return 'idle';
}

/**
 * Extract the last N lines from output (for preview)
 */
export function getLastLines(output: string, n: number = 5): string {
  const lines = output.split('\n').filter(line => line.trim());
  return lines.slice(-n).join('\n');
}

/**
 * Parse Claude Code status line format
 * Claude Code shows status like: "Session: 1.2K in / 456 out | $0.01"
 */
export function parseClaudeCodeStatus(output: string): TokenUsage | null {
  // Look for the status line pattern
  const statusPattern = /([\d.]+)K?\s*in\s*[|/]\s*([\d.]+)K?\s*out/i;
  const match = output.match(statusPattern);

  if (match) {
    let inputTokens = parseFloat(match[1]);
    let outputTokens = parseFloat(match[2]);

    // Convert K notation
    if (match[0].toLowerCase().includes('k')) {
      if (match[1].includes('.')) {
        inputTokens *= 1000;
      }
      if (match[2].includes('.')) {
        outputTokens *= 1000;
      }
    }

    return {
      inputTokens: Math.round(inputTokens),
      outputTokens: Math.round(outputTokens),
      totalTokens: Math.round(inputTokens + outputTokens),
      estimatedCost: calculateCost(inputTokens, outputTokens),
      model: 'claude-3.5-sonnet',
    };
  }

  return null;
}

/**
 * Aggregate token usage over time
 */
export class TokenAccumulator {
  private history: TokenUsage[] = [];
  private lastParsedOutput: string = '';

  addUsage(usage: TokenUsage): void {
    this.history.push(usage);
  }

  parseAndAdd(output: string): TokenUsage | null {
    // Only parse if output has changed
    if (output === this.lastParsedOutput) {
      return null;
    }
    this.lastParsedOutput = output;

    const usage = parseTokensFromOutput(output) || parseClaudeCodeStatus(output);
    if (usage) {
      this.addUsage(usage);
    }
    return usage;
  }

  getTotals(): TokenUsage {
    return this.history.reduce(
      (acc, usage) => ({
        inputTokens: acc.inputTokens + usage.inputTokens,
        outputTokens: acc.outputTokens + usage.outputTokens,
        totalTokens: acc.totalTokens + usage.totalTokens,
        estimatedCost: acc.estimatedCost + usage.estimatedCost,
        model: usage.model,
      }),
      { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCost: 0, model: 'default' }
    );
  }

  getLatest(): TokenUsage | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  clear(): void {
    this.history = [];
    this.lastParsedOutput = '';
  }
}
