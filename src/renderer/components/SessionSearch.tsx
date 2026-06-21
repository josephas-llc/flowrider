import React from 'react';
import { useStore, useFilteredSessions } from '../store';

export const SessionSearch: React.FC = () => {
  const {
    searchQuery,
    searchFilter,
    setSearchQuery,
    setSearchFilter,
    selectFace,
  } = useStore();

  const filteredSessions = useFilteredSessions();
  const hasFilter = searchQuery.trim() !== '' || searchFilter !== 'all';

  const handleSessionClick = (faceIndex: number) => {
    selectFace(faceIndex);
    // Optionally clear search after selection
    // setSearchQuery('');
  };

  return (
    <div className="session-search">
      {/* Search Input */}
      <div className="search-input-wrapper">
        <span className="search-icon">⌕</span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search sessions..."
          className="search-input"
        />
        {searchQuery && (
          <button
            className="clear-btn"
            onClick={() => setSearchQuery('')}
            title="Clear search"
          >
            ×
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="filter-tabs">
        {(['all', 'active', 'empty', 'hypothesis'] as const).map((filter) => (
          <button
            key={filter}
            className={`filter-tab ${searchFilter === filter ? 'active' : ''}`}
            onClick={() => setSearchFilter(filter)}
          >
            {filter === 'all' && 'All'}
            {filter === 'active' && 'Active'}
            {filter === 'empty' && 'Empty'}
            {filter === 'hypothesis' && 'Branches'}
          </button>
        ))}
      </div>

      {/* Results */}
      {hasFilter && (
        <div className="search-results">
          <div className="results-header">
            <span>{filteredSessions.length} session{filteredSessions.length !== 1 ? 's' : ''}</span>
          </div>
          <div className="results-list">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`result-item ${session.status}`}
                onClick={() => handleSessionClick(session.faceIndex)}
              >
                <span className="result-face">
                  #{String(session.faceIndex + 1).padStart(2, '0')}
                </span>
                <div className="result-info">
                  <span className="result-name">{session.name}</span>
                  {session.status !== 'empty' && (
                    <span className="result-dir">{session.workingDir}</span>
                  )}
                </div>
                <span className={`result-status ${session.status}`}>
                  {session.status === 'empty' ? '○' :
                   session.status === 'attached' ? '◉' : '●'}
                </span>
              </div>
            ))}
            {filteredSessions.length === 0 && (
              <div className="no-results">
                No sessions match your search
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .session-search {
          padding: 12px;
          border-bottom: 1px solid var(--border-color);
          background: var(--bg-secondary);
        }

        .search-input-wrapper {
          display: flex;
          align-items: center;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 6px;
          padding: 0 12px;
        }

        .search-icon {
          color: var(--text-secondary);
          font-size: 14px;
          margin-right: 8px;
        }

        .search-input {
          flex: 1;
          background: transparent;
          border: none;
          color: var(--text-primary);
          font-size: 13px;
          padding: 10px 0;
          outline: none;
        }

        .search-input::placeholder {
          color: var(--text-secondary);
        }

        .clear-btn {
          background: none;
          border: none;
          color: var(--text-secondary);
          font-size: 18px;
          cursor: pointer;
          padding: 0 4px;
          line-height: 1;
        }

        .clear-btn:hover {
          color: var(--text-primary);
        }

        .filter-tabs {
          display: flex;
          gap: 4px;
          margin-top: 10px;
        }

        .filter-tab {
          flex: 1;
          padding: 6px 8px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          color: var(--text-secondary);
          font-size: 11px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .filter-tab:hover {
          background: var(--bg-primary);
          color: var(--text-primary);
        }

        .filter-tab.active {
          background: rgba(0, 255, 255, 0.1);
          border-color: rgba(0, 255, 255, 0.3);
          color: #00ffff;
        }

        .search-results {
          margin-top: 12px;
          max-height: 200px;
          overflow-y: auto;
        }

        .results-header {
          font-size: 10px;
          color: var(--text-secondary);
          margin-bottom: 8px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .results-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .result-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 10px;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-color);
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .result-item:hover {
          background: var(--bg-primary);
          border-color: rgba(0, 255, 255, 0.3);
        }

        .result-item.attached {
          border-color: rgba(0, 255, 255, 0.4);
        }

        .result-face {
          font-family: monospace;
          font-size: 11px;
          color: #00ffff;
          min-width: 28px;
        }

        .result-info {
          flex: 1;
          min-width: 0;
        }

        .result-name {
          display: block;
          font-size: 12px;
          color: var(--text-primary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-dir {
          display: block;
          font-size: 10px;
          color: var(--text-secondary);
          font-family: monospace;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .result-status {
          font-size: 10px;
        }

        .result-status.empty {
          color: #666;
        }

        .result-status.active {
          color: #00ff88;
        }

        .result-status.attached {
          color: #00ffff;
        }

        .no-results {
          text-align: center;
          padding: 20px;
          color: var(--text-secondary);
          font-size: 12px;
        }
      `}</style>
    </div>
  );
};
