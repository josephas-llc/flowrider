# API.md - Flowrider API Reference

## Overview

Flowrider exposes its functionality through the `window.flowrider` object, which is injected via Electron's context bridge. All methods return Promises.

## Quick Reference

```typescript
window.flowrider.tmux.*     // Session management
window.flowrider.leoai.*    // LEO AI learning system
window.flowrider.monitor.*  // Session monitoring
window.flowrider.context.*  // Context injection
window.flowrider.leo.*      // Meta-orchestration (future)
window.flowrider.git.*      // Git integration
window.flowrider.dialog.*   // Native dialogs
window.flowrider.project.*  // Project management
window.flowrider.costs.*    // Cost tracking
window.flowrider.platform   // 'darwin' | 'win32' | 'linux'
window.flowrider.version    // '0.1.0'
```

---

## tmux - Session Management

### `tmux.create(name, faceIndex, workingDir)`

Create a new tmux session.

```typescript
const result = await window.flowrider.tmux.create(
  'my-project',    // Session name
  0,               // Face index (0-19)
  '/path/to/dir'   // Working directory
);
// Returns: { success: boolean; error?: string }
```

### `tmux.list()`

List all active tmux sessions.

```typescript
const result = await window.flowrider.tmux.list();
// Returns: { success: boolean; data: string[] }
```

### `tmux.kill(sessionName)`

Terminate a tmux session.

```typescript
const result = await window.flowrider.tmux.kill('my-project');
// Returns: { success: boolean; error?: string }
```

### `tmux.sendInput(sessionName, data)`

Send keystrokes to a session.

```typescript
// Send a command
await window.flowrider.tmux.sendInput('my-project', 'npm test\n');

// Send special keys
await window.flowrider.tmux.sendInput('my-project', '\x03'); // Ctrl+C
```

### `tmux.getOutput(sessionName, lines?)`

Read terminal output from a session.

```typescript
const result = await window.flowrider.tmux.getOutput('my-project', 100);
// Returns: { success: boolean; data?: string }
```

### `tmux.rename(oldName, newName)`

Rename a session.

```typescript
const result = await window.flowrider.tmux.rename('old-name', 'new-name');
// Returns: { success: boolean; error?: string }
```

---

## leoai - Learning System

### Lifecycle

#### `leoai.enable()`

Enable the LEO AI learning system.

```typescript
await window.flowrider.leoai.enable();
// Returns: { success: boolean }
```

#### `leoai.disable()`

Disable the LEO AI learning system.

```typescript
await window.flowrider.leoai.disable();
// Returns: { success: boolean }
```

#### `leoai.getStatus()`

Get current LEO AI status.

```typescript
const result = await window.flowrider.leoai.getStatus();
// Returns: {
//   success: boolean;
//   data: {
//     enabled: boolean;
//     learning: boolean;
//     stats: LeoStats;
//     lastAnalysis: number | null;
//     config: {...}
//   }
// }
```

### Session Registration

#### `leoai.registerSession(context)`

Register a session for learning.

```typescript
await window.flowrider.leoai.registerSession({
  sessionId: 'uuid-here',
  sessionName: 'my-project',
  workingDir: '/path/to/project',
  projectId: 'optional-project-id',
  repoUrl: 'https://github.com/user/repo',
  language: 'typescript'
});
// Returns: { success: boolean }
```

### Interaction Recording

#### `leoai.recordInteraction(sessionId, prompt, response, metadata?)`

Manually record an interaction.

```typescript
await window.flowrider.leoai.recordInteraction(
  'session-uuid',
  'Write a function to sort an array',
  'Here is a sort function...',
  {
    filesModified: ['src/utils.ts'],
    outcome: 'success',   // 'success' | 'failure' | 'partial' | 'unknown'
    feedback: 1           // -1 to 1 (thumbs down to up)
  }
);
// Returns: { success: boolean; id: string }
```

#### `leoai.recordFeedback(sessionId, signal)`

Record user feedback on an interaction.

```typescript
await window.flowrider.leoai.recordFeedback('session-uuid', {
  type: 'thumbs',
  value: 1,              // 1 = positive, -1 = negative
  context: 'optional context string'
});
// Returns: { success: boolean }
```

### Context Retrieval

#### `leoai.getContext(request?)`

Get distilled context for a prompt.

```typescript
const result = await window.flowrider.leoai.getContext({
  prompt: 'Fix the authentication bug',
  projectId: 'my-project',
  language: 'typescript',
  tags: ['auth', 'bug'],
  errors: ['TypeError: Cannot read property...']
});
// Returns: {
//   success: boolean;
//   data: {
//     systemPrompt: string;
//     relevantPatterns: Pattern[];
//     suggestedSnippets: CodeSnippet[];
//     warnings: string[];
//     successPatterns: string[];
//     tokenEstimate: number;
//   }
// }
```

#### `leoai.getQuickContext(projectId?, language?)`

Get a quick context string.

```typescript
const result = await window.flowrider.leoai.getQuickContext('my-project', 'typescript');
// Returns: { success: boolean; data: string }
```

#### `leoai.getErrorContext(errors, language?)`

Get context specific to errors.

```typescript
const result = await window.flowrider.leoai.getErrorContext(
  ['TypeError: Cannot read property...'],
  'typescript'
);
// Returns: { success: boolean; data: string }
```

### Analysis

#### `leoai.analyze()`

Trigger pattern analysis.

```typescript
const result = await window.flowrider.leoai.analyze();
// Returns: {
//   success: boolean;
//   data: {
//     patternsFound: number;
//     insightsGenerated: number;
//     snippetsExtracted: number;
//     duration: number;
//     errors: string[];
//   }
// }
```

### Stats & Data

#### `leoai.getStats()`

Get learning statistics.

```typescript
const result = await window.flowrider.leoai.getStats();
// Returns: {
//   success: boolean;
//   data: {
//     totalInteractions: number;
//     totalPatterns: number;
//     totalInsights: number;
//     totalSnippets: number;
//     avgConfidence: number;
//     topLanguages: string[];
//     topProjects: string[];
//   }
// }
```

#### `leoai.getInteractions(limit?)`

Get recent interactions.

```typescript
const result = await window.flowrider.leoai.getInteractions(50);
// Returns: { success: boolean; data: Interaction[] }
```

#### `leoai.getPatterns(minConfidence?)`

Get detected patterns.

```typescript
const result = await window.flowrider.leoai.getPatterns(0.7);
// Returns: { success: boolean; data: Pattern[] }
```

#### `leoai.getInsights(limit?)`

Get generated insights.

```typescript
const result = await window.flowrider.leoai.getInsights(20);
// Returns: { success: boolean; data: Insight[] }
```

#### `leoai.searchSnippets(query)`

Search code snippets.

```typescript
const result = await window.flowrider.leoai.searchSnippets('sort array');
// Returns: { success: boolean; data: CodeSnippet[] }
```

#### `leoai.getLearningEvents(since)`

Get learning events since timestamp.

```typescript
const result = await window.flowrider.leoai.getLearningEvents(Date.now() - 86400000);
// Returns: { success: boolean; data: LearningEvent[] }
```

---

## monitor - Session Monitoring

### `monitor.start(sessionName, sessionId, workingDir, projectId?, language?)`

Start monitoring a session for automatic interaction capture.

```typescript
await window.flowrider.monitor.start(
  'my-project',
  'session-uuid',
  '/path/to/project',
  'project-id',    // optional
  'typescript'     // optional
);
// Returns: { success: boolean }
```

### `monitor.stop(sessionName)`

Stop monitoring a session.

```typescript
await window.flowrider.monitor.stop('my-project');
// Returns: { success: boolean }
```

### `monitor.list()`

List all monitored sessions.

```typescript
const result = await window.flowrider.monitor.list();
// Returns: { success: boolean; data: string[] }
```

### `monitor.isMonitoring(sessionName)`

Check if a session is being monitored.

```typescript
const result = await window.flowrider.monitor.isMonitoring('my-project');
// Returns: { success: boolean; data: boolean }
```

### `monitor.recordInteraction(sessionId, prompt, response, feedback?)`

Manually record an interaction with feedback.

```typescript
await window.flowrider.monitor.recordInteraction(
  'session-uuid',
  'Write a test',
  'Here is the test...',
  1  // optional feedback: -1 to 1
);
// Returns: { success: boolean }
```

---

## context - Context Injection

### `context.getForPrompt(options)`

Get context to prepend to a prompt.

```typescript
const result = await window.flowrider.context.getForPrompt({
  prompt: 'Fix the login bug',
  projectId: 'my-project',
  language: 'typescript',
  sessionId: 'session-uuid'
});
// Returns: { success: boolean; data: string | null }
```

### `context.getForErrors(errors, language?)`

Get context for error recovery.

```typescript
const result = await window.flowrider.context.getForErrors(
  ['TypeError: Cannot read property...'],
  'typescript'
);
// Returns: { success: boolean; data: string | null }
```

### `context.enable() / context.disable()`

Toggle context injection.

```typescript
await window.flowrider.context.enable();
await window.flowrider.context.disable();
// Returns: { success: boolean }
```

### `context.getConfig() / context.setConfig(config)`

Get or update configuration.

```typescript
const result = await window.flowrider.context.getConfig();
// Returns: {
//   success: boolean;
//   data: {
//     enabled: boolean;
//     maxTokens: number;
//     includePatterns: boolean;
//     includeSnippets: boolean;
//     includeWarnings: boolean;
//   }
// }

await window.flowrider.context.setConfig({
  maxTokens: 1000,
  includeWarnings: true
});
```

---

## dialog - Native Dialogs

### `dialog.openDirectory()`

Open a directory picker dialog.

```typescript
const result = await window.flowrider.dialog.openDirectory();
// Returns: {
//   success: boolean;
//   path?: string;
//   canceled?: boolean;
//   error?: string;
// }
```

---

## git - Git Integration

### `git.detectRepo(workingDir)`

Detect Git repository info.

```typescript
const result = await window.flowrider.git.detectRepo('/path/to/project');
// Returns: { success: boolean; data?: { url: string; branch: string; } }
```

---

## leo - Meta-Orchestration (Future)

### `leo.enable() / leo.disable()`

Enable/disable LEO meta-orchestration.

### `leo.getStatus()`

Get LEO orchestration status.

### `leo.getFlowriders()`

Get list of connected Flowrider instances.

### `leo.discover()`

Discover Flowrider instances on the network.

### `leo.ping(flowriderId)`

Ping a remote Flowrider instance.

### `leo.getRemoteSessions(flowriderId)`

Get sessions from a remote Flowrider.

### `leo.getSelfInfo()`

Get this Flowrider instance's info.

---

## Types

### Interaction

```typescript
interface Interaction {
  id: string;
  sessionId: string;
  timestamp: number;
  prompt: string;
  promptHash: string;
  response: string;
  tags: string[];
  outcome: 'success' | 'failure' | 'partial' | 'unknown';
  feedback: number;
  projectId?: string;
  language?: string;
  filesModified: string[];
  errorsSeen: string[];
  codeBlocks: string[];
}
```

### Pattern

```typescript
interface Pattern {
  id: string;
  type: 'error' | 'code' | 'workflow' | 'prompt';
  pattern: string;
  frequency: number;
  confidence: number;
  examples: string[];
  resolution?: string;
  tags: string[];
  language?: string;
  createdAt: number;
  lastSeen: number;
}
```

### Insight

```typescript
interface Insight {
  id: string;
  category: string;
  content: string;
  confidence: number;
  sourcePatterns: string[];
  applicableTags: string[];
  applicableLanguages: string[];
  effectiveness: number;
  usageCount: number;
  createdAt: number;
  lastUsed: number;
}
```

### CodeSnippet

```typescript
interface CodeSnippet {
  id: string;
  language: string;
  code: string;
  description: string;
  tags: string[];
  sourceInteraction: string;
  quality: number;
  usageCount: number;
  createdAt: number;
}
```

### LeoStats

```typescript
interface LeoStats {
  totalInteractions: number;
  totalPatterns: number;
  totalInsights: number;
  totalSnippets: number;
  avgConfidence: number;
  topLanguages: string[];
  topProjects: string[];
}
```

### ContextInjectionConfig

```typescript
interface ContextInjectionConfig {
  enabled: boolean;
  maxTokens: number;
  includePatterns: boolean;
  includeSnippets: boolean;
  includeWarnings: boolean;
}
```

---

## Error Handling

All API methods return a `success` boolean. On failure, check the `error` field:

```typescript
const result = await window.flowrider.tmux.create('test', 0, '/tmp');
if (!result.success) {
  console.error('Failed:', result.error);
}
```

---

## Usage Examples

### Create Session with Monitoring

```typescript
// Create session
const createResult = await window.flowrider.tmux.create(
  'my-project',
  0,
  '/Users/me/projects/my-project'
);

if (createResult.success) {
  // Start monitoring for LEO AI
  await window.flowrider.monitor.start(
    'my-project',
    crypto.randomUUID(),
    '/Users/me/projects/my-project',
    undefined,
    'typescript'
  );
}
```

### Send Command and Get Output

```typescript
await window.flowrider.tmux.sendInput('my-project', 'npm test\n');

// Wait for output
await new Promise(resolve => setTimeout(resolve, 5000));

const output = await window.flowrider.tmux.getOutput('my-project', 200);
console.log(output.data);
```

### Record Feedback

```typescript
// User clicked thumbs up
await window.flowrider.leoai.recordFeedback('session-uuid', {
  type: 'thumbs',
  value: 1
});
```

### Get Context for New Prompt

```typescript
const context = await window.flowrider.context.getForPrompt({
  prompt: 'Add error handling to the API',
  language: 'typescript'
});

if (context.data) {
  // Prepend context to prompt
  const fullPrompt = context.data + '\n\n' + userPrompt;
}
```
