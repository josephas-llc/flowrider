/**
 * ZOIX Intelligence IPC Handlers
 *
 * Exposes ZoixIntelligence service to the renderer process.
 * Provides:
 * - Skill progression insights ("You're getting better at X")
 * - Cross-session recommendations
 * - Intelligence summaries
 * - Contextual suggestions
 */

import { ipcMain } from 'electron';
import { getZoixIntelligence } from '../ai-core/ZoixIntelligence';

export function registerZoixIntelligenceHandlers(): void {
  const intelligence = getZoixIntelligence();

  console.log('[IPC] ZOIX Intelligence handlers registered');

  // Generate new insights by analyzing all ZOIX services
  ipcMain.handle('zoix:generateInsights', async () => {
    try {
      const insights = await intelligence.generateInsights();
      return { success: true, data: insights };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get all pending (non-dismissed) insights
  ipcMain.handle('zoix:getPendingInsights', async () => {
    try {
      const insights = intelligence.getPendingInsights();
      return { success: true, data: insights };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Dismiss an insight
  ipcMain.handle('zoix:dismissInsight', async (_event, insightId: string) => {
    try {
      const success = intelligence.dismissInsight(insightId);
      return { success, data: { dismissed: success } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get a comprehensive intelligence summary
  ipcMain.handle('zoix:getIntelligenceSummary', async () => {
    try {
      const summary = await intelligence.getSummary();
      return { success: true, data: summary };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get cross-session recommendations
  ipcMain.handle('zoix:getCrossSessionRecommendations', async () => {
    try {
      const recommendations = await intelligence.getCrossSessionRecommendations();
      return { success: true, data: recommendations };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get contextual suggestions for a session
  ipcMain.handle('zoix:getContextualSuggestions', async (
    _event,
    context: {
      projectPath?: string;
      currentFiles?: string[];
      recentCommands?: string[];
    }
  ) => {
    try {
      const suggestions = await intelligence.getContextualSuggestions(context);
      return { success: true, data: suggestions };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}

export function shutdownZoixIntelligence(): void {
  // ZoixIntelligence uses singleton pattern, no explicit shutdown needed
  console.log('[IPC] ZOIX Intelligence handlers shutdown');
}
