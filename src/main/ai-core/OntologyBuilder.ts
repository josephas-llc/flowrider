/**
 * OntologyBuilder - META Service for ZOIX's User Intelligence Layer
 *
 * This is the CROWN JEWEL that synthesizes all other services into a coherent
 * PERSONAL ONTOLOGY - a hierarchical structure of everything the user knows
 * and how it connects.
 *
 * Integrates:
 * - KnowledgeGraph: Concepts and their relationships
 * - SkillTracker: Proficiency levels per concept
 * - GoalInference: Where the user is heading
 * - UserProfiler: Interests and learning trajectory
 *
 * Features:
 * - Hierarchical categories (e.g., Programming > Frontend > React > Hooks > useState)
 * - Cross-cutting relationships (TypeScript relates to both Frontend and Backend)
 * - Temporal layers (what you knew before vs now)
 * - Auto-creation of categories from KnowledgeGraph clusters
 * - Category management (rename, reorganize, merge, split)
 * - Multiple export formats (JSON, Markdown, Graph)
 * - Evolution tracking (how ontology changes over time)
 * - Growth metrics ("Your knowledge has grown 15% this month")
 */

import Database from 'better-sqlite3';
import * as crypto from 'crypto';

// ============================================
// Data Types
// ============================================

export interface OntologyCategory {
  id: string;
  name: string;
  path: string; // e.g., "Programming/Frontend/React/Hooks"
  level: number; // 0=root, 1=domain, 2=subdomain, etc.
  parentId: string | null;
  conceptIds: string[]; // References to KnowledgeGraph concepts
  skillLevel: 'beginner' | 'intermediate' | 'expert' | 'mixed';
  avgProficiency: number; // 0-100, from SkillTracker
  subcategories: string[]; // IDs of child categories
  metadata: {
    createdAt: number;
    updatedAt: number;
    autoCreated: boolean;
    userRenamed: boolean;
    relatedGoals?: string[]; // GoalInference goal IDs
    primaryInterest?: boolean; // From UserProfiler
  };
}

export interface OntologyCrossReference {
  id: string;
  category1Id: string;
  category2Id: string;
  relationType: 'shares-concepts' | 'prerequisite-for' | 'complements' | 'alternative-to';
  strength: number; // 0-1
  sharedConcepts: string[]; // Concept IDs that appear in both
  metadata: {
    createdAt: number;
    evidenceCount: number;
  };
}

export interface OntologySnapshot {
  id: string;
  timestamp: number;
  categoryCount: number;
  conceptCount: number;
  depth: number; // Max hierarchy depth
  breadth: number; // Avg categories per level
  topCategories: Array<{ name: string; conceptCount: number }>;
  growthMetrics: {
    newCategories: number;
    newConcepts: number;
    avgProficiencyChange: number;
  };
}

export interface OntologyTree {
  root: OntologyCategory;
  children: OntologyTreeNode[];
  totalDepth: number;
  totalNodes: number;
  crossReferences: OntologyCrossReference[];
}

export interface OntologyTreeNode extends OntologyCategory {
  children: OntologyTreeNode[];
}

export interface OntologyStats {
  totalCategories: number;
  totalConcepts: number;
  depth: number;
  breadth: number;
  mostPopulatedCategory: { name: string; conceptCount: number };
  expertiseAreas: string[]; // Categories with 'expert' level
  learningAreas: string[]; // Categories with 'beginner' level
  growthRate: number; // % change over last snapshot
  knowledgeScore: number; // 0-100 overall mastery metric
}

export interface EvolutionMetrics {
  timeRange: { start: number; end: number };
  categoriesAdded: number;
  categoriesRemoved: number;
  conceptsAdded: number;
  avgProficiencyChange: number;
  newAreas: string[];
  deepenedAreas: string[];
  abandonedAreas: string[];
}

export interface GrowthArea {
  categoryName: string;
  categoryPath: string;
  growthRate: number; // % change in concepts
  proficiencyChange: number;
  newConcepts: string[];
  timeframe: string; // e.g., "last 30 days"
}

// Export formats
export interface OntologyExportJSON {
  version: string;
  exportedAt: number;
  categories: OntologyCategory[];
  crossReferences: OntologyCrossReference[];
  stats: OntologyStats;
}

export interface OntologyExportGraph {
  nodes: Array<{
    id: string;
    label: string;
    level: number;
    skillLevel: string;
    proficiency: number;
  }>;
  edges: Array<{
    source: string;
    target: string;
    type: 'parent-child' | 'cross-reference';
    label?: string;
  }>;
}

// ============================================
// OntologyBuilder Class
// ============================================

export class OntologyBuilder {
  private db: Database.Database;

  constructor(db: Database.Database) {
    this.db = db;
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(`
      -- Ontology categories table
      CREATE TABLE IF NOT EXISTS ontology_categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        path TEXT NOT NULL UNIQUE,
        level INTEGER NOT NULL,
        parent_id TEXT,
        concept_ids TEXT DEFAULT '[]',
        skill_level TEXT DEFAULT 'mixed',
        avg_proficiency REAL DEFAULT 0,
        subcategories TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (parent_id) REFERENCES ontology_categories(id) ON DELETE CASCADE
      );

      -- Ontology cross-references table
      CREATE TABLE IF NOT EXISTS ontology_cross_references (
        id TEXT PRIMARY KEY,
        category1_id TEXT NOT NULL,
        category2_id TEXT NOT NULL,
        relation_type TEXT NOT NULL,
        strength REAL DEFAULT 0.5,
        shared_concepts TEXT DEFAULT '[]',
        metadata TEXT DEFAULT '{}',
        FOREIGN KEY (category1_id) REFERENCES ontology_categories(id) ON DELETE CASCADE,
        FOREIGN KEY (category2_id) REFERENCES ontology_categories(id) ON DELETE CASCADE
      );

      -- Ontology snapshots table (for evolution tracking)
      CREATE TABLE IF NOT EXISTS ontology_snapshots (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        category_count INTEGER NOT NULL,
        concept_count INTEGER NOT NULL,
        depth INTEGER NOT NULL,
        breadth REAL NOT NULL,
        top_categories TEXT DEFAULT '[]',
        growth_metrics TEXT DEFAULT '{}'
      );

      -- Indexes for fast lookups
      CREATE INDEX IF NOT EXISTS idx_ontology_categories_parent ON ontology_categories(parent_id);
      CREATE INDEX IF NOT EXISTS idx_ontology_categories_level ON ontology_categories(level);
      CREATE INDEX IF NOT EXISTS idx_ontology_categories_path ON ontology_categories(path);
      CREATE INDEX IF NOT EXISTS idx_ontology_cross_refs_cat1 ON ontology_cross_references(category1_id);
      CREATE INDEX IF NOT EXISTS idx_ontology_cross_refs_cat2 ON ontology_cross_references(category2_id);
      CREATE INDEX IF NOT EXISTS idx_ontology_snapshots_timestamp ON ontology_snapshots(timestamp);
    `);

    // Ensure root category exists
    this.ensureRootCategory();

    console.log('[OntologyBuilder] Initialized - META service ready');
  }

  private ensureRootCategory(): void {
    const existing = this.db.prepare('SELECT id FROM ontology_categories WHERE level = 0').get();

    if (!existing) {
      const root: OntologyCategory = {
        id: 'root',
        name: 'My Knowledge',
        path: 'My Knowledge',
        level: 0,
        parentId: null,
        conceptIds: [],
        skillLevel: 'mixed',
        avgProficiency: 0,
        subcategories: [],
        metadata: {
          createdAt: Date.now(),
          updatedAt: Date.now(),
          autoCreated: false,
          userRenamed: false,
        },
      };

      this.saveCategory(root);
    }
  }

  // ============================================
  // Core Ontology Building
  // ============================================

  /**
   * Build/rebuild the entire ontology by synthesizing all services
   */
  buildOntology(): OntologyTree {
    console.log('[OntologyBuilder] Building complete ontology from all services...');

    // Step 1: Get all knowledge clusters from KnowledgeGraph
    const clusters = this.getKnowledgeClusters();

    // Step 2: Create categories from clusters
    for (const cluster of clusters) {
      this.createCategoryFromCluster(cluster);
    }

    // Step 3: Detect cross-cutting relationships
    this.detectCrossReferences();

    // Step 4: Enrich with SkillTracker data
    this.enrichWithSkillLevels();

    // Step 5: Link with GoalInference
    this.linkWithGoals();

    // Step 6: Mark primary interests from UserProfiler
    this.markPrimaryInterests();

    // Step 7: Create snapshot for evolution tracking
    this.createSnapshot();

    return this.getOntologyTree();
  }

  private getKnowledgeClusters(): any[] {
    // Query KnowledgeGraph's knowledge_clusters table
    const rows = this.db.prepare(`
      SELECT * FROM knowledge_clusters ORDER BY coherence DESC
    `).all() as any[];

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      conceptIds: JSON.parse(row.concept_ids || '[]'),
      category: row.category,
      coherence: row.coherence,
    }));
  }

  private createCategoryFromCluster(cluster: any): void {
    // Check if category already exists for this cluster
    const existing = this.db.prepare(
      'SELECT * FROM ontology_categories WHERE name = ?'
    ).get(cluster.name) as any;

    if (existing) {
      // Update existing category with new concepts
      const category = this.rowToCategory(existing);
      const mergedConcepts = Array.from(new Set([...category.conceptIds, ...cluster.conceptIds]));

      category.conceptIds = mergedConcepts;
      category.metadata.updatedAt = Date.now();

      this.saveCategory(category);
      return;
    }

    // Create new category
    const parentPath = this.inferParentPath(cluster.category);
    const parent = this.getCategoryByPath(parentPath);

    const category: OntologyCategory = {
      id: crypto.randomUUID(),
      name: cluster.name,
      path: parent ? `${parent.path}/${cluster.name}` : cluster.name,
      level: parent ? parent.level + 1 : 1,
      parentId: parent?.id || 'root',
      conceptIds: cluster.conceptIds,
      skillLevel: 'mixed',
      avgProficiency: 0,
      subcategories: [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        autoCreated: true,
        userRenamed: false,
      },
    };

    this.saveCategory(category);

    // Update parent's subcategories
    if (parent) {
      parent.subcategories.push(category.id);
      this.saveCategory(parent);
    }
  }

  private inferParentPath(clusterCategory: string): string | null {
    // Map KnowledgeGraph categories to ontology hierarchy
    const categoryMap: Record<string, string> = {
      'frontend': 'Programming/Frontend',
      'backend': 'Programming/Backend',
      'database': 'Programming/Database',
      'devops': 'Programming/DevOps',
      'testing': 'Programming/Testing',
      'architecture': 'Programming/Architecture',
      'language': 'Programming/Languages',
      'infrastructure': 'Programming/Infrastructure',
      'ai-ml': 'Programming/AI-ML',
      'security': 'Programming/Security',
      'general': 'Programming',
    };

    return categoryMap[clusterCategory] || 'Programming';
  }

  private detectCrossReferences(): void {
    console.log('[OntologyBuilder] Detecting cross-cutting relationships...');

    const categories = this.getAllCategories();

    for (let i = 0; i < categories.length; i++) {
      for (let j = i + 1; j < categories.length; j++) {
        const cat1 = categories[i];
        const cat2 = categories[j];

        // Find shared concepts
        const shared = cat1.conceptIds.filter(cid => cat2.conceptIds.includes(cid));

        if (shared.length > 0) {
          const strength = shared.length / Math.max(cat1.conceptIds.length, cat2.conceptIds.length);

          // Only create cross-reference if strength is significant
          if (strength > 0.2) {
            this.createCrossReference(cat1.id, cat2.id, 'shares-concepts', strength, shared);
          }
        }
      }
    }
  }

  private enrichWithSkillLevels(): void {
    console.log('[OntologyBuilder] Enriching with skill proficiency data...');

    // Query SkillTracker for proficiency data
    const skillRows = this.db.prepare(`
      SELECT concept_name, proficiency_score, skill_level
      FROM skill_proficiency
      WHERE proficiency_score > 0
    `).all() as any[];

    const skillMap = new Map<string, { proficiency: number; level: string }>();
    for (const row of skillRows) {
      skillMap.set(row.concept_name, {
        proficiency: row.proficiency_score,
        level: row.skill_level,
      });
    }

    // Get concept names from concepts table
    const conceptRows = this.db.prepare(`
      SELECT id, name FROM concepts
    `).all() as any[];

    const conceptIdToName = new Map(conceptRows.map((r: any) => [r.id, r.name]));

    // Update categories with skill data
    const categories = this.getAllCategories();

    for (const category of categories) {
      const proficiencies: number[] = [];
      const skillLevels = { beginner: 0, intermediate: 0, expert: 0 };

      for (const conceptId of category.conceptIds) {
        const conceptName = conceptIdToName.get(conceptId);
        if (!conceptName) continue;

        const skillData = skillMap.get(conceptName);
        if (skillData) {
          proficiencies.push(skillData.proficiency);
          skillLevels[skillData.level as keyof typeof skillLevels]++;
        }
      }

      if (proficiencies.length > 0) {
        category.avgProficiency = proficiencies.reduce((a, b) => a + b, 0) / proficiencies.length;

        // Determine overall skill level
        const total = Object.values(skillLevels).reduce((a, b) => a + b, 0);
        if (skillLevels.expert / total > 0.5) category.skillLevel = 'expert';
        else if (skillLevels.beginner / total > 0.5) category.skillLevel = 'beginner';
        else if (skillLevels.intermediate / total > 0.5) category.skillLevel = 'intermediate';
        else category.skillLevel = 'mixed';

        this.saveCategory(category);
      }
    }
  }

  private linkWithGoals(): void {
    console.log('[OntologyBuilder] Linking with inferred goals...');

    // Query GoalInference for active goals
    const goalRows = this.db.prepare(`
      SELECT id, tags FROM inferred_goals WHERE is_active = 1
    `).all() as any[];

    const categories = this.getAllCategories();

    for (const category of categories) {
      const relatedGoals: string[] = [];

      for (const goalRow of goalRows) {
        const tags = JSON.parse(goalRow.tags || '[]');

        // Check if category name or concepts match goal tags
        if (tags.some((tag: string) => category.name.toLowerCase().includes(tag))) {
          relatedGoals.push(goalRow.id);
        }
      }

      if (relatedGoals.length > 0) {
        category.metadata.relatedGoals = relatedGoals;
        this.saveCategory(category);
      }
    }
  }

  private markPrimaryInterests(): void {
    console.log('[OntologyBuilder] Marking primary interests from user profile...');

    // Query UserProfiler for top interests
    const profileRow = this.db.prepare(`
      SELECT primary_domains FROM user_profile LIMIT 1
    `).get() as any;

    if (!profileRow) return;

    const primaryDomains = JSON.parse(profileRow.primary_domains || '[]');
    const categories = this.getAllCategories();

    for (const category of categories) {
      const isPrimary = primaryDomains.some((domain: string) =>
        category.name.toLowerCase().includes(domain.toLowerCase()) ||
        domain.toLowerCase().includes(category.name.toLowerCase())
      );

      if (isPrimary) {
        category.metadata.primaryInterest = true;
        this.saveCategory(category);
      }
    }
  }

  // ============================================
  // Category Management
  // ============================================

  /**
   * Get a specific category by path
   */
  getCategory(path: string): OntologyCategory | null {
    const row = this.db.prepare(
      'SELECT * FROM ontology_categories WHERE path = ?'
    ).get(path) as any;

    return row ? this.rowToCategory(row) : null;
  }

  private getCategoryByPath(path: string | null): OntologyCategory | null {
    if (!path) return null;
    return this.getCategory(path);
  }

  /**
   * Rename a category
   */
  renameCategory(categoryId: string, newName: string): void {
    const category = this.getCategoryById(categoryId);
    if (!category) throw new Error(`Category ${categoryId} not found`);

    const oldPath = category.path;
    const newPath = category.parentId
      ? `${this.getCategoryById(category.parentId)!.path}/${newName}`
      : newName;

    category.name = newName;
    category.path = newPath;
    category.metadata.userRenamed = true;
    category.metadata.updatedAt = Date.now();

    this.saveCategory(category);

    // Update all descendant paths
    this.updateDescendantPaths(categoryId, oldPath, newPath);
  }

  /**
   * Move a category to a new parent
   */
  moveCategory(categoryId: string, newParentId: string): void {
    const category = this.getCategoryById(categoryId);
    if (!category) throw new Error(`Category ${categoryId} not found`);

    const newParent = this.getCategoryById(newParentId);
    if (!newParent) throw new Error(`Parent category ${newParentId} not found`);

    // Remove from old parent's subcategories
    if (category.parentId) {
      const oldParent = this.getCategoryById(category.parentId);
      if (oldParent) {
        oldParent.subcategories = oldParent.subcategories.filter(id => id !== categoryId);
        this.saveCategory(oldParent);
      }
    }

    // Update category
    const oldPath = category.path;
    category.parentId = newParentId;
    category.level = newParent.level + 1;
    category.path = `${newParent.path}/${category.name}`;
    category.metadata.updatedAt = Date.now();

    this.saveCategory(category);

    // Add to new parent's subcategories
    newParent.subcategories.push(categoryId);
    this.saveCategory(newParent);

    // Update all descendant paths
    this.updateDescendantPaths(categoryId, oldPath, category.path);
  }

  /**
   * Merge two categories
   */
  mergeCategories(category1Id: string, category2Id: string): void {
    const cat1 = this.getCategoryById(category1Id);
    const cat2 = this.getCategoryById(category2Id);

    if (!cat1 || !cat2) throw new Error('Categories not found');

    // Merge concepts
    cat1.conceptIds = Array.from(new Set([...cat1.conceptIds, ...cat2.conceptIds]));

    // Merge subcategories
    cat1.subcategories = Array.from(new Set([...cat1.subcategories, ...cat2.subcategories]));

    // Update children's parent
    for (const childId of cat2.subcategories) {
      const child = this.getCategoryById(childId);
      if (child) {
        child.parentId = cat1.id;
        this.saveCategory(child);
      }
    }

    cat1.metadata.updatedAt = Date.now();
    this.saveCategory(cat1);

    // Delete cat2
    this.deleteCategory(category2Id);

    console.log(`[OntologyBuilder] Merged ${cat2.name} into ${cat1.name}`);
  }

  /**
   * Split a category into subcategories based on concept clustering
   */
  splitCategory(categoryId: string): void {
    const category = this.getCategoryById(categoryId);
    if (!category) throw new Error(`Category ${categoryId} not found`);

    if (category.conceptIds.length < 6) {
      console.warn('[OntologyBuilder] Category too small to split');
      return;
    }

    // Re-cluster the concepts within this category
    // This is a simplified version - in production, would use proper clustering
    const midpoint = Math.floor(category.conceptIds.length / 2);
    const group1 = category.conceptIds.slice(0, midpoint);
    const group2 = category.conceptIds.slice(midpoint);

    // Create two new subcategories
    const cat1: OntologyCategory = {
      id: crypto.randomUUID(),
      name: `${category.name} - Group 1`,
      path: `${category.path}/Group 1`,
      level: category.level + 1,
      parentId: category.id,
      conceptIds: group1,
      skillLevel: 'mixed',
      avgProficiency: 0,
      subcategories: [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        autoCreated: true,
        userRenamed: false,
      },
    };

    const cat2: OntologyCategory = {
      id: crypto.randomUUID(),
      name: `${category.name} - Group 2`,
      path: `${category.path}/Group 2`,
      level: category.level + 1,
      parentId: category.id,
      conceptIds: group2,
      skillLevel: 'mixed',
      avgProficiency: 0,
      subcategories: [],
      metadata: {
        createdAt: Date.now(),
        updatedAt: Date.now(),
        autoCreated: true,
        userRenamed: false,
      },
    };

    this.saveCategory(cat1);
    this.saveCategory(cat2);

    // Update parent
    category.conceptIds = [];
    category.subcategories = [cat1.id, cat2.id];
    this.saveCategory(category);

    console.log(`[OntologyBuilder] Split ${category.name} into 2 subcategories`);
  }

  private updateDescendantPaths(categoryId: string, oldPath: string, newPath: string): void {
    const descendants = this.getDescendants(categoryId);

    for (const desc of descendants) {
      desc.path = desc.path.replace(oldPath, newPath);
      this.saveCategory(desc);
    }
  }

  private getDescendants(categoryId: string): OntologyCategory[] {
    const descendants: OntologyCategory[] = [];
    const queue = [categoryId];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const children = this.getChildren(currentId);

      descendants.push(...children);
      queue.push(...children.map(c => c.id));
    }

    return descendants;
  }

  private getChildren(categoryId: string): OntologyCategory[] {
    const rows = this.db.prepare(
      'SELECT * FROM ontology_categories WHERE parent_id = ?'
    ).all(categoryId) as any[];

    return rows.map(this.rowToCategory);
  }

  private deleteCategory(categoryId: string): void {
    this.db.prepare('DELETE FROM ontology_categories WHERE id = ?').run(categoryId);
  }

  // ============================================
  // Ontology Retrieval
  // ============================================

  /**
   * Get the complete ontology tree
   */
  getOntologyTree(): OntologyTree {
    const root = this.getCategoryById('root')!;
    const allCategories = this.getAllCategories();
    const crossRefs = this.getAllCrossReferences();

    const buildTree = (category: OntologyCategory): OntologyTreeNode => {
      const children = allCategories
        .filter(c => c.parentId === category.id)
        .map(buildTree);

      return {
        ...category,
        children,
      };
    };

    const tree = buildTree(root);

    const calculateDepth = (node: OntologyTreeNode): number => {
      if (node.children.length === 0) return 1;
      return 1 + Math.max(...node.children.map(calculateDepth));
    };

    const countNodes = (node: OntologyTreeNode): number => {
      return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0);
    };

    return {
      root,
      children: tree.children,
      totalDepth: calculateDepth(tree),
      totalNodes: countNodes(tree),
      crossReferences: crossRefs,
    };
  }

  /**
   * Get ontology statistics
   */
  getOntologyStats(): OntologyStats {
    const categories = this.getAllCategories();
    const tree = this.getOntologyTree();

    // Find most populated category
    let mostPopulated = { name: '', conceptCount: 0 };
    for (const cat of categories) {
      if (cat.conceptIds.length > mostPopulated.conceptCount) {
        mostPopulated = { name: cat.name, conceptCount: cat.conceptIds.length };
      }
    }

    // Find expertise and learning areas
    const expertiseAreas = categories
      .filter(c => c.skillLevel === 'expert')
      .map(c => c.name);

    const learningAreas = categories
      .filter(c => c.skillLevel === 'beginner')
      .map(c => c.name);

    // Calculate growth rate from snapshots
    const snapshots = this.getRecentSnapshots(2);
    let growthRate = 0;
    if (snapshots.length >= 2) {
      const latest = snapshots[0];
      const previous = snapshots[1];
      growthRate = ((latest.conceptCount - previous.conceptCount) / previous.conceptCount) * 100;
    }

    // Calculate knowledge score
    const totalProficiency = categories.reduce((sum, cat) => sum + cat.avgProficiency, 0);
    const knowledgeScore = categories.length > 0
      ? totalProficiency / categories.length
      : 0;

    // Calculate breadth (average categories per level)
    const levelCounts = new Map<number, number>();
    for (const cat of categories) {
      levelCounts.set(cat.level, (levelCounts.get(cat.level) || 0) + 1);
    }
    const breadth = Array.from(levelCounts.values()).reduce((a, b) => a + b, 0) / levelCounts.size;

    return {
      totalCategories: categories.length,
      totalConcepts: categories.reduce((sum, cat) => sum + cat.conceptIds.length, 0),
      depth: tree.totalDepth,
      breadth,
      mostPopulatedCategory: mostPopulated,
      expertiseAreas,
      learningAreas,
      growthRate,
      knowledgeScore,
    };
  }

  // ============================================
  // Export Formats
  // ============================================

  /**
   * Export ontology as JSON
   */
  exportAsJSON(): OntologyExportJSON {
    return {
      version: '1.0',
      exportedAt: Date.now(),
      categories: this.getAllCategories(),
      crossReferences: this.getAllCrossReferences(),
      stats: this.getOntologyStats(),
    };
  }

  /**
   * Export ontology as Markdown
   */
  exportAsMarkdown(): string {
    const tree = this.getOntologyTree();
    const stats = this.getOntologyStats();

    let markdown = '# My Knowledge Ontology\n\n';
    markdown += `*Generated on ${new Date().toLocaleDateString()}*\n\n`;
    markdown += '## Statistics\n\n';
    markdown += `- **Total Categories**: ${stats.totalCategories}\n`;
    markdown += `- **Total Concepts**: ${stats.totalConcepts}\n`;
    markdown += `- **Tree Depth**: ${stats.depth}\n`;
    markdown += `- **Knowledge Score**: ${stats.knowledgeScore.toFixed(1)}/100\n`;
    markdown += `- **Growth Rate**: ${stats.growthRate.toFixed(1)}%\n\n`;

    if (stats.expertiseAreas.length > 0) {
      markdown += '## Expertise Areas\n\n';
      for (const area of stats.expertiseAreas) {
        markdown += `- ${area}\n`;
      }
      markdown += '\n';
    }

    if (stats.learningAreas.length > 0) {
      markdown += '## Currently Learning\n\n';
      for (const area of stats.learningAreas) {
        markdown += `- ${area}\n`;
      }
      markdown += '\n';
    }

    markdown += '## Knowledge Tree\n\n';

    const renderTree = (node: OntologyTreeNode, indent: number = 0): string => {
      const prefix = '  '.repeat(indent);
      let result = `${prefix}- **${node.name}**`;

      if (node.conceptIds.length > 0) {
        result += ` (${node.conceptIds.length} concepts)`;
      }

      if (node.skillLevel !== 'mixed') {
        result += ` [${node.skillLevel}]`;
      }

      if (node.avgProficiency > 0) {
        result += ` - ${node.avgProficiency.toFixed(0)}% proficiency`;
      }

      result += '\n';

      for (const child of node.children) {
        result += renderTree(child, indent + 1);
      }

      return result;
    };

    for (const child of tree.children) {
      markdown += renderTree(child);
    }

    return markdown;
  }

  /**
   * Export as graph format (for visualization)
   */
  exportAsGraph(): OntologyExportGraph {
    const categories = this.getAllCategories();
    const crossRefs = this.getAllCrossReferences();

    const nodes = categories.map(cat => ({
      id: cat.id,
      label: cat.name,
      level: cat.level,
      skillLevel: cat.skillLevel,
      proficiency: cat.avgProficiency,
    }));

    const edges: OntologyExportGraph['edges'] = [];

    // Parent-child edges
    for (const cat of categories) {
      if (cat.parentId) {
        edges.push({
          source: cat.parentId,
          target: cat.id,
          type: 'parent-child',
        });
      }
    }

    // Cross-reference edges
    for (const ref of crossRefs) {
      edges.push({
        source: ref.category1Id,
        target: ref.category2Id,
        type: 'cross-reference',
        label: ref.relationType,
      });
    }

    return { nodes, edges };
  }

  // ============================================
  // Evolution Tracking
  // ============================================

  /**
   * Create a snapshot of current ontology state
   */
  createSnapshot(): OntologySnapshot {
    const stats = this.getOntologyStats();
    const categories = this.getAllCategories();

    const topCategories = categories
      .sort((a, b) => b.conceptIds.length - a.conceptIds.length)
      .slice(0, 5)
      .map(c => ({ name: c.name, conceptCount: c.conceptIds.length }));

    // Calculate growth metrics from previous snapshot
    const previous = this.getRecentSnapshots(1)[0];
    const growthMetrics = previous
      ? {
          newCategories: stats.totalCategories - previous.categoryCount,
          newConcepts: stats.totalConcepts - previous.conceptCount,
          avgProficiencyChange: stats.knowledgeScore - (previous.growthMetrics.avgProficiencyChange || 0),
        }
      : {
          newCategories: 0,
          newConcepts: 0,
          avgProficiencyChange: 0,
        };

    const snapshot: OntologySnapshot = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      categoryCount: stats.totalCategories,
      conceptCount: stats.totalConcepts,
      depth: stats.depth,
      breadth: stats.breadth,
      topCategories,
      growthMetrics,
    };

    // Save to database
    this.db.prepare(`
      INSERT INTO ontology_snapshots (
        id, timestamp, category_count, concept_count, depth, breadth,
        top_categories, growth_metrics
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      snapshot.id,
      snapshot.timestamp,
      snapshot.categoryCount,
      snapshot.conceptCount,
      snapshot.depth,
      snapshot.breadth,
      JSON.stringify(snapshot.topCategories),
      JSON.stringify(snapshot.growthMetrics)
    );

    console.log(`[OntologyBuilder] Snapshot created: ${snapshot.conceptCount} concepts in ${snapshot.categoryCount} categories`);
    return snapshot;
  }

  /**
   * Get ontology evolution over a time range
   */
  getEvolution(timeRange: { start: number; end: number }): EvolutionMetrics {
    const snapshots = this.db.prepare(`
      SELECT * FROM ontology_snapshots
      WHERE timestamp >= ? AND timestamp <= ?
      ORDER BY timestamp ASC
    `).all(timeRange.start, timeRange.end) as any[];

    if (snapshots.length < 2) {
      return {
        timeRange,
        categoriesAdded: 0,
        categoriesRemoved: 0,
        conceptsAdded: 0,
        avgProficiencyChange: 0,
        newAreas: [],
        deepenedAreas: [],
        abandonedAreas: [],
      };
    }

    const first = snapshots[0];
    const last = snapshots[snapshots.length - 1];

    const categoriesAdded = last.category_count - first.category_count;
    const conceptsAdded = last.concept_count - first.concept_count;

    // Parse growth metrics
    const firstMetrics = JSON.parse(first.growth_metrics || '{}');
    const lastMetrics = JSON.parse(last.growth_metrics || '{}');
    const avgProficiencyChange = lastMetrics.avgProficiencyChange - firstMetrics.avgProficiencyChange;

    // Detect new areas (simplified - compares top categories)
    const firstTop = new Set(JSON.parse(first.top_categories || '[]').map((c: any) => c.name));
    const lastTop = new Set(JSON.parse(last.top_categories || '[]').map((c: any) => c.name));

    const newAreas = Array.from(lastTop).filter((name): name is string => typeof name === 'string' && !firstTop.has(name));
    const abandonedAreas = Array.from(firstTop).filter((name): name is string => typeof name === 'string' && !lastTop.has(name));

    // Deepened areas = categories that gained concepts
    const deepenedAreas: string[] = [];
    const firstTopArray = JSON.parse(first.top_categories || '[]');
    const lastTopArray = JSON.parse(last.top_categories || '[]');

    for (const lastCat of lastTopArray) {
      const firstCat = firstTopArray.find((c: any) => c.name === lastCat.name);
      if (firstCat && lastCat.conceptCount > firstCat.conceptCount) {
        deepenedAreas.push(lastCat.name);
      }
    }

    return {
      timeRange,
      categoriesAdded,
      categoriesRemoved: categoriesAdded < 0 ? Math.abs(categoriesAdded) : 0,
      conceptsAdded,
      avgProficiencyChange,
      newAreas,
      deepenedAreas,
      abandonedAreas,
    };
  }

  /**
   * Get fastest growing categories
   */
  getGrowthAreas(): GrowthArea[] {
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const recent = this.getRecentSnapshots(2);
    if (recent.length < 2) return [];

    const latest = recent[0];
    const previous = recent[1];

    const latestTop = JSON.parse(latest.topCategories as any || '[]');
    const previousTop = JSON.parse(previous.topCategories as any || '[]');

    const growthAreas: GrowthArea[] = [];

    for (const latestCat of latestTop) {
      const prevCat = previousTop.find((c: any) => c.name === latestCat.name);

      if (prevCat) {
        const growth = ((latestCat.conceptCount - prevCat.conceptCount) / prevCat.conceptCount) * 100;

        if (growth > 10) {
          const category = this.getAllCategories().find(c => c.name === latestCat.name);

          if (category) {
            growthAreas.push({
              categoryName: category.name,
              categoryPath: category.path,
              growthRate: growth,
              proficiencyChange: 0, // Would need historical proficiency data
              newConcepts: [], // Would need to track individual concepts
              timeframe: 'last 30 days',
            });
          }
        }
      }
    }

    return growthAreas.sort((a, b) => b.growthRate - a.growthRate);
  }

  /**
   * Get overall knowledge score (0-100)
   */
  getKnowledgeScore(): number {
    const stats = this.getOntologyStats();
    return stats.knowledgeScore;
  }

  // ============================================
  // Database Helpers
  // ============================================

  private saveCategory(category: OntologyCategory): void {
    this.db.prepare(`
      INSERT INTO ontology_categories (
        id, name, path, level, parent_id, concept_ids, skill_level,
        avg_proficiency, subcategories, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        path = excluded.path,
        level = excluded.level,
        parent_id = excluded.parent_id,
        concept_ids = excluded.concept_ids,
        skill_level = excluded.skill_level,
        avg_proficiency = excluded.avg_proficiency,
        subcategories = excluded.subcategories,
        metadata = excluded.metadata
    `).run(
      category.id,
      category.name,
      category.path,
      category.level,
      category.parentId,
      JSON.stringify(category.conceptIds),
      category.skillLevel,
      category.avgProficiency,
      JSON.stringify(category.subcategories),
      JSON.stringify(category.metadata)
    );
  }

  private createCrossReference(
    cat1Id: string,
    cat2Id: string,
    relationType: OntologyCrossReference['relationType'],
    strength: number,
    sharedConcepts: string[]
  ): void {
    const ref: OntologyCrossReference = {
      id: crypto.randomUUID(),
      category1Id: cat1Id,
      category2Id: cat2Id,
      relationType,
      strength,
      sharedConcepts,
      metadata: {
        createdAt: Date.now(),
        evidenceCount: sharedConcepts.length,
      },
    };

    this.db.prepare(`
      INSERT INTO ontology_cross_references (
        id, category1_id, category2_id, relation_type, strength, shared_concepts, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        strength = excluded.strength,
        shared_concepts = excluded.shared_concepts,
        metadata = excluded.metadata
    `).run(
      ref.id,
      ref.category1Id,
      ref.category2Id,
      ref.relationType,
      ref.strength,
      JSON.stringify(ref.sharedConcepts),
      JSON.stringify(ref.metadata)
    );
  }

  getCategoryById(id: string): OntologyCategory | null {
    const row = this.db.prepare(
      'SELECT * FROM ontology_categories WHERE id = ?'
    ).get(id) as any;

    return row ? this.rowToCategory(row) : null;
  }

  getAllCategories(): OntologyCategory[] {
    const rows = this.db.prepare(
      'SELECT * FROM ontology_categories ORDER BY level, name'
    ).all() as any[];

    return rows.map(this.rowToCategory);
  }

  private getAllCrossReferences(): OntologyCrossReference[] {
    const rows = this.db.prepare(
      'SELECT * FROM ontology_cross_references'
    ).all() as any[];

    return rows.map(row => ({
      id: row.id,
      category1Id: row.category1_id,
      category2Id: row.category2_id,
      relationType: row.relation_type,
      strength: row.strength,
      sharedConcepts: JSON.parse(row.shared_concepts || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
    }));
  }

  private getRecentSnapshots(limit: number): OntologySnapshot[] {
    const rows = this.db.prepare(`
      SELECT * FROM ontology_snapshots
      ORDER BY timestamp DESC
      LIMIT ?
    `).all(limit) as any[];

    return rows.map(row => ({
      id: row.id,
      timestamp: row.timestamp,
      categoryCount: row.category_count,
      conceptCount: row.concept_count,
      depth: row.depth,
      breadth: row.breadth,
      topCategories: JSON.parse(row.top_categories || '[]'),
      growthMetrics: JSON.parse(row.growth_metrics || '{}'),
    }));
  }

  private rowToCategory(row: any): OntologyCategory {
    return {
      id: row.id,
      name: row.name,
      path: row.path,
      level: row.level,
      parentId: row.parent_id,
      conceptIds: JSON.parse(row.concept_ids || '[]'),
      skillLevel: row.skill_level,
      avgProficiency: row.avg_proficiency,
      subcategories: JSON.parse(row.subcategories || '[]'),
      metadata: JSON.parse(row.metadata || '{}'),
    };
  }
}

export default OntologyBuilder;
