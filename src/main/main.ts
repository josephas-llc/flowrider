import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { TmuxManager } from './TmuxManager';

let mainWindow: BrowserWindow | null = null;
let tmuxManager: TmuxManager;

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

  console.log('[IPC] Handlers registered');
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
