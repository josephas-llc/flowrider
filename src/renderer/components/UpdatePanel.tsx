/**
 * UpdatePanel - Shows update status and allows downloading/installing updates
 */

import { useState, useEffect, useCallback } from 'react';

interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'not-available' | 'downloading' | 'ready' | 'error';
  version?: string;
  releaseNotes?: string;
  progress?: number;
  error?: string;
}

export function UpdatePanel() {
  const [status, setStatus] = useState<UpdateStatus>({ status: 'idle' });
  const [currentVersion, setCurrentVersion] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Get current version on mount
  useEffect(() => {
    window.electronAPI?.update?.getVersion?.().then((version: string) => {
      setCurrentVersion(version);
    }).catch(() => {
      setCurrentVersion('unknown');
    });

    // Subscribe to status changes
    const unsubscribe = window.electronAPI?.update?.onStatusChange?.((newStatus: UpdateStatus) => {
      setStatus(newStatus);
      // Auto-expand when update is available
      if (newStatus.status === 'available' || newStatus.status === 'ready') {
        setIsExpanded(true);
      }
    });

    // Get initial status
    window.electronAPI?.update?.getStatus?.().then((initialStatus: UpdateStatus) => {
      if (initialStatus) setStatus(initialStatus);
    }).catch(() => {});

    return () => {
      unsubscribe?.();
    };
  }, []);

  const checkForUpdates = useCallback(async () => {
    try {
      await window.electronAPI?.update?.check?.();
    } catch (error) {
      console.error('Failed to check for updates:', error);
    }
  }, []);

  const downloadUpdate = useCallback(async () => {
    try {
      await window.electronAPI?.update?.download?.();
    } catch (error) {
      console.error('Failed to download update:', error);
    }
  }, []);

  const installUpdate = useCallback(async () => {
    try {
      await window.electronAPI?.update?.install?.();
    } catch (error) {
      console.error('Failed to install update:', error);
    }
  }, []);

  const getStatusIcon = () => {
    switch (status.status) {
      case 'checking':
      case 'downloading':
        return (
          <span className="update-spinner" style={{
            display: 'inline-block',
            width: '12px',
            height: '12px',
            border: '2px solid #3b82f6',
            borderTopColor: 'transparent',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        );
      case 'available':
        return <span style={{ color: '#f59e0b' }}>!</span>;
      case 'ready':
        return <span style={{ color: '#10b981' }}>&#10003;</span>;
      case 'error':
        return <span style={{ color: '#ef4444' }}>&#10007;</span>;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'checking':
        return 'Checking for updates...';
      case 'available':
        return `Update available: v${status.version}`;
      case 'not-available':
        return 'You\'re up to date';
      case 'downloading':
        return `Downloading... ${status.progress?.toFixed(0) || 0}%`;
      case 'ready':
        return `Ready to install v${status.version}`;
      case 'error':
        return `Error: ${status.error || 'Unknown error'}`;
      default:
        return `Current version: v${currentVersion}`;
    }
  };

  // Minimal display when no update is available
  if (!isExpanded && status.status !== 'available' && status.status !== 'ready') {
    return (
      <div
        onClick={() => setIsExpanded(true)}
        style={{
          padding: '8px 12px',
          fontSize: '12px',
          color: '#666',
          cursor: 'pointer',
          borderTop: '1px solid #222',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <span>v{currentVersion}</span>
        {getStatusIcon()}
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px',
      borderTop: '1px solid #222',
      backgroundColor: '#0a0a0f'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px'
      }}>
        <span style={{
          fontSize: '12px',
          color: '#888',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {getStatusIcon()}
          {getStatusText()}
        </span>
        <button
          onClick={() => setIsExpanded(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px 6px'
          }}
        >
          &#10005;
        </button>
      </div>

      {status.status === 'downloading' && (
        <div style={{
          width: '100%',
          height: '4px',
          backgroundColor: '#333',
          borderRadius: '2px',
          overflow: 'hidden',
          marginBottom: '8px'
        }}>
          <div style={{
            width: `${status.progress || 0}%`,
            height: '100%',
            backgroundColor: '#3b82f6',
            transition: 'width 0.3s ease'
          }} />
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px' }}>
        {status.status === 'idle' || status.status === 'not-available' || status.status === 'error' ? (
          <button
            onClick={checkForUpdates}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: '#1a1a2e',
              color: '#fff',
              border: '1px solid #333',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Check for Updates
          </button>
        ) : null}

        {status.status === 'available' && (
          <button
            onClick={downloadUpdate}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Download v{status.version}
          </button>
        )}

        {status.status === 'ready' && (
          <button
            onClick={installUpdate}
            style={{
              flex: 1,
              padding: '8px 12px',
              fontSize: '12px',
              backgroundColor: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Install & Restart
          </button>
        )}
      </div>

      {status.releaseNotes && status.status === 'available' && (
        <div style={{
          marginTop: '8px',
          padding: '8px',
          backgroundColor: '#111',
          borderRadius: '4px',
          fontSize: '11px',
          color: '#888',
          maxHeight: '100px',
          overflow: 'auto'
        }}>
          <strong style={{ color: '#fff' }}>Release Notes:</strong>
          <p style={{ margin: '4px 0 0 0', whiteSpace: 'pre-wrap' }}>
            {status.releaseNotes}
          </p>
        </div>
      )}

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
