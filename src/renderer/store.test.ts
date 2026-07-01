import { describe, it, expect, beforeEach } from 'vitest';
import { useStore } from './store';

describe('Flowrider Store', () => {
  beforeEach(() => {
    // Reset store state before each test
    const initialSessions = Array.from({ length: 20 }, (_, i) => ({
      id: `face-${i}`,
      name: `Session ${i + 1}`,
      faceIndex: i,
      status: 'empty' as const,
      workingDir: '~',
      createdAt: Date.now(),
      lastActivity: Date.now(),
      aiProvider: 'claude' as const,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCost: 0,
      messageCount: 0,
      toolCallCount: 0,
    }));

    useStore.setState({
      sessions: initialSessions,
      selectedFace: null,
      attachedSession: null,
      projects: [],
      selectedProject: null,
      costMetrics: {
        totalInputTokens: 0,
        totalOutputTokens: 0,
        totalTokens: 0,
        totalCost: 0,
        costByProject: {},
        costBySession: {},
        dailyCosts: [],
      },
      leo: {
        enabled: false,
        flowriders: [],
        totalCapacity: 400,
        activeCapacity: 0,
        coordinator: null,
      },
      dashboard: {
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
      },
      dashboardView: 'overview',
      isCreatingSession: false,
      isCreatingProject: false,
      showProjectModal: false,
      showLeoPanel: false,
      error: null,
      searchQuery: '',
      searchFilter: 'all',
      appMode: 'work',
    });
  });

  describe('Session Management', () => {
    it('should start with 20 empty sessions', () => {
      const state = useStore.getState();
      expect(state.sessions).toHaveLength(20);
      expect(state.sessions.every(s => s.status === 'empty')).toBe(true);
    });

    it('should select a face', () => {
      const { selectFace } = useStore.getState();
      selectFace(5);

      const state = useStore.getState();
      expect(state.selectedFace).toBe(5);
    });

    it('should clear face selection', () => {
      const { selectFace } = useStore.getState();
      selectFace(5);
      selectFace(null);

      const state = useStore.getState();
      expect(state.selectedFace).toBeNull();
    });

    it('should update a session', () => {
      const { updateSession } = useStore.getState();
      updateSession(0, {
        name: 'Updated Session',
        status: 'active',
        workingDir: '/home/user/project'
      });

      const state = useStore.getState();
      expect(state.sessions[0].name).toBe('Updated Session');
      expect(state.sessions[0].status).toBe('active');
      expect(state.sessions[0].workingDir).toBe('/home/user/project');
    });

    it('should track token usage', () => {
      const { addTokenUsage } = useStore.getState();
      addTokenUsage(0, 1000, 500);

      const state = useStore.getState();
      expect(state.sessions[0].inputTokens).toBe(1000);
      expect(state.sessions[0].outputTokens).toBe(500);
      expect(state.sessions[0].totalTokens).toBe(1500);
      expect(state.sessions[0].estimatedCost).toBeGreaterThan(0);
    });

    it('should set attached session', () => {
      const { setAttachedSession } = useStore.getState();
      setAttachedSession('face-3');

      const state = useStore.getState();
      expect(state.attachedSession).toBe('face-3');
    });
  });

  describe('Project Management', () => {
    it('should start with no projects', () => {
      const state = useStore.getState();
      expect(state.projects).toHaveLength(0);
    });

    it('should create a project', () => {
      const { createProject } = useStore.getState();
      createProject('Test Project', 'A test project', '#FF6B6B', '🚀');

      const state = useStore.getState();
      expect(state.projects).toHaveLength(1);
      expect(state.projects[0].name).toBe('Test Project');
      expect(state.projects[0].description).toBe('A test project');
    });

    it('should delete a project', () => {
      const { createProject, deleteProject } = useStore.getState();
      createProject('Test Project', 'A test project', '#FF6B6B', '🚀');

      const state1 = useStore.getState();
      const projectId = state1.projects[0].id;

      deleteProject(projectId);

      const state2 = useStore.getState();
      expect(state2.projects).toHaveLength(0);
    });

    it('should assign session to project', () => {
      const { createProject, assignSessionToProject } = useStore.getState();
      createProject('Test Project', 'A test project', '#FF6B6B', '🚀');

      const state1 = useStore.getState();
      const projectId = state1.projects[0].id;

      assignSessionToProject(0, projectId);

      const state2 = useStore.getState();
      expect(state2.sessions[0].projectId).toBe(projectId);
      expect(state2.projects[0].sessionIds).toContain('face-0');
    });
  });

  describe('LEO Mode', () => {
    it('should start with LEO disabled', () => {
      const state = useStore.getState();
      expect(state.leo.enabled).toBe(false);
    });

    it('should toggle LEO mode', () => {
      const { toggleLeoMode } = useStore.getState();
      toggleLeoMode();

      const state = useStore.getState();
      expect(state.leo.enabled).toBe(true);

      toggleLeoMode();
      const state2 = useStore.getState();
      expect(state2.leo.enabled).toBe(false);
    });

    it('should add a flowrider', () => {
      const { addFlowrider } = useStore.getState();
      addFlowrider({
        id: 'flowrider-1',
        name: 'Test Flowrider',
        status: 'idle',
        activeSessions: 0,
        totalSessions: 20,
        host: 'localhost',
        port: 3000,
        lastPing: Date.now(),
        metrics: {
          cpuUsage: 0,
          memoryUsage: 0,
          uptime: 0,
        },
      });

      const state = useStore.getState();
      expect(state.leo.flowriders).toHaveLength(1);
      expect(state.leo.flowriders[0].name).toBe('Test Flowrider');
      expect(state.leo.activeCapacity).toBe(20);
    });
  });

  describe('Search and Filter', () => {
    it('should set search query', () => {
      const { setSearchQuery } = useStore.getState();
      setSearchQuery('test');

      const state = useStore.getState();
      expect(state.searchQuery).toBe('test');
    });

    it('should set search filter', () => {
      const { setSearchFilter } = useStore.getState();
      setSearchFilter('active');

      const state = useStore.getState();
      expect(state.searchFilter).toBe('active');
    });
  });

  describe('App Mode', () => {
    it('should start in work mode', () => {
      const state = useStore.getState();
      expect(state.appMode).toBe('work');
    });

    it('should switch to demo mode', () => {
      const { setAppMode } = useStore.getState();
      setAppMode('demo');

      const state = useStore.getState();
      expect(state.appMode).toBe('demo');
    });
  });

  describe('Dashboard', () => {
    it('should start with overview view', () => {
      const state = useStore.getState();
      expect(state.dashboardView).toBe('overview');
    });

    it('should change dashboard view', () => {
      const { setDashboardView } = useStore.getState();
      setDashboardView('projects');

      const state = useStore.getState();
      expect(state.dashboardView).toBe('projects');
    });

    it('should refresh dashboard metrics', () => {
      const { updateSession, createProject, assignSessionToProject, refreshDashboard } = useStore.getState();

      // Create a project and activate a session
      createProject('Test', 'desc', '#FF0000', '🚀');
      const state1 = useStore.getState();
      const projectId = state1.projects[0].id;

      updateSession(0, { status: 'active' });
      assignSessionToProject(0, projectId);

      refreshDashboard();

      const state = useStore.getState();
      expect(state.dashboard.activeSessions).toBe(1);
      expect(state.dashboard.activeProjects).toBe(1);
    });
  });

  describe('Session Linking (Arbor Pattern)', () => {
    it('should link two sessions', () => {
      const { linkSessions } = useStore.getState();
      linkSessions(0, 5);

      const state = useStore.getState();
      expect(state.sessions[0].linkedSessions).toContain('face-5');
      expect(state.sessions[5].linkedSessions).toContain('face-0');
    });

    it('should unlink sessions', () => {
      const { linkSessions, unlinkSessions } = useStore.getState();
      linkSessions(0, 5);
      unlinkSessions(0, 5);

      const state = useStore.getState();
      expect(state.sessions[0].linkedSessions).not.toContain('face-5');
      expect(state.sessions[5].linkedSessions).not.toContain('face-0');
    });

    it('should create hypothesis branch', () => {
      const { createHypothesisBranch } = useStore.getState();
      createHypothesisBranch(0, 1, 'approach-a', 'Testing alternative implementation');

      const state = useStore.getState();
      expect(state.sessions[1].hypothesisBranch).toBeDefined();
      expect(state.sessions[1].hypothesisBranch?.branchName).toBe('approach-a');
      expect(state.sessions[1].hypothesisBranch?.hypothesis).toBe('Testing alternative implementation');
      expect(state.sessions[1].hypothesisBranch?.status).toBe('exploring');
      expect(state.sessions[1].linkedSessions).toContain('face-0');
    });

    it('should update hypothesis status', () => {
      const { createHypothesisBranch, updateHypothesisStatus } = useStore.getState();
      createHypothesisBranch(0, 1, 'approach-a', 'Testing');
      updateHypothesisStatus(1, 'promising');

      const state = useStore.getState();
      expect(state.sessions[1].hypothesisBranch?.status).toBe('promising');
    });
  });
});
