import React, { useState } from 'react';
import { useStore } from '../store';

export interface CustomProvider {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
  defaultModel: string;
  description: string;
}

interface AddCustomProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (provider: CustomProvider) => void;
  editProvider?: CustomProvider | null;
}

export const AddCustomProviderModal: React.FC<AddCustomProviderModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editProvider,
}) => {
  const [name, setName] = useState(editProvider?.name || '');
  const [baseUrl, setBaseUrl] = useState(editProvider?.baseUrl || '');
  const [apiKey, setApiKey] = useState(editProvider?.apiKey || '');
  const [defaultModel, setDefaultModel] = useState(editProvider?.defaultModel || '');
  const [description, setDescription] = useState(editProvider?.description || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  // Reset form when modal opens with edit provider
  React.useEffect(() => {
    if (isOpen) {
      setName(editProvider?.name || '');
      setBaseUrl(editProvider?.baseUrl || '');
      setApiKey(editProvider?.apiKey || '');
      setDefaultModel(editProvider?.defaultModel || '');
      setDescription(editProvider?.description || '');
      setTestResult(null);
    }
  }, [isOpen, editProvider]);

  const handleSave = () => {
    if (!name.trim() || !baseUrl.trim()) {
      setTestResult({ success: false, message: 'Name and Base URL are required' });
      return;
    }

    const provider: CustomProvider = {
      id: editProvider?.id || `custom-${Date.now()}`,
      name: name.trim(),
      baseUrl: baseUrl.trim(),
      apiKey: apiKey.trim(),
      defaultModel: defaultModel.trim() || 'default',
      description: description.trim() || `Custom provider: ${name.trim()}`,
    };

    onSave(provider);
    onClose();
  };

  const handleTestConnection = async () => {
    if (!baseUrl.trim()) {
      setTestResult({ success: false, message: 'Base URL is required for testing' });
      return;
    }

    setTesting(true);
    setTestResult(null);

    try {
      // Try to make a simple request to the OpenAI-compatible endpoint
      const testUrl = baseUrl.trim().replace(/\/$/, '');
      const modelsUrl = `${testUrl}/v1/models`;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (apiKey.trim()) {
        headers['Authorization'] = `Bearer ${apiKey.trim()}`;
      }

      const response = await fetch(modelsUrl, {
        method: 'GET',
        headers,
      });

      if (response.ok) {
        const data = await response.json();
        const modelCount = data?.data?.length || 0;
        setTestResult({
          success: true,
          message: `Connected! ${modelCount} model(s) available`,
        });
      } else if (response.status === 401 || response.status === 403) {
        setTestResult({
          success: false,
          message: 'Authentication failed - check your API key',
        });
      } else {
        setTestResult({
          success: false,
          message: `Server returned ${response.status}: ${response.statusText}`,
        });
      }
    } catch (err) {
      // Network error or CORS - try alternate test
      setTestResult({
        success: false,
        message: err instanceof Error ? err.message : 'Connection failed',
      });
    }

    setTesting(false);
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>
            {editProvider ? 'Edit Provider' : '+ Add Custom Provider'}
          </h2>
          <button style={styles.closeButton} onClick={onClose}>
            ×
          </button>
        </div>

        <div style={styles.content}>
          <p style={styles.subtitle}>
            Connect any OpenAI-compatible API endpoint (LM Studio, Text Gen WebUI, vLLM, etc.)
          </p>

          {/* Provider Name */}
          <div style={styles.field}>
            <label style={styles.label}>Provider Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., My Local LLM"
              style={styles.input}
            />
          </div>

          {/* Base URL */}
          <div style={styles.field}>
            <label style={styles.label}>Base URL *</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="e.g., http://localhost:1234"
              style={styles.input}
            />
            <span style={styles.hint}>
              The base URL of the OpenAI-compatible API (without /v1/chat/completions)
            </span>
          </div>

          {/* API Key */}
          <div style={styles.field}>
            <label style={styles.label}>API Key</label>
            <div style={styles.inputWrapper}>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Optional - leave blank if not required"
                style={styles.input}
              />
              <button
                style={styles.toggleButton}
                onClick={() => setShowApiKey(!showApiKey)}
                title={showApiKey ? 'Hide' : 'Show'}
              >
                {showApiKey ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
          </div>

          {/* Default Model */}
          <div style={styles.field}>
            <label style={styles.label}>Default Model</label>
            <input
              type="text"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
              placeholder="e.g., llama-3.1-8b or leave blank for auto"
              style={styles.input}
            />
          </div>

          {/* Description */}
          <div style={styles.field}>
            <label style={styles.label}>Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              style={styles.input}
            />
          </div>

          {/* Test Result */}
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

        <div style={styles.footer}>
          <button
            style={styles.testButton}
            onClick={handleTestConnection}
            disabled={testing}
          >
            {testing ? 'Testing...' : 'Test Connection'}
          </button>
          <div style={styles.footerRight}>
            <button style={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button
              style={styles.saveButton}
              onClick={handleSave}
              disabled={!name.trim() || !baseUrl.trim()}
            >
              {editProvider ? 'Save Changes' : 'Add Provider'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    backdropFilter: 'blur(4px)',
  },
  modal: {
    width: '100%',
    maxWidth: '520px',
    background: '#0a0a0f',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 0 40px rgba(0, 255, 255, 0.15)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid rgba(0, 255, 255, 0.2)',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: 600,
    color: '#00ffff',
    fontFamily: 'monospace',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    color: '#888',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '4px 8px',
    lineHeight: 1,
  },
  content: {
    padding: '20px',
  },
  subtitle: {
    color: '#888',
    fontSize: '13px',
    marginBottom: '20px',
  },
  field: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#00ffff',
    marginBottom: '6px',
    fontFamily: 'monospace',
  },
  input: {
    width: '100%',
    padding: '12px',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '14px',
    fontFamily: 'monospace',
    boxSizing: 'border-box',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
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
  hint: {
    display: 'block',
    fontSize: '11px',
    color: '#666',
    marginTop: '4px',
  },
  testResult: {
    padding: '12px',
    borderRadius: '6px',
    fontSize: '13px',
    fontFamily: 'monospace',
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
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderTop: '1px solid rgba(0, 255, 255, 0.2)',
  },
  footerRight: {
    display: 'flex',
    gap: '12px',
  },
  testButton: {
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid #00ffff',
    borderRadius: '6px',
    color: '#00ffff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
  cancelButton: {
    padding: '10px 16px',
    background: 'transparent',
    border: '1px solid #444',
    borderRadius: '6px',
    color: '#888',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
  saveButton: {
    padding: '10px 20px',
    background: '#00ffff',
    border: 'none',
    borderRadius: '6px',
    color: '#000',
    fontSize: '13px',
    fontWeight: 700,
    cursor: 'pointer',
    fontFamily: 'monospace',
  },
};

export default AddCustomProviderModal;
