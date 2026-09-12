/**
 * Billing IPC Handlers
 *
 * Handles IPC communication for enterprise billing and cost tracking:
 * - billing:getReport - Get billing report (daily/weekly/monthly)
 * - billing:getProjections - Get cost projections
 * - billing:getAlerts - Get billing alerts
 * - billing:acknowledgeAlert - Acknowledge a billing alert
 * - billing:exportCSV - Export billing data to CSV
 * - billing:exportJSON - Export billing data to JSON
 * - billing:getROI - Get ROI summary
 * - billing:recordProjectCost - Record cost for a project
 */

import { ipcMain } from 'electron';
import { z } from 'zod';
import { getBillingService } from '../api/BillingService';
import { validateWithResponse } from '../utils/validation';

// Validation schemas
const periodTypeSchema = z.enum(['daily', 'weekly', 'monthly']).optional();
const alertIdSchema = z.string().min(1);
const recordCostSchema = z.object({
  projectId: z.string().min(1),
  projectName: z.string().min(1),
  cost: z.number().min(0),
  provider: z.string().min(1),
});

/**
 * Register all billing-related IPC handlers
 */
export function registerBillingHandlers(): void {
  const billing = getBillingService();

  // Get billing report
  ipcMain.handle('billing:getReport', async (_event, periodType?: string) => {
    try {
      const validPeriod = periodTypeSchema.safeParse(periodType);
      const period = validPeriod.success ? validPeriod.data : 'monthly';
      const report = billing.getReport(period);

      return {
        success: true,
        data: report,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  // Get cost projections
  ipcMain.handle('billing:getProjections', async () => {
    try {
      const projections = billing.getProjections();

      return {
        success: true,
        data: projections,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  // Get billing alerts
  ipcMain.handle('billing:getAlerts', async (_event, unacknowledgedOnly?: boolean) => {
    try {
      const alerts = billing.getAlerts(unacknowledgedOnly ?? false);

      return {
        success: true,
        data: alerts,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  // Acknowledge an alert
  ipcMain.handle('billing:acknowledgeAlert', async (_event, alertId: string) => {
    try {
      const validation = validateWithResponse(alertIdSchema, alertId);
      if (!validation.success) {
        return {
          success: false,
          error: validation.error || 'Invalid alert ID',
        };
      }

      const acknowledged = billing.acknowledgeAlert(alertId);

      return {
        success: true,
        data: { acknowledged },
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  // Export to CSV
  ipcMain.handle('billing:exportCSV', async (_event, periodType?: string) => {
    try {
      const validPeriod = periodTypeSchema.safeParse(periodType);
      const period = validPeriod.success ? validPeriod.data : 'monthly';
      const csv = billing.exportToCSV(period);

      return {
        success: true,
        data: csv,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  // Export to JSON
  ipcMain.handle('billing:exportJSON', async (_event, periodType?: string) => {
    try {
      const validPeriod = periodTypeSchema.safeParse(periodType);
      const period = validPeriod.success ? validPeriod.data : 'monthly';
      const json = billing.exportToJSON(period);

      return {
        success: true,
        data: json,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  // Get ROI summary
  ipcMain.handle('billing:getROI', async () => {
    try {
      const roi = billing.getROISummary();

      return {
        success: true,
        data: roi,
      };
    } catch (err) {
      return {
        success: false,
        error: (err as Error).message,
      };
    }
  });

  // Record project cost
  ipcMain.handle(
    'billing:recordProjectCost',
    async (_event, params: { projectId: string; projectName: string; cost: number; provider: string }) => {
      try {
        const validation = recordCostSchema.safeParse(params);
        if (!validation.success) {
          return {
            success: false,
            error: 'Invalid parameters',
          };
        }

        billing.recordProjectCost(
          params.projectId,
          params.projectName,
          params.cost,
          params.provider
        );

        return {
          success: true,
          data: { recorded: true },
        };
      } catch (err) {
        return {
          success: false,
          error: (err as Error).message,
        };
      }
    }
  );

  console.log('[Billing] IPC handlers registered');
}
