import { useEffect, useCallback } from 'react';
import { useStore } from '../store';

/**
 * Keyboard shortcuts for Flowrider 2.0
 *
 * Face Selection:
 * - 1-9, 0: Select faces 1-10 (0 = face 10)
 * - Shift+1-0: Select faces 11-20
 *
 * Actions:
 * - Cmd/Ctrl+Enter: Attach/Detach from selected session
 * - Cmd/Ctrl+N: Focus create session (if face selected and empty)
 * - Cmd/Ctrl+K: Kill selected session
 * - Escape: Deselect face / close modals
 * - Cmd/Ctrl+F: Focus search
 * - Cmd/Ctrl+B: Branch from current session (Tier 3)
 * - Cmd/Ctrl+L: Link sessions (Tier 3)
 */
export function useKeyboardShortcuts() {
  const {
    sessions,
    selectedFace,
    attachedSession,
    selectFace,
    setAttachedSession,
    updateSession,
  } = useStore();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      // Allow Escape in inputs
      if (e.key !== 'Escape') return;
    }

    const isMod = e.metaKey || e.ctrlKey;

    // Number keys for face selection
    if (!isMod && /^[0-9]$/.test(e.key)) {
      e.preventDefault();
      let faceIndex: number;

      if (e.shiftKey) {
        // Shift+1-0 selects faces 11-20
        faceIndex = e.key === '0' ? 19 : parseInt(e.key) + 9;
      } else {
        // 1-9 selects faces 1-9, 0 selects face 10
        faceIndex = e.key === '0' ? 9 : parseInt(e.key) - 1;
      }

      selectFace(faceIndex);
      return;
    }

    // Escape - deselect
    if (e.key === 'Escape') {
      e.preventDefault();
      if (attachedSession) {
        setAttachedSession(null);
        if (selectedFace !== null) {
          updateSession(selectedFace, { status: 'active' });
        }
      } else {
        selectFace(null);
      }
      return;
    }

    // Cmd+Enter - attach/detach
    if (isMod && e.key === 'Enter') {
      e.preventDefault();
      if (selectedFace === null) return;

      const session = sessions[selectedFace];
      if (!session?.tmuxSession) return;

      if (attachedSession === session.id) {
        // Detach
        setAttachedSession(null);
        updateSession(selectedFace, { status: 'active' });
      } else {
        // Attach
        setAttachedSession(session.id);
        updateSession(selectedFace, { status: 'attached' });
      }
      return;
    }

    // Cmd+K - kill session
    if (isMod && e.key === 'k') {
      e.preventDefault();
      if (selectedFace === null) return;

      const session = sessions[selectedFace];
      if (!session?.tmuxSession || !window.flowrider) return;

      if (confirm(`Kill session "${session.name}"?`)) {
        window.flowrider.tmux.kill(session.tmuxSession).then((result: any) => {
          if (result.success) {
            updateSession(selectedFace, {
              tmuxSession: undefined,
              status: 'empty',
            });
            setAttachedSession(null);
          }
        });
      }
      return;
    }

    // Arrow keys for face navigation (when not attached)
    if (!attachedSession && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      const current = selectedFace ?? -1;
      let next: number;

      if (e.key === 'ArrowRight') {
        next = current >= 19 ? 0 : current + 1;
      } else {
        next = current <= 0 ? 19 : current - 1;
      }

      selectFace(next);
      return;
    }

  }, [sessions, selectedFace, attachedSession, selectFace, setAttachedSession, updateSession]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
