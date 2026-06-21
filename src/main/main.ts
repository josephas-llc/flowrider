import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import { TmuxManager } from './TmuxManager';
import { LeoManager } from './LeoManager';
import { getLeoAI, shutdownLeoAI } from './leo-ai';

let mainWindow: BrowserWindow | null = null;
let tmuxManager: TmuxManager;
let leoManager: LeoManager;

const isDev = !app.isPackaged;

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

  if (isDev) {
    mainWindow.loadURL('http://localhost:5174');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('[Main] Window created');
}

function setupIPC() {
  tmuxManager = new TmuxManager();
  leoManager = new LeoManager();

  // Create a new tmux session
  ipcMain.handle('tmux:create', async (_event, name: string, faceIndex: number, workingDir: string) => {
    console.log(`[IPC] Creating session: ${name} for face ${faceIndex}`);
    return tmuxManager.createSession(name, faceIndex, workingDir);
  });

  // List all flowrider tmux sessions
  ipcMain.handle('tmux:list', async () => {
    return tmuxManager.listSessions();
  });

  // Kill a tmux session
  ipcMain.handle('tmux:kill', async (_event, sessionName: string) => {
    console.log(`[IPC] Killing session: ${sessionName}`);
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

  console.log('[IPC] Handlers registered (including LEO + LEO AI)');
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
});
