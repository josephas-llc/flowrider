/**
 * REST API Routes for Projects
 *
 * This module provides Express routes for managing projects in Flowrider.
 * Projects are organizational units that group related sessions together.
 *
 * Routes:
 * - GET    /api/projects           - List all projects
 * - GET    /api/projects/:id       - Get project by ID
 * - POST   /api/projects           - Create new project
 * - PUT    /api/projects/:id       - Update project
 * - DELETE /api/projects/:id       - Delete project
 * - GET    /api/projects/:id/sessions - Get sessions for a project
 * - POST   /api/projects/:id/sessions - Assign session to project
 *
 * Note: This requires Express to be installed:
 *   npm install express @types/express
 */

import { Router, Request, Response } from 'express';
import Database from 'better-sqlite3';
import * as path from 'path';
import { app } from 'electron';

// ============================================
// Types
// ============================================

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sessionIds: string[];
  budget?: number;
  totalCost: number;
  totalTokens: number;
  createdAt: number;
  updatedAt: number;
}

interface CreateProjectRequest {
  name: string;
  description: string;
  color?: string;
  icon?: string;
  budget?: number;
}

interface UpdateProjectRequest {
  name?: string;
  description?: string;
  color?: string;
  icon?: string;
  budget?: number;
}

interface AssignSessionRequest {
  sessionId: string;
}

// ============================================
// Database Schema
// ============================================

class ProjectService {
  private db: Database.Database;
  private dbPath: string;

  constructor() {
    const userDataPath = app.getPath('userData');
    this.dbPath = path.join(userDataPath, 'flowrider-projects.db');
    this.db = new Database(this.dbPath);
    this.initDatabase();
  }

  private initDatabase() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        color TEXT NOT NULL,
        icon TEXT NOT NULL,
        budget REAL,
        total_cost REAL NOT NULL DEFAULT 0,
        total_tokens INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS project_sessions (
        project_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        assigned_at INTEGER NOT NULL,
        PRIMARY KEY (project_id, session_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_project_sessions_project_id
        ON project_sessions(project_id);
      CREATE INDEX IF NOT EXISTS idx_project_sessions_session_id
        ON project_sessions(session_id);
    `);
  }

  // ========== CRUD Operations ==========

  getAllProjects(): Project[] {
    const stmt = this.db.prepare(`
      SELECT
        id, name, description, color, icon, budget,
        total_cost as totalCost, total_tokens as totalTokens,
        created_at as createdAt, updated_at as updatedAt
      FROM projects
      ORDER BY updated_at DESC
    `);

    const projects = stmt.all() as Omit<Project, 'sessionIds'>[];

    // Get session IDs for each project
    const sessionStmt = this.db.prepare(`
      SELECT session_id FROM project_sessions WHERE project_id = ?
    `);

    return projects.map((project) => ({
      ...project,
      sessionIds: sessionStmt.all(project.id).map((row: any) => row.session_id),
    }));
  }

  getProjectById(id: string): Project | null {
    const stmt = this.db.prepare(`
      SELECT
        id, name, description, color, icon, budget,
        total_cost as totalCost, total_tokens as totalTokens,
        created_at as createdAt, updated_at as updatedAt
      FROM projects
      WHERE id = ?
    `);

    const project = stmt.get(id) as Omit<Project, 'sessionIds'> | undefined;
    if (!project) return null;

    // Get session IDs
    const sessionStmt = this.db.prepare(`
      SELECT session_id FROM project_sessions WHERE project_id = ?
    `);
    const sessionIds = sessionStmt.all(id).map((row: any) => row.session_id);

    return { ...project, sessionIds };
  }

  createProject(data: CreateProjectRequest): Project {
    const id = `project-${Date.now()}`;
    const now = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO projects (
        id, name, description, color, icon, budget,
        total_cost, total_tokens, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.description,
      data.color || '#3b82f6',
      data.icon || '📁',
      data.budget ?? null,
      now,
      now
    );

    return {
      id,
      name: data.name,
      description: data.description,
      color: data.color || '#3b82f6',
      icon: data.icon || '📁',
      budget: data.budget,
      sessionIds: [],
      totalCost: 0,
      totalTokens: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  updateProject(id: string, updates: UpdateProjectRequest): Project | null {
    const existing = this.getProjectById(id);
    if (!existing) return null;

    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.description !== undefined) {
      fields.push('description = ?');
      values.push(updates.description);
    }
    if (updates.color !== undefined) {
      fields.push('color = ?');
      values.push(updates.color);
    }
    if (updates.icon !== undefined) {
      fields.push('icon = ?');
      values.push(updates.icon);
    }
    if (updates.budget !== undefined) {
      fields.push('budget = ?');
      values.push(updates.budget);
    }

    if (fields.length === 0) return existing;

    fields.push('updated_at = ?');
    values.push(Date.now());
    values.push(id);

    const stmt = this.db.prepare(`
      UPDATE projects SET ${fields.join(', ')} WHERE id = ?
    `);

    stmt.run(...values);
    return this.getProjectById(id);
  }

  deleteProject(id: string): boolean {
    const stmt = this.db.prepare('DELETE FROM projects WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  getProjectSessions(projectId: string): string[] {
    const stmt = this.db.prepare(`
      SELECT session_id FROM project_sessions WHERE project_id = ?
      ORDER BY assigned_at DESC
    `);
    return stmt.all(projectId).map((row: any) => row.session_id);
  }

  assignSessionToProject(projectId: string, sessionId: string): boolean {
    // Verify project exists
    const project = this.getProjectById(projectId);
    if (!project) return false;

    // Remove from any existing project first
    this.db.prepare('DELETE FROM project_sessions WHERE session_id = ?').run(sessionId);

    // Assign to new project
    const stmt = this.db.prepare(`
      INSERT INTO project_sessions (project_id, session_id, assigned_at)
      VALUES (?, ?, ?)
    `);

    stmt.run(projectId, sessionId, Date.now());

    // Update project's updated_at timestamp
    this.db.prepare('UPDATE projects SET updated_at = ? WHERE id = ?').run(Date.now(), projectId);

    return true;
  }

  unassignSessionFromProject(sessionId: string): boolean {
    const stmt = this.db.prepare('DELETE FROM project_sessions WHERE session_id = ?');
    const result = stmt.run(sessionId);
    return result.changes > 0;
  }

  updateProjectMetrics(projectId: string, costDelta: number, tokensDelta: number): void {
    const stmt = this.db.prepare(`
      UPDATE projects
      SET total_cost = total_cost + ?,
          total_tokens = total_tokens + ?,
          updated_at = ?
      WHERE id = ?
    `);
    stmt.run(costDelta, tokensDelta, Date.now(), projectId);
  }

  close(): void {
    this.db.close();
  }
}

// ============================================
// Singleton Instance
// ============================================

let projectServiceInstance: ProjectService | null = null;

export function getProjectService(): ProjectService {
  if (!projectServiceInstance) {
    projectServiceInstance = new ProjectService();
  }
  return projectServiceInstance;
}

export function shutdownProjectService(): void {
  if (projectServiceInstance) {
    projectServiceInstance.close();
    projectServiceInstance = null;
  }
}

// ============================================
// Express Router
// ============================================

const router = Router();
const projectService = getProjectService();

// ========== Validation Middleware ==========

function validateCreateProject(req: Request, res: Response, next: Function) {
  const { name, description } = req.body;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Project name is required and must be a non-empty string'
    });
  }

  if (name.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Project name must be 100 characters or less'
    });
  }

  if (!description || typeof description !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Project description is required and must be a string'
    });
  }

  if (description.length > 500) {
    return res.status(400).json({
      success: false,
      error: 'Project description must be 500 characters or less'
    });
  }

  const { color, icon, budget } = req.body;

  if (color !== undefined && (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color))) {
    return res.status(400).json({
      success: false,
      error: 'Color must be a valid hex color code (e.g., #3b82f6)'
    });
  }

  if (icon !== undefined && (typeof icon !== 'string' || icon.length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'Icon must be a non-empty string'
    });
  }

  if (budget !== undefined && (typeof budget !== 'number' || budget < 0)) {
    return res.status(400).json({
      success: false,
      error: 'Budget must be a non-negative number'
    });
  }

  next();
}

function validateUpdateProject(req: Request, res: Response, next: Function) {
  const { name, description, color, icon, budget } = req.body;

  if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'Project name must be a non-empty string'
    });
  }

  if (name !== undefined && name.length > 100) {
    return res.status(400).json({
      success: false,
      error: 'Project name must be 100 characters or less'
    });
  }

  if (description !== undefined && (typeof description !== 'string' || description.length > 500)) {
    return res.status(400).json({
      success: false,
      error: 'Project description must be a string with 500 characters or less'
    });
  }

  if (color !== undefined && (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color))) {
    return res.status(400).json({
      success: false,
      error: 'Color must be a valid hex color code (e.g., #3b82f6)'
    });
  }

  if (icon !== undefined && (typeof icon !== 'string' || icon.length === 0)) {
    return res.status(400).json({
      success: false,
      error: 'Icon must be a non-empty string'
    });
  }

  if (budget !== undefined && (typeof budget !== 'number' || budget < 0)) {
    return res.status(400).json({
      success: false,
      error: 'Budget must be a non-negative number'
    });
  }

  next();
}

function validateAssignSession(req: Request, res: Response, next: Function) {
  const { sessionId } = req.body;

  if (!sessionId || typeof sessionId !== 'string' || sessionId.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Session ID is required and must be a non-empty string'
    });
  }

  next();
}

// ========== Routes ==========

/**
 * GET /api/projects
 * List all projects
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const projects = projectService.getAllProjects();
    res.json({
      success: true,
      data: projects,
      count: projects.length
    });
  } catch (error) {
    console.error('[Projects API] Error listing projects:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve projects'
    });
  }
});

/**
 * GET /api/projects/:id
 * Get project by ID
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const project = projectService.getProjectById(id);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: project
    });
  } catch (error) {
    console.error('[Projects API] Error getting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve project'
    });
  }
});

/**
 * POST /api/projects
 * Create new project
 */
router.post('/', validateCreateProject, (req: Request, res: Response) => {
  try {
    const projectData: CreateProjectRequest = {
      name: req.body.name.trim(),
      description: req.body.description.trim(),
      color: req.body.color,
      icon: req.body.icon,
      budget: req.body.budget,
    };

    const project = projectService.createProject(projectData);

    res.status(201).json({
      success: true,
      data: project,
      message: 'Project created successfully'
    });
  } catch (error) {
    console.error('[Projects API] Error creating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create project'
    });
  }
});

/**
 * PUT /api/projects/:id
 * Update project
 */
router.put('/:id', validateUpdateProject, (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const updates: UpdateProjectRequest = {};

    if (req.body.name !== undefined) updates.name = req.body.name.trim();
    if (req.body.description !== undefined) updates.description = req.body.description.trim();
    if (req.body.color !== undefined) updates.color = req.body.color;
    if (req.body.icon !== undefined) updates.icon = req.body.icon;
    if (req.body.budget !== undefined) updates.budget = req.body.budget;

    const project = projectService.updateProject(id, updates);

    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      data: project,
      message: 'Project updated successfully'
    });
  } catch (error) {
    console.error('[Projects API] Error updating project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update project'
    });
  }
});

/**
 * DELETE /api/projects/:id
 * Delete project
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const deleted = projectService.deleteProject(id);

    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Project deleted successfully'
    });
  } catch (error) {
    console.error('[Projects API] Error deleting project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete project'
    });
  }
});

/**
 * GET /api/projects/:id/sessions
 * Get sessions for a project
 */
router.get('/:id/sessions', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    // Verify project exists
    const project = projectService.getProjectById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    const sessionIds = projectService.getProjectSessions(id);

    res.json({
      success: true,
      data: sessionIds,
      count: sessionIds.length
    });
  } catch (error) {
    console.error('[Projects API] Error getting project sessions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve project sessions'
    });
  }
});

/**
 * POST /api/projects/:id/sessions
 * Assign session to project
 */
router.post('/:id/sessions', validateAssignSession, (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { sessionId } = req.body;

    const success = projectService.assignSessionToProject(id, sessionId);

    if (!success) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    res.json({
      success: true,
      message: 'Session assigned to project successfully'
    });
  } catch (error) {
    console.error('[Projects API] Error assigning session to project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to assign session to project'
    });
  }
});

/**
 * DELETE /api/projects/:id/sessions/:sessionId
 * Unassign session from project
 */
router.delete('/:id/sessions/:sessionId', (req: Request, res: Response) => {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const sessionId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;

    // Verify project exists
    const project = projectService.getProjectById(id);
    if (!project) {
      return res.status(404).json({
        success: false,
        error: 'Project not found'
      });
    }

    // Verify session is assigned to this project
    if (!project.sessionIds.includes(sessionId)) {
      return res.status(404).json({
        success: false,
        error: 'Session not assigned to this project'
      });
    }

    const success = projectService.unassignSessionFromProject(sessionId);

    if (!success) {
      return res.status(500).json({
        success: false,
        error: 'Failed to unassign session from project'
      });
    }

    res.json({
      success: true,
      message: 'Session unassigned from project successfully'
    });
  } catch (error) {
    console.error('[Projects API] Error unassigning session from project:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to unassign session from project'
    });
  }
});

// ============================================
// Export
// ============================================

export default router;
export { ProjectService };
