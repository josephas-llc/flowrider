/**
 * AutopilotDemoOverlay - Full-screen investor demo overlay
 *
 * This component renders on top of everything during the autopilot demo:
 * - Cinematic narration captions (big text with subtitles)
 * - ZOIX insight notifications
 * - Progress bar
 * - Controls to stop/restart the demo
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { autopilotDemoService, DemoEvent, DemoAction } from '../services/AutopilotDemoService';
import { useStore } from '../store';

interface AutopilotDemoOverlayProps {
  isActive: boolean;
  onClose: () => void;
  onViewChange: (view: 'sessions' | 'projects' | 'dashboard' | 'settings') => void;
}

interface ZoixInsight {
  id: number;
  type: 'pattern' | 'skill' | 'insight';
  text: string;
  timestamp: number;
}

export const AutopilotDemoOverlay: React.FC<AutopilotDemoOverlayProps> = ({
  isActive,
  onClose,
  onViewChange,
}) => {
  const [narration, setNarration] = useState<{ text: string; subtext: string } | null>(null);
  const [progress, setProgress] = useState({ elapsed: 0, total: 90, percent: 0 });
  const [zoixInsights, setZoixInsights] = useState<ZoixInsight[]>([]);
  const [showIcosahedron, setShowIcosahedron] = useState(false);

  // Use ref for insight counter to avoid re-creating the callback
  const insightCounterRef = useRef(0);

  const store = useStore();
  const { selectFace, updateSession, sessions, setAttachedSession } = store;

  // Handle demo events
  const handleDemoEvent = useCallback((event: DemoEvent) => {
    console.log('[AutopilotDemoOverlay] Event:', event.type, event.action);

    if (event.type === 'step' && event.action) {
      switch (event.action) {
        case 'showNarration':
          if (event.data) {
            setNarration({
              text: event.data.text as string,
              subtext: event.data.subtext as string,
            });
          }
          break;

        case 'hideNarration':
          setNarration(null);
          break;

        case 'createSession':
          if (event.data) {
            const index = event.data.index as number;
            const name = event.data.name as string;
            // Create a demo session
            updateSession(index, {
              name,
              status: 'active',
              provider: 'claude',
              model: 'claude-sonnet-4-20250514',
              tmuxSession: `demo-session-${index}`,
            });
          }
          break;

        case 'selectSession':
          if (event.data) {
            const index = event.data.index as number;
            selectFace(index);
            const session = sessions[index];
            if (session?.id) {
              setAttachedSession(session.id);
            }
          }
          break;

        case 'showIcosahedron':
          setShowIcosahedron(true);
          break;

        case 'hideIcosahedron':
          setShowIcosahedron(false);
          break;

        case 'showZoixInsight':
          if (event.data) {
            const currentId = insightCounterRef.current++;
            const newInsight: ZoixInsight = {
              id: currentId,
              type: event.data.type as 'pattern' | 'skill' | 'insight',
              text: event.data.text as string,
              timestamp: Date.now(),
            };
            setZoixInsights(prev => [...prev.slice(-2), newInsight]); // Keep last 3

            // Auto-remove after 5 seconds
            setTimeout(() => {
              setZoixInsights(prev => prev.filter(i => i.id !== currentId));
            }, 5000);
          }
          break;

        case 'triggerZoixPulse':
          // Could trigger visual pulse effect
          break;

        case 'showDashboard':
          onViewChange('dashboard');
          break;

        case 'showProjectsView':
          onViewChange('projects');
          break;

        case 'showTerminalView':
          onViewChange('sessions');
          break;

        case 'complete':
          onClose();
          break;
      }
    }

    if (event.type === 'terminal' && event.data) {
      // Terminal content is handled by getting it from the service
      // The actual terminal display will use getTerminalContent()
    }

    if (event.type === 'complete') {
      onClose();
    }
  }, [selectFace, updateSession, sessions, setAttachedSession, onViewChange, onClose]);

  // Subscribe to demo events and start/stop
  useEffect(() => {
    if (isActive) {
      const unsubscribe = autopilotDemoService.on(handleDemoEvent);
      autopilotDemoService.start();

      // Update progress every 100ms
      const progressInterval = setInterval(() => {
        setProgress(autopilotDemoService.getProgress());
      }, 100);

      return () => {
        unsubscribe();
        clearInterval(progressInterval);
        autopilotDemoService.stop();
      };
    }
  }, [isActive, handleDemoEvent]);

  // Clean up sessions when demo ends
  useEffect(() => {
    if (!isActive) {
      setNarration(null);
      setZoixInsights([]);
      setShowIcosahedron(false);
      setProgress({ elapsed: 0, total: 90, percent: 0 });
    }
  }, [isActive]);

  if (!isActive) return null;

  return (
    <div className="autopilot-demo-overlay">
      {/* Narration Caption - Big cinematic text */}
      {narration && (
        <div className="demo-narration">
          <h1 className="demo-narration-title">{narration.text}</h1>
          <p className="demo-narration-subtitle">{narration.subtext}</p>
        </div>
      )}

      {/* ZOIX Insights - Floating notifications */}
      <div className="demo-zoix-insights">
        {zoixInsights.map((insight) => (
          <div
            key={insight.id}
            className={`demo-zoix-insight ${insight.type}`}
            style={{ animation: 'slideInRight 0.3s ease' }}
          >
            <span className="insight-icon">
              {insight.type === 'pattern' && '🔍'}
              {insight.type === 'skill' && '⚡'}
              {insight.type === 'insight' && '💡'}
            </span>
            <span className="insight-text">{insight.text}</span>
          </div>
        ))}
      </div>

      {/* Progress Bar - Bottom of screen */}
      <div className="demo-progress-container">
        <div className="demo-progress-bar">
          <div
            className="demo-progress-fill"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
        <div className="demo-progress-info">
          <span className="demo-time">
            {Math.floor(progress.elapsed)}s / {progress.total}s
          </span>
          <button className="demo-stop-btn" onClick={onClose}>
            Stop Demo
          </button>
        </div>
      </div>

      {/* Icosahedron indicator */}
      {showIcosahedron && (
        <div className="demo-ico-indicator">
          <span>⬡</span> 3D View Active
        </div>
      )}

      {/* CSS Styles */}
      <style>{`
        .autopilot-demo-overlay {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 10000;
        }

        .demo-narration {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
          animation: fadeIn 0.5s ease;
        }

        .demo-narration-title {
          font-size: 48px;
          font-weight: 700;
          color: #fff;
          text-shadow: 0 4px 20px rgba(0, 0, 0, 0.8);
          margin: 0 0 16px 0;
          letter-spacing: -1px;
        }

        .demo-narration-subtitle {
          font-size: 24px;
          font-weight: 400;
          color: rgba(255, 255, 255, 0.8);
          text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
          margin: 0;
        }

        .demo-zoix-insights {
          position: absolute;
          top: 100px;
          right: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .demo-zoix-insight {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 20px;
          background: rgba(0, 0, 0, 0.9);
          border-radius: 8px;
          border-left: 3px solid #9333ea;
          color: #fff;
          font-size: 14px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
          pointer-events: auto;
        }

        .demo-zoix-insight.pattern {
          border-left-color: #3b82f6;
        }

        .demo-zoix-insight.skill {
          border-left-color: #22c55e;
        }

        .demo-zoix-insight.insight {
          border-left-color: #f59e0b;
        }

        .insight-icon {
          font-size: 18px;
        }

        .insight-text {
          color: rgba(255, 255, 255, 0.9);
        }

        .demo-progress-container {
          position: absolute;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          width: 400px;
          pointer-events: auto;
        }

        .demo-progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
          overflow: hidden;
        }

        .demo-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #9333ea, #3b82f6);
          transition: width 0.1s linear;
        }

        .demo-progress-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }

        .demo-time {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          font-family: monospace;
        }

        .demo-stop-btn {
          padding: 6px 16px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 6px;
          color: #fff;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .demo-stop-btn:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .demo-ico-indicator {
          position: absolute;
          top: 24px;
          left: 24px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: rgba(0, 0, 0, 0.8);
          border-radius: 6px;
          color: #00ffff;
          font-size: 12px;
          font-weight: 600;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translate(-50%, -45%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }

        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default AutopilotDemoOverlay;
