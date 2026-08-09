# FLOWRIDER / ZOIX — MULTI-EXPERT AGENT AUDIT

**Date:** 2026-08-09
**Codebase Version:** v0.1.0 (Phase 1 - Core)
**Auditor:** Claude Opus 4.5 Multi-Expert Analysis

---

## EXPERT 1 — SYSTEMS ARCHITECT

### High-Level Architecture Map

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ELECTRON APP                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                         RENDERER PROCESS                                 │ │
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               │ │
│  │  │  React UI     │  │  Three.js     │  │  Zustand      │               │ │
│  │  │  (App.tsx)    │  │  (Icosahedron)│  │  (store.ts)   │               │ │
│  │  │  Dashboard    │  │  20-face viz  │  │  State mgmt   │               │ │
│  │  │  SessionGrid  │  │               │  │  ~1400 lines  │               │ │
│  │  │  TerminalView │  │               │  │               │               │ │
│  │  └───────────────┘  └───────────────┘  └───────────────┘               │ │
│  │                              │                                          │ │
│  │                              ▼ IPC (contextBridge)                      │ │
│  └──────────────────────────────┬──────────────────────────────────────────┘ │
│                                  │                                           │
│  ┌───────────────────────────────┴──────────────────────────────────────────┐│
│  │                          MAIN PROCESS                                    ││
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          ││
│  │  │  TmuxManager    │  │  AIService      │  │  SessionMonitor │          ││
│  │  │  (sessions)     │  │  (providers)    │  │  (captures)     │          ││
│  │  │  spawn/kill/io  │  │  call/route     │  │  interactions   │          ││
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          ││
│  │                                                                          ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐││
│  │  │                      AI CORE (ai-core/)                             │││
│  │  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐│││
│  │  │  │ AICore.ts   │  │ Memory.ts   │  │ ZoixIntel.  │  │ SkillTracker││││
│  │  │  │ orchestrate │  │ SQLite DB   │  │ suggestions │  │ progression ││││
│  │  │  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘│││
│  │  │                                                                     │││
│  │  │  ┌─────────────────────────────────────────────────────────────────┐│││
│  │  │  │                    KnowledgeGraph.ts                            ││││
│  │  │  │  Concepts → Relations → Clusters → Gaps                         ││││
│  │  │  └─────────────────────────────────────────────────────────────────┘│││
│  │  └─────────────────────────────────────────────────────────────────────┘││
│  │                                                                          ││
│  │  ┌─────────────────────────────────────────────────────────────────────┐││
│  │  │              SQLite Databases (user data directory)                 │││
│  │  │  leo-memory.db  │  skill-tracker.db  │  knowledge-graph.db          │││
│  │  └─────────────────────────────────────────────────────────────────────┘││
│  └──────────────────────────────────────────────────────────────────────────┘│
│                                                                               │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL SERVICES                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ Claude API  │  │ OpenAI API  │  │ Ollama      │  │ Gemini/Grok │         │
│  │ (Anthropic) │  │             │  │ (Local)     │  │             │         │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘         │
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐ │
│  │                           tmux (local)                                   │ │
│  │  Session 1 → Claude Code CLI                                             │ │
│  │  Session 2 → Claude Code CLI                                             │ │
│  │  ...                                                                     │ │
│  │  Session 20 → Claude Code CLI                                            │ │
│  └─────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Model-Provider Abstraction Assessment

**Location:** `src/main/AIService.ts` (lines 1-310)

The model-provider layer is **reasonably clean**:
- Single `AIService` class with unified interface (`call`, `quickPrompt`)
- Providers enumerated: `zoix`, `claude`, `openai`, `ollama`, `gemini`, `grok`, `local`
- Each provider has a dedicated call method (`callClaude`, `callOpenAI`, etc.)
- Cost calculation centralized via `calculateCost` method

**Gaps:**
- Provider implementations are co-located in one file (not separate modules)
- No abstract `Provider` interface defined explicitly
- Retry logic appears inconsistent across providers (NOT VERIFIABLE - would need to trace each method)

### Session State Management

**Location:** `src/renderer/store.ts` (lines 1-600+), `src/main/TmuxManager.ts`

**State managed across sessions:**
- Zustand store maintains session array with 20 slots
- Each session tracks: `id`, `name`, `status`, `aiProvider`, `model`, `workingDir`, `tmuxSession`, `costEstimate`
- `persist` middleware with IndexedDB storage for crash recovery

**Crash/Restart Recovery:** **ADEQUATE**
- `syncWithTmux()` function reconciles UI state with actual tmux sessions on load
- Sessions can be reattached after crash
- However, **interaction history is only in SQLite** - if the app crashes mid-interaction, partial data may be lost

### Tight Couplings Identified

| Area | Coupling | Impact |
|------|----------|--------|
| `AIService.ts` | Direct HTTP calls to each provider | Adding new provider requires modifying ~100 lines |
| `TmuxManager.ts` | Hardcoded tmux commands | Swapping terminal backend requires full rewrite |
| `ZoixIntelligence.ts` | Directly imports Memory, SkillTracker | Cannot extract Zoix as standalone without these |
| `store.ts` | Provider pricing hardcoded (lines 27-158) | Price updates require code change |
| `preload.ts` | ~500 lines of IPC bridge | Every feature addition touches this file |

### Comparison to Goose Architecture

| Aspect | Goose | Flowrider | Recommendation |
|--------|-------|-----------|----------------|
| Core language | Rust | TypeScript | Keep TS for velocity, consider WASM for perf-critical routing |
| Provider abstraction | Trait-based | Class methods | Define explicit `AIProvider` interface |
| Extension model | MCP protocol | IPC handlers | Adopt MCP for tool extensibility |
| Terminal | Built-in PTY | tmux dependency | Consider embedded PTY (xterm.js + node-pty) |

**What to borrow from Goose:**
1. Explicit provider trait/interface pattern
2. MCP protocol for tool integration (partially present in Flowrider)
3. Cleaner separation of core vs UI

### Scores

| Area | Score |
|------|-------|
| Architecture clarity | **ADEQUATE** |
| Provider abstraction | **ADEQUATE** |
| State recovery | **ADEQUATE** |
| Modularity | **WEAK** |
| Extensibility | **WEAK** |

### Top 3 Risks
1. **Single file sprawl** - `store.ts` (1400+ lines), `preload.ts` (1200+ lines) are becoming unmaintainable
2. **tmux dependency** - Hard to test, platform-limited, requires external install
3. **Zoix entanglement** - Cannot deploy Zoix independently without bundling entire AI core

### Top 3 Quick Wins
1. **Extract provider interface** - Create `src/main/providers/Provider.ts` interface
2. **Split store.ts** - Separate session, cost, and ZOIX state into slices
3. **Add architecture tests** - Dependency graphs to enforce module boundaries

---

## EXPERT 2 — AI ROUTING SPECIALIST (ZOIX DEEP-DIVE)

### How Does Zoix Route Tasks Today?

**Primary Location:** `src/main/ai-core/ZoixIntelligence.ts` (lines 1-450+)

**Current State: HEURISTIC-BASED, NOT LEARNED**

The routing decision is made via `getSuggestions()` and `getAISuggestions()` methods:

```typescript
// ZoixIntelligence.ts:178-220 (approximate)
getSuggestions(request?: SuggestionRequest): Suggestion[] {
  const suggestions: Suggestion[] = [];

  // 1. Pattern-based suggestions from Memory
  const patterns = this.memory.getHighConfidencePatterns(0.7);

  // 2. Heuristic rules based on context
  if (request?.recentErrors?.length) {
    suggestions.push(this.createErrorSuggestion(request.recentErrors));
  }

  // 3. Project-specific suggestions
  if (request?.projectId) {
    const projectContext = this.memory.getInteractionsByProject(request.projectId);
    // ... derive suggestions
  }

  return this.rankSuggestions(suggestions);
}
```

**Verdict:** Routing is currently:
- **Heuristic** - Based on hardcoded rules (if error → suggest X)
- **Pattern-matched** - Uses stored patterns but doesn't learn model preferences
- **NOT ML-based** - No learned weights, no model selection optimization

### Task Features Captured

**Location:** `src/main/SessionMonitor.ts` (lines 26-80), `src/main/ai-core/Memory.ts` (lines 22-36)

Features logged per task:
| Feature | Captured | Location |
|---------|----------|----------|
| Prompt text | Yes | `Memory.ts:29` - stored as string |
| Prompt hash | Yes | `Memory.ts:28` - for deduplication |
| Response text | Yes | `Memory.ts:30` |
| Prompt length (tokens) | **NO** | Missing - critical gap |
| File types | Yes | `SessionMonitor.ts:77-83` - extracted from response |
| Task category | **NO** | Not explicitly categorized |
| Outcome | Yes | `Memory.ts:31` - success/failure/partial/unknown |
| User feedback | Yes | `Memory.ts:32` - -1 to 1 scale |
| Errors caught | Yes | `Memory.ts:35` |
| Files affected | Yes | `Memory.ts:34` |

### FEEDBACK LOOP - THE #1 GAP

**Assessment:** **MISSING CRITICAL TELEMETRY**

The current schema (`Memory.ts:114-128`) does NOT capture:
- **Which model was used** for each interaction
- **Tokens in/out** per request
- **Retry count** per task
- **Wall time** per task
- **Provider selected** vs alternatives considered

**Required Telemetry Schema for Learning:**

```sql
CREATE TABLE task_outcomes (
  id TEXT PRIMARY KEY,
  interaction_id TEXT NOT NULL,
  model_used TEXT NOT NULL,          -- 'claude-opus-4', 'gpt-4o-mini', etc.
  provider TEXT NOT NULL,            -- 'claude', 'openai', 'ollama'
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  retry_count INTEGER DEFAULT 0,
  wall_time_ms INTEGER NOT NULL,
  outcome TEXT NOT NULL,             -- 'success', 'failure', 'partial'
  user_feedback REAL,                -- -1 to 1
  estimated_cost_usd REAL,
  estimated_wh REAL,
  task_category TEXT,                -- 'code_gen', 'debugging', 'refactor', 'test'
  complexity_estimate REAL,          -- 0-1 predicted complexity
  timestamp INTEGER NOT NULL,

  FOREIGN KEY (interaction_id) REFERENCES interactions(id)
);

CREATE INDEX idx_task_outcomes_model ON task_outcomes(model_used);
CREATE INDEX idx_task_outcomes_category ON task_outcomes(task_category);
```

### Does Accounting Include Retries?

**Answer: NO**

Searching the codebase for retry logic:
- `AIService.ts` has no explicit retry handling
- `Memory.ts` has no `retry_count` field
- Cost calculations in `store.ts` (lines 27-158) are per-token, not per-attempt

**Risk:** A cheap model that fails 3x costs more than one strong-model shot, but this is not tracked.

### How is "Watts" Estimated?

**Location:** `src/renderer/store.ts` (lines 15-158)

```typescript
// store.ts:15-158
interface ProviderProfile {
  wattsPerMToken: number; // Estimated watt-hours per million tokens
  // ...
}

// Examples:
{ provider: 'anthropic', wattsPerMToken: 0.5 },  // datacenter GPU
{ provider: 'openai', wattsPerMToken: 0.4 },
{ provider: 'local', wattsPerMToken: 0.01 },      // laptop only
```

**Methodology:**
- Fixed multiplier per provider (NOT per model)
- Local models assumed 0.01 Wh/MTok
- Cloud models assumed 0.2-0.5 Wh/MTok

**Assessment: WEAK**
- Estimation is crude (all Claude models share one value)
- No documentation of source for these estimates
- Local vs cloud not dynamically detected
- No consideration of GPU type, batch size, or datacenter PUE

### Cold-Start Problem

**How does Zoix route a task type it's never seen?**

**Answer:** Falls back to default heuristics:
- `ZoixIntelligence.ts:getSessionStartSuggestions()` provides generic suggestions
- No explicit cold-start handling
- New task types get whatever model the user last selected

**Risk:** First-time tasks may waste money on wrong model choice.

### Eval Harness for Routing Quality

**Answer: MISSING**

- No offline evaluation suite
- No A/B testing infrastructure
- No replay capability for historical routing decisions
- `src/main/ai-core/` has no test files for routing logic

### Scores

| Area | Score |
|------|-------|
| Routing decision logic | **WEAK** (heuristic only) |
| Task feature extraction | **ADEQUATE** |
| Feedback loop | **MISSING** |
| Retry accounting | **MISSING** |
| Watts estimation | **WEAK** |
| Cold-start handling | **WEAK** |
| Eval harness | **MISSING** |

### Top 3 Risks
1. **No model selection feedback loop** - Cannot learn optimal routing without outcome-per-model data
2. **Retry cost blind spot** - Cheap model failures invisible in accounting
3. **Energy estimates are fiction** - No verifiable source, no per-model granularity

### Top 3 Quick Wins
1. **Add `task_outcomes` table** - Schema above, populate on every AI call
2. **Log model_used + tokens** - Modify `AIService.call()` return value to include these
3. **Create routing baseline** - Log "always-use-Claude-Opus" cost for comparison metric

---

## EXPERT 3 — SECURITY ENGINEER

### API Key Storage & Handling

**Location:** `src/main/AIService.ts`, `src/main/preload.ts`

**Storage:**
- Keys loaded via `ipcRenderer.invoke('ai:setApiKey', provider, key)`
- Stored in Electron's user data directory (NOT VERIFIABLE where exactly without tracing `main.ts`)
- **Not visible in git** - `.gitignore` excludes `.env`, `.env.local`

**Git History Risk:**
```bash
$ grep -r "ANTHROPIC_API_KEY\|OPENAI_API_KEY" .
# No results in committed code
```
**Assessment: ADEQUATE** - Keys not committed, but storage location should use OS keychain.

**Recommendation:** Use `electron-store` with encryption or OS keychain (`keytar`).

### Terminal Session Sandboxing

**Location:** `src/main/TmuxManager.ts`

**Current state: NO SANDBOXING**

```typescript
// TmuxManager.ts:89-110 (approximate)
async createSession(name: string, workingDir: string) {
  const result = await this.runTmux([
    'new-session', '-d', '-s', name, '-c', workingDir
  ]);
  // ...
}
```

**Risks:**
- Sessions run with full user privileges
- No resource limits (CPU, memory, disk)
- No network isolation
- Model-generated commands can: read any file, write anywhere, install packages, exfiltrate data

**Assessment: WEAK**

**Mitigation options:**
1. Run tmux sessions in Docker containers
2. Use macOS sandbox profiles
3. Add command whitelist/approval flow

### Prompt Injection Risk

**Scenario:** Model output fed to another model or shell

**Analysis:**
- `SessionMonitor.ts` parses terminal output but does not re-inject
- `AIService.call()` takes messages directly, no sanitization
- Cross-session context (`CrossSessionAwareness`) could theoretically carry malicious prompts

**Assessment: ADEQUATE** - No obvious injection vectors in current flow, but:
- No output sanitization
- No structured output parsing (raw strings everywhere)

### Multi-Session Isolation

**Question:** Can one session read another's data?

**Analysis:**
- All sessions share same tmux server
- All sessions share same SQLite databases
- `Memory.ts` stores interactions indexed by `session_id`, but no access control
- IPC handlers in `preload.ts` do not validate session ownership

**Assessment: WEAK** - Sessions are logically separate but not security-isolated.

### Dependency Audit

```bash
$ npm audit
# Results:
brace-expansion: HIGH (DoS via unbounded expansion) - 4 vulnerabilities
  Affected: brace-expansion <1.1.17, >=2.0.0 <2.1.4, >=4.0.0 <5.0.9
  CVE: CVE-2026-14257, GHSA-mh99-v99m-4gvg, GHSA-rgw5-rvv9-x895
```

**Assessment: WEAK** - High-severity vulnerabilities present. Run `npm audit fix`.

### Auth on API/UI Surface

**Location:** `src/main/api/` (if present), landing page

**Analysis:**
- `preload.ts:443-448` exposes `api:getStatus`, `api:start`, `api:stop`
- API server config includes `apiKeyRequired` flag
- Landing page at `flowrider.dev` - NOT VERIFIABLE from codebase what it serves

**Local app:** No auth needed (single user)
**If API server enabled:** Should require auth key

### Scores

| Area | Score |
|------|-------|
| API key storage | **ADEQUATE** |
| Git history safety | **STRONG** |
| Session sandboxing | **WEAK** |
| Prompt injection | **ADEQUATE** |
| Session isolation | **WEAK** |
| Dependency security | **WEAK** |
| API auth | **ADEQUATE** |

### Top 3 Risks
1. **No terminal sandboxing** - AI-generated commands have full system access
2. **High-severity npm vulnerabilities** - DoS vector via brace-expansion
3. **Session data not isolated** - One session could query another's history

### Top 3 Quick Wins
1. **Run `npm audit fix`** - Resolve brace-expansion vulnerabilities
2. **Add session ownership checks** - Validate `sessionId` belongs to requester in IPC handlers
3. **Document security model** - Make explicit what the app does/doesn't protect against

---

## EXPERT 4 — ENERGY & COST ACCOUNTANT

### Task Lifecycle Compute Points

Tracing a full task from prompt to completion:

```
1. [UI] User types prompt → store.ts
2. [IPC] Send to main process → preload.ts
3. [ROUTING] ZoixIntelligence.getSuggestions() → ~1ms, no model call
4. [CALL] AIService.call() → external API call
   - HTTP request overhead
   - Model inference (bulk of compute)
   - Response streaming
5. [MONITOR] SessionMonitor captures output → ~0ms (parsing)
6. [STORE] Memory.saveInteraction() → SQLite write
7. [LEARN] KnowledgeGraph.extractConcepts() → ~1ms (regex/NLP)
8. [RENDER] Update UI → React re-render
```

**Major compute consumers:**
1. **Model inference** - 95%+ of compute, external to Flowrider
2. **Zoix routing** - Currently heuristic, near-zero compute
3. **SQLite writes** - Negligible
4. **Knowledge extraction** - Negligible

### Cost/Energy Persistence

**Question:** Is cost/energy per task persisted anywhere queryable?

**Location:** `src/renderer/store.ts` (lines 238-241, 560-570)

```typescript
interface EnergyMetrics {
  totalEnergy: number;
  baselineEnergy: number;
  energySaved: number;
  energyByProject: Record<string, number>;
  energyBySession: Record<string, number>;
  dailyEnergy: Array<{ date: string; energy: number; tokens: number }>;
}
```

**Assessment:**
- Energy is calculated and stored in Zustand store
- Persisted via `persist` middleware to IndexedDB
- **NOT in SQLite** - Cannot query historical energy with SQL
- `dailyEnergy` array exists but NOT VERIFIABLE if it's actually populated

**Could you answer "what did yesterday cost?"**
- **Partially** - `dailyEnergy` array should have this, but implementation unclear
- Need to verify `trackCost` action actually writes to it

### Are Zoix's Own Inference Costs Counted?

**Analysis:**
- Zoix routing is currently heuristic (no model calls)
- `ZoixIntelligence.ts` does not call external AI for routing decisions
- Future: If Zoix uses AI for routing, this cost is NOT currently tracked separately

**Assessment: NOT APPLICABLE** (Zoix doesn't use AI inference today)

### Proposed Ledger Table

Current state: **MISSING**

Required schema:

```sql
CREATE TABLE cost_ledger (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  session_id TEXT NOT NULL,
  project_id TEXT,
  model TEXT NOT NULL,
  provider TEXT NOT NULL,
  tokens_in INTEGER NOT NULL,
  tokens_out INTEGER NOT NULL,
  retries INTEGER DEFAULT 0,
  outcome TEXT NOT NULL,
  cost_usd REAL NOT NULL,
  est_wh REAL NOT NULL,
  timestamp INTEGER NOT NULL
);

CREATE INDEX idx_ledger_timestamp ON cost_ledger(timestamp);
CREATE INDEX idx_ledger_project ON cost_ledger(project_id);
```

**Does anything like it exist?**
- `interactions` table has prompt/response but NOT tokens/cost
- Store has `costMetrics` but in-memory only
- **GAP: No persistent per-task cost ledger**

### Cheapest Headline Metric

**Goal:** "Zoix routing saved N% tokens vs always-use-strongest baseline"

**Implementation:**
1. On each task, calculate `baselineCost = tokens * ClaudeOpusRate`
2. Calculate `actualCost = tokens * actualModelRate`
3. `savings = (baselineCost - actualCost) / baselineCost * 100`

**Is baseline measurable today?**
- **Partially** - Provider rates are in `store.ts`
- Missing: tokens per task, model used per task

**Estimated effort:** 2-3 hours to add token tracking, 1 hour for savings calculation

### Scores

| Area | Score |
|------|-------|
| Task lifecycle tracking | **ADEQUATE** |
| Cost persistence | **WEAK** |
| Energy persistence | **WEAK** |
| Zoix cost accounting | **NOT APPLICABLE** |
| Ledger table | **MISSING** |
| Savings baseline | **WEAK** |

### Top 3 Risks
1. **No persistent cost ledger** - Cannot audit historical spend
2. **Tokens not tracked per task** - Cannot calculate actual savings
3. **Energy estimates in UI only** - Lost on app reset/reinstall

### Top 3 Quick Wins
1. **Add `cost_ledger` table** - Schema above, ~2 hours
2. **Return tokens from AIService.call()** - Modify to return `{ content, tokensIn, tokensOut }`
3. **Add savings dashboard** - Show "X% saved vs always-Opus" on Dashboard

---

## EXPERT 5 — TERMINAL / SESSION INFRASTRUCTURE ENGINEER

### Session Spawning Method

**Location:** `src/main/TmuxManager.ts`

```typescript
// TmuxManager.ts:89-125 (approximate)
async createSession(name: string, faceIndex: number, workingDir: string, options?: SessionOptions) {
  // 1. Validate tmux is installed
  // 2. Create detached tmux session
  const result = await this.runTmux([
    'new-session', '-d', '-s', name, '-c', workingDir
  ]);

  // 3. Optionally launch Claude Code CLI
  if (!options?.skipClaude) {
    await this.sendCommand(name, 'claude');
  }
}
```

**Technology:** tmux with subprocess execution via `child_process.exec`

**Resource limits:** **NONE**
- No CPU limits
- No memory limits
- No disk quota
- No timeout

### Concurrency Analysis

**At 5 sessions:**
- tmux handles this easily
- Electron main process: single-threaded, IPC serialized
- Potential bottleneck: SQLite writes (WAL mode helps)

**At 20 sessions (design target):**
- tmux: likely fine
- Polling in SessionMonitor: 20 sessions × 2s interval = manageable
- UI: React should handle 20 cards

**At 50 sessions:**
- tmux: unknown (not tested)
- SessionMonitor polling: 50 × 2s = potential CPU spike
- UI: SessionGrid may lag

**Assessment:** Designed for 20, untested beyond.

### Streaming Architecture

**Location:** `src/main/preload.ts` (lines 456-479)

```typescript
// PTY Streaming (replaces tmux capture-pane polling for TUI apps)
pty: {
  attach: (sessionName, cols, rows) => ipcRenderer.invoke('pty:attach', ...),
  detach: (sessionName) => ipcRenderer.invoke('pty:detach', ...),
  onData: (callback) => {
    ipcRenderer.on('pty:data', (event, sessionName, data) => callback(...));
  }
}
```

**Method:** WebSocket-like IPC events (not actual WebSockets)

**Backpressure:** **NOT VERIFIABLE** - No explicit backpressure handling visible

**Potential issue:** If AI generates output faster than UI can render, buffer could grow unbounded.

### Session Lifecycle

| Phase | Implementation | Cleanup |
|-------|---------------|---------|
| Creation | `tmux new-session -d` | - |
| Idle | No timeout | Sessions persist indefinitely |
| Kill | `tmux kill-session` | - |
| Crash | tmux sessions survive | App reconnects on restart |

**Zombie process risk:**
- tmux sessions are detached, survive parent crash
- `syncWithTmux()` reconnects on startup
- **Risk:** Orphaned Claude Code processes if not cleanly killed

### Log/Transcript Capture

**Location:** `src/main/SessionMonitor.ts` (lines 229-256)

```typescript
async pollSession(sessionName: string): Promise<void> {
  const result = await this.getOutput(sessionName, 500); // Last 500 lines
  // ... process new content
}
```

**Assessment:**
- Transcripts ARE captured (via polling)
- Stored in `Memory.saveInteraction()`
- **Training data preserved:** Yes, in `interactions` table

**Gap:** Rolling buffer (500 lines) means early output may be lost in long sessions.

### Scores

| Area | Score |
|------|-------|
| Session spawning | **ADEQUATE** |
| Resource limits | **MISSING** |
| Concurrency (20) | **ADEQUATE** |
| Streaming | **ADEQUATE** |
| Session cleanup | **ADEQUATE** |
| Transcript capture | **ADEQUATE** |

### Top 3 Risks
1. **No resource limits** - Runaway AI could consume all CPU/memory
2. **No idle timeout** - Zombie sessions accumulate
3. **500-line buffer** - Long sessions lose early context

### Top 3 Quick Wins
1. **Add session timeout** - Kill idle sessions after 1 hour
2. **Increase capture buffer** - 500 → 5000 lines or use scrollback file
3. **Add health check** - Periodic "is Claude still responsive?" ping

---

## EXPERT 6 — DX & PRODUCT REVIEWER

### Fresh-Clone Test

Following only the README:

```bash
# Step 1: Clone
git clone https://github.com/josephas-llc/flowrider.git
cd flowrider

# Step 2: Install dependencies
npm install
# ✓ Success (with brace-expansion warnings)

# Step 3: Run
npm run dev
```

**Stumbles encountered:**

1. **tmux not installed** - README mentions `brew install tmux` but it's easy to miss
2. **No API keys configured** - App launches but AI calls fail silently
3. **First-time UX** - Icosahedron is cool but confusing without guidance
4. **Welcome Wizard** - Exists! (`WelcomeWizard.tsx`) but NOT VERIFIABLE if it auto-shows

**Assessment:** **ADEQUATE** - Could reach running app in ~5 minutes

### Zoix Routing Visibility

**Question:** Does the user see "routed to X because Y, est. Z tokens saved"?

**Analysis:**
- `ZoixIndicator.tsx` shows Zoix status in nav bar
- `ZoixInsightsPanel.tsx` shows suggestions
- **Routing reasoning:** NOT VERIFIABLE - No explicit "routed because" message found

**Assessment: WEAK** - User doesn't see the routing decision. This is the product's core value proposition and it's invisible!

### 2-Minute Demo Path

**Goal:** Show watts-saving thesis quickly

**Current path:**
1. Launch app (30s)
2. Create 2 sessions - one with Claude, one with local Ollama (60s)
3. Run same task in both (30s)
4. Compare... where?

**Gap:** No side-by-side cost comparison view

**Proposed path:**
1. Launch app → Demo mode auto-creates 3 sessions
2. Same task runs on Claude/GPT/Ollama in parallel
3. Dashboard shows: "$0.15 vs $0.08 vs $0.00 → You saved $0.15"

### Naming/Config Contamination

**Issue flagged:** "Nightjar API" meta tags on flowrider.dev

**Analysis:**
- `landing/index.html` - Has correct Flowrider branding
- **No "Nightjar" found** in checked files

**Assessment: NOT VERIFIABLE** from codebase - may be deployment config issue

### Open Source Readiness

| Element | Status |
|---------|--------|
| README | **STRONG** - Comprehensive |
| LICENSE | MIT - **STRONG** |
| CONTRIBUTING.md | Mentioned but NOT VERIFIABLE if exists |
| Code of Conduct | **MISSING** |
| Issue templates | **MISSING** |
| CI/CD | **MISSING** (no .github/workflows visible) |
| Test coverage | **WEAK** (2 test files found) |

### Scores

| Area | Score |
|------|-------|
| Fresh-clone experience | **ADEQUATE** |
| Routing visibility | **WEAK** |
| Demo path clarity | **WEAK** |
| Config cleanliness | **NOT VERIFIABLE** |
| Open-source readiness | **ADEQUATE** |

### Top 3 Risks
1. **Core value invisible** - Zoix savings not shown to user
2. **No demo mode** - Hard to showcase in 2 minutes
3. **Missing CI/CD** - No automated quality gates

### Top 3 Quick Wins
1. **Add routing toast** - "Routed to GPT-4o-mini (est. $0.02 saved)"
2. **Create AutoDemo** - One-click demo that shows parallel sessions + savings
3. **Add GitHub Actions** - Lint + test on PR

---

## EXPERT 7 — INDUSTRIAL / OCCUPATIONAL PSYCHOLOGIST

### Cognitive Load Analysis

**Walking the UI flow:** `src/renderer/App.tsx`

**Elements requiring simultaneous attention:**
1. Session pills in nav (up to 20)
2. Selected session's terminal output
3. ZOIX indicator (learning status)
4. Cost metrics in nav
5. Session panel (if open)
6. Notifications (ZoixNotificationContainer)

**Load reduction mechanisms:**
| Mechanism | Present | Effectiveness |
|-----------|---------|---------------|
| Status indicators | Yes (pill colors) | **ADEQUATE** |
| Summaries | Partial (Dashboard) | **WEAK** |
| Notifications | Yes (toast) | **ADEQUATE** |
| Grouping/Folders | No | **MISSING** |

**Assessment:** At 20 sessions, user must mentally track:
- Which sessions are active
- What each is working on
- Which need attention

**Miller's Law violation:** 7±2 items is human working memory limit. 20 sessions exceeds this by 3x.

### Trust Calibration

**Question:** When Zoix routes, does user get enough signal to trust without re-checking?

**Current state:**
- User doesn't see routing decision (see Expert 6)
- No confidence score shown
- No "why" explanation
- No track record visible ("Zoix has been 94% accurate")

**Calibration risk:**
- **Over-trust:** User may assume Zoix is working when it's not
- **Under-trust:** User may manually select models, negating Zoix value

**Assessment: WEAK** - No trust signals provided

### Interruption Cost

**How is user pulled in when session needs input?**

**Location:** `src/renderer/store.ts` - `needsAttention` flag

```typescript
interface Session {
  needsAttention: boolean;
  // ...
}
```

**UI indication:** `session-pill.attention` class (red/pulsing)

**Assessment:**
- Visual indicator exists
- No sound/system notification
- No batch queue ("3 sessions need you")
- Context switch cost: **HIGH** - user must read terminal to understand what's needed

### Agency Assessment

**Conductor vs Babysitter spectrum:**

| Moment | User Role | Agency Level |
|--------|-----------|--------------|
| Session creation | Conductor | HIGH - chooses project, model |
| Task running | Observer | LOW - watching AI work |
| Error handling | Babysitter | LOW - must diagnose and fix |
| Routing decision | Absent | NONE - Zoix decides invisibly |

**Assessment: MIXED** - Strong agency at setup, weak during execution

### Top 3 Frustration Points

1. **"What is session 7 doing right now?"** - Must click into each session to see status
   - Telemetry: Track time spent clicking between sessions

2. **"Why did that fail?"** - Error messages buried in terminal output
   - Telemetry: Track error-to-resolution time

3. **"Am I actually saving money?"** - Savings not visible in flow
   - Telemetry: Track Dashboard visits vs time-in-app

### Scores

| Area | Score |
|------|-------|
| Cognitive load management | **WEAK** |
| Trust calibration | **WEAK** |
| Interruption handling | **ADEQUATE** |
| User agency | **ADEQUATE** |
| Anxiety prevention | **WEAK** |

### Top 3 Risks
1. **20 sessions exceeds cognitive capacity** - User will lose track
2. **Invisible AI decisions erode trust** - Users won't know if Zoix is helping
3. **High context-switch cost** - Each interruption is expensive

### Top 3 Quick Wins
1. **Add session summaries** - One-line "Building auth API... 73% done"
2. **Show Zoix confidence** - "Routed to Sonnet (87% confident)"
3. **Add attention queue** - "3 sessions need you: [Auth] [Tests] [CSS]"

---

## EXPERT 8 — GAME DESIGNER (FLOW & FEEDBACK)

### Flow Conditions Assessment

**Csikszentmihalyi's Flow Requirements:**

| Condition | Score | Evidence |
|-----------|-------|----------|
| Clear goals | **ADEQUATE** | Each session has a task |
| Immediate feedback | **WEAK** | AI response latency 2-30s, no progress indicator |
| Challenge-skill balance | **NOT APPLICABLE** | User is orchestrating, not performing |

**Dead air analysis:**

```
User sends prompt
   ↓
[WAITING - 0.5s] IPC overhead
   ↓
[WAITING - 2-30s] Model inference  ← FLOW KILLER
   ↓
[WAITING - 0.2s] Response parsing
   ↓
Output appears
```

**During model inference:** User sees nothing. No spinner, no "thinking...", no streaming preview.

### Feedback Juice

**What does user SEE when things go right?**

**Current state:**
- Terminal shows AI output (text)
- Cost counter increments (small text in nav)
- Session status changes (`active` → `attached`)

**What's missing:**
- No success animation
- No completion sound
- No "task done" celebration
- Session just... stops outputting

**Assessment: WEAK** - Completing a multi-session run is anticlimactic

### Progression System

**Does user get visibly better over time?**

**Location:** `src/main/ai-core/SkillTracker.ts`

**SkillTracker captures:**
- Skill levels (novice → intermediate → proficient → expert)
- Milestones ("First Steps", "Centurion", "Speed Demon")
- Progression analysis

**But is it visible?**
- `ZoixInsightsPanel.tsx` - Shows some insights
- **Skill level display:** NOT VERIFIABLE in UI
- **Savings counter as score:** Present in nav but tiny

**Assessment: ADEQUATE infrastructure, WEAK visibility**

### Legibility of the Invisible

**"Watts and tokens are abstract. What's the metaphor?"**

**Current metaphors:**
- Icosahedron (20 faces = 20 sessions) - Visual but doesn't convey energy
- Cost as dollars - Concrete but not emotional

**Proposed metaphor - "River Flow":**
```
Sessions are streams. Heavy compute = fast, turbulent water.
Light compute (local models) = calm, sustainable flow.
Dashboard shows: "Today's flow rate: 2.3 kWh"
              "Calm mode saved: 1.8 kWh (78%)"
```

**Assessment: MISSING** - No metaphor for energy/sustainability

### The "Show a Friend" Moment

**What would make a dev show their screen?**

**Candidates:**
1. Icosahedron rotating with 20 active sessions - visually impressive
2. Side-by-side cost comparison - "I just saved $14 today"
3. Skill level-up notification - "You reached Expert in TypeScript!"

**Current gap:** No single "wow" moment that screenshots well.

**Proposed moment:**
```
[LEVEL UP ANIMATION]
"You've reached PROFICIENT in TypeScript"
"847 successful interactions • 94% success rate"
"Zoix routing saved you $47.23 this month"
[Share button] [Dismiss]
```

### Scores

| Area | Score |
|------|-------|
| Clear goals | **ADEQUATE** |
| Immediate feedback | **WEAK** |
| Feedback juice | **WEAK** |
| Progression visibility | **WEAK** |
| Energy metaphor | **MISSING** |
| Shareable moment | **WEAK** |

### Top 3 Risks
1. **Dead air during inference** - User disengages
2. **No celebration of success** - Missing dopamine hit
3. **Progression is invisible** - No motivation loop

### Top 3 Quick Wins
1. **Add typing indicator** - "Claude is thinking..." with animation
2. **Celebration toast on completion** - "Task complete! Saved $0.23"
3. **Weekly digest email/notification** - "This week: 147 tasks, $34 saved, Expert in React"

---

## EXPERT 9 — TASTE & SOUL REVIEW ("STEVE JOBS" LENS)

### THE POINT

**State Flowrider's purpose in one sentence:**

| Source | Implied Sentence |
|--------|------------------|
| README | "Run 20 AI coding sessions simultaneously" |
| Landing page | "Stop losing 80% of your day to context-switching" |
| ZOIX docs | "Smart routing saves 60-80% on AI costs" |
| UI (icosahedron) | "Be the air traffic controller for AI" |

**Assessment: DRIFT DETECTED**

The codebase implies 4 different value propositions:
1. **Multiplicity** - 20 sessions
2. **Context-switching** - Stop losing time
3. **Cost savings** - Zoix routing
4. **Control** - Air traffic controller

**Recommendation:** Pick ONE. Suggested: "Your work costs less of the world."

### First 90 Seconds

**From launch to magic moment:**

| Step | Time | Decision Tax |
|------|------|--------------|
| 1. App launches | 3s | None |
| 2. Welcome wizard? | 10s | Skip or proceed? |
| 3. See icosahedron | 0s | Where do I click? |
| 4. Click face | 2s | None |
| 5. Session panel opens | 1s | Name it? Model? Working dir? |
| 6. Configure session | 30s | 3 decisions: name, model, directory |
| 7. Claude launches | 5s | Wait |
| 8. Type prompt | 15s | What to ask? |
| 9. Wait for response | 20s | Nothing to do |
| **Total** | **86s** | **4-5 decisions** |

**Tax:** 4-5 decisions before seeing any AI output

**What can be deferred/defaulted:**
- Name → Auto-generate ("Session 1")
- Model → Default to Zoix (auto-route)
- Directory → Current working directory or last-used

### SAY NO

**Features/surfaces that dilute the core:**

| Feature | Core-aligned? | Recommendation |
|---------|---------------|----------------|
| Icosahedron 3D viz | Partially (cool but distracting) | Make optional, default to grid |
| LEO Mode (400 agents) | Future scope | Remove from MVP |
| Deploy panel | Tangential | Remove or hide |
| MCP integration | Power user | Hide in settings |
| License panel | Necessary evil | Minimize |
| Voice control | Experimental | Remove from MVP |
| Cinematic demo | Marketing | Keep but refine |

**What to CUT:**
1. LEO Mode references - Future, not MVP
2. Deploy panel - Not core to routing thesis
3. Voice control - Unpolished, confusing

### DOES IT MAKE A DENT?

**"Saves watts" = engineering claim**
**"Your work costs less of the world" = meaning claim**

**Current state:**
- Engineering claim is in docs, dashboard
- Meaning claim is **nowhere visible**
- User never feels environmental impact

**Where could meaning show?**
```
"This session: 0.02 kWh
 That's equivalent to: 30 seconds of a lightbulb
 Zoix routing saved: 0.15 kWh (7.5x reduction)"
```

**Assessment: MISSING** - The "dent" is a log file, not an experience

### CREATIVITY TEST

**After Flowrider absorbs the toil, what does user do with reclaimed attention?**

**Current design:** More queue-tending
- User creates 20 tasks
- User monitors 20 tasks
- User fixes errors in 20 tasks

**Alternative design:** Creation space
```
"All 20 sessions running smoothly.
 Zoix is handling 94% of decisions.

 [You have 47 minutes back today]

 What would you like to create?
 ____________________________

 Or review what your agents learned: [View Insights]"
```

**Assessment: WEAK** - The product is a control panel, not a creative amplifier

### The Jobs Question

**Would I be proud to demo this to the most discerning person I know?**

**Honest answer: Not yet.**

**What's impressive:**
- 20 sessions is genuinely novel
- Icosahedron is visually distinctive
- Learning infrastructure is sophisticated

**What's embarrassing:**
- Core value (savings) is invisible
- No "aha" moment
- Feels like a dashboard, not a product

**Single change to close the gap:**

> **Add a "Savings Live" indicator that pulses whenever Zoix makes a routing decision, showing exactly how much was saved and why.**

This makes the invisible visible, creates micro-celebrations, and proves the thesis in real-time.

### Scores

| Area | Score |
|------|-------|
| The Point (clarity) | **WEAK** |
| First 90 seconds | **ADEQUATE** |
| Say No (focus) | **WEAK** |
| Making a Dent | **MISSING** |
| Creativity enablement | **WEAK** |
| Pride-in-demo | **WEAK** |

### Top 3 Risks
1. **Identity crisis** - 4 value propositions competing
2. **Meaning buried** - "Saves watts" invisible
3. **Over-featured MVP** - Too much, nothing polished

### Top 3 Quick Wins
1. **One sentence everywhere** - "Your work costs less of the world" in nav, about, everywhere
2. **Live savings pulse** - Visual + sound when Zoix saves money
3. **Cut LEO, Deploy, Voice** - Focus on core routing story

---

## SYNTHESIS

### 1. SCORECARD

| Area | Expert | Score |
|------|--------|-------|
| Architecture clarity | 1 | ADEQUATE |
| Provider abstraction | 1 | ADEQUATE |
| State recovery | 1 | ADEQUATE |
| Modularity | 1 | WEAK |
| Extensibility | 1 | WEAK |
| Routing decision logic | 2 | WEAK |
| Task feature extraction | 2 | ADEQUATE |
| Feedback loop | 2 | MISSING |
| Retry accounting | 2 | MISSING |
| Watts estimation | 2 | WEAK |
| Cold-start handling | 2 | WEAK |
| Eval harness | 2 | MISSING |
| API key storage | 3 | ADEQUATE |
| Git history safety | 3 | STRONG |
| Session sandboxing | 3 | WEAK |
| Prompt injection | 3 | ADEQUATE |
| Session isolation | 3 | WEAK |
| Dependency security | 3 | WEAK |
| API auth | 3 | ADEQUATE |
| Task lifecycle tracking | 4 | ADEQUATE |
| Cost persistence | 4 | WEAK |
| Energy persistence | 4 | WEAK |
| Ledger table | 4 | MISSING |
| Savings baseline | 4 | WEAK |
| Session spawning | 5 | ADEQUATE |
| Resource limits | 5 | MISSING |
| Concurrency (20) | 5 | ADEQUATE |
| Streaming | 5 | ADEQUATE |
| Session cleanup | 5 | ADEQUATE |
| Transcript capture | 5 | ADEQUATE |
| Fresh-clone experience | 6 | ADEQUATE |
| Routing visibility | 6 | WEAK |
| Demo path clarity | 6 | WEAK |
| Open-source readiness | 6 | ADEQUATE |
| Cognitive load management | 7 | WEAK |
| Trust calibration | 7 | WEAK |
| Interruption handling | 7 | ADEQUATE |
| User agency | 7 | ADEQUATE |
| Clear goals | 8 | ADEQUATE |
| Immediate feedback | 8 | WEAK |
| Feedback juice | 8 | WEAK |
| Progression visibility | 8 | WEAK |
| Energy metaphor | 8 | MISSING |
| The Point (clarity) | 9 | WEAK |
| First 90 seconds | 9 | ADEQUATE |
| Making a Dent | 9 | MISSING |
| Pride-in-demo | 9 | WEAK |

**Summary:**
- STRONG: 1
- ADEQUATE: 20
- WEAK: 19
- MISSING: 7

### 2. TOP 5 RISKS (Severity × Likelihood)

| Rank | Risk | Experts | Severity | Likelihood | Score |
|------|------|---------|----------|------------|-------|
| 1 | **No feedback loop for routing** - Cannot learn optimal model selection without outcome-per-model telemetry | 2, 4 | Critical | Certain | 10 |
| 2 | **Core value invisible** - Zoix savings not shown to user, can't prove thesis | 6, 7, 8, 9 | High | Certain | 9 |
| 3 | **No terminal sandboxing** - AI-generated commands have full system access | 3, 5 | Critical | Moderate | 8 |
| 4 | **Identity crisis** - 4 competing value propositions dilute message | 9 | High | Certain | 7 |
| 5 | **20 sessions exceeds cognitive capacity** - User will lose track, miss errors | 7, 8 | Moderate | High | 6 |

### 3. TOP 5 MOVES (Leverage × Effort)

| Rank | Move | Experts | Leverage | Effort | ROI |
|------|------|---------|----------|--------|-----|
| 1 | **Add task_outcomes table + log model/tokens per call** - Enables learning, savings calculation, and baseline comparison | 2, 4 | Critical | S (2-4 hours) | Highest |
| 2 | **Add live savings toast** - "Routed to Sonnet, saved $0.12" on every Zoix decision | 6, 8, 9 | High | S (2-3 hours) | Very High |
| 3 | **Cut LEO/Deploy/Voice from MVP** - Focus on core routing story | 9 | High | S (1 hour) | Very High |
| 4 | **Add session summaries in nav** - One-line status per session reduces cognitive load | 7, 8 | Moderate | M (1-2 days) | High |
| 5 | **Run npm audit fix + add dependency bot** - Resolve security vulnerabilities | 3 | Moderate | S (30 min) | High |

### 4. THE ONE THING

**If only one change ships this month:**

> **Add a `task_outcomes` table that logs model used, tokens in/out, cost, and outcome for every AI call—then surface this as a real-time savings indicator.**

**Why this one:**
1. **Enables the learning thesis** - Can't improve routing without outcome data
2. **Enables the savings headline** - "Zoix saved $X" requires knowing what would have been spent
3. **Makes the value visible** - Users see savings in real-time
4. **Low effort** - SQL schema + 2 UI components

Without this, Zoix is a routing system with no learning and no proof it works.

### 5. THE FEELING

**How should a user FEEL after an hour in Flowrider vs an hour of unassisted work?**

**Target feeling:**
> "I'm orchestrating a team of AI agents, each doing exactly what it's best at, while I focus on the creative decisions. I can see exactly how much time and energy I'm saving. When I step back, I feel like a conductor who just led a symphony—many parts, one coherent output, and a sense that I amplified my capabilities without burning out."

**Current feeling:**
> "I have 20 terminals open and I'm trying to remember which one is doing what. The AI is working but I'm not sure if it's the right AI. The icosahedron looks cool but I don't know what's happening inside it. Did I save money? I think so? It says some number in the corner."

**Findings that stand between here and there:**
1. **Routing visibility (Expert 6)** - User doesn't see Zoix's decisions
2. **Cognitive load (Expert 7)** - 20 sessions > human capacity without summaries
3. **Feedback juice (Expert 8)** - No celebration, no progression feel
4. **Making a dent (Expert 9)** - Savings are abstract, not felt
5. **Trust calibration (Expert 7)** - User doesn't know if Zoix is helping

The gap is not technical capability—the infrastructure exists. The gap is **making the invisible visible** and **making the abstract felt**.

---

*Generated by Multi-Expert AI Audit System*
*Claude Opus 4.5 • 2026-08-09*
