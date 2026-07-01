import { contextBridge, ipcRenderer } from 'electron';

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('flowrider', {
  // Tmux session management
  tmux: {
    create: (name: string, faceIndex: number, workingDir: string) =>
      ipcRenderer.invoke('tmux:create', name, faceIndex, workingDir),
    list: () => ipcRenderer.invoke('tmux:list'),
    kill: (sessionName: string) => ipcRenderer.invoke('tmux:kill', sessionName),
    sendInput: (sessionName: string, data: string) =>
      ipcRenderer.invoke('tmux:input', sessionName, data),
    getOutput: (sessionName: string, lines?: number) =>
      ipcRenderer.invoke('tmux:output', sessionName, lines),
    rename: (oldName: string, newName: string) =>
      ipcRenderer.invoke('tmux:rename', oldName, newName),
  },

  // Git/GitHub integration
  git: {
    detectRepo: (workingDir: string) => ipcRenderer.invoke('git:detect', workingDir),
  },

  // Dialog functions
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  },

  // Project management (for future)
  project: {
    getProjects: () => ipcRenderer.invoke('project:list'),
    createProject: (data: unknown) => ipcRenderer.invoke('project:create', data),
    assignSession: (sessionId: string, projectId: string) =>
      ipcRenderer.invoke('project:assign', sessionId, projectId),
  },

  // Cost tracking (for future)
  costs: {
    getSessionCost: (sessionId: string) => ipcRenderer.invoke('costs:session', sessionId),
    getProjectCost: (projectId: string) => ipcRenderer.invoke('costs:project', projectId),
    getTotalCost: () => ipcRenderer.invoke('costs:total'),
  },

  // LEO (Local Execution Orchestrator)
  leo: {
    enable: () => ipcRenderer.invoke('leo:enable'),
    disable: () => ipcRenderer.invoke('leo:disable'),
    getStatus: () => ipcRenderer.invoke('leo:status'),
    getFlowriders: () => ipcRenderer.invoke('leo:flowriders'),
    discover: () => ipcRenderer.invoke('leo:discover'),
    ping: (flowriderId: string) => ipcRenderer.invoke('leo:ping', flowriderId),
    getRemoteSessions: (flowriderId: string) => ipcRenderer.invoke('leo:remoteSessions', flowriderId),
    getSelfInfo: () => ipcRenderer.invoke('leo:selfInfo'),
  },

  // Session Monitor (auto-captures interactions for LEO AI)
  monitor: {
    start: (sessionName: string, sessionId: string, workingDir: string, projectId?: string, language?: string) =>
      ipcRenderer.invoke('monitor:start', sessionName, sessionId, workingDir, projectId, language),
    stop: (sessionName: string) => ipcRenderer.invoke('monitor:stop', sessionName),
    list: () => ipcRenderer.invoke('monitor:list'),
    isMonitoring: (sessionName: string) => ipcRenderer.invoke('monitor:isMonitoring', sessionName),
    recordInteraction: (sessionId: string, prompt: string, response: string, feedback?: number) =>
      ipcRenderer.invoke('monitor:recordInteraction', sessionId, prompt, response, feedback),
  },

  // LEO AI (Self-Improving Learning System)
  leoai: {
    // Lifecycle
    enable: () => ipcRenderer.invoke('leoai:enable'),
    disable: () => ipcRenderer.invoke('leoai:disable'),
    getStatus: () => ipcRenderer.invoke('leoai:status'),

    // Session registration
    registerSession: (context: {
      sessionId: string;
      sessionName: string;
      projectId?: string;
      workingDir: string;
      repoUrl?: string;
      language?: string;
    }) => ipcRenderer.invoke('leoai:registerSession', context),

    // Interaction recording
    recordInteraction: (
      sessionId: string,
      prompt: string,
      response: string,
      metadata?: { filesModified?: string[]; outcome?: string; feedback?: number }
    ) => ipcRenderer.invoke('leoai:recordInteraction', sessionId, prompt, response, metadata),

    recordFeedback: (
      sessionId: string,
      signal: { type: string; value: number; context?: string }
    ) => ipcRenderer.invoke('leoai:recordFeedback', sessionId, signal),

    // Context retrieval
    getContext: (request?: {
      prompt?: string;
      projectId?: string;
      language?: string;
      tags?: string[];
      errors?: string[];
    }) => ipcRenderer.invoke('leoai:getContext', request),

    getQuickContext: (projectId?: string, language?: string) =>
      ipcRenderer.invoke('leoai:getQuickContext', projectId, language),

    getErrorContext: (errors: string[], language?: string) =>
      ipcRenderer.invoke('leoai:getErrorContext', errors, language),

    // Analysis
    analyze: () => ipcRenderer.invoke('leoai:analyze'),

    // Stats & data
    getStats: () => ipcRenderer.invoke('leoai:stats'),
    getInteractions: (limit?: number) => ipcRenderer.invoke('leoai:getInteractions', limit),
    getPatterns: (minConfidence?: number) => ipcRenderer.invoke('leoai:getPatterns', minConfidence),
    getInsights: (limit?: number) => ipcRenderer.invoke('leoai:getInsights', limit),
    searchSnippets: (query: string) => ipcRenderer.invoke('leoai:searchSnippets', query),
    getLearningEvents: (since: number) => ipcRenderer.invoke('leoai:getLearningEvents', since),
  },

  // Context Injection (applies LEO AI learned knowledge to prompts)
  context: {
    getForPrompt: (options: { prompt: string; projectId?: string; language?: string; sessionId?: string }) =>
      ipcRenderer.invoke('context:getForPrompt', options),
    getForErrors: (errors: string[], language?: string) =>
      ipcRenderer.invoke('context:getForErrors', errors, language),
    enable: () => ipcRenderer.invoke('context:enable'),
    disable: () => ipcRenderer.invoke('context:disable'),
    getConfig: () => ipcRenderer.invoke('context:getConfig'),
    setConfig: (config: { enabled?: boolean; maxTokens?: number; includePatterns?: boolean; includeSnippets?: boolean; includeWarnings?: boolean }) =>
      ipcRenderer.invoke('context:setConfig', config),
  },

  // AI Service (Claude Code CLI + Ollama + other providers)
  ai: {
    // Health checks
    checkProviders: () => ipcRenderer.invoke('ai:checkProviders'),
    checkOllama: () => ipcRenderer.invoke('ai:checkOllama'),
    checkClaude: () => ipcRenderer.invoke('ai:checkClaude'),

    // Ollama specific
    listOllamaModels: () => ipcRenderer.invoke('ai:listOllamaModels'),
    setOllamaUrl: (url: string) => ipcRenderer.invoke('ai:setOllamaUrl', url),

    // AI calls
    call: (options: {
      provider: 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local';
      model?: string;
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }) => ipcRenderer.invoke('ai:call', options),

    quickPrompt: (
      provider: 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local',
      prompt: string,
      model?: string
    ) => ipcRenderer.invoke('ai:quickPrompt', provider, prompt, model),

    // Cost calculation
    calculateCost: (
      provider: 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local',
      model: string,
      inputTokens: number,
      outputTokens: number
    ) => ipcRenderer.invoke('ai:calculateCost', provider, model, inputTokens, outputTokens),
  },

  // Cross-Session Awareness
  crossSession: {
    // Session registration
    register: (sessionId: string, sessionName: string, workingDir: string, projectId?: string) =>
      ipcRenderer.invoke('crosssession:register', sessionId, sessionName, workingDir, projectId),
    unregister: (sessionId: string) =>
      ipcRenderer.invoke('crosssession:unregister', sessionId),

    // Activity tracking
    updateActivity: (sessionId: string, updates: { currentTask?: string; status?: string; tags?: string[] }) =>
      ipcRenderer.invoke('crosssession:updateActivity', sessionId, updates),
    recordFile: (sessionId: string, filePath: string) =>
      ipcRenderer.invoke('crosssession:recordFile', sessionId, filePath),
    recordError: (sessionId: string, error: string) =>
      ipcRenderer.invoke('crosssession:recordError', sessionId, error),
    recordErrorResolved: (sessionId: string, error: string, solution: string) =>
      ipcRenderer.invoke('crosssession:recordErrorResolved', sessionId, error, solution),

    // Context and suggestions
    getContext: (sessionId: string) =>
      ipcRenderer.invoke('crosssession:getContext', sessionId),
    getSuggestions: (sessionId: string) =>
      ipcRenderer.invoke('crosssession:getSuggestions', sessionId),
    dismissSuggestion: (suggestionId: string) =>
      ipcRenderer.invoke('crosssession:dismissSuggestion', suggestionId),

    // Activity feed
    getActivityFeed: () =>
      ipcRenderer.invoke('crosssession:getActivityFeed'),
    getActiveSessions: () =>
      ipcRenderer.invoke('crosssession:getActiveSessions'),
    getSession: (sessionId: string) =>
      ipcRenderer.invoke('crosssession:getSession', sessionId),
  },

  // App info
  platform: process.platform,
  version: '0.1.0',
});

// Type definitions for renderer
declare global {
  interface Window {
    flowrider: {
      tmux: {
        create: (name: string, faceIndex: number, workingDir: string) => Promise<unknown>;
        list: () => Promise<unknown>;
        kill: (sessionName: string) => Promise<unknown>;
        sendInput: (sessionName: string, data: string) => Promise<unknown>;
        getOutput: (sessionName: string, lines?: number) => Promise<unknown>;
        rename: (oldName: string, newName: string) => Promise<unknown>;
      };
      git: {
        detectRepo: (workingDir: string) => Promise<unknown>;
      };
      dialog: {
        openDirectory: () => Promise<{ success: boolean; path?: string; canceled?: boolean; error?: string }>;
      };
      project: {
        getProjects: () => Promise<unknown>;
        createProject: (data: unknown) => Promise<unknown>;
        assignSession: (sessionId: string, projectId: string) => Promise<unknown>;
      };
      costs: {
        getSessionCost: (sessionId: string) => Promise<unknown>;
        getProjectCost: (projectId: string) => Promise<unknown>;
        getTotalCost: () => Promise<unknown>;
      };
      leo: {
        enable: () => Promise<{ success: boolean; error?: string }>;
        disable: () => Promise<{ success: boolean }>;
        getStatus: () => Promise<unknown>;
        getFlowriders: () => Promise<{ success: boolean; data: unknown[] }>;
        discover: () => Promise<{ success: boolean; count: number }>;
        ping: (flowriderId: string) => Promise<{ success: boolean; latency?: number }>;
        getRemoteSessions: (flowriderId: string) => Promise<unknown>;
        getSelfInfo: () => Promise<{ success: boolean; data: unknown }>;
      };
      leoai: {
        // Lifecycle
        enable: () => Promise<{ success: boolean }>;
        disable: () => Promise<{ success: boolean }>;
        getStatus: () => Promise<{ success: boolean; data: LeoAIStatus }>;

        // Session registration
        registerSession: (context: {
          sessionId: string;
          sessionName: string;
          projectId?: string;
          workingDir: string;
          repoUrl?: string;
          language?: string;
        }) => Promise<{ success: boolean }>;

        // Interaction recording
        recordInteraction: (
          sessionId: string,
          prompt: string,
          response: string,
          metadata?: { filesModified?: string[]; outcome?: string; feedback?: number }
        ) => Promise<{ success: boolean; id: string }>;

        recordFeedback: (
          sessionId: string,
          signal: { type: string; value: number; context?: string }
        ) => Promise<{ success: boolean }>;

        // Context retrieval
        getContext: (request?: {
          prompt?: string;
          projectId?: string;
          language?: string;
          tags?: string[];
          errors?: string[];
        }) => Promise<{ success: boolean; data: DistilledContext }>;

        getQuickContext: (projectId?: string, language?: string) => Promise<{ success: boolean; data: string }>;
        getErrorContext: (errors: string[], language?: string) => Promise<{ success: boolean; data: string }>;

        // Analysis
        analyze: () => Promise<{ success: boolean; data: AnalysisResult }>;

        // Stats & data
        getStats: () => Promise<{ success: boolean; data: LeoStats }>;
        getInteractions: (limit?: number) => Promise<{ success: boolean; data: Interaction[] }>;
        getPatterns: (minConfidence?: number) => Promise<{ success: boolean; data: Pattern[] }>;
        getInsights: (limit?: number) => Promise<{ success: boolean; data: Insight[] }>;
        searchSnippets: (query: string) => Promise<{ success: boolean; data: CodeSnippet[] }>;
        getLearningEvents: (since: number) => Promise<{ success: boolean; data: LearningEvent[] }>;
      };
      context: {
        getForPrompt: (options: { prompt: string; projectId?: string; language?: string; sessionId?: string }) =>
          Promise<{ success: boolean; data: string | null }>;
        getForErrors: (errors: string[], language?: string) =>
          Promise<{ success: boolean; data: string | null }>;
        enable: () => Promise<{ success: boolean }>;
        disable: () => Promise<{ success: boolean }>;
        getConfig: () => Promise<{ success: boolean; data: ContextInjectionConfig }>;
        setConfig: (config: Partial<ContextInjectionConfig>) => Promise<{ success: boolean }>;
      };
      ai: {
        checkProviders: () => Promise<{ success: boolean; data: ProviderHealth[] }>;
        checkOllama: () => Promise<{ success: boolean; data: ProviderHealth }>;
        checkClaude: () => Promise<{ success: boolean; data: ProviderHealth }>;
        listOllamaModels: () => Promise<{ success: boolean; data?: OllamaModel[]; error?: string }>;
        setOllamaUrl: (url: string) => Promise<{ success: boolean }>;
        call: (options: AICallOptions) => Promise<AICallResult>;
        quickPrompt: (
          provider: AIProviderType,
          prompt: string,
          model?: string
        ) => Promise<AICallResult>;
        calculateCost: (
          provider: AIProviderType,
          model: string,
          inputTokens: number,
          outputTokens: number
        ) => Promise<{ success: boolean; data: number }>;
      };
      platform: string;
      version: string;
    };
  }

  interface ContextInjectionConfig {
    enabled: boolean;
    maxTokens: number;
    includePatterns: boolean;
    includeSnippets: boolean;
    includeWarnings: boolean;
  }

  // LEO AI Types (for type-safety in renderer)
  interface LeoAIStatus {
    enabled: boolean;
    learning: boolean;
    stats: LeoStats;
    lastAnalysis: number | null;
    config: {
      analysisInterval: number;
      minInteractionsForAnalysis: number;
      autoLearn: boolean;
      defaultVerbosity: 'minimal' | 'normal' | 'detailed';
    };
  }

  interface LeoStats {
    totalInteractions: number;
    totalPatterns: number;
    totalInsights: number;
    totalSnippets: number;
    avgConfidence: number;
    topLanguages: string[];
    topProjects: string[];
  }

  interface Interaction {
    id: string;
    sessionId: string;
    timestamp: number;
    prompt: string;
    promptHash: string;
    response: string;
    tags: string[];
    outcome: 'success' | 'failure' | 'partial' | 'unknown';
    feedback: number;
    projectId?: string;
    language?: string;
    filesModified: string[];
    errorsSeen: string[];
    codeBlocks: string[];
  }

  interface Pattern {
    id: string;
    type: 'error' | 'code' | 'workflow' | 'prompt';
    pattern: string;
    frequency: number;
    confidence: number;
    examples: string[];
    resolution?: string;
    tags: string[];
    language?: string;
    createdAt: number;
    lastSeen: number;
  }

  interface Insight {
    id: string;
    category: string;
    content: string;
    confidence: number;
    sourcePatterns: string[];
    applicableTags: string[];
    applicableLanguages: string[];
    effectiveness: number;
    usageCount: number;
    createdAt: number;
    lastUsed: number;
  }

  interface CodeSnippet {
    id: string;
    language: string;
    code: string;
    description: string;
    tags: string[];
    sourceInteraction: string;
    quality: number;
    usageCount: number;
    createdAt: number;
  }

  interface LearningEvent {
    id: string;
    type: string;
    data: unknown;
    timestamp: number;
  }

  interface DistilledContext {
    systemPrompt: string;
    relevantPatterns: Pattern[];
    suggestedSnippets: CodeSnippet[];
    warnings: string[];
    successPatterns: string[];
    tokenEstimate: number;
  }

  interface AnalysisResult {
    patternsFound: number;
    insightsGenerated: number;
    snippetsExtracted: number;
    duration: number;
    errors: string[];
  }

  // AI Service Types
  type AIProviderType = 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local';

  interface AIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
  }

  interface AICallOptions {
    provider: AIProviderType;
    model?: string;
    messages: AIMessage[];
    maxTokens?: number;
    temperature?: number;
    systemPrompt?: string;
  }

  interface AICallResult {
    success: boolean;
    content?: string;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    cost?: number;
    model?: string;
    provider: AIProviderType;
    error?: string;
    duration?: number;
  }

  interface ProviderHealth {
    provider: AIProviderType;
    available: boolean;
    version?: string;
    models?: string[];
    error?: string;
  }

  interface OllamaModel {
    name: string;
    modified_at: string;
    size: number;
    digest: string;
  }
}
