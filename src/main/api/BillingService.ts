/**
 * Enterprise Billing Service - CFO/Accounting Visibility
 *
 * Provides comprehensive cost tracking and reporting for enterprise customers.
 * This is a key selling point for CFOs concerned about unexpected AI costs.
 *
 * Features:
 * - Real-time cost tracking by project, team, and provider
 * - Budget alerts and enforcement
 * - Export to common accounting formats (CSV, JSON)
 * - Historical cost analysis and projections
 * - Per-seat and per-token cost breakdowns
 */

import { getTaskRouter, RoutingStats } from '../ai-core/TaskRouter';
import { AIProvider, AI_PROVIDERS, TaskComplexity } from '../../shared/ai-types';

// ============================================
// TYPES
// ============================================

export interface BillingPeriod {
  startDate: Date;
  endDate: Date;
  totalCost: number;
  totalSavings: number;
  tasksRouted: number;
  breakdown: BillingBreakdown;
}

export interface BillingBreakdown {
  byProvider: Record<string, ProviderCost>;
  byProject: Record<string, ProjectCost>;
  byComplexity: Record<TaskComplexity, number>;
  byDay: DailyCost[];
}

export interface ProviderCost {
  providerId: AIProvider;
  providerName: string;
  totalCost: number;
  taskCount: number;
  tokenCount: number;
  isLocal: boolean;
  savingsVsBaseline: number;
}

export interface ProjectCost {
  projectId: string;
  projectName: string;
  totalCost: number;
  taskCount: number;
  topProvider: string;
  teamId?: string;
  departmentId?: string;
  costCenterId?: string;
}

// ============================================
// ENTERPRISE FEATURES - TEAM/DEPARTMENT ROLLUPS
// ============================================

export interface Team {
  id: string;
  name: string;
  departmentId: string;
  members: string[];
}

export interface Department {
  id: string;
  name: string;
  costCenterId: string;
  teams: string[];
}

export interface CostCenter {
  id: string;
  name: string;
  code: string; // Accounting code (e.g., "CC-ENG-001")
  budget: number;
  owner: string;
}

export interface TeamCostRollup {
  teamId: string;
  teamName: string;
  departmentId: string;
  departmentName: string;
  totalCost: number;
  taskCount: number;
  projectCount: number;
  topProject: string;
  percentOfDepartment: number;
}

export interface DepartmentCostRollup {
  departmentId: string;
  departmentName: string;
  costCenterId: string;
  costCenterCode: string;
  totalCost: number;
  taskCount: number;
  teamCount: number;
  projectCount: number;
  topTeam: string;
  budgetUsed: number;
  budgetRemaining: number;
  percentOfBudget: number;
}

// ============================================
// BUDGET ALERTS - SLACK/EMAIL NOTIFICATIONS
// ============================================

export interface BudgetAlertConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: 'daily' | 'weekly' | 'monthly' | 'project' | 'team' | 'department';
  threshold: number; // Dollar amount or percentage
  thresholdType: 'absolute' | 'percent';
  targetId?: string; // Project/team/department ID for scoped alerts
  channels: NotificationChannel[];
  lastTriggered?: Date;
  cooldownMinutes: number; // Don't re-trigger within this period
}

export interface NotificationChannel {
  type: 'slack' | 'email' | 'webhook' | 'in-app';
  config: SlackConfig | EmailConfig | WebhookConfig;
}

export interface SlackConfig {
  webhookUrl: string;
  channel?: string;
  mentionUsers?: string[]; // @user mentions
}

export interface EmailConfig {
  recipients: string[];
  ccRecipients?: string[];
  subject?: string;
}

export interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT';
  headers?: Record<string, string>;
}

export interface BudgetAlertEvent {
  alertConfigId: string;
  triggeredAt: Date;
  alertType: string;
  currentSpend: number;
  threshold: number;
  targetName: string;
  message: string;
  notificationsSent: {
    channel: string;
    success: boolean;
    error?: string;
  }[];
}

// ============================================
// CHARGEBACK REPORTS - COST CENTER BILLING
// ============================================

export interface ChargebackReport {
  reportId: string;
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  periodType: 'monthly' | 'quarterly' | 'annual';
  totalCost: number;
  lineItems: ChargebackLineItem[];
  summary: ChargebackSummary;
  approvalStatus: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: Date;
}

export interface ChargebackLineItem {
  costCenterId: string;
  costCenterCode: string;
  costCenterName: string;
  departmentName: string;
  amount: number;
  taskCount: number;
  projectBreakdown: {
    projectId: string;
    projectName: string;
    amount: number;
    taskCount: number;
  }[];
  providerBreakdown: {
    provider: string;
    amount: number;
    tokenCount: number;
  }[];
}

export interface ChargebackSummary {
  totalCostCenters: number;
  totalAmount: number;
  largestCostCenter: string;
  largestAmount: number;
  averagePerCostCenter: number;
  periodComparison?: {
    previousPeriodTotal: number;
    changePercent: number;
    trend: 'up' | 'down' | 'stable';
  };
}

// ============================================
// CARBON FOOTPRINT TRACKING
// ============================================

export interface CarbonFootprint {
  periodStart: Date;
  periodEnd: Date;
  totalKgCO2: number;
  totalKWh: number;
  breakdown: CarbonBreakdown;
  equivalents: CarbonEquivalents;
  offsetRecommendations: CarbonOffset[];
}

export interface CarbonBreakdown {
  byProvider: {
    providerId: string;
    providerName: string;
    kgCO2: number;
    kWh: number;
    tokenCount: number;
    isGreenEnergy: boolean;
    dataCenter: string;
    region: string;
  }[];
  byProject: {
    projectId: string;
    projectName: string;
    kgCO2: number;
    kWh: number;
  }[];
  byComplexity: Record<TaskComplexity, { kgCO2: number; kWh: number }>;
}

export interface CarbonEquivalents {
  carMiles: number; // Equivalent car miles driven
  treesNeeded: number; // Trees needed to offset for a year
  homeElectricityDays: number; // Days of average home electricity
  flightsNYtoLA: number; // Equivalent flights
  smartphoneCharges: number; // Number of smartphone charges
}

export interface CarbonOffset {
  provider: string;
  projectName: string;
  costPerTon: number;
  estimatedCost: number;
  url: string;
  certification: string; // e.g., "Gold Standard", "Verra VCS"
}

export interface DailyCost {
  date: string; // ISO date string (YYYY-MM-DD)
  cost: number;
  tasks: number;
  savings: number;
}

export interface BillingReport {
  generatedAt: Date;
  period: {
    start: string;
    end: string;
    type: 'daily' | 'weekly' | 'monthly' | 'custom';
  };
  summary: {
    totalSpend: number;
    totalSavings: number;
    savingsPercent: number;
    tasksCompleted: number;
    avgCostPerTask: number;
    projectedMonthly: number;
  };
  breakdown: BillingBreakdown;
  budgetStatus: {
    dailyLimit?: number;
    dailyUsed: number;
    dailyRemaining: number;
    monthlyLimit?: number;
    monthlyUsed: number;
    monthlyRemaining: number;
    overBudget: boolean;
    warningThreshold: number;
    atWarning: boolean;
  };
  trends: {
    costTrend: 'increasing' | 'stable' | 'decreasing';
    savingsTrend: 'improving' | 'stable' | 'declining';
    topSavingsOpportunities: string[];
  };
}

export interface BillingAlert {
  id: string;
  type: 'budget_warning' | 'budget_exceeded' | 'unusual_spend' | 'savings_opportunity';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  createdAt: Date;
  acknowledged: boolean;
  metadata?: Record<string, unknown>;
}

export interface CostProjection {
  period: 'week' | 'month' | 'quarter' | 'year';
  projectedCost: number;
  projectedSavings: number;
  confidence: number;
  basedOnDays: number;
}

// ============================================
// BILLING SERVICE
// ============================================

export class BillingService {
  private costHistory: DailyCost[] = [];
  private alerts: BillingAlert[] = [];
  private projectCosts: Map<string, ProjectCost> = new Map();
  private sessionStartDate: Date;

  constructor() {
    this.sessionStartDate = new Date();
    this.initializeDemoData();
  }

  // ============================================
  // PUBLIC API
  // ============================================

  /**
   * Get current billing report
   */
  getReport(periodType: 'daily' | 'weekly' | 'monthly' = 'monthly'): BillingReport {
    const router = getTaskRouter();
    const stats = router.getStats();
    const settings = router.getSettings();
    const budgetStatus = router.checkBudget();

    const now = new Date();
    const periodStart = this.getPeriodStart(periodType, now);

    // Calculate summary
    const avgCostPerTask = stats.totalTasksRouted > 0
      ? stats.totalCostActual / stats.totalTasksRouted
      : 0;

    const daysInPeriod = Math.max(1, this.getDaysBetween(periodStart, now));
    const dailyAvg = stats.totalCostActual / daysInPeriod;
    const projectedMonthly = dailyAvg * 30;

    return {
      generatedAt: now,
      period: {
        start: periodStart.toISOString(),
        end: now.toISOString(),
        type: periodType,
      },
      summary: {
        totalSpend: stats.totalCostActual,
        totalSavings: stats.totalSavings,
        savingsPercent: stats.savingsPercent,
        tasksCompleted: stats.totalTasksRouted,
        avgCostPerTask,
        projectedMonthly,
      },
      breakdown: this.getBreakdown(stats),
      budgetStatus: {
        dailyLimit: settings.dailyBudget,
        dailyUsed: stats.todayCost,
        dailyRemaining: settings.dailyBudget ? settings.dailyBudget - stats.todayCost : Infinity,
        monthlyLimit: settings.monthlyBudget,
        monthlyUsed: stats.monthCost,
        monthlyRemaining: settings.monthlyBudget ? settings.monthlyBudget - stats.monthCost : Infinity,
        overBudget: budgetStatus.overDaily || budgetStatus.overMonthly,
        warningThreshold: settings.warnAtPercent || 80,
        atWarning: budgetStatus.shouldWarn,
      },
      trends: this.analyzeTrends(stats),
    };
  }

  /**
   * Get cost projections
   */
  getProjections(): CostProjection[] {
    const router = getTaskRouter();
    const stats = router.getStats();

    const daysSinceStart = Math.max(1, this.getDaysSinceStart());
    const dailyAvg = stats.totalCostActual / daysSinceStart;
    const dailySavings = stats.totalSavings / daysSinceStart;

    return [
      {
        period: 'week',
        projectedCost: dailyAvg * 7,
        projectedSavings: dailySavings * 7,
        confidence: Math.min(0.9, daysSinceStart / 7),
        basedOnDays: daysSinceStart,
      },
      {
        period: 'month',
        projectedCost: dailyAvg * 30,
        projectedSavings: dailySavings * 30,
        confidence: Math.min(0.85, daysSinceStart / 30),
        basedOnDays: daysSinceStart,
      },
      {
        period: 'quarter',
        projectedCost: dailyAvg * 90,
        projectedSavings: dailySavings * 90,
        confidence: Math.min(0.75, daysSinceStart / 90),
        basedOnDays: daysSinceStart,
      },
      {
        period: 'year',
        projectedCost: dailyAvg * 365,
        projectedSavings: dailySavings * 365,
        confidence: Math.min(0.6, daysSinceStart / 365),
        basedOnDays: daysSinceStart,
      },
    ];
  }

  /**
   * Get active alerts
   */
  getAlerts(unacknowledgedOnly = false): BillingAlert[] {
    this.checkForNewAlerts();
    if (unacknowledgedOnly) {
      return this.alerts.filter(a => !a.acknowledged);
    }
    return this.alerts;
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  /**
   * Export billing data to CSV format
   */
  exportToCSV(periodType: 'daily' | 'weekly' | 'monthly' = 'monthly'): string {
    const report = this.getReport(periodType);
    const lines: string[] = [];

    // Header
    lines.push('Flowrider AI Cost Report');
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push(`Period: ${report.period.start} to ${report.period.end}`);
    lines.push('');

    // Summary
    lines.push('SUMMARY');
    lines.push('Metric,Value');
    lines.push(`Total Spend,$${report.summary.totalSpend.toFixed(2)}`);
    lines.push(`Total Savings,$${report.summary.totalSavings.toFixed(2)}`);
    lines.push(`Savings Percent,${report.summary.savingsPercent.toFixed(1)}%`);
    lines.push(`Tasks Completed,${report.summary.tasksCompleted}`);
    lines.push(`Avg Cost Per Task,$${report.summary.avgCostPerTask.toFixed(4)}`);
    lines.push(`Projected Monthly,$${report.summary.projectedMonthly.toFixed(2)}`);
    lines.push('');

    // Provider breakdown
    lines.push('COST BY PROVIDER');
    lines.push('Provider,Cost,Tasks,Local,Savings vs Baseline');
    for (const [providerId, cost] of Object.entries(report.breakdown.byProvider)) {
      lines.push(
        `${cost.providerName},$${cost.totalCost.toFixed(2)},${cost.taskCount},${cost.isLocal ? 'Yes' : 'No'},$${cost.savingsVsBaseline.toFixed(2)}`
      );
    }
    lines.push('');

    // Complexity breakdown
    lines.push('COST BY COMPLEXITY');
    lines.push('Complexity,Cost');
    for (const [complexity, cost] of Object.entries(report.breakdown.byComplexity)) {
      lines.push(`${complexity},$${(cost as number).toFixed(2)}`);
    }
    lines.push('');

    // Budget status
    lines.push('BUDGET STATUS');
    lines.push(`Daily Used,$${report.budgetStatus.dailyUsed.toFixed(2)}`);
    if (report.budgetStatus.dailyLimit) {
      lines.push(`Daily Limit,$${report.budgetStatus.dailyLimit.toFixed(2)}`);
    }
    lines.push(`Monthly Used,$${report.budgetStatus.monthlyUsed.toFixed(2)}`);
    if (report.budgetStatus.monthlyLimit) {
      lines.push(`Monthly Limit,$${report.budgetStatus.monthlyLimit.toFixed(2)}`);
    }
    lines.push(`Over Budget,${report.budgetStatus.overBudget ? 'Yes' : 'No'}`);

    return lines.join('\n');
  }

  /**
   * Export billing data to JSON format for API consumers
   */
  exportToJSON(periodType: 'daily' | 'weekly' | 'monthly' = 'monthly'): string {
    const report = this.getReport(periodType);
    const projections = this.getProjections();
    const alerts = this.getAlerts();

    return JSON.stringify({
      report,
      projections,
      alerts,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    }, null, 2);
  }

  /**
   * Record project cost (called when a task is executed)
   */
  recordProjectCost(projectId: string, projectName: string, cost: number, provider: string): void {
    const existing = this.projectCosts.get(projectId);
    if (existing) {
      existing.totalCost += cost;
      existing.taskCount += 1;
    } else {
      this.projectCosts.set(projectId, {
        projectId,
        projectName,
        totalCost: cost,
        taskCount: 1,
        topProvider: provider,
      });
    }
  }

  /**
   * Get ROI summary - key metric for CFOs
   */
  getROISummary(): {
    invested: number;
    saved: number;
    roi: number;
    breakEvenTasks: number;
    tasksCompleted: number;
    netBenefit: number;
  } {
    const router = getTaskRouter();
    const stats = router.getStats();

    // Assume subscription cost (can be configurable)
    const monthlySubscription = 49; // Pro tier
    const daysActive = Math.max(1, this.getDaysSinceStart());
    const proratedInvestment = (monthlySubscription / 30) * daysActive;

    const roi = proratedInvestment > 0
      ? ((stats.totalSavings - proratedInvestment) / proratedInvestment) * 100
      : 0;

    // Calculate break-even: how many tasks before subscription pays for itself
    const avgSavingsPerTask = stats.totalTasksRouted > 0
      ? stats.totalSavings / stats.totalTasksRouted
      : 0;
    const breakEvenTasks = avgSavingsPerTask > 0
      ? Math.ceil(monthlySubscription / avgSavingsPerTask)
      : Infinity;

    return {
      invested: proratedInvestment,
      saved: stats.totalSavings,
      roi,
      breakEvenTasks,
      tasksCompleted: stats.totalTasksRouted,
      netBenefit: stats.totalSavings - proratedInvestment,
    };
  }

  // ============================================
  // ENTERPRISE: TEAM/DEPARTMENT ROLLUPS
  // ============================================

  private teams: Map<string, Team> = new Map();
  private departments: Map<string, Department> = new Map();
  private costCenters: Map<string, CostCenter> = new Map();
  private budgetAlertConfigs: Map<string, BudgetAlertConfig> = new Map();
  private alertHistory: BudgetAlertEvent[] = [];

  /**
   * Get cost rollup by team
   */
  getTeamCostRollups(): TeamCostRollup[] {
    const rollups: TeamCostRollup[] = [];

    // Group project costs by team
    const teamCosts = new Map<string, { cost: number; tasks: number; projects: Set<string> }>();
    const deptTotals = new Map<string, number>();

    for (const [, project] of this.projectCosts) {
      const teamId = project.teamId || 'unassigned';
      if (!teamCosts.has(teamId)) {
        teamCosts.set(teamId, { cost: 0, tasks: 0, projects: new Set() });
      }
      const teamData = teamCosts.get(teamId)!;
      teamData.cost += project.totalCost;
      teamData.tasks += project.taskCount;
      teamData.projects.add(project.projectId);

      // Track department totals
      const deptId = project.departmentId || 'unassigned';
      deptTotals.set(deptId, (deptTotals.get(deptId) || 0) + project.totalCost);
    }

    for (const [teamId, data] of teamCosts) {
      const team = this.teams.get(teamId);
      const dept = team ? this.departments.get(team.departmentId) : null;
      const deptTotal = deptTotals.get(dept?.id || 'unassigned') || 1;

      rollups.push({
        teamId,
        teamName: team?.name || 'Unassigned',
        departmentId: dept?.id || 'unassigned',
        departmentName: dept?.name || 'Unassigned',
        totalCost: data.cost,
        taskCount: data.tasks,
        projectCount: data.projects.size,
        topProject: Array.from(data.projects)[0] || '',
        percentOfDepartment: (data.cost / deptTotal) * 100,
      });
    }

    return rollups.sort((a, b) => b.totalCost - a.totalCost);
  }

  /**
   * Get cost rollup by department - "Marketing spent $X, Engineering spent $Y"
   */
  getDepartmentCostRollups(): DepartmentCostRollup[] {
    const rollups: DepartmentCostRollup[] = [];

    // Group costs by department
    const deptData = new Map<string, {
      cost: number;
      tasks: number;
      teams: Set<string>;
      projects: Set<string>;
      teamCosts: Map<string, number>;
    }>();

    for (const [, project] of this.projectCosts) {
      const deptId = project.departmentId || 'unassigned';
      if (!deptData.has(deptId)) {
        deptData.set(deptId, {
          cost: 0,
          tasks: 0,
          teams: new Set(),
          projects: new Set(),
          teamCosts: new Map(),
        });
      }
      const data = deptData.get(deptId)!;
      data.cost += project.totalCost;
      data.tasks += project.taskCount;
      data.projects.add(project.projectId);
      if (project.teamId) {
        data.teams.add(project.teamId);
        data.teamCosts.set(
          project.teamId,
          (data.teamCosts.get(project.teamId) || 0) + project.totalCost
        );
      }
    }

    for (const [deptId, data] of deptData) {
      const dept = this.departments.get(deptId);
      const costCenter = dept ? this.costCenters.get(dept.costCenterId) : null;
      const budget = costCenter?.budget || 0;

      // Find top team
      let topTeam = '';
      let topTeamCost = 0;
      for (const [teamId, cost] of data.teamCosts) {
        if (cost > topTeamCost) {
          topTeamCost = cost;
          topTeam = this.teams.get(teamId)?.name || teamId;
        }
      }

      rollups.push({
        departmentId: deptId,
        departmentName: dept?.name || 'Unassigned',
        costCenterId: costCenter?.id || '',
        costCenterCode: costCenter?.code || '',
        totalCost: data.cost,
        taskCount: data.tasks,
        teamCount: data.teams.size,
        projectCount: data.projects.size,
        topTeam,
        budgetUsed: data.cost,
        budgetRemaining: budget > 0 ? budget - data.cost : Infinity,
        percentOfBudget: budget > 0 ? (data.cost / budget) * 100 : 0,
      });
    }

    return rollups.sort((a, b) => b.totalCost - a.totalCost);
  }

  /**
   * Configure a team
   */
  configureTeam(team: Team): void {
    this.teams.set(team.id, team);
  }

  /**
   * Configure a department
   */
  configureDepartment(department: Department): void {
    this.departments.set(department.id, department);
  }

  /**
   * Configure a cost center
   */
  configureCostCenter(costCenter: CostCenter): void {
    this.costCenters.set(costCenter.id, costCenter);
  }

  // ============================================
  // ENTERPRISE: BUDGET ALERTS (SLACK/EMAIL)
  // ============================================

  /**
   * Configure a budget alert
   */
  configureBudgetAlert(config: BudgetAlertConfig): void {
    this.budgetAlertConfigs.set(config.id, config);
  }

  /**
   * Get all budget alert configurations
   */
  getBudgetAlertConfigs(): BudgetAlertConfig[] {
    return Array.from(this.budgetAlertConfigs.values());
  }

  /**
   * Delete a budget alert configuration
   */
  deleteBudgetAlert(alertId: string): boolean {
    return this.budgetAlertConfigs.delete(alertId);
  }

  /**
   * Check and trigger budget alerts
   */
  async checkBudgetAlerts(): Promise<BudgetAlertEvent[]> {
    const triggered: BudgetAlertEvent[] = [];
    const router = getTaskRouter();
    const stats = router.getStats();

    for (const [, config] of this.budgetAlertConfigs) {
      if (!config.enabled) continue;

      // Check cooldown
      if (config.lastTriggered) {
        const cooldownMs = config.cooldownMinutes * 60 * 1000;
        if (Date.now() - config.lastTriggered.getTime() < cooldownMs) continue;
      }

      let currentSpend = 0;
      let targetName = '';

      switch (config.type) {
        case 'daily':
          currentSpend = stats.todayCost;
          targetName = 'Daily Budget';
          break;
        case 'monthly':
          currentSpend = stats.monthCost;
          targetName = 'Monthly Budget';
          break;
        case 'project':
          const project = this.projectCosts.get(config.targetId || '');
          currentSpend = project?.totalCost || 0;
          targetName = project?.projectName || 'Unknown Project';
          break;
        case 'team':
          const teamRollups = this.getTeamCostRollups();
          const teamRollup = teamRollups.find(t => t.teamId === config.targetId);
          currentSpend = teamRollup?.totalCost || 0;
          targetName = teamRollup?.teamName || 'Unknown Team';
          break;
        case 'department':
          const deptRollups = this.getDepartmentCostRollups();
          const deptRollup = deptRollups.find(d => d.departmentId === config.targetId);
          currentSpend = deptRollup?.totalCost || 0;
          targetName = deptRollup?.departmentName || 'Unknown Department';
          break;
      }

      // Check threshold
      const thresholdReached = config.thresholdType === 'absolute'
        ? currentSpend >= config.threshold
        : currentSpend >= (config.threshold / 100) * this.getTargetBudget(config);

      if (thresholdReached) {
        const event = await this.triggerBudgetAlert(config, currentSpend, targetName);
        triggered.push(event);
        config.lastTriggered = new Date();
      }
    }

    return triggered;
  }

  private getTargetBudget(config: BudgetAlertConfig): number {
    const router = getTaskRouter();
    const settings = router.getSettings();

    switch (config.type) {
      case 'daily':
        return settings.dailyBudget || 100;
      case 'monthly':
        return settings.monthlyBudget || 3000;
      case 'department':
        const dept = this.departments.get(config.targetId || '');
        const cc = dept ? this.costCenters.get(dept.costCenterId) : null;
        return cc?.budget || 1000;
      default:
        return 1000;
    }
  }

  private async triggerBudgetAlert(
    config: BudgetAlertConfig,
    currentSpend: number,
    targetName: string
  ): Promise<BudgetAlertEvent> {
    const message = `Budget alert: ${targetName} has reached $${currentSpend.toFixed(2)} ` +
      `(threshold: ${config.thresholdType === 'absolute' ? '$' + config.threshold : config.threshold + '%'})`;

    const event: BudgetAlertEvent = {
      alertConfigId: config.id,
      triggeredAt: new Date(),
      alertType: config.type,
      currentSpend,
      threshold: config.threshold,
      targetName,
      message,
      notificationsSent: [],
    };

    // Send notifications
    for (const channel of config.channels) {
      try {
        await this.sendNotification(channel, message, config, currentSpend);
        event.notificationsSent.push({ channel: channel.type, success: true });
      } catch (err) {
        event.notificationsSent.push({
          channel: channel.type,
          success: false,
          error: (err as Error).message,
        });
      }
    }

    this.alertHistory.push(event);
    return event;
  }

  private async sendNotification(
    channel: NotificationChannel,
    message: string,
    config: BudgetAlertConfig,
    currentSpend: number
  ): Promise<void> {
    switch (channel.type) {
      case 'slack':
        await this.sendSlackNotification(channel.config as SlackConfig, message, currentSpend);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel.config as WebhookConfig, message, config, currentSpend);
        break;
      case 'in-app':
        // Create an in-app alert
        this.alerts.push({
          id: `budget-alert-${Date.now()}`,
          type: 'budget_warning',
          severity: 'warning',
          message,
          createdAt: new Date(),
          acknowledged: false,
          metadata: { configId: config.id, currentSpend },
        });
        break;
      case 'email':
        // Email would require SMTP setup - log for now
        console.log(`[Billing] Email notification: ${message}`);
        break;
    }
  }

  private async sendSlackNotification(
    config: SlackConfig,
    message: string,
    currentSpend: number
  ): Promise<void> {
    const payload = {
      channel: config.channel,
      text: message,
      attachments: [{
        color: currentSpend > 1000 ? 'danger' : 'warning',
        fields: [
          { title: 'Current Spend', value: `$${currentSpend.toFixed(2)}`, short: true },
          { title: 'Time', value: new Date().toISOString(), short: true },
        ],
      }],
    };

    const https = await import('https');
    const url = new URL(config.webhookUrl);

    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }, (res) => {
        if (res.statusCode === 200) resolve();
        else reject(new Error(`Slack returned ${res.statusCode}`));
      });
      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    });
  }

  private async sendWebhookNotification(
    config: WebhookConfig,
    message: string,
    alertConfig: BudgetAlertConfig,
    currentSpend: number
  ): Promise<void> {
    const payload = {
      event: 'budget_alert',
      message,
      alertType: alertConfig.type,
      threshold: alertConfig.threshold,
      currentSpend,
      timestamp: new Date().toISOString(),
    };

    const https = await import('https');
    const http = await import('http');
    const url = new URL(config.url);
    const transport = url.protocol === 'https:' ? https : http;

    return new Promise((resolve, reject) => {
      const req = transport.request({
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: config.method,
        headers: {
          'Content-Type': 'application/json',
          ...config.headers,
        },
      }, (res) => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`Webhook returned ${res.statusCode}`));
      });
      req.on('error', reject);
      req.write(JSON.stringify(payload));
      req.end();
    });
  }

  // ============================================
  // ENTERPRISE: CHARGEBACK REPORTS
  // ============================================

  /**
   * Generate a chargeback report for billing cost centers
   */
  generateChargebackReport(
    periodType: 'monthly' | 'quarterly' | 'annual' = 'monthly'
  ): ChargebackReport {
    const now = new Date();
    const periodStart = this.getChargebackPeriodStart(periodType, now);

    // Build line items by cost center
    const lineItemsMap = new Map<string, ChargebackLineItem>();
    const router = getTaskRouter();
    const stats = router.getStats();

    for (const [, project] of this.projectCosts) {
      const costCenterId = project.costCenterId || 'unassigned';
      const costCenter = this.costCenters.get(costCenterId);
      const dept = project.departmentId ? this.departments.get(project.departmentId) : null;

      if (!lineItemsMap.has(costCenterId)) {
        lineItemsMap.set(costCenterId, {
          costCenterId,
          costCenterCode: costCenter?.code || 'N/A',
          costCenterName: costCenter?.name || 'Unassigned',
          departmentName: dept?.name || 'Unassigned',
          amount: 0,
          taskCount: 0,
          projectBreakdown: [],
          providerBreakdown: [],
        });
      }

      const lineItem = lineItemsMap.get(costCenterId)!;
      lineItem.amount += project.totalCost;
      lineItem.taskCount += project.taskCount;
      lineItem.projectBreakdown.push({
        projectId: project.projectId,
        projectName: project.projectName,
        amount: project.totalCost,
        taskCount: project.taskCount,
      });
    }

    // Add provider breakdown to each line item
    for (const [, lineItem] of lineItemsMap) {
      for (const [providerId, count] of Object.entries(stats.routingsByProvider)) {
        const provider = AI_PROVIDERS.find(p => p.id === providerId);
        if (provider) {
          const avgTokens = 2000;
          const cost = provider.isLocal ? 0 : (avgTokens * provider.costPerMToken) / 1_000_000 * count;
          // Proportionally allocate to this cost center
          const proportion = lineItem.amount / stats.totalCostActual || 0;
          lineItem.providerBreakdown.push({
            provider: provider.name,
            amount: cost * proportion,
            tokenCount: avgTokens * count * proportion,
          });
        }
      }
    }

    const lineItems = Array.from(lineItemsMap.values());
    const totalAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);

    // Find largest cost center
    const sorted = [...lineItems].sort((a, b) => b.amount - a.amount);

    return {
      reportId: `chargeback-${Date.now()}`,
      generatedAt: now,
      periodStart,
      periodEnd: now,
      periodType,
      totalCost: totalAmount,
      lineItems,
      summary: {
        totalCostCenters: lineItems.length,
        totalAmount,
        largestCostCenter: sorted[0]?.costCenterName || 'N/A',
        largestAmount: sorted[0]?.amount || 0,
        averagePerCostCenter: lineItems.length > 0 ? totalAmount / lineItems.length : 0,
      },
      approvalStatus: 'draft',
    };
  }

  private getChargebackPeriodStart(
    periodType: 'monthly' | 'quarterly' | 'annual',
    now: Date
  ): Date {
    const start = new Date(now);
    switch (periodType) {
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'annual':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return start;
  }

  /**
   * Export chargeback report as CSV for accounting systems
   */
  exportChargebackCSV(report: ChargebackReport): string {
    const lines: string[] = [];

    lines.push('Cost Center Chargeback Report');
    lines.push(`Report ID: ${report.reportId}`);
    lines.push(`Period: ${report.periodStart.toISOString()} to ${report.periodEnd.toISOString()}`);
    lines.push(`Generated: ${report.generatedAt.toISOString()}`);
    lines.push('');
    lines.push('Cost Center Code,Cost Center Name,Department,Amount,Task Count');

    for (const lineItem of report.lineItems) {
      lines.push(
        `${lineItem.costCenterCode},${lineItem.costCenterName},${lineItem.departmentName},$${lineItem.amount.toFixed(2)},${lineItem.taskCount}`
      );
    }

    lines.push('');
    lines.push(`TOTAL,,$${report.totalCost.toFixed(2)}`);

    return lines.join('\n');
  }

  // ============================================
  // ENTERPRISE: CARBON FOOTPRINT TRACKING
  // ============================================

  /**
   * Calculate carbon footprint for AI usage
   * Uses wattsPerMToken data from AI_PROVIDERS
   */
  getCarbonFootprint(periodType: 'daily' | 'weekly' | 'monthly' = 'monthly'): CarbonFootprint {
    const now = new Date();
    const periodStart = this.getPeriodStart(periodType, now);
    const router = getTaskRouter();
    const stats = router.getStats();

    // Carbon intensity factors (kg CO2 per kWh)
    const carbonIntensity: Record<string, number> = {
      'us-west': 0.35,      // California - cleaner grid
      'us-east': 0.45,      // Virginia - more coal
      'eu-west': 0.30,      // Ireland/Germany - renewable focus
      'eu-north': 0.05,     // Sweden/Norway - hydro
      'asia-pac': 0.70,     // Mixed, often coal-heavy
      'local': 0.40,        // Average US grid
    };

    let totalKWh = 0;
    let totalKgCO2 = 0;

    const byProvider: CarbonBreakdown['byProvider'] = [];
    const byComplexity: Record<TaskComplexity, { kgCO2: number; kWh: number }> = {
      simple: { kgCO2: 0, kWh: 0 },
      medium: { kgCO2: 0, kWh: 0 },
      complex: { kgCO2: 0, kWh: 0 },
      expert: { kgCO2: 0, kWh: 0 },
    };

    // Calculate per provider
    for (const [providerId, count] of Object.entries(stats.routingsByProvider)) {
      const provider = AI_PROVIDERS.find(p => p.id === providerId);
      if (!provider) continue;

      const avgTokens = 2000;
      const totalTokens = avgTokens * count;
      const wattsPerMToken = provider.wattsPerMToken || 50; // Default estimate

      // Energy: W * seconds = Joules, convert to kWh
      // Assume ~1 second per 1000 tokens for inference
      const inferenceSeconds = totalTokens / 1000;
      const wattsUsed = (wattsPerMToken / 1_000_000) * totalTokens;
      const kWh = (wattsUsed * inferenceSeconds) / 3600;

      // Determine region and carbon intensity
      const region = provider.isLocal ? 'local' : 'us-west'; // Simplified
      const intensity = carbonIntensity[region] || 0.40;
      const kgCO2 = kWh * intensity;

      totalKWh += kWh;
      totalKgCO2 += kgCO2;

      byProvider.push({
        providerId: provider.id,
        providerName: provider.name,
        kgCO2,
        kWh,
        tokenCount: totalTokens,
        isGreenEnergy: ['eu-north', 'eu-west'].includes(region),
        dataCenter: provider.isLocal ? 'Local Machine' : 'Cloud',
        region,
      });
    }

    // Calculate by complexity
    const tokensByComplexity = { simple: 500, medium: 2000, complex: 5000, expert: 10000 };
    for (const [complexity, count] of Object.entries(stats.routingsByComplexity)) {
      const tokens = tokensByComplexity[complexity as TaskComplexity] || 2000;
      const totalTokens = tokens * count;
      const kWh = (50 / 1_000_000 * totalTokens * (totalTokens / 1000)) / 3600;
      const kgCO2 = kWh * 0.40;
      byComplexity[complexity as TaskComplexity] = { kgCO2, kWh };
    }

    // Calculate equivalents
    const equivalents: CarbonEquivalents = {
      carMiles: totalKgCO2 / 0.404, // ~0.404 kg CO2 per mile
      treesNeeded: totalKgCO2 / 21, // ~21 kg CO2 per tree per year
      homeElectricityDays: totalKWh / 30, // ~30 kWh per day average
      flightsNYtoLA: totalKgCO2 / 650, // ~650 kg CO2 per flight
      smartphoneCharges: totalKWh / 0.012, // ~0.012 kWh per charge
    };

    // Offset recommendations
    const offsetRecommendations: CarbonOffset[] = [
      {
        provider: 'Gold Standard',
        projectName: 'Wind Power in India',
        costPerTon: 15,
        estimatedCost: (totalKgCO2 / 1000) * 15,
        url: 'https://www.goldstandard.org/',
        certification: 'Gold Standard',
      },
      {
        provider: 'Verra',
        projectName: 'Amazon Rainforest Protection',
        costPerTon: 12,
        estimatedCost: (totalKgCO2 / 1000) * 12,
        url: 'https://verra.org/',
        certification: 'Verra VCS',
      },
    ];

    return {
      periodStart,
      periodEnd: now,
      totalKgCO2,
      totalKWh,
      breakdown: {
        byProvider,
        byProject: [], // Would need to track per-project carbon
        byComplexity,
      },
      equivalents,
      offsetRecommendations,
    };
  }

  /**
   * Get carbon metrics summary
   */
  getCarbonSummary(): {
    totalKgCO2: number;
    treesNeeded: number;
    greenEnergyPercent: number;
    offsetCost: number;
  } {
    const footprint = this.getCarbonFootprint('monthly');

    const greenEnergy = footprint.breakdown.byProvider
      .filter(p => p.isGreenEnergy)
      .reduce((sum, p) => sum + p.kWh, 0);

    const greenEnergyPercent = footprint.totalKWh > 0
      ? (greenEnergy / footprint.totalKWh) * 100
      : 0;

    return {
      totalKgCO2: footprint.totalKgCO2,
      treesNeeded: footprint.equivalents.treesNeeded,
      greenEnergyPercent,
      offsetCost: footprint.offsetRecommendations[0]?.estimatedCost || 0,
    };
  }

  // ============================================
  // PRIVATE METHODS
  // ============================================

  private getPeriodStart(periodType: 'daily' | 'weekly' | 'monthly', now: Date): Date {
    const start = new Date(now);
    switch (periodType) {
      case 'daily':
        start.setHours(0, 0, 0, 0);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
    }
    return start;
  }

  private getDaysBetween(start: Date, end: Date): number {
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((end.getTime() - start.getTime()) / msPerDay);
  }

  private getDaysSinceStart(): number {
    return this.getDaysBetween(this.sessionStartDate, new Date());
  }

  private getBreakdown(stats: RoutingStats): BillingBreakdown {
    const byProvider: Record<string, ProviderCost> = {};

    // Build provider costs from stats
    for (const [providerId, count] of Object.entries(stats.routingsByProvider)) {
      const provider = AI_PROVIDERS.find(p => p.id === providerId);
      if (provider) {
        // Estimate cost based on provider's rate
        const avgTokens = 2000; // Estimated average tokens per task
        const cost = provider.isLocal ? 0 : (avgTokens * provider.costPerMToken) / 1_000_000 * count;
        const baselineCost = (avgTokens * 15) / 1_000_000 * count; // Claude baseline

        byProvider[providerId] = {
          providerId: providerId as AIProvider,
          providerName: provider.name,
          totalCost: cost,
          taskCount: count,
          tokenCount: avgTokens * count,
          isLocal: provider.isLocal,
          savingsVsBaseline: Math.max(0, baselineCost - cost),
        };
      }
    }

    // Build complexity costs
    const byComplexity: Record<TaskComplexity, number> = {
      simple: 0,
      medium: 0,
      complex: 0,
      expert: 0,
    };

    // Estimate cost by complexity
    const tokensByComplexity = { simple: 500, medium: 2000, complex: 5000, expert: 10000 };
    for (const [complexity, count] of Object.entries(stats.routingsByComplexity)) {
      const tokens = tokensByComplexity[complexity as TaskComplexity] || 2000;
      // Use average cost per token across all providers
      byComplexity[complexity as TaskComplexity] = (tokens * 5 / 1_000_000) * count;
    }

    return {
      byProvider,
      byProject: Object.fromEntries(this.projectCosts),
      byComplexity,
      byDay: this.costHistory,
    };
  }

  private analyzeTrends(stats: RoutingStats): {
    costTrend: 'increasing' | 'stable' | 'decreasing';
    savingsTrend: 'improving' | 'stable' | 'declining';
    topSavingsOpportunities: string[];
  } {
    // Simple trend analysis based on recent history
    const recentDays = this.costHistory.slice(-7);
    let costTrend: 'increasing' | 'stable' | 'decreasing' = 'stable';
    let savingsTrend: 'improving' | 'stable' | 'declining' = 'stable';

    if (recentDays.length >= 3) {
      const firstHalf = recentDays.slice(0, Math.floor(recentDays.length / 2));
      const secondHalf = recentDays.slice(Math.floor(recentDays.length / 2));

      const firstAvg = firstHalf.reduce((sum, d) => sum + d.cost, 0) / firstHalf.length;
      const secondAvg = secondHalf.reduce((sum, d) => sum + d.cost, 0) / secondHalf.length;

      if (secondAvg > firstAvg * 1.1) costTrend = 'increasing';
      else if (secondAvg < firstAvg * 0.9) costTrend = 'decreasing';

      const firstSavings = firstHalf.reduce((sum, d) => sum + d.savings, 0) / firstHalf.length;
      const secondSavings = secondHalf.reduce((sum, d) => sum + d.savings, 0) / secondHalf.length;

      if (secondSavings > firstSavings * 1.1) savingsTrend = 'improving';
      else if (secondSavings < firstSavings * 0.9) savingsTrend = 'declining';
    }

    // Identify savings opportunities
    const opportunities: string[] = [];
    const settings = getTaskRouter().getSettings();

    if (!settings.preferLocalWhenPossible) {
      opportunities.push('Enable local model preference for simple tasks');
    }
    if (stats.routingsByComplexity.expert > stats.totalTasksRouted * 0.3) {
      opportunities.push('Review task patterns - high percentage of expert-level routing');
    }
    if (!settings.dailyBudget) {
      opportunities.push('Set a daily budget to prevent cost overruns');
    }

    return { costTrend, savingsTrend, topSavingsOpportunities: opportunities };
  }

  private checkForNewAlerts(): void {
    const router = getTaskRouter();
    const budgetStatus = router.checkBudget();
    const settings = router.getSettings();

    // Check for budget warnings
    if (budgetStatus.shouldWarn && !budgetStatus.overDaily && !budgetStatus.overMonthly) {
      const existingWarning = this.alerts.find(
        a => a.type === 'budget_warning' && !a.acknowledged
      );
      if (!existingWarning) {
        this.alerts.push({
          id: `alert-${Date.now()}`,
          type: 'budget_warning',
          severity: 'warning',
          message: `Approaching budget limit (${Math.max(budgetStatus.dailyUsedPercent, budgetStatus.monthlyUsedPercent).toFixed(0)}% used)`,
          createdAt: new Date(),
          acknowledged: false,
        });
      }
    }

    // Check for budget exceeded
    if (budgetStatus.overDaily || budgetStatus.overMonthly) {
      const existingExceeded = this.alerts.find(
        a => a.type === 'budget_exceeded' && !a.acknowledged
      );
      if (!existingExceeded) {
        this.alerts.push({
          id: `alert-${Date.now()}`,
          type: 'budget_exceeded',
          severity: 'critical',
          message: budgetStatus.overDaily
            ? 'Daily budget exceeded!'
            : 'Monthly budget exceeded!',
          createdAt: new Date(),
          acknowledged: false,
          metadata: {
            dailyUsed: router.getStats().todayCost,
            monthlyUsed: router.getStats().monthCost,
            dailyLimit: settings.dailyBudget,
            monthlyLimit: settings.monthlyBudget,
          },
        });
      }
    }
  }

  private initializeDemoData(): void {
    // Add some demo cost history for visualization
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const baseCost = Math.random() * 5 + 2;
      const savings = baseCost * (Math.random() * 0.4 + 0.2);
      this.costHistory.push({
        date: date.toISOString().split('T')[0],
        cost: baseCost,
        tasks: Math.floor(Math.random() * 30 + 10),
        savings,
      });
    }
  }
}

// ============================================
// SINGLETON EXPORT
// ============================================

let billingServiceInstance: BillingService | null = null;

export function getBillingService(): BillingService {
  if (!billingServiceInstance) {
    billingServiceInstance = new BillingService();
  }
  return billingServiceInstance;
}

export function initBillingService(): BillingService {
  billingServiceInstance = new BillingService();
  return billingServiceInstance;
}
