import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import { TmuxManager } from './TmuxManager';
import { FleetManager } from './FleetManager';
import { SessionMonitor } from './SessionMonitor';
import { getAICore, shutdownAICore } from './ai-core';
import { getContextInjector } from './ContextInjector';
import { getAIService, AIProviderType, AIMessage } from './AIService';
import { getCrossSessionAwareness, shutdownCrossSessionAwareness } from './CrossSessionAwareness';
import { deploymentService } from './DeploymentService';
import { getLicenseService } from './LicenseService';
import { getAutoUpdateService } from './AutoUpdateService';
import { getTemplateService, shutdownTemplateService } from './TemplateService';
import { getApiServer, stopApiServer } from './api';
import { registerApiHandlers, setApiServer } from './ipc/api-handlers';
import { registerCursorHandlers } from './ipc/cursor-handlers';
import { getApiConfigService, shutdownApiConfigService } from './api/ApiConfig';
import { z } from 'zod';
import {
  validate,
  validateWithResponse,
  createSessionSchema,
  sessionNameSchema,
  sendInputSchema,
  outputLinesSchema,
  workingDirSchema,
  sessionIdSchema,
  projectIdSchema,
  languageSchema,
  feedbackSchema,
  updateActivitySchema,
  filePathSchema,
  errorMessageSchema,
  solutionSchema,
  aiCallSchema,
  setApiKeySchema,
  aiProviderSchema,
  licenseKeySchema,
  templateIdSchema,
  templateCategorySchema,
  repoNameSchema,
  workflowIdSchema,
  prNumberSchema,
  tagNameSchema,
  mergeMethodSchema,
  prStateSchema,
} from './utils/validation';

let mainWindow: BrowserWindow | null = null;
let tmuxManager: TmuxManager;
let leoManager: FleetManager;
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
  leoManager = new FleetManager();

  // Configure FleetManager with session count callback
  leoManager.setHandlers({
    getActiveSessionCount: () => {
      // Get session count synchronously from tmux
      try {
        const result = tmuxManager.listSessionsSync();
        if (result.success && result.data) {
          // Count sessions with names starting with 'face-' (Flowrider sessions)
          return result.data.filter(s => s.name.startsWith('face-')).length;
        }
      } catch {
        // Fall back to 0 if error
      }
      return 0;
    }
  });

  // Create SessionMonitor with access to tmuxManager.getOutput
  sessionMonitor = new SessionMonitor(
    (sessionName: string, lines: number) => tmuxManager.getOutput(sessionName, lines)
  );

  // Create a new tmux session
  ipcMain.handle('tmux:create', async (_event, name: string, faceIndex: number, workingDir: string, options?: { setupCommand?: string; skipClaude?: boolean }) => {
    try {
      const validated = validate(createSessionSchema, { name, faceIndex, workingDir });
      console.log(`[IPC] Creating session: ${validated.name} for face ${validated.faceIndex}`);
      const result = await tmuxManager.createSession(validated.name, validated.faceIndex, validated.workingDir, options);

      // Auto-start monitoring the session for AI System
      if ((result as any).success) {
        const sessionId = `face-${validated.faceIndex}`;
        const tmuxSessionName = (result as any).data?.name || validated.name;
        sessionMonitor.startMonitoring(tmuxSessionName, sessionId, validated.workingDir);
      }

      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // List all flowrider tmux sessions
  ipcMain.handle('tmux:list', async () => {
    return tmuxManager.listSessions();
  });

  // Kill a tmux session
  ipcMain.handle('tmux:kill', async (_event, sessionName: string) => {
    try {
      const validated = validate(sessionNameSchema, sessionName);
      console.log(`[IPC] Killing session: ${validated}`);
      // Stop monitoring before killing
      sessionMonitor.stopMonitoring(validated);
      return tmuxManager.killSession(validated);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Send input to a tmux session
  ipcMain.handle('tmux:input', async (_event, sessionName: string, data: string) => {
    try {
      const validated = validate(sendInputSchema, { sessionId: sessionName, input: data });
      return tmuxManager.sendInput(validated.sessionId, validated.input);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Send a command (with Enter) to a tmux session
  ipcMain.handle('tmux:command', async (_event, sessionName: string, command: string) => {
    try {
      const validated = validate(sendInputSchema, { sessionId: sessionName, input: command });
      return tmuxManager.sendCommand(validated.sessionId, validated.input);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get output from a tmux session
  ipcMain.handle('tmux:output', async (_event, sessionName: string, lines: number) => {
    try {
      const validatedSession = validate(sessionNameSchema, sessionName);
      const validatedLines = validate(outputLinesSchema, lines);
      return tmuxManager.getOutput(validatedSession, validatedLines);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Resize a tmux session to match terminal dimensions
  ipcMain.handle('tmux:resize', async (_event, sessionName: string, cols: number, rows: number) => {
    try {
      const validatedSession = validate(sessionNameSchema, sessionName);
      // Basic validation for dimensions
      if (typeof cols !== 'number' || typeof rows !== 'number' || cols < 1 || rows < 1) {
        return { success: false, error: 'Invalid dimensions' };
      }
      return tmuxManager.resizeSession(validatedSession, cols, rows);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Rename a tmux session
  ipcMain.handle('tmux:rename', async (_event, oldName: string, newName: string) => {
    try {
      const validatedOld = validate(sessionNameSchema, oldName);
      const validatedNew = validate(sessionNameSchema, newName);
      console.log(`[IPC] Renaming session: ${validatedOld} -> ${validatedNew}`);
      return tmuxManager.renameSession(validatedOld, validatedNew);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Detect GitHub repo from working directory
  ipcMain.handle('git:detect', async (_event, workingDir: string) => {
    try {
      const validated = validate(workingDirSchema, workingDir);
      console.log(`[IPC] Detecting git repo in: ${validated}`);
      return tmuxManager.detectGitRepo(validated);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
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
    try {
      const validated = validate(sessionIdSchema, flowriderId);
      return leoManager.pingFlowrider(validated);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get sessions from a remote flowrider
  ipcMain.handle('leo:remoteSessions', async (_event, flowriderId: string) => {
    try {
      const validated = validate(sessionIdSchema, flowriderId);
      return leoManager.getRemoteSessions(validated);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get this instance's info
  ipcMain.handle('leo:selfInfo', async () => {
    return { success: true, data: leoManager.getSelfInfo() };
  });

  // ========================================
  // AI System (Self-Improving Learning) IPC
  // ========================================

  const aiCore = getAICore();

  // Auto-enable AI System learning on startup
  aiCore.enable();
  console.log('[IPC] AI System auto-enabled on startup');

  // Enable AI System learning
  ipcMain.handle('leoai:enable', async () => {
    console.log('[IPC] Enabling AI System');
    aiCore.enable();
    return { success: true };
  });

  // Disable AI System learning
  ipcMain.handle('leoai:disable', async () => {
    console.log('[IPC] Disabling AI System');
    aiCore.disable();
    return { success: true };
  });

  // Get AI System status
  ipcMain.handle('leoai:status', async () => {
    return { success: true, data: aiCore.getStatus() };
  });

  // Record an interaction for learning
  ipcMain.handle('leoai:recordInteraction', async (
    _event,
    sessionId: string,
    prompt: string,
    response: string,
    metadata?: { filesModified?: string[]; outcome?: string; feedback?: number }
  ) => {
    const id = aiCore.recordInteraction(sessionId, prompt, response, metadata as any);
    return { success: true, id };
  });

  // Record user feedback
  ipcMain.handle('leoai:recordFeedback', async (
    _event,
    sessionId: string,
    signal: { type: string; value: number; context?: string }
  ) => {
    aiCore.recordFeedback(sessionId, signal as any);
    return { success: true };
  });

  // Get distilled context for a session
  ipcMain.handle('leoai:getContext', async (
    _event,
    request?: { prompt?: string; projectId?: string; language?: string; tags?: string[]; errors?: string[] }
  ) => {
    const context = aiCore.getContext(request);
    return { success: true, data: context };
  });

  // Get quick context
  ipcMain.handle('leoai:getQuickContext', async (_event, projectId?: string, language?: string) => {
    const context = aiCore.getQuickContext(projectId, language);
    return { success: true, data: context };
  });

  // Get error-specific context
  ipcMain.handle('leoai:getErrorContext', async (_event, errors: string[], language?: string) => {
    const context = aiCore.getErrorContext(errors, language);
    return { success: true, data: context };
  });

  // Trigger manual analysis
  ipcMain.handle('leoai:analyze', async () => {
    console.log('[IPC] Triggering AI System analysis');
    const result = await aiCore.analyze();
    return { success: true, data: result };
  });

  // Get knowledge stats
  ipcMain.handle('leoai:stats', async () => {
    return { success: true, data: aiCore.getKnowledgeStats() };
  });

  // Get recent interactions
  ipcMain.handle('leoai:getInteractions', async (_event, limit: number = 50) => {
    return { success: true, data: aiCore.getRecentInteractions(limit) };
  });

  // Get patterns
  ipcMain.handle('leoai:getPatterns', async (_event, minConfidence: number = 0.5) => {
    return { success: true, data: aiCore.getPatterns(minConfidence) };
  });

  // Get insights
  ipcMain.handle('leoai:getInsights', async (_event, limit: number = 20) => {
    return { success: true, data: aiCore.getInsights(limit) };
  });

  // Search snippets
  ipcMain.handle('leoai:searchSnippets', async (_event, query: string) => {
    return { success: true, data: aiCore.searchSnippets(query) };
  });

  // Get learning events
  ipcMain.handle('leoai:getLearningEvents', async (_event, since: number) => {
    return { success: true, data: aiCore.getLearningEvents(since) };
  });

  // Register a session for learning
  ipcMain.handle('leoai:registerSession', async (
    _event,
    context: { sessionId: string; sessionName: string; projectId?: string; workingDir: string; repoUrl?: string; language?: string }
  ) => {
    aiCore.registerSession(context as any);
    return { success: true };
  });

  // ========================================
  // AI System Suggestions IPC (Intelligence Layer)
  // ========================================

  // Get smart suggestions based on context
  ipcMain.handle('leoai:getSuggestions', async (
    _event,
    request?: { sessionId?: string; projectId?: string; workingDir?: string; language?: string; currentTask?: string; recentErrors?: string[]; aiProvider?: string; limit?: number }
  ) => {
    return { success: true, data: aiCore.getSuggestions(request) };
  });

  // Get AI-powered suggestions (uses Ollama for real AI responses)
  ipcMain.handle('leoai:getAISuggestions', async (
    _event,
    request?: { sessionId?: string; projectId?: string; workingDir?: string; language?: string; currentTask?: string; recentErrors?: string[]; aiProvider?: string; limit?: number }
  ) => {
    try {
      const suggestions = await aiCore.getAISuggestions(request);
      return { success: true, data: suggestions };
    } catch (error) {
      console.error('[IPC] getAISuggestions failed:', error);
      return { success: false, error: String(error) };
    }
  });

  // Enable/disable AI-powered suggestions
  ipcMain.handle('leoai:setAISuggestionsEnabled', async (_event, enabled: boolean) => {
    aiCore.setAISuggestionsEnabled(enabled);
    return { success: true };
  });

  // Get session start suggestions
  ipcMain.handle('leoai:getSessionStartSuggestions', async (
    _event,
    workingDir: string,
    projectId?: string,
    language?: string
  ) => {
    return { success: true, data: aiCore.getSessionStartSuggestions(workingDir, projectId, language) };
  });

  // Get error-specific suggestions
  ipcMain.handle('leoai:getErrorSuggestions', async (
    _event,
    errors: string[],
    language?: string
  ) => {
    return { success: true, data: aiCore.getErrorSuggestions(errors, language) };
  });

  // Dismiss a suggestion
  ipcMain.handle('leoai:dismissSuggestion', async (_event, suggestionId: string) => {
    aiCore.dismissSuggestion(suggestionId);
    return { success: true };
  });

  // Record suggestion action (for learning)
  ipcMain.handle('leoai:recordSuggestionAction', async (
    _event,
    suggestionId: string,
    accepted: boolean
  ) => {
    aiCore.recordSuggestionAction(suggestionId, accepted);
    return { success: true };
  });

  // Clear dismissed suggestions
  ipcMain.handle('leoai:clearDismissedSuggestions', async () => {
    aiCore.clearDismissedSuggestions();
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
    try {
      const validatedSession = validate(sessionNameSchema, sessionName);
      const validatedId = validate(sessionIdSchema, sessionId);
      const validatedDir = validate(workingDirSchema, workingDir);
      const validatedProject = projectId ? validate(projectIdSchema, projectId) : undefined;
      const validatedLang = language ? validate(languageSchema, language) : undefined;
      sessionMonitor.startMonitoring(validatedSession, validatedId, validatedDir, validatedProject, validatedLang);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Stop monitoring a session
  ipcMain.handle('monitor:stop', async (_event, sessionName: string) => {
    try {
      const validated = validate(sessionNameSchema, sessionName);
      sessionMonitor.stopMonitoring(validated);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get monitored sessions
  ipcMain.handle('monitor:list', async () => {
    return { success: true, data: sessionMonitor.getMonitoredSessions() };
  });

  // Check if session is being monitored
  ipcMain.handle('monitor:isMonitoring', async (_event, sessionName: string) => {
    try {
      const validated = validate(sessionNameSchema, sessionName);
      return { success: true, data: sessionMonitor.isMonitoring(validated) };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Record manual interaction (from UI)
  ipcMain.handle('monitor:recordInteraction', async (
    _event,
    sessionId: string,
    prompt: string,
    response: string,
    feedback?: number
  ) => {
    try {
      const validatedId = validate(sessionIdSchema, sessionId);
      const validatedPrompt = validate(z.string().max(50000), prompt);
      const validatedResponse = validate(z.string().max(100000), response);
      const validatedFeedback = feedback !== undefined ? validate(z.number().min(-1).max(1), feedback) : undefined;
      sessionMonitor.recordManualInteraction(validatedId, validatedPrompt, validatedResponse, validatedFeedback);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
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
    try {
      const validated = validate(aiCallSchema, options);
      console.log(`[IPC] AI call to ${validated.provider}${validated.model ? ` (${validated.model})` : ''}`);
      const result = await aiService.call(validated);
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Quick prompt (convenience)
  ipcMain.handle('ai:quickPrompt', async (
    _event,
    provider: AIProviderType,
    prompt: string,
    model?: string
  ) => {
    try {
      const validatedProvider = validate(aiProviderSchema, provider);
      const validatedPrompt = validate(z.string().max(50000), prompt);
      const validatedModel = model ? validate(z.string().max(100), model) : undefined;
      console.log(`[IPC] Quick prompt to ${validatedProvider}`);
      const result = await aiService.quickPrompt(validatedProvider, validatedPrompt, validatedModel);
      return result;
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Calculate cost
  ipcMain.handle('ai:calculateCost', async (
    _event,
    provider: AIProviderType,
    model: string,
    inputTokens: number,
    outputTokens: number
  ) => {
    try {
      const validatedProvider = validate(aiProviderSchema, provider);
      const validatedModel = validate(z.string().max(100), model);
      const validatedInput = validate(z.number().int().min(0).max(1000000), inputTokens);
      const validatedOutput = validate(z.number().int().min(0).max(1000000), outputTokens);
      const cost = aiService.calculateCost(validatedProvider, validatedModel, validatedInput, validatedOutput);
      return { success: true, data: cost };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Set Ollama URL
  ipcMain.handle('ai:setOllamaUrl', async (_event, url: string) => {
    try {
      const validated = validate(z.string().url(), url);
      aiService.setOllamaUrl(validated);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Set API key for a provider
  ipcMain.handle('ai:setApiKey', async (_event, provider: AIProviderType, key: string) => {
    try {
      const validated = validate(setApiKeySchema, { provider, key });
      aiService.setApiKey(validated.provider, validated.key);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // Get API key for a provider
  ipcMain.handle('ai:getApiKey', async (_event, provider: AIProviderType) => {
    try {
      const validated = validate(aiProviderSchema, provider);
      const key = aiService.getApiKey(validated);
      return { success: true, data: key };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // Get all API keys
  ipcMain.handle('ai:getApiKeys', async () => {
    try {
      const keys = aiService.getApiKeys();
      return { success: true, data: keys };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
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
    try {
      const validatedId = validate(sessionIdSchema, sessionId);
      const validatedName = validate(sessionNameSchema, sessionName);
      const validatedDir = validate(workingDirSchema, workingDir);
      const validatedProject = projectId ? validate(projectIdSchema, projectId) : undefined;
      crossSessionAwareness.registerSession(validatedId, validatedName, validatedDir, validatedProject);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Unregister a session
  ipcMain.handle('crosssession:unregister', async (_event, sessionId: string) => {
    try {
      const validated = validate(sessionIdSchema, sessionId);
      crossSessionAwareness.unregisterSession(validated);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Update session activity
  ipcMain.handle('crosssession:updateActivity', async (
    _event,
    sessionId: string,
    updates: { currentTask?: string; status?: string; tags?: string[] }
  ) => {
    try {
      const validatedId = validate(sessionIdSchema, sessionId);
      const validatedUpdates = validate(updateActivitySchema, updates);
      crossSessionAwareness.updateActivity(validatedId, validatedUpdates as any);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Record file modification
  ipcMain.handle('crosssession:recordFile', async (
    _event,
    sessionId: string,
    filePath: string
  ) => {
    try {
      const validatedId = validate(sessionIdSchema, sessionId);
      const validatedPath = validate(filePathSchema, filePath);
      crossSessionAwareness.recordFileModification(validatedId, validatedPath);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Record error
  ipcMain.handle('crosssession:recordError', async (
    _event,
    sessionId: string,
    error: string
  ) => {
    try {
      const validatedId = validate(sessionIdSchema, sessionId);
      const validatedError = validate(errorMessageSchema, error);
      crossSessionAwareness.recordError(validatedId, validatedError);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Record error resolved
  ipcMain.handle('crosssession:recordErrorResolved', async (
    _event,
    sessionId: string,
    error: string,
    solution: string
  ) => {
    try {
      const validatedId = validate(sessionIdSchema, sessionId);
      const validatedError = validate(errorMessageSchema, error);
      const validatedSolution = validate(solutionSchema, solution);
      crossSessionAwareness.recordErrorResolved(validatedId, validatedError, validatedSolution);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get cross-session context
  ipcMain.handle('crosssession:getContext', async (_event, sessionId: string) => {
    try {
      const validated = validate(sessionIdSchema, sessionId);
      const context = crossSessionAwareness.getCrossSessionContext(validated);
      return { success: true, data: context };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get suggestions
  ipcMain.handle('crosssession:getSuggestions', async (_event, sessionId: string) => {
    try {
      const validated = validate(sessionIdSchema, sessionId);
      const suggestions = crossSessionAwareness.getSuggestions(validated);
      return { success: true, data: suggestions };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Dismiss suggestion
  ipcMain.handle('crosssession:dismissSuggestion', async (_event, suggestionId: string) => {
    try {
      const validated = validate(sessionIdSchema, suggestionId);
      crossSessionAwareness.dismissSuggestion(validated);
      return { success: true };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
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
    try {
      const validated = validate(sessionIdSchema, sessionId);
      const session = crossSessionAwareness.getSession(validated);
      return { success: true, data: session };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
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
      const validatedRepo = validate(repoNameSchema, repo);
      const validatedLimit = limit ? validate(z.number().int().min(1).max(100), limit) : undefined;
      const runs = await deploymentService.listWorkflowRuns(validatedRepo, validatedLimit);
      return { success: true, data: runs };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Get workflow logs
  ipcMain.handle('deploy:getWorkflowLogs', async (_event, repo: string, runId: number) => {
    try {
      const validatedRepo = validate(repoNameSchema, repo);
      const validatedId = validate(workflowIdSchema, runId);
      const logs = await deploymentService.getWorkflowRunLogs(validatedRepo, validatedId);
      return { success: true, data: logs };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Rerun a workflow
  ipcMain.handle('deploy:rerunWorkflow', async (_event, repo: string, runId: number) => {
    try {
      const validatedRepo = validate(repoNameSchema, repo);
      const validatedId = validate(workflowIdSchema, runId);
      const success = await deploymentService.rerunWorkflow(validatedRepo, validatedId);
      return { success, data: success };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // List releases
  ipcMain.handle('deploy:listReleases', async (_event, repo: string, limit?: number) => {
    try {
      const validatedRepo = validate(repoNameSchema, repo);
      const validatedLimit = limit ? validate(z.number().int().min(1).max(100), limit) : undefined;
      const releases = await deploymentService.listReleases(validatedRepo, validatedLimit);
      return { success: true, data: releases };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Create a release
  ipcMain.handle('deploy:createRelease', async (_event, repo: string, tagName: string, title: string, notes: string, draft?: boolean, prerelease?: boolean) => {
    try {
      const validatedRepo = validate(repoNameSchema, repo);
      const validatedTag = validate(tagNameSchema, tagName);
      const validatedTitle = validate(z.string().min(1).max(200), title);
      const validatedNotes = validate(z.string().max(50000), notes);
      const validatedDraft = draft !== undefined ? validate(z.boolean(), draft) : undefined;
      const validatedPre = prerelease !== undefined ? validate(z.boolean(), prerelease) : undefined;
      const release = await deploymentService.createRelease(validatedRepo, validatedTag, validatedTitle, validatedNotes, validatedDraft, validatedPre);
      return { success: !!release, data: release };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // List pull requests
  ipcMain.handle('deploy:listPRs', async (_event, repo: string, state?: 'open' | 'closed' | 'all') => {
    try {
      const validatedRepo = validate(repoNameSchema, repo);
      const validatedState = state ? validate(prStateSchema, state) : undefined;
      const prs = await deploymentService.listPullRequests(validatedRepo, validatedState);
      return { success: true, data: prs };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Merge a pull request
  ipcMain.handle('deploy:mergePR', async (_event, repo: string, prNumber: number, method?: 'merge' | 'squash' | 'rebase') => {
    try {
      const validatedRepo = validate(repoNameSchema, repo);
      const validatedPR = validate(prNumberSchema, prNumber);
      const validatedMethod = method ? validate(mergeMethodSchema, method) : undefined;
      const success = await deploymentService.mergePullRequest(validatedRepo, validatedPR, validatedMethod);
      return { success, data: success };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Trigger a workflow
  ipcMain.handle('deploy:triggerWorkflow', async (_event, repo: string, workflow: string, branch?: string) => {
    try {
      const validatedRepo = validate(repoNameSchema, repo);
      const validatedWorkflow = validate(z.string().min(1).max(100), workflow);
      const validatedBranch = branch ? validate(z.string().min(1).max(100), branch) : undefined;
      const success = await deploymentService.triggerWorkflow(validatedRepo, validatedWorkflow, validatedBranch);
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

  // =====================
  // LICENSE MANAGEMENT (Lemon Squeezy)
  // =====================
  const licenseService = getLicenseService();

  // Activate a license key
  ipcMain.handle('license:activate', async (_event, licenseKey: string) => {
    try {
      const validated = validate(licenseKeySchema, licenseKey);
      console.log('[IPC] Activating license');
      return licenseService.activateLicense(validated);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Validate current license
  ipcMain.handle('license:validate', async () => {
    console.log('[IPC] Validating license');
    return licenseService.validateLicense();
  });

  // Deactivate license
  ipcMain.handle('license:deactivate', async () => {
    console.log('[IPC] Deactivating license');
    return licenseService.deactivateLicense();
  });

  // Get current license info
  ipcMain.handle('license:get', async () => {
    return { success: true, license: licenseService.getLicense() };
  });

  // Check if user can create more sessions
  ipcMain.handle('license:canCreateSession', async (_event, currentCount: number) => {
    try {
      const validated = validate(z.number().int().min(0).max(20), currentCount);
      return { success: true, allowed: licenseService.canCreateSession(validated) };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get session limit for current tier
  ipcMain.handle('license:getSessionLimit', async () => {
    return { success: true, limit: licenseService.getSessionLimit() };
  });

  // =====================
  // TEMPLATE MANAGEMENT
  // =====================
  const templateService = getTemplateService();

  // List all templates (built-in + user-created)
  ipcMain.handle('templates:list', async () => {
    console.log('[IPC] Listing templates');
    try {
      const templates = templateService.listTemplates();
      return { success: true, data: templates };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Get a specific template by ID
  ipcMain.handle('templates:get', async (_event, id: string) => {
    try {
      const validated = validate(templateIdSchema, id);
      console.log('[IPC] Getting template:', validated);
      const template = templateService.getTemplate(validated);
      if (!template) {
        return { success: false, error: 'Template not found' };
      }
      return { success: true, data: template };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Save a new template or update existing
  ipcMain.handle('templates:save', async (_event, template: any) => {
    try {
      // Basic validation of template object - allowing passthrough for additional fields
      const validated = validate(z.object({
        id: templateIdSchema.optional(),
        name: z.string().min(1).max(100),
        category: templateCategorySchema,
        description: z.string().max(500).optional(),
        icon: z.string().optional(),
        config: z.any().optional(),
      }).passthrough(), template);
      console.log('[IPC] Saving template:', validated.name);
      return templateService.saveTemplate(validated as any);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Delete a user-created template
  ipcMain.handle('templates:delete', async (_event, id: string) => {
    try {
      const validated = validate(templateIdSchema, id);
      console.log('[IPC] Deleting template:', validated);
      return templateService.deleteTemplate(validated);
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get templates by category
  ipcMain.handle('templates:getByCategory', async (_event, category: string) => {
    try {
      const validated = validate(templateCategorySchema, category);
      console.log('[IPC] Getting templates by category:', validated);
      const templates = templateService.getTemplatesByCategory(validated as any);
      return { success: true, data: templates };
    } catch (err) {
      return { success: false, error: String(err) };
    }
  });

  // Forward deployment events to LEO
  deploymentService.on('deployment-event', (event) => {
    // Record deployment outcomes for LEO learning
    const aiCore = getAICore();
    if (aiCore.getStatus().enabled) {
      // Record as an interaction for AI System learning
      aiCore.recordInteraction(
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

  // Register API server IPC handlers
  registerApiHandlers();

  // Register Cursor IDE IPC handlers
  registerCursorHandlers();

  console.log('[IPC] Handlers registered (including LEO + AI System + SessionMonitor + ContextInjector + AIService + CrossSessionAwareness + Deployment + License + Templates + API + Cursor)');
}

app.whenReady().then(async () => {
  console.log('========================================');
  console.log('  Flowrider 2.0 - Starting Up');
  console.log('========================================');

  setupIPC();
  createWindow();

  // Initialize auto-update service
  if (mainWindow) {
    const autoUpdateService = getAutoUpdateService();
    autoUpdateService.setMainWindow(mainWindow);
    autoUpdateService.checkForUpdatesOnLaunch();
  }

  // Start API server with configured settings
  try {
    const apiConfigService = getApiConfigService();
    const apiConfig = apiConfigService.getConfig();

    // Only start if enabled in config
    if (apiConfig.enabled) {
      const apiServer = getApiServer({ port: apiConfig.port });
      setApiServer(apiServer); // Make server available to IPC handlers
      await apiServer.start();
      console.log(`[Main] API server started on port ${apiConfig.port}`);
    } else {
      console.log('[Main] API server is disabled in configuration');
      // Still set the server instance for IPC handlers even if not started
      const apiServer = getApiServer({ port: apiConfig.port });
      setApiServer(apiServer);
    }
  } catch (error) {
    console.error('[Main] Failed to start API server:', error);
  }

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

app.on('before-quit', async () => {
  console.log('[Main] App quitting, cleaning up...');
  sessionMonitor.shutdown();
  shutdownAICore();
  shutdownCrossSessionAwareness();
  shutdownTemplateService();

  // Stop API server
  try {
    await stopApiServer();
  } catch (error) {
    console.error('[Main] Error stopping API server:', error);
  }

  // Shutdown API config service
  try {
    shutdownApiConfigService();
  } catch (error) {
    console.error('[Main] Error shutting down API config service:', error);
  }
});
