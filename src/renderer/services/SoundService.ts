/**
 * Sound Service for Flowrider
 *
 * Game-inspired audio feedback system. OFF by default per user preference.
 * Uses Web Audio API for low-latency, programmatic sounds.
 *
 * Sound Design Philosophy (from GAME_UX_RESEARCH.md):
 * - Subtle, non-intrusive feedback
 * - Distinct sounds for different event types
 * - Volume control and mute capability
 * - No sound loops or ambient audio (distracting)
 */

type SoundType =
  | 'sessionStart'      // New session created
  | 'sessionComplete'   // Session task completed
  | 'attention'         // Session needs attention
  | 'error'             // Error occurred
  | 'notification'      // General notification
  | 'keyPress'          // UI feedback (very subtle)
  | 'controlGroup'      // Control group assigned
  | 'navigate';         // Navigation between sessions

interface SoundConfig {
  enabled: boolean;
  volume: number; // 0.0 - 1.0
  muted: boolean;
}

class SoundService {
  private audioContext: AudioContext | null = null;
  private config: SoundConfig = {
    enabled: false, // OFF by default
    volume: 0.3,    // Low default volume
    muted: false,
  };

  private initialized = false;

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.initialized = true;
      console.log('[SoundService] Initialized');
    } catch (error) {
      console.warn('[SoundService] Failed to initialize:', error);
    }
  }

  /**
   * Enable or disable sounds
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    localStorage.setItem('flowrider:sounds:enabled', String(enabled));
  }

  /**
   * Set volume (0.0 - 1.0)
   */
  setVolume(volume: number): void {
    this.config.volume = Math.max(0, Math.min(1, volume));
    localStorage.setItem('flowrider:sounds:volume', String(this.config.volume));
  }

  /**
   * Toggle mute
   */
  toggleMute(): void {
    this.config.muted = !this.config.muted;
  }

  /**
   * Load saved preferences
   */
  loadPreferences(): void {
    const enabled = localStorage.getItem('flowrider:sounds:enabled');
    const volume = localStorage.getItem('flowrider:sounds:volume');

    if (enabled !== null) {
      this.config.enabled = enabled === 'true';
    }
    if (volume !== null) {
      this.config.volume = parseFloat(volume);
    }
  }

  /**
   * Play a sound effect
   */
  play(type: SoundType): void {
    if (!this.config.enabled || this.config.muted || !this.audioContext) {
      return;
    }

    // Resume audio context if suspended (browser autoplay policy)
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    const now = this.audioContext.currentTime;
    const volume = this.config.volume;

    // Configure sound based on type
    switch (type) {
      case 'sessionStart':
        // Rising tone - positive, welcoming
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(400, now);
        oscillator.frequency.exponentialRampToValueAtTime(800, now + 0.15);
        gainNode.gain.setValueAtTime(volume * 0.3, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        oscillator.start(now);
        oscillator.stop(now + 0.2);
        break;

      case 'sessionComplete':
        // Two-note success chime
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, now); // C5
        oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
        gainNode.gain.setValueAtTime(volume * 0.25, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        oscillator.start(now);
        oscillator.stop(now + 0.25);
        break;

      case 'attention':
        // Urgent but not alarming - two quick pulses
        oscillator.type = 'triangle';
        oscillator.frequency.setValueAtTime(880, now);
        gainNode.gain.setValueAtTime(volume * 0.4, now);
        gainNode.gain.setValueAtTime(0, now + 0.08);
        gainNode.gain.setValueAtTime(volume * 0.4, now + 0.12);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        oscillator.start(now);
        oscillator.stop(now + 0.25);
        break;

      case 'error':
        // Low, descending tone - problem indicator
        oscillator.type = 'sawtooth';
        oscillator.frequency.setValueAtTime(300, now);
        oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.2);
        gainNode.gain.setValueAtTime(volume * 0.2, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        oscillator.start(now);
        oscillator.stop(now + 0.25);
        break;

      case 'notification':
        // Soft ping - informational
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1200, now);
        gainNode.gain.setValueAtTime(volume * 0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;

      case 'keyPress':
        // Very subtle click - barely audible
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1000, now);
        gainNode.gain.setValueAtTime(volume * 0.05, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        oscillator.start(now);
        oscillator.stop(now + 0.03);
        break;

      case 'controlGroup':
        // Quick blip - confirmation
        oscillator.type = 'square';
        oscillator.frequency.setValueAtTime(600, now);
        gainNode.gain.setValueAtTime(volume * 0.15, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        oscillator.start(now);
        oscillator.stop(now + 0.05);
        break;

      case 'navigate':
        // Soft whoosh-like transition
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(200, now);
        oscillator.frequency.exponentialRampToValueAtTime(400, now + 0.05);
        oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.1);
        gainNode.gain.setValueAtTime(volume * 0.1, now);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        oscillator.start(now);
        oscillator.stop(now + 0.1);
        break;
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): SoundConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const soundService = new SoundService();

// Initialize on first user interaction
if (typeof window !== 'undefined') {
  const initOnInteraction = () => {
    soundService.initialize();
    soundService.loadPreferences();
    window.removeEventListener('click', initOnInteraction);
    window.removeEventListener('keydown', initOnInteraction);
  };
  window.addEventListener('click', initOnInteraction, { once: true });
  window.addEventListener('keydown', initOnInteraction, { once: true });
}

export default soundService;
