import React, { useState, useRef, useEffect } from 'react';
import { useStore, AI_PROVIDERS, AIProvider, AIProviderConfig } from '../store';

interface AIModelSelectorProps {
  faceIndex: number;
  compact?: boolean;
  onModelChange?: (provider: AIProvider, model: string) => void;
}

// Provider icons - using simple text/emoji for now
const PROVIDER_ICONS: Record<AIProvider, string> = {
  claude: '🟣',      // Purple for Anthropic
  gemini: '🔵',      // Blue for Google
  grok: '⚫',        // Black for xAI
  ollama: '🟢',      // Green for local/free
  local: '🟤',       // Brown for custom local
  openai: '⚪',      // White/gray for OpenAI
};

// Provider colors for styling
const PROVIDER_COLORS: Record<AIProvider, string> = {
  claude: '#9b59b6',
  gemini: '#4285f4',
  grok: '#1da1f2',
  ollama: '#4caf50',
  local: '#8b7355',
  openai: '#74aa9c',
};

// Recommended providers (user preference: highlight these, minimize OpenAI)
const RECOMMENDED_PROVIDERS: AIProvider[] = ['claude', 'gemini', 'grok', 'ollama', 'local'];

export const AIModelSelector: React.FC<AIModelSelectorProps> = ({
  faceIndex,
  compact = false,
  onModelChange,
}) => {
  const { sessions, updateSession } = useStore();
  const session = sessions[faceIndex];

  const [isOpen, setIsOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<AIProviderConfig | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get current provider config
  const currentProvider = AI_PROVIDERS.find(p => p.id === session?.aiProvider) || AI_PROVIDERS[0];
  const currentModel = session?.aiModel || currentProvider.models[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSelectedProvider(null);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Handle provider selection
  const handleProviderSelect = (provider: AIProviderConfig) => {
    if (selectedProvider?.id === provider.id) {
      setSelectedProvider(null);
    } else {
      setSelectedProvider(provider);
    }
  };

  // Handle model selection
  const handleModelSelect = (provider: AIProviderConfig, model: string) => {
    updateSession(faceIndex, {
      aiProvider: provider.id,
      aiModel: model,
    });
    onModelChange?.(provider.id, model);
    setIsOpen(false);
    setSelectedProvider(null);
  };

  // Sort providers - recommended first, then OpenAI last
  const sortedProviders = [...AI_PROVIDERS].sort((a, b) => {
    const aRecommended = RECOMMENDED_PROVIDERS.includes(a.id);
    const bRecommended = RECOMMENDED_PROVIDERS.includes(b.id);
    if (aRecommended && !bRecommended) return -1;
    if (!aRecommended && bRecommended) return 1;
    return 0;
  });

  if (compact) {
    return (
      <div style={{ position: 'relative' }} ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 8px',
            background: 'var(--bg-tertiary)',
            border: `1px solid ${PROVIDER_COLORS[session?.aiProvider || 'claude']}40`,
            borderRadius: 4,
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: 11,
            transition: 'all 0.2s ease',
          }}
          title="Change AI Model"
        >
          <span>{PROVIDER_ICONS[session?.aiProvider || 'claude']}</span>
          <span style={{ color: PROVIDER_COLORS[session?.aiProvider || 'claude'] }}>
            {currentModel}
          </span>
          <span style={{ color: '#666', fontSize: 10 }}>▼</span>
        </button>

        {isOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: 4,
            minWidth: 280,
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: 6,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            maxHeight: 400,
            overflowY: 'auto',
          }}>
            {sortedProviders.map(provider => (
              <div key={provider.id}>
                <div
                  onClick={() => handleProviderSelect(provider)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border-color)',
                    background: selectedProvider?.id === provider.id
                      ? 'rgba(0, 255, 255, 0.05)'
                      : 'transparent',
                    opacity: provider.id === 'openai' ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 16 }}>{PROVIDER_ICONS[provider.id]}</span>
                    <div>
                      <div style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: PROVIDER_COLORS[provider.id],
                      }}>
                        {provider.name}
                      </div>
                      <div style={{ fontSize: 10, color: '#666' }}>
                        {provider.isLocal ? 'FREE' : `$${provider.costPerMToken}/M tokens`}
                      </div>
                    </div>
                  </div>
                  <span style={{
                    color: '#666',
                    fontSize: 10,
                    transform: selectedProvider?.id === provider.id ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}>
                    ▼
                  </span>
                </div>

                {/* Model submenu */}
                {selectedProvider?.id === provider.id && (
                  <div style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderBottom: '1px solid var(--border-color)',
                  }}>
                    {provider.models.map(model => (
                      <div
                        key={model}
                        onClick={() => handleModelSelect(provider, model)}
                        style={{
                          padding: '8px 12px 8px 36px',
                          cursor: 'pointer',
                          fontSize: 11,
                          color: currentProvider.id === provider.id && currentModel === model
                            ? '#00ffff'
                            : 'var(--text-secondary)',
                          background: currentProvider.id === provider.id && currentModel === model
                            ? 'rgba(0, 255, 255, 0.1)'
                            : 'transparent',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={e => {
                          if (!(currentProvider.id === provider.id && currentModel === model)) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                          }
                        }}
                        onMouseLeave={e => {
                          if (!(currentProvider.id === provider.id && currentModel === model)) {
                            e.currentTarget.style.background = 'transparent';
                          }
                        }}
                      >
                        {currentProvider.id === provider.id && currentModel === model && (
                          <span style={{ marginRight: 6, color: '#00ffff' }}>✓</span>
                        )}
                        {model}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Full-size selector (for settings or expanded view)
  return (
    <div ref={dropdownRef} style={{ marginTop: 12 }}>
      <label className="info-label" style={{ marginBottom: 8, display: 'block' }}>
        AI Model
      </label>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        background: 'var(--bg-tertiary)',
        border: `1px solid ${PROVIDER_COLORS[session?.aiProvider || 'claude']}40`,
        borderRadius: 6,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span style={{ fontSize: 20 }}>{PROVIDER_ICONS[session?.aiProvider || 'claude']}</span>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 500,
            color: PROVIDER_COLORS[session?.aiProvider || 'claude'],
          }}>
            {currentProvider.name}
          </div>
          <div style={{ fontSize: 11, color: '#888' }}>
            {currentModel} • {currentProvider.isLocal ? 'FREE' : `$${currentProvider.costPerMToken}/M tokens`}
          </div>
        </div>
        <span style={{
          color: '#666',
          fontSize: 12,
          transform: isOpen ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s ease',
        }}>
          ▼
        </span>
      </div>

      {isOpen && (
        <div style={{
          marginTop: 8,
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 6,
          overflow: 'hidden',
          maxHeight: 350,
          overflowY: 'auto',
        }}>
          {sortedProviders.map(provider => (
            <div key={provider.id}>
              <div
                onClick={() => handleProviderSelect(provider)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--border-color)',
                  background: selectedProvider?.id === provider.id
                    ? 'rgba(0, 255, 255, 0.05)'
                    : 'transparent',
                  opacity: provider.id === 'openai' ? 0.6 : 1,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={e => {
                  if (selectedProvider?.id !== provider.id) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }
                }}
                onMouseLeave={e => {
                  if (selectedProvider?.id !== provider.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18 }}>{PROVIDER_ICONS[provider.id]}</span>
                  <div>
                    <div style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: PROVIDER_COLORS[provider.id],
                    }}>
                      {provider.name}
                    </div>
                    <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
                      {provider.description}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {provider.isLocal && (
                    <span style={{
                      fontSize: 9,
                      padding: '2px 6px',
                      background: 'rgba(76, 175, 80, 0.2)',
                      color: '#4caf50',
                      borderRadius: 3,
                      fontWeight: 600,
                    }}>
                      FREE
                    </span>
                  )}
                  <span style={{
                    color: '#666',
                    fontSize: 10,
                    transform: selectedProvider?.id === provider.id ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s ease',
                  }}>
                    ▼
                  </span>
                </div>
              </div>

              {/* Model submenu */}
              {selectedProvider?.id === provider.id && (
                <div style={{
                  background: 'rgba(0, 0, 0, 0.15)',
                  borderBottom: '1px solid var(--border-color)',
                }}>
                  {provider.models.map(model => (
                    <div
                      key={model}
                      onClick={() => handleModelSelect(provider, model)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px 10px 44px',
                        cursor: 'pointer',
                        fontSize: 12,
                        color: currentProvider.id === provider.id && currentModel === model
                          ? '#00ffff'
                          : 'var(--text-secondary)',
                        background: currentProvider.id === provider.id && currentModel === model
                          ? 'rgba(0, 255, 255, 0.1)'
                          : 'transparent',
                        transition: 'background 0.15s ease',
                      }}
                      onMouseEnter={e => {
                        if (!(currentProvider.id === provider.id && currentModel === model)) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
                        }
                      }}
                      onMouseLeave={e => {
                        if (!(currentProvider.id === provider.id && currentModel === model)) {
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {currentProvider.id === provider.id && currentModel === model && (
                          <span style={{ color: '#00ffff' }}>✓</span>
                        )}
                        <span>{model}</span>
                      </div>
                      {!provider.isLocal && (
                        <span style={{ fontSize: 10, color: '#555' }}>
                          ${provider.costPerMToken}/M
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Cost comparison hint */}
          <div style={{
            padding: '10px 14px',
            fontSize: 10,
            color: '#666',
            borderTop: '1px solid var(--border-color)',
            background: 'rgba(0, 255, 255, 0.02)',
          }}>
            💡 <strong>Pro tip:</strong> Use free local models (Ollama) for 80% of tasks.
            Reserve cloud APIs for complex reasoning.
          </div>
        </div>
      )}
    </div>
  );
};

export default AIModelSelector;
