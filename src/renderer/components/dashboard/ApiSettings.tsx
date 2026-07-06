import React, { useState, useEffect } from 'react';

interface ApiSettings {
  enabled: boolean;
  port: number;
  allowRemote: boolean;
  requireApiKey: boolean;
  url: string;
}

export const ApiSettings: React.FC = () => {
  const [settings, setSettings] = useState<ApiSettings>({
    enabled: false,
    port: 3847,
    allowRemote: false,
    requireApiKey: true,
    url: 'http://localhost:3847',
  });
  const [isRunning, setIsRunning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load API settings on mount
  useEffect(() => {
    loadApiSettings();
  }, []);

  const loadApiSettings = async () => {
    // TODO: Implement IPC call to get API settings
    // For now, use defaults
    const defaultSettings: ApiSettings = {
      enabled: false,
      port: 3847,
      allowRemote: false,
      requireApiKey: true,
      url: 'http://localhost:3847',
    };
    setSettings(defaultSettings);
    setIsRunning(false);
  };

  const handleToggleApi = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Implement IPC call to toggle API
      // Simulate toggle for now
      await new Promise((resolve) => setTimeout(resolve, 500));

      const newEnabled = !settings.enabled;
      setSettings({ ...settings, enabled: newEnabled });
      setIsRunning(newEnabled);
      setSuccess(newEnabled ? 'REST API started' : 'REST API stopped');

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to toggle API');
    }
    setLoading(false);
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Implement IPC call to save settings
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Update URL based on settings
      const host = settings.allowRemote ? '0.0.0.0' : 'localhost';
      const newUrl = `http://${host}:${settings.port}`;
      setSettings({ ...settings, url: newUrl });

      setSuccess('Settings saved');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    }
    setLoading(false);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(settings.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenDocs = () => {
    window.open(`${settings.url}/api/docs`, '_blank');
  };

  return (
    <div className="api-settings-panel" style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>REST API Settings</h3>
        <div style={styles.statusBadge}>
          <span
            style={{
              ...styles.statusDot,
              backgroundColor: isRunning ? '#00ff88' : '#ff4444',
            }}
          />
          <span style={{ color: isRunning ? '#00ff88' : '#ff4444' }}>
            {isRunning ? 'Running' : 'Stopped'}
          </span>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* API URL Display */}
      <div style={styles.section}>
        <label style={styles.label}>API URL</label>
        <div style={styles.urlContainer}>
          <input
            type="text"
            value={settings.url}
            readOnly
            style={styles.urlInput}
          />
          <button
            onClick={handleCopyUrl}
            style={styles.copyButton}
            title="Copy URL"
          >
            {copied ? '✓' : '📋'}
          </button>
        </div>
      </div>

      {/* Main Toggle */}
      <div style={styles.section}>
        <div style={styles.toggleRow}>
          <div>
            <div style={styles.toggleLabel}>Enable REST API</div>
            <div style={styles.toggleHint}>
              Start the REST API server to allow external access
            </div>
          </div>
          <button
            onClick={handleToggleApi}
            disabled={loading}
            style={{
              ...styles.toggle,
              backgroundColor: settings.enabled ? '#00ffff' : '#333',
            }}
          >
            {settings.enabled ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Port Setting */}
      <div style={styles.section}>
        <label style={styles.label}>Port Number</label>
        <input
          type="number"
          value={settings.port}
          onChange={(e) => {
            const port = parseInt(e.target.value, 10);
            if (port >= 1024 && port <= 65535) {
              setSettings({ ...settings, port });
            }
          }}
          min={1024}
          max={65535}
          style={styles.input}
          disabled={settings.enabled}
        />
        {settings.enabled && (
          <div style={styles.hint}>Stop the API to change the port</div>
        )}
      </div>

      {/* Allow Remote Connections */}
      <div style={styles.section}>
        <div style={styles.toggleRow}>
          <div>
            <div style={styles.toggleLabel}>Allow Remote Connections</div>
            <div style={styles.warningHint}>
              ⚠️ Warning: This will expose the API to your network
            </div>
          </div>
          <button
            onClick={() =>
              setSettings({ ...settings, allowRemote: !settings.allowRemote })
            }
            disabled={loading || settings.enabled}
            style={{
              ...styles.toggle,
              backgroundColor: settings.allowRemote ? '#ff8800' : '#333',
            }}
          >
            {settings.allowRemote ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Require API Key */}
      <div style={styles.section}>
        <div style={styles.toggleRow}>
          <div>
            <div style={styles.toggleLabel}>Require API Key</div>
            <div style={styles.toggleHint}>
              Recommended for security when allowing remote connections
            </div>
          </div>
          <button
            onClick={() =>
              setSettings({
                ...settings,
                requireApiKey: !settings.requireApiKey,
              })
            }
            disabled={loading || settings.enabled}
            style={{
              ...styles.toggle,
              backgroundColor: settings.requireApiKey ? '#00ff88' : '#333',
            }}
          >
            {settings.requireApiKey ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={styles.buttonRow}>
        <button
          onClick={handleSaveSettings}
          disabled={loading || settings.enabled}
          style={{
            ...styles.button,
            ...styles.saveButton,
            opacity: loading || settings.enabled ? 0.5 : 1,
          }}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </button>
        <button
          onClick={handleOpenDocs}
          disabled={!isRunning}
          style={{
            ...styles.button,
            ...styles.docsButton,
            opacity: !isRunning ? 0.5 : 1,
          }}
        >
          Open API Docs
        </button>
      </div>

      {/* Info Box */}
      <div style={styles.infoBox}>
        <div style={styles.infoTitle}>📘 Quick Info</div>
        <ul style={styles.infoList}>
          <li>The REST API allows external tools to interact with Flowrider</li>
          <li>API documentation is available at {settings.url}/api/docs</li>
          <li>
            Use API keys to authenticate requests (manage keys in the API Keys
            tab)
          </li>
          <li>Default port is 3847 (configurable between 1024-65535)</li>
        </ul>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '24px',
    color: '#fff',
    fontFamily: 'monospace',
    maxWidth: '800px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#00ffff',
    margin: 0,
  },
  statusBadge: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '8px 16px',
    background: 'rgba(0, 0, 0, 0.3)',
    borderRadius: '20px',
    fontSize: '14px',
  },
  statusDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    display: 'inline-block',
  },
  error: {
    background: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid #ff4444',
    borderRadius: '4px',
    padding: '12px',
    color: '#ff4444',
    marginBottom: '16px',
    fontSize: '14px',
  },
  success: {
    background: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid #00ff88',
    borderRadius: '4px',
    padding: '12px',
    color: '#00ff88',
    marginBottom: '16px',
    fontSize: '14px',
  },
  section: {
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    color: '#888',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  urlContainer: {
    display: 'flex',
    gap: '8px',
  },
  urlInput: {
    flex: 1,
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '4px',
    color: '#00ffff',
    fontFamily: 'monospace',
    fontSize: '14px',
  },
  copyButton: {
    padding: '12px 20px',
    background: 'rgba(0, 255, 255, 0.1)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '4px',
    color: '#00ffff',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'all 0.2s',
  },
  toggleRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    background: 'rgba(0, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    borderRadius: '8px',
  },
  toggleLabel: {
    fontSize: '16px',
    color: '#fff',
    fontWeight: 500,
    marginBottom: '4px',
  },
  toggleHint: {
    fontSize: '12px',
    color: '#888',
  },
  warningHint: {
    fontSize: '12px',
    color: '#ff8800',
  },
  toggle: {
    padding: '8px 24px',
    border: 'none',
    borderRadius: '20px',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '80px',
  },
  input: {
    width: '100%',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '4px',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  hint: {
    fontSize: '12px',
    color: '#888',
    marginTop: '8px',
  },
  buttonRow: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
  },
  button: {
    flex: 1,
    padding: '14px 24px',
    border: 'none',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  saveButton: {
    background: '#00ffff',
    color: '#000',
  },
  docsButton: {
    background: 'transparent',
    border: '1px solid #00ffff',
    color: '#00ffff',
  },
  infoBox: {
    marginTop: '32px',
    padding: '16px',
    background: 'rgba(0, 100, 255, 0.1)',
    border: '1px solid rgba(0, 100, 255, 0.3)',
    borderRadius: '8px',
  },
  infoTitle: {
    fontSize: '14px',
    color: '#00aaff',
    fontWeight: 'bold',
    marginBottom: '12px',
  },
  infoList: {
    margin: 0,
    paddingLeft: '20px',
    fontSize: '13px',
    color: '#aaa',
    lineHeight: '1.8',
  },
};

export default ApiSettings;
