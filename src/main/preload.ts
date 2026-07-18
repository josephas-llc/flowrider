import { contextBridge, ipcRenderer } from 'electron';

// Expose protected APIs to renderer
contextBridge.exposeInMainWorld('flowrider', {
  // Tmux session management
  tmux: {
    create: (name: string, faceIndex: number, workingDir: string, options?: { setupCommand?: string; skipClaude?: boolean; cols?: number; rows?: number }) =>
      ipcRenderer.invoke('tmux:create', name, faceIndex, workingDir, options),
    list: () => ipcRenderer.invoke('tmux:list'),
    kill: (sessionName: string) => ipcRenderer.invoke('tmux:kill', sessionName),
    sendInput: (sessionName: string, data: string) =>
      ipcRenderer.invoke('tmux:input', sessionName, data),
    // Alias for sendInput (used by ProjectsPanel)
    sendKeys: (sessionName: string, data: string) =>
      ipcRenderer.invoke('tmux:input', sessionName, data),
    // Send a command with Enter key (non-literal mode for shell commands)
    sendCommand: (sessionName: string, command: string) =>
      ipcRenderer.invoke('tmux:command', sessionName, command),
    getOutput: (sessionName: string, lines?: number) =>
      ipcRenderer.invoke('tmux:output', sessionName, lines),
    rename: (oldName: string, newName: string) =>
      ipcRenderer.invoke('tmux:rename', oldName, newName),
    // Resize tmux session to match terminal dimensions
    resize: (sessionName: string, cols: number, rows: number) =>
      ipcRenderer.invoke('tmux:resize', sessionName, cols, rows),
  },

  // Git/GitHub integration
  git: {
    detectRepo: (workingDir: string) => ipcRenderer.invoke('git:detect', workingDir),
  },

  // Dialog functions
  dialog: {
    openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  },

  // Filesystem utilities
  fs: {
    findLocalRepo: (repoName: string) => ipcRenderer.invoke('fs:findLocalRepo', repoName),
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

  // Session Monitor (auto-captures interactions for AI System)
  monitor: {
    start: (sessionName: string, sessionId: string, workingDir: string, projectId?: string, language?: string) =>
      ipcRenderer.invoke('monitor:start', sessionName, sessionId, workingDir, projectId, language),
    stop: (sessionName: string) => ipcRenderer.invoke('monitor:stop', sessionName),
    list: () => ipcRenderer.invoke('monitor:list'),
    isMonitoring: (sessionName: string) => ipcRenderer.invoke('monitor:isMonitoring', sessionName),
    recordInteraction: (sessionId: string, prompt: string, response: string, feedback?: number) =>
      ipcRenderer.invoke('monitor:recordInteraction', sessionId, prompt, response, feedback),
  },

  // AI System (Self-Improving Learning System)
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

    // Suggestions (Intelligence Layer)
    getSuggestions: (request?: {
      sessionId?: string;
      projectId?: string;
      workingDir?: string;
      language?: string;
      currentTask?: string;
      recentErrors?: string[];
      aiProvider?: string;
      limit?: number;
    }) => ipcRenderer.invoke('leoai:getSuggestions', request),
    getAISuggestions: (request?: {
      sessionId?: string;
      projectId?: string;
      workingDir?: string;
      language?: string;
      currentTask?: string;
      recentErrors?: string[];
      aiProvider?: string;
      limit?: number;
    }) => ipcRenderer.invoke('leoai:getAISuggestions', request),
    setAISuggestionsEnabled: (enabled: boolean) =>
      ipcRenderer.invoke('leoai:setAISuggestionsEnabled', enabled),
    getSessionStartSuggestions: (workingDir: string, projectId?: string, language?: string) =>
      ipcRenderer.invoke('leoai:getSessionStartSuggestions', workingDir, projectId, language),
    getErrorSuggestions: (errors: string[], language?: string) =>
      ipcRenderer.invoke('leoai:getErrorSuggestions', errors, language),
    dismissSuggestion: (suggestionId: string) =>
      ipcRenderer.invoke('leoai:dismissSuggestion', suggestionId),
    recordSuggestionAction: (suggestionId: string, accepted: boolean) =>
      ipcRenderer.invoke('leoai:recordSuggestionAction', suggestionId, accepted),
    clearDismissedSuggestions: () => ipcRenderer.invoke('leoai:clearDismissedSuggestions'),
  },

  // Context Injection (applies AI System learned knowledge to prompts)
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

    // API key management
    setApiKey: (provider: 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local', key: string) =>
      ipcRenderer.invoke('ai:setApiKey', provider, key),
    getApiKey: (provider: 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local') =>
      ipcRenderer.invoke('ai:getApiKey', provider),
    getApiKeys: () => ipcRenderer.invoke('ai:getApiKeys'),

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

  // Deployment (GitHub/Vercel CI/CD integration)
  deploy: {
    // Health & availability
    isAvailable: () => ipcRenderer.invoke('deploy:isAvailable'),

    // Repositories
    listRepos: () => ipcRenderer.invoke('deploy:listRepos'),

    // Workflow runs
    listWorkflowRuns: (repo: string, limit?: number) =>
      ipcRenderer.invoke('deploy:listWorkflowRuns', repo, limit),
    getWorkflowLogs: (repo: string, runId: number) =>
      ipcRenderer.invoke('deploy:getWorkflowLogs', repo, runId),
    rerunWorkflow: (repo: string, runId: number) =>
      ipcRenderer.invoke('deploy:rerunWorkflow', repo, runId),
    triggerWorkflow: (repo: string, workflow: string, ref?: string) =>
      ipcRenderer.invoke('deploy:triggerWorkflow', repo, workflow, ref),

    // Releases
    listReleases: (repo: string, limit?: number) =>
      ipcRenderer.invoke('deploy:listReleases', repo, limit),
    createRelease: (repo: string, tagName: string, title: string, notes?: string, draft?: boolean, prerelease?: boolean) =>
      ipcRenderer.invoke('deploy:createRelease', repo, tagName, title, notes, draft, prerelease),

    // Pull requests
    listPRs: (repo: string, state?: 'open' | 'closed' | 'all') =>
      ipcRenderer.invoke('deploy:listPRs', repo, state),
    mergePR: (repo: string, prNumber: number, method?: 'merge' | 'squash' | 'rebase') =>
      ipcRenderer.invoke('deploy:mergePR', repo, prNumber, method),

    // Org overview
    getOrgStatus: () => ipcRenderer.invoke('deploy:getOrgStatus'),

    // LEO learning data
    getHistory: (limit?: number) => ipcRenderer.invoke('deploy:getHistory', limit),
    getStats: () => ipcRenderer.invoke('deploy:getStats'),
    getPatterns: () => ipcRenderer.invoke('deploy:getPatterns'),
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

  // License management (Lemon Squeezy)
  license: {
    activate: (licenseKey: string) => ipcRenderer.invoke('license:activate', licenseKey),
    validate: () => ipcRenderer.invoke('license:validate'),
    deactivate: () => ipcRenderer.invoke('license:deactivate'),
    get: () => ipcRenderer.invoke('license:get'),
    canCreateSession: (currentCount: number) => ipcRenderer.invoke('license:canCreateSession', currentCount),
    getSessionLimit: () => ipcRenderer.invoke('license:getSessionLimit'),
  },

  // Auto-update
  update: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    install: () => ipcRenderer.invoke('update:install'),
    getStatus: () => ipcRenderer.invoke('update:status'),
    getVersion: () => ipcRenderer.invoke('update:version'),
    onStatusChange: (callback: (status: UpdateStatus) => void) => {
      const listener = (_event: unknown, status: UpdateStatus) => callback(status);
      ipcRenderer.on('update:status-changed', listener);
      return () => ipcRenderer.removeListener('update:status-changed', listener);
    },
  },

  // Template management
  templates: {
    list: () => ipcRenderer.invoke('templates:list'),
    get: (id: string) => ipcRenderer.invoke('templates:get', id),
    save: (template: unknown) => ipcRenderer.invoke('templates:save', template),
    delete: (id: string) => ipcRenderer.invoke('templates:delete', id),
    getByCategory: (category: string) => ipcRenderer.invoke('templates:getByCategory', category),
  },

  // API server management
  api: {
    getStatus: () => ipcRenderer.invoke('api:getStatus'),
    start: () => ipcRenderer.invoke('api:start'),
    stop: () => ipcRenderer.invoke('api:stop'),
    getConfig: () => ipcRenderer.invoke('api:getConfig'),
    setConfig: (config: unknown) => ipcRenderer.invoke('api:setConfig', config),
  },

  // Cursor IDE integration
  cursor: {
    open: (workingDir: string) => ipcRenderer.invoke('cursor:open', workingDir),
    checkInstalled: () => ipcRenderer.invoke('cursor:check'),
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
        create: (name: string, faceIndex: number, workingDir: string, options?: { setupCommand?: string; skipClaude?: boolean; cols?: number; rows?: number }) => Promise<unknown>;
        list: () => Promise<unknown>;
        kill: (sessionName: string) => Promise<unknown>;
        sendInput: (sessionName: string, data: string) => Promise<unknown>;
        sendKeys: (sessionName: string, data: string) => Promise<unknown>;
        sendCommand: (sessionName: string, command: string) => Promise<unknown>;
        getOutput: (sessionName: string, lines?: number) => Promise<unknown>;
        rename: (oldName: string, newName: string) => Promise<unknown>;
        resize: (sessionName: string, cols: number, rows: number) => Promise<unknown>;
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
        getStatus: () => Promise<{ success: boolean; data: AICoreStatus }>;

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
        getStats: () => Promise<{ success: boolean; data: AIStats }>;
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
        setApiKey: (provider: AIProviderType, key: string) => Promise<{ success: boolean; error?: string }>;
        getApiKey: (provider: AIProviderType) => Promise<{ success: boolean; data?: string; error?: string }>;
        getApiKeys: () => Promise<{ success: boolean; data?: Record<AIProviderType, string | undefined>; error?: string }>;
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
      deploy: {
        isAvailable: () => Promise<{ success: boolean; available: boolean; error?: string }>;
        listRepos: () => Promise<{ success: boolean; data?: DeployRepository[]; error?: string }>;
        listWorkflowRuns: (repo: string, limit?: number) => Promise<{ success: boolean; data?: DeployWorkflowRun[]; error?: string }>;
        getWorkflowLogs: (repo: string, runId: number) => Promise<{ success: boolean; data?: string; error?: string }>;
        rerunWorkflow: (repo: string, runId: number) => Promise<{ success: boolean; error?: string }>;
        triggerWorkflow: (repo: string, workflow: string, ref?: string) => Promise<{ success: boolean; error?: string }>;
        listReleases: (repo: string, limit?: number) => Promise<{ success: boolean; data?: DeployRelease[]; error?: string }>;
        createRelease: (repo: string, tagName: string, title: string, notes?: string, draft?: boolean, prerelease?: boolean) => Promise<{ success: boolean; data?: DeployRelease; error?: string }>;
        listPRs: (repo: string, state?: 'open' | 'closed' | 'all') => Promise<{ success: boolean; data?: DeployPullRequest[]; error?: string }>;
        mergePR: (repo: string, prNumber: number, method?: 'merge' | 'squash' | 'rebase') => Promise<{ success: boolean; error?: string }>;
        getOrgStatus: () => Promise<{ success: boolean; data?: DeployOrgStatus; error?: string }>;
        getHistory: (limit?: number) => Promise<{ success: boolean; data?: DeployEvent[]; error?: string }>;
        getStats: () => Promise<{ success: boolean; data?: DeployStats; error?: string }>;
        getPatterns: () => Promise<{ success: boolean; data?: DeployPatterns; error?: string }>;
      };
      crossSession?: {
        register: (sessionId: string, sessionName: string, workingDir: string, projectId?: string) => Promise<{ success: boolean }>;
        unregister: (sessionId: string) => Promise<{ success: boolean }>;
        updateActivity: (sessionId: string, updates: { currentTask?: string; status?: string; tags?: string[] }) => Promise<{ success: boolean }>;
        recordFile: (sessionId: string, filePath: string) => Promise<{ success: boolean }>;
        recordError: (sessionId: string, error: string) => Promise<{ success: boolean }>;
        recordErrorResolved: (sessionId: string, error: string, solution: string) => Promise<{ success: boolean }>;
        getContext: (sessionId: string) => Promise<{ success: boolean; data?: unknown }>;
        getSuggestions: (sessionId: string) => Promise<{ success: boolean; data?: unknown[] }>;
        dismissSuggestion: (suggestionId: string) => Promise<{ success: boolean }>;
        getActivityFeed: () => Promise<{ success: boolean; data?: unknown[] }>;
        getActiveSessions: () => Promise<{ success: boolean; data?: unknown[] }>;
        getSession: (sessionId: string) => Promise<{ success: boolean; data?: unknown }>;
      };
      license: {
        activate: (licenseKey: string) => Promise<{ success: boolean; error?: string; license?: LicenseInfo }>;
        validate: () => Promise<{ success: boolean; error?: string; license?: LicenseInfo }>;
        deactivate: () => Promise<{ success: boolean; error?: string }>;
        get: () => Promise<{ success: boolean; license: LicenseInfo }>;
        canCreateSession: (currentCount: number) => Promise<{ success: boolean; allowed: boolean }>;
        getSessionLimit: () => Promise<{ success: boolean; limit: number }>;
      };
      update: {
        check: () => Promise<{ success: boolean; updateInfo?: unknown }>;
        download: () => Promise<{ success: boolean; error?: string }>;
        install: () => void;
        getStatus: () => Promise<UpdateStatus>;
        getVersion: () => Promise<string>;
        onStatusChange: (callback: (status: UpdateStatus) => void) => () => void;
      };
      templates: {
        list: () => Promise<{ success: boolean; data?: SessionTemplate[]; error?: string }>;
        get: (id: string) => Promise<{ success: boolean; data?: SessionTemplate; error?: string }>;
        save: (template: unknown) => Promise<{ success: boolean; id?: string; error?: string }>;
        delete: (id: string) => Promise<{ success: boolean; error?: string }>;
        getByCategory: (category: string) => Promise<{ success: boolean; data?: SessionTemplate[]; error?: string }>;
      };
      api: {
        getStatus: () => Promise<{ success: boolean; data?: ApiStatus; error?: string }>;
        start: () => Promise<{ success: boolean; data?: ApiStatus; error?: string }>;
        stop: () => Promise<{ success: boolean; data?: { running: boolean }; error?: string }>;
        getConfig: () => Promise<{ success: boolean; data?: ApiConfig; error?: string }>;
        setConfig: (config: Partial<ApiConfig>) => Promise<{ success: boolean; data?: ApiConfig; error?: string }>;
      };
      cursor: {
        open: (workingDir: string) => Promise<{ success: boolean; error?: string }>;
        checkInstalled: () => Promise<{ installed: boolean }>;
      };
      platform: string;
      version: string;
    };
  }

  // Template types
  type AIProvider = 'claude-code' | 'ollama' | 'custom';
  type TemplateCategory = 'development' | 'research' | 'writing' | 'custom';

  interface SessionTemplate {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: TemplateCategory;
    config: {
      aiProvider: AIProvider;
      aiModel?: string;
      workingDir?: string;
      notes?: string;
    };
    isBuiltIn: boolean;
    createdAt: number;
    updatedAt: number;
  }

  // Update types
  interface UpdateStatus {
    status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error';
    version?: string;
    releaseNotes?: string;
    progress?: number;
    error?: string;
  }

  // License types
  type LicenseTier = 'free' | 'pro' | 'team' | 'enterprise';

  interface LicenseInfo {
    tier: LicenseTier;
    maxSessions: number;
    licenseKey: string | null;
    customerEmail: string | null;
    customerName: string | null;
    productName: string | null;
    expiresAt: string | null;
    isValid: boolean;
    lastValidated: string;
    instanceId: string | null;
  }

  interface ContextInjectionConfig {
    enabled: boolean;
    maxTokens: number;
    includePatterns: boolean;
    includeSnippets: boolean;
    includeWarnings: boolean;
  }

  // AI System Types (for type-safety in renderer)
  interface AICoreStatus {
    enabled: boolean;
    learning: boolean;
    stats: AIStats;
    lastAnalysis: number | null;
    config: {
      analysisInterval: number;
      minInteractionsForAnalysis: number;
      autoLearn: boolean;
      defaultVerbosity: 'minimal' | 'normal' | 'detailed';
    };
  }

  interface AIStats {
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

  // Deployment Types
  interface DeployRepository {
    name: string;
    fullName: string;
    description: string;
    isPrivate: boolean;
    defaultBranch: string;
    url: string;
    pushedAt: string;
    language: string;
  }

  interface DeployWorkflowRun {
    id: number;
    name: string;
    status: 'queued' | 'in_progress' | 'completed';
    conclusion: 'success' | 'failure' | 'cancelled' | 'skipped' | 'timed_out' | null;
    branch: string;
    event: string;
    createdAt: string;
    updatedAt: string;
    url: string;
    actor: string;
  }

  interface DeployRelease {
    id: number;
    tagName: string;
    name: string;
    body: string;
    draft: boolean;
    prerelease: boolean;
    createdAt: string;
    publishedAt: string;
    url: string;
    author: string;
    assets: Array<{
      name: string;
      size: number;
      downloadCount: number;
      downloadUrl: string;
    }>;
  }

  interface DeployPullRequest {
    number: number;
    title: string;
    state: 'open' | 'closed' | 'merged';
    author: string;
    createdAt: string;
    updatedAt: string;
    url: string;
    baseBranch: string;
    headBranch: string;
    mergeable: boolean;
    labels: string[];
  }

  interface DeployOrgStatus {
    org: string;
    repos: Array<{
      name: string;
      lastPush: string;
      openPRs: number;
      activeWorkflows: number;
    }>;
    totalRepos: number;
    totalOpenPRs: number;
    activeWorkflows: number;
  }

  interface DeployEvent {
    id: string;
    type: 'workflow' | 'release' | 'pr' | 'deploy';
    repo: string;
    action: string;
    success: boolean;
    timestamp: number;
    duration?: number;
    details?: string;
    actor?: string;
  }

  interface DeployStats {
    totalDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    averageDuration: number;
    deploymentsByRepo: Record<string, number>;
    deploymentsByDay: Record<string, number>;
    mostActiveRepo: string;
    lastDeployment: number | null;
  }

  interface DeployPatterns {
    commonFailures: Array<{ pattern: string; count: number; repos: string[] }>;
    deploymentFrequency: { daily: number; weekly: number; monthly: number };
    successfulWorkflows: Array<{ name: string; successRate: number; avgDuration: number }>;
    peakDeploymentTimes: Array<{ hour: number; count: number }>;
  }

  // API Server Types
  interface ApiConfig {
    port: number;
    enabled: boolean;
    allowRemote: boolean;
    apiKeyRequired: boolean;
  }

  interface ApiStatus {
    running: boolean;
    port: number;
    url: string | null;
  }
}
