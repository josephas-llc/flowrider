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
      platform: string;
      version: string;
    };
  }
}
