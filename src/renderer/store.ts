import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export type AIProvider = 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'mistral' | 'kimi' | 'deepseek' | 'cohere' | 'qwen' | 'yi' | 'falcon' | 'hunyuan' | 'local';

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
    id: 'mistral',
    name: 'Mistral AI (France)',
    description: 'European AI, strong multilingual & coding',
    costPerMToken: 3,
    wattsPerMToken: 0.25, // Efficient European datacenter
    isLocal: false,
    apiUrl: 'https://api.mistral.ai',
    models: ['mistral-large-latest', 'mistral-medium', 'mistral-small', 'codestral'],
  },
  {
    id: 'deepseek',
    name: 'DeepSeek (China)',
    description: 'Cost-effective reasoning & coding AI',
    costPerMToken: 0.55, // Very competitive pricing
    wattsPerMToken: 0.2, // Efficient inference
    isLocal: false,
    apiUrl: 'https://api.deepseek.com',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  },
  {
    id: 'kimi',
    name: 'Kimi K3 (Moonshot AI - China)',
    description: '1M token context, strong at long docs',
    costPerMToken: 1.5,
    wattsPerMToken: 0.3, // Standard datacenter
    isLocal: false,
    apiUrl: 'https://api.moonshot.cn',
    models: ['moonshot-v1-128k', 'moonshot-v1-32k', 'moonshot-v1-8k'],
  },
  {
    id: 'cohere',
    name: 'Cohere (Canada)',
    description: 'Enterprise RAG & embeddings specialist',
    costPerMToken: 1,
    wattsPerMToken: 0.25, // Efficient Canadian datacenter
    isLocal: false,
    apiUrl: 'https://api.cohere.ai',
    models: ['command-r-plus', 'command-r', 'command-light'],
  },
  // ===== FREE OPEN-SOURCE INTERNATIONAL MODELS (via Ollama) =====
  {
    id: 'qwen',
    name: 'Qwen3 (Alibaba - China)',
    description: 'Apache 2.0, 1M context, 201 languages - FREE',
    costPerMToken: 0, // Open source, run locally
    wattsPerMToken: 0.01, // Local inference
    isLocal: true,
    apiUrl: 'http://localhost:11434', // Via Ollama
    models: ['qwen3:70b', 'qwen3:32b', 'qwen3:14b', 'qwen3:7b', 'qwen-coder:32b'],
  },
  {
    id: 'yi',
    name: 'Yi (01.AI - China)',
    description: 'Apache 2.0, strong bilingual EN/ZH - FREE',
    costPerMToken: 0,
    wattsPerMToken: 0.01,
    isLocal: true,
    apiUrl: 'http://localhost:11434',
    models: ['yi:34b', 'yi:9b', 'yi-coder:9b'],
  },
  {
    id: 'falcon',
    name: 'Falcon 3 (TII - UAE)',
    description: 'Compact & efficient, strong reasoning - FREE',
    costPerMToken: 0,
    wattsPerMToken: 0.01,
    isLocal: true,
    apiUrl: 'http://localhost:11434',
    models: ['falcon3:10b', 'falcon3:7b', 'falcon3:3b', 'falcon3:1b'],
  },
  {
    id: 'hunyuan',
    name: 'HunYuan 3 (Tencent - China)',
    description: 'Apache 2.0, 256K context MoE - FREE',
    costPerMToken: 0,
    wattsPerMToken: 0.01,
    isLocal: true,
    apiUrl: 'http://localhost:11434',
    models: ['hunyuan:7b', 'hunyuan-lite'],
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
  // Session summary for cognitive load reduction (audit fix)
  summary?: string; // One-line status: "Building auth API... 73% done"
  currentTask?: string; // What the AI is currently working on
  progress?: number; // 0-100 progress estimate
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

export interface Interest {
  topic: string;
  weight: number;
  trajectory: 'new' | 'learning' | 'established' | 'expert';
  sessions: number;
  lastWorkedOn: Date;
  trend?: 'growing' | 'stable' | 'declining';
}

export interface KnowledgeNode {
  id: string;
  concept: string;
  cluster: string;
  confidence: number;
  connections: string[];
  isGap?: boolean;
  size?: number;
}

export interface SkillLevel {
  technology: string;
  level: 'novice' | 'intermediate' | 'proficient' | 'expert';
  trend: 'improving' | 'stable' | 'needs-work';
  milestones: string[];
  lastActivity: Date;
  progress?: number;
}

export interface ContextItem {
  type: 'last-work' | 'unfinished' | 'goal';
  description: string;
  sessionId?: string;
  progress: number;
  timestamp: Date;
}

export interface RecommendedResource {
  type: 'book' | 'documentation' | 'tutorial' | 'course';
  title: string;
  description: string;
  url?: string;
  relevance: number;
  reason: string;
}

export interface LearningGoal {
  id: string;
  type: 'explicit' | 'inferred';
  description: string;
  progress: number;
  confidence?: number;
  targetDate?: Date;
}

export interface UserProfile {
  interests: Interest[];
  knowledgeGraph: KnowledgeNode[];
  skillProgress: SkillLevel[];
  context: ContextItem[];
  recommendedResources: RecommendedResource[];
  learningGoals?: LearningGoal[];
  lastUpdated: Date;
  stats?: {
    knowledgeScore: number;
    totalConcepts: number;
    activeDomains: number;
    learningVelocity: number;
    growthThisMonth: number;
  };
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
  // Sessions - configurable number of slots (default 8, max 20)
  sessions: Session[];
  sessionSlots: number; // 4, 6, 8, 12, or 20
  selectedFace: number | null;
  attachedSession: string | null;

  // Control Groups (StarCraft-style hotkeys)
  // Groups 1-9, each containing array of face indices
  controlGroups: Record<number, number[]>;

  // Projects
  projects: Project[];
  selectedProject: string | null;

  // Cost tracking
  costMetrics: CostMetrics;

  // Energy tracking (ESG/sustainability metrics)
  energyMetrics: EnergyMetrics;

  // LEO Mode
  leo: LeoState;

  // ZOIX Learning System
  zoixPatterns: number;
  zoixLearningActive: boolean;
  zoixRecentLearnings: Array<{
    id: string;
    type: 'error' | 'code' | 'workflow' | 'prompt';
    description: string;
    sessionId?: number;
    timestamp: Date;
    confidence: number;
  }>;
  zoixInsights: Array<{
    id: string;
    type: 'cross_session' | 'suggestion' | 'cost_saving';
    title: string;
    description: string;
    actionable: boolean;
    sessions?: number[];
  }>;
  zoixStats: {
    totalInteractions: number;
    totalPatterns: number;
    totalInsights: number;
    totalSnippets: number;
    averageConfidence: number;
  } | null;

  // ZOIX Actions
  setZoixPatterns: (count: number) => void;
  setZoixStats: (stats: any) => void;
  setZoixRecentLearnings: (learnings: any[]) => void;
  setZoixInsights: (insights: any[]) => void;
  syncZoixData: () => Promise<void>;

  // ZOIX User Profile
  userProfile: UserProfile | null;
  setUserProfile: (profile: UserProfile) => void;
  syncUserProfile: () => Promise<void>;

  // Dashboard
  dashboard: DashboardMetrics;
  dashboardView: 'overview' | 'projects' | 'costs' | 'leo' | 'roi' | 'mcp' | 'messaging' | 'activity' | 'providers' | 'leoai' | 'api' | 'profile';

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
  seedZoixDemoData: () => void;

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
  setSessionSlots: (slots: number) => void;
  setSessionNeedsAttention: (faceIndex: number, needsAttention: boolean, reason?: string) => void;
  clearAllAttention: () => void;

  // Control Group Actions (StarCraft-style)
  setControlGroup: (groupNumber: number, faceIndices: number[]) => void;
  addToControlGroup: (groupNumber: number, faceIndex: number) => void;
  removeFromControlGroup: (groupNumber: number, faceIndex: number) => void;
  selectControlGroup: (groupNumber: number) => void;
  clearControlGroup: (groupNumber: number) => void;
  getControlGroupForFace: (faceIndex: number) => number | null;

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
      sessionSlots: 8, // Default to 8 slots (options: 4, 6, 8, 12, 20)
      selectedFace: null,
      attachedSession: null,
      controlGroups: {}, // StarCraft-style control groups (1-9)
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

      // ZOIX Learning System
      zoixPatterns: 0,
      zoixLearningActive: false,
      zoixRecentLearnings: [],
      zoixInsights: [],
      zoixStats: null,

      // ZOIX User Profile
      userProfile: null,

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
          // Reset ZOIX demo data
          zoixPatterns: 0,
          zoixLearningActive: false,
          zoixRecentLearnings: [],
          zoixInsights: [],
        })),

      // Seed ZOIX with impressive demo data for investor presentations
      seedZoixDemoData: () =>
        set({
          zoixPatterns: 847, // Impressive but realistic number
          zoixLearningActive: true,
          zoixRecentLearnings: [
            {
              id: 'demo-1',
              type: 'error' as const,
              description: 'null reference → add optional chaining',
              sessionId: 4,
              timestamp: new Date(Date.now() - 2 * 60 * 1000), // 2 min ago
              confidence: 0.94,
            },
            {
              id: 'demo-2',
              type: 'code' as const,
              description: 'React useEffect cleanup pattern',
              sessionId: 2,
              timestamp: new Date(Date.now() - 8 * 60 * 1000), // 8 min ago
              confidence: 0.91,
            },
            {
              id: 'demo-3',
              type: 'workflow' as const,
              description: 'git commit → push → PR sequence',
              sessionId: 1,
              timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 min ago
              confidence: 0.97,
            },
            {
              id: 'demo-4',
              type: 'prompt' as const,
              description: 'TypeScript interface → Zod schema',
              sessionId: 7,
              timestamp: new Date(Date.now() - 22 * 60 * 1000), // 22 min ago
              confidence: 0.89,
            },
            {
              id: 'demo-5',
              type: 'code' as const,
              description: 'async/await error boundary pattern',
              sessionId: 3,
              timestamp: new Date(Date.now() - 35 * 60 * 1000), // 35 min ago
              confidence: 0.93,
            },
          ],
          zoixInsights: [
            {
              id: 'insight-1',
              type: 'cross_session' as const,
              title: 'Shared Auth Pattern Detected',
              description: 'Sessions 3 and 7 both implement JWT token refresh. Consider extracting to shared utility.',
              actionable: true,
              sessions: [3, 7],
            },
            {
              id: 'insight-2',
              type: 'cost_saving' as const,
              title: 'Pattern Cache Savings',
              description: 'ZOIX cached 127 common patterns this week, saving ~$2.84 in redundant API calls.',
              actionable: false,
            },
            {
              id: 'insight-3',
              type: 'suggestion' as const,
              title: 'Test Coverage Opportunity',
              description: 'Sessions 1, 4, and 8 all modified the same PaymentService. Consider cross-session test generation.',
              actionable: true,
              sessions: [1, 4, 8],
            },
          ],
        }),

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

      // Session Slots - configurable number of visible sessions
      setSessionSlots: (slots) => {
        const validSlots = [4, 6, 8, 12, 20];
        const newSlots = validSlots.includes(slots) ? slots : 8;
        set({ sessionSlots: newSlots });
      },

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

      // ========== CONTROL GROUP ACTIONS (StarCraft-style) ==========

      setControlGroup: (groupNumber, faceIndices) =>
        set((state) => ({
          controlGroups: { ...state.controlGroups, [groupNumber]: faceIndices },
        })),

      addToControlGroup: (groupNumber, faceIndex) =>
        set((state) => {
          const existing = state.controlGroups[groupNumber] || [];
          if (existing.includes(faceIndex)) return state;
          return {
            controlGroups: { ...state.controlGroups, [groupNumber]: [...existing, faceIndex] },
          };
        }),

      removeFromControlGroup: (groupNumber, faceIndex) =>
        set((state) => {
          const existing = state.controlGroups[groupNumber] || [];
          return {
            controlGroups: {
              ...state.controlGroups,
              [groupNumber]: existing.filter((idx) => idx !== faceIndex),
            },
          };
        }),

      selectControlGroup: (groupNumber) => {
        const state = get();
        const group = state.controlGroups[groupNumber];
        if (group && group.length > 0) {
          // Select the first session in the group
          set({ selectedFace: group[0] });
        }
      },

      clearControlGroup: (groupNumber) =>
        set((state) => {
          const newGroups = { ...state.controlGroups };
          delete newGroups[groupNumber];
          return { controlGroups: newGroups };
        }),

      getControlGroupForFace: (faceIndex) => {
        const state = get();
        for (const [groupNum, indices] of Object.entries(state.controlGroups)) {
          if (indices.includes(faceIndex)) {
            return parseInt(groupNum);
          }
        }
        return null;
      },

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
                // Tmux session exists - mark as active and restore name from tmux
                // Parse friendly name from tmux session name: fr2-{index}-{friendly-name}
                const parts = tmux.name.split('-');
                const friendlyName = parts.length > 2
                  ? parts.slice(2).join('-') // Everything after fr2-{index}-
                  : session.name; // Keep existing name if parsing fails

                return {
                  ...session,
                  name: session.name === `Session ${session.faceIndex + 1}` ? friendlyName : session.name, // Only restore if default
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

      // ========== ZOIX ACTIONS ==========

      setZoixPatterns: (count) => set({ zoixPatterns: count }),

      setZoixStats: (stats) => set({ zoixStats: stats, zoixPatterns: stats.totalPatterns || 0 }),

      setZoixRecentLearnings: (learnings) => set({ zoixRecentLearnings: learnings }),

      setZoixInsights: (insights) => set({ zoixInsights: insights }),

      syncZoixData: async () => {
        if (!window.flowrider) return;

        try {
          // Fetch stats
          const statsResult = await window.flowrider.leoai.getStats();
          if (statsResult.success && statsResult.data) {
            set({
              zoixStats: statsResult.data,
              zoixPatterns: statsResult.data.totalPatterns || 0,
              zoixLearningActive: statsResult.data.totalPatterns > 0,
            });
          }

          // Fetch recent patterns (learnings)
          const patternsResult = await window.flowrider.leoai.getPatterns(0.5);
          if (patternsResult.success && patternsResult.data) {
            const learnings = patternsResult.data.slice(0, 5).map((pattern: Pattern) => ({
              id: pattern.id,
              type: pattern.type,
              description: pattern.name,
              timestamp: new Date(pattern.lastSeen),
              confidence: pattern.confidence,
            }));
            set({ zoixRecentLearnings: learnings });
          }

          // Fetch insights
          const insightsResult = await window.flowrider.leoai.getInsights(10);
          if (insightsResult.success && insightsResult.data) {
            const insights = insightsResult.data.map((insight: Insight) => ({
              id: insight.id,
              type: insight.category === 'error-solution' ? 'cross_session' :
                    insight.category === 'cost-optimization' ? 'cost_saving' : 'suggestion',
              title: insight.category.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              description: insight.content,
              actionable: insight.effectiveness > 0.7,
            }));
            set({ zoixInsights: insights });
          }

          console.log('[Store] ZOIX data synced successfully');
        } catch (err) {
          console.error('[Store] Failed to sync ZOIX data:', err);
        }
      },

      // ========== ZOIX USER PROFILE ACTIONS ==========

      setUserProfile: (profile) => set({ userProfile: profile }),

      syncUserProfile: async () => {
        if (!window.flowrider) return;

        try {
          // For now, build profile from existing ZOIX data
          // In future, this could call dedicated backend endpoints
          const patternsResult = await window.flowrider.leoai.getPatterns(0.5);
          const insightsResult = await window.flowrider.leoai.getInsights(10);
          const statsResult = await window.flowrider.leoai.getStats();

          // Build interests from patterns
          const interests: Interest[] = [];
          if (patternsResult.success && patternsResult.data) {
            const topicMap = new Map<string, { count: number, patterns: any[] }>();

            patternsResult.data.forEach((pattern: any) => {
              const topic = pattern.tags?.[0] || pattern.language || pattern.type;
              if (!topicMap.has(topic)) {
                topicMap.set(topic, { count: 0, patterns: [] });
              }
              const entry = topicMap.get(topic)!;
              entry.count += pattern.frequency;
              entry.patterns.push(pattern);
            });

            const sortedTopics = Array.from(topicMap.entries())
              .sort((a, b) => b[1].count - a[1].count)
              .slice(0, 10);

            const maxCount = sortedTopics[0]?.[1].count || 1;

            sortedTopics.forEach(([topic, data]) => {
              const avgConfidence = data.patterns.reduce((sum: number, p: any) => sum + p.confidence, 0) / data.patterns.length;
              const weight = data.count / maxCount;

              let trajectory: Interest['trajectory'] = 'learning';
              if (avgConfidence > 0.9 && data.count > 20) trajectory = 'expert';
              else if (avgConfidence > 0.7 && data.count > 10) trajectory = 'established';
              else if (data.count < 5) trajectory = 'new';

              interests.push({
                topic,
                weight,
                trajectory,
                sessions: data.patterns.length,
                lastWorkedOn: new Date(Math.max(...data.patterns.map((p: any) => p.lastSeen))),
              });
            });
          }

          // Build knowledge graph from patterns and tags
          const knowledgeGraph: KnowledgeNode[] = [];
          if (patternsResult.success && patternsResult.data) {
            const nodeMap = new Map<string, KnowledgeNode>();

            patternsResult.data.forEach((pattern: any, idx: number) => {
              pattern.tags?.forEach((tag: string) => {
                if (!nodeMap.has(tag)) {
                  nodeMap.set(tag, {
                    id: `node-${tag}`,
                    concept: tag,
                    cluster: pattern.language || pattern.type || 'general',
                    confidence: pattern.confidence,
                    connections: [],
                  });
                }
              });
            });

            // Build connections between related tags
            patternsResult.data.forEach((pattern: any) => {
              if (pattern.tags?.length > 1) {
                for (let i = 0; i < pattern.tags.length; i++) {
                  for (let j = i + 1; j < pattern.tags.length; j++) {
                    const node1 = nodeMap.get(pattern.tags[i]);
                    const node2 = nodeMap.get(pattern.tags[j]);
                    if (node1 && node2) {
                      if (!node1.connections.includes(node2.id)) {
                        node1.connections.push(node2.id);
                      }
                      if (!node2.connections.includes(node1.id)) {
                        node2.connections.push(node1.id);
                      }
                    }
                  }
                }
              }
            });

            knowledgeGraph.push(...Array.from(nodeMap.values()).slice(0, 30));
          }

          // Build skill progress from languages
          const skillProgress: SkillLevel[] = [];
          if (patternsResult.success && patternsResult.data) {
            const langMap = new Map<string, any[]>();

            patternsResult.data.forEach((pattern: any) => {
              if (pattern.language) {
                if (!langMap.has(pattern.language)) {
                  langMap.set(pattern.language, []);
                }
                langMap.get(pattern.language)!.push(pattern);
              }
            });

            langMap.forEach((patterns, lang) => {
              const totalFreq = patterns.reduce((sum, p) => sum + p.frequency, 0);
              const avgConf = patterns.reduce((sum, p) => sum + p.confidence, 0) / patterns.length;

              let level: SkillLevel['level'] = 'beginner';
              if (totalFreq > 50 && avgConf > 0.85) level = 'expert';
              else if (totalFreq > 20 && avgConf > 0.7) level = 'intermediate';

              const milestones = patterns
                .filter(p => p.confidence > 0.9)
                .slice(0, 3)
                .map(p => p.pattern || p.type);

              skillProgress.push({
                technology: lang,
                level,
                trend: avgConf > 0.8 ? 'improving' : avgConf > 0.6 ? 'stable' : 'needs-work',
                milestones,
                lastActivity: new Date(Math.max(...patterns.map(p => p.lastSeen))),
              });
            });
          }

          // Build context from recent interactions
          const context: ContextItem[] = [];
          if (statsResult.success && statsResult.data) {
            // Add some context based on stats
            if (statsResult.data.totalInteractions > 0) {
              context.push({
                type: 'last-work',
                description: `Completed ${statsResult.data.totalInteractions} AI interactions`,
                progress: 1,
                timestamp: new Date(Date.now() - 3600000), // 1 hour ago
              });
            }
          }

          // Build recommended resources based on knowledge gaps and learning trajectory
          const recommendedResources: RecommendedResource[] = [];

          // Recommend based on 'new' or 'learning' interests
          interests.filter(i => i.trajectory === 'new' || i.trajectory === 'learning').forEach(interest => {
            recommendedResources.push({
              type: 'documentation',
              title: `${interest.topic} Official Documentation`,
              description: `Comprehensive guide to ${interest.topic}`,
              relevance: interest.weight,
              reason: `You're actively learning ${interest.topic}`,
            });
          });

          // Recommend based on skill gaps
          skillProgress.filter(s => s.level === 'beginner' || s.trend === 'needs-work').forEach(skill => {
            recommendedResources.push({
              type: 'tutorial',
              title: `Advanced ${skill.technology} Tutorial`,
              description: `Level up your ${skill.technology} skills`,
              relevance: 0.8,
              reason: `Improve your ${skill.technology} proficiency`,
            });
          });

          const profile: UserProfile = {
            interests,
            knowledgeGraph,
            skillProgress,
            context,
            recommendedResources: recommendedResources.slice(0, 10),
            lastUpdated: new Date(),
          };

          set({ userProfile: profile });
          console.log('[Store] User profile synced successfully');
        } catch (err) {
          console.error('[Store] Failed to sync user profile:', err);
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
