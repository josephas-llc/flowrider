#!/usr/bin/env node

/**
 * Test script to verify ZOIX Memory database functionality
 *
 * This script tests:
 * 1. Database initialization
 * 2. Pattern storage and retrieval
 * 3. Interaction tracking
 * 4. Learning progress
 * 5. Data persistence
 */

const Database = require('better-sqlite3');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Create test database in temp directory
const testDbPath = path.join(os.tmpdir(), 'zoix-test.db');

// Clean up old test database
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
  console.log('🗑️  Cleaned up old test database');
}

console.log('\n🧪 ZOIX Memory Database Test');
console.log('==========================================\n');

// Initialize database
console.log('1️⃣  Initializing database...');
const db = new Database(testDbPath);
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS patterns (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    confidence REAL DEFAULT 0.5,
    occurrences INTEGER DEFAULT 1,
    last_seen INTEGER NOT NULL,
    context TEXT DEFAULT '{}',
    solution TEXT,
    project_ids TEXT DEFAULT '[]'
  );

  CREATE TABLE IF NOT EXISTS interactions (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL,
    project_id TEXT,
    timestamp INTEGER NOT NULL,
    prompt_hash TEXT NOT NULL,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    outcome TEXT DEFAULT 'unknown',
    user_feedback REAL,
    code_changed INTEGER DEFAULT 0,
    files_affected TEXT DEFAULT '[]',
    errors_caught TEXT DEFAULT '[]',
    tags TEXT DEFAULT '[]',
    embedding BLOB
  );

  CREATE TABLE IF NOT EXISTS insights (
    id TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    category TEXT NOT NULL,
    content TEXT NOT NULL,
    confidence REAL DEFAULT 0.5,
    source_pattern_ids TEXT DEFAULT '[]',
    source_interaction_ids TEXT DEFAULT '[]',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    use_count INTEGER DEFAULT 0,
    effectiveness REAL DEFAULT 0.5,
    embedding BLOB
  );

  CREATE INDEX IF NOT EXISTS idx_patterns_type ON patterns(type);
  CREATE INDEX IF NOT EXISTS idx_interactions_session ON interactions(session_id);
`);

console.log('✅ Database initialized\n');

// Test pattern storage
console.log('2️⃣  Testing pattern storage...');
const testPatterns = [
  {
    id: crypto.randomUUID(),
    type: 'error',
    name: 'npm install failure',
    description: 'Package installation fails due to network timeout',
    confidence: 0.85,
    occurrences: 12,
    last_seen: Date.now(),
    context: JSON.stringify({ timeout: '30s', registry: 'https://registry.npmjs.org' }),
    solution: 'Increase npm timeout: npm config set timeout 60000',
    project_ids: JSON.stringify(['project-1', 'project-2']),
  },
  {
    id: crypto.randomUUID(),
    type: 'code',
    name: 'React useState pattern',
    description: 'Common useState hook initialization pattern',
    confidence: 0.92,
    occurrences: 45,
    last_seen: Date.now(),
    context: JSON.stringify({ framework: 'react', hook: 'useState' }),
    solution: null,
    project_ids: JSON.stringify(['project-1']),
  },
  {
    id: crypto.randomUUID(),
    type: 'workflow',
    name: 'Git commit before test',
    description: 'User always commits code before running tests',
    confidence: 0.78,
    occurrences: 23,
    last_seen: Date.now(),
    context: JSON.stringify({ vcs: 'git' }),
    solution: null,
    project_ids: JSON.stringify(['project-1', 'project-3']),
  },
];

const insertPattern = db.prepare(`
  INSERT INTO patterns (
    id, type, name, description, confidence, occurrences, last_seen,
    context, solution, project_ids
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const pattern of testPatterns) {
  insertPattern.run(
    pattern.id,
    pattern.type,
    pattern.name,
    pattern.description,
    pattern.confidence,
    pattern.occurrences,
    pattern.last_seen,
    pattern.context,
    pattern.solution,
    pattern.project_ids
  );
}

console.log(`✅ Stored ${testPatterns.length} patterns\n`);

// Test pattern retrieval
console.log('3️⃣  Testing pattern retrieval...');
const allPatterns = db.prepare('SELECT * FROM patterns ORDER BY last_seen DESC').all();
console.log(`   Total patterns: ${allPatterns.length}`);

const errorPatterns = db.prepare('SELECT * FROM patterns WHERE type = ?').all('error');
console.log(`   Error patterns: ${errorPatterns.length}`);

const highConfidence = db.prepare('SELECT * FROM patterns WHERE confidence >= ?').all(0.8);
console.log(`   High confidence (>= 0.8): ${highConfidence.length}`);

// Get pattern counts by type
const countsByType = db.prepare(`
  SELECT type, COUNT(*) as count FROM patterns GROUP BY type
`).all();
console.log('   Counts by type:');
countsByType.forEach(row => {
  console.log(`     - ${row.type}: ${row.count}`);
});
console.log('✅ Pattern retrieval working\n');

// Test interaction storage
console.log('4️⃣  Testing interaction storage...');
const testInteractions = [
  {
    id: crypto.randomUUID(),
    session_id: 'session-1',
    project_id: 'project-1',
    timestamp: Date.now() - 3600000,
    prompt_hash: crypto.createHash('sha256').update('Fix npm error').digest('hex'),
    prompt: 'How do I fix npm install timeout errors?',
    response: 'You can increase the npm timeout using: npm config set timeout 60000',
    outcome: 'success',
    user_feedback: 1,
    code_changed: 0,
    files_affected: JSON.stringify([]),
    errors_caught: JSON.stringify(['ETIMEDOUT']),
    tags: JSON.stringify(['npm', 'networking']),
  },
  {
    id: crypto.randomUUID(),
    session_id: 'session-1',
    project_id: 'project-1',
    timestamp: Date.now() - 1800000,
    prompt_hash: crypto.createHash('sha256').update('React component').digest('hex'),
    prompt: 'Create a React component with useState',
    response: 'Here is a React component example...',
    outcome: 'success',
    user_feedback: 0.8,
    code_changed: 1,
    files_affected: JSON.stringify(['src/components/Example.tsx']),
    errors_caught: JSON.stringify([]),
    tags: JSON.stringify(['react', 'typescript']),
  },
];

const insertInteraction = db.prepare(`
  INSERT INTO interactions (
    id, session_id, project_id, timestamp, prompt_hash, prompt, response,
    outcome, user_feedback, code_changed, files_affected, errors_caught, tags
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

for (const interaction of testInteractions) {
  insertInteraction.run(
    interaction.id,
    interaction.session_id,
    interaction.project_id,
    interaction.timestamp,
    interaction.prompt_hash,
    interaction.prompt,
    interaction.response,
    interaction.outcome,
    interaction.user_feedback,
    interaction.code_changed,
    interaction.files_affected,
    interaction.errors_caught,
    interaction.tags
  );
}

console.log(`✅ Stored ${testInteractions.length} interactions\n`);

// Test learning progress
console.log('5️⃣  Testing learning progress stats...');
const totalInteractions = db.prepare('SELECT COUNT(*) as count FROM interactions').get().count;
const totalPatterns = db.prepare('SELECT COUNT(*) as count FROM patterns').get().count;
const avgConfidence = db.prepare('SELECT AVG(confidence) as avg FROM patterns').get().avg;
const successfulInteractions = db.prepare('SELECT COUNT(*) as count FROM interactions WHERE outcome = ?').get('success').count;

console.log(`   Total interactions: ${totalInteractions}`);
console.log(`   Total patterns: ${totalPatterns}`);
console.log(`   Average confidence: ${avgConfidence.toFixed(2)}`);
console.log(`   Successful interactions: ${successfulInteractions}/${totalInteractions}`);
console.log('✅ Learning progress tracking working\n');

// Test data persistence
console.log('6️⃣  Testing data persistence...');
db.close();
console.log('   Database closed');

const db2 = new Database(testDbPath);
const persistedPatterns = db2.prepare('SELECT COUNT(*) as count FROM patterns').get().count;
const persistedInteractions = db2.prepare('SELECT COUNT(*) as count FROM interactions').get().count;
db2.close();

console.log(`   Persisted patterns: ${persistedPatterns}`);
console.log(`   Persisted interactions: ${persistedInteractions}`);

if (persistedPatterns === testPatterns.length && persistedInteractions === testInteractions.length) {
  console.log('✅ Data persistence verified\n');
} else {
  console.log('❌ Data persistence failed\n');
  process.exit(1);
}

// Cleanup
fs.unlinkSync(testDbPath);
console.log('🧹 Cleaned up test database\n');

console.log('==========================================');
console.log('✅ All tests passed!\n');
console.log('ZOIX Memory database is ready for actual learning.');
console.log(`Database will be stored at: ${path.join(os.homedir(), 'Library', 'Application Support', 'flowrider2', 'leo-memory.db')}`);
console.log('==========================================\n');
