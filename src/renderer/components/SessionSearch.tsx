import React, { useEffect, useRef, useState } from 'react';
import { useStore } from '../store';

interface SessionSearchProps {
  onClose: () => void;
}

export const SessionSearch: React.FC<SessionSearchProps> = ({ onClose }) => {
  const {
    sessions,
    selectFace,
    setAttachedSession,
    updateSession,
  } = useStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Fuzzy search implementation
  const fuzzyMatch = (text: string, query: string): boolean => {
    if (!query) return true;
    const queryLower = query.toLowerCase();
    const textLower = text.toLowerCase();

    // Simple fuzzy matching: all query chars must appear in order
    let queryIndex = 0;
    for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
      if (textLower[i] === queryLower[queryIndex]) {
        queryIndex++;
      }
    }
    return queryIndex === queryLower.length;
  };

  // Filter and rank sessions
  const filteredSessions = sessions
    .map((session, index) => ({ session, index }))
    .filter(({ session }) => {
      if (!query) return session.status !== 'empty'; // Show only active sessions when no query

      // Search through name, working dir, project name, notes
      return (
        fuzzyMatch(session.name, query) ||
        fuzzyMatch(session.workingDir, query) ||
        (session.notes && fuzzyMatch(session.notes, query)) ||
        (session.gitHubRepo?.repo && fuzzyMatch(session.gitHubRepo.repo, query))
      );
    });

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filteredSessions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filteredSessions.length > 0) {
        e.preventDefault();
        handleSelect(filteredSessions[selectedIndex].index);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredSessions, onClose]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelect = (faceIndex: number) => {
    const session = sessions[faceIndex];
    selectFace(faceIndex);

    // If session is active, attach to it
    if (session?.tmuxSession && session.status !== 'empty') {
      setAttachedSession(session.id);
      updateSession(faceIndex, { status: 'attached' });
    }

    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="session-search-overlay" onClick={handleBackdropClick}>
      <div className="session-search-palette">
        {/* Search Input */}
        <div className="search-input-wrapper">
          <span className="search-icon">⌕</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sessions by name, directory, or project..."
            className="search-input"
          />
          <span className="search-hint">Cmd+/</span>
        </div>

        {/* Results */}
        <div className="search-results">
          {filteredSessions.length === 0 ? (
            <div className="no-results">
              {query ? 'No sessions match your search' : 'No active sessions'}
            </div>
          ) : (
            <div className="results-list">
              {filteredSessions.map(({ session, index }, i) => (
                <div
                  key={session.id}
                  className={`result-item ${session.status} ${i === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleSelect(index)}
                  onMouseEnter={() => setSelectedIndex(i)}
                >
                  <div className="result-left">
                    <span className="result-face">
                      #{String(index + 1).padStart(2, '0')}
                    </span>
                    <div className="result-info">
                      <span className="result-name">{session.name}</span>
                      {session.workingDir && (
                        <span className="result-dir">{session.workingDir}</span>
                      )}
                    </div>
                  </div>
                  <span className={`result-status ${session.status}`}>
                    {session.status === 'empty' ? '○' :
                     session.status === 'attached' ? '◉' : '●'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="search-footer">
          <span>↑↓ Navigate</span>
          <span>Enter Select</span>
          <span>Esc Close</span>
        </div>
      </div>

      <style>{`
        .session-search-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding-top: 120px;
          z-index: 9999;
          animation: fadeIn 0.15s ease-out;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes slideDown {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .session-search-palette {
          background: #0d0d14;
          border: 1px solid rgba(0, 255, 255, 0.2);
          border-radius: 12px;
          width: 600px;
          max-width: 90vw;
          box-shadow: 0 24px 48px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 255, 255, 0.1);
          overflow: hidden;
          animation: slideDown 0.2s ease-out;
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          gap: 12px;
        }

        .search-icon {
          color: #00ffff;
          font-size: 18px;
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: #fff;
          font-size: 16px;
          outline: none;
          min-width: 0;
        }

        .search-input::placeholder {
          color: #666;
        }

        .search-hint {
          color: #666;
          font-size: 12px;
          font-family: monospace;
          background: rgba(255, 255, 255, 0.05);
          padding: 4px 8px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .search-results {
          max-height: 400px;
          overflow-y: auto;
        }

        .search-results::-webkit-scrollbar {
          width: 6px;
        }

        .search-results::-webkit-scrollbar-track {
          background: transparent;
        }

        .search-results::-webkit-scrollbar-thumb {
          background: rgba(0, 255, 255, 0.2);
          border-radius: 3px;
        }

        .results-list {
          display: flex;
          flex-direction: column;
        }

        .result-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 20px;
          cursor: pointer;
          transition: all 0.15s ease;
          border-left: 3px solid transparent;
        }

        .result-item:hover,
        .result-item.selected {
          background: rgba(0, 255, 255, 0.08);
          border-left-color: #00ffff;
        }

        .result-item.selected {
          background: rgba(0, 255, 255, 0.12);
        }

        .result-item.attached {
          background: rgba(0, 255, 255, 0.05);
        }

        .result-left {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
          min-width: 0;
        }

        .result-face {
          font-family: monospace;
          font-size: 13px;
          color: #00ffff;
          font-weight: 600;
          min-width: 32px;
          flex-shrink: 0;
        }

        .result-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
          min-width: 0;
          flex: 1;
        }

        .result-name {
          font-size: 14px;
          color: #fff;
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-dir {
          font-size: 12px;
          color: #888;
          font-family: monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-status {
          font-size: 12px;
          flex-shrink: 0;
          margin-left: 12px;
        }

        .result-status.empty {
          color: #555;
        }

        .result-status.active {
          color: #00ff88;
        }

        .result-status.attached {
          color: #00ffff;
        }

        .no-results {
          text-align: center;
          padding: 40px 20px;
          color: #666;
          font-size: 14px;
        }

        .search-footer {
          display: flex;
          gap: 16px;
          padding: 12px 20px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          background: rgba(0, 0, 0, 0.2);
          font-size: 11px;
          color: #666;
        }

        .search-footer span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>
    </div>
  );
};
