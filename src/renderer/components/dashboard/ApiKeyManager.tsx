import React, { useState, useEffect } from 'react';

type ApiKeyScope = 'read' | 'write' | 'admin';

interface ApiKey {
  id: string;
  name: string;
  prefix: string; // First 8 chars of the key for display
  fullKey?: string; // Only available when newly created
  scopes: ApiKeyScope[];
  createdAt: number;
  lastUsed: number | null;
  expiresAt: number | null;
}

export const ApiKeyManager: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<ApiKeyScope[]>(['read']);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKey | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Load API keys on mount
  useEffect(() => {
    loadApiKeys();
  }, []);

  const loadApiKeys = async () => {
    setLoading(true);
    try {
      // TODO: Implement IPC call to get API keys
      // Simulate loading for now
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Mock data
      const mockKeys: ApiKey[] = [
        {
          id: 'key-1',
          name: 'Production Key',
          prefix: 'fr_prod_',
          scopes: ['read', 'write'],
          createdAt: Date.now() - 86400000 * 30,
          lastUsed: Date.now() - 3600000,
          expiresAt: null,
        },
        {
          id: 'key-2',
          name: 'CI/CD Pipeline',
          prefix: 'fr_cicd_',
          scopes: ['read'],
          createdAt: Date.now() - 86400000 * 15,
          lastUsed: Date.now() - 7200000,
          expiresAt: null,
        },
      ];
      setKeys(mockKeys);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load API keys');
    }
    setLoading(false);
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      setError('Please enter a key name');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Implement IPC call to create API key
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Generate a mock key
      const fullKey = `fr_${newKeyName.toLowerCase().replace(/\s+/g, '_')}_${Math.random().toString(36).substr(2, 24)}`;
      const newKey: ApiKey = {
        id: `key-${Date.now()}`,
        name: newKeyName,
        prefix: fullKey.substring(0, 12),
        fullKey,
        scopes: newKeyScopes,
        createdAt: Date.now(),
        lastUsed: null,
        expiresAt: null,
      };

      setKeys([...keys, newKey]);
      setNewlyCreatedKey(newKey);
      setNewKeyName('');
      setNewKeyScopes(['read']);
      setShowCreateModal(false);
      setSuccess('API key created successfully! Copy it now - it will only be shown once.');

      setTimeout(() => setSuccess(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create API key');
    }
    setLoading(false);
  };

  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this API key? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // TODO: Implement IPC call to delete API key
      await new Promise((resolve) => setTimeout(resolve, 300));

      setKeys(keys.filter((k) => k.id !== keyId));
      setSuccess('API key deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete API key');
    }
    setLoading(false);
  };

  const handleCopyKey = (key: ApiKey) => {
    const textToCopy = key.fullKey || key.prefix;
    navigator.clipboard.writeText(textToCopy);
    setCopiedKeyId(key.id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleToggleScope = (scope: ApiKeyScope) => {
    if (newKeyScopes.includes(scope)) {
      // Don't allow removing the last scope
      if (newKeyScopes.length > 1) {
        setNewKeyScopes(newKeyScopes.filter((s) => s !== scope));
      }
    } else {
      setNewKeyScopes([...newKeyScopes, scope]);
    }
  };

  const getScopeBadgeColor = (scope: ApiKeyScope): string => {
    switch (scope) {
      case 'read':
        return '#00aaff';
      case 'write':
        return '#ff8800';
      case 'admin':
        return '#ff4444';
      default:
        return '#888';
    }
  };

  const formatDate = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;

    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else if (diff < 604800000) {
      return `${Math.floor(diff / 86400000)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="api-key-manager" style={styles.panel}>
      <div style={styles.header}>
        <h3 style={styles.title}>API Key Management</h3>
        <button
          onClick={() => setShowCreateModal(true)}
          style={styles.createButton}
          disabled={loading}
        >
          + Create New Key
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      {/* Newly Created Key Display */}
      {newlyCreatedKey && newlyCreatedKey.fullKey && (
        <div style={styles.newKeyBox}>
          <div style={styles.newKeyTitle}>🔑 Your New API Key</div>
          <div style={styles.newKeyWarning}>
            Make sure to copy this key now. You won't be able to see it again!
          </div>
          <div style={styles.newKeyDisplay}>
            <code style={styles.keyCode}>{newlyCreatedKey.fullKey}</code>
            <button
              onClick={() => handleCopyKey(newlyCreatedKey)}
              style={styles.copyIconButton}
            >
              {copiedKeyId === newlyCreatedKey.id ? '✓' : '📋'}
            </button>
          </div>
          <button
            onClick={() => setNewlyCreatedKey(null)}
            style={styles.dismissButton}
          >
            I've copied it, dismiss this
          </button>
        </div>
      )}

      {/* API Keys List */}
      {loading && keys.length === 0 ? (
        <div style={styles.loading}>Loading API keys...</div>
      ) : keys.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>🔐</div>
          <h4 style={styles.emptyTitle}>No API Keys</h4>
          <p style={styles.emptyText}>
            Create your first API key to start using the REST API
          </p>
        </div>
      ) : (
        <div style={styles.keysList}>
          {keys.map((key) => (
            <div key={key.id} style={styles.keyCard}>
              <div style={styles.keyHeader}>
                <div style={styles.keyName}>{key.name}</div>
                <div style={styles.keyActions}>
                  <button
                    onClick={() => handleCopyKey(key)}
                    style={styles.actionButton}
                    title="Copy key prefix"
                  >
                    {copiedKeyId === key.id ? '✓' : '📋'}
                  </button>
                  <button
                    onClick={() => handleDeleteKey(key.id)}
                    style={{ ...styles.actionButton, ...styles.deleteButton }}
                    title="Delete key"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div style={styles.keyPrefix}>
                <span style={styles.prefixLabel}>Key:</span>
                <code style={styles.prefixCode}>
                  {key.prefix}•••••••••••••••
                </code>
              </div>

              <div style={styles.keyScopes}>
                {key.scopes.map((scope) => (
                  <span
                    key={scope}
                    style={{
                      ...styles.scopeBadge,
                      backgroundColor: getScopeBadgeColor(scope),
                    }}
                  >
                    {scope}
                  </span>
                ))}
              </div>

              <div style={styles.keyMeta}>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Created:</span>
                  <span style={styles.metaValue}>
                    {formatDate(key.createdAt)}
                  </span>
                </div>
                <div style={styles.metaItem}>
                  <span style={styles.metaLabel}>Last used:</span>
                  <span style={styles.metaValue}>
                    {formatDate(key.lastUsed)}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Key Modal */}
      {showCreateModal && (
        <div style={styles.modalOverlay} onClick={() => setShowCreateModal(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>Create New API Key</h3>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Key Name</label>
              <input
                type="text"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="e.g., Production, CI/CD, Testing"
                style={styles.formInput}
                autoFocus
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.formLabel}>Permissions</label>
              <div style={styles.scopeToggles}>
                {(['read', 'write', 'admin'] as ApiKeyScope[]).map((scope) => (
                  <button
                    key={scope}
                    onClick={() => handleToggleScope(scope)}
                    style={{
                      ...styles.scopeToggle,
                      backgroundColor: newKeyScopes.includes(scope)
                        ? getScopeBadgeColor(scope)
                        : '#333',
                      opacity: newKeyScopes.includes(scope) ? 1 : 0.5,
                    }}
                  >
                    {scope}
                  </button>
                ))}
              </div>
              <div style={styles.scopeHints}>
                <div style={styles.scopeHint}>
                  <strong>Read:</strong> View sessions, projects, metrics
                </div>
                <div style={styles.scopeHint}>
                  <strong>Write:</strong> Create/modify sessions, send commands
                </div>
                <div style={styles.scopeHint}>
                  <strong>Admin:</strong> Full access including API key management
                </div>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={styles.cancelButton}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateKey}
                disabled={!newKeyName.trim() || loading}
                style={{
                  ...styles.confirmButton,
                  opacity: !newKeyName.trim() || loading ? 0.5 : 1,
                }}
              >
                {loading ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '24px',
    color: '#fff',
    fontFamily: 'monospace',
    maxWidth: '900px',
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
  createButton: {
    padding: '10px 20px',
    background: '#00ffff',
    color: '#000',
    border: 'none',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
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
  newKeyBox: {
    padding: '20px',
    background: 'rgba(0, 255, 136, 0.1)',
    border: '2px solid #00ff88',
    borderRadius: '8px',
    marginBottom: '24px',
  },
  newKeyTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#00ff88',
    marginBottom: '8px',
  },
  newKeyWarning: {
    fontSize: '13px',
    color: '#ff8800',
    marginBottom: '12px',
  },
  newKeyDisplay: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  keyCode: {
    flex: 1,
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.5)',
    borderRadius: '4px',
    color: '#00ff88',
    fontSize: '13px',
    wordBreak: 'break-all',
  },
  copyIconButton: {
    padding: '12px 20px',
    background: 'rgba(0, 255, 136, 0.2)',
    border: '1px solid #00ff88',
    borderRadius: '4px',
    color: '#00ff88',
    cursor: 'pointer',
    fontSize: '16px',
  },
  dismissButton: {
    padding: '8px 16px',
    background: 'transparent',
    border: '1px solid #00ff88',
    borderRadius: '4px',
    color: '#00ff88',
    fontFamily: 'monospace',
    fontSize: '12px',
    cursor: 'pointer',
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    padding: '40px',
    fontSize: '14px',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyTitle: {
    fontSize: '18px',
    color: '#fff',
    marginBottom: '8px',
  },
  emptyText: {
    fontSize: '14px',
    color: '#888',
  },
  keysList: {
    display: 'grid',
    gap: '16px',
  },
  keyCard: {
    padding: '20px',
    background: 'rgba(0, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    borderRadius: '8px',
  },
  keyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  keyName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
  },
  keyActions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '6px 12px',
    background: 'rgba(0, 255, 255, 0.1)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '4px',
    color: '#00ffff',
    cursor: 'pointer',
    fontSize: '14px',
  },
  deleteButton: {
    background: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid rgba(255, 68, 68, 0.3)',
    color: '#ff4444',
  },
  keyPrefix: {
    marginBottom: '12px',
  },
  prefixLabel: {
    fontSize: '12px',
    color: '#888',
    marginRight: '8px',
  },
  prefixCode: {
    fontSize: '13px',
    color: '#00ffff',
    fontFamily: 'monospace',
  },
  keyScopes: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  scopeBadge: {
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    textTransform: 'uppercase',
  },
  keyMeta: {
    display: 'flex',
    gap: '24px',
    paddingTop: '12px',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
  },
  metaItem: {
    fontSize: '12px',
  },
  metaLabel: {
    color: '#888',
    marginRight: '8px',
  },
  metaValue: {
    color: '#fff',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#1a1a1f',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '8px',
    padding: '32px',
    maxWidth: '500px',
    width: '90%',
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#00ffff',
    marginBottom: '24px',
    marginTop: 0,
  },
  formGroup: {
    marginBottom: '24px',
  },
  formLabel: {
    display: 'block',
    fontSize: '14px',
    color: '#888',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  formInput: {
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
  scopeToggles: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
  },
  scopeToggle: {
    flex: 1,
    padding: '10px',
    border: 'none',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '13px',
    fontWeight: 'bold',
    cursor: 'pointer',
    textTransform: 'uppercase',
    color: '#fff',
    transition: 'all 0.2s',
  },
  scopeHints: {
    fontSize: '12px',
    color: '#888',
    lineHeight: '1.6',
  },
  scopeHint: {
    marginBottom: '4px',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
  },
  cancelButton: {
    padding: '12px 24px',
    background: 'transparent',
    border: '1px solid #888',
    borderRadius: '4px',
    color: '#888',
    fontFamily: 'monospace',
    fontSize: '14px',
    cursor: 'pointer',
  },
  confirmButton: {
    padding: '12px 24px',
    background: '#00ffff',
    border: 'none',
    borderRadius: '4px',
    color: '#000',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
};

export default ApiKeyManager;
