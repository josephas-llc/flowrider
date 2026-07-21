import { useEffect, useCallback, useRef } from 'react';
import { useStore } from '../store';

/**
 * StarCraft-style Control Groups for Flowrider
 *
 * Usage:
 * - Ctrl+1-9: Save current session to control group
 * - 1-9: Recall and select control group (when no modifier)
 * - Double-tap 1-9: Center view on control group (future: scroll to session)
 *
 * Visual Feedback:
 * - Sessions in a control group show a badge with the group number
 * - Pressing 1-9 briefly highlights all sessions in that group
 */
export function useControlGroups() {
  const {
    selectedFace,
    controlGroups,
    setControlGroup,
    selectControlGroup,
    getControlGroupForFace,
  } = useStore();

  // Track double-tap timing
  const lastKeyPressRef = useRef<{ key: string; time: number } | null>(null);
  const DOUBLE_TAP_THRESHOLD = 300; // ms

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }

    // Check for number key 1-9
    const keyNum = parseInt(e.key);
    if (isNaN(keyNum) || keyNum < 1 || keyNum > 9) {
      return;
    }

    const isMod = e.metaKey || e.ctrlKey;

    if (isMod) {
      // Ctrl+1-9: Save current session to control group
      e.preventDefault();
      if (selectedFace !== null) {
        // Set the control group with just the selected face
        setControlGroup(keyNum, [selectedFace]);

        // Visual feedback: add temporary class for animation
        const cells = document.querySelectorAll('.session-cell, .session-pill');
        cells.forEach((cell, idx) => {
          if (idx === selectedFace) {
            cell.classList.add('control-group-activated');
            setTimeout(() => cell.classList.remove('control-group-activated'), 500);
          }
        });

        console.log(`[ControlGroups] Saved face ${selectedFace} to group ${keyNum}`);
      }
    } else if (!e.shiftKey) {
      // 1-9 without modifier: Check for double-tap, then select control group
      const now = Date.now();
      const lastPress = lastKeyPressRef.current;

      if (lastPress && lastPress.key === e.key && (now - lastPress.time) < DOUBLE_TAP_THRESHOLD) {
        // Double-tap detected - could scroll/center on the group
        // For now, just select the group
        e.preventDefault();
        selectControlGroup(keyNum);
        lastKeyPressRef.current = null;
        console.log(`[ControlGroups] Double-tap: Selected group ${keyNum}`);
      } else {
        // Single press - select control group if it exists
        const group = controlGroups[keyNum];
        if (group && group.length > 0) {
          e.preventDefault();
          selectControlGroup(keyNum);
          console.log(`[ControlGroups] Selected group ${keyNum} with ${group.length} session(s)`);
        }
        lastKeyPressRef.current = { key: e.key, time: now };
      }
    }
  }, [selectedFace, controlGroups, setControlGroup, selectControlGroup]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Return helper functions for components to use
  return {
    controlGroups,
    getControlGroupForFace,
    setControlGroup,
    selectControlGroup,
  };
}

export default useControlGroups;
