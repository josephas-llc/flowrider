/**
 * TemplateService - Manages session templates (built-in and user-created)
 *
 * Stores user-created templates in SQLite and provides them alongside
 * 10 built-in templates that cannot be deleted/edited.
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';
import * as crypto from 'crypto';

// ============================================
// Data Types
// ============================================

export type AIProvider = 'claude-code' | 'ollama' | 'custom';
export type TemplateCategory = 'development' | 'research' | 'writing' | 'custom';

export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: TemplateCategory;
  config: {
    aiProvider: AIProvider;
    aiModel?: string;
    workingDir?: string;
    notes?: string;
  };
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

// ============================================
// Built-in Templates (non-deletable)
// ============================================

const BUILTIN_TEMPLATES: Omit<SessionTemplate, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'fullstack',
    name: 'Full-Stack Dev',
    description: 'Claude Code session for full-stack development',
    icon: '🏗️',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'Full-stack development session',
    },
    isBuiltIn: true,
  },
  {
    id: 'api-backend',
    name: 'API Backend',
    description: 'Backend API development with Claude',
    icon: '🔌',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'Backend API development',
    },
    isBuiltIn: true,
  },
  {
    id: 'react-frontend',
    name: 'React Frontend',
    description: 'React/TypeScript frontend development',
    icon: '⚛️',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'React frontend development',
    },
    isBuiltIn: true,
  },
  {
    id: 'testing',
    name: 'Test Suite',
    description: 'Writing and running tests',
    icon: '🧪',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'Testing and QA',
    },
    isBuiltIn: true,
  },
  {
    id: 'devops',
    name: 'DevOps/CI',
    description: 'CI/CD and infrastructure tasks',
    icon: '🚀',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'DevOps and CI/CD',
    },
    isBuiltIn: true,
  },
  {
    id: 'research-ollama',
    name: 'Local Research',
    description: 'Research using local Ollama models',
    icon: '🔬',
    category: 'research',
    config: {
      aiProvider: 'ollama',
      aiModel: 'llama3:latest',
      notes: 'Local AI research session',
    },
    isBuiltIn: true,
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review and refactor existing code',
    icon: '👀',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'Code review and refactoring',
    },
    isBuiltIn: true,
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Write and update documentation',
    icon: '📚',
    category: 'writing',
    config: {
      aiProvider: 'claude-code',
      notes: 'Documentation session',
    },
    isBuiltIn: true,
  },
  {
    id: 'bugfix',
    name: 'Bug Hunting',
    description: 'Debug and fix issues',
    icon: '🐛',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'Bug fixing session',
    },
    isBuiltIn: true,
  },
  {
    id: 'exploration',
    name: 'Codebase Explore',
    description: 'Explore and understand a codebase',
    icon: '🗺️',
    category: 'research',
    config: {
      aiProvider: 'claude-code',
      notes: 'Codebase exploration',
    },
    isBuiltIn: true,
  },
];

// ============================================
// TemplateService Class
// ============================================

export class TemplateService {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    // Store in user data directory
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'flowrider-templates.db');
    this.db = new Database(this.dbPath);
    this.initialize();
  }

  private initialize(): void {
    // Enable WAL mode for better concurrent performance
    this.db.pragma('journal_mode = WAL');

    // Create templates table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        icon TEXT NOT NULL,
        category TEXT NOT NULL,
        ai_provider TEXT NOT NULL,
        ai_model TEXT,
        working_dir TEXT,
        notes TEXT,
        is_built_in INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_templates_category ON templates(category);
      CREATE INDEX IF NOT EXISTS idx_templates_builtin ON templates(is_built_in);
    `);

    console.log('[TemplateService] Database initialized at:', this.dbPath);
  }

  // ============================================
  // Template CRUD Methods
  // ============================================

  /**
   * Get all templates (built-in + user-created)
   */
  listTemplates(): SessionTemplate[] {
    const now = Date.now();

    // Get user-created templates from DB
    const rows = this.db.prepare(`
      SELECT * FROM templates WHERE is_built_in = 0 ORDER BY updated_at DESC
    `).all() as any[];

    const userTemplates = rows.map(this.rowToTemplate);

    // Combine with built-in templates
    const builtInWithTimestamps: SessionTemplate[] = BUILTIN_TEMPLATES.map(t => ({
      ...t,
      createdAt: now,
      updatedAt: now,
    }));

    return [...builtInWithTimestamps, ...userTemplates];
  }

  /**
   * Get a specific template by ID
   */
  getTemplate(id: string): SessionTemplate | null {
    // Check if it's a built-in template
    const builtIn = BUILTIN_TEMPLATES.find(t => t.id === id);
    if (builtIn) {
      const now = Date.now();
      return { ...builtIn, createdAt: now, updatedAt: now };
    }

    // Check user-created templates
    const row = this.db.prepare('SELECT * FROM templates WHERE id = ?').get(id) as any;
    return row ? this.rowToTemplate(row) : null;
  }

  /**
   * Save a new template or update existing user template
   */
  saveTemplate(template: Omit<SessionTemplate, 'id' | 'isBuiltIn' | 'createdAt' | 'updatedAt'> & { id?: string }): { success: boolean; id?: string; error?: string } {
    try {
      const now = Date.now();
      const id = template.id || crypto.randomUUID();

      // Check if trying to overwrite a built-in template
      if (template.id && BUILTIN_TEMPLATES.some(t => t.id === template.id)) {
        return { success: false, error: 'Cannot modify built-in templates' };
      }

      // Check if updating existing template
      const existing = template.id ? this.db.prepare('SELECT id FROM templates WHERE id = ?').get(template.id) as any : null;

      if (existing) {
        // Update existing template
        const stmt = this.db.prepare(`
          UPDATE templates SET
            name = ?,
            description = ?,
            icon = ?,
            category = ?,
            ai_provider = ?,
            ai_model = ?,
            working_dir = ?,
            notes = ?,
            updated_at = ?
          WHERE id = ?
        `);

        stmt.run(
          template.name,
          template.description,
          template.icon,
          template.category,
          template.config.aiProvider,
          template.config.aiModel || null,
          template.config.workingDir || null,
          template.config.notes || null,
          now,
          id
        );
      } else {
        // Insert new template
        const stmt = this.db.prepare(`
          INSERT INTO templates (
            id, name, description, icon, category, ai_provider,
            ai_model, working_dir, notes, is_built_in, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
        `);

        stmt.run(
          id,
          template.name,
          template.description,
          template.icon,
          template.category,
          template.config.aiProvider,
          template.config.aiModel || null,
          template.config.workingDir || null,
          template.config.notes || null,
          now,
          now
        );
      }

      return { success: true, id };
    } catch (error) {
      console.error('[TemplateService] Error saving template:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Delete a user-created template (cannot delete built-in)
   */
  deleteTemplate(id: string): { success: boolean; error?: string } {
    try {
      // Check if it's a built-in template
      if (BUILTIN_TEMPLATES.some(t => t.id === id)) {
        return { success: false, error: 'Cannot delete built-in templates' };
      }

      const result = this.db.prepare('DELETE FROM templates WHERE id = ? AND is_built_in = 0').run(id);

      if (result.changes === 0) {
        return { success: false, error: 'Template not found' };
      }

      return { success: true };
    } catch (error) {
      console.error('[TemplateService] Error deleting template:', error);
      return { success: false, error: String(error) };
    }
  }

  /**
   * Get templates by category
   */
  getTemplatesByCategory(category: TemplateCategory | 'all'): SessionTemplate[] {
    const allTemplates = this.listTemplates();

    if (category === 'all') {
      return allTemplates;
    }

    return allTemplates.filter(t => t.category === category);
  }

  // ============================================
  // Helper Methods
  // ============================================

  private rowToTemplate(row: any): SessionTemplate {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      icon: row.icon,
      category: row.category as TemplateCategory,
      config: {
        aiProvider: row.ai_provider as AIProvider,
        aiModel: row.ai_model || undefined,
        workingDir: row.working_dir || undefined,
        notes: row.notes || undefined,
      },
      isBuiltIn: row.is_built_in === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ============================================
  // Cleanup
  // ============================================

  close(): void {
    this.db.close();
  }
}

// Singleton instance
let templateServiceInstance: TemplateService | null = null;

export function getTemplateService(): TemplateService {
  if (!templateServiceInstance) {
    templateServiceInstance = new TemplateService();
  }
  return templateServiceInstance;
}

export function shutdownTemplateService(): void {
  if (templateServiceInstance) {
    templateServiceInstance.close();
    templateServiceInstance = null;
  }
}

export default TemplateService;
