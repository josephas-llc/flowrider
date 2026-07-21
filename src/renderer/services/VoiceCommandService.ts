/**
 * VoiceCommandService - Voice Control for Flowrider
 *
 * Uses the Web Speech API (built into Chromium/Electron) for speech recognition.
 * Supports offline recognition on macOS.
 *
 * Commands:
 * - "switch to session [number]" - Switch to session 1-20
 * - "create new session" / "new session" - Create a new session
 * - "stop" / "stop listening" - Stop voice recognition
 * - "show dashboard" / "show terminal" / "show projects" - Navigate views
 * - "search [query]" - Open session search with query
 * - "hey flowrider" - Wake word (re-activates after timeout)
 */

export interface VoiceCommand {
  pattern: RegExp;
  action: string;
  extract?: (match: RegExpMatchArray) => Record<string, unknown>;
  description: string;
}

export interface VoiceCommandResult {
  success: boolean;
  command?: string;
  action?: string;
  data?: Record<string, unknown>;
  error?: string;
}

type VoiceEventCallback = (event: VoiceEvent) => void;

export interface VoiceEvent {
  type: 'start' | 'end' | 'result' | 'error' | 'command' | 'listening' | 'wake';
  transcript?: string;
  confidence?: number;
  command?: VoiceCommandResult;
  error?: string;
}

// Define supported voice commands
const VOICE_COMMANDS: VoiceCommand[] = [
  // Session switching
  {
    pattern: /(?:switch to |go to |select )?session (?:number )?(\d+)/i,
    action: 'switchSession',
    extract: (match) => ({ sessionIndex: parseInt(match[1], 10) - 1 }),
    description: 'Switch to session N',
  },
  // Create session
  {
    pattern: /(?:create |make |start )?(?:a )?new session/i,
    action: 'createSession',
    description: 'Create a new session',
  },
  // Navigation
  {
    pattern: /(?:show |go to |open )?(?:the )?dashboard/i,
    action: 'navigate',
    extract: () => ({ view: 'dashboard' }),
    description: 'Show dashboard',
  },
  {
    pattern: /(?:show |go to |open )?(?:the )?terminals?/i,
    action: 'navigate',
    extract: () => ({ view: 'sessions' }),
    description: 'Show terminal view',
  },
  {
    pattern: /(?:show |go to |open )?(?:the )?projects?/i,
    action: 'navigate',
    extract: () => ({ view: 'projects' }),
    description: 'Show projects',
  },
  {
    pattern: /(?:show |go to |open )?(?:the )?settings/i,
    action: 'navigate',
    extract: () => ({ view: 'settings' }),
    description: 'Show settings',
  },
  // Search
  {
    pattern: /search (?:for )?(.+)/i,
    action: 'search',
    extract: (match) => ({ query: match[1] }),
    description: 'Search for something',
  },
  // Command palette
  {
    pattern: /(?:open |show )?command (?:palette|menu)/i,
    action: 'commandPalette',
    description: 'Open command palette',
  },
  // Help
  {
    pattern: /(?:show |open )?(?:keyboard )?shortcuts/i,
    action: 'showShortcuts',
    description: 'Show keyboard shortcuts',
  },
  // ZOIX
  {
    pattern: /(?:show |open )?(?:zoix|zoe|zones|learning)/i,
    action: 'showZoix',
    description: 'Show ZOIX insights',
  },
  // Control
  {
    pattern: /(?:stop|pause|cancel) (?:listening)?/i,
    action: 'stopListening',
    description: 'Stop voice recognition',
  },
];

// Wake word patterns
const WAKE_PATTERNS = [
  /hey flowrider/i,
  /okay flowrider/i,
  /flowrider/i,
];

class VoiceCommandService {
  private recognition: SpeechRecognition | null = null;
  private isListening = false;
  private isAwake = false;
  private wakeTimeout: NodeJS.Timeout | null = null;
  private listeners: VoiceEventCallback[] = [];
  private enabled = false;

  // Settings
  private wakeTimeoutMs = 30000; // 30 seconds of silence before requiring wake word again
  private requireWakeWord = false; // If true, requires "hey flowrider" to activate

  constructor() {
    this.initRecognition();
  }

  private initRecognition(): void {
    // Check for Web Speech API support
    const SpeechRecognitionAPI =
      (window as unknown as { SpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

    if (!SpeechRecognitionAPI) {
      console.warn('[VoiceCommand] Speech recognition not supported');
      return;
    }

    this.recognition = new SpeechRecognitionAPI();
    this.recognition.continuous = true;
    this.recognition.interimResults = true;
    this.recognition.lang = 'en-US';
    this.recognition.maxAlternatives = 1;

    this.recognition.onstart = () => {
      this.isListening = true;
      this.emit({ type: 'start' });
      console.log('[VoiceCommand] Recognition started');
    };

    this.recognition.onend = () => {
      this.isListening = false;
      this.emit({ type: 'end' });
      console.log('[VoiceCommand] Recognition ended');

      // Auto-restart if still enabled
      if (this.enabled) {
        setTimeout(() => {
          if (this.enabled && !this.isListening) {
            this.start();
          }
        }, 500);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('[VoiceCommand] Recognition error:', event.error);
      this.emit({ type: 'error', error: event.error });

      // Don't auto-restart on certain errors
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        this.enabled = false;
      }
    };

    this.recognition.onresult = (event) => {
      const result = event.results[event.results.length - 1];
      const transcript = result[0].transcript.trim();
      const confidence = result[0].confidence;
      const isFinal = result.isFinal;

      // Emit intermediate results for UI feedback
      this.emit({
        type: 'result',
        transcript,
        confidence,
      });

      // Only process final results
      if (!isFinal) return;

      console.log(`[VoiceCommand] Heard: "${transcript}" (confidence: ${(confidence * 100).toFixed(1)}%)`);

      // Check for wake word if required
      if (this.requireWakeWord && !this.isAwake) {
        if (this.checkWakeWord(transcript)) {
          this.wake();
          return;
        }
        // Ignore command if not awake
        return;
      }

      // Process command
      const command = this.parseCommand(transcript);
      if (command.success) {
        this.emit({ type: 'command', command });
        this.resetWakeTimeout();

        // Handle stop command specially
        if (command.action === 'stopListening') {
          this.stop();
        }
      }
    };
  }

  private checkWakeWord(transcript: string): boolean {
    return WAKE_PATTERNS.some(pattern => pattern.test(transcript));
  }

  private wake(): void {
    this.isAwake = true;
    this.emit({ type: 'wake' });
    console.log('[VoiceCommand] Wake word detected - now listening for commands');
    this.resetWakeTimeout();

    // Play a subtle sound or provide feedback
    this.emit({ type: 'listening' });
  }

  private resetWakeTimeout(): void {
    if (this.wakeTimeout) {
      clearTimeout(this.wakeTimeout);
    }

    if (this.requireWakeWord) {
      this.wakeTimeout = setTimeout(() => {
        this.isAwake = false;
        console.log('[VoiceCommand] Wake timeout - waiting for wake word');
      }, this.wakeTimeoutMs);
    }
  }

  private parseCommand(transcript: string): VoiceCommandResult {
    for (const cmd of VOICE_COMMANDS) {
      const match = transcript.match(cmd.pattern);
      if (match) {
        return {
          success: true,
          command: transcript,
          action: cmd.action,
          data: cmd.extract ? cmd.extract(match) : {},
        };
      }
    }

    return {
      success: false,
      command: transcript,
      error: 'Command not recognized',
    };
  }

  // Public API

  start(): void {
    if (!this.recognition) {
      console.error('[VoiceCommand] Recognition not available');
      return;
    }

    if (this.isListening) {
      console.log('[VoiceCommand] Already listening');
      return;
    }

    this.enabled = true;
    this.isAwake = !this.requireWakeWord;

    try {
      this.recognition.start();
    } catch (error) {
      console.error('[VoiceCommand] Failed to start:', error);
    }
  }

  stop(): void {
    this.enabled = false;
    this.isAwake = false;

    if (this.wakeTimeout) {
      clearTimeout(this.wakeTimeout);
      this.wakeTimeout = null;
    }

    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (error) {
        console.error('[VoiceCommand] Failed to stop:', error);
      }
    }
  }

  toggle(): void {
    if (this.isListening) {
      this.stop();
    } else {
      this.start();
    }
  }

  isActive(): boolean {
    return this.isListening;
  }

  isSupported(): boolean {
    return this.recognition !== null;
  }

  setRequireWakeWord(require: boolean): void {
    this.requireWakeWord = require;
    this.isAwake = !require;
  }

  setWakeTimeout(ms: number): void {
    this.wakeTimeoutMs = ms;
  }

  getCommands(): { command: string; description: string }[] {
    return VOICE_COMMANDS.map(cmd => ({
      command: cmd.pattern.source,
      description: cmd.description,
    }));
  }

  // Event handling

  on(callback: VoiceEventCallback): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private emit(event: VoiceEvent): void {
    this.listeners.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('[VoiceCommand] Event handler error:', error);
      }
    });
  }
}

// Singleton instance
export const voiceCommandService = new VoiceCommandService();

export default voiceCommandService;
