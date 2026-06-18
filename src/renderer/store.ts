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
    isLocal: false,
    apiUrl: 'https://api.anthropic.com',
    models: ['claude-opus-4', 'claude-sonnet-4', 'claude-haiku'],
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o and GPT models',
    costPerMToken: 10,
    isLocal: false,
    apiUrl: 'https://api.openai.com',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  },
  {
    id: 'gemini',
    name: 'Gemini (Google)',
    description: 'Multimodal AI with long context',
    costPerMToken: 7,
    isLocal: false,
    apiUrl: 'https://generativelanguage.googleapis.com',
    models: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  },
  {
    id: 'grok',
    name: 'Grok (xAI)',
    description: 'Real-time knowledge, witty responses',
    costPerMToken: 5,
    isLocal: false,
    apiUrl: 'https://api.x.ai',
    models: ['grok-2', 'grok-2-mini'],
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run Llama, Mistral, etc. locally - FREE',
    costPerMToken: 0,
    isLocal: true,
    apiUrl: 'http://localhost:11434',
    models: ['llama3.2', 'llama3.1', 'mistral', 'codellama', 'deepseek-coder'],
  },
  {
    id: 'local',
    name: 'Custom Local LLM',
    description: 'Any local model via API - FREE',
    costPerMToken: 0,
    isLocal: true,
    models: ['custom'],
  },
];

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

  // LEO Mode
  leo: LeoState;

  // Dashboard
  dashboard: DashboardMetrics;
  dashboardView: 'overview' | 'projects' | 'costs' | 'leo' | 'roi' | 'mcp' | 'messaging' | 'activity' | 'providers';

  // UI State
  isCreatingSession: boolean;
  isCreatingProject: boolean;
  showProjectModal: boolean;
  showLeoPanel: boolean;
  error: string | null;

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
  setDashboardView: (view: 'overview' | 'projects' | 'costs' | 'leo') => void;
  refreshDashboard: () => void;
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
      leo: initializeLeoState(),
      dashboard: initializeDashboard(),
      dashboardView: 'overview',
      isCreatingSession: false,
      isCreatingProject: false,
      showProjectModal: false,
      showLeoPanel: false,
      error: null,
      appMode: 'work',

      // ========== APP MODE ACTIONS ==========

      setAppMode: (mode) => set({ appMode: mode }),

      resetDemoData: () =>
        set((state) => ({
          sessions: initializeSessions(),
          costMetrics: initializeCostMetrics(),
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

      addTokenUsage: (faceIndex, inputTokens, outputTokens) =>
        set((state) => {
          const cost = calculateCost(inputTokens, outputTokens);
          const session = state.sessions[faceIndex];
          const projectId = session?.projectId;

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
            projects: newProjects,
            dashboard: newDashboard,
          };
        }),

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
    }),
    {
      name: 'flowrider2-storage',
      partialize: (state) => ({
        sessions: state.sessions,
        projects: state.projects,
        costMetrics: state.costMetrics,
        leo: state.leo,
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
