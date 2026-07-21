import React, { useState, useEffect } from 'react';
import { useVoiceCommands } from '../hooks/useVoiceCommands';

interface VoiceControlIndicatorProps {
  onNavigate?: (view: 'sessions' | 'projects' | 'dashboard' | 'settings') => void;
  onShowSearch?: () => void;
  onShowCommandPalette?: () => void;
  onShowShortcuts?: () => void;
  onShowZoix?: () => void;
}

/**
 * Voice Control Indicator
 *
 * Shows a microphone icon that indicates voice control status.
 * Click to toggle voice recognition on/off.
 *
 * Visual states:
 * - Gray: Voice not supported or disabled
 * - Green pulsing: Listening for commands
 * - Red flash: Error occurred
 */
export const VoiceControlIndicator: React.FC<VoiceControlIndicatorProps> = ({
  onNavigate,
  onShowSearch,
  onShowCommandPalette,
  onShowShortcuts,
  onShowZoix,
}) => {
  const voice = useVoiceCommands({
    onNavigate,
    onShowSearch,
    onShowCommandPalette,
    onShowShortcuts,
    onShowZoix,
  });

  const [showTranscript, setShowTranscript] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  // Show transcript briefly when we hear something
  useEffect(() => {
    if (voice.lastTranscript) {
      setShowTranscript(true);
      const timer = setTimeout(() => setShowTranscript(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [voice.lastTranscript]);

  if (!voice.isSupported) {
    return null; // Don't show if not supported
  }

  const getStatusColor = () => {
    if (voice.error) return '#ef4444'; // Red
    if (voice.isListening) return '#22c55e'; // Green
    return '#6b7280'; // Gray
  };

  const getStatusText = () => {
    if (voice.error) return `Error: ${voice.error}`;
    if (voice.isListening) return 'Listening...';
    return 'Voice control off';
  };

  return (
    <div
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Microphone Button */}
      <button
        onClick={voice.toggle}
        title={getStatusText()}
        style={{
          width: '32px',
          height: '32px',
          borderRadius: '6px',
          border: `1px solid ${getStatusColor()}40`,
          background: voice.isListening ? `${getStatusColor()}20` : 'transparent',
          color: getStatusColor(),
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '16px',
          transition: 'all 0.2s ease',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Microphone icon */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>

        {/* Pulsing animation when listening */}
        {voice.isListening && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: '6px',
              border: `2px solid ${getStatusColor()}`,
              animation: 'voicePulse 1.5s ease-in-out infinite',
            }}
          />
        )}
      </button>

      {/* Live transcript popup */}
      {showTranscript && voice.lastTranscript && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: '8px',
            padding: '8px 12px',
            background: 'rgba(0, 0, 0, 0.9)',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            zIndex: 10000,
            animation: 'fadeInUp 0.2s ease',
          }}
        >
          "{voice.lastTranscript}"
          {voice.lastCommand?.success && (
            <span style={{ color: '#22c55e', marginLeft: '8px' }}>
              {voice.lastCommand.action}
            </span>
          )}
        </div>
      )}

      {/* Tooltip with commands list */}
      {showTooltip && !voice.isListening && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            right: 0,
            marginTop: '8px',
            padding: '12px',
            background: 'rgba(0, 0, 0, 0.95)',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: '#fff',
            fontSize: '11px',
            width: '200px',
            zIndex: 10000,
            animation: 'fadeInUp 0.2s ease',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: '8px', color: '#a855f7' }}>
            Voice Commands
          </div>
          <div style={{ color: '#9ca3af', lineHeight: 1.6 }}>
            <div>"Switch to session 3"</div>
            <div>"Create new session"</div>
            <div>"Show dashboard"</div>
            <div>"Show projects"</div>
            <div>"Open command palette"</div>
            <div>"Show shortcuts"</div>
            <div>"Stop listening"</div>
          </div>
          <div
            style={{
              marginTop: '8px',
              paddingTop: '8px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              color: '#6b7280',
              fontSize: '10px',
            }}
          >
            Click to {voice.isListening ? 'stop' : 'start'}
          </div>
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes voicePulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.05);
          }
        }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(-5px) translateX(-50%);
          }
          to {
            opacity: 1;
            transform: translateY(0) translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
};

export default VoiceControlIndicator;
