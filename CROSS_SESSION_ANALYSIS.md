# Cross-Session Analysis System

The Cross-Session Analysis System enables ZOIX to find similarities and patterns across different terminal sessions, providing actionable insights to improve productivity.

## Features

### 1. Session Pattern Analysis
Analyzes each session to understand:
- Top patterns used (code, errors, workflows, prompts)
- Dominant workflow sequences
- Programming languages used
- Error types encountered
- Activity level (low, medium, high)

### 2. Cross-Session Similarities
Compares sessions to find:
- **Shared patterns**: Same coding patterns, error types, or workflows
- **Shared workflows**: Similar sequences of actions
- **Code reuse opportunities**: Similar code implementations
- **Error solutions**: Solutions from one session applicable to another

### 3. Actionable Insights
Generates smart insights including:
- **Pattern Similarity**: High similarity between sessions
- **Workflow Match**: Common workflows across multiple sessions
- **Code Reuse**: Opportunities to reuse code between sessions
- **Error Solutions**: Available solutions for current errors
- **Collaboration**: Potential coordination opportunities

## Architecture

### Components

1. **CrossSessionAnalyzer** (`/src/main/CrossSessionAnalyzer.ts`)
   - Main analysis engine
   - Compares sessions and detects patterns
   - Generates insights

2. **CrossSessionAwareness** (`/src/main/CrossSessionAwareness.ts`)
   - Real-time session activity tracking
   - File conflict detection
   - Cross-session suggestions

3. **AI Core** (`/src/main/ai-core/`)
   - Pattern detection and learning
   - Interaction storage and retrieval
   - Code snippet indexing

### Data Flow

```
Terminal Sessions
    ↓
SessionMonitor (captures interactions)
    ↓
AI Core (stores & analyzes)
    ↓
CrossSessionAnalyzer (compares sessions)
    ↓
Insights & Recommendations
    ↓
Frontend UI
```

## API Reference

### IPC Handlers

All handlers return `{ success: boolean, data?: T, error?: string }`

#### Analysis

```typescript
// Run full cross-session analysis
await window.api.crossSession.analyze()
// Returns: CrossSessionAnalysisResult

// Get similarities for a specific session
await window.api.crossSession.getSimilarities(sessionId)
// Returns: SessionSimilarity[]

// Get session pattern summary
await window.api.crossSession.getSessionSummary(sessionId)
// Returns: SessionPatternSummary
```

#### Insights

```typescript
// Get all insights
await window.api.crossSession.getInsights()
// Returns: CrossSessionInsight[]

// Get insights for specific session
await window.api.crossSession.getInsights(sessionId)
// Returns: CrossSessionInsight[]

// Dismiss an insight
await window.api.crossSession.dismissInsight(insightId)

// Clear all insights
await window.api.crossSession.clearInsights()
```

#### Statistics

```typescript
// Get analyzer statistics
await window.api.crossSession.getStats()
// Returns: { totalInsights, activeInsights, dismissedInsights, cachedSessions, lastAnalysisTime }
```

## Types

### SessionSimilarity

```typescript
interface SessionSimilarity {
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
```

### CrossSessionInsight

```typescript
interface CrossSessionInsight {
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
```

### SessionPatternSummary

```typescript
interface SessionPatternSummary {
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
```

### ReuseOpportunity

```typescript
interface ReuseOpportunity {
  type: 'code-snippet' | 'solution' | 'workflow';
  title: string;
  description: string;
  sourceSessionId: string;
  targetSessionId: string;
  content: string;
  relevance: number;
  estimatedTimeSaved?: string;
}
```

## Usage Examples

### 1. Running Analysis

```typescript
// In renderer process
const result = await window.api.crossSession.analyze();

if (result.success) {
  console.log(`Analyzed ${result.data.totalSessions} sessions`);
  console.log(`Found ${result.data.similarities.length} similarities`);
  console.log(`Generated ${result.data.insights.length} insights`);
}
```

### 2. Displaying Session Similarities

```typescript
const { data: similarities } = await window.api.crossSession.getSimilarities(sessionId);

similarities.forEach(sim => {
  console.log(`${sim.session1Name} ↔ ${sim.session2Name}`);
  console.log(`Similarity: ${(sim.similarityScore * 100).toFixed(0)}%`);
  console.log(`Reuse opportunities: ${sim.reuseOpportunities.length}`);
});
```

### 3. Showing Insights

```typescript
const { data: insights } = await window.api.crossSession.getInsights();

// Filter by priority
const highPriority = insights.filter(i => i.priority === 'high');

highPriority.forEach(insight => {
  console.log(`[${insight.type}] ${insight.title}`);
  console.log(insight.description);
  if (insight.actionable) {
    console.log(`Action: ${insight.action}`);
  }
});
```

### 4. Getting Session Summary

```typescript
const { data: summary } = await window.api.crossSession.getSessionSummary(sessionId);

console.log(`Session: ${summary.sessionName}`);
console.log(`Languages: ${summary.codeLanguages.join(', ')}`);
console.log(`Activity: ${summary.activityLevel}`);
console.log(`Top patterns:`);
summary.topPatterns.forEach(p => {
  console.log(`  - ${p.name} (${p.count}x, ${(p.confidence * 100).toFixed(0)}% confidence)`);
});
```

## Integration with Existing Systems

### With AI Core

The analyzer uses AI Core for:
- Retrieving interactions and patterns
- Accessing code snippets
- Getting high-confidence patterns

```typescript
const aiCore = getAICore();
const interactions = aiCore.getSessionInteractions(sessionId);
const patterns = aiCore.getPatterns(0.5);
```

### With CrossSessionAwareness

Real-time session tracking:
- File modifications
- Error occurrences
- Activity status

```typescript
const awareness = getCrossSessionAwareness();
awareness.recordFileModification(sessionId, filePath);
awareness.recordError(sessionId, errorMessage);
```

## Performance Considerations

1. **Caching**: Session summaries are cached for 5 minutes
2. **Batch Analysis**: Full analysis is expensive, run periodically not on every change
3. **Insight Limits**: Maximum 50 insights stored, oldest dismissed ones are cleaned up
4. **Pattern Comparison**: Only compares sessions with similarity score > 0.3

## Future Enhancements

- [ ] Machine learning-based similarity scoring
- [ ] Automated code merging suggestions
- [ ] Real-time collaboration notifications
- [ ] Pattern visualization graphs
- [ ] Export analysis reports
- [ ] Session grouping/clustering
- [ ] Time-based pattern evolution tracking

## Debugging

Enable debug logs:
```typescript
// All analysis operations log to console
console.log('[CrossSessionAnalyzer] ...');
```

Check stats:
```typescript
const stats = await window.api.crossSession.getStats();
console.log('Analyzer stats:', stats);
```

## Example: Building a Similarity Dashboard

```typescript
async function buildSimilarityDashboard(sessionId: string) {
  // Get current session summary
  const { data: summary } = await window.api.crossSession.getSessionSummary(sessionId);

  // Get similarities
  const { data: similarities } = await window.api.crossSession.getSimilarities(sessionId);

  // Get insights
  const { data: insights } = await window.api.crossSession.getInsights(sessionId);

  // Build dashboard data
  return {
    currentSession: {
      name: summary.sessionName,
      languages: summary.codeLanguages,
      topPatterns: summary.topPatterns.slice(0, 5),
      activityLevel: summary.activityLevel,
    },
    similarSessions: similarities.map(sim => ({
      name: sim.session1Id === sessionId ? sim.session2Name : sim.session1Name,
      score: sim.similarityScore,
      opportunities: sim.reuseOpportunities.length,
    })),
    actionableInsights: insights.filter(i => i.actionable && i.priority === 'high'),
  };
}
```

## Testing

See test coverage in:
- Unit tests: `src/main/CrossSessionAnalyzer.test.ts` (TODO)
- Integration tests: Test with multiple active sessions
- E2E tests: Full workflow testing

---

For questions or issues, check the main documentation or create an issue in the repository.
