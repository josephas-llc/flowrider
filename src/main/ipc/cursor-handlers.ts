/**
 * Cursor IDE Integration IPC Handlers
 *
 * Provides IPC handlers for opening directories in Cursor IDE:
 * - cursor:open - Open a directory in Cursor IDE
 * - cursor:check - Check if Cursor CLI is installed
 */

import { ipcMain } from 'electron';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';

const execAsync = promisify(exec);

/**
 * Register all Cursor IDE-related IPC handlers
 */
export function registerCursorHandlers(): void {
  // Open a directory in Cursor IDE
  ipcMain.handle('cursor:open', async (_event, workingDir: string) => {
    try {
      // Verify the path exists
      if (!fs.existsSync(workingDir)) {
        return {
          success: false,
          error: 'Directory does not exist'
        };
      }

      // Try to open in Cursor
      // Use 'cursor' command which should be available if Cursor CLI is installed
      await execAsync(`cursor "${workingDir}"`);

      return { success: true };
    } catch (error) {
      // Cursor CLI might not be installed
      return {
        success: false,
        error: 'Failed to open Cursor. Make sure Cursor CLI is installed (Cmd+Shift+P -> "Install cursor command" in Cursor IDE)'
      };
    }
  });

  // Check if Cursor CLI is installed
  ipcMain.handle('cursor:check', async () => {
    try {
      await execAsync('which cursor');
      return { installed: true };
    } catch {
      return { installed: false };
    }
  });

  console.log('[Cursor Handlers] IPC handlers registered');
}
