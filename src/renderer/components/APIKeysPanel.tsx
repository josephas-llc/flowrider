import React, { useState, useEffect, useCallback } from 'react';

type AIProviderType = 'claude' | 'openai' | 'ollama' | 'gemini' | 'grok' | 'local';

interface ProviderConfig {
  name: string;
  label: string;
  placeholder: string;
  requiresKey: boolean;
  description: string;
}

const PROVIDER_CONFIGS: Record<AIProviderType, ProviderConfig> = {
  openai: {
    name: 'openai',
    label: 'OpenAI',
    placeholder: 'sk-...',
    requiresKey: true,
    description: 'Get your API key from platform.openai.com',
  },
  claude: {
    name: 'claude',
    label: 'Anthropic (Claude)',
    placeholder: 'Not needed - uses Claude Code CLI',
    requiresKey: false,
    description: 'Claude Code CLI uses environment variables (ANTHROPIC_API_KEY)',
  },
  gemini: {
    name: 'gemini',
    label: 'Google Gemini',
    placeholder: 'AIza...',
    requiresKey: true,
    description: 'Get your API key from aistudio.google.com',
  },
  grok: {
    name: 'grok',
    label: 'Grok (xAI)',
    placeholder: 'xai-...',
    requiresKey: true,
    description: 'Get your API key from x.ai',
  },
  ollama: {
    name: 'ollama',
    label: 'Ollama',
    placeholder: 'No API key needed',
    requiresKey: false,
    description: 'Ollama is local - no API key required',
  },
  local: {
    name: 'local',
    label: 'Local Models',
    placeholder: 'No API key needed',
    requiresKey: false,
    description: 'Local models run on your machine',
  },
};

export const APIKeysPanel: React.FC = () => {
  const [keys, setKeys] = useState<Record<AIProviderType, string>>({
    openai: '',
    claude: '',
    gemini: '',
    grok: '',
    ollama: '',
    local: '',
  });
  const [visibleKeys, setVisibleKeys] = useState<Record<AIProviderType, boolean>>({
    openai: false,
    claude: false,
    gemini: false,
    grok: false,
    ollama: false,
    local: false,
  });
  const [testingProvider, setTestingProvider] = useState<AIProviderType | null>(null);
  const [testResults, setTestResults] = useState<Record<AIProviderType, { success: boolean; message: string } | null>>({
    openai: null,
    claude: null,
    gemini: null,
    grok: null,
    ollama: null,
    local: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load API keys on mount
  const loadApiKeys = useCallback(async () => {
    if (!window.flowrider?.ai) {
      setLoading(false);
      return;
    }

    try {
      const result = await window.flowrider.ai.getApiKeys();
      if (result.success && result.data) {
        const loadedKeys: Record<AIProviderType, string> = {
          openai: result.data.openai || '',
          claude: result.data.claude || '',
          gemini: result.data.gemini || '',
          grok: result.data.grok || '',
          ollama: result.data.ollama || '',
          local: result.data.local || '',
        };
        setKeys(loadedKeys);
      }
    } catch (err) {
      console.error('[APIKeysPanel] Failed to load API keys:', err);
      setError('Failed to load API keys');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadApiKeys();
  }, [loadApiKeys]);

  // Save a specific key
  const handleSaveKey = async (provider: AIProviderType) => {
    if (!window.flowrider?.ai) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await window.flowrider.ai.setApiKey(provider, keys[provider]);
      if (result.success) {
        setSuccess(`${PROVIDER_CONFIGS[provider].label} API key saved`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to save API key');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save API key');
    }
    setSaving(false);
  };

  // Test a provider connection
  const handleTestConnection = async (provider: AIProviderType) => {
    if (!window.flowrider?.ai) return;

    setTestingProvider(provider);
    setTestResults({ ...testResults, [provider]: null });

    try {
      // Use the health check for Claude and Ollama
      if (provider === 'claude') {
        const result = await window.flowrider.ai.checkClaude();
        if (result.success && result.data) {
          setTestResults({
            ...testResults,
            [provider]: {
              success: result.data.available,
              message: result.data.available
                ? `Connected - ${result.data.version || 'CLI found'}`
                : result.data.error || 'Not available',
            },
          });
        }
      } else if (provider === 'ollama') {
        const result = await window.flowrider.ai.checkOllama();
        if (result.success && result.data) {
          setTestResults({
            ...testResults,
            [provider]: {
              success: result.data.available,
              message: result.data.available
                ? `Connected - ${result.data.models?.length || 0} models available`
                : result.data.error || 'Not available',
            },
          });
        }
      } else if (PROVIDER_CONFIGS[provider].requiresKey) {
        // For other providers, try a simple test call
        if (!keys[provider]) {
          setTestResults({
            ...testResults,
            [provider]: {
              success: false,
              message: 'API key is required',
            },
          });
        } else {
          // Make a minimal test call
          const result = await window.flowrider.ai.quickPrompt(
            provider,
            'Hello',
            undefined
          );
          setTestResults({
            ...testResults,
            [provider]: {
              success: result.success,
              message: result.success
                ? 'Connection successful'
                : result.error || 'Connection failed',
            },
          });
        }
      } else {
        setTestResults({
          ...testResults,
          [provider]: {
            success: true,
            message: 'No API key needed',
          },
        });
      }
    } catch (err) {
      setTestResults({
        ...testResults,
        [provider]: {
          success: false,
          message: err instanceof Error ? err.message : 'Test failed',
        },
      });
    }
    setTestingProvider(null);
  };

  // Toggle key visibility
  const toggleKeyVisibility = (provider: AIProviderType) => {
    setVisibleKeys({
      ...visibleKeys,
      [provider]: !visibleKeys[provider],
    });
  };

  // Update key value
  const handleKeyChange = (provider: AIProviderType, value: string) => {
    setKeys({
      ...keys,
      [provider]: value,
    });
  };

  if (loading) {
    return (
      <div className="api-keys-panel" style={styles.panel}>
        <div style={styles.loading}>Loading API keys...</div>
      </div>
    );
  }

  return (
    <div className="api-keys-panel" style={styles.panel}>
      <h2 style={styles.title}>AI Provider API Keys</h2>
      <p style={styles.subtitle}>
        Configure API keys for AI providers. Keys are stored securely using Electron's safeStorage.
      </p>

      {error && <div style={styles.error}>{error}</div>}
      {success && <div style={styles.success}>{success}</div>}

      <div style={styles.providersGrid}>
        {(Object.keys(PROVIDER_CONFIGS) as AIProviderType[]).map((provider) => {
          const config = PROVIDER_CONFIGS[provider];
          const testResult = testResults[provider];

          return (
            <div key={provider} style={styles.providerCard}>
              <div style={styles.providerHeader}>
                <h3 style={styles.providerName}>{config.label}</h3>
                {!config.requiresKey && (
                  <span style={styles.noKeyBadge}>No key needed</span>
                )}
              </div>

              <p style={styles.providerDescription}>{config.description}</p>

              {config.requiresKey && (
                <>
                  <div style={styles.inputGroup}>
                    <div style={styles.inputWrapper}>
                      <input
                        type={visibleKeys[provider] ? 'text' : 'password'}
                        value={keys[provider]}
                        onChange={(e) => handleKeyChange(provider, e.target.value)}
                        placeholder={config.placeholder}
                        style={styles.input}
                        disabled={saving}
                      />
                      <button
                        onClick={() => toggleKeyVisibility(provider)}
                        style={styles.toggleButton}
                        title={visibleKeys[provider] ? 'Hide' : 'Show'}
                      >
                        {visibleKeys[provider] ? '👁️' : '👁️‍🗨️'}
                      </button>
                    </div>
                  </div>

                  <div style={styles.buttonRow}>
                    <button
                      onClick={() => handleSaveKey(provider)}
                      disabled={saving || !keys[provider]}
                      style={{
                        ...styles.button,
                        ...styles.saveButton,
                        opacity: saving || !keys[provider] ? 0.5 : 1,
                      }}
                    >
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                    <button
                      onClick={() => handleTestConnection(provider)}
                      disabled={testingProvider === provider}
                      style={{
                        ...styles.button,
                        ...styles.testButton,
                        opacity: testingProvider === provider ? 0.5 : 1,
                      }}
                    >
                      {testingProvider === provider ? 'Testing...' : 'Test'}
                    </button>
                  </div>
                </>
              )}

              {!config.requiresKey && (
                <button
                  onClick={() => handleTestConnection(provider)}
                  disabled={testingProvider === provider}
                  style={{
                    ...styles.button,
                    ...styles.testButton,
                    width: '100%',
                    opacity: testingProvider === provider ? 0.5 : 1,
                  }}
                >
                  {testingProvider === provider ? 'Testing...' : 'Test Connection'}
                </button>
              )}

              {testResult && (
                <div
                  style={{
                    ...styles.testResult,
                    ...(testResult.success ? styles.testSuccess : styles.testError),
                  }}
                >
                  {testResult.message}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '24px',
    color: '#fff',
    fontFamily: 'monospace',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: '#00ffff',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    marginBottom: '24px',
  },
  loading: {
    textAlign: 'center',
    color: '#888',
    padding: '40px',
  },
  error: {
    background: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid #ff4444',
    borderRadius: '4px',
    padding: '12px',
    color: '#ff4444',
    marginBottom: '16px',
  },
  success: {
    background: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid #00ff88',
    borderRadius: '4px',
    padding: '12px',
    color: '#00ff88',
    marginBottom: '16px',
  },
  providersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
  },
  providerCard: {
    background: 'rgba(0, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '20px',
  },
  providerHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  providerName: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#fff',
    margin: 0,
  },
  noKeyBadge: {
    fontSize: '11px',
    color: '#888',
    background: 'rgba(255, 255, 255, 0.1)',
    padding: '4px 8px',
    borderRadius: '4px',
  },
  providerDescription: {
    fontSize: '12px',
    color: '#888',
    marginBottom: '16px',
  },
  inputGroup: {
    marginBottom: '12px',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    padding: '12px',
    paddingRight: '40px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '4px',
    color: '#fff',
    fontFamily: 'monospace',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  toggleButton: {
    position: 'absolute',
    right: '8px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px',
  },
  buttonRow: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    flex: 1,
    padding: '10px 16px',
    border: 'none',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '14px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  saveButton: {
    background: '#00ffff',
    color: '#000',
    fontWeight: 'bold',
  },
  testButton: {
    background: 'transparent',
    border: '1px solid #00ffff',
    color: '#00ffff',
  },
  testResult: {
    marginTop: '12px',
    padding: '10px',
    borderRadius: '4px',
    fontSize: '12px',
  },
  testSuccess: {
    background: 'rgba(0, 255, 136, 0.1)',
    border: '1px solid #00ff88',
    color: '#00ff88',
  },
  testError: {
    background: 'rgba(255, 68, 68, 0.1)',
    border: '1px solid #ff4444',
    color: '#ff4444',
  },
};

export default APIKeysPanel;
