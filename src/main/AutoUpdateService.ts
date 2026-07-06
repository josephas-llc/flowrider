/**
 * Auto-Update Service for Flowrider
 *
 * Uses electron-updater to check for and install updates from GitHub Releases.
 * Updates are checked on app launch and can be triggered manually.
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater, UpdateInfo, ProgressInfo } from 'electron-updater';

export interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error';
  version?: string;
  releaseNotes?: string;
  progress?: number;
  error?: string;
}

class AutoUpdateService {
  private mainWindow: BrowserWindow | null = null;
  private currentStatus: UpdateStatus = { status: 'idle' };

  constructor() {
    // Configure auto-updater
    autoUpdater.autoDownload = false; // Let user decide when to download
    autoUpdater.autoInstallOnAppQuit = true;

    // Set up event handlers
    this.setupEventHandlers();

    // Set up IPC handlers
    this.setupIpcHandlers();
  }

  /**
   * Initialize with main window reference
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * Set up auto-updater event handlers
   */
  private setupEventHandlers(): void {
    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdate] Checking for updates...');
      this.updateStatus({ status: 'checking' });
    });

    autoUpdater.on('update-available', (info: UpdateInfo) => {
      console.log('[AutoUpdate] Update available:', info.version);
      this.updateStatus({
        status: 'available',
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string'
          ? info.releaseNotes
          : Array.isArray(info.releaseNotes)
            ? info.releaseNotes.map(n => n.note).join('\n')
            : undefined
      });
    });

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
      console.log('[AutoUpdate] No updates available. Current version:', app.getVersion());
      this.updateStatus({
        status: 'not-available',
        version: info.version
      });
    });

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
      console.log(`[AutoUpdate] Download progress: ${progress.percent.toFixed(1)}%`);
      this.updateStatus({
        status: 'downloading',
        progress: progress.percent
      });
    });

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
      console.log('[AutoUpdate] Update downloaded:', info.version);
      this.updateStatus({
        status: 'ready',
        version: info.version,
        releaseNotes: typeof info.releaseNotes === 'string'
          ? info.releaseNotes
          : undefined
      });
    });

    autoUpdater.on('error', (error: Error) => {
      console.error('[AutoUpdate] Error:', error.message);
      this.updateStatus({
        status: 'error',
        error: error.message
      });
    });
  }

  /**
   * Set up IPC handlers for renderer communication
   */
  private setupIpcHandlers(): void {
    // Check for updates
    ipcMain.handle('update:check', async () => {
      try {
        const result = await autoUpdater.checkForUpdates();
        return { success: true, updateInfo: result?.updateInfo };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Check failed'
        };
      }
    });

    // Download update
    ipcMain.handle('update:download', async () => {
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Download failed'
        };
      }
    });

    // Install update (quit and install)
    ipcMain.handle('update:install', () => {
      autoUpdater.quitAndInstall(false, true);
    });

    // Get current status
    ipcMain.handle('update:status', () => {
      return this.currentStatus;
    });

    // Get current app version
    ipcMain.handle('update:version', () => {
      return app.getVersion();
    });
  }

  /**
   * Update status and notify renderer
   */
  private updateStatus(status: UpdateStatus): void {
    this.currentStatus = status;

    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('update:status-changed', status);
    }
  }

  /**
   * Check for updates on app launch
   */
  async checkForUpdatesOnLaunch(): Promise<void> {
    // Skip in development
    if (!app.isPackaged) {
      console.log('[AutoUpdate] Skipping update check in development mode');
      return;
    }

    // Wait a few seconds after launch
    setTimeout(async () => {
      try {
        await autoUpdater.checkForUpdates();
      } catch (error) {
        console.error('[AutoUpdate] Launch check failed:', error);
      }
    }, 5000);
  }
}

// Singleton instance
let autoUpdateService: AutoUpdateService | null = null;

export function getAutoUpdateService(): AutoUpdateService {
  if (!autoUpdateService) {
    autoUpdateService = new AutoUpdateService();
  }
  return autoUpdateService;
}

export { AutoUpdateService };
