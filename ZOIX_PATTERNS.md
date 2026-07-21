# ZOIX Pattern Extraction System

## Overview

ZOIX (Flowrider's Learning Intelligence System) now includes a comprehensive pattern extraction system that analyzes terminal output to detect and learn from recurring patterns in your development workflow.

## Architecture

### Location
- **Analyzer**: `/Users/zacharykramer/flowrider2/src/main/ai-core/Analyzer.ts`
- **Collector**: `/Users/zacharykramer/flowrider2/src/main/ai-core/Collector.ts`

### Pattern Detectors

The system includes four specialized pattern detectors:

#### 1. ErrorPatternDetector

Detects and learns from recurring errors in terminal output.

**Capabilities:**
- Parses JavaScript/TypeScript errors (TypeError, ReferenceError, SyntaxError, etc.)
- Extracts Python errors (NameError, ValueError, AttributeError, etc.)
- Detects shell/system errors (command not found, permission denied)
- Recognizes git errors (fatal, merge conflicts)
- Identifies npm/yarn errors (ENOENT, build failures)
- Captures build errors (TypeScript, webpack)
- Detects test failures (FAIL, AssertionError)
- Extracts complete stack traces for context

**Example Detection:**
```
Input Terminal Output:
TypeError: Cannot read property 'map' of undefined
    at Array.map (<anonymous>)
    at processData (app.js:45:10)

Detected Pattern:
- Type: TypeError
- Message: "Cannot read property 'map' of undefined"
- Stack Trace: Full trace captured
- Normalized: "cannot read property 'map' of undefined"
```

#### 2. CodePatternDetector

Identifies reusable code patterns and idioms from terminal interactions.

**Capabilities:**
- Extracts code from markdown blocks (```language blocks)
- Detects inline code patterns (function definitions, imports)
- Identifies programming language automatically
- Classifies pattern types:
  - Type definitions (interface, class, type)
  - Functions (function, def, func)
  - Arrow functions (const x = () => {})
  - Imports/exports
  - Array methods (.map, .filter, .reduce)
  - Promises (.then, async/await)
  - React hooks (useState, useEffect)
- Tracks common imports and dependencies

**Example Detection:**
```
Input Terminal Output:
```typescript
const fetchData = async (url: string) => {
  const response = await fetch(url);
  return response.json();
}
```

Detected Pattern:
- Language: typescript
- Type: arrow-function + async
- Name: fetchData
- Imports: []
- Pattern normalized for similarity matching
```

#### 3. WorkflowPatternDetector

Analyzes command sequences to identify common development workflows.

**Capabilities:**
- Extracts git commands (add, commit, push, merge, etc.)
- Detects package manager commands (npm, yarn, pnpm)
- Identifies test commands (jest, vitest, pytest)
- Recognizes build commands (webpack, vite, tsc)
- Captures deployment commands (vercel, netlify, docker)
- Tracks file operations (ls, cd, mkdir, etc.)
- Classifies workflow types:
  - `git`: Git operations
  - `git-ci`: Git + testing/building
  - `ci-cd`: Test → build → deploy
  - `development`: Package install + execution
  - `testing`: Multiple test runs
  - `build`: Build operations
  - `file-management`: File/directory ops

**Example Detection:**
```
Input Terminal Commands:
$ git add .
$ npm run test
$ git commit -m "Add tests"
$ git push origin main

Detected Workflow:
- Type: git-ci
- Sequence: git → test → git → git
- Commands: ["git add .", "npm run test", "git commit...", "git push..."]
- Success Rate: 85%
```

#### 4. PromptPatternDetector

Learns effective ways of asking Claude for help.

**Capabilities:**
- Analyzes prompt structure and intent
- Detects question patterns (how, what, why)
- Identifies command patterns (make, create, fix)
- Recognizes debugging patterns (error, bug, issue)
- Classifies prompt types:
  - `question`: How/what/why questions
  - `command`: Imperative requests
  - `debug`: Error investigation
  - `explanation`: Asking for clarification
  - `request`: Polite requests
- Extracts keywords:
  - contextual (given, assuming)
  - example-driven (for example, such as)
  - constrained (must, should, required)
  - multi-step (first, then, next)
- Normalizes prompts into templates for pattern matching

**Example Detection:**
```
Input Prompt:
"How do I fix the TypeError in my React component when mapping over props?"

Detected Pattern:
- Type: question
- Keywords: [question, debugging, code-focused]
- Template: "How do I fix the <ERROR> in <POSSESSIVE> React component..."
- Success Rate: 90% (based on past similar prompts)
```

## Terminal Output Parsing

### Error Extraction

The Collector now includes comprehensive error extraction from terminal output:

**Supported Error Types:**
1. **JavaScript/TypeScript**
   - All Error types (Error, TypeError, ReferenceError, etc.)
   - Uncaught exceptions
   - Stack traces with file:line:column

2. **Python**
   - All exception types (NameError, ValueError, etc.)
   - Traceback information
   - File and line information

3. **Shell/System**
   - Bash/zsh errors
   - Command not found
   - Permission denied

4. **Git**
   - Fatal errors
   - Merge conflicts
   - General git errors

5. **Build Systems**
   - TypeScript compiler errors (TS####)
   - Webpack errors
   - Generic build failures

6. **Test Frameworks**
   - Jest/Vitest failures
   - Assertion errors
   - Expected vs actual mismatches

### Category Detection

Enhanced category detection for better pattern organization:

**Detected Categories:**
- `bugfix`: Fix, bug, error, issue
- `feature`: Add, implement, create, build
- `refactor`: Refactor, improve, optimize
- `test`: Test, spec, coverage
- `docs`: Documentation, readme, comments
- `debug`: Debug, investigate, diagnose
- `config`: Setup, install, environment
- `git`: Git commands and operations
- `npm`: Package management
- `build`: Build and compilation
- `deploy`: Deployment operations
- `database`: Database operations
- `api`: API development
- `ui`: UI/component development
- `typescript`: TypeScript-specific
- `javascript`: JavaScript-specific
- `python`: Python-specific

## How It Works

### 1. Collection Phase (Collector.ts)

When a terminal interaction occurs:

```typescript
// Session registered
collector.registerSession({
  sessionId: 'session-123',
  sessionName: 'my-project',
  projectId: 'proj-456',
  workingDir: '/path/to/project',
  repoUrl: 'https://github.com/user/repo',
  language: 'typescript',
  framework: 'react'
});

// Interaction captured
const interactionId = collector.startInteraction(sessionId, prompt);
collector.completeInteraction(interactionId, sessionId, response);
```

The Collector:
1. Extracts errors from terminal output
2. Parses code blocks and file paths
3. Detects prompt categories
4. Estimates interaction outcome
5. Stores interaction in Memory

### 2. Analysis Phase (Analyzer.ts)

Background analysis runs periodically:

```typescript
// Run analysis
const result = await analyzer.analyze({
  minOccurrences: 2,      // Pattern must occur at least 2 times
  confidenceThreshold: 0.5, // Must have 50% confidence
  timeWindowMs: 7 * 24 * 60 * 60 * 1000 // Last 7 days
});

// Results
console.log(result);
// {
//   patternsDetected: 15,
//   patternsUpdated: 8,
//   insightsGenerated: 5,
//   snippetsIndexed: 12
// }
```

The Analyzer:
1. Retrieves recent interactions from Memory
2. Runs each pattern detector
3. Normalizes and groups similar patterns
4. Calculates confidence scores
5. Generates actionable insights
6. Stores patterns back to Memory

### 3. Pattern Usage

Retrieved patterns can be used for:

```typescript
// Get relevant patterns for current context
const patterns = analyzer.getRelevantPatterns({
  prompt: "Fix TypeError in React component",
  errors: ["TypeError: Cannot read property 'map' of undefined"],
  tags: ['bugfix', 'react'],
  projectId: 'proj-456'
});

// Patterns are sorted by relevance score
patterns.forEach(pattern => {
  console.log(`${pattern.name} (confidence: ${pattern.confidence})`);
  console.log(`Solution: ${pattern.solution}`);
});
```

## Real-World Examples

### Example 1: Error Pattern Learning

**First Occurrence:**
```
Terminal Output:
npm ERR! ENOENT: no such file or directory, open 'package.json'
```

**Second Occurrence:**
```
Terminal Output:
npm ERR! ENOENT: no such file or directory, open 'package.json'

Response:
You need to run `npm init` to create a package.json file first.
```

**Learned Pattern:**
```json
{
  "type": "error",
  "name": "npm ERR!: enoent: no such file or directory, open str",
  "confidence": 0.75,
  "occurrences": 2,
  "solution": "You need to run `npm init` to create a package.json file first.",
  "context": {
    "errorType": "npm ERR!",
    "errorTemplate": "enoent: no such file or directory, open str"
  }
}
```

### Example 2: Workflow Pattern

**Detected Sequence:**
```
git checkout -b feature/new-component
npm run test
git add .
git commit -m "Add component"
git push origin feature/new-component
```

**Learned Workflow:**
```json
{
  "type": "workflow",
  "name": "git-ci Workflow: git → test → git → git → git",
  "confidence": 0.82,
  "occurrences": 5,
  "successRate": 0.80,
  "context": {
    "workflowType": "git-ci",
    "exampleCommands": [
      "git checkout -b feature/new-component",
      "npm run test",
      "git add .",
      "git commit -m ...",
      "git push origin ..."
    ]
  }
}
```

### Example 3: Code Pattern

**Detected Pattern:**
```typescript
// Seen 3 times in different interactions
const [state, setState] = useState<Type>(initialValue);
```

**Learned Pattern:**
```json
{
  "type": "code",
  "name": "typescript react-hook: useState",
  "confidence": 0.68,
  "occurrences": 3,
  "context": {
    "language": "typescript",
    "patternType": "react-hook",
    "imports": ["react"],
    "commonUseCase": "ui,feature"
  },
  "solution": "const [state, setState] = useState<Type>(initialValue);"
}
```

## Integration Points

### AICore Integration

```typescript
// From AICore.ts
const aiCore = new AICore(memory);

// Register session for learning
aiCore.registerSession({
  sessionId: 'session-123',
  sessionName: 'my-project',
  projectId: 'proj-456',
  // ...
});

// Record interaction
aiCore.recordInteraction('session-123', prompt, response, {
  filesModified: ['src/App.tsx'],
  outcome: 'success'
});

// Analyze patterns
await aiCore.analyze();

// Get suggestions based on patterns
const suggestions = await aiCore.getSuggestions('How do I fix this error?', {
  sessionId: 'session-123',
  errors: ['TypeError: ...']
});
```

### SessionMonitor Integration

The SessionMonitor can automatically feed terminal output to the Collector:

```typescript
// SessionMonitor polls tmux output
const output = await tmuxManager.getOutput(sessionName, 500);

// Feed to AICore for pattern extraction
aiCore.parseTmuxOutput(sessionId, output);
```

## Performance Characteristics

- **Pattern Detection**: O(n) where n = number of interactions
- **Memory Usage**: Patterns stored in SQLite, minimal memory footprint
- **Analysis Frequency**: Configurable (default: every 5 minutes)
- **Pattern Matching**: Normalized hashing for fast lookup
- **Confidence Calculation**: Logarithmic scale based on occurrences

## Configuration

```typescript
// Start background analysis
analyzer.startBackgroundAnalysis(5 * 60 * 1000); // Every 5 minutes

// Or run manual analysis with custom config
const result = await analyzer.analyze({
  minOccurrences: 3,        // Higher threshold
  confidenceThreshold: 0.7, // Higher confidence
  timeWindowMs: 30 * 24 * 60 * 60 * 1000 // Last 30 days
});

// Stop background analysis
analyzer.stopBackgroundAnalysis();
```

## Future Enhancements

Potential improvements to the pattern extraction system:

1. **ML-based pattern clustering**: Use embeddings for semantic similarity
2. **Cross-project pattern sharing**: Learn from patterns across all projects
3. **Temporal pattern analysis**: Detect patterns that work better at different times
4. **Pattern effectiveness tracking**: Monitor which patterns lead to successful outcomes
5. **Auto-suggestion**: Proactively suggest patterns based on context
6. **Pattern export/import**: Share patterns between users
7. **Visual pattern explorer**: UI for browsing and managing patterns

## Debugging

Enable detailed logging:

```typescript
// Analyzer logs
console.log('[Analyzer] Starting analysis...');
console.log('[Analyzer] error detector found X candidates');
console.log('[Analyzer] code detector found Y candidates');
// ...

// Collector logs
console.log('[Collector] Started interaction abc123');
console.log('[Collector] Saved interaction abc123 [success]');
console.log('[Collector] Recorded feedback: accept (1)');
```

## Testing

Example test scenarios:

```typescript
// Test error detection
const errors = InteractionParser.extractErrors(`
  TypeError: Cannot read property 'foo' of undefined
  at Object.<anonymous> (test.js:10:5)
`);
expect(errors).toContainEqual(expect.stringContaining("Cannot read property"));

// Test code extraction
const blocks = detector.extractCodeBlocks('```typescript\nconst x = 1;\n```');
expect(blocks[0].language).toBe('typescript');

// Test workflow detection
const patterns = detector.detect(interactions);
expect(patterns.some(p => p.type === 'workflow')).toBe(true);
```

## Summary

The ZOIX pattern extraction system provides:

- **Real terminal parsing**: No mocks, actual regex-based extraction
- **Multi-language support**: JavaScript, TypeScript, Python, and more
- **Comprehensive error detection**: All major error types and frameworks
- **Workflow intelligence**: Learns command sequences and best practices
- **Code pattern recognition**: Identifies reusable code idioms
- **Smart prompt analysis**: Understands effective ways to ask for help
- **Production-ready**: Handles edge cases, normalizes data, prevents duplicates
- **Extensible**: Easy to add new pattern types or detection logic

The system is now fully functional and ready to learn from your development workflow!
