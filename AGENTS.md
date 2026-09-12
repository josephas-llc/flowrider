# AGENTS.md - Flowrider AI Agent Architecture

## Overview

Flowrider is a multi-agent orchestration platform that manages concurrent AI coding sessions. Each session runs Claude Code (or other AI providers) in tmux terminals, with ZOIX AI providing cross-session intelligence.

## Agent Hierarchy

```
┌─────────────────────────────────────────────────────────┐
│                      ZOIX (Meta-Orchestrator)            │
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
│                      ZOIX AI                             │
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

### 2. ZOIX AI (Learning Agent)
- **Runtime**: Main Electron process
- **Scope**: Cross-session, persistent
- **Storage**: `~/.flowrider/leo-ai.db` (SQLite)

#### Components:
| Component | File | Purpose |
|-----------|------|---------|
| ZoixMemory | `src/main/leo-ai/ZoixMemory.ts` | SQLite persistence layer |
| ZoixCollector | `src/main/leo-ai/ZoixCollector.ts` | Captures interactions |
| ZoixAnalyzer | `src/main/leo-ai/ZoixAnalyzer.ts` | Pattern detection |
| ZoixDistiller | `src/main/leo-ai/ZoixDistiller.ts` | Knowledge → context |
| ZoixAI | `src/main/leo-ai/ZoixAI.ts` | Main coordinator |
| SessionMonitor | `src/main/SessionMonitor.ts` | Auto-captures tmux interactions |
| ContextInjector | `src/main/ContextInjector.ts` | Prepends learned context to prompts |

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

### 3. ZOIX Meta-Orchestrator (Future)
- **Runtime**: Dedicated process or separate machine
- **Scope**: Multiple Flowrider instances (up to 20 × 20 = 400 sessions)
- **Purpose**: Enterprise-scale AI coordination

## Communication

### IPC Channels (Electron)
```
Renderer ←→ Main Process ←→ tmux sessions
    │              │
    │              └── ZOIX AI (in-process)
    │
    └── window.flowrider.leoai.*
```

### Key APIs:
```typescript
// Session management
window.flowrider.tmux.create(name, faceIndex, workingDir)
window.flowrider.tmux.sendInput(sessionName, data)
window.flowrider.tmux.getOutput(sessionName, lines)

// ZOIX AI learning
window.flowrider.leoai.registerSession(context)
window.flowrider.leoai.recordInteraction(sessionId, prompt, response, metadata)
window.flowrider.leoai.recordFeedback(sessionId, signal)
window.flowrider.leoai.getContext(request)
window.flowrider.leoai.analyze()
```

## Learning Pipeline

```
1. OBSERVE
   └── ZoixCollector captures prompts, responses, outcomes

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
   └── ZoixDistiller injects context into new sessions:
       - Relevant patterns for current task
       - Suggested snippets for language
       - Warnings from past failures
       - Success patterns to follow
```

## Personalization

Each user's ZOIX AI learns from:
- **Their projects**: tenfourOS, flatland, texian, etc.
- **Their coding style**: patterns, preferences, conventions
- **Their problem-solving**: how they fix specific errors
- **Their workflows**: common sequences of actions

This creates a **personalized AI assistant** unique to each user.

## File Locations

| Path | Purpose |
|------|---------|
| `~/.flowrider/` | App data directory |
| `~/.flowrider/leo-ai.db` | ZOIX AI learning database |
| `~/.flowrider/flowrider.db` | Session/project data |
| `~/.flowrider/config.json` | User configuration |

## UI Components

### Feedback System
The SessionPanel includes thumbs up/down buttons for rating AI responses:
- **Location**: `src/renderer/components/SessionPanel.tsx`
- **Signal**: Sends positive (1) or negative (-1) feedback to ZOIX AI
- **Purpose**: Helps ZOIX AI learn what works for you

### ZOIX AI Dashboard
View learning stats, patterns, and insights:
- **Location**: `src/renderer/components/ZoixAIView.tsx`
- **Features**: Stats overview, pattern browser, interaction history

## Maintenance Commands

### Debloating the ZOIX AI Database

**Philosophy**: Optimize and deduplicate without losing valuable knowledge. Never delete unique insights.

```bash
# ==========================================
# ALWAYS BACKUP FIRST
# ==========================================
cp ~/.flowrider/leo-ai.db ~/.flowrider/leo-ai.db.backup

# View database size and stats
ls -lh ~/.flowrider/leo-ai.db
sqlite3 ~/.flowrider/leo-ai.db "SELECT 'interactions:', COUNT(*) FROM interactions UNION ALL SELECT 'patterns:', COUNT(*) FROM patterns UNION ALL SELECT 'insights:', COUNT(*) FROM insights UNION ALL SELECT 'snippets:', COUNT(*) FROM snippets;"

# ==========================================
# SAFE: Remove duplicates (keeps newest)
# ==========================================
# Remove duplicate interactions (same prompt_hash, keep the one with best feedback)
sqlite3 ~/.flowrider/leo-ai.db "
DELETE FROM interactions WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY prompt_hash
      ORDER BY COALESCE(user_feedback, 0) DESC, timestamp DESC
    ) as rn
    FROM interactions
  ) WHERE rn = 1
);"

# ==========================================
# SAFE: Clean junk data (preserves learnings)
# ==========================================
# Remove interactions with empty prompts or responses
sqlite3 ~/.flowrider/leo-ai.db "DELETE FROM interactions WHERE prompt = '' OR response = '' OR prompt IS NULL OR response IS NULL;"

# Remove interactions that are just whitespace
sqlite3 ~/.flowrider/leo-ai.db "DELETE FROM interactions WHERE TRIM(prompt) = '' OR TRIM(response) = '';"

# Remove patterns with no occurrences or zero confidence
sqlite3 ~/.flowrider/leo-ai.db "DELETE FROM patterns WHERE occurrences = 0 OR confidence = 0;"

# ==========================================
# SAFE: Consolidate patterns (merges similar)
# ==========================================
# Merge duplicate patterns (same name and type, keep highest confidence)
sqlite3 ~/.flowrider/leo-ai.db "
DELETE FROM patterns WHERE id NOT IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY type, name
      ORDER BY confidence DESC, occurrences DESC
    ) as rn
    FROM patterns
  ) WHERE rn = 1
);"

# ==========================================
# FINALIZE: Reclaim disk space
# ==========================================
sqlite3 ~/.flowrider/leo-ai.db "VACUUM;"

# ==========================================
# VERIFY: Check what was preserved
# ==========================================
sqlite3 ~/.flowrider/leo-ai.db "SELECT 'interactions:', COUNT(*) FROM interactions UNION ALL SELECT 'patterns:', COUNT(*) FROM patterns UNION ALL SELECT 'insights:', COUNT(*) FROM insights UNION ALL SELECT 'snippets:', COUNT(*) FROM snippets;"
```

### What Each Command Does

| Command | Deletes | Preserves |
|---------|---------|-----------|
| Remove duplicates | Repeat recordings of same prompt | Best-rated version |
| Clean junk | Empty/whitespace entries | All real interactions |
| Consolidate patterns | Duplicate patterns | Highest-confidence version |

**Tables NEVER touched by debloat:** `insights`, `snippets` (100% preserved)

### Optional: Compress Old Responses (USE ONLY IF NEEDED)

This command truncates old responses to save space. **This DOES lose data** - use only if database size is a problem.

```bash
# ⚠️ WARNING: This truncates response text older than 90 days
# Only use if you need to reduce database size significantly
sqlite3 ~/.flowrider/leo-ai.db "
UPDATE interactions
SET response = SUBSTR(response, 1, 500) || '... [truncated]'
WHERE timestamp < (strftime('%s', 'now') - 90*24*60*60) * 1000
AND LENGTH(response) > 500;"
```

### Nuclear Options (USE WITH CAUTION)

```bash
# Reset ONLY interactions (keeps patterns + insights)
sqlite3 ~/.flowrider/leo-ai.db "DELETE FROM interactions; VACUUM;"

# Full reset (loses everything)
rm ~/.flowrider/leo-ai.db
```

## Scheduled Tasks

| Schedule | Task | Status |
|----------|------|--------|
| Daily 2am | iCloud backup (`scripts/backup-to-icloud.sh`) | Active |

## Current TODOs

### High Priority
- [ ] Fix Flowrider app build/launch issues
- [ ] Test ZOIX AI learning loop end-to-end
- [ ] Verify SessionMonitor captures interactions correctly
- [ ] Test thumbs up/down feedback in UI

### Medium Priority
- [ ] Add ZOIX AI dashboard view to UI
- [ ] Implement context injection into prompts
- [ ] Add session rename functionality
- [ ] Create first-run experience/onboarding

### Low Priority / Future
- [ ] Cloud sync for ZOIX AI database (beyond iCloud)
- [ ] Cross-user pattern sharing (opt-in)
- [ ] Real-time session collaboration
- [ ] Voice command integration
- [ ] Autonomous task execution (with approval gates)
- [ ] In-app debloating UI with preview
