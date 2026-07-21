/**
 * KnowledgeGraph - Maps connections between concepts the user works with
 *
 * Features:
 * - Concept extraction from code, prompts, terminal output
 * - Relationship detection (co-occurrence tracking)
 * - Cluster formation (grouping related concepts)
 * - Connection strength (weighted by frequency)
 * - Ontology building (personal knowledge tree)
 * - Gap detection (missing connections in user's knowledge)
 *
 * Stores in SQLite:
 * - concepts: individual tech concepts (React, TypeScript, Docker, etc.)
 * - concept_relations: edges between concepts with strength
 * - knowledge_clusters: groups of related concepts
 */

import Database from 'better-sqlite3';
import * as crypto from 'crypto';

// ============================================
// Data Types
// ============================================

export interface Concept {
  id: string;
  name: string;
  type: ConceptType;
  category: ConceptCategory;
  firstSeen: number;
  lastSeen: number;
  occurrences: number;
  description?: string;
  aliases: string[]; // e.g., ['react', 'reactjs', 'react.js']
  metadata: Record<string, any>; // Version, ecosystem, etc.
}

export type ConceptType =
  | 'library'
  | 'framework'
  | 'language'
  | 'tool'
  | 'pattern'
  | 'architecture'
  | 'algorithm'
  | 'protocol'
  | 'platform'
  | 'database'
  | 'cloud'
  | 'testing'
  | 'devops'
  | 'concept'
  | 'other';

export type ConceptCategory =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'devops'
  | 'testing'
  | 'architecture'
  | 'language'
  | 'infrastructure'
  | 'ai-ml'
  | 'security'
  | 'general';

export interface ConceptRelation {
  concept1Id: string;
  concept2Id: string;
  strength: number; // 0-1, based on co-occurrence frequency
  coOccurrences: number;
  contexts: string[]; // Where they appeared together
  lastSeen: number;
}

export interface KnowledgeCluster {
  id: string;
  name: string;
  conceptIds: string[];
  description: string;
  category: ConceptCategory;
  coherence: number; // 0-1, how related are the concepts
  createdAt: number;
  updatedAt: number;
}

export interface KnowledgeGap {
  id: string;
  description: string;
  missingConcept: string;
  relatedConcepts: string[];
  confidence: number; // 0-1, how confident we are this is a gap
  suggestions: string[]; // Suggested learning resources
  detectedAt: number;
}

export interface KnowledgeGraphStats {
  totalConcepts: number;
  totalRelations: number;
  totalClusters: number;
  topConcepts: Array<{ name: string; occurrences: number }>;
  strongestRelations: Array<{ concept1: string; concept2: string; strength: number }>;
  knowledgeGaps: number;
  categoryDistribution: Record<ConceptCategory, number>;
}

// ============================================
// Known Tech Concepts Database
// ============================================

const KNOWN_CONCEPTS: Record<string, { type: ConceptType; category: ConceptCategory; aliases: string[] }> = {
  // Languages
  'javascript': { type: 'language', category: 'language', aliases: ['js', 'ecmascript'] },
  'typescript': { type: 'language', category: 'language', aliases: ['ts'] },
  'python': { type: 'language', category: 'language', aliases: ['py'] },
  'rust': { type: 'language', category: 'language', aliases: [] },
  'go': { type: 'language', category: 'language', aliases: ['golang'] },
  'java': { type: 'language', category: 'language', aliases: [] },
  'c++': { type: 'language', category: 'language', aliases: ['cpp'] },
  'ruby': { type: 'language', category: 'language', aliases: ['rb'] },
  'php': { type: 'language', category: 'language', aliases: [] },
  'swift': { type: 'language', category: 'language', aliases: [] },
  'kotlin': { type: 'language', category: 'language', aliases: [] },
  'sql': { type: 'language', category: 'database', aliases: [] },

  // Frontend Frameworks/Libraries
  'react': { type: 'library', category: 'frontend', aliases: ['reactjs', 'react.js'] },
  'vue': { type: 'framework', category: 'frontend', aliases: ['vuejs', 'vue.js'] },
  'angular': { type: 'framework', category: 'frontend', aliases: ['angularjs'] },
  'svelte': { type: 'framework', category: 'frontend', aliases: ['sveltejs'] },
  'next': { type: 'framework', category: 'frontend', aliases: ['nextjs', 'next.js'] },
  'nuxt': { type: 'framework', category: 'frontend', aliases: ['nuxtjs', 'nuxt.js'] },
  'gatsby': { type: 'framework', category: 'frontend', aliases: [] },
  'three': { type: 'library', category: 'frontend', aliases: ['threejs', 'three.js'] },

  // Backend Frameworks
  'express': { type: 'framework', category: 'backend', aliases: ['expressjs', 'express.js'] },
  'fastify': { type: 'framework', category: 'backend', aliases: [] },
  'nestjs': { type: 'framework', category: 'backend', aliases: ['nest'] },
  'django': { type: 'framework', category: 'backend', aliases: [] },
  'flask': { type: 'framework', category: 'backend', aliases: [] },
  'fastapi': { type: 'framework', category: 'backend', aliases: [] },
  'rails': { type: 'framework', category: 'backend', aliases: ['ruby on rails'] },
  'spring': { type: 'framework', category: 'backend', aliases: ['spring boot'] },

  // Databases
  'postgresql': { type: 'database', category: 'database', aliases: ['postgres', 'psql'] },
  'mysql': { type: 'database', category: 'database', aliases: [] },
  'mongodb': { type: 'database', category: 'database', aliases: ['mongo'] },
  'redis': { type: 'database', category: 'database', aliases: [] },
  'sqlite': { type: 'database', category: 'database', aliases: [] },
  'cassandra': { type: 'database', category: 'database', aliases: [] },
  'elasticsearch': { type: 'database', category: 'database', aliases: [] },
  'dynamodb': { type: 'database', category: 'database', aliases: [] },

  // DevOps/Infrastructure
  'docker': { type: 'tool', category: 'devops', aliases: [] },
  'kubernetes': { type: 'platform', category: 'devops', aliases: ['k8s', 'kube'] },
  'terraform': { type: 'tool', category: 'devops', aliases: [] },
  'ansible': { type: 'tool', category: 'devops', aliases: [] },
  'jenkins': { type: 'tool', category: 'devops', aliases: [] },
  'github actions': { type: 'platform', category: 'devops', aliases: ['gha'] },
  'gitlab ci': { type: 'platform', category: 'devops', aliases: [] },
  'circleci': { type: 'platform', category: 'devops', aliases: [] },

  // Cloud Platforms
  'aws': { type: 'platform', category: 'infrastructure', aliases: ['amazon web services'] },
  'azure': { type: 'platform', category: 'infrastructure', aliases: ['microsoft azure'] },
  'gcp': { type: 'platform', category: 'infrastructure', aliases: ['google cloud'] },
  'vercel': { type: 'platform', category: 'infrastructure', aliases: [] },
  'netlify': { type: 'platform', category: 'infrastructure', aliases: [] },
  'heroku': { type: 'platform', category: 'infrastructure', aliases: [] },

  // Testing
  'jest': { type: 'testing', category: 'testing', aliases: [] },
  'vitest': { type: 'testing', category: 'testing', aliases: [] },
  'mocha': { type: 'testing', category: 'testing', aliases: [] },
  'pytest': { type: 'testing', category: 'testing', aliases: [] },
  'cypress': { type: 'testing', category: 'testing', aliases: [] },
  'playwright': { type: 'testing', category: 'testing', aliases: [] },
  'selenium': { type: 'testing', category: 'testing', aliases: [] },

  // Build Tools
  'webpack': { type: 'tool', category: 'frontend', aliases: [] },
  'vite': { type: 'tool', category: 'frontend', aliases: [] },
  'rollup': { type: 'tool', category: 'frontend', aliases: [] },
  'esbuild': { type: 'tool', category: 'frontend', aliases: [] },
  'turbopack': { type: 'tool', category: 'frontend', aliases: [] },

  // Patterns/Architecture
  'microservices': { type: 'architecture', category: 'architecture', aliases: [] },
  'monorepo': { type: 'pattern', category: 'architecture', aliases: [] },
  'serverless': { type: 'architecture', category: 'architecture', aliases: [] },
  'event-driven': { type: 'pattern', category: 'architecture', aliases: [] },
  'rest': { type: 'protocol', category: 'architecture', aliases: ['restful', 'rest api'] },
  'graphql': { type: 'protocol', category: 'architecture', aliases: [] },
  'grpc': { type: 'protocol', category: 'architecture', aliases: [] },
  'websocket': { type: 'protocol', category: 'architecture', aliases: ['websockets', 'ws'] },

  // AI/ML
  'tensorflow': { type: 'library', category: 'ai-ml', aliases: ['tf'] },
  'pytorch': { type: 'library', category: 'ai-ml', aliases: [] },
  'scikit-learn': { type: 'library', category: 'ai-ml', aliases: ['sklearn'] },
  'transformers': { type: 'library', category: 'ai-ml', aliases: ['huggingface'] },
  'langchain': { type: 'library', category: 'ai-ml', aliases: [] },
  'ollama': { type: 'tool', category: 'ai-ml', aliases: [] },
};

// Common concept pairs that often appear together
const COMMON_RELATIONS: Record<string, string[]> = {
  'react': ['typescript', 'next', 'vite', 'webpack', 'jest'],
  'docker': ['kubernetes', 'docker-compose', 'nginx'],
  'postgresql': ['sql', 'prisma', 'typeorm'],
  'aws': ['s3', 'ec2', 'lambda', 'cloudfront'],
  'kubernetes': ['docker', 'helm', 'terraform'],
  'graphql': ['apollo', 'relay', 'hasura'],
  'typescript': ['javascript', 'node', 'npm'],
  'python': ['pip', 'virtualenv', 'pytest'],
};

// ============================================
// KnowledgeGraph Class
// ============================================

export class KnowledgeGraph {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.initialize();
  }

  private initialize(): void {
    // Create tables for knowledge graph
    this.db.exec(`
      -- Concepts table: individual tech concepts
      CREATE TABLE IF NOT EXISTS concepts (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        category TEXT NOT NULL,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        occurrences INTEGER DEFAULT 1,
        description TEXT,
        aliases TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}'
      );

      -- Concept relations: edges between concepts
      CREATE TABLE IF NOT EXISTS concept_relations (
        concept1_id TEXT NOT NULL,
        concept2_id TEXT NOT NULL,
        strength REAL NOT NULL,
        co_occurrences INTEGER DEFAULT 1,
        contexts TEXT DEFAULT '[]',
        last_seen INTEGER NOT NULL,
        PRIMARY KEY (concept1_id, concept2_id),
        FOREIGN KEY (concept1_id) REFERENCES concepts(id) ON DELETE CASCADE,
        FOREIGN KEY (concept2_id) REFERENCES concepts(id) ON DELETE CASCADE
      );

      -- Knowledge clusters: groups of related concepts
      CREATE TABLE IF NOT EXISTS knowledge_clusters (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        concept_ids TEXT NOT NULL,
        description TEXT,
        category TEXT NOT NULL,
        coherence REAL DEFAULT 0.5,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      -- Knowledge gaps: detected missing connections
      CREATE TABLE IF NOT EXISTS knowledge_gaps (
        id TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        missing_concept TEXT NOT NULL,
        related_concepts TEXT DEFAULT '[]',
        confidence REAL NOT NULL,
        suggestions TEXT DEFAULT '[]',
        detected_at INTEGER NOT NULL,
        dismissed INTEGER DEFAULT 0
      );

      -- Indexes for fast lookups
      CREATE INDEX IF NOT EXISTS idx_concepts_type ON concepts(type);
      CREATE INDEX IF NOT EXISTS idx_concepts_category ON concepts(category);
      CREATE INDEX IF NOT EXISTS idx_concepts_occurrences ON concepts(occurrences DESC);
      CREATE INDEX IF NOT EXISTS idx_concept_relations_strength ON concept_relations(strength DESC);
      CREATE INDEX IF NOT EXISTS idx_knowledge_clusters_category ON knowledge_clusters(category);
      CREATE INDEX IF NOT EXISTS idx_knowledge_gaps_confidence ON knowledge_gaps(confidence DESC);
    `);

    console.log('[KnowledgeGraph] Initialized');
  }

  // ============================================
  // Concept Extraction
  // ============================================

  /**
   * Extract concepts from text (code, prompts, terminal output)
   */
  extractConcepts(text: string, context?: string): string[] {
    const extractedConcepts: string[] = [];
    const textLower = text.toLowerCase();

    // Check for known concepts
    for (const [conceptName, conceptInfo] of Object.entries(KNOWN_CONCEPTS)) {
      // Check main name
      if (this.containsConcept(textLower, conceptName)) {
        extractedConcepts.push(conceptName);
        continue;
      }

      // Check aliases
      for (const alias of conceptInfo.aliases) {
        if (this.containsConcept(textLower, alias)) {
          extractedConcepts.push(conceptName);
          break;
        }
      }
    }

    // Record concepts
    const now = Date.now();
    for (const conceptName of extractedConcepts) {
      this.recordConcept(conceptName, now, context);
    }

    // Record relations (co-occurrences)
    if (extractedConcepts.length > 1) {
      this.recordRelations(extractedConcepts, now, context);
    }

    return extractedConcepts;
  }

  private containsConcept(text: string, concept: string): boolean {
    // Word boundary check to avoid false positives
    const pattern = new RegExp(`\\b${concept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return pattern.test(text);
  }

  private recordConcept(name: string, timestamp: number, context?: string): void {
    const conceptInfo = KNOWN_CONCEPTS[name];
    if (!conceptInfo) return;

    const existing = this.db.prepare('SELECT * FROM concepts WHERE name = ?').get(name) as any;

    if (existing) {
      // Update existing concept
      this.db.prepare(`
        UPDATE concepts
        SET last_seen = ?, occurrences = occurrences + 1
        WHERE name = ?
      `).run(timestamp, name);
    } else {
      // Insert new concept
      const id = crypto.randomUUID();
      this.db.prepare(`
        INSERT INTO concepts (
          id, name, type, category, first_seen, last_seen, occurrences, aliases, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)
      `).run(
        id,
        name,
        conceptInfo.type,
        conceptInfo.category,
        timestamp,
        timestamp,
        JSON.stringify(conceptInfo.aliases),
        JSON.stringify({})
      );
    }
  }

  private recordRelations(concepts: string[], timestamp: number, context?: string): void {
    // Record all pairs of concepts
    for (let i = 0; i < concepts.length; i++) {
      for (let j = i + 1; j < concepts.length; j++) {
        const concept1 = concepts[i];
        const concept2 = concepts[j];

        // Get concept IDs
        const c1 = this.db.prepare('SELECT id FROM concepts WHERE name = ?').get(concept1) as any;
        const c2 = this.db.prepare('SELECT id FROM concepts WHERE name = ?').get(concept2) as any;

        if (!c1 || !c2) continue;

        // Ensure consistent ordering (smaller ID first)
        const [id1, id2] = c1.id < c2.id ? [c1.id, c2.id] : [c2.id, c1.id];

        const existing = this.db.prepare(`
          SELECT * FROM concept_relations WHERE concept1_id = ? AND concept2_id = ?
        `).get(id1, id2) as any;

        if (existing) {
          // Update existing relation
          const newCoOccurrences = existing.co_occurrences + 1;
          const newStrength = Math.min(1, newCoOccurrences / 10); // Cap at 1, increase with frequency

          const contexts = JSON.parse(existing.contexts || '[]');
          if (context && !contexts.includes(context)) {
            contexts.push(context);
          }

          this.db.prepare(`
            UPDATE concept_relations
            SET co_occurrences = ?, strength = ?, last_seen = ?, contexts = ?
            WHERE concept1_id = ? AND concept2_id = ?
          `).run(newCoOccurrences, newStrength, timestamp, JSON.stringify(contexts.slice(-10)), id1, id2);
        } else {
          // Insert new relation
          this.db.prepare(`
            INSERT INTO concept_relations (
              concept1_id, concept2_id, strength, co_occurrences, contexts, last_seen
            ) VALUES (?, ?, 0.1, 1, ?, ?)
          `).run(id1, id2, JSON.stringify(context ? [context] : []), timestamp);
        }
      }
    }
  }

  // ============================================
  // Cluster Formation
  // ============================================

  /**
   * Form clusters of related concepts using graph clustering
   */
  formClusters(): KnowledgeCluster[] {
    // Get all concepts
    const concepts = this.db.prepare('SELECT * FROM concepts').all() as any[];
    const conceptMap = new Map(concepts.map(c => [c.id, c]));

    // Build adjacency list
    const adjacency = new Map<string, Array<{ id: string; strength: number }>>();
    const relations = this.db.prepare('SELECT * FROM concept_relations WHERE strength > 0.3').all() as any[];

    for (const rel of relations) {
      if (!adjacency.has(rel.concept1_id)) adjacency.set(rel.concept1_id, []);
      if (!adjacency.has(rel.concept2_id)) adjacency.set(rel.concept2_id, []);

      adjacency.get(rel.concept1_id)!.push({ id: rel.concept2_id, strength: rel.strength });
      adjacency.get(rel.concept2_id)!.push({ id: rel.concept1_id, strength: rel.strength });
    }

    // Simple clustering: group by category and strong connections
    const clusters = new Map<string, Set<string>>();

    for (const concept of concepts) {
      const category = concept.category;
      if (!clusters.has(category)) {
        clusters.set(category, new Set());
      }
      clusters.get(category)!.add(concept.id);
    }

    // Create cluster records
    const clusterRecords: KnowledgeCluster[] = [];
    const now = Date.now();

    for (const [category, conceptIds] of clusters.entries()) {
      if (conceptIds.size < 2) continue; // Skip single-concept clusters

      const id = crypto.randomUUID();
      const conceptIdsArray = Array.from(conceptIds);

      // Calculate coherence (average connection strength within cluster)
      let totalStrength = 0;
      let connectionCount = 0;

      for (let i = 0; i < conceptIdsArray.length; i++) {
        for (let j = i + 1; j < conceptIdsArray.length; j++) {
          const rel = this.db.prepare(`
            SELECT strength FROM concept_relations
            WHERE (concept1_id = ? AND concept2_id = ?) OR (concept1_id = ? AND concept2_id = ?)
          `).get(conceptIdsArray[i], conceptIdsArray[j], conceptIdsArray[j], conceptIdsArray[i]) as any;

          if (rel) {
            totalStrength += rel.strength;
            connectionCount++;
          }
        }
      }

      const coherence = connectionCount > 0 ? totalStrength / connectionCount : 0.5;

      // Get concept names
      const conceptNames = conceptIdsArray
        .map(cid => conceptMap.get(cid)?.name)
        .filter(Boolean)
        .join(', ');

      const cluster: KnowledgeCluster = {
        id,
        name: `${category.charAt(0).toUpperCase() + category.slice(1)} Stack`,
        conceptIds: conceptIdsArray,
        description: `Related concepts in ${category}: ${conceptNames}`,
        category: category as ConceptCategory,
        coherence,
        createdAt: now,
        updatedAt: now,
      };

      // Save to database
      const existing = this.db.prepare('SELECT * FROM knowledge_clusters WHERE category = ?').get(category) as any;

      if (existing) {
        this.db.prepare(`
          UPDATE knowledge_clusters
          SET concept_ids = ?, description = ?, coherence = ?, updated_at = ?
          WHERE category = ?
        `).run(JSON.stringify(conceptIdsArray), cluster.description, coherence, now, category);
      } else {
        this.db.prepare(`
          INSERT INTO knowledge_clusters (
            id, name, concept_ids, description, category, coherence, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(id, cluster.name, JSON.stringify(conceptIdsArray), cluster.description, category, coherence, now, now);
      }

      clusterRecords.push(cluster);
    }

    return clusterRecords;
  }

  // ============================================
  // Gap Detection
  // ============================================

  /**
   * Detect knowledge gaps based on common patterns
   */
  detectGaps(): KnowledgeGap[] {
    const gaps: KnowledgeGap[] = [];
    const userConcepts = new Set(
      (this.db.prepare('SELECT name FROM concepts').all() as any[]).map(c => c.name)
    );

    // Check for missing complementary concepts
    for (const [concept, relatedConcepts] of Object.entries(COMMON_RELATIONS)) {
      if (!userConcepts.has(concept)) continue;

      for (const related of relatedConcepts) {
        if (!userConcepts.has(related)) {
          // Potential gap detected
          const gap: KnowledgeGap = {
            id: crypto.randomUUID(),
            description: `You use ${concept} but haven't used ${related} yet`,
            missingConcept: related,
            relatedConcepts: [concept],
            confidence: 0.7,
            suggestions: this.generateSuggestions(related),
            detectedAt: Date.now(),
          };

          gaps.push(gap);

          // Save to database
          this.db.prepare(`
            INSERT OR IGNORE INTO knowledge_gaps (
              id, description, missing_concept, related_concepts, confidence, suggestions, detected_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            gap.id,
            gap.description,
            gap.missingConcept,
            JSON.stringify(gap.relatedConcepts),
            gap.confidence,
            JSON.stringify(gap.suggestions),
            gap.detectedAt
          );
        }
      }
    }

    // Check for missing testing frameworks
    const hasAnyTesting = Array.from(userConcepts).some(c =>
      KNOWN_CONCEPTS[c]?.category === 'testing'
    );

    if (!hasAnyTesting && userConcepts.size > 5) {
      const gap: KnowledgeGap = {
        id: crypto.randomUUID(),
        description: 'No testing frameworks detected - consider adding tests to your workflow',
        missingConcept: 'testing',
        relatedConcepts: Array.from(userConcepts).slice(0, 3),
        confidence: 0.8,
        suggestions: ['Learn Jest', 'Learn Vitest', 'Learn Pytest'],
        detectedAt: Date.now(),
      };

      gaps.push(gap);

      this.db.prepare(`
        INSERT OR IGNORE INTO knowledge_gaps (
          id, description, missing_concept, related_concepts, confidence, suggestions, detected_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        gap.id,
        gap.description,
        gap.missingConcept,
        JSON.stringify(gap.relatedConcepts),
        gap.confidence,
        JSON.stringify(gap.suggestions),
        gap.detectedAt
      );
    }

    return gaps;
  }

  private generateSuggestions(concept: string): string[] {
    const suggestions: string[] = [];

    if (concept === 'typescript') {
      suggestions.push('TypeScript Handbook', 'TypeScript with React', 'Type-safe APIs');
    } else if (concept === 'docker') {
      suggestions.push('Docker Basics', 'Containerization Best Practices', 'Docker Compose');
    } else if (concept === 'kubernetes') {
      suggestions.push('Kubernetes Tutorial', 'K8s for Beginners', 'Helm Charts');
    } else {
      suggestions.push(`Learn ${concept}`, `${concept} Documentation`, `${concept} Best Practices`);
    }

    return suggestions;
  }

  // ============================================
  // Query Methods
  // ============================================

  /**
   * Get the full knowledge graph
   */
  getKnowledgeGraph(): { concepts: Concept[]; relations: ConceptRelation[]; clusters: KnowledgeCluster[] } {
    const concepts = this.db.prepare('SELECT * FROM concepts ORDER BY occurrences DESC').all() as any[];
    const relations = this.db.prepare('SELECT * FROM concept_relations ORDER BY strength DESC').all() as any[];
    const clusters = this.db.prepare('SELECT * FROM knowledge_clusters').all() as any[];

    return {
      concepts: concepts.map(this.rowToConcept),
      relations: relations.map(this.rowToRelation),
      clusters: clusters.map(this.rowToCluster),
    };
  }

  /**
   * Get concepts related to a specific concept
   */
  getRelatedConcepts(conceptName: string, limit: number = 10): Array<{ concept: Concept; strength: number }> {
    const concept = this.db.prepare('SELECT * FROM concepts WHERE name = ?').get(conceptName) as any;
    if (!concept) return [];

    const relations = this.db.prepare(`
      SELECT cr.*, c.* FROM concept_relations cr
      JOIN concepts c ON (c.id = cr.concept2_id OR c.id = cr.concept1_id)
      WHERE (cr.concept1_id = ? OR cr.concept2_id = ?) AND c.id != ?
      ORDER BY cr.strength DESC
      LIMIT ?
    `).all(concept.id, concept.id, concept.id, limit) as any[];

    return relations.map(row => ({
      concept: this.rowToConcept(row),
      strength: row.strength,
    }));
  }

  /**
   * Get all knowledge clusters
   */
  getKnowledgeClusters(): KnowledgeCluster[] {
    const rows = this.db.prepare('SELECT * FROM knowledge_clusters ORDER BY coherence DESC').all() as any[];
    return rows.map(this.rowToCluster);
  }

  /**
   * Get detected knowledge gaps
   */
  getKnowledgeGaps(includesDismissed: boolean = false): KnowledgeGap[] {
    const query = includesDismissed
      ? 'SELECT * FROM knowledge_gaps ORDER BY confidence DESC'
      : 'SELECT * FROM knowledge_gaps WHERE dismissed = 0 ORDER BY confidence DESC';

    const rows = this.db.prepare(query).all() as any[];
    return rows.map(this.rowToGap);
  }

  /**
   * Dismiss a knowledge gap
   */
  dismissGap(gapId: string): void {
    this.db.prepare('UPDATE knowledge_gaps SET dismissed = 1 WHERE id = ?').run(gapId);
  }

  /**
   * Get knowledge graph statistics
   */
  getStats(): KnowledgeGraphStats {
    const totalConcepts = (this.db.prepare('SELECT COUNT(*) as count FROM concepts').get() as any).count;
    const totalRelations = (this.db.prepare('SELECT COUNT(*) as count FROM concept_relations').get() as any).count;
    const totalClusters = (this.db.prepare('SELECT COUNT(*) as count FROM knowledge_clusters').get() as any).count;

    const topConcepts = this.db.prepare(`
      SELECT name, occurrences FROM concepts ORDER BY occurrences DESC LIMIT 10
    `).all() as any[];

    const strongestRelations = this.db.prepare(`
      SELECT cr.strength, c1.name as concept1, c2.name as concept2
      FROM concept_relations cr
      JOIN concepts c1 ON c1.id = cr.concept1_id
      JOIN concepts c2 ON c2.id = cr.concept2_id
      ORDER BY cr.strength DESC
      LIMIT 10
    `).all() as any[];

    const knowledgeGaps = (this.db.prepare('SELECT COUNT(*) as count FROM knowledge_gaps WHERE dismissed = 0').get() as any).count;

    const categoryRows = this.db.prepare(`
      SELECT category, COUNT(*) as count FROM concepts GROUP BY category
    `).all() as any[];

    const categoryDistribution: Record<ConceptCategory, number> = {
      frontend: 0,
      backend: 0,
      database: 0,
      devops: 0,
      testing: 0,
      architecture: 0,
      language: 0,
      infrastructure: 0,
      'ai-ml': 0,
      security: 0,
      general: 0,
    };

    for (const row of categoryRows) {
      categoryDistribution[row.category as ConceptCategory] = row.count;
    }

    return {
      totalConcepts,
      totalRelations,
      totalClusters,
      topConcepts,
      strongestRelations,
      knowledgeGaps,
      categoryDistribution,
    };
  }

  // ============================================
  // Row Conversion Helpers
  // ============================================

  private rowToConcept(row: any): Concept {
    return {
      id: row.id,
      name: row.name,
      type: row.type,
      category: row.category,
      firstSeen: row.first_seen,
      lastSeen: row.last_seen,
      occurrences: row.occurrences,
      description: row.description,
      aliases: JSON.parse(row.aliases || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }

  private rowToRelation(row: any): ConceptRelation {
    return {
      concept1Id: row.concept1_id,
      concept2Id: row.concept2_id,
      strength: row.strength,
      coOccurrences: row.co_occurrences,
      contexts: JSON.parse(row.contexts || '[]'),
      lastSeen: row.last_seen,
    };
  }

  private rowToCluster(row: any): KnowledgeCluster {
    return {
      id: row.id,
      name: row.name,
      conceptIds: JSON.parse(row.concept_ids || '[]'),
      description: row.description,
      category: row.category,
      coherence: row.coherence,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private rowToGap(row: any): KnowledgeGap {
    return {
      id: row.id,
      description: row.description,
      missingConcept: row.missing_concept,
      relatedConcepts: JSON.parse(row.related_concepts || '[]'),
      confidence: row.confidence,
      suggestions: JSON.parse(row.suggestions || '[]'),
      detectedAt: row.detected_at,
    };
  }
}

// Singleton instance for KnowledgeGraph
let knowledgeGraphInstance: KnowledgeGraph | null = null;

/**
 * Get the singleton KnowledgeGraph instance
 * Creates its own database if not provided
 */
export function getKnowledgeGraph(db?: Database.Database): KnowledgeGraph {
  if (!knowledgeGraphInstance) {
    // Create a default database if not provided
    const path = require('path');
    const { app } = require('electron');
    const userData = app?.getPath?.('userData') || process.cwd();
    const dbPath = path.join(userData, 'zoix-knowledge-graph.db');
    const database = db || new Database(dbPath);
    knowledgeGraphInstance = new KnowledgeGraph(database);
  }
  return knowledgeGraphInstance;
}
