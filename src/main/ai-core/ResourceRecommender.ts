/**
 * ResourceRecommender - Suggests relevant external knowledge based on what the user is learning
 *
 * This service:
 * - Analyzes learning gaps and interests from user interactions
 * - Matches gaps to curated resource lists (books, docs, tutorials)
 * - Recommends resources based on current focus and struggle areas
 * - Tracks which resources were shown and clicked for refinement
 */

import { Memory } from './Memory';
import { Analyzer } from './Analyzer';
import * as crypto from 'crypto';

// ============================================
// Types
// ============================================

export type ResourceType = 'book' | 'documentation' | 'tutorial' | 'article' | 'course' | 'video' | 'tool';

export interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  author?: string;
  url?: string;
  description: string;
  topics: string[];
  languages?: string[];
  level: 'beginner' | 'intermediate' | 'advanced' | 'all';
  relevanceScore?: number;
}

export interface ResourceRecommendation {
  id: string;
  resourceId: string;
  type: ResourceType;
  title: string;
  url: string | null;
  topic: string;
  reason: string;
  relevanceScore: number;
  shownAt: number;
  clicked: boolean;
  clickedAt: number | null;
}

export interface LearningGap {
  topic: string;
  confidence: number;
  errorCount: number;
  lastSeen: number;
  suggestedResources: string[];
}

export interface ResourceRequest {
  topic?: string;
  language?: string;
  type?: ResourceType;
  level?: 'beginner' | 'intermediate' | 'advanced';
  limit?: number;
}

export interface UserResource {
  id: string;
  userId: string;
  resourceId: string;
  addedAt: number;
  status: 'reading' | 'completed' | 'bookmarked' | 'archived';
  progress: number; // 0-100 percentage
  timeSpent: number; // seconds
  lastAccessed: number;
  rating?: number; // 1-5 stars
  notes?: string;
}

export type EngagementType = 'view' | 'click' | 'read' | 'complete' | 'bookmark' | 'rate' | 'share';

export interface RecommendationContext {
  currentError?: string;
  currentFile?: string;
  currentLanguage?: string;
  currentTopic?: string;
  userIntent?: 'learning' | 'debugging' | 'exploring' | 'building';
  isStuck?: boolean; // user has been struggling with same issue
}

// ============================================
// Curated Resource Database
// ============================================

const CURATED_RESOURCES: Resource[] = [
  // ===== Programming Books =====
  {
    id: 'book-clean-code',
    type: 'book',
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    url: 'https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882',
    description: 'Learn to write clean, maintainable code with practical examples and best practices',
    topics: ['clean-code', 'refactoring', 'software-craftsmanship', 'code-quality', 'best-practices'],
    level: 'intermediate',
  },
  {
    id: 'book-pragmatic-programmer',
    type: 'book',
    title: 'The Pragmatic Programmer: Your Journey to Mastery',
    author: 'David Thomas, Andrew Hunt',
    url: 'https://pragprog.com/titles/tpp20/the-pragmatic-programmer-20th-anniversary-edition/',
    description: 'Timeless wisdom on software development, career growth, and continuous learning',
    topics: ['software-engineering', 'best-practices', 'career', 'programming-philosophy'],
    level: 'all',
  },
  {
    id: 'book-sicp',
    type: 'book',
    title: 'Structure and Interpretation of Computer Programs',
    author: 'Harold Abelson, Gerald Jay Sussman',
    url: 'https://mitpress.mit.edu/sites/default/files/sicp/full-text/book/book.html',
    description: 'Classic text on programming fundamentals and computational thinking',
    topics: ['fundamentals', 'functional-programming', 'algorithms', 'computer-science'],
    languages: ['scheme', 'lisp'],
    level: 'intermediate',
  },
  {
    id: 'book-design-patterns',
    type: 'book',
    title: 'Design Patterns: Elements of Reusable Object-Oriented Software',
    author: 'Gang of Four',
    url: 'https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612',
    description: 'The definitive guide to software design patterns',
    topics: ['design-patterns', 'oop', 'architecture', 'software-design'],
    level: 'intermediate',
  },
  {
    id: 'book-refactoring',
    type: 'book',
    title: 'Refactoring: Improving the Design of Existing Code',
    author: 'Martin Fowler',
    url: 'https://martinfowler.com/books/refactoring.html',
    description: 'Learn systematic techniques for improving code without changing behavior',
    topics: ['refactoring', 'code-quality', 'technical-debt', 'clean-code'],
    level: 'intermediate',
  },
  {
    id: 'book-eloquent-javascript',
    type: 'book',
    title: 'Eloquent JavaScript',
    author: 'Marijn Haverbeke',
    url: 'https://eloquentjavascript.net/',
    description: 'Modern introduction to JavaScript and programming fundamentals (free online)',
    topics: ['javascript', 'programming', 'web-development'],
    languages: ['javascript'],
    level: 'beginner',
  },
  {
    id: 'book-effective-typescript',
    type: 'book',
    title: 'Effective TypeScript: 62 Specific Ways to Improve Your TypeScript',
    author: 'Dan Vanderkam',
    url: 'https://effectivetypescript.com/',
    description: 'Master TypeScript with practical advice and best practices',
    topics: ['typescript', 'type-systems', 'javascript', 'best-practices'],
    languages: ['typescript'],
    level: 'intermediate',
  },
  {
    id: 'book-python-crash-course',
    type: 'book',
    title: 'Python Crash Course',
    author: 'Eric Matthes',
    url: 'https://nostarch.com/pythoncrashcourse2e',
    description: 'Fast-paced introduction to Python programming',
    topics: ['python', 'programming', 'beginner'],
    languages: ['python'],
    level: 'beginner',
  },

  // ===== Documentation =====
  {
    id: 'docs-mdn',
    type: 'documentation',
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/',
    description: 'Comprehensive web development documentation for HTML, CSS, JavaScript',
    topics: ['javascript', 'html', 'css', 'web-development', 'web-apis'],
    languages: ['javascript'],
    level: 'all',
  },
  {
    id: 'docs-typescript',
    type: 'documentation',
    title: 'TypeScript Documentation',
    url: 'https://www.typescriptlang.org/docs/',
    description: 'Official TypeScript language documentation and handbook',
    topics: ['typescript', 'type-systems', 'javascript'],
    languages: ['typescript'],
    level: 'all',
  },
  {
    id: 'docs-react',
    type: 'documentation',
    title: 'React Documentation',
    url: 'https://react.dev/',
    description: 'Official React documentation with modern hooks and best practices',
    topics: ['react', 'javascript', 'ui', 'frontend', 'components'],
    languages: ['javascript', 'typescript'],
    level: 'all',
  },
  {
    id: 'docs-python',
    type: 'documentation',
    title: 'Python Documentation',
    url: 'https://docs.python.org/3/',
    description: 'Official Python language reference and standard library documentation',
    topics: ['python', 'standard-library', 'language-reference'],
    languages: ['python'],
    level: 'all',
  },
  {
    id: 'docs-node',
    type: 'documentation',
    title: 'Node.js Documentation',
    url: 'https://nodejs.org/docs/latest/api/',
    description: 'Official Node.js API reference and guides',
    topics: ['nodejs', 'javascript', 'backend', 'server'],
    languages: ['javascript'],
    level: 'all',
  },
  {
    id: 'docs-rust',
    type: 'documentation',
    title: 'The Rust Programming Language (The Book)',
    url: 'https://doc.rust-lang.org/book/',
    description: 'Official guide to learning Rust programming',
    topics: ['rust', 'systems-programming', 'memory-safety'],
    languages: ['rust'],
    level: 'beginner',
  },
  {
    id: 'docs-go',
    type: 'documentation',
    title: 'Go Documentation',
    url: 'https://go.dev/doc/',
    description: 'Official Go programming language documentation and guides',
    topics: ['go', 'golang', 'backend', 'concurrency'],
    languages: ['go'],
    level: 'all',
  },

  // ===== Tutorials =====
  {
    id: 'tutorial-git',
    type: 'tutorial',
    title: 'Learn Git Branching',
    url: 'https://learngitbranching.js.org/',
    description: 'Interactive tutorial for learning Git branching and workflows',
    topics: ['git', 'version-control', 'workflow', 'collaboration'],
    level: 'beginner',
  },
  {
    id: 'tutorial-regex',
    type: 'tutorial',
    title: 'RegexOne - Learn Regular Expressions',
    url: 'https://regexone.com/',
    description: 'Step-by-step regex tutorial with interactive exercises',
    topics: ['regex', 'pattern-matching', 'text-processing'],
    level: 'beginner',
  },
  {
    id: 'tutorial-sql',
    type: 'tutorial',
    title: 'SQLBolt - Learn SQL',
    url: 'https://sqlbolt.com/',
    description: 'Interactive lessons on SQL queries and database concepts',
    topics: ['sql', 'database', 'queries', 'data'],
    level: 'beginner',
  },
  {
    id: 'tutorial-algorithms',
    type: 'tutorial',
    title: 'VisuAlgo - Visualising Algorithms',
    url: 'https://visualgo.net/',
    description: 'Visual representations of algorithms and data structures',
    topics: ['algorithms', 'data-structures', 'visualization', 'computer-science'],
    level: 'intermediate',
  },

  // ===== Articles & Papers =====
  {
    id: 'article-12-factor',
    type: 'article',
    title: 'The Twelve-Factor App',
    url: 'https://12factor.net/',
    description: 'Methodology for building modern, scalable, maintainable software-as-a-service apps',
    topics: ['architecture', 'deployment', 'saas', 'best-practices', 'devops'],
    level: 'intermediate',
  },
  {
    id: 'article-async-await',
    type: 'article',
    title: 'Understanding Async/Await in JavaScript',
    url: 'https://javascript.info/async-await',
    description: 'Deep dive into asynchronous JavaScript patterns',
    topics: ['javascript', 'async', 'promises', 'concurrency'],
    languages: ['javascript'],
    level: 'intermediate',
  },
  {
    id: 'article-solid-principles',
    type: 'article',
    title: 'SOLID Principles of Object-Oriented Design',
    url: 'https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design',
    description: 'Guide to the five fundamental principles of OOP',
    topics: ['oop', 'design-principles', 'architecture', 'clean-code'],
    level: 'intermediate',
  },
  {
    id: 'article-typescript-generics',
    type: 'article',
    title: 'TypeScript Generics Explained',
    url: 'https://www.typescriptlang.org/docs/handbook/2/generics.html',
    description: 'Master TypeScript generics for reusable, type-safe code',
    topics: ['typescript', 'generics', 'type-systems', 'advanced'],
    languages: ['typescript'],
    level: 'advanced',
  },

  // ===== Courses =====
  {
    id: 'course-cs50',
    type: 'course',
    title: "Harvard CS50: Introduction to Computer Science",
    url: 'https://cs50.harvard.edu/',
    description: "Harvard's renowned intro CS course (free online)",
    topics: ['computer-science', 'fundamentals', 'algorithms', 'data-structures'],
    level: 'beginner',
  },
  {
    id: 'course-missing-semester',
    type: 'course',
    title: 'The Missing Semester of Your CS Education',
    url: 'https://missing.csail.mit.edu/',
    description: 'MIT course on essential developer tools: shell, vim, git, debugging',
    topics: ['tools', 'shell', 'git', 'vim', 'debugging', 'productivity'],
    level: 'beginner',
  },
  {
    id: 'course-fast-ai',
    type: 'course',
    title: 'Practical Deep Learning for Coders',
    url: 'https://course.fast.ai/',
    description: 'Free course on deep learning and machine learning (top-down approach)',
    topics: ['machine-learning', 'deep-learning', 'ai', 'neural-networks'],
    languages: ['python'],
    level: 'intermediate',
  },
  {
    id: 'course-fullstackopen',
    type: 'course',
    title: 'Full Stack Open',
    url: 'https://fullstackopen.com/',
    description: 'University of Helsinki course on modern web development (React, Node, TypeScript)',
    topics: ['web-development', 'react', 'nodejs', 'typescript', 'fullstack'],
    languages: ['javascript', 'typescript'],
    level: 'intermediate',
  },

  // ===== Videos =====
  {
    id: 'video-fireship',
    type: 'video',
    title: 'Fireship - 100 Seconds Series',
    url: 'https://www.youtube.com/@Fireship',
    description: 'Quick, high-quality explanations of programming concepts and technologies',
    topics: ['web-development', 'programming', 'tutorials', 'quick-learning'],
    level: 'all',
  },
  {
    id: 'video-theo',
    type: 'video',
    title: 'Theo - t3.gg',
    url: 'https://www.youtube.com/@t3dotgg',
    description: 'Modern web development, TypeScript, and full-stack best practices',
    topics: ['typescript', 'web-development', 'react', 'fullstack'],
    languages: ['typescript'],
    level: 'intermediate',
  },

  // ===== Tools =====
  {
    id: 'tool-postman',
    type: 'tool',
    title: 'Postman - API Development',
    url: 'https://www.postman.com/',
    description: 'Test and document APIs with powerful HTTP client and collaboration tools',
    topics: ['api', 'rest', 'graphql', 'testing', 'backend'],
    level: 'all',
  },
  {
    id: 'tool-docker-desktop',
    type: 'tool',
    title: 'Docker Desktop',
    url: 'https://www.docker.com/products/docker-desktop/',
    description: 'Local container development environment with GUI',
    topics: ['docker', 'containers', 'devops', 'deployment'],
    level: 'beginner',
  },
  {
    id: 'tool-vscode',
    type: 'tool',
    title: 'Visual Studio Code',
    url: 'https://code.visualstudio.com/',
    description: 'Powerful, extensible code editor with excellent TypeScript/JavaScript support',
    topics: ['editor', 'ide', 'productivity', 'debugging'],
    languages: ['javascript', 'typescript', 'python'],
    level: 'all',
  },
  {
    id: 'tool-pgadmin',
    type: 'tool',
    title: 'pgAdmin - PostgreSQL GUI',
    url: 'https://www.pgadmin.org/',
    description: 'Feature-rich administration and development platform for PostgreSQL',
    topics: ['postgresql', 'database', 'sql', 'admin'],
    level: 'all',
  },
  {
    id: 'tool-insomnia',
    type: 'tool',
    title: 'Insomnia REST Client',
    url: 'https://insomnia.rest/',
    description: 'Design, debug and test APIs with a beautiful, modern interface',
    topics: ['api', 'rest', 'graphql', 'testing'],
    level: 'all',
  },
];

// ============================================
// ResourceRecommender Class
// ============================================

export class ResourceRecommender {
  private memory: Memory;
  private analyzer: Analyzer;

  constructor(memory: Memory, analyzer: Analyzer) {
    this.memory = memory;
    this.analyzer = analyzer;
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    const db = (this.memory as any).db;

    db.exec(`
      -- Resources table: all available resources (curated + user-added)
      CREATE TABLE IF NOT EXISTS resources (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        author TEXT,
        url TEXT,
        description TEXT,
        topics TEXT DEFAULT '[]',
        languages TEXT DEFAULT '[]',
        level TEXT NOT NULL,
        is_curated INTEGER DEFAULT 1,
        added_by TEXT,
        added_at INTEGER NOT NULL,
        avg_rating REAL DEFAULT 0,
        rating_count INTEGER DEFAULT 0
      );

      -- User resources table: user's personal library with progress tracking
      CREATE TABLE IF NOT EXISTS user_resources (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default-user',
        resource_id TEXT NOT NULL,
        added_at INTEGER NOT NULL,
        status TEXT NOT NULL,
        progress REAL DEFAULT 0,
        time_spent INTEGER DEFAULT 0,
        last_accessed INTEGER NOT NULL,
        rating INTEGER,
        notes TEXT,
        FOREIGN KEY (resource_id) REFERENCES resources(id) ON DELETE CASCADE
      );

      -- Recommendation log: tracks all shown recommendations
      CREATE TABLE IF NOT EXISTS resource_recommendations (
        id TEXT PRIMARY KEY,
        resource_id TEXT NOT NULL,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        url TEXT,
        topic TEXT NOT NULL,
        reason TEXT NOT NULL,
        relevance_score REAL NOT NULL,
        shown_at INTEGER NOT NULL,
        clicked INTEGER DEFAULT 0,
        clicked_at INTEGER
      );

      -- Engagement tracking: all user interactions with resources
      CREATE TABLE IF NOT EXISTS resource_engagement (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL DEFAULT 'default-user',
        resource_id TEXT NOT NULL,
        engagement_type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        metadata TEXT DEFAULT '{}'
      );

      -- Daily recommendations: one smart pick per day (prevents spam)
      CREATE TABLE IF NOT EXISTS daily_recommendations (
        id TEXT PRIMARY KEY,
        date TEXT NOT NULL,
        resource_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        reason TEXT NOT NULL,
        shown INTEGER DEFAULT 0,
        shown_at INTEGER,
        UNIQUE(date)
      );

      CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
      CREATE INDEX IF NOT EXISTS idx_resources_level ON resources(level);
      CREATE INDEX IF NOT EXISTS idx_user_resources_user ON user_resources(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_resources_status ON user_resources(status);
      CREATE INDEX IF NOT EXISTS idx_user_resources_accessed ON user_resources(last_accessed);
      CREATE INDEX IF NOT EXISTS idx_recommendations_topic ON resource_recommendations(topic);
      CREATE INDEX IF NOT EXISTS idx_recommendations_shown ON resource_recommendations(shown_at);
      CREATE INDEX IF NOT EXISTS idx_recommendations_clicked ON resource_recommendations(clicked);
      CREATE INDEX IF NOT EXISTS idx_engagement_user ON resource_engagement(user_id);
      CREATE INDEX IF NOT EXISTS idx_engagement_resource ON resource_engagement(resource_id);
      CREATE INDEX IF NOT EXISTS idx_engagement_timestamp ON resource_engagement(timestamp);
      CREATE INDEX IF NOT EXISTS idx_daily_recs_date ON daily_recommendations(date);
    `);

    // Seed curated resources if not already present
    this.seedCuratedResources();

    console.log('[ResourceRecommender] Database initialized');
  }

  /**
   * Seed the database with curated resources
   */
  private seedCuratedResources(): void {
    const db = (this.memory as any).db;
    const now = Date.now();

    for (const resource of CURATED_RESOURCES) {
      const existing = db.prepare('SELECT id FROM resources WHERE id = ?').get(resource.id);

      if (!existing) {
        db.prepare(`
          INSERT INTO resources (
            id, type, title, author, url, description, topics, languages, level,
            is_curated, added_by, added_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, 'system', ?)
        `).run(
          resource.id,
          resource.type,
          resource.title,
          resource.author || null,
          resource.url || null,
          resource.description,
          JSON.stringify(resource.topics),
          JSON.stringify(resource.languages || []),
          resource.level,
          now
        );
      }
    }
  }

  // ============================================
  // Learning Gap Analysis
  // ============================================

  /**
   * Identify what the user is struggling with or exploring
   */
  analyzeLearningGaps(): LearningGap[] {
    const gaps: Map<string, LearningGap> = new Map();

    // Get recent interactions
    const interactions = this.memory.getRecentInteractions(100);

    // Analyze error patterns
    const errorPatterns = this.memory.getPatternsByType('error');
    for (const pattern of errorPatterns) {
      const gap: LearningGap = {
        topic: pattern.name,
        confidence: 1 - pattern.confidence, // Low confidence = high gap
        errorCount: pattern.occurrences,
        lastSeen: pattern.lastSeen,
        suggestedResources: [],
      };
      gaps.set(pattern.name, gap);
    }

    // Analyze interaction topics
    for (const interaction of interactions) {
      if (interaction.outcome === 'failure' || interaction.outcome === 'partial') {
        // Extract topics from tags and errors
        const topics = [...interaction.tags, ...interaction.errorsCaught.map(e => this.extractTopic(e))];

        for (const topic of topics) {
          if (gaps.has(topic)) {
            const gap = gaps.get(topic)!;
            gap.errorCount++;
            gap.lastSeen = Math.max(gap.lastSeen, interaction.timestamp);
          } else {
            gaps.set(topic, {
              topic,
              confidence: 0.5,
              errorCount: 1,
              lastSeen: interaction.timestamp,
              suggestedResources: [],
            });
          }
        }
      }
    }

    // Convert to array and sort by relevance (recent + high error count)
    const now = Date.now();
    return Array.from(gaps.values())
      .map(gap => {
        const recencyScore = Math.max(0, 1 - (now - gap.lastSeen) / (7 * 24 * 60 * 60 * 1000)); // 7 days decay
        gap.confidence = (gap.errorCount * 0.5 + recencyScore * 0.5);
        return gap;
      })
      .sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Extract topic from error message or tag
   */
  private extractTopic(text: string): string {
    const lower = text.toLowerCase();

    // Common patterns
    if (lower.includes('typescript') || lower.includes('type error')) return 'typescript';
    if (lower.includes('javascript') || lower.includes('js')) return 'javascript';
    if (lower.includes('react')) return 'react';
    if (lower.includes('git')) return 'git';
    if (lower.includes('sql') || lower.includes('database')) return 'sql';
    if (lower.includes('async') || lower.includes('promise')) return 'async';
    if (lower.includes('regex')) return 'regex';
    if (lower.includes('python')) return 'python';
    if (lower.includes('rust')) return 'rust';
    if (lower.includes('go') || lower.includes('golang')) return 'go';

    return 'programming';
  }

  // ============================================
  // Resource Matching
  // ============================================

  /**
   * Match learning gaps to relevant resources
   */
  matchResources(request?: ResourceRequest): Resource[] {
    const db = (this.memory as any).db;
    const gaps = request?.topic ? [{ topic: request.topic, confidence: 1, errorCount: 1, lastSeen: Date.now(), suggestedResources: [] }] : this.analyzeLearningGaps();
    const limit = request?.limit || 10;
    const targetLevel = request?.level;
    const targetType = request?.type;
    const targetLanguage = request?.language?.toLowerCase();

    // Fetch resources from database
    let query = 'SELECT * FROM resources WHERE 1=1';
    const params: any[] = [];

    if (targetType) {
      query += ' AND type = ?';
      params.push(targetType);
    }

    if (targetLevel) {
      query += ' AND (level = ? OR level = ?)';
      params.push(targetLevel, 'all');
    }

    const dbResources = db.prepare(query).all(...params) as any[];
    const matches: Array<Resource & { relevanceScore: number }> = [];

    // Score each resource against gaps
    for (const row of dbResources) {
      const resource: Resource = {
        id: row.id,
        type: row.type,
        title: row.title,
        author: row.author,
        url: row.url,
        description: row.description,
        topics: JSON.parse(row.topics || '[]'),
        languages: JSON.parse(row.languages || '[]'),
        level: row.level,
      };

      // Filter by language if specified
      if (targetLanguage && resource.languages && resource.languages.length > 0 &&
          !resource.languages.some(l => l.toLowerCase().includes(targetLanguage))) {
        continue;
      }

      let relevance = 0;

      // Match against gaps
      for (const gap of gaps.slice(0, 5)) { // Top 5 gaps
        const gapTopic = gap.topic.toLowerCase();

        // Check if resource topics match gap
        const topicMatch = resource.topics.some(t =>
          t.toLowerCase().includes(gapTopic) || gapTopic.includes(t.toLowerCase())
        );

        if (topicMatch) {
          relevance += gap.confidence * 2;
        }

        // Check title match
        if (resource.title.toLowerCase().includes(gapTopic)) {
          relevance += gap.confidence * 1.5;
        }

        // Check description match
        if (resource.description && resource.description.toLowerCase().includes(gapTopic)) {
          relevance += gap.confidence * 0.5;
        }
      }

      if (relevance > 0) {
        matches.push({ ...resource, relevanceScore: relevance });
      }
    }

    // Sort by relevance and return top matches
    return matches
      .sort((a, b) => b.relevanceScore! - a.relevanceScore!)
      .slice(0, limit);
  }

  /**
   * Get book recommendations based on current focus
   */
  getRecommendedBooks(topic?: string, language?: string): Resource[] {
    return this.matchResources({
      type: 'book',
      topic,
      language,
      limit: 5
    });
  }

  /**
   * Get relevant documentation for technologies in use
   */
  getRelevantDocs(language?: string, topic?: string): Resource[] {
    return this.matchResources({
      type: 'documentation',
      topic,
      language,
      limit: 5
    });
  }

  /**
   * Get tutorial suggestions for concepts the user is learning
   */
  getTutorialSuggestions(topic?: string): Resource[] {
    return this.matchResources({
      type: 'tutorial',
      topic,
      limit: 5
    });
  }

  /**
   * Get article recommendations for deeper understanding
   */
  getArticleRecommendations(topic?: string): Resource[] {
    return this.matchResources({
      type: 'article',
      topic,
      limit: 5
    });
  }

  /**
   * Get course suggestions for skill gaps
   */
  getCourseSuggestions(level?: 'beginner' | 'intermediate' | 'advanced'): Resource[] {
    return this.matchResources({
      type: 'course',
      level,
      limit: 5
    });
  }

  // ============================================
  // Recommendation Tracking
  // ============================================

  /**
   * Record that a resource was shown to the user
   */
  recordRecommendation(resource: Resource, topic: string, reason: string): string {
    const db = (this.memory as any).db;
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO resource_recommendations (
        id, resource_id, type, title, url, topic, reason, relevance_score, shown_at, clicked
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      id,
      resource.id,
      resource.type,
      resource.title,
      resource.url || null,
      topic,
      reason,
      resource.relevanceScore || 0,
      Date.now()
    );

    return id;
  }

  /**
   * Record that a user clicked on a resource
   */
  recordResourceClick(recommendationId: string): void {
    const db = (this.memory as any).db;

    db.prepare(`
      UPDATE resource_recommendations
      SET clicked = 1, clicked_at = ?
      WHERE id = ?
    `).run(Date.now(), recommendationId);

    console.log('[ResourceRecommender] Resource clicked:', recommendationId);
  }

  /**
   * Get recommendation history
   */
  getRecommendationHistory(limit: number = 50): ResourceRecommendation[] {
    const db = (this.memory as any).db;

    const rows = db.prepare(`
      SELECT * FROM resource_recommendations
      ORDER BY shown_at DESC
      LIMIT ?
    `).all(limit);

    return rows.map((row: any) => ({
      id: row.id,
      resourceId: row.resource_id,
      type: row.type,
      title: row.title,
      url: row.url,
      topic: row.topic,
      reason: row.reason,
      relevanceScore: row.relevance_score,
      shownAt: row.shown_at,
      clicked: row.clicked === 1,
      clickedAt: row.clicked_at,
    }));
  }

  /**
   * Get click-through rate for recommendations
   */
  getRecommendationStats(): {
    totalShown: number;
    totalClicked: number;
    clickThroughRate: number;
    byType: Record<ResourceType, { shown: number; clicked: number; ctr: number }>;
  } {
    const db = (this.memory as any).db;

    const totalShown = (db.prepare('SELECT COUNT(*) as count FROM resource_recommendations').get() as any).count;
    const totalClicked = (db.prepare('SELECT COUNT(*) as count FROM resource_recommendations WHERE clicked = 1').get() as any).count;

    const byTypeRows = db.prepare(`
      SELECT
        type,
        COUNT(*) as shown,
        SUM(clicked) as clicked
      FROM resource_recommendations
      GROUP BY type
    `).all() as Array<{ type: ResourceType; shown: number; clicked: number }>;

    const byType: Record<ResourceType, { shown: number; clicked: number; ctr: number }> = {} as any;

    for (const row of byTypeRows) {
      byType[row.type] = {
        shown: row.shown,
        clicked: row.clicked,
        ctr: row.shown > 0 ? row.clicked / row.shown : 0,
      };
    }

    return {
      totalShown,
      totalClicked,
      clickThroughRate: totalShown > 0 ? totalClicked / totalShown : 0,
      byType,
    };
  }

  // ============================================
  // Recommendation Generation with Context
  // ============================================

  /**
   * Get comprehensive recommendations with reasoning
   */
  getRecommendedResources(options?: {
    topic?: string;
    language?: string;
    type?: ResourceType;
    includeReasoning?: boolean;
  }): Array<Resource & { reason?: string }> {
    const gaps = this.analyzeLearningGaps();
    const resources = this.matchResources({
      topic: options?.topic,
      language: options?.language,
      type: options?.type,
      limit: 10,
    });

    if (!options?.includeReasoning) {
      return resources;
    }

    // Add reasoning for each recommendation
    return resources.map(resource => {
      const matchingGaps = gaps.filter(gap =>
        resource.topics.some(t =>
          t.toLowerCase().includes(gap.topic.toLowerCase()) ||
          gap.topic.toLowerCase().includes(t.toLowerCase())
        )
      );

      let reason = '';
      if (matchingGaps.length > 0) {
        const topGap = matchingGaps[0];
        reason = `You've encountered ${topGap.errorCount} issue(s) related to ${topGap.topic}. This resource can help strengthen your understanding.`;
      } else {
        reason = `Recommended based on your current learning focus and activity patterns.`;
      }

      // Record this recommendation
      this.recordRecommendation(resource, matchingGaps[0]?.topic || 'general', reason);

      return { ...resource, reason };
    });
  }

  // ============================================
  // New Methods: Context-based Recommendations
  // ============================================

  /**
   * Get contextual recommendations based on current situation
   */
  getRecommendations(context: RecommendationContext): Array<Resource & { reason: string }> {
    const db = (this.memory as any).db;
    const recommendations: Array<Resource & { reason: string }> = [];

    // If user is stuck with an error, recommend debugging/tutorial resources
    if (context.isStuck && context.currentError) {
      const errorTopic = this.extractTopic(context.currentError);
      const resources = this.matchResources({
        topic: errorTopic,
        type: context.userIntent === 'debugging' ? 'tutorial' : undefined,
        limit: 3
      });

      recommendations.push(...resources.map(r => ({
        ...r,
        reason: `Struggling with ${errorTopic}? This ${r.type} might help you get unstuck.`
      })));
    }

    // Based on user intent
    if (context.userIntent === 'learning' && context.currentTopic) {
      const resources = this.matchResources({
        topic: context.currentTopic,
        limit: 3
      });

      recommendations.push(...resources.map(r => ({
        ...r,
        reason: `Great resources for learning ${context.currentTopic}.`
      })));
    }

    // Language-specific documentation
    if (context.currentLanguage) {
      const docs = this.matchResources({
        language: context.currentLanguage,
        type: 'documentation',
        limit: 2
      });

      recommendations.push(...docs.map(r => ({
        ...r,
        reason: `Official ${context.currentLanguage} documentation for quick reference.`
      })));
    }

    // Remove duplicates
    const seen = new Set<string>();
    const uniqueRecs = recommendations.filter(r => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });

    // Record these recommendations
    for (const rec of uniqueRecs) {
      this.recordRecommendation(rec, context.currentTopic || 'contextual', rec.reason);
    }

    return uniqueRecs.slice(0, 5);
  }

  // ============================================
  // User Library Management
  // ============================================

  /**
   * Add resource to user's personal library
   */
  addResource(resource: Resource, userId: string = 'default-user'): UserResource {
    const db = (this.memory as any).db;
    const id = crypto.randomUUID();
    const now = Date.now();

    // First, ensure resource exists in resources table
    const existing = db.prepare('SELECT id FROM resources WHERE id = ?').get(resource.id);
    if (!existing) {
      db.prepare(`
        INSERT INTO resources (
          id, type, title, author, url, description, topics, languages, level,
          is_curated, added_by, added_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
      `).run(
        resource.id,
        resource.type,
        resource.title,
        resource.author || null,
        resource.url || null,
        resource.description,
        JSON.stringify(resource.topics),
        JSON.stringify(resource.languages || []),
        resource.level,
        userId,
        now
      );
    }

    // Add to user's library
    db.prepare(`
      INSERT INTO user_resources (
        id, user_id, resource_id, added_at, status, progress, time_spent, last_accessed
      ) VALUES (?, ?, ?, ?, 'bookmarked', 0, 0, ?)
    `).run(id, userId, resource.id, now, now);

    // Record engagement
    this.recordResourceEngagement(resource.id, 'bookmark', userId);

    return {
      id,
      userId,
      resourceId: resource.id,
      addedAt: now,
      status: 'bookmarked',
      progress: 0,
      timeSpent: 0,
      lastAccessed: now,
    };
  }

  /**
   * Get user's reading list (saved resources)
   */
  getReadingList(userId: string = 'default-user', status?: 'reading' | 'completed' | 'bookmarked' | 'archived'): Array<Resource & { userResource: UserResource }> {
    const db = (this.memory as any).db;

    let query = `
      SELECT r.*, ur.*,
             r.id as resource_id,
             ur.id as user_resource_id
      FROM user_resources ur
      JOIN resources r ON r.id = ur.resource_id
      WHERE ur.user_id = ?
    `;
    const params: any[] = [userId];

    if (status) {
      query += ' AND ur.status = ?';
      params.push(status);
    }

    query += ' ORDER BY ur.last_accessed DESC';

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map(row => {
      const resource: Resource = {
        id: row.resource_id,
        type: row.type,
        title: row.title,
        author: row.author,
        url: row.url,
        description: row.description,
        topics: JSON.parse(row.topics || '[]'),
        languages: JSON.parse(row.languages || '[]'),
        level: row.level,
      };

      const userResource: UserResource = {
        id: row.user_resource_id,
        userId: row.user_id,
        resourceId: row.resource_id,
        addedAt: row.added_at,
        status: row.status,
        progress: row.progress,
        timeSpent: row.time_spent,
        lastAccessed: row.last_accessed,
        rating: row.rating,
        notes: row.notes,
      };

      return { ...resource, userResource };
    });
  }

  /**
   * Get completed resources
   */
  getCompletedResources(userId: string = 'default-user'): Array<Resource & { userResource: UserResource }> {
    return this.getReadingList(userId, 'completed');
  }

  /**
   * Update resource progress
   */
  updateResourceProgress(resourceId: string, progress: number, timeSpent: number, userId: string = 'default-user'): void {
    const db = (this.memory as any).db;
    const now = Date.now();

    // Determine status based on progress
    let status: 'reading' | 'completed' = progress >= 100 ? 'completed' : 'reading';

    db.prepare(`
      UPDATE user_resources
      SET progress = ?, time_spent = time_spent + ?, status = ?, last_accessed = ?
      WHERE user_id = ? AND resource_id = ?
    `).run(progress, timeSpent, status, now, userId, resourceId);

    // Record engagement
    const engagementType = progress >= 100 ? 'complete' : 'read';
    this.recordResourceEngagement(resourceId, engagementType as EngagementType, userId, { progress, timeSpent });
  }

  /**
   * Rate a resource
   */
  rateResource(resourceId: string, rating: number, userId: string = 'default-user'): void {
    const db = (this.memory as any).db;

    // Update user resource
    db.prepare(`
      UPDATE user_resources
      SET rating = ?
      WHERE user_id = ? AND resource_id = ?
    `).run(rating, userId, resourceId);

    // Update resource average rating
    const ratings = db.prepare(`
      SELECT rating FROM user_resources WHERE resource_id = ? AND rating IS NOT NULL
    `).all(resourceId) as Array<{ rating: number }>;

    if (ratings.length > 0) {
      const avgRating = ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;
      db.prepare(`
        UPDATE resources
        SET avg_rating = ?, rating_count = ?
        WHERE id = ?
      `).run(avgRating, ratings.length, resourceId);
    }

    // Record engagement
    this.recordResourceEngagement(resourceId, 'rate', userId, { rating });
  }

  // ============================================
  // Engagement Tracking
  // ============================================

  /**
   * Record user engagement with a resource
   */
  recordResourceEngagement(resourceId: string, engagementType: EngagementType, userId: string = 'default-user', metadata: Record<string, any> = {}): void {
    const db = (this.memory as any).db;
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO resource_engagement (
        id, user_id, resource_id, engagement_type, timestamp, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, resourceId, engagementType, Date.now(), JSON.stringify(metadata));
  }

  /**
   * Get engagement history for a resource
   */
  getResourceEngagement(resourceId: string, userId?: string): Array<{
    id: string;
    userId: string;
    engagementType: EngagementType;
    timestamp: number;
    metadata: Record<string, any>;
  }> {
    const db = (this.memory as any).db;

    let query = 'SELECT * FROM resource_engagement WHERE resource_id = ?';
    const params: any[] = [resourceId];

    if (userId) {
      query += ' AND user_id = ?';
      params.push(userId);
    }

    query += ' ORDER BY timestamp DESC';

    const rows = db.prepare(query).all(...params) as any[];

    return rows.map(row => ({
      id: row.id,
      userId: row.user_id,
      engagementType: row.engagement_type,
      timestamp: row.timestamp,
      metadata: JSON.parse(row.metadata || '{}'),
    }));
  }

  // ============================================
  // Smart Timing: Daily Recommendations
  // ============================================

  /**
   * Get one smart recommendation per day (prevents spam)
   */
  getDailyRecommendation(userId: string = 'default-user'): (Resource & { reason: string }) | null {
    const db = (this.memory as any).db;
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    // Check if we already have a recommendation for today
    const existing = db.prepare('SELECT * FROM daily_recommendations WHERE date = ?').get(today) as any;

    if (existing && existing.shown) {
      // Already shown today, don't spam
      return null;
    }

    // Generate new recommendation
    const gaps = this.analyzeLearningGaps();
    if (gaps.length === 0) {
      return null;
    }

    const topGap = gaps[0];
    const resources = this.matchResources({
      topic: topGap.topic,
      limit: 1
    });

    if (resources.length === 0) {
      return null;
    }

    const resource = resources[0];
    const reason = `Daily pick: You've been working with ${topGap.topic}. This ${resource.type} is highly rated and can deepen your understanding.`;

    // Save or update daily recommendation
    if (existing) {
      db.prepare(`
        UPDATE daily_recommendations
        SET shown = 1, shown_at = ?
        WHERE date = ?
      `).run(Date.now(), today);
    } else {
      db.prepare(`
        INSERT INTO daily_recommendations (id, date, resource_id, topic, reason, shown, shown_at)
        VALUES (?, ?, ?, ?, ?, 1, ?)
      `).run(crypto.randomUUID(), today, resource.id, topGap.topic, reason, Date.now());
    }

    // Record this recommendation
    this.recordRecommendation(resource, topGap.topic, reason);

    return { ...resource, reason };
  }

  /**
   * Check if user should receive a recommendation (smart timing)
   */
  shouldShowRecommendation(userId: string = 'default-user'): boolean {
    const db = (this.memory as any).db;

    // Don't show more than once per day
    const today = new Date().toISOString().split('T')[0];
    const todayRec = db.prepare('SELECT shown FROM daily_recommendations WHERE date = ? AND shown = 1').get(today);
    if (todayRec) {
      return false;
    }

    // Don't spam - check last recommendation time
    const lastRec = db.prepare(`
      SELECT shown_at FROM resource_recommendations
      ORDER BY shown_at DESC LIMIT 1
    `).get() as any;

    if (lastRec) {
      const hoursSinceLastRec = (Date.now() - lastRec.shown_at) / (1000 * 60 * 60);
      if (hoursSinceLastRec < 4) {
        return false; // Wait at least 4 hours between recommendations
      }
    }

    return true;
  }

  /**
   * Get weekly learning digest
   */
  getWeeklyDigest(userId: string = 'default-user'): {
    topTopics: Array<{ topic: string; progress: string }>;
    completedResources: number;
    totalTimeSpent: number;
    recommendedResources: Array<Resource & { reason: string }>;
  } {
    const db = (this.memory as any).db;
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

    // Get top topics from learning gaps
    const gaps = this.analyzeLearningGaps();
    const topTopics = gaps.slice(0, 5).map(gap => ({
      topic: gap.topic,
      progress: gap.errorCount > 5 ? 'Needs practice' : gap.errorCount > 2 ? 'Learning' : 'Getting it!',
    }));

    // Get completed resources this week
    const completed = db.prepare(`
      SELECT COUNT(*) as count FROM user_resources
      WHERE user_id = ? AND status = 'completed' AND last_accessed >= ?
    `).get(userId, weekAgo) as any;

    // Get total time spent this week
    const timeSpent = db.prepare(`
      SELECT SUM(time_spent) as total FROM user_resources
      WHERE user_id = ? AND last_accessed >= ?
    `).get(userId, weekAgo) as any;

    // Get recommended resources for next week
    const recommendedResources = gaps.slice(0, 3).flatMap(gap => {
      const resources = this.matchResources({ topic: gap.topic, limit: 1 });
      return resources.map(r => ({
        ...r,
        reason: `Continue learning ${gap.topic} with this ${r.type}.`
      }));
    });

    return {
      topTopics,
      completedResources: completed?.count || 0,
      totalTimeSpent: timeSpent?.total || 0,
      recommendedResources,
    };
  }
}

export default ResourceRecommender;
