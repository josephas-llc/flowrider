import { useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';
import { voiceCommandService, VoiceEvent, VoiceCommandResult } from '../services/VoiceCommandService';

type MainView = 'sessions' | 'projects' | 'dashboard' | 'settings';

interface UseVoiceCommandsOptions {
  onNavigate?: (view: MainView) => void;
  onShowSearch?: () => void;
  onShowCommandPalette?: () => void;
  onShowShortcuts?: () => void;
  onShowZoix?: () => void;
}

export interface VoiceCommandState {
  isListening: boolean;
  isSupported: boolean;
  lastTranscript: string;
  lastCommand: VoiceCommandResult | null;
  error: string | null;
}

export function useVoiceCommands(options: UseVoiceCommandsOptions = {}) {
  const [state, setState] = useState<VoiceCommandState>({
    isListening: false,
    isSupported: voiceCommandService.isSupported(),
    lastTranscript: '',
    lastCommand: null,
    error: null,
  });

  const store = useStore();
  const { selectFace, sessions, setAttachedSession, updateSession } = store;

  // Handle voice commands
  const handleCommand = useCallback((command: VoiceCommandResult) => {
    if (!command.success) return;

    console.log('[useVoiceCommands] Executing:', command.action, command.data);

    switch (command.action) {
      case 'switchSession': {
        const index = command.data?.sessionIndex as number;
        if (index >= 0 && index < 20) {
          selectFace(index);
          const session = sessions[index];
          if (session?.tmuxSession && session.status !== 'empty') {
            setAttachedSession(session.id);
            updateSession(index, { status: 'attached' });
          }
        }
        break;
      }

      case 'createSession': {
        // Find first empty face
        const emptyIndex = sessions.findIndex(s => s.status === 'empty');
        if (emptyIndex >= 0) {
          selectFace(emptyIndex);
          // Could trigger session creation UI here
        }
        break;
      }

      case 'navigate': {
        const view = command.data?.view as MainView;
        if (view && options.onNavigate) {
          options.onNavigate(view);
        }
        break;
      }

      case 'search': {
        options.onShowSearch?.();
        break;
      }

      case 'commandPalette': {
        options.onShowCommandPalette?.();
        break;
      }

      case 'showShortcuts': {
        options.onShowShortcuts?.();
        break;
      }

      case 'showZoix': {
        options.onShowZoix?.();
        break;
      }

      case 'stopListening': {
        // Already handled by the service
        break;
      }

      default:
        console.log('[useVoiceCommands] Unknown action:', command.action);
    }
  }, [selectFace, sessions, setAttachedSession, updateSession, options]);

  // Subscribe to voice events
  useEffect(() => {
    const unsubscribe = voiceCommandService.on((event: VoiceEvent) => {
      switch (event.type) {
        case 'start':
          setState(prev => ({ ...prev, isListening: true, error: null }));
          break;

        case 'end':
          setState(prev => ({ ...prev, isListening: false }));
          break;

        case 'result':
          if (event.transcript) {
            setState(prev => ({ ...prev, lastTranscript: event.transcript! }));
          }
          break;

        case 'command':
          if (event.command) {
            setState(prev => ({ ...prev, lastCommand: event.command! }));
            handleCommand(event.command);
          }
          break;

        case 'error':
          setState(prev => ({ ...prev, error: event.error || 'Unknown error' }));
          break;

        case 'listening':
          // Could play a sound or show visual feedback
          break;

        case 'wake':
          console.log('[useVoiceCommands] Wake word detected');
          break;
      }
    });

    return unsubscribe;
  }, [handleCommand]);

  // Public API
  const start = useCallback(() => {
    voiceCommandService.start();
  }, []);

  const stop = useCallback(() => {
    voiceCommandService.stop();
  }, []);

  const toggle = useCallback(() => {
    voiceCommandService.toggle();
  }, []);

  return {
    ...state,
    start,
    stop,
    toggle,
    commands: voiceCommandService.getCommands(),
  };
}

export default useVoiceCommands;
