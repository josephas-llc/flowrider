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
    readDirectory: (dirPath: string) => ipcRenderer.invoke('fs:readDirectory', dirPath),
    readFile: (filePath: string, maxBytes?: number) => ipcRenderer.invoke('fs:readFile', filePath, maxBytes),
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

  // Fleet Management (multi-instance orchestration, formerly LEO)
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
    getAllPatterns: () => ipcRenderer.invoke('leoai:getAllPatterns'),
    getPatternsByType: (type: 'code' | 'error' | 'workflow' | 'prompt' | 'architecture') =>
      ipcRenderer.invoke('leoai:getPatternsByType', type),
    getPatternCounts: () => ipcRenderer.invoke('leoai:getPatternCounts'),
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

  // ZOIX Context Memory (Long-term memory and context tracking)
  zoix: {
    startSession: (sessionId: string, sessionName: string, projectId?: string) =>
      ipcRenderer.invoke('zoix:startSession', sessionId, sessionName, projectId),
    endSession: (sessionId: string, summary?: unknown) =>
      ipcRenderer.invoke('zoix:endSession', sessionId, summary),
    getSessionSummary: (sessionId: string) =>
      ipcRenderer.invoke('zoix:getSessionSummary', sessionId),
    getDailyDigest: (date?: string) =>
      ipcRenderer.invoke('zoix:getDailyDigest', date),
    getRecentDigests: (days?: number) =>
      ipcRenderer.invoke('zoix:getRecentDigests', days),
    updateProjectContext: (projectId: string, projectName: string, updates: unknown) =>
      ipcRenderer.invoke('zoix:updateProjectContext', projectId, projectName, updates),
    getProjectContext: (projectId: string) =>
      ipcRenderer.invoke('zoix:getProjectContext', projectId),
    getRecentProjects: (limit?: number) =>
      ipcRenderer.invoke('zoix:getRecentProjects', limit),
    getUnfinishedTasks: (projectId?: string, status?: string) =>
      ipcRenderer.invoke('zoix:getUnfinishedTasks', projectId, status),
    saveUnfinishedTask: (task: unknown) =>
      ipcRenderer.invoke('zoix:saveUnfinishedTask', task),
    completeTask: (taskId: string) =>
      ipcRenderer.invoke('zoix:completeTask', taskId),
    getInferredGoals: (status?: string) =>
      ipcRenderer.invoke('zoix:getInferredGoals', status),
    saveInferredGoal: (goal: unknown) =>
      ipcRenderer.invoke('zoix:saveInferredGoal', goal),
    updateInferredGoal: (id: string, updates: unknown) =>
      ipcRenderer.invoke('zoix:updateInferredGoal', id, updates),
    getWeeklyTheme: (weekStart?: string) =>
      ipcRenderer.invoke('zoix:getWeeklyTheme', weekStart),
    getRecentWeeks: (count?: number) =>
      ipcRenderer.invoke('zoix:getRecentWeeks', count),
    updateWeeklyTheme: (weekStart: string, updates: unknown) =>
      ipcRenderer.invoke('zoix:updateWeeklyTheme', weekStart, updates),
    restoreContext: (sessionId: string, projectId?: string) =>
      ipcRenderer.invoke('zoix:restoreContext', sessionId, projectId),

    // Resource Recommendations
    getRecommendedResources: (options?: {
      topic?: string;
      language?: string;
      type?: 'book' | 'documentation' | 'tutorial' | 'article' | 'course' | 'video';
      includeReasoning?: boolean;
    }) => ipcRenderer.invoke('zoix:getRecommendedResources', options),
    getRecommendedBooks: (topic?: string, language?: string) =>
      ipcRenderer.invoke('zoix:getRecommendedBooks', topic, language),
    getRelevantDocs: (language?: string, topic?: string) =>
      ipcRenderer.invoke('zoix:getRelevantDocs', language, topic),
    recordResourceClick: (recommendationId: string) =>
      ipcRenderer.invoke('zoix:recordResourceClick', recommendationId),

    // Ontology Builder
    getOntology: () => ipcRenderer.invoke('zoix:getOntology'),
    getOntologyBranch: (nodeId: string) => ipcRenderer.invoke('zoix:getOntologyBranch', nodeId),
    exportOntology: (format?: 'json' | 'graph') => ipcRenderer.invoke('zoix:exportOntology', format),
    getOntologyGrowth: (period?: 'day' | 'week' | 'month') => ipcRenderer.invoke('zoix:getOntologyGrowth', period),
    getOntologyGrowthStats: () => ipcRenderer.invoke('zoix:getOntologyGrowthStats'),
    createOntologySnapshot: () => ipcRenderer.invoke('zoix:createOntologySnapshot'),
    compareOntologyToStandard: (standard: 'standard-fullstack' | 'standard-frontend' | 'standard-backend' | 'standard-devops') =>
      ipcRenderer.invoke('zoix:compareOntologyToStandard', standard),
    addOntologyNode: (name: string, type: string, parentId?: string, options?: unknown) =>
      ipcRenderer.invoke('zoix:addOntologyNode', name, type, parentId, options),
    autoOrganizeConcept: (conceptName: string, context?: unknown) =>
      ipcRenderer.invoke('zoix:autoOrganizeConcept', conceptName, context),
    getOntologyNode: (id: string) => ipcRenderer.invoke('zoix:getOntologyNode', id),
    findOntologyNodeByName: (name: string) => ipcRenderer.invoke('zoix:findOntologyNodeByName', name),
    searchOntology: (query: string) => ipcRenderer.invoke('zoix:searchOntology', query),
    addOntologyRelation: (fromId: string, toId: string, relationType: string, options?: unknown) =>
      ipcRenderer.invoke('zoix:addOntologyRelation', fromId, toId, relationType, options),

    // ZOIX Intelligence (insights, skill progression, cross-session recommendations)
    generateInsights: () => ipcRenderer.invoke('zoix:generateInsights'),
    getPendingInsights: () => ipcRenderer.invoke('zoix:getPendingInsights'),
    dismissInsight: (insightId: string) => ipcRenderer.invoke('zoix:dismissInsight', insightId),
    getIntelligenceSummary: () => ipcRenderer.invoke('zoix:getIntelligenceSummary'),
    getCrossSessionRecommendations: () => ipcRenderer.invoke('zoix:getCrossSessionRecommendations'),
    getContextualSuggestions: (context: {
      projectPath?: string;
      currentFiles?: string[];
      recentCommands?: string[];
    }) => ipcRenderer.invoke('zoix:getContextualSuggestions', context),
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
    setApiKey: (provider: 'zoix' | 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local', key: string) =>
      ipcRenderer.invoke('ai:setApiKey', provider, key),
    getApiKey: (provider: 'zoix' | 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local') =>
      ipcRenderer.invoke('ai:getApiKey', provider),
    getApiKeys: () => ipcRenderer.invoke('ai:getApiKeys'),

    // AI calls
    call: (options: {
      provider: 'zoix' | 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local';
      model?: string;
      messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
      maxTokens?: number;
      temperature?: number;
      systemPrompt?: string;
    }) => ipcRenderer.invoke('ai:call', options),

    quickPrompt: (
      provider: 'zoix' | 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local',
      prompt: string,
      model?: string
    ) => ipcRenderer.invoke('ai:quickPrompt', provider, prompt, model),

    // Cost calculation
    calculateCost: (
      provider: 'zoix' | 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local',
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

    // Cross-session analysis
    analyze: () =>
      ipcRenderer.invoke('crosssession:analyze'),
    getSimilarities: (sessionId: string) =>
      ipcRenderer.invoke('crosssession:getSimilarities', sessionId),
    getInsights: (sessionId?: string) =>
      ipcRenderer.invoke('crosssession:getInsights', sessionId),
    dismissInsight: (insightId: string) =>
      ipcRenderer.invoke('crosssession:dismissInsight', insightId),
    getSessionSummary: (sessionId: string) =>
      ipcRenderer.invoke('crosssession:getSessionSummary', sessionId),
    getStats: () =>
      ipcRenderer.invoke('crosssession:getStats'),
    clearInsights: () =>
      ipcRenderer.invoke('crosssession:clearInsights'),
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

  // PTY Streaming (replaces tmux capture-pane polling for TUI apps)
  pty: {
    attach: (sessionName: string, cols: number, rows: number) =>
      ipcRenderer.invoke('pty:attach', sessionName, cols, rows),
    detach: (sessionName: string) =>
      ipcRenderer.invoke('pty:detach', sessionName),
    write: (sessionName: string, data: string) =>
      ipcRenderer.invoke('pty:write', sessionName, data),
    resize: (sessionName: string, cols: number, rows: number) =>
      ipcRenderer.invoke('pty:resize', sessionName, cols, rows),
    isAttached: (sessionName: string) =>
      ipcRenderer.invoke('pty:isAttached', sessionName),
    // Event listeners for real-time data streaming
    onData: (callback: (sessionName: string, data: string) => void) => {
      const listener = (_event: unknown, sessionName: string, data: string) => callback(sessionName, data);
      ipcRenderer.on('pty:data', listener);
      return () => ipcRenderer.removeListener('pty:data', listener);
    },
    onExit: (callback: (sessionName: string, exitCode: number) => void) => {
      const listener = (_event: unknown, sessionName: string, exitCode: number) => callback(sessionName, exitCode);
      ipcRenderer.on('pty:exit', listener);
      return () => ipcRenderer.removeListener('pty:exit', listener);
    },
  },

  // Enterprise Billing (CFO/accounting visibility)
  billing: {
    getReport: (periodType?: string) =>
      ipcRenderer.invoke('billing:getReport', periodType),
    getProjections: () =>
      ipcRenderer.invoke('billing:getProjections'),
    getAlerts: (unacknowledgedOnly?: boolean) =>
      ipcRenderer.invoke('billing:getAlerts', unacknowledgedOnly),
    acknowledgeAlert: (alertId: string) =>
      ipcRenderer.invoke('billing:acknowledgeAlert', alertId),
    exportCSV: (periodType?: string) =>
      ipcRenderer.invoke('billing:exportCSV', periodType),
    exportJSON: (periodType?: string) =>
      ipcRenderer.invoke('billing:exportJSON', periodType),
    getROI: () =>
      ipcRenderer.invoke('billing:getROI'),
    recordProjectCost: (params: {
      projectId: string;
      projectName: string;
      cost: number;
      provider: string;
    }) => ipcRenderer.invoke('billing:recordProjectCost', params),
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
        getAllPatterns: () => Promise<{ success: boolean; data: Pattern[] }>;
        getPatternsByType: (type: 'code' | 'error' | 'workflow' | 'prompt' | 'architecture') => Promise<{ success: boolean; data: Pattern[] }>;
        getPatternCounts: () => Promise<{ success: boolean; data: { code: number; error: number; workflow: number; prompt: number; architecture: number; total: number } }>;
        getInsights: (limit?: number) => Promise<{ success: boolean; data: Insight[] }>;
        searchSnippets: (query: string) => Promise<{ success: boolean; data: CodeSnippet[] }>;
        getLearningEvents: (since: number) => Promise<{ success: boolean; data: LearningEvent[] }>;

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
        }) => Promise<{ success: boolean; data: Suggestion[] }>;
        getAISuggestions: (request?: {
          sessionId?: string;
          projectId?: string;
          workingDir?: string;
          language?: string;
          currentTask?: string;
          recentErrors?: string[];
          aiProvider?: string;
          limit?: number;
        }) => Promise<{ success: boolean; data: Suggestion[] }>;
        setAISuggestionsEnabled: (enabled: boolean) => Promise<{ success: boolean }>;
        getSessionStartSuggestions: (workingDir: string, projectId?: string, language?: string) =>
          Promise<{ success: boolean; data: Suggestion[] }>;
        getErrorSuggestions: (errors: string[], language?: string) =>
          Promise<{ success: boolean; data: Suggestion[] }>;
        dismissSuggestion: (suggestionId: string) => Promise<{ success: boolean }>;
        recordSuggestionAction: (suggestionId: string, accepted: boolean) => Promise<{ success: boolean }>;
        clearDismissedSuggestions: () => Promise<{ success: boolean }>;
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
      zoix: {
        startSession: (sessionId: string, sessionName: string, projectId?: string) => Promise<{ success: boolean; data?: string; error?: string }>;
        endSession: (sessionId: string, summary?: unknown) => Promise<{ success: boolean; error?: string }>;
        getSessionSummary: (sessionId: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
        getDailyDigest: (date?: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
        getRecentDigests: (days?: number) => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
        updateProjectContext: (projectId: string, projectName: string, updates: unknown) => Promise<{ success: boolean; error?: string }>;
        getProjectContext: (projectId: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
        getRecentProjects: (limit?: number) => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
        getUnfinishedTasks: (projectId?: string, status?: string) => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
        saveUnfinishedTask: (task: unknown) => Promise<{ success: boolean; data?: string; error?: string }>;
        completeTask: (taskId: string) => Promise<{ success: boolean; error?: string }>;
        getInferredGoals: (status?: string) => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
        saveInferredGoal: (goal: unknown) => Promise<{ success: boolean; data?: string; error?: string }>;
        updateInferredGoal: (id: string, updates: unknown) => Promise<{ success: boolean; error?: string }>;
        getWeeklyTheme: (weekStart?: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
        getRecentWeeks: (count?: number) => Promise<{ success: boolean; data?: unknown[]; error?: string }>;
        updateWeeklyTheme: (weekStart: string, updates: unknown) => Promise<{ success: boolean; error?: string }>;
        restoreContext: (sessionId: string, projectId?: string) => Promise<{ success: boolean; data?: unknown; error?: string }>;
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
      pty: {
        attach: (sessionName: string, cols: number, rows: number) => Promise<{ success: boolean; error?: string }>;
        detach: (sessionName: string) => Promise<{ success: boolean; error?: string }>;
        write: (sessionName: string, data: string) => Promise<{ success: boolean; error?: string }>;
        resize: (sessionName: string, cols: number, rows: number) => Promise<{ success: boolean; error?: string }>;
        isAttached: (sessionName: string) => Promise<{ success: boolean; attached?: boolean; error?: string }>;
        onData: (callback: (sessionName: string, data: string) => void) => () => void;
        onExit: (callback: (sessionName: string, exitCode: number) => void) => () => void;
      };
      billing: {
        getReport: (periodType?: string) => Promise<{ success: boolean; data?: BillingReport; error?: string }>;
        getProjections: () => Promise<{ success: boolean; data?: CostProjection[]; error?: string }>;
        getAlerts: (unacknowledgedOnly?: boolean) => Promise<{ success: boolean; data?: BillingAlert[]; error?: string }>;
        acknowledgeAlert: (alertId: string) => Promise<{ success: boolean; data?: { acknowledged: boolean }; error?: string }>;
        exportCSV: (periodType?: string) => Promise<{ success: boolean; data?: string; error?: string }>;
        exportJSON: (periodType?: string) => Promise<{ success: boolean; data?: string; error?: string }>;
        getROI: () => Promise<{ success: boolean; data?: ROISummary; error?: string }>;
        recordProjectCost: (params: { projectId: string; projectName: string; cost: number; provider: string }) => Promise<{ success: boolean; data?: { recorded: boolean }; error?: string }>;
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

  // Suggestion types
  type SuggestionType =
    | 'ai_provider'
    | 'template'
    | 'error_prevention'
    | 'workflow'
    | 'productivity'
    | 'cross_session'
    | 'code_pattern'
    | 'project_context'
    | 'learning'
    | 'quick_action';

  type SuggestionPriority = 'low' | 'medium' | 'high' | 'critical';

  interface Suggestion {
    id: string;
    type: SuggestionType;
    title: string;
    description: string;
    priority: SuggestionPriority;
    confidence: number;
    relevance: number;
    actionable: boolean;
    action?: {
      label: string;
      type: 'apply_provider' | 'apply_template' | 'copy_code' | 'navigate' | 'dismiss' | 'custom';
      payload?: unknown;
    };
    dismissable: boolean;
    expiresAt?: number;
    source: {
      type: 'pattern' | 'insight' | 'interaction' | 'heuristic';
      id?: string;
    };
    context: {
      projectId?: string;
      sessionId?: string;
      language?: string;
      tags?: string[];
    };
    createdAt: number;
  }

  // AI Service Types
  type AIProviderType = 'zoix' | 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local';

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

  // Billing Types (Enterprise CFO visibility)
  type BillingPeriod = 'daily' | 'weekly' | 'monthly';
  type AlertType = 'budget_warning' | 'budget_exceeded' | 'anomaly' | 'projection_warning';

  interface ProviderCost {
    provider: string;
    inputTokens: number;
    outputTokens: number;
    cost: number;
    callCount: number;
  }

  interface ProjectCost {
    projectId: string;
    projectName: string;
    totalCost: number;
    byProvider: ProviderCost[];
    callCount: number;
  }

  interface BillingReport {
    periodType: BillingPeriod;
    periodStart: Date;
    periodEnd: Date;
    totalCost: number;
    byProvider: ProviderCost[];
    byProject: ProjectCost[];
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCalls: number;
    averageCostPerCall: number;
    projectedMonthEnd: number;
    budgetUsedPercent: number;
    budgetRemaining: number | null;
  }

  interface CostProjection {
    date: string;
    projectedCost: number;
    lowerBound: number;
    upperBound: number;
    confidence: number;
  }

  interface BillingAlert {
    id: string;
    type: AlertType;
    severity: 'info' | 'warning' | 'critical';
    title: string;
    message: string;
    createdAt: Date;
    acknowledgedAt: Date | null;
    data?: {
      threshold?: number;
      current?: number;
      projected?: number;
    };
  }

  interface ROISummary {
    totalInvestment: number;
    estimatedValue: number;
    roi: number;
    tasksCompleted: number;
    avgCostPerTask: number;
    avgValuePerTask: number;
    savingsFromRouting: number;
    topValueProjects: Array<{ projectName: string; value: number; cost: number; roi: number }>;
  }
}
