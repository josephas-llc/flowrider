import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { TmuxManager } from './TmuxManager';
import { LeoManager } from './LeoManager';
import { SessionMonitor } from './SessionMonitor';
import { getLeoAI, shutdownLeoAI } from './leo-ai';
import { getContextInjector } from './ContextInjector';
import { getAIService, AIProviderType, AIMessage } from './AIService';
import { getCrossSessionAwareness, shutdownCrossSessionAwareness } from './CrossSessionAwareness';
import { deploymentService } from './DeploymentService';

let mainWindow: BrowserWindow | null = null;
let tmuxManager: TmuxManager;
let leoManager: LeoManager;
let sessionMonitor: SessionMonitor;

// Check if we should run in dev mode:
// 1. If NODE_ENV=production, always use production mode
// 2. Otherwise, check if app is packaged
const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 15, y: 15 },
  });

  const rendererPath = path.join(__dirname, '../renderer/index.html');
  console.log('[Main] isDev:', isDev);
  console.log('[Main] NODE_ENV:', process.env.NODE_ENV);
  console.log('[Main] app.isPackaged:', app.isPackaged);
  console.log('[Main] Renderer path:', rendererPath);

  if (isDev) {
    console.log('[Main] Loading from dev server: http://localhost:5174');
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    console.log('[Main] Loading from file:', rendererPath);
    mainWindow.loadFile(rendererPath);
    // Open DevTools in production to see errors
    mainWindow.webContents.openDevTools();
  }

  // Log any errors during page load
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Main] Page failed to load:', errorCode, errorDescription);
  });

  mainWindow.webContents.on('did-finish-load', () => {
    console.log('[Main] Page finished loading');
  });

  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log('[Renderer Console]', message);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Handle external links - open them in the system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // Only open http/https URLs externally
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // Also handle navigation attempts to external URLs
  mainWindow.webContents.on('will-navigate', (event, url) => {
    // Allow navigation to localhost (dev server) or file:// URLs
    if (url.startsWith('http://localhost') || url.startsWith('file://')) {
      return;
    }
    // Prevent navigation and open externally instead
    if (url.startsWith('http://') || url.startsWith('https://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  console.log('[Main] Window created');
}

function setupIPC() {
  tmuxManager = new TmuxManager();
  leoManager = new LeoManager();

  // Create SessionMonitor with access to tmuxManager.getOutput
  sessionMonitor = new SessionMonitor(
    (sessionName: string, lines: number) => tmuxManager.getOutput(sessionName, lines)
  );

  // Create a new tmux session
  ipcMain.handle('tmux:create', async (_event, name: string, faceIndex: number, workingDir: string) => {
    console.log(`[IPC] Creating session: ${name} for face ${faceIndex}`);
    const result = await tmuxManager.createSession(name, faceIndex, workingDir);

    // Auto-start monitoring the session for LEO AI
    if ((result as any).success) {
      const sessionId = `face-${faceIndex}`;
      const tmuxSessionName = (result as any).data?.name || name;
      sessionMonitor.startMonitoring(tmuxSessionName, sessionId, workingDir);
    }

    return result;
  });

  // List all flowrider tmux sessions
  ipcMain.handle('tmux:list', async () => {
    return tmuxManager.listSessions();
  });

  // Kill a tmux session
  ipcMain.handle('tmux:kill', async (_event, sessionName: string) => {
    console.log(`[IPC] Killing session: ${sessionName}`);
    // Stop monitoring before killing
    sessionMonitor.stopMonitoring(sessionName);
    return tmuxManager.killSession(sessionName);
  });

  // Send input to a tmux session
  ipcMain.handle('tmux:input', async (_event, sessionName: string, data: string) => {
    return tmuxManager.sendInput(sessionName, data);
  });

  // Get output from a tmux session
  ipcMain.handle('tmux:output', async (_event, sessionName: string, lines: number) => {
    return tmuxManager.getOutput(sessionName, lines);
  });

  // Rename a tmux session
  ipcMain.handle('tmux:rename', async (_event, oldName: string, newName: string) => {
    console.log(`[IPC] Renaming session: ${oldName} -> ${newName}`);
    return tmuxManager.renameSession(oldName, newName);
  });

  // Detect GitHub repo from working directory
  ipcMain.handle('git:detect', async (_event, workingDir: string) => {
    console.log(`[IPC] Detecting git repo in: ${workingDir}`);
    return tmuxManager.detectGitRepo(workingDir);
  });

  // Open directory picker dialog
  ipcMain.handle('dialog:openDirectory', async () => {
    if (!mainWindow) return { success: false, error: 'No window available' };

    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
      title: 'Select Working Directory',
      buttonLabel: 'Select',
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, canceled: true };
    }

    return { success: true, path: result.filePaths[0] };
  });

  // Find local path for a repo
  ipcMain.handle('fs:findLocalRepo', async (_event, repoName: string) => {
    const os = require('os');
    const fs = require('fs');
    const path = require('path');

    const homeDir = os.homedir();
    const searchPaths = [
      homeDir,
      path.join(homeDir, 'Developer'),
      path.join(homeDir, 'Projects'),
      path.join(homeDir, 'Code'),
    ];

    for (const basePath of searchPaths) {
      const fullPath = path.join(basePath, repoName);
      try {
        const stats = fs.statSync(fullPath);
        if (stats.isDirectory()) {
          // Check if it's a git repo
          const gitPath = path.join(fullPath, '.git');
          if (fs.existsSync(gitPath)) {
            return { found: true, path: fullPath };
          }
        }
      } catch {
        // Directory doesn't exist, continue
      }
    }
    return { found: false };
  });

  // ========================================
  // LEO (Local Execution Orchestrator) IPC
  // ========================================

  // Enable LEO mode
  ipcMain.handle('leo:enable', async () => {
    console.log('[IPC] Enabling LEO mode');
    return leoManager.enable();
  });

  // Disable LEO mode
  ipcMain.handle('leo:disable', async () => {
    console.log('[IPC] Disabling LEO mode');
    return leoManager.disable();
  });

  // Get LEO status
  ipcMain.handle('leo:status', async () => {
    return leoManager.getStatus();
  });

  // Get connected flowriders
  ipcMain.handle('leo:flowriders', async () => {
    return { success: true, data: leoManager.getFlowriders() };
  });

  // Discover flowriders on network
  ipcMain.handle('leo:discover', async () => {
    console.log('[IPC] Discovering flowriders');
    return leoManager.discoverFlowriders();
  });

  // Ping a specific flowrider
  ipcMain.handle('leo:ping', async (_event, flowriderId: string) => {
    return leoManager.pingFlowrider(flowriderId);
  });

  // Get sessions from a remote flowrider
  ipcMain.handle('leo:remoteSessions', async (_event, flowriderId: string) => {
    return leoManager.getRemoteSessions(flowriderId);
  });

  // Get this instance's info
  ipcMain.handle('leo:selfInfo', async () => {
    return { success: true, data: leoManager.getSelfInfo() };
  });

  // ========================================
  // LEO AI (Self-Improving Learning) IPC
  // ========================================

  const leoAI = getLeoAI();

  // Auto-enable LEO AI learning on startup
  leoAI.enable();
  console.log('[IPC] LEO AI auto-enabled on startup');

  // Enable LEO AI learning
  ipcMain.handle('leoai:enable', async () => {
    console.log('[IPC] Enabling LEO AI');
    leoAI.enable();
    return { success: true };
  });

  // Disable LEO AI learning
  ipcMain.handle('leoai:disable', async () => {
    console.log('[IPC] Disabling LEO AI');
    leoAI.disable();
    return { success: true };
  });

  // Get LEO AI status
  ipcMain.handle('leoai:status', async () => {
    return { success: true, data: leoAI.getStatus() };
  });

  // Record an interaction for learning
  ipcMain.handle('leoai:recordInteraction', async (
    _event,
    sessionId: string,
    prompt: string,
    response: string,
    metadata?: { filesModified?: string[]; outcome?: string; feedback?: number }
  ) => {
    const id = leoAI.recordInteraction(sessionId, prompt, response, metadata as any);
    return { success: true, id };
  });

  // Record user feedback
  ipcMain.handle('leoai:recordFeedback', async (
    _event,
    sessionId: string,
    signal: { type: string; value: number; context?: string }
  ) => {
    leoAI.recordFeedback(sessionId, signal as any);
    return { success: true };
  });

  // Get distilled context for a session
  ipcMain.handle('leoai:getContext', async (
    _event,
    request?: { prompt?: string; projectId?: string; language?: string; tags?: string[]; errors?: string[] }
  ) => {
    const context = leoAI.getContext(request);
    return { success: true, data: context };
  });

  // Get quick context
  ipcMain.handle('leoai:getQuickContext', async (_event, projectId?: string, language?: string) => {
    const context = leoAI.getQuickContext(projectId, language);
    return { success: true, data: context };
  });

  // Get error-specific context
  ipcMain.handle('leoai:getErrorContext', async (_event, errors: string[], language?: string) => {
    const context = leoAI.getErrorContext(errors, language);
    return { success: true, data: context };
  });

  // Trigger manual analysis
  ipcMain.handle('leoai:analyze', async () => {
    console.log('[IPC] Triggering LEO AI analysis');
    const result = await leoAI.analyze();
    return { success: true, data: result };
  });

  // Get knowledge stats
  ipcMain.handle('leoai:stats', async () => {
    return { success: true, data: leoAI.getKnowledgeStats() };
  });

  // Get recent interactions
  ipcMain.handle('leoai:getInteractions', async (_event, limit: number = 50) => {
    return { success: true, data: leoAI.getRecentInteractions(limit) };
  });

  // Get patterns
  ipcMain.handle('leoai:getPatterns', async (_event, minConfidence: number = 0.5) => {
    return { success: true, data: leoAI.getPatterns(minConfidence) };
  });

  // Get insights
  ipcMain.handle('leoai:getInsights', async (_event, limit: number = 20) => {
    return { success: true, data: leoAI.getInsights(limit) };
  });

  // Search snippets
  ipcMain.handle('leoai:searchSnippets', async (_event, query: string) => {
    return { success: true, data: leoAI.searchSnippets(query) };
  });

  // Get learning events
  ipcMain.handle('leoai:getLearningEvents', async (_event, since: number) => {
    return { success: true, data: leoAI.getLearningEvents(since) };
  });

  // Register a session for learning
  ipcMain.handle('leoai:registerSession', async (
    _event,
    context: { sessionId: string; sessionName: string; projectId?: string; workingDir: string; repoUrl?: string; language?: string }
  ) => {
    leoAI.registerSession(context as any);
    return { success: true };
  });

  // ========================================
  // Session Monitor IPC
  // ========================================

  // Start monitoring a session
  ipcMain.handle('monitor:start', async (
    _event,
    sessionName: string,
    sessionId: string,
    workingDir: string,
    projectId?: string,
    language?: string
  ) => {
    sessionMonitor.startMonitoring(sessionName, sessionId, workingDir, projectId, language);
    return { success: true };
  });

  // Stop monitoring a session
  ipcMain.handle('monitor:stop', async (_event, sessionName: string) => {
    sessionMonitor.stopMonitoring(sessionName);
    return { success: true };
  });

  // Get monitored sessions
  ipcMain.handle('monitor:list', async () => {
    return { success: true, data: sessionMonitor.getMonitoredSessions() };
  });

  // Check if session is being monitored
  ipcMain.handle('monitor:isMonitoring', async (_event, sessionName: string) => {
    return { success: true, data: sessionMonitor.isMonitoring(sessionName) };
  });

  // Record manual interaction (from UI)
  ipcMain.handle('monitor:recordInteraction', async (
    _event,
    sessionId: string,
    prompt: string,
    response: string,
    feedback?: number
  ) => {
    sessionMonitor.recordManualInteraction(sessionId, prompt, response, feedback);
    return { success: true };
  });

  // ========================================
  // Context Injection IPC
  // ========================================

  const contextInjector = getContextInjector();

  // Get context for a prompt
  ipcMain.handle('context:getForPrompt', async (
    _event,
    options: { prompt: string; projectId?: string; language?: string; sessionId?: string }
  ) => {
    const context = contextInjector.getContextForPrompt(options);
    return { success: true, data: context };
  });

  // Get error-specific context
  ipcMain.handle('context:getForErrors', async (
    _event,
    errors: string[],
    language?: string
  ) => {
    const context = contextInjector.getErrorContext(errors, language);
    return { success: true, data: context };
  });

  // Enable/disable context injection
  ipcMain.handle('context:enable', async () => {
    contextInjector.enable();
    return { success: true };
  });

  ipcMain.handle('context:disable', async () => {
    contextInjector.disable();
    return { success: true };
  });

  // Get context injection config
  ipcMain.handle('context:getConfig', async () => {
    return { success: true, data: contextInjector.getConfig() };
  });

  // Update context injection config
  ipcMain.handle('context:setConfig', async (
    _event,
    config: { enabled?: boolean; maxTokens?: number; includePatterns?: boolean; includeSnippets?: boolean; includeWarnings?: boolean }
  ) => {
    contextInjector.setConfig(config);
    return { success: true };
  });

  // ========================================
  // AI Service IPC
  // ========================================

  const aiService = getAIService();

  // Check health of all providers
  ipcMain.handle('ai:checkProviders', async () => {
    console.log('[IPC] Checking AI providers');
    const health = await aiService.checkAllProviders();
    return { success: true, data: health };
  });

  // Check Ollama health specifically
  ipcMain.handle('ai:checkOllama', async () => {
    const health = await aiService.checkOllamaHealth();
    return { success: true, data: health };
  });

  // Check Claude health specifically
  ipcMain.handle('ai:checkClaude', async () => {
    const health = await aiService.checkClaudeHealth();
    return { success: true, data: health };
  });

  // List Ollama models
  ipcMain.handle('ai:listOllamaModels', async () => {
    try {
      const models = await aiService.listOllamaModels();
      return { success: true, data: models };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // Make an AI call
  ipcMain.handle('ai:call', async (
    _event,
    options: {
      provider: AIProviderType;
      model?: string;
      messages: AIMessage[];
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }
  ) => {
    console.log(`[IPC] AI call to ${options.provider}${options.model ? ` (${options.model})` : ''}`);
    const result = await aiService.call(options);
    return result;
  });

  // Quick prompt (convenience)
  ipcMain.handle('ai:quickPrompt', async (
    _event,
    provider: AIProviderType,
    prompt: string,
    model?: string
  ) => {
    console.log(`[IPC] Quick prompt to ${provider}`);
    const result = await aiService.quickPrompt(provider, prompt, model);
    return result;
  });

  // Calculate cost
  ipcMain.handle('ai:calculateCost', async (
    _event,
    provider: AIProviderType,
    model: string,
    inputTokens: number,
    outputTokens: number
  ) => {
    const cost = aiService.calculateCost(provider, model, inputTokens, outputTokens);
    return { success: true, data: cost };
  });

  // Set Ollama URL
  ipcMain.handle('ai:setOllamaUrl', async (_event, url: string) => {
    aiService.setOllamaUrl(url);
    return { success: true };
  });

  // ========================================
  // Cross-Session Awareness IPC
  // ========================================

  const crossSessionAwareness = getCrossSessionAwareness();

  // Register a session
  ipcMain.handle('crosssession:register', async (
    _event,
    sessionId: string,
    sessionName: string,
    workingDir: string,
    projectId?: string
  ) => {
    crossSessionAwareness.registerSession(sessionId, sessionName, workingDir, projectId);
    return { success: true };
  });

  // Unregister a session
  ipcMain.handle('crosssession:unregister', async (_event, sessionId: string) => {
    crossSessionAwareness.unregisterSession(sessionId);
    return { success: true };
  });

  // Update session activity
  ipcMain.handle('crosssession:updateActivity', async (
    _event,
    sessionId: string,
    updates: { currentTask?: string; status?: string; tags?: string[] }
  ) => {
    crossSessionAwareness.updateActivity(sessionId, updates as any);
    return { success: true };
  });

  // Record file modification
  ipcMain.handle('crosssession:recordFile', async (
    _event,
    sessionId: string,
    filePath: string
  ) => {
    crossSessionAwareness.recordFileModification(sessionId, filePath);
    return { success: true };
  });

  // Record error
  ipcMain.handle('crosssession:recordError', async (
    _event,
    sessionId: string,
    error: string
  ) => {
    crossSessionAwareness.recordError(sessionId, error);
    return { success: true };
  });

  // Record error resolved
  ipcMain.handle('crosssession:recordErrorResolved', async (
    _event,
    sessionId: string,
    error: string,
    solution: string
  ) => {
    crossSessionAwareness.recordErrorResolved(sessionId, error, solution);
    return { success: true };
  });

  // Get cross-session context
  ipcMain.handle('crosssession:getContext', async (_event, sessionId: string) => {
    const context = crossSessionAwareness.getCrossSessionContext(sessionId);
    return { success: true, data: context };
  });

  // Get suggestions
  ipcMain.handle('crosssession:getSuggestions', async (_event, sessionId: string) => {
    const suggestions = crossSessionAwareness.getSuggestions(sessionId);
    return { success: true, data: suggestions };
  });

  // Dismiss suggestion
  ipcMain.handle('crosssession:dismissSuggestion', async (_event, suggestionId: string) => {
    crossSessionAwareness.dismissSuggestion(suggestionId);
    return { success: true };
  });

  // Get activity feed
  ipcMain.handle('crosssession:getActivityFeed', async () => {
    const feed = crossSessionAwareness.getActivityFeed();
    return { success: true, data: feed };
  });

  // Get active sessions
  ipcMain.handle('crosssession:getActiveSessions', async () => {
    const sessions = crossSessionAwareness.getActiveSessions();
    return { success: true, data: sessions };
  });

  // Get session by ID
  ipcMain.handle('crosssession:getSession', async (_event, sessionId: string) => {
    const session = crossSessionAwareness.getSession(sessionId);
    return { success: true, data: session };
  });

  // ═══════════════════════════════════════════════════════════════
  // DEPLOYMENT SERVICE (GitHub + CI/CD Integration)
  // ═══════════════════════════════════════════════════════════════

  // Check if deployment service is available
  ipcMain.handle('deploy:isAvailable', async () => {
    return { success: true, data: deploymentService.isAvailable() };
  });

  // List all repos in org
  ipcMain.handle('deploy:listRepos', async () => {
    try {
      const repos = await deploymentService.listRepos();
      return { success: true, data: repos };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Get workflow runs for a repo
  ipcMain.handle('deploy:listWorkflowRuns', async (_event, repo: string, limit?: number) => {
    try {
      const runs = await deploymentService.listWorkflowRuns(repo, limit);
      return { success: true, data: runs };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Get workflow logs
  ipcMain.handle('deploy:getWorkflowLogs', async (_event, repo: string, runId: number) => {
    try {
      const logs = await deploymentService.getWorkflowRunLogs(repo, runId);
      return { success: true, data: logs };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Rerun a workflow
  ipcMain.handle('deploy:rerunWorkflow', async (_event, repo: string, runId: number) => {
    try {
      const success = await deploymentService.rerunWorkflow(repo, runId);
      return { success, data: success };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // List releases
  ipcMain.handle('deploy:listReleases', async (_event, repo: string, limit?: number) => {
    try {
      const releases = await deploymentService.listReleases(repo, limit);
      return { success: true, data: releases };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Create a release
  ipcMain.handle('deploy:createRelease', async (_event, repo: string, tagName: string, title: string, notes: string, draft?: boolean, prerelease?: boolean) => {
    try {
      const release = await deploymentService.createRelease(repo, tagName, title, notes, draft, prerelease);
      return { success: !!release, data: release };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // List pull requests
  ipcMain.handle('deploy:listPRs', async (_event, repo: string, state?: 'open' | 'closed' | 'all') => {
    try {
      const prs = await deploymentService.listPullRequests(repo, state);
      return { success: true, data: prs };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Merge a pull request
  ipcMain.handle('deploy:mergePR', async (_event, repo: string, prNumber: number, method?: 'merge' | 'squash' | 'rebase') => {
    try {
      const success = await deploymentService.mergePullRequest(repo, prNumber, method);
      return { success, data: success };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Trigger a workflow
  ipcMain.handle('deploy:triggerWorkflow', async (_event, repo: string, workflow: string, branch?: string) => {
    try {
      const success = await deploymentService.triggerWorkflow(repo, workflow, branch);
      return { success, data: success };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Get org status (quick overview)
  ipcMain.handle('deploy:getOrgStatus', async () => {
    try {
      const status = await deploymentService.getOrgStatus();
      return { success: true, data: status };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Get deployment history (for LEO learning)
  ipcMain.handle('deploy:getHistory', async () => {
    return { success: true, data: deploymentService.getDeploymentHistory() };
  });

  // Get deployment stats (for LEO learning)
  ipcMain.handle('deploy:getStats', async () => {
    return { success: true, data: deploymentService.getDeploymentStats() };
  });

  // Get deployment patterns (for LEO learning)
  ipcMain.handle('deploy:getPatterns', async () => {
    return { success: true, data: deploymentService.getDeploymentPatterns() };
  });

  // Forward deployment events to LEO
  deploymentService.on('deployment-event', (event) => {
    // Record deployment outcomes for LEO learning
    const leoAI = getLeoAI();
    if (leoAI.getStatus().enabled) {
      // Record as an interaction for LEO AI learning
      leoAI.recordInteraction(
        'deployment-system',
        `Deployment event: ${event.type} for ${event.repo}`,
        JSON.stringify({
          success: event.success,
          duration: event.duration,
          details: event.details,
        }),
        { outcome: event.success ? 'success' : 'failure' }
      );
    }

    // Notify renderer of deployment event
    if (mainWindow) {
      mainWindow.webContents.send('deployment-event', event);
    }
  });

  console.log('[IPC] Handlers registered (including LEO + LEO AI + SessionMonitor + ContextInjector + AIService + CrossSessionAwareness + Deployment)');
}

app.whenReady().then(() => {
  console.log('========================================');
  console.log('  Flowrider 2.0 - Starting Up');
  console.log('========================================');

  setupIPC();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  console.log('[Main] App quitting, cleaning up...');
  sessionMonitor.shutdown();
  shutdownLeoAI();
  shutdownCrossSessionAwareness();
});
