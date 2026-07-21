/**
 * ZOIX Skill Tracker IPC Handlers
 * Updated to work with new SkillTracker service API
 */

import { ipcMain } from 'electron';
import { getSkillTracker } from '../ai-core/SkillTracker';

export function registerSkillTrackerHandlers(): void {
  const skillTracker = getSkillTracker();

  console.log('[IPC] ZOIX Skill Tracker handlers registered');

  // Get skill level for a domain
  ipcMain.handle('zoix:getSkillProgress', async (_event, domain: string) => {
    try {
      const level = skillTracker.getSkillLevel(domain);
      const metrics = skillTracker.getSkillMetrics(domain);
      return { success: true, data: { level, ...metrics } };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get skill milestones
  ipcMain.handle('zoix:getSkillMilestones', async (_event, domain?: string) => {
    try {
      const milestones = skillTracker.getMilestones(domain);
      return { success: true, data: milestones };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get weaknesses (areas needing improvement) - using progression analysis
  ipcMain.handle('zoix:getWeaknesses', async () => {
    try {
      const domains = skillTracker.getAllDomains();
      const weaknesses = domains
        .map(domain => {
          const metrics = skillTracker.getSkillMetrics(domain);
          const analysis = skillTracker.getProgressionAnalysis(domain);
          return { domain, metrics, analysis };
        })
        .filter(d => d.metrics && d.metrics.errorsPerHour > 2) // High error rate (more than 2 errors/hour)
        .sort((a, b) => (b.metrics?.errorsPerHour || 0) - (a.metrics?.errorsPerHour || 0))
        .slice(0, 5);
      return { success: true, data: weaknesses };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get strengths (areas of mastery)
  ipcMain.handle('zoix:getStrengths', async () => {
    try {
      const domains = skillTracker.getAllDomains();
      const strengths = domains
        .map(domain => {
          const level = skillTracker.getSkillLevel(domain);
          const metrics = skillTracker.getSkillMetrics(domain);
          return { domain, level, metrics };
        })
        .filter(d => d.level === 'expert' || d.level === 'proficient')
        .slice(0, 5);
      return { success: true, data: strengths };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get time-based comparison - using progression analysis
  ipcMain.handle('zoix:getTimeComparison', async (
    _event,
    domain: string,
    _period: 'week' | 'month' | 'quarter' | 'sixmonths'
  ) => {
    try {
      const analysis = skillTracker.getProgressionAnalysis(domain);
      return { success: true, data: analysis };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get skill trends
  ipcMain.handle('zoix:getSkillTrends', async (_event, domain?: string) => {
    try {
      if (domain) {
        const analysis = skillTracker.getProgressionAnalysis(domain);
        return { success: true, data: analysis };
      }
      const domains = skillTracker.getAllDomains();
      const trends = domains.map(d => ({
        domain: d,
        analysis: skillTracker.getProgressionAnalysis(d),
      }));
      return { success: true, data: trends };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Get recent achievements
  ipcMain.handle('zoix:getRecentAchievements', async (_event, days?: number) => {
    try {
      const achievements = skillTracker.getRecentAchievements(days || 30);
      return { success: true, data: achievements };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });

  // Predict mastery for a domain
  ipcMain.handle('zoix:predictMastery', async (_event, domain: string) => {
    try {
      const prediction = skillTracker.predictMastery(domain);
      return { success: true, data: prediction };
    } catch (error) {
      return { success: false, error: (error as Error).message };
    }
  });
}

export function shutdownSkillTracker(): void {
  // SkillTracker uses singleton pattern, no explicit shutdown needed
}
