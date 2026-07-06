/**
 * Session REST API Routes (Express Router)
 *
 * Provides REST endpoints for managing tmux-based AI sessions.
 * Integrates with the existing Express-based ApiServer.
 */

import { Router, Request, Response } from 'express';
import { TmuxManager } from '../../TmuxManager';
import { SessionMonitor } from '../../SessionMonitor';
import { getAICore } from '../../ai-core';
import { getCrossSessionAwareness } from '../../CrossSessionAwareness';

// Types
interface SessionCreateRequest {
  name: string;
  faceIndex: number;
  workingDir: string;
  projectId?: string;
  language?: string;
  provider?: string;
}

interface SessionUpdateRequest {
  name?: string;
  workingDir?: string;
  notes?: string;
}

interface SendMessageRequest {
  message: string;
}

interface RestartSessionRequest {
  workingDir?: string;
}

// Helper to extract string param from Express request
const getStringParam = (param: string | string[] | undefined): string => {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
};

// Session store to track additional metadata
const sessionMetadata = new Map<string, {
  projectId?: string;
  language?: string;
  workingDir?: string;
  notes?: string;
}>();

// Create router
const router = Router();

// Dependencies (will be injected)
let tmuxManager: TmuxManager;
let sessionMonitor: SessionMonitor;

/**
 * Initialize the router with dependencies
 */
export function initSessionRouter(tm: TmuxManager, sm: SessionMonitor) {
  tmuxManager = tm;
  sessionMonitor = sm;
  console.log('[SessionRouter] Initialized with dependencies');
}

/**
 * Validation helpers
 */
function isValidFaceIndex(index: number): boolean {
  return Number.isInteger(index) && index >= 0 && index <= 19;
}

function isValidSessionName(name: string): boolean {
  return typeof name === 'string' && name.length > 0 && name.length <= 100;
}

function isValidWorkingDir(dir: string): boolean {
  return typeof dir === 'string' && dir.length > 0;
}

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/sessions - List all sessions
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const result = await tmuxManager.listSessions();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to list sessions',
      });
    }

    // Enrich with metadata
    const sessions = (result.data || []).map((tmuxSession) => {
      const sessionId = tmuxSession.name;
      const metadata = sessionMetadata.get(sessionId);
      const isMonitored = sessionMonitor.isMonitoring(sessionId);

      return {
        ...tmuxSession,
        id: sessionId,
        projectId: metadata?.projectId,
        language: metadata?.language,
        workingDir: metadata?.workingDir,
        notes: metadata?.notes,
        isMonitored,
      };
    });

    res.json({
      success: true,
      data: sessions,
    });
  } catch (err) {
    console.error('[SessionRouter] List error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/sessions/:id - Get session by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = getStringParam(req.params.id);
    const result = await tmuxManager.listSessions();

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to get session',
      });
    }

    const tmuxSession = (result.data || []).find((s) => s.name === sessionId);
    if (!tmuxSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    const metadata = sessionMetadata.get(sessionId);
    const isMonitored = sessionMonitor.isMonitoring(sessionId);

    const sessionInfo = {
      ...tmuxSession,
      id: sessionId,
      projectId: metadata?.projectId,
      language: metadata?.language,
      workingDir: metadata?.workingDir,
      notes: metadata?.notes,
      isMonitored,
    };

    res.json({
      success: true,
      data: sessionInfo,
    });
  } catch (err) {
    console.error('[SessionRouter] Get error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/sessions - Create new session
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as SessionCreateRequest;

    // Validate required fields
    if (!isValidSessionName(body.name)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid session name (required, max 100 chars)',
      });
    }

    if (body.faceIndex === undefined || !isValidFaceIndex(body.faceIndex)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid faceIndex (must be between 0 and 19)',
      });
    }

    if (!isValidWorkingDir(body.workingDir)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid workingDir (required)',
      });
    }

    // Create the tmux session
    const result = await tmuxManager.createSession(
      body.name,
      body.faceIndex,
      body.workingDir
    );

    if (!result.success || !result.data) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to create session',
      });
    }

    const tmuxSession = result.data;
    const sessionId = tmuxSession.name;

    // Store metadata
    sessionMetadata.set(sessionId, {
      projectId: body.projectId,
      language: body.language,
      workingDir: body.workingDir,
    });

    // Auto-start monitoring
    sessionMonitor.startMonitoring(
      sessionId,
      `face-${body.faceIndex}`,
      body.workingDir,
      body.projectId,
      body.language
    );

    // Register with cross-session awareness
    if (body.projectId) {
      const crossSession = getCrossSessionAwareness();
      crossSession.registerSession(
        sessionId,
        body.name,
        body.workingDir,
        body.projectId
      );
    }

    // Register with AI System
    const aiCore = getAICore();
    aiCore.registerSession({
      sessionId,
      sessionName: body.name,
      projectId: body.projectId ?? null,
      workingDir: body.workingDir,
      repoUrl: null,
      language: body.language ?? null,
      framework: null,
    });

    const sessionInfo = {
      ...tmuxSession,
      id: sessionId,
      projectId: body.projectId,
      language: body.language,
      workingDir: body.workingDir,
      isMonitored: true,
    };

    res.status(201).json({
      success: true,
      data: sessionInfo,
    });
  } catch (err) {
    console.error('[SessionRouter] Create error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

/**
 * PUT /api/sessions/:id - Update session
 */
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = getStringParam(req.params.id);
    const body = req.body as SessionUpdateRequest;

    // Check if session exists
    const metadata = sessionMetadata.get(sessionId);
    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Handle rename if requested
    if (body.name) {
      const renameResult = await tmuxManager.renameSession(sessionId, body.name);
      if (!renameResult.success) {
        return res.status(500).json({
          success: false,
          error: renameResult.error || 'Failed to rename session',
        });
      }
    }

    // Update metadata
    sessionMetadata.set(sessionId, {
      ...metadata,
      workingDir: body.workingDir || metadata.workingDir,
      notes: body.notes !== undefined ? body.notes : metadata.notes,
    });

    // Get updated session info
    const result = await tmuxManager.listSessions();
    const tmuxSession = (result.data || []).find((s) => s.name === sessionId);

    if (!tmuxSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found after update',
      });
    }

    const updatedMetadata = sessionMetadata.get(sessionId);
    const sessionInfo = {
      ...tmuxSession,
      id: sessionId,
      ...updatedMetadata,
      isMonitored: sessionMonitor.isMonitoring(sessionId),
    };

    res.json({
      success: true,
      data: sessionInfo,
    });
  } catch (err) {
    console.error('[SessionRouter] Update error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

/**
 * DELETE /api/sessions/:id - Delete/kill session
 */
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = getStringParam(req.params.id);

    // Stop monitoring
    sessionMonitor.stopMonitoring(sessionId);

    // Unregister from cross-session awareness
    const crossSession = getCrossSessionAwareness();
    crossSession.unregisterSession(sessionId);

    // Kill the tmux session
    const result = await tmuxManager.killSession(sessionId);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to delete session',
      });
    }

    // Remove metadata
    sessionMetadata.delete(sessionId);

    res.json({
      success: true,
      data: { message: 'Session deleted successfully' },
    });
  } catch (err) {
    console.error('[SessionRouter] Delete error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/sessions/:id/send - Send message to session
 */
router.post('/:id/send', async (req: Request, res: Response) => {
  try {
    const sessionId = getStringParam(req.params.id);
    const body = req.body as SendMessageRequest;

    if (!body.message || typeof body.message !== 'string' || body.message.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be non-empty',
      });
    }

    // Send input to tmux session
    const result = await tmuxManager.sendInput(sessionId, body.message);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to send message',
      });
    }

    // Also send Enter key to submit the message
    await tmuxManager.sendInput(sessionId, '\n');

    res.json({
      success: true,
      data: { message: 'Message sent successfully' },
    });
  } catch (err) {
    console.error('[SessionRouter] Send error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

/**
 * GET /api/sessions/:id/output - Get session output/history
 */
router.get('/:id/output', async (req: Request, res: Response) => {
  try {
    const sessionId = getStringParam(req.params.id);
    const lines = parseInt(req.query.lines as string || '500', 10);

    const result = await tmuxManager.getOutput(sessionId, lines);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        error: result.error || 'Failed to get output',
      });
    }

    res.json({
      success: true,
      data: {
        output: result.data,
        lines,
        timestamp: Date.now(),
      },
    });
  } catch (err) {
    console.error('[SessionRouter] Output error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

/**
 * POST /api/sessions/:id/restart - Restart a session
 */
router.post('/:id/restart', async (req: Request, res: Response) => {
  try {
    const sessionId = getStringParam(req.params.id);
    const body = req.body as RestartSessionRequest;

    // Get current session metadata
    const metadata = sessionMetadata.get(sessionId);
    if (!metadata) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Get current tmux session info
    const listResult = await tmuxManager.listSessions();
    const currentSession = (listResult.data || []).find((s) => s.name === sessionId);

    if (!currentSession) {
      return res.status(404).json({
        success: false,
        error: 'Session not found',
      });
    }

    // Stop monitoring
    sessionMonitor.stopMonitoring(sessionId);

    // Kill the old session
    await tmuxManager.killSession(sessionId);

    // Create new session with same settings
    const workingDir = body.workingDir || metadata.workingDir || process.env.HOME || '~';
    const createResult = await tmuxManager.createSession(
      currentSession.name,
      currentSession.faceIndex,
      workingDir
    );

    if (!createResult.success || !createResult.data) {
      return res.status(500).json({
        success: false,
        error: createResult.error || 'Failed to restart session',
      });
    }

    const tmuxSession = createResult.data;
    const newSessionId = tmuxSession.name;

    // Update metadata
    sessionMetadata.set(newSessionId, {
      ...metadata,
      workingDir,
    });

    // Restart monitoring
    sessionMonitor.startMonitoring(
      newSessionId,
      `face-${currentSession.faceIndex}`,
      workingDir,
      metadata.projectId,
      metadata.language
    );

    const sessionInfo = {
      ...tmuxSession,
      id: newSessionId,
      ...metadata,
      workingDir,
      isMonitored: true,
    };

    res.json({
      success: true,
      data: sessionInfo,
    });
  } catch (err) {
    console.error('[SessionRouter] Restart error:', err);
    res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : 'Internal server error',
    });
  }
});

export default router;
