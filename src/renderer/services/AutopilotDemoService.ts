/**
 * AutopilotDemoService - Hands-free Investor Demo Mode
 *
 * Creates a compelling visual demo that runs automatically:
 * - Creates real sessions with project names
 * - Simulates typewriter terminal output
 * - Auto-rotates between sessions
 * - Triggers ZOIX learning events
 * - Shows the icosahedron visualization
 * - Displays narrator captions
 *
 * Duration: ~90 seconds
 */

export interface DemoStep {
  time: number;           // Seconds from start
  action: DemoAction;
  data?: Record<string, unknown>;
}

export type DemoAction =
  | 'createSession'
  | 'typeTerminal'
  | 'selectSession'
  | 'showIcosahedron'
  | 'hideIcosahedron'
  | 'showZoixInsight'
  | 'showNarration'
  | 'hideNarration'
  | 'triggerZoixPulse'
  | 'showProjectsView'
  | 'showDashboard'
  | 'showTerminalView'
  | 'complete';

// Realistic terminal output sequences for different projects
const TERMINAL_SEQUENCES = {
  api: [
    '$ claude "Create REST API with authentication"',
    '',
    'I\'ll create a REST API with JWT authentication...',
    '',
    'Creating src/routes/auth.ts...',
    '  export const authRouter = express.Router();',
    '',
    'Creating src/middleware/jwt.ts...',
    '  export const verifyToken = (req, res, next) => {',
    '',
    'Implementing endpoints:',
    '  ✓ POST /api/auth/login',
    '  ✓ POST /api/auth/register',
    '  ✓ GET /api/auth/me',
    '  ✓ POST /api/auth/refresh',
    '',
    'Running tests...',
    '  PASS src/routes/auth.test.ts',
    '  12 tests passed in 1.2s',
    '',
    '✅ API ready at localhost:3000',
  ],
  frontend: [
    '$ claude "Build React dashboard with charts"',
    '',
    'Creating dashboard components...',
    '',
    'src/components/Dashboard.tsx',
    '  export const Dashboard: React.FC = () => {',
    '',
    'src/components/Charts/LineChart.tsx',
    '  import { Line } from \'recharts\';',
    '',
    'Adding Tailwind styles...',
    '  .dashboard-card { @apply p-6 rounded-xl }',
    '',
    'Implementing features:',
    '  ✓ Real-time data updates',
    '  ✓ Responsive grid layout',
    '  ✓ Dark mode support',
    '',
    'Bundle analysis:',
    '  Total: 142kb gzipped',
    '  Charts: 45kb',
    '',
    '✅ Dashboard ready!',
  ],
  mobile: [
    '$ claude "Create React Native mobile app"',
    '',
    'Initializing Expo project...',
    '',
    'Creating navigation structure...',
    '  ✓ HomeScreen',
    '  ✓ ProfileScreen',
    '  ✓ SettingsScreen',
    '',
    'Building components:',
    '  src/components/Card.tsx',
    '  src/components/Button.tsx',
    '  src/components/Avatar.tsx',
    '',
    'Configuring authentication...',
    '  ✓ Biometric login',
    '  ✓ Secure storage',
    '',
    'Building for iOS...',
    '  ✓ Build successful',
    '',
    '✅ App ready for TestFlight!',
  ],
  devops: [
    '$ claude "Set up CI/CD pipeline"',
    '',
    'Creating .github/workflows/ci.yml...',
    '',
    'Pipeline stages:',
    '  1. Build',
    '  2. Test',
    '  3. Security scan',
    '  4. Deploy',
    '',
    'Configuring Docker:',
    '  FROM node:20-alpine',
    '  WORKDIR /app',
    '  ...',
    '',
    'Creating Kubernetes manifests:',
    '  ✓ deployment.yaml',
    '  ✓ service.yaml',
    '  ✓ ingress.yaml',
    '',
    '✅ Pipeline ready!',
    '   Est. build time: 3m 45s',
  ],
  database: [
    '$ claude "Design PostgreSQL schema"',
    '',
    'Analyzing requirements...',
    '',
    'Creating migrations:',
    '  001_create_users.sql',
    '  002_create_projects.sql',
    '  003_create_sessions.sql',
    '',
    'Schema design:',
    '  CREATE TABLE users (',
    '    id UUID PRIMARY KEY,',
    '    email VARCHAR(255) UNIQUE,',
    '    ...',
    '  );',
    '',
    'Adding indexes:',
    '  ✓ idx_users_email',
    '  ✓ idx_projects_user_id',
    '',
    'Migration complete!',
    '✅ Database ready',
  ],
  ml: [
    '$ claude "Train recommendation model"',
    '',
    'Loading dataset: 50,000 samples',
    '',
    'Preprocessing...',
    '  ✓ Feature engineering',
    '  ✓ Normalization',
    '',
    'Training model:',
    '  Epoch 1/10  loss=0.42',
    '  Epoch 3/10  loss=0.28',
    '  Epoch 5/10  loss=0.18',
    '  Epoch 8/10  loss=0.11',
    '  Epoch 10/10 loss=0.08',
    '',
    'Evaluation:',
    '  Accuracy: 94.2%',
    '  Precision: 0.93',
    '  Recall: 0.91',
    '',
    '✅ Model exported to ONNX',
  ],
};

// Demo script with precise timing
const DEMO_SCRIPT: DemoStep[] = [
  // 0-5s: Introduction
  { time: 0, action: 'showNarration', data: { text: 'Welcome to Flowrider', subtext: 'AI-Powered Development at Scale' } },

  // 5-10s: Create first session (API)
  { time: 5, action: 'hideNarration' },
  { time: 5, action: 'createSession', data: { index: 0, name: 'API Backend', type: 'api' } },
  { time: 6, action: 'selectSession', data: { index: 0 } },
  { time: 7, action: 'typeTerminal', data: { index: 0, type: 'api' } },

  // 10-15s: Create frontend session
  { time: 12, action: 'showNarration', data: { text: 'Multiple projects, one interface', subtext: '20 concurrent AI sessions' } },
  { time: 12, action: 'createSession', data: { index: 2, name: 'React Frontend', type: 'frontend' } },
  { time: 13, action: 'typeTerminal', data: { index: 2, type: 'frontend' } },

  // 15-20s: Create mobile session
  { time: 17, action: 'hideNarration' },
  { time: 17, action: 'createSession', data: { index: 4, name: 'Mobile App', type: 'mobile' } },
  { time: 18, action: 'selectSession', data: { index: 4 } },
  { time: 19, action: 'typeTerminal', data: { index: 4, type: 'mobile' } },

  // 20-25s: Show icosahedron
  { time: 22, action: 'showIcosahedron' },
  { time: 22, action: 'showNarration', data: { text: '3D Session Visualization', subtext: 'Each face = one AI session' } },

  // 25-30s: Create more sessions
  { time: 27, action: 'hideNarration' },
  { time: 27, action: 'createSession', data: { index: 6, name: 'DevOps', type: 'devops' } },
  { time: 28, action: 'typeTerminal', data: { index: 6, type: 'devops' } },
  { time: 29, action: 'createSession', data: { index: 8, name: 'Database', type: 'database' } },
  { time: 30, action: 'typeTerminal', data: { index: 8, type: 'database' } },

  // 30-35s: Rotate through sessions
  { time: 32, action: 'selectSession', data: { index: 0 } },
  { time: 34, action: 'selectSession', data: { index: 2 } },
  { time: 36, action: 'selectSession', data: { index: 4 } },

  // 35-45s: ZOIX intelligence showcase
  { time: 38, action: 'triggerZoixPulse' },
  { time: 39, action: 'showNarration', data: { text: 'ZOIX Intelligence', subtext: 'Learning from every interaction' } },
  { time: 40, action: 'showZoixInsight', data: { type: 'pattern', text: 'Detected: TypeScript project patterns' } },
  { time: 44, action: 'showZoixInsight', data: { type: 'skill', text: 'Skill improved: React development +15%' } },

  // 45-55s: Create ML session, show power
  { time: 48, action: 'hideNarration' },
  { time: 48, action: 'createSession', data: { index: 10, name: 'ML Recommender', type: 'ml' } },
  { time: 49, action: 'selectSession', data: { index: 10 } },
  { time: 50, action: 'typeTerminal', data: { index: 10, type: 'ml' } },
  { time: 52, action: 'showNarration', data: { text: '6 AI agents working in parallel', subtext: 'Building a complete platform' } },

  // 55-65s: Dashboard view
  { time: 58, action: 'hideIcosahedron' },
  { time: 58, action: 'hideNarration' },
  { time: 59, action: 'showDashboard' },
  { time: 60, action: 'showNarration', data: { text: 'Real-time Analytics', subtext: 'Track costs, tokens, and productivity' } },

  // 65-75s: Projects view
  { time: 68, action: 'hideNarration' },
  { time: 68, action: 'showProjectsView' },
  { time: 69, action: 'showNarration', data: { text: 'Manage All Your Projects', subtext: 'GitHub integration built-in' } },

  // 75-85s: Return to terminal, show scale
  { time: 75, action: 'hideNarration' },
  { time: 75, action: 'showTerminalView' },
  { time: 76, action: 'showIcosahedron' },
  { time: 77, action: 'selectSession', data: { index: 0 } },
  { time: 79, action: 'selectSession', data: { index: 6 } },
  { time: 81, action: 'selectSession', data: { index: 10 } },

  // 85-90s: Finale
  { time: 85, action: 'hideIcosahedron' },
  { time: 85, action: 'showNarration', data: { text: 'Flowrider', subtext: 'Build 10x faster with AI orchestration' } },
  { time: 90, action: 'complete' },
];

export type DemoEventCallback = (event: DemoEvent) => void;

export interface DemoEvent {
  type: 'step' | 'terminal' | 'complete' | 'error';
  action?: DemoAction;
  data?: Record<string, unknown>;
  elapsed?: number;
}

interface TypewriterState {
  sessionIndex: number;
  lines: string[];
  currentLine: number;
  currentChar: number;
  buffer: string[];
}

class AutopilotDemoService {
  private isRunning = false;
  private startTime = 0;
  private stepIndex = 0;
  private listeners: DemoEventCallback[] = [];
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private typewriters: Map<number, TypewriterState> = new Map();
  private typewriterInterval: ReturnType<typeof setInterval> | null = null;

  // Public state for React components
  public narration: { text: string; subtext: string } | null = null;
  public isComplete = false;

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.startTime = Date.now();
    this.stepIndex = 0;
    this.isComplete = false;
    this.narration = null;
    this.typewriters.clear();

    console.log('[AutopilotDemo] Starting demo...');

    // Main loop - check for steps every 100ms
    this.intervalId = setInterval(() => {
      this.tick();
    }, 100);

    // Typewriter loop - advance terminal output every 50ms
    this.typewriterInterval = setInterval(() => {
      this.tickTypewriters();
    }, 50);
  }

  stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.isComplete = true;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.typewriterInterval) {
      clearInterval(this.typewriterInterval);
      this.typewriterInterval = null;
    }

    this.typewriters.clear();

    console.log('[AutopilotDemo] Stopped');
    this.emit({ type: 'complete' });
  }

  private tick(): void {
    const elapsed = (Date.now() - this.startTime) / 1000;

    // Execute any steps that should have run by now
    while (this.stepIndex < DEMO_SCRIPT.length) {
      const step = DEMO_SCRIPT[this.stepIndex];

      if (step.time <= elapsed) {
        this.executeStep(step, elapsed);
        this.stepIndex++;
      } else {
        break;
      }
    }
  }

  private executeStep(step: DemoStep, elapsed: number): void {
    console.log(`[AutopilotDemo] ${elapsed.toFixed(1)}s - ${step.action}`, step.data || '');

    // Handle narration state internally
    if (step.action === 'showNarration' && step.data) {
      this.narration = {
        text: step.data.text as string,
        subtext: step.data.subtext as string,
      };
    } else if (step.action === 'hideNarration') {
      this.narration = null;
    }

    // Handle typewriter initialization
    if (step.action === 'typeTerminal' && step.data) {
      const index = step.data.index as number;
      const type = step.data.type as keyof typeof TERMINAL_SEQUENCES;
      const lines = TERMINAL_SEQUENCES[type] || [];

      this.typewriters.set(index, {
        sessionIndex: index,
        lines,
        currentLine: 0,
        currentChar: 0,
        buffer: [],
      });
    }

    // Handle completion
    if (step.action === 'complete') {
      this.stop();
      return;
    }

    this.emit({
      type: 'step',
      action: step.action,
      data: step.data,
      elapsed,
    });
  }

  private tickTypewriters(): void {
    this.typewriters.forEach((state, index) => {
      if (state.currentLine >= state.lines.length) return;

      const line = state.lines[state.currentLine];

      if (state.currentChar < line.length) {
        // Still typing current line
        state.currentChar++;

        // Emit partial line
        const partialLine = line.substring(0, state.currentChar);
        this.emit({
          type: 'terminal',
          data: {
            sessionIndex: index,
            text: [...state.buffer, partialLine].join('\n'),
            complete: false,
          },
        });
      } else {
        // Line complete, move to next
        state.buffer.push(line);
        state.currentLine++;
        state.currentChar = 0;

        // Random delay between lines (0-3 ticks)
        if (Math.random() > 0.7) {
          return; // Skip this tick for natural pacing
        }
      }
    });
  }

  getTerminalContent(sessionIndex: number): string {
    const state = this.typewriters.get(sessionIndex);
    if (!state) return '';

    const currentLine = state.lines[state.currentLine] || '';
    const partialLine = currentLine.substring(0, state.currentChar);

    return [...state.buffer, partialLine].join('\n');
  }

  on(callback: DemoEventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private emit(event: DemoEvent): void {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[AutopilotDemo] Event handler error:', error);
      }
    });
  }

  getProgress(): { elapsed: number; total: number; percent: number } {
    if (!this.isRunning) {
      return { elapsed: 0, total: 90, percent: 0 };
    }

    const elapsed = (Date.now() - this.startTime) / 1000;
    const total = 90;
    const percent = Math.min(100, (elapsed / total) * 100);

    return { elapsed, total, percent };
  }

  isActive(): boolean {
    return this.isRunning;
  }
}

// Singleton instance
export const autopilotDemoService = new AutopilotDemoService();
export default autopilotDemoService;
