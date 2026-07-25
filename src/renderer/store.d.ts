export type AIProvider = 'zoix' | 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'mistral' | 'kimi' | 'deepseek' | 'cohere' | 'qwen' | 'yi' | 'falcon' | 'hunyuan' | 'local';
export interface AIProviderConfig {
    id: AIProvider;
    name: string;
    description: string;
    costPerMToken: number;
    wattsPerMToken: number;
    isLocal: boolean;
    apiUrl?: string;
    models: string[];
}
export declare const AI_PROVIDERS: AIProviderConfig[];
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
    gitHubRepo?: GitHubRepo;
    aiProvider: AIProvider;
    aiModel?: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    estimatedCost: number;
    messageCount: number;
    toolCallCount: number;
    hasRecentActivity?: boolean;
    activityLevel?: 'idle' | 'low' | 'medium' | 'high';
    needsAttention?: boolean;
    attentionReason?: string;
    linkedSessions?: string[];
    hypothesisBranch?: {
        parentSessionId?: string;
        branchName: string;
        hypothesis: string;
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
    dailyCosts: Array<{
        date: string;
        cost: number;
        tokens: number;
    }>;
}
export interface EnergyMetrics {
    totalEnergy: number;
    baselineEnergy: number;
    energySaved: number;
    energyByProject: Record<string, number>;
    energyBySession: Record<string, number>;
    dailyEnergy: Array<{
        date: string;
        energy: number;
        tokens: number;
    }>;
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
    totalCapacity: number;
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
export type TaskComplexity = 'simple' | 'medium' | 'complex' | 'expert';
export type RoutingMode = 'manual' | 'suggest' | 'auto' | 'strict';
export interface RoutingRule {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    projectId?: string;
    taskPatterns?: string[];
    complexityOverride?: TaskComplexity;
    preferredProvider?: AIProvider;
    preferredModel?: string;
    maxCostPerTask?: number;
}
export interface RoutingSettings {
    mode: RoutingMode;
    defaultProvider: AIProvider;
    defaultModel: string;
    rules: RoutingRule[];
    dailyBudget?: number;
    monthlyBudget?: number;
    warnAtPercent?: number;
    overBudgetFallback: 'block' | 'local' | 'warn';
    preferLocalWhenPossible: boolean;
}
export interface RoutingStats {
    totalTasksRouted: number;
    totalCostActual: number;
    totalCostBaseline: number;
    totalSavings: number;
    savingsPercent: number;
    routingsByComplexity: Record<TaskComplexity, number>;
    routingsByProvider: Record<AIProvider, number>;
    todayCost: number;
    monthCost: number;
}
export interface TaskAnalysis {
    complexity: TaskComplexity;
    confidence: number;
    signals: string[];
    suggestedProvider: AIProvider;
    suggestedModel: string;
    estimatedTokens: number;
    estimatedCost: number;
    baselineCost: number;
    potentialSavings: number;
}
interface FlowriderState {
    sessions: Session[];
    sessionSlots: number;
    selectedFace: number | null;
    attachedSession: string | null;
    controlGroups: Record<number, number[]>;
    projects: Project[];
    selectedProject: string | null;
    costMetrics: CostMetrics;
    energyMetrics: EnergyMetrics;
    routingSettings: RoutingSettings;
    routingStats: RoutingStats;
    lastTaskAnalysis: TaskAnalysis | null;
    leo: LeoState;
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
    setZoixPatterns: (count: number) => void;
    setZoixStats: (stats: any) => void;
    setZoixRecentLearnings: (learnings: any[]) => void;
    setZoixInsights: (insights: any[]) => void;
    syncZoixData: () => Promise<void>;
    userProfile: UserProfile | null;
    setUserProfile: (profile: UserProfile) => void;
    syncUserProfile: () => Promise<void>;
    dashboard: DashboardMetrics;
    dashboardView: 'overview' | 'projects' | 'costs' | 'leo' | 'roi' | 'mcp' | 'messaging' | 'activity' | 'providers' | 'leoai' | 'api' | 'profile';
    isCreatingSession: boolean;
    isCreatingProject: boolean;
    showProjectModal: boolean;
    showLeoPanel: boolean;
    error: string | null;
    isFirstRun: boolean;
    setIsFirstRun: (value: boolean) => void;
    terminalDimensions: {
        cols: number;
        rows: number;
    };
    searchQuery: string;
    searchFilter: 'all' | 'active' | 'empty' | 'hypothesis';
    setSearchQuery: (query: string) => void;
    setSearchFilter: (filter: 'all' | 'active' | 'empty' | 'hypothesis') => void;
    setTerminalDimensions: (cols: number, rows: number) => void;
    appMode: 'work' | 'demo';
    setAppMode: (mode: 'work' | 'demo') => void;
    resetDemoData: () => void;
    seedZoixDemoData: () => void;
    selectFace: (faceIndex: number | null) => void;
    setAttachedSession: (sessionId: string | null) => void;
    updateSession: (faceIndex: number, updates: Partial<Session>) => void;
    setCreating: (creating: boolean) => void;
    setError: (error: string | null) => void;
    addTokenUsage: (faceIndex: number, inputTokens: number, outputTokens: number) => void;
    linkSessions: (faceIndex1: number, faceIndex2: number) => void;
    unlinkSessions: (faceIndex1: number, faceIndex2: number) => void;
    createHypothesisBranch: (sourceFaceIndex: number, targetFaceIndex: number, branchName: string, hypothesis: string) => void;
    updateHypothesisStatus: (faceIndex: number, status: 'exploring' | 'promising' | 'abandoned' | 'merged') => void;
    markSessionActivity: (faceIndex: number) => void;
    setSessionSlots: (slots: number) => void;
    setSessionNeedsAttention: (faceIndex: number, needsAttention: boolean, reason?: string) => void;
    clearAllAttention: () => void;
    setControlGroup: (groupNumber: number, faceIndices: number[]) => void;
    addToControlGroup: (groupNumber: number, faceIndex: number) => void;
    removeFromControlGroup: (groupNumber: number, faceIndex: number) => void;
    selectControlGroup: (groupNumber: number) => void;
    clearControlGroup: (groupNumber: number) => void;
    getControlGroupForFace: (faceIndex: number) => number | null;
    createProject: (name: string, description: string, color: string, icon: string) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    deleteProject: (id: string) => void;
    assignSessionToProject: (faceIndex: number, projectId: string | null) => void;
    setSelectedProject: (id: string | null) => void;
    setShowProjectModal: (show: boolean) => void;
    toggleLeoMode: () => void;
    addFlowrider: (flowrider: LeoFlowrider) => void;
    removeFlowrider: (id: string) => void;
    updateFlowrider: (id: string, updates: Partial<LeoFlowrider>) => void;
    setShowLeoPanel: (show: boolean) => void;
    setDashboardView: (view: 'overview' | 'projects' | 'costs' | 'leo' | 'roi' | 'mcp' | 'messaging' | 'activity' | 'providers' | 'leoai' | 'api') => void;
    refreshDashboard: () => void;
    setRoutingMode: (mode: RoutingMode) => void;
    updateRoutingSettings: (updates: Partial<RoutingSettings>) => void;
    addRoutingRule: (rule: RoutingRule) => void;
    removeRoutingRule: (ruleId: string) => void;
    updateRoutingRule: (ruleId: string, updates: Partial<RoutingRule>) => void;
    setLastTaskAnalysis: (analysis: TaskAnalysis | null) => void;
    recordRouting: (analysis: TaskAnalysis, actualTokens?: number, actualCost?: number) => void;
    checkBudgetStatus: () => {
        overDaily: boolean;
        overMonthly: boolean;
        dailyUsedPercent: number;
        monthlyUsedPercent: number;
        shouldWarn: boolean;
    };
    resetDailyRoutingStats: () => void;
    resetMonthlyRoutingStats: () => void;
    syncWithTmux: () => Promise<void>;
}
export declare const useStore: import("zustand").UseBoundStore<Omit<import("zustand").StoreApi<FlowriderState>, "persist"> & {
    persist: {
        setOptions: (options: Partial<import("zustand/middleware").PersistOptions<FlowriderState, {
            sessions: Session[];
            projects: Project[];
            costMetrics: CostMetrics;
            energyMetrics: EnergyMetrics;
            routingSettings: RoutingSettings;
            routingStats: RoutingStats;
            leo: LeoState;
            isFirstRun: boolean;
        }>>) => void;
        clearStorage: () => void;
        rehydrate: () => Promise<void> | void;
        hasHydrated: () => boolean;
        onHydrate: (fn: (state: FlowriderState) => void) => () => void;
        onFinishHydration: (fn: (state: FlowriderState) => void) => () => void;
        getOptions: () => Partial<import("zustand/middleware").PersistOptions<FlowriderState, {
            sessions: Session[];
            projects: Project[];
            costMetrics: CostMetrics;
            energyMetrics: EnergyMetrics;
            routingSettings: RoutingSettings;
            routingStats: RoutingStats;
            leo: LeoState;
            isFirstRun: boolean;
        }>>;
    };
}>;
export declare const useActiveSessions: () => Session[];
export declare const useProjectSessions: (projectId: string) => Session[];
export declare const useTotalCost: () => number;
export declare const useProjectCost: (projectId: string) => number;
export declare const useFilteredSessions: () => Session[];
export {};
