/**
 * UserProfiler - ZOIX User Intelligence Layer
 *
 * Understands WHO the user is - their interests, domains, learning trajectory.
 * Like looking at someone's bookshelf to understand what they know and care about.
 *
 * Features:
 * - Interest tracking with recency/frequency weighting and decay
 * - Domain detection (frontend, backend, data science, etc.)
 * - Learning trajectory analysis (skill progression over time)
 * - Strength and growth area identification
 *
 * Uses standalone SQLite database (zoix.db) for persistence.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';

// ============================================
// Types
// ============================================

export interface Interest {
  topic: string;
  weight: number; // 0-100 score based on frequency/recency
  firstSeen: number;
  lastSeen: number;
  occurrences: number;
  decayFactor: number; // 0-1, how much to decay over time
}

export interface Domain {
  name: string;
  type: 'primary' | 'secondary' | 'emerging';
  confidence: number; // 0-1
  topics: string[];
  lastActivity: number;
}

export interface SkillProgression {
  topic: string;
  level: 'learning' | 'intermediate' | 'mastery';
  trajectory: 'improving' | 'stable' | 'declining';
  errorRate: number;
  successRate: number;
  avgCompletionTime: number; // milliseconds
  complexity: number; // 0-100
}

export interface UserProfile {
  userId: string;
  interests: Interest[];
  domains: Domain[];
  skillProgressions: SkillProgression[];
  learningGoals: string[];
  strengths: string[];
  growthAreas: string[];
  lastUpdated: number;
  totalActivities: number;
}

export interface Activity {
  id: string;
  sessionId: string;
  activityType: 'interaction' | 'code' | 'error' | 'success' | 'search' | 'documentation';
  context: string; // JSON blob of activity context
  topics: string[];
  outcome: 'success' | 'failure' | 'partial' | 'unknown';
  duration: number; // milliseconds
  complexity: number; // 0-100
  timestamp: number;
}

// ============================================
// Topic Detection & Classification
// ============================================

class TopicClassifier {
  private static readonly TOPIC_PATTERNS = {
    // AI/ML
    'ai-ml': {
      keywords: ['machine learning', 'deep learning', 'neural network', 'tensorflow', 'pytorch', 'keras', 'sklearn', 'llm', 'gpt', 'claude', 'ollama', 'transformers', 'embeddings', 'rag', 'langchain'],
      domain: 'ai-ml',
    },
    // Frontend
    'react': { keywords: ['react', 'jsx', 'tsx', 'hooks', 'useEffect', 'useState', 'component', 'props'], domain: 'frontend' },
    'vue': { keywords: ['vue', 'vuex', 'nuxt', 'composition api', 'reactive'], domain: 'frontend' },
    'angular': { keywords: ['angular', 'typescript', 'rxjs', 'directive', 'component'], domain: 'frontend' },
    'frontend': { keywords: ['html', 'css', 'dom', 'browser', 'webpack', 'vite', 'tailwind', 'sass'], domain: 'frontend' },
    // Backend
    'node': { keywords: ['node.js', 'express', 'fastify', 'npm', 'package.json'], domain: 'backend' },
    'python-backend': { keywords: ['flask', 'django', 'fastapi', 'uvicorn', 'sqlalchemy'], domain: 'backend' },
    'api': { keywords: ['rest', 'graphql', 'api', 'endpoint', 'route', 'middleware', 'cors'], domain: 'backend' },
    // DevOps
    'docker': { keywords: ['docker', 'dockerfile', 'container', 'image', 'compose'], domain: 'devops' },
    'kubernetes': { keywords: ['kubernetes', 'k8s', 'pod', 'deployment', 'helm', 'kubectl'], domain: 'devops' },
    'ci-cd': { keywords: ['github actions', 'gitlab ci', 'jenkins', 'circleci', 'pipeline', 'deploy'], domain: 'devops' },
    // Cloud
    'aws': { keywords: ['aws', 'ec2', 's3', 'lambda', 'dynamodb', 'cloudformation'], domain: 'cloud' },
    'gcp': { keywords: ['gcp', 'google cloud', 'gke', 'cloud run', 'firestore'], domain: 'cloud' },
    'azure': { keywords: ['azure', 'cosmos db', 'app service', 'azure functions'], domain: 'cloud' },
    // Data
    'data-science': { keywords: ['pandas', 'numpy', 'matplotlib', 'jupyter', 'sklearn', 'data analysis'], domain: 'data-science' },
    'data-engineering': { keywords: ['spark', 'kafka', 'airflow', 'etl', 'pipeline', 'data warehouse'], domain: 'data-engineering' },
    // Databases
    'sql': { keywords: ['postgres', 'mysql', 'sqlite', 'sql', 'query', 'database', 'schema'], domain: 'database' },
    'nosql': { keywords: ['mongodb', 'redis', 'elasticsearch', 'cassandra', 'dynamodb'], domain: 'database' },
    // Mobile
    'ios': { keywords: ['swift', 'swiftui', 'uikit', 'xcode', 'ios', 'iphone'], domain: 'mobile' },
    'android': { keywords: ['kotlin', 'android', 'compose', 'gradle', 'android studio'], domain: 'mobile' },
    'react-native': { keywords: ['react native', 'expo', 'metro'], domain: 'mobile' },
    // Security
    'security': { keywords: ['security', 'authentication', 'encryption', 'jwt', 'oauth', 'ssl', 'vulnerability'], domain: 'security' },
    // Testing
    'testing': { keywords: ['test', 'jest', 'mocha', 'pytest', 'unit test', 'integration test', 'e2e'], domain: 'quality' },
  };

  private static readonly DOMAIN_MAP = {
    'frontend': ['react', 'vue', 'angular', 'frontend'],
    'backend': ['node', 'python-backend', 'api'],
    'devops': ['docker', 'kubernetes', 'ci-cd'],
    'cloud': ['aws', 'gcp', 'azure'],
    'data-science': ['data-science'],
    'data-engineering': ['data-engineering'],
    'database': ['sql', 'nosql'],
    'mobile': ['ios', 'android', 'react-native'],
    'ai-ml': ['ai-ml'],
    'security': ['security'],
    'quality': ['testing'],
  };

  static detectTopics(text: string): { topic: string; confidence: number }[] {
    const lowerText = text.toLowerCase();
    const detected: { topic: string; confidence: number }[] = [];

    for (const [topic, config] of Object.entries(this.TOPIC_PATTERNS)) {
      let score = 0;
      for (const keyword of config.keywords) {
        const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
        const matches = (lowerText.match(regex) || []).length;
        score += matches;
      }

      if (score > 0) {
        const confidence = Math.min(1, score / 10);
        detected.push({ topic, confidence });
      }
    }

    return detected.sort((a, b) => b.confidence - a.confidence);
  }

  static inferDomains(topics: Interest[]): string[] {
    const domainScores = new Map<string, number>();

    for (const interest of topics) {
      for (const [domain, topicList] of Object.entries(this.DOMAIN_MAP)) {
        if (topicList.includes(interest.topic)) {
          domainScores.set(domain, (domainScores.get(domain) || 0) + interest.weight);
        }
      }
    }

    return Array.from(domainScores.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([domain]) => domain);
  }
}

// ============================================
// Complexity Analyzer
// ============================================

class ComplexityAnalyzer {
  static analyze(context: string): number {
    let score = 0;

    // Length indicator
    const lines = context.split('\n').length;
    score += Math.min(20, lines / 10);

    // Code patterns
    const patterns = {
      classes: /\b(class|interface|type)\s+\w+/g,
      functions: /\b(function|def|func|fn|const\s+\w+\s*=\s*\([^)]*\)\s*=>)/g,
      asyncAwait: /\b(async|await)\b/g,
      errorHandling: /\b(try|catch|except|throw|raise)\b/g,
      complexity: /\b(if|for|while|switch|case)\b/g,
    };

    for (const pattern of Object.values(patterns)) {
      const matches = (context.match(pattern) || []).length;
      score += matches * 2;
    }

    return Math.min(100, score);
  }
}

// ============================================
// UserProfiler Singleton Class
// ============================================

export class UserProfiler {
  private static instance: UserProfiler | null = null;
  private db: Database.Database;
  private dbPath: string;
  private userId: string;

  // Decay settings
  private readonly DECAY_RATE = 0.95; // 5% decay per week
  private readonly DECAY_INTERVAL = 7 * 24 * 60 * 60 * 1000; // 1 week in ms

  private constructor(userId: string = 'default-user') {
    this.userId = userId;

    // Store in user data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'zoix.db');
    this.db = new Database(this.dbPath);

    this.initialize();
  }

  static getInstance(userId?: string): UserProfiler {
    if (!UserProfiler.instance) {
      UserProfiler.instance = new UserProfiler(userId);
    }
    return UserProfiler.instance;
  }

  private initialize(): void {
    // Enable WAL mode for better performance
    this.db.pragma('journal_mode = WAL');

    // Create tables
    this.db.exec(`
      -- User profile metadata
      CREATE TABLE IF NOT EXISTS user_profile (
        user_id TEXT PRIMARY KEY,
        last_updated INTEGER NOT NULL,
        total_activities INTEGER DEFAULT 0
      );

      -- Interests with decay
      CREATE TABLE IF NOT EXISTS interests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        weight REAL DEFAULT 0,
        first_seen INTEGER NOT NULL,
        last_seen INTEGER NOT NULL,
        occurrences INTEGER DEFAULT 1,
        decay_factor REAL DEFAULT 1.0,
        UNIQUE(user_id, topic)
      );

      -- Activity log
      CREATE TABLE IF NOT EXISTS activities (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        context TEXT,
        topics TEXT DEFAULT '[]',
        outcome TEXT DEFAULT 'unknown',
        duration INTEGER DEFAULT 0,
        complexity REAL DEFAULT 0,
        timestamp INTEGER NOT NULL
      );

      -- Skill progressions
      CREATE TABLE IF NOT EXISTS skill_progressions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        topic TEXT NOT NULL,
        level TEXT DEFAULT 'learning',
        trajectory TEXT DEFAULT 'stable',
        error_rate REAL DEFAULT 0,
        success_rate REAL DEFAULT 0,
        avg_completion_time INTEGER DEFAULT 0,
        complexity REAL DEFAULT 0,
        last_updated INTEGER NOT NULL,
        UNIQUE(user_id, topic)
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_interests_user ON interests(user_id);
      CREATE INDEX IF NOT EXISTS idx_interests_weight ON interests(weight DESC);
      CREATE INDEX IF NOT EXISTS idx_activities_user ON activities(user_id);
      CREATE INDEX IF NOT EXISTS idx_activities_session ON activities(session_id);
      CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
      CREATE INDEX IF NOT EXISTS idx_skill_user ON skill_progressions(user_id);
    `);

    // Initialize user profile if not exists
    const existing = this.db.prepare('SELECT * FROM user_profile WHERE user_id = ?').get(this.userId);
    if (!existing) {
      this.db.prepare(`
        INSERT INTO user_profile (user_id, last_updated, total_activities) VALUES (?, ?, ?)
      `).run(this.userId, Date.now(), 0);
    }

    console.log('[UserProfiler] Initialized with database:', this.dbPath);
  }

  // ============================================
  // Activity Recording
  // ============================================

  recordActivity(
    sessionId: string,
    activityType: Activity['activityType'],
    context: string,
    outcome: Activity['outcome'] = 'unknown',
    duration: number = 0
  ): string {
    const id = crypto.randomUUID();
    const timestamp = Date.now();

    // Detect topics from context
    const detectedTopics = TopicClassifier.detectTopics(context);
    const topics = detectedTopics.map(t => t.topic);

    // Calculate complexity
    const complexity = ComplexityAnalyzer.analyze(context);

    // Save activity
    this.db.prepare(`
      INSERT INTO activities (
        id, user_id, session_id, activity_type, context, topics,
        outcome, duration, complexity, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      this.userId,
      sessionId,
      activityType,
      context,
      JSON.stringify(topics),
      outcome,
      duration,
      complexity,
      timestamp
    );

    // Update interests
    for (const { topic, confidence } of detectedTopics) {
      this.updateInterest(topic, confidence * 10); // Scale to 0-10 weight
    }

    // Update total activities
    this.db.prepare(`
      UPDATE user_profile SET total_activities = total_activities + 1, last_updated = ? WHERE user_id = ?
    `).run(timestamp, this.userId);

    // Update skill progressions
    this.updateSkillProgressions(topics, outcome, duration, complexity);

    return id;
  }

  // ============================================
  // Interest Management
  // ============================================

  updateInterest(topic: string, weightIncrement: number): void {
    const now = Date.now();

    const existing = this.db.prepare(`
      SELECT * FROM interests WHERE user_id = ? AND topic = ?
    `).get(this.userId, topic) as any;

    if (existing) {
      // Apply decay first
      const timeSinceLastSeen = now - existing.last_seen;
      const decayPeriods = timeSinceLastSeen / this.DECAY_INTERVAL;
      const decayedWeight = existing.weight * Math.pow(this.DECAY_RATE, decayPeriods);

      // Add new weight
      const newWeight = Math.min(100, decayedWeight + weightIncrement);

      this.db.prepare(`
        UPDATE interests
        SET weight = ?, last_seen = ?, occurrences = occurrences + 1
        WHERE user_id = ? AND topic = ?
      `).run(newWeight, now, this.userId, topic);
    } else {
      // Create new interest
      const id = crypto.randomUUID();
      this.db.prepare(`
        INSERT INTO interests (
          id, user_id, topic, weight, first_seen, last_seen, occurrences, decay_factor
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, this.userId, topic, weightIncrement, now, now, 1, 1.0);
    }
  }

  /**
   * Apply time-based decay to all interests
   */
  applyInterestDecay(): void {
    const now = Date.now();
    const interests = this.db.prepare(`
      SELECT * FROM interests WHERE user_id = ?
    `).all(this.userId) as any[];

    for (const interest of interests) {
      const timeSinceLastSeen = now - interest.last_seen;
      const decayPeriods = timeSinceLastSeen / this.DECAY_INTERVAL;
      const decayedWeight = interest.weight * Math.pow(this.DECAY_RATE, decayPeriods);

      this.db.prepare(`
        UPDATE interests SET weight = ? WHERE id = ?
      `).run(decayedWeight, interest.id);
    }
  }

  // ============================================
  // Skill Progression Tracking
  // ============================================

  private updateSkillProgressions(
    topics: string[],
    outcome: Activity['outcome'],
    duration: number,
    complexity: number
  ): void {
    const now = Date.now();

    for (const topic of topics) {
      const existing = this.db.prepare(`
        SELECT * FROM skill_progressions WHERE user_id = ? AND topic = ?
      `).get(this.userId, topic) as any;

      if (existing) {
        // Update existing progression
        const totalCount = existing.error_rate + existing.success_rate + 1;
        const newErrorRate = outcome === 'failure'
          ? (existing.error_rate * (totalCount - 1) + 1) / totalCount
          : existing.error_rate * (totalCount - 1) / totalCount;
        const newSuccessRate = outcome === 'success'
          ? (existing.success_rate * (totalCount - 1) + 1) / totalCount
          : existing.success_rate * (totalCount - 1) / totalCount;

        // Update average completion time
        const newAvgTime = (existing.avg_completion_time * (totalCount - 1) + duration) / totalCount;

        // Update average complexity
        const newAvgComplexity = (existing.complexity * (totalCount - 1) + complexity) / totalCount;

        // Infer level
        const level = this.inferSkillLevel(newErrorRate, newSuccessRate, newAvgComplexity);

        // Infer trajectory
        const trajectory = this.inferTrajectory(newSuccessRate, existing.success_rate);

        this.db.prepare(`
          UPDATE skill_progressions
          SET error_rate = ?, success_rate = ?, avg_completion_time = ?,
              complexity = ?, level = ?, trajectory = ?, last_updated = ?
          WHERE user_id = ? AND topic = ?
        `).run(
          newErrorRate,
          newSuccessRate,
          newAvgTime,
          newAvgComplexity,
          level,
          trajectory,
          now,
          this.userId,
          topic
        );
      } else {
        // Create new progression
        const id = crypto.randomUUID();
        const errorRate = outcome === 'failure' ? 1 : 0;
        const successRate = outcome === 'success' ? 1 : 0;
        const level = this.inferSkillLevel(errorRate, successRate, complexity);

        this.db.prepare(`
          INSERT INTO skill_progressions (
            id, user_id, topic, level, trajectory, error_rate, success_rate,
            avg_completion_time, complexity, last_updated
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          id,
          this.userId,
          topic,
          level,
          'stable',
          errorRate,
          successRate,
          duration,
          complexity,
          now
        );
      }
    }
  }

  private inferSkillLevel(errorRate: number, successRate: number, complexity: number): SkillProgression['level'] {
    if (errorRate < 0.2 && successRate > 0.7 && complexity > 60) {
      return 'mastery';
    } else if (errorRate < 0.4 && successRate > 0.4) {
      return 'intermediate';
    }
    return 'learning';
  }

  private inferTrajectory(currentSuccess: number, previousSuccess: number): SkillProgression['trajectory'] {
    const diff = currentSuccess - previousSuccess;
    if (diff > 0.1) return 'improving';
    if (diff < -0.1) return 'declining';
    return 'stable';
  }

  // ============================================
  // Profile Queries
  // ============================================

  getProfile(): UserProfile {
    this.applyInterestDecay();

    const interests = this.db.prepare(`
      SELECT * FROM interests WHERE user_id = ? ORDER BY weight DESC
    `).all(this.userId) as any[];

    const skillProgressions = this.db.prepare(`
      SELECT * FROM skill_progressions WHERE user_id = ? ORDER BY complexity DESC
    `).all(this.userId) as any[];

    const metadata = this.db.prepare(`
      SELECT * FROM user_profile WHERE user_id = ?
    `).get(this.userId) as any;

    // Map to typed objects
    const typedInterests: Interest[] = interests.map(i => ({
      topic: i.topic,
      weight: i.weight,
      firstSeen: i.first_seen,
      lastSeen: i.last_seen,
      occurrences: i.occurrences,
      decayFactor: i.decay_factor,
    }));

    const typedProgressions: SkillProgression[] = skillProgressions.map(sp => ({
      topic: sp.topic,
      level: sp.level,
      trajectory: sp.trajectory,
      errorRate: sp.error_rate,
      successRate: sp.success_rate,
      avgCompletionTime: sp.avg_completion_time,
      complexity: sp.complexity,
    }));

    // Infer domains
    const primaryDomains = TopicClassifier.inferDomains(typedInterests);
    const domains: Domain[] = primaryDomains.slice(0, 3).map((domain, idx) => ({
      name: domain,
      type: idx === 0 ? 'primary' as const : (idx === 1 ? 'secondary' as const : 'emerging' as const),
      confidence: 1 - (idx * 0.2),
      topics: typedInterests.filter(i => {
        const topicKey = i.topic as keyof typeof TopicClassifier['TOPIC_PATTERNS'];
        return TopicClassifier['TOPIC_PATTERNS'][topicKey]?.domain === domain;
      }).map(i => i.topic),
      lastActivity: Date.now(),
    }));

    // Identify learning goals (low skill level, recent activity)
    const learningGoals = typedProgressions
      .filter(sp => sp.level === 'learning' && sp.trajectory === 'improving')
      .slice(0, 5)
      .map(sp => sp.topic);

    // Identify strengths (high skill level, high success)
    const strengths = typedProgressions
      .filter(sp => sp.level === 'mastery' || (sp.successRate > 0.7 && sp.errorRate < 0.2))
      .slice(0, 5)
      .map(sp => sp.topic);

    // Identify growth areas (high error rate)
    const growthAreas = typedProgressions
      .filter(sp => sp.errorRate > 0.4)
      .sort((a, b) => b.errorRate - a.errorRate)
      .slice(0, 5)
      .map(sp => sp.topic);

    return {
      userId: this.userId,
      interests: typedInterests,
      domains,
      skillProgressions: typedProgressions,
      learningGoals,
      strengths,
      growthAreas,
      lastUpdated: metadata?.last_updated || Date.now(),
      totalActivities: metadata?.total_activities || 0,
    };
  }

  getTopInterests(n: number = 10): Interest[] {
    this.applyInterestDecay();

    const interests = this.db.prepare(`
      SELECT * FROM interests WHERE user_id = ? ORDER BY weight DESC LIMIT ?
    `).all(this.userId, n) as any[];

    return interests.map(i => ({
      topic: i.topic,
      weight: i.weight,
      firstSeen: i.first_seen,
      lastSeen: i.last_seen,
      occurrences: i.occurrences,
      decayFactor: i.decay_factor,
    }));
  }

  getLearningGoals(): string[] {
    const progressions = this.db.prepare(`
      SELECT topic FROM skill_progressions
      WHERE user_id = ? AND level = 'learning' AND trajectory = 'improving'
      ORDER BY complexity DESC
      LIMIT 10
    `).all(this.userId) as any[];

    return progressions.map(p => p.topic);
  }

  getStrengths(): string[] {
    const progressions = this.db.prepare(`
      SELECT topic FROM skill_progressions
      WHERE user_id = ? AND (level = 'mastery' OR (success_rate > 0.7 AND error_rate < 0.2))
      ORDER BY success_rate DESC, complexity DESC
      LIMIT 10
    `).all(this.userId) as any[];

    return progressions.map(p => p.topic);
  }

  getGrowthAreas(): string[] {
    const progressions = this.db.prepare(`
      SELECT topic FROM skill_progressions
      WHERE user_id = ? AND error_rate > 0.4
      ORDER BY error_rate DESC
      LIMIT 10
    `).all(this.userId) as any[];

    return progressions.map(p => p.topic);
  }

  getLearningTrajectory(): SkillProgression[] {
    const progressions = this.db.prepare(`
      SELECT * FROM skill_progressions WHERE user_id = ? ORDER BY last_updated DESC
    `).all(this.userId) as any[];

    return progressions.map(sp => ({
      topic: sp.topic,
      level: sp.level,
      trajectory: sp.trajectory,
      errorRate: sp.error_rate,
      successRate: sp.success_rate,
      avgCompletionTime: sp.avg_completion_time,
      complexity: sp.complexity,
    }));
  }

  getDomains(): Domain[] {
    this.applyInterestDecay();

    const interests = this.db.prepare(`
      SELECT * FROM interests WHERE user_id = ? ORDER BY weight DESC
    `).all(this.userId) as any[];

    const typedInterests: Interest[] = interests.map(i => ({
      topic: i.topic,
      weight: i.weight,
      firstSeen: i.first_seen,
      lastSeen: i.last_seen,
      occurrences: i.occurrences,
      decayFactor: i.decay_factor,
    }));

    const primaryDomains = TopicClassifier.inferDomains(typedInterests);

    return primaryDomains.slice(0, 5).map((domain, idx) => ({
      name: domain,
      type: idx === 0 ? 'primary' as const : (idx === 1 ? 'secondary' as const : 'emerging' as const),
      confidence: Math.max(0.3, 1 - (idx * 0.15)),
      topics: typedInterests
        .filter(i => {
          const topicKey = i.topic as keyof typeof TopicClassifier['TOPIC_PATTERNS'];
          const pattern = TopicClassifier['TOPIC_PATTERNS'][topicKey];
          return pattern && pattern.domain === domain;
        })
        .map(i => i.topic),
      lastActivity: Math.max(...typedInterests.map(i => i.lastSeen)),
    }));
  }

  // ============================================
  // Activity Queries
  // ============================================

  getRecentActivities(limit: number = 100): Activity[] {
    const activities = this.db.prepare(`
      SELECT * FROM activities WHERE user_id = ? ORDER BY timestamp DESC LIMIT ?
    `).all(this.userId, limit) as any[];

    return activities.map(a => ({
      id: a.id,
      sessionId: a.session_id,
      activityType: a.activity_type,
      context: a.context,
      topics: JSON.parse(a.topics || '[]'),
      outcome: a.outcome,
      duration: a.duration,
      complexity: a.complexity,
      timestamp: a.timestamp,
    }));
  }

  getActivitiesBySession(sessionId: string): Activity[] {
    const activities = this.db.prepare(`
      SELECT * FROM activities WHERE user_id = ? AND session_id = ? ORDER BY timestamp ASC
    `).all(this.userId, sessionId) as any[];

    return activities.map(a => ({
      id: a.id,
      sessionId: a.session_id,
      activityType: a.activity_type,
      context: a.context,
      topics: JSON.parse(a.topics || '[]'),
      outcome: a.outcome,
      duration: a.duration,
      complexity: a.complexity,
      timestamp: a.timestamp,
    }));
  }

  // ============================================
  // Cleanup
  // ============================================

  close(): void {
    this.db.close();
  }

  static shutdown(): void {
    if (UserProfiler.instance) {
      UserProfiler.instance.close();
      UserProfiler.instance = null;
    }
  }
}

// Export singleton instance getter
export default UserProfiler.getInstance;
