# ARCHITECTURE.md - Flowrider System Architecture

## Overview

Flowrider is an Electron-based desktop application for orchestrating multiple AI coding sessions. It uses a 3D icosahedron interface where each of the 20 faces represents an independent AI terminal session.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              FLOWRIDER APP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        RENDERER PROCESS                              │   │
│  │                         (React + Vite)                               │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                  │   │
│  │  │ Icosahedron │  │   Session   │  │   ZOIX AI    │                  │   │
│  │  │    View     │  │    Panel    │  │  Dashboard  │                  │   │
│  │  │  (Three.js) │  │  (xterm.js) │  │             │                  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘                  │   │
│  │         │                │                │                          │   │
│  │         └────────────────┼────────────────┘                          │   │
│  │                          │                                           │   │
│  │                    ┌─────▼─────┐                                     │   │
│  │                    │  Zustand  │                                     │   │
│  │                    │   Store   │                                     │   │
│  │                    └─────┬─────┘                                     │   │
│  └──────────────────────────┼───────────────────────────────────────────┘   │
│                             │                                               │
│                    ┌────────▼────────┐                                      │
│                    │  window.flowrider │  (Context Bridge / Preload)        │
│                    └────────┬────────┘                                      │
│                             │ IPC                                           │
│  ┌──────────────────────────▼───────────────────────────────────────────┐   │
│  │                         MAIN PROCESS                                  │   │
│  │                         (Electron + Node.js)                          │   │
│  │                                                                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  │   │
│  │  │    main.ts  │  │ TmuxManager │  │  SessionMon │  │ ContextInj  │  │   │
│  │  │ (IPC Router)│  │             │  │             │  │             │  │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  │   │
│  │         │                │                │                │         │   │
│  │         └────────────────┼────────────────┼────────────────┘         │   │
│  │                          │                │                          │   │
│  │                    ┌─────▼─────┐    ┌─────▼─────┐                    │   │
│  │                    │  node-pty │    │  ZOIX AI   │                    │   │
│  │                    │           │    │  System   │                    │   │
│  │                    └─────┬─────┘    └─────┬─────┘                    │   │
│  │                          │                │                          │   │
│  └──────────────────────────┼────────────────┼──────────────────────────┘   │
│                             │                │                              │
└─────────────────────────────┼────────────────┼──────────────────────────────┘
                              │                │
                    ┌─────────▼──────┐   ┌─────▼─────┐
                    │     tmux       │   │  SQLite   │
                    │   sessions     │   │ ~/.flowrider/
                    │                │   │ leo-ai.db │
                    └────────────────┘   └───────────┘
```

## Process Architecture

### Renderer Process (Frontend)

The renderer runs in a Chromium browser context with React.

```
src/renderer/
├── App.tsx              # Root component
├── components/
│   ├── Icosahedron.tsx  # 3D visualization
│   ├── SessionPanel.tsx # Terminal + controls
│   ├── ZoixAIView.tsx    # Learning dashboard
│   └── ...
└── store/
    └── useStore.ts      # Zustand state
```

**Key Technologies:**
- React 18 with hooks
- React Three Fiber (Three.js wrapper)
- xterm.js for terminal emulation
- Zustand for state management
- Vite for bundling/HMR

### Main Process (Backend)

The main process runs in Node.js with full system access.

```
src/main/
├── main.ts              # Entry + IPC handlers
├── preload.ts           # Context bridge (window.flowrider)
├── TmuxManager.ts       # tmux session lifecycle
├── SessionMonitor.ts    # Auto-capture interactions
├── ContextInjector.ts   # Inject learned context
├── ZoixManager.ts        # Multi-Flowrider orchestration
└── leo-ai/
    ├── ZoixAI.ts         # Main coordinator
    ├── ZoixMemory.ts     # SQLite persistence
    ├── ZoixCollector.ts  # Capture interactions
    ├── ZoixAnalyzer.ts   # Pattern detection
    └── ZoixDistiller.ts  # Context generation
```

## Data Flow

### 1. User Creates Session

```
User clicks face → Renderer → IPC 'tmux:create' → TmuxManager
                                                      ↓
                                              tmux new-session
                                                      ↓
                                              SessionMonitor.start()
                                                      ↓
                                              ZoixAI.registerSession()
```

### 2. User Sends Prompt

```
User types in terminal → xterm.js → IPC 'tmux:input' → TmuxManager
                                                            ↓
                                                     tmux send-keys
                                                            ↓
                                                     Claude Code CLI
                                                            ↓
                                                     Response output
                                                            ↓
SessionMonitor polls → detects prompt/response → ZoixAI.recordInteraction()
```

### 3. ZOIX AI Learning Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                     ZOIX AI LEARNING LOOP                        │
│                                                                 │
│    OBSERVE          ANALYZE           LEARN           APPLY     │
│       ↓                ↓                ↓               ↓       │
│  ┌─────────┐     ┌──────────┐     ┌─────────┐    ┌──────────┐  │
│  │Collector│ --> │ Analyzer │ --> │ Memory  │ -->│Distiller │  │
│  │         │     │          │     │         │    │          │  │
│  │ Prompts │     │ Patterns │     │ SQLite  │    │ Context  │  │
│  │Responses│     │ Insights │     │ Storage │    │Injection │  │
│  │ Outcomes│     │ Snippets │     │         │    │          │  │
│  └─────────┘     └──────────┘     └─────────┘    └──────────┘  │
│       ↑                                               ↓         │
│       └───────────────────────────────────────────────┘         │
│                    (Feedback Loop)                              │
└─────────────────────────────────────────────────────────────────┘
```

## Component Details

### TmuxManager

Manages tmux session lifecycle:

```typescript
class TmuxManager {
  create(name, faceIndex, workingDir)  // Create new session
  list()                                // List active sessions
  kill(sessionName)                     // Terminate session
  sendInput(sessionName, data)          // Send keystrokes
  getOutput(sessionName, lines)         // Read terminal output
  rename(oldName, newName)              // Rename session
}
```

### SessionMonitor

Automatically captures interactions by polling tmux output:

```typescript
class SessionMonitor {
  startMonitoring(sessionName, sessionId, workingDir)
  stopMonitoring(sessionName)

  // Internal
  pollSession()          // Check for new output
  detectPromptSent()     // Find user prompts
  detectResponseComplete() // Find AI responses
  recordInteraction()    // Send to ZOIX AI
}
```

### ZOIX AI Components

| Component | File | Purpose |
|-----------|------|---------|
| ZoixAI | `ZoixAI.ts` | Coordinator, public API |
| ZoixMemory | `ZoixMemory.ts` | SQLite CRUD operations |
| ZoixCollector | `ZoixCollector.ts` | Capture and preprocess |
| ZoixAnalyzer | `ZoixAnalyzer.ts` | Pattern extraction |
| ZoixDistiller | `ZoixDistiller.ts` | Context generation |

### ContextInjector

Prepends learned context to prompts:

```typescript
class ContextInjector {
  getContextForPrompt(options)  // Get context for new prompt
  getErrorContext(errors)        // Get context for error recovery
  enable() / disable()           // Toggle injection
}
```

## Database Schema

Located at `~/.flowrider/leo-ai.db`:

```sql
-- Captured interactions
CREATE TABLE interactions (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  timestamp INTEGER,
  prompt TEXT,
  prompt_hash TEXT,
  response TEXT,
  outcome TEXT,
  user_feedback REAL,
  files_modified TEXT,  -- JSON array
  errors_seen TEXT      -- JSON array
);

-- Detected patterns
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,
  type TEXT,           -- 'error' | 'code' | 'workflow' | 'prompt'
  name TEXT,
  pattern TEXT,
  resolution TEXT,
  confidence REAL,
  occurrences INTEGER,
  language TEXT
);

-- Generated insights
CREATE TABLE insights (
  id TEXT PRIMARY KEY,
  category TEXT,
  content TEXT,
  confidence REAL,
  effectiveness REAL,
  usage_count INTEGER
);

-- Extracted code snippets
CREATE TABLE snippets (
  id TEXT PRIMARY KEY,
  language TEXT,
  code TEXT,
  description TEXT,
  quality REAL,
  usage_count INTEGER
);
```

## IPC Channel Map

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `tmux:create` | R→M | Create session |
| `tmux:list` | R→M | List sessions |
| `tmux:kill` | R→M | Kill session |
| `tmux:input` | R→M | Send keystrokes |
| `tmux:output` | R→M | Read output |
| `leoai:enable` | R→M | Enable learning |
| `leoai:recordInteraction` | R→M | Record interaction |
| `leoai:getContext` | R→M | Get distilled context |
| `leoai:analyze` | R→M | Trigger analysis |
| `monitor:start` | R→M | Start monitoring |
| `context:getForPrompt` | R→M | Get injection context |

(R = Renderer, M = Main)

## Security Model

### Context Isolation

- Renderer has no direct Node.js access
- All system calls go through `preload.ts` context bridge
- Only whitelisted APIs exposed via `window.flowrider`

### Data Privacy

- All ZOIX AI data stored locally (`~/.flowrider/`)
- No cloud sync by default
- User controls what gets learned via feedback

### Process Sandboxing

- Electron sandbox enabled
- tmux sessions run in user context
- No elevated privileges required

## Scaling Architecture (Future)

### ZOIX Meta-Orchestration

```
┌─────────────────────────────────────────────────────────────────┐
│                    ZOIX META-ORCHESTRATOR                        │
│                  (Up to 20 Flowriders)                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  Flowrider 1  │   │  Flowrider 2  │   │  Flowrider N  │
│  (20 sessions)│   │  (20 sessions)│   │  (20 sessions)│
└───────────────┘   └───────────────┘   └───────────────┘

Total capacity: 20 × 20 = 400 concurrent AI sessions
```

## Technology Stack Summary

| Layer | Technology |
|-------|------------|
| Desktop Framework | Electron 34 |
| Frontend | React 18, TypeScript |
| 3D Graphics | Three.js, React Three Fiber |
| Terminal | xterm.js, node-pty |
| State | Zustand |
| Storage | better-sqlite3 |
| Session Management | tmux |
| Build (Renderer) | Vite |
| Build (Main) | TypeScript Compiler |
| Packaging | electron-builder |

## Related Documentation

- [DEVELOPMENT.md](./DEVELOPMENT.md) - Setup and workflow
- [API.md](./API.md) - window.flowrider API reference
- [AGENTS.md](./AGENTS.md) - Agent architecture details
- [ZOIX_LEARNING.md](./ZOIX_LEARNING.md) - ZOIX AI deep dive
