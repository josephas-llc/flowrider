# ZOIX Learning Database - SQLite Implementation

## Overview

ZOIX (the AI learning system) uses SQLite via `better-sqlite3` to persist learned patterns, interactions, insights, and code snippets across app restarts. The database is stored in the user's application data directory and grows with usage.

## Database Location

**macOS:** `~/Library/Application Support/flowrider2/leo-memory.db`
**Windows:** `%APPDATA%/flowrider2/leo-memory.db`
**Linux:** `~/.config/flowrider2/leo-memory.db`

The database file is created automatically on first app launch.

## Schema

### Tables

#### 1. `patterns` - Detected patterns across interactions
```sql
CREATE TABLE patterns (
  id TEXT PRIMARY KEY,              -- UUID
  type TEXT NOT NULL,                -- 'code' | 'error' | 'workflow' | 'prompt' | 'architecture'
  name TEXT NOT NULL,                -- Human-readable name
  description TEXT,                  -- Detailed description
  confidence REAL DEFAULT 0.5,       -- 0.0 to 1.0
  occurrences INTEGER DEFAULT 1,     -- How many times seen
  last_seen INTEGER NOT NULL,        -- Unix timestamp
  context TEXT DEFAULT '{}',         -- JSON blob of pattern context
  solution TEXT,                     -- Optional solution/fix
  project_ids TEXT DEFAULT '[]'      -- JSON array of project IDs
);
```

#### 2. `interactions` - Raw session data
```sql
CREATE TABLE interactions (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  project_id TEXT,
  timestamp INTEGER NOT NULL,
  prompt_hash TEXT NOT NULL,         -- SHA256 hash for deduplication
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  outcome TEXT DEFAULT 'unknown',    -- 'success' | 'failure' | 'partial' | 'unknown'
  user_feedback REAL,                -- -1.0 to 1.0 scale
  code_changed INTEGER DEFAULT 0,    -- Boolean (0/1)
  files_affected TEXT DEFAULT '[]',  -- JSON array
  errors_caught TEXT DEFAULT '[]',   -- JSON array
  tags TEXT DEFAULT '[]',            -- JSON array
  embedding BLOB                     -- Future: vector embeddings
);
```

#### 3. `insights` - Distilled knowledge
```sql
CREATE TABLE insights (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,                -- 'learned' | 'inferred' | 'distilled'
  category TEXT NOT NULL,
  content TEXT NOT NULL,
  confidence REAL DEFAULT 0.5,
  source_pattern_ids TEXT DEFAULT '[]',
  source_interaction_ids TEXT DEFAULT '[]',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  use_count INTEGER DEFAULT 0,
  effectiveness REAL DEFAULT 0.5,    -- Running average of feedback
  embedding BLOB
);
```

#### 4. `code_snippets` - Reusable code patterns
```sql
CREATE TABLE code_snippets (
  id TEXT PRIMARY KEY,
  language TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code TEXT NOT NULL,
  context TEXT,
  project_id TEXT,
  success_rate REAL DEFAULT 0.5,
  use_count INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  tags TEXT DEFAULT '[]',
  embedding BLOB
);
```

#### 5. `learning_events` - Track learning progress
```sql
CREATE TABLE learning_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  details TEXT,                      -- JSON blob
  timestamp INTEGER NOT NULL
);
```

### Indexes

```sql
CREATE INDEX idx_interactions_session ON interactions(session_id);
CREATE INDEX idx_interactions_project ON interactions(project_id);
CREATE INDEX idx_interactions_timestamp ON interactions(timestamp);
CREATE INDEX idx_interactions_outcome ON interactions(outcome);
CREATE INDEX idx_patterns_type ON patterns(type);
CREATE INDEX idx_patterns_confidence ON patterns(confidence);
CREATE INDEX idx_insights_category ON insights(category);
CREATE INDEX idx_insights_effectiveness ON insights(effectiveness);
CREATE INDEX idx_snippets_language ON code_snippets(language);
```

## CRUD Operations

### Patterns

```javascript
// Frontend usage via IPC:

// Get all patterns
const result = await window.flowrider.leoai.getAllPatterns();
// Returns: { success: true, data: Pattern[] }

// Get patterns by type
const errorPatterns = await window.flowrider.leoai.getPatternsByType('error');

// Get high-confidence patterns (default minConfidence = 0.5)
const goodPatterns = await window.flowrider.leoai.getPatterns(0.7);

// Get pattern counts
const counts = await window.flowrider.leoai.getPatternCounts();
// Returns: { code: 5, error: 12, workflow: 3, prompt: 8, architecture: 2, total: 30 }
```

### Interactions

```javascript
// Record an interaction
const result = await window.flowrider.leoai.recordInteraction(
  'session-id',
  'How do I fix this error?',
  'Try running npm install again',
  {
    filesModified: ['package.json'],
    outcome: 'success',
    feedback: 1.0
  }
);

// Get recent interactions
const interactions = await window.flowrider.leoai.getInteractions(100);
```

### Insights

```javascript
// Get most effective insights
const insights = await window.flowrider.leoai.getInsights(20);
```

### Code Snippets

```javascript
// Search for snippets
const snippets = await window.flowrider.leoai.searchSnippets('react useState');
```

### Learning Stats

```javascript
// Get comprehensive stats
const stats = await window.flowrider.leoai.getStats();
/* Returns:
{
  totalInteractions: 1234,
  totalPatterns: 56,
  totalInsights: 23,
  totalSnippets: 45,
  averageConfidence: 0.78,
  learningRate: 1.8,  // Insights per 100 interactions
  topCategories: [
    { category: 'react', count: 12 },
    { category: 'typescript', count: 8 }
  ],
  recentActivity: 45  // Last 24h
}
*/
```

## Automatic Learning

ZOIX automatically learns from sessions when:

1. **SessionMonitor** is active (auto-starts when tmux session is created)
2. **AICore** is enabled (auto-enabled on app startup)
3. **Interactions are detected** via tmux output parsing or manual recording

### Learning Flow

```
User interacts with Claude
         ↓
SessionMonitor captures output
         ↓
Collector extracts interactions
         ↓
Analyzer detects patterns (background every 5 min)
         ↓
Distiller creates insights
         ↓
SuggestionEngine provides recommendations
         ↓
User feedback improves future suggestions
```

## Data Persistence

All data persists between app restarts. The database uses **WAL mode** for better concurrent performance:

```javascript
db.pragma('journal_mode = WAL');
```

This creates additional files:
- `leo-memory.db` - Main database
- `leo-memory.db-wal` - Write-Ahead Log
- `leo-memory.db-shm` - Shared memory file

**Do not delete these files while the app is running.**

## Privacy & Security

- All data is stored **locally** on your machine
- No data is sent to external servers
- The database contains your prompts and responses
- User feedback is stored to improve suggestions
- To reset learning data: Delete the database file (app will create a new one)

## Backup & Migration

To backup your learning data:

```bash
# macOS
cp ~/Library/Application\ Support/flowrider2/leo-memory.db ~/Desktop/leo-backup.db

# To restore
cp ~/Desktop/leo-backup.db ~/Library/Application\ Support/flowrider2/leo-memory.db
```

## Testing

Run the test script to verify database functionality:

```bash
node test-memory-db.js
```

This tests:
- Database initialization
- Pattern storage and retrieval
- Interaction tracking
- Learning progress stats
- Data persistence

## Troubleshooting

### Database Locked Error

If you see "database is locked" errors:
1. Close all Flowrider instances
2. Delete the `.db-wal` and `.db-shm` files
3. Restart Flowrider

### Corrupted Database

If the database becomes corrupted:
1. Backup the file (if possible)
2. Delete all database files (`leo-memory.db*`)
3. Restart Flowrider (will create fresh database)

### Slow Performance

If queries are slow:
1. Check database size: `ls -lh ~/Library/Application\ Support/flowrider2/`
2. Vacuum the database (compact): Run in SQLite CLI: `VACUUM;`
3. Consider archiving old data

## Implementation Files

- **Database Schema & CRUD:** `/src/main/ai-core/Memory.ts`
- **IPC Handlers:** `/src/main/main.ts` (lines 442-566)
- **Frontend Types:** `/src/main/preload.ts` (lines 397-454)
- **Auto-Learning:** `/src/main/SessionMonitor.ts`
- **Pattern Analysis:** `/src/main/ai-core/Analyzer.ts`
- **Suggestions:** `/src/main/ai-core/SuggestionEngine.ts`

## Example: Real Usage

```javascript
// In SessionPanel.tsx or any React component:

const [patternCounts, setPatternCounts] = useState(null);

useEffect(() => {
  const loadPatterns = async () => {
    const result = await window.flowrider.leoai.getPatternCounts();
    if (result.success) {
      setPatternCounts(result.data);
    }
  };
  loadPatterns();
}, []);

// Render:
{patternCounts && (
  <div>
    <p>Total Patterns Learned: {patternCounts.total}</p>
    <p>Error Patterns: {patternCounts.error}</p>
    <p>Code Patterns: {patternCounts.code}</p>
  </div>
)}
```

## Future Enhancements

- **Vector embeddings:** For semantic search (BLOB columns ready)
- **Cross-project insights:** Sharing patterns across projects
- **Export/import:** Share learning data with team
- **Analytics dashboard:** Visualize learning progress
- **Pattern suggestions:** Auto-suggest based on context

---

**Status:** ✅ Fully implemented and ready for use
**Database Library:** better-sqlite3 v12.11.1
**First Available:** Flowrider v0.2.0
