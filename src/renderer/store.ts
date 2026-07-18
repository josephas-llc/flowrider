import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export type AIProvider = 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local';

export interface AIProviderConfig {
  id: AIProvider;
  name: string;
  description: string;
  costPerMToken: number; // Cost per million tokens (0 for local)
  wattsPerMToken: number; // Estimated watt-hours per million tokens (energy usage)
  isLocal: boolean;
  apiUrl?: string;
  models: string[];
}

export const AI_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'claude',
    name: 'Claude (Anthropic)',
    description: 'Advanced reasoning, coding, and analysis',
    costPerMToken: 15, // Opus pricing approx
    wattsPerMToken: 0.5, // Large model, datacenter GPU inference
    isLocal: false,
    apiUrl: 'https://api.anthropic.com',
    models: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o and GPT models',
    costPerMToken: 10,
    wattsPerMToken: 0.4, // Large model, datacenter GPU inference
    isLocal: false,
    apiUrl: 'https://api.openai.com',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    description: 'Multimodal AI with long context',
    costPerMToken: 7,
    wattsPerMToken: 0.3, // Google's efficient TPU infrastructure
    isLocal: false,
    apiUrl: 'https://generativelanguage.googleapis.com',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  {
    id: 'grok',
    name: 'Grok (xAI)',
    description: 'Real-time knowledge, witty responses',
    costPerMToken: 5,
    wattsPerMToken: 0.35, // xAI infrastructure
    isLocal: false,
    apiUrl: 'https://api.x.ai',
    models: ['grok-2', 'grok-2-mini'],
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run Llama, Mistral, etc. locally - FREE',
    costPerMToken: 0,
    wattsPerMToken: 0.01, // Local laptop/desktop power only
    isLocal: true,
    apiUrl: 'http://localhost:11434',
    models: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'deepseek-coder'],
  },
  {
    id: 'local',
    name: 'Custom Local LLM',
    description: 'Any local model via API - FREE',
    costPerMToken: 0,
    wattsPerMToken: 0.01, // Local power only
    isLocal: true,
    models: ['custom'],
  },
];

export interface GitHubRepo {
  owner: string;
  repo: string;
  branch: string;
  url: string;
}

export interface Session {
  id: string;
  name: string;
  faceIndex: number;
  tmuxSession?: string;
  status: 'empty' | 'active' | 'attached';
  workingDir: string;
  projectId?: string;
  createdAt: number;
  lastActivity: number;
  notes?: string;
  // GitHub repo info
  gitHubRepo?: GitHubRepo;
  // AI Provider
  aiProvider: AIProvider;
  aiModel?: string;
  // Cost tracking
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  estimatedCost: number;
  // Session metrics
  messageCount: number;
  toolCallCount: number;
  // Tier 2: Activity tracking
  hasRecentActivity?: boolean;
  activityLevel?: 'idle' | 'low' | 'medium' | 'high';
  // Attention indicator - when session needs human input
  needsAttention?: boolean;
  attentionReason?: string; // e.g., "Question asked", "Error occurred", "Approval needed"
  // Tier 3: Arbor pattern - hypothesis branches & linking
  linkedSessions?: string[]; // IDs of related sessions
  hypothesisBranch?: {
    parentSessionId?: string; // Original session this branched from
    branchName: string; // e.g., "approach-a", "approach-b"
    hypothesis: string; // What we're testing
    status: 'exploring' | 'promising' | 'abandoned' | 'merged';
  };
}

export interface Project {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: string;
  sessionIds: string[];
  budget?: number;
  totalCost: number;
  totalTokens: number;
  createdAt: number;
  updatedAt: number;
}

export interface CostMetrics {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCost: number;
  costByProject: Record<string, number>;
  costBySession: Record<string, number>;
  dailyCosts: Array<{ date: string; cost: number; tokens: number }>;
}

export interface EnergyMetrics {
  totalEnergy: number; // Actual Wh consumed based on AI provider used
  baselineEnergy: number; // Wh if we always used most expensive model (Claude Opus)
  energySaved: number; // baselineEnergy - totalEnergy
  energyByProject: Record<string, number>;
  energyBySession: Record<string, number>;
  dailyEnergy: Array<{ date: string; energy: number; tokens: number }>;
}

export interface LeoFlowrider {
  id: string;
  name: string;
  status: 'idle' | 'active' | 'busy' | 'error';
  activeSessions: number;
  totalSessions: number;
  host: string;
  port: number;
  lastPing: number;
  metrics: {
    cpuUsage: number;
    memoryUsage: number;
    uptime: number;
  };
}

export interface LeoState {
  enabled: boolean;
  flowriders: LeoFlowrider[];
  totalCapacity: number; // 20 flowriders × 20 sessions = 400
  activeCapacity: number;
  coordinator: string | null;
}

export interface DashboardMetrics {
  activeSessions: number;
  totalSessions: number;
  activeProjects: number;
  totalCostToday: number;
  totalCostWeek: number;
  totalCostMonth: number;
  tokensToday: number;
  avgSessionDuration: number;
  peakConcurrency: number;
  uptimePercent: number;
}

// ============================================
// STATE INTERFACE
// ============================================

interface FlowriderState {
  // Sessions - 20 faces of the icosahedron
  sessions: Session[];
  selectedFace: number | null;
  attachedSession: string | null;

  // Projects
  projects: Project[];
  selectedProject: string | null;

  // Cost tracking
  costMetrics: CostMetrics;

  // Energy tracking (ESG/sustainability metrics)
  energyMetrics: EnergyMetrics;

  // LEO Mode
  leo: LeoState;

  // Dashboard
  dashboard: DashboardMetrics;
  dashboardView: 'overview' | 'projects' | 'costs' | 'leo' | 'roi' | 'mcp' | 'messaging' | 'activity' | 'providers' | 'leoai' | 'api';

  // UI State
  isCreatingSession: boolean;
  isCreatingProject: boolean;
  showProjectModal: boolean;
  showLeoPanel: boolean;
  error: string | null;
  isFirstRun: boolean;
  setIsFirstRun: (value: boolean) => void;

  // Terminal dimensions - shared between TerminalView and SessionPanel
  terminalDimensions: { cols: number; rows: number };

  // Search/Filter
  searchQuery: string;
  searchFilter: 'all' | 'active' | 'empty' | 'hypothesis';
  setSearchQuery: (query: string) => void;
  setSearchFilter: (filter: 'all' | 'active' | 'empty' | 'hypothesis') => void;

  // Terminal dimension actions
  setTerminalDimensions: (cols: number, rows: number) => void;

  // App Mode
  appMode: 'work' | 'demo';
  setAppMode: (mode: 'work' | 'demo') => void;
  resetDemoData: () => void;

  // Session Actions
  selectFace: (faceIndex: number | null) => void;
  setAttachedSession: (sessionId: string | null) => void;
  updateSession: (faceIndex: number, updates: Partial<Session>) => void;
  setCreating: (creating: boolean) => void;
  setError: (error: string | null) => void;
  addTokenUsage: (faceIndex: number, inputTokens: number, outputTokens: number) => void;
  // Tier 3: Session linking & hypothesis branches
  linkSessions: (faceIndex1: number, faceIndex2: number) => void;
  unlinkSessions: (faceIndex1: number, faceIndex2: number) => void;
  createHypothesisBranch: (sourceFaceIndex: number, targetFaceIndex: number, branchName: string, hypothesis: string) => void;
  updateHypothesisStatus: (faceIndex: number, status: 'exploring' | 'promising' | 'abandoned' | 'merged') => void;
  markSessionActivity: (faceIndex: number) => void;
  setSessionNeedsAttention: (faceIndex: number, needsAttention: boolean, reason?: string) => void;
  clearAllAttention: () => void;

  // Project Actions
  createProject: (name: string, description: string, color: string, icon: string) => void;
  updateProject: (id: string, updates: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  assignSessionToProject: (faceIndex: number, projectId: string | null) => void;
  setSelectedProject: (id: string | null) => void;
  setShowProjectModal: (show: boolean) => void;

  // LEO Actions
  toggleLeoMode: () => void;
  addFlowrider: (flowrider: LeoFlowrider) => void;
  removeFlowrider: (id: string) => void;
  updateFlowrider: (id: string, updates: Partial<LeoFlowrider>) => void;
  setShowLeoPanel: (show: boolean) => void;

  // Dashboard Actions
  setDashboardView: (view: 'overview' | 'projects' | 'costs' | 'leo' | 'roi' | 'mcp' | 'messaging' | 'activity' | 'providers' | 'leoai' | 'api') => void;
  refreshDashboard: () => void;

  // Session Sync
  syncWithTmux: () => Promise<void>;
}

// ============================================
// CONSTANTS
// ============================================

// Claude pricing (per 1M tokens)
const CLAUDE_PRICING = {
  'claude-3-opus': { input: 15.0, output: 75.0 },
  'claude-3-sonnet': { input: 3.0, output: 15.0 },
  'claude-3-haiku': { input: 0.25, output: 1.25 },
  'claude-3.5-sonnet': { input: 3.0, output: 15.0 },
};

const DEFAULT_MODEL = 'claude-3.5-sonnet';

const PROJECT_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
];

const PROJECT_ICONS = ['📁', '🚀', '💡', '🔧', '📊', '🎯', '⚡', '🌟', '🔥', '💎'];

// ============================================
// HELPERS
// ============================================

const calculateCost = (inputTokens: number, outputTokens: number, model = DEFAULT_MODEL): number => {
  const pricing = CLAUDE_PRICING[model as keyof typeof CLAUDE_PRICING] || CLAUDE_PRICING[DEFAULT_MODEL];
  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
};

const initializeSessions = (): Session[] => {
  return Array.from({ length: 20 }, (_, i) => ({
    id: `face-${i}`,
    name: `Session ${i + 1}`,
    faceIndex: i,
    status: 'empty' as const,
    workingDir: '~',
    createdAt: Date.now(),
    lastActivity: Date.now(),
    aiProvider: 'claude' as AIProvider, // Default to Claude
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
    estimatedCost: 0,
    messageCount: 0,
    toolCallCount: 0,
  }));
};

const initializeCostMetrics = (): CostMetrics => ({
  totalInputTokens: 0,
  totalOutputTokens: 0,
  totalTokens: 0,
  totalCost: 0,
  costByProject: {},
  costBySession: {},
  dailyCosts: [],
});

const initializeEnergyMetrics = (): EnergyMetrics => ({
  totalEnergy: 0,
  baselineEnergy: 0,
  energySaved: 0,
  energyByProject: {},
  energyBySession: {},
  dailyEnergy: [],
});

// Baseline watts per M tokens (using largest model - Claude Opus)
const BASELINE_WATTS_PER_MTOKEN = 0.5;

const initializeLeoState = (): LeoState => ({
  enabled: false,
  flowriders: [],
  totalCapacity: 400, // 20 × 20
  activeCapacity: 0,
  coordinator: null,
});

const initializeDashboard = (): DashboardMetrics => ({
  activeSessions: 0,
  totalSessions: 20,
  activeProjects: 0,
  totalCostToday: 0,
  totalCostWeek: 0,
  totalCostMonth: 0,
  tokensToday: 0,
  avgSessionDuration: 0,
  peakConcurrency: 0,
  uptimePercent: 100,
});

// ============================================
// STORE
// ============================================

export const useStore = create<FlowriderState>()(
  persist(
    (set, get) => ({
      // Initial state
      sessions: initializeSessions(),
      selectedFace: null,
      attachedSession: null,
      projects: [],
      selectedProject: null,
      costMetrics: initializeCostMetrics(),
      energyMetrics: initializeEnergyMetrics(),
      leo: initializeLeoState(),
      dashboard: initializeDashboard(),
      dashboardView: 'overview',
      isCreatingSession: false,
      isCreatingProject: false,
      showProjectModal: false,
      showLeoPanel: false,
      error: null,
      isFirstRun: true,
      terminalDimensions: { cols: 80, rows: 24 }, // Default terminal size
      searchQuery: '',
      searchFilter: 'all',
      appMode: 'work',

      // ========== SEARCH/FILTER ACTIONS ==========

      setSearchQuery: (query) => set({ searchQuery: query }),

      setSearchFilter: (filter) => set({ searchFilter: filter }),

      // ========== TERMINAL DIMENSION ACTIONS ==========

      setTerminalDimensions: (cols, rows) => set({ terminalDimensions: { cols, rows } }),

      // ========== APP MODE ACTIONS ==========

      setAppMode: (mode) => set({ appMode: mode }),

      resetDemoData: () =>
        set((state) => ({
          sessions: initializeSessions(),
          costMetrics: initializeCostMetrics(),
          energyMetrics: initializeEnergyMetrics(),
          leo: initializeLeoState(),
          dashboard: initializeDashboard(),
          selectedFace: null,
          attachedSession: null,
          appMode: 'work',
        })),

      // ========== SESSION ACTIONS ==========

      selectFace: (faceIndex) => set({ selectedFace: faceIndex }),

      setAttachedSession: (sessionId) => set({ attachedSession: sessionId }),

      updateSession: (faceIndex, updates) =>
        set((state) => {
          const newSessions = state.sessions.map((s) =>
            s.faceIndex === faceIndex ? { ...s, ...updates, lastActivity: Date.now() } : s
          );
          // Update dashboard metrics
          const activeSessions = newSessions.filter(s => s.status !== 'empty').length;
          return {
            sessions: newSessions,
            dashboard: { ...state.dashboard, activeSessions },
          };
        }),

      setCreating: (creating) => set({ isCreatingSession: creating }),

      setError: (error) => set({ error }),

      setIsFirstRun: (value) => set({ isFirstRun: value }),

      addTokenUsage: (faceIndex, inputTokens, outputTokens) =>
        set((state) => {
          const cost = calculateCost(inputTokens, outputTokens);
          const session = state.sessions[faceIndex];
          const projectId = session?.projectId;

          // Calculate energy usage based on session's AI provider
          const totalTokens = inputTokens + outputTokens;
          const provider = AI_PROVIDERS.find(p => p.id === session?.aiProvider) || AI_PROVIDERS[0];
          const actualEnergy = (totalTokens / 1_000_000) * provider.wattsPerMToken; // Wh
          const baselineEnergy = (totalTokens / 1_000_000) * BASELINE_WATTS_PER_MTOKEN; // Wh if using largest model

          // Update session
          const newSessions = state.sessions.map((s) =>
            s.faceIndex === faceIndex
              ? {
                  ...s,
                  inputTokens: s.inputTokens + inputTokens,
                  outputTokens: s.outputTokens + outputTokens,
                  totalTokens: s.totalTokens + inputTokens + outputTokens,
                  estimatedCost: s.estimatedCost + cost,
                  messageCount: s.messageCount + 1,
                }
              : s
          );

          // Update cost metrics
          const newCostMetrics = { ...state.costMetrics };
          newCostMetrics.totalInputTokens += inputTokens;
          newCostMetrics.totalOutputTokens += outputTokens;
          newCostMetrics.totalTokens += inputTokens + outputTokens;
          newCostMetrics.totalCost += cost;
          newCostMetrics.costBySession[`face-${faceIndex}`] =
            (newCostMetrics.costBySession[`face-${faceIndex}`] || 0) + cost;

          if (projectId) {
            newCostMetrics.costByProject[projectId] =
              (newCostMetrics.costByProject[projectId] || 0) + cost;
          }

          // Update energy metrics
          const newEnergyMetrics = { ...state.energyMetrics };
          newEnergyMetrics.totalEnergy += actualEnergy;
          newEnergyMetrics.baselineEnergy += baselineEnergy;
          newEnergyMetrics.energySaved = newEnergyMetrics.baselineEnergy - newEnergyMetrics.totalEnergy;
          newEnergyMetrics.energyBySession[`face-${faceIndex}`] =
            (newEnergyMetrics.energyBySession[`face-${faceIndex}`] || 0) + actualEnergy;

          if (projectId) {
            newEnergyMetrics.energyByProject[projectId] =
              (newEnergyMetrics.energyByProject[projectId] || 0) + actualEnergy;
          }

          // Update project totals
          const newProjects = projectId
            ? state.projects.map((p) =>
                p.id === projectId
                  ? {
                      ...p,
                      totalCost: p.totalCost + cost,
                      totalTokens: p.totalTokens + inputTokens + outputTokens,
                      updatedAt: Date.now(),
                    }
                  : p
              )
            : state.projects;

          // Update dashboard
          const newDashboard = {
            ...state.dashboard,
            totalCostToday: state.dashboard.totalCostToday + cost,
            tokensToday: state.dashboard.tokensToday + inputTokens + outputTokens,
          };

          return {
            sessions: newSessions,
            costMetrics: newCostMetrics,
            energyMetrics: newEnergyMetrics,
            projects: newProjects,
            dashboard: newDashboard,
          };
        }),

      // ========== TIER 3: SESSION LINKING & HYPOTHESIS BRANCHES ==========

      linkSessions: (faceIndex1, faceIndex2) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.faceIndex === faceIndex1) {
              const linked = s.linkedSessions || [];
              if (!linked.includes(`face-${faceIndex2}`)) {
                return { ...s, linkedSessions: [...linked, `face-${faceIndex2}`] };
              }
            }
            if (s.faceIndex === faceIndex2) {
              const linked = s.linkedSessions || [];
              if (!linked.includes(`face-${faceIndex1}`)) {
                return { ...s, linkedSessions: [...linked, `face-${faceIndex1}`] };
              }
            }
            return s;
          }),
        })),

      unlinkSessions: (faceIndex1, faceIndex2) =>
        set((state) => ({
          sessions: state.sessions.map((s) => {
            if (s.faceIndex === faceIndex1 && s.linkedSessions) {
              return { ...s, linkedSessions: s.linkedSessions.filter((id) => id !== `face-${faceIndex2}`) };
            }
            if (s.faceIndex === faceIndex2 && s.linkedSessions) {
              return { ...s, linkedSessions: s.linkedSessions.filter((id) => id !== `face-${faceIndex1}`) };
            }
            return s;
          }),
        })),

      createHypothesisBranch: (sourceFaceIndex, targetFaceIndex, branchName, hypothesis) =>
        set((state) => {
          const sourceSession = state.sessions[sourceFaceIndex];
          return {
            sessions: state.sessions.map((s) => {
              if (s.faceIndex === targetFaceIndex) {
                return {
                  ...s,
                  hypothesisBranch: {
                    parentSessionId: `face-${sourceFaceIndex}`,
                    branchName,
                    hypothesis,
                    status: 'exploring' as const,
                  },
                  // Copy working dir and project from source
                  workingDir: sourceSession?.workingDir || s.workingDir,
                  projectId: sourceSession?.projectId,
                  linkedSessions: [...(s.linkedSessions || []), `face-${sourceFaceIndex}`],
                };
              }
              // Link source back to the branch
              if (s.faceIndex === sourceFaceIndex) {
                return {
                  ...s,
                  linkedSessions: [...(s.linkedSessions || []), `face-${targetFaceIndex}`],
                };
              }
              return s;
            }),
          };
        }),

      updateHypothesisStatus: (faceIndex, status) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.faceIndex === faceIndex && s.hypothesisBranch
              ? { ...s, hypothesisBranch: { ...s.hypothesisBranch, status } }
              : s
          ),
        })),

      markSessionActivity: (faceIndex) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.faceIndex === faceIndex
              ? { ...s, lastActivity: Date.now(), hasRecentActivity: true, activityLevel: 'high' as const }
              : s
          ),
        })),

      setSessionNeedsAttention: (faceIndex, needsAttention, reason) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.faceIndex === faceIndex
              ? { ...s, needsAttention, attentionReason: needsAttention ? reason : undefined }
              : s
          ),
        })),

      clearAllAttention: () =>
        set((state) => ({
          sessions: state.sessions.map((s) => ({ ...s, needsAttention: false, attentionReason: undefined })),
        })),

      // ========== PROJECT ACTIONS ==========

      createProject: (name, description, color, icon) =>
        set((state) => {
          const newProject: Project = {
            id: `project-${Date.now()}`,
            name,
            description,
            color: color || PROJECT_COLORS[state.projects.length % PROJECT_COLORS.length],
            icon: icon || PROJECT_ICONS[state.projects.length % PROJECT_ICONS.length],
            sessionIds: [],
            totalCost: 0,
            totalTokens: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          return {
            projects: [...state.projects, newProject],
            dashboard: { ...state.dashboard, activeProjects: state.projects.length + 1 },
          };
        }),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p
          ),
        })),

      deleteProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          sessions: state.sessions.map((s) =>
            s.projectId === id ? { ...s, projectId: undefined } : s
          ),
          dashboard: { ...state.dashboard, activeProjects: state.projects.length - 1 },
        })),

      assignSessionToProject: (faceIndex, projectId) =>
        set((state) => {
          const session = state.sessions[faceIndex];
          const oldProjectId = session?.projectId;

          // Remove from old project
          let newProjects = state.projects.map((p) =>
            p.id === oldProjectId
              ? { ...p, sessionIds: p.sessionIds.filter((id) => id !== `face-${faceIndex}`) }
              : p
          );

          // Add to new project
          if (projectId) {
            newProjects = newProjects.map((p) =>
              p.id === projectId
                ? { ...p, sessionIds: [...p.sessionIds, `face-${faceIndex}`] }
                : p
            );
          }

          return {
            sessions: state.sessions.map((s) =>
              s.faceIndex === faceIndex ? { ...s, projectId: projectId || undefined } : s
            ),
            projects: newProjects,
          };
        }),

      setSelectedProject: (id) => set({ selectedProject: id }),

      setShowProjectModal: (show) => set({ showProjectModal: show }),

      // ========== LEO ACTIONS ==========

      toggleLeoMode: () =>
        set((state) => ({
          leo: { ...state.leo, enabled: !state.leo.enabled },
        })),

      addFlowrider: (flowrider) =>
        set((state) => ({
          leo: {
            ...state.leo,
            flowriders: [...state.leo.flowriders, flowrider],
            activeCapacity: state.leo.activeCapacity + 20,
          },
        })),

      removeFlowrider: (id) =>
        set((state) => ({
          leo: {
            ...state.leo,
            flowriders: state.leo.flowriders.filter((f) => f.id !== id),
            activeCapacity: Math.max(0, state.leo.activeCapacity - 20),
          },
        })),

      updateFlowrider: (id, updates) =>
        set((state) => ({
          leo: {
            ...state.leo,
            flowriders: state.leo.flowriders.map((f) =>
              f.id === id ? { ...f, ...updates } : f
            ),
          },
        })),

      setShowLeoPanel: (show) => set({ showLeoPanel: show }),

      // ========== DASHBOARD ACTIONS ==========

      setDashboardView: (view) => set({ dashboardView: view }),

      refreshDashboard: () =>
        set((state) => {
          const activeSessions = state.sessions.filter((s) => s.status !== 'empty').length;
          const activeProjects = state.projects.filter((p) => p.sessionIds.length > 0).length;
          const totalCost = state.costMetrics.totalCost;

          return {
            dashboard: {
              ...state.dashboard,
              activeSessions,
              activeProjects,
              totalCostMonth: totalCost,
            },
          };
        }),

      // Sync sessions with actual tmux state on startup
      syncWithTmux: async () => {
        if (!window.flowrider) return;

        try {
          const result = await window.flowrider.tmux.list();
          if (!(result as any).success) return;

          const tmuxSessions: Array<{ name: string; faceIndex: number; attached: boolean }> =
            (result as any).data || [];

          // Build a map of faceIndex -> tmux session
          const tmuxMap = new Map<number, { name: string; attached: boolean }>();
          for (const ts of tmuxSessions) {
            tmuxMap.set(ts.faceIndex, { name: ts.name, attached: ts.attached });
          }

          // Update store sessions based on actual tmux state
          set((state) => {
            const newSessions = state.sessions.map((session) => {
              const tmux = tmuxMap.get(session.faceIndex);
              if (tmux) {
                // Tmux session exists - mark as active
                return {
                  ...session,
                  tmuxSession: tmux.name,
                  status: tmux.attached ? 'attached' as const : 'active' as const,
                };
              } else if (session.tmuxSession) {
                // UI thinks there's a session but tmux doesn't have it - mark as empty
                return {
                  ...session,
                  tmuxSession: undefined,
                  status: 'empty' as const,
                };
              }
              return session;
            });

            const activeSessions = newSessions.filter((s) => s.status !== 'empty').length;

            return {
              sessions: newSessions,
              dashboard: { ...state.dashboard, activeSessions },
            };
          });

          console.log(`[Store] Synced ${tmuxSessions.length} tmux sessions`);
        } catch (err) {
          console.error('[Store] Failed to sync with tmux:', err);
        }
      },
    }),
    {
      name: 'flowrider2-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        projects: state.projects,
        costMetrics: state.costMetrics,
        energyMetrics: state.energyMetrics,
        leo: state.leo,
        isFirstRun: state.isFirstRun,
      }),
    }
  )
);

// ============================================
// SELECTORS
// ============================================

export const useActiveSessions = () =>
  useStore((state) => state.sessions.filter((s) => s.status !== 'empty'));

export const useProjectSessions = (projectId: string) =>
  useStore((state) => state.sessions.filter((s) => s.projectId === projectId));

export const useTotalCost = () =>
  useStore((state) => state.costMetrics.totalCost);

export const useProjectCost = (projectId: string) =>
  useStore((state) => state.costMetrics.costByProject[projectId] || 0);

export const useFilteredSessions = () =>
  useStore((state) => {
    const { sessions, searchQuery, searchFilter } = state;
    const query = searchQuery.toLowerCase().trim();

    return sessions.filter((session) => {
      // Apply text search
      if (query) {
        const matchesName = session.name.toLowerCase().includes(query);
        const matchesDir = session.workingDir.toLowerCase().includes(query);
        const matchesNotes = session.notes?.toLowerCase().includes(query);
        const matchesRepo = session.gitHubRepo?.repo.toLowerCase().includes(query);
        if (!matchesName && !matchesDir && !matchesNotes && !matchesRepo) {
          return false;
        }
      }

      // Apply filter
      switch (searchFilter) {
        case 'active':
          return session.status !== 'empty';
        case 'empty':
          return session.status === 'empty';
        case 'hypothesis':
          return session.hypothesisBranch !== undefined;
        default:
          return true;
      }
    });
  });
