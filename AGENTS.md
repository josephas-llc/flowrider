# AGENTS.md - Flowrider AI Agent Architecture

## Overview

Flowrider is a multi-agent orchestration platform that manages concurrent AI coding sessions. Each session runs Claude Code (or other AI providers) in tmux terminals, with LEO AI providing cross-session intelligence.

## Agent Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                      LEO (Meta-Orchestrator)            │
│         Manages up to 20 Flowrider instances            │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                    Flowrider Instance                   │
│              20 concurrent AI sessions                  │
│                  (Icosahedron faces)                    │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│                      LEO AI                             │
│           Self-improving learning system                │
│     Observes → Analyzes → Learns → Applies              │
└─────────────────────────────────────────────────────────┘
```

## Agent Types

### 1. Session Agents (Per-Face)
- **Runtime**: tmux + Claude Code CLI
- **Scope**: Single project/directory
- **Capabilities**: Full coding agent with file access, terminal, git
- **Provider**: Claude, Ollama, OpenAI, or local LLMs

### 2. LEO AI (Learning Agent)
- **Runtime**: Main Electron process
- **Scope**: Cross-session, persistent
- **Storage**: `~/.flowrider/leo-ai.db` (SQLite)

#### Components:
| Component | File | Purpose |
|-----------|------|---------|
| LeoMemory | `src/main/leo-ai/LeoMemory.ts` | SQLite persistence layer |
| LeoCollector | `src/main/leo-ai/LeoCollector.ts` | Captures interactions |
| LeoAnalyzer | `src/main/leo-ai/LeoAnalyzer.ts` | Pattern detection |
| LeoDistiller | `src/main/leo-ai/LeoDistiller.ts` | Knowledge → context |
| LeoAI | `src/main/leo-ai/LeoAI.ts` | Main coordinator |

#### Data Model:
```typescript
Interaction {
  id, sessionId, timestamp
  prompt, response, outcome
  filesModified, errorsSeen, codeBlocks
  feedback (-1 to 1)
}

Pattern {
  type: 'error' | 'code' | 'workflow' | 'prompt'
  pattern, frequency, confidence
  resolution, examples
}

Insight {
  category, content, confidence
  effectiveness, usageCount
}

CodeSnippet {
  language, code, description
  quality, usageCount
}
```

### 3. LEO Meta-Orchestrator (Future)
- **Runtime**: Dedicated process or separate machine
- **Scope**: Multiple Flowrider instances (up to 20 × 20 = 400 sessions)
- **Purpose**: Enterprise-scale AI coordination

## Communication

### IPC Channels (Electron)
```
Renderer ←→ Main Process ←→ tmux sessions
    │              │
    │              └── LEO AI (in-process)
    │
    └── window.flowrider.leoai.*
```

### Key APIs:
```typescript
// Session management
window.flowrider.tmux.create(name, faceIndex, workingDir)
window.flowrider.tmux.sendInput(sessionName, data)
window.flowrider.tmux.getOutput(sessionName, lines)

// LEO AI learning
window.flowrider.leoai.registerSession(context)
window.flowrider.leoai.recordInteraction(sessionId, prompt, response, metadata)
window.flowrider.leoai.recordFeedback(sessionId, signal)
window.flowrider.leoai.getContext(request)
window.flowrider.leoai.analyze()
```

## Learning Pipeline

```
1. OBSERVE
   └── LeoCollector captures prompts, responses, outcomes

2. ANALYZE (every 50 interactions or on-demand)
   ├── Extract error patterns + resolutions
   ├── Detect code patterns + quality
   ├── Identify workflow sequences
   └── Find prompt patterns + success rates

3. LEARN
   ├── Store patterns with confidence scores
   ├── Generate insights from pattern clusters
   └── Extract reusable code snippets

4. APPLY
   └── LeoDistiller injects context into new sessions:
       - Relevant patterns for current task
       - Suggested snippets for language
       - Warnings from past failures
       - Success patterns to follow
```

## Personalization

Each user's LEO AI learns from:
- **Their projects**: tenfourOS, flatland, texian, etc.
- **Their coding style**: patterns, preferences, conventions
- **Their problem-solving**: how they fix specific errors
- **Their workflows**: common sequences of actions

This creates a **personalized AI assistant** unique to each user.

## File Locations

| Path | Purpose |
|------|---------|
| `~/.flowrider/` | App data directory |
| `~/.flowrider/leo-ai.db` | LEO AI learning database |
| `~/.flowrider/flowrider.db` | Session/project data |
| `~/.flowrider/config.json` | User configuration |

## Future Enhancements

- [ ] Cloud sync for LEO AI database
- [ ] Cross-user pattern sharing (opt-in)
- [ ] Real-time session collaboration
- [ ] Voice command integration
- [ ] Autonomous task execution (with approval gates)
