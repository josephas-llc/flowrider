import React, { useState } from 'react';
import { useStore, AI_PROVIDERS, AIProvider } from '../store';

export const AIProviders: React.FC = () => {
  const { sessions, selectedFace, updateSession } = useStore();
  const [expandedProvider, setExpandedProvider] = useState<string | null>(null);

  const selectedSession = selectedFace !== null ? sessions[selectedFace] : null;

  const getProviderUsage = (providerId: AIProvider) => {
    return sessions.filter(s => s.status !== 'empty' && s.aiProvider === providerId).length;
  };

  const handleProviderSelect = (providerId: AIProvider) => {
    if (selectedFace !== null) {
      updateSession(selectedFace, { aiProvider: providerId });
    }
  };

  const getProviderIcon = (providerId: AIProvider) => {
    switch (providerId) {
      case 'claude': return '🟣';
      case 'openai': return '🟢';
      case 'gemini': return '🔵';
      case 'grok': return '⚫';
      case 'mistral': return '🟠'; // Orange for Mistral (France)
      case 'deepseek': return '🔷'; // Deep blue for DeepSeek
      case 'kimi': return '🌙'; // Moon for Moonshot AI
      case 'cohere': return '🍁'; // Maple leaf for Canada
      // FREE Open-Source International Models
      case 'qwen': return '🐼'; // Panda for Alibaba (China)
      case 'yi': return '🀄'; // Mahjong for 01.AI (China)
      case 'falcon': return '🦅'; // Falcon for TII (UAE)
      case 'hunyuan': return '🐉'; // Dragon for Tencent (China)
      case 'ollama': return '🦙';
      case 'local': return '💻';
      default: return '🤖';
    }
  };

  const totalLocalSessions = sessions.filter(
    s => s.status !== 'empty' && ['ollama', 'local', 'qwen', 'yi', 'falcon', 'hunyuan'].includes(s.aiProvider)
  ).length;

  const totalCloudSessions = sessions.filter(
    s => s.status !== 'empty' && !['ollama', 'local', 'qwen', 'yi', 'falcon', 'hunyuan'].includes(s.aiProvider)
  ).length;

  return (
    <div className="ai-providers">
      <div className="providers-header">
        <h3>AI Providers</h3>
        <span className="providers-badge">Model Agnostic</span>
      </div>

      <div className="providers-summary">
        <div className="summary-stat">
          <span className="stat-value">{totalLocalSessions}</span>
          <span className="stat-label">Local (Free)</span>
        </div>
        <div className="summary-stat">
          <span className="stat-value">{totalCloudSessions}</span>
          <span className="stat-label">Cloud (Paid)</span>
        </div>
        <div className="summary-stat highlight">
          <span className="stat-value">{AI_PROVIDERS.length}</span>
          <span className="stat-label">Providers</span>
        </div>
      </div>

      <div className="providers-list">
        {AI_PROVIDERS.map(provider => {
          const isExpanded = expandedProvider === provider.id;
          const usage = getProviderUsage(provider.id);
          const isSelected = selectedSession?.aiProvider === provider.id;

          return (
            <div
              key={provider.id}
              className={`provider-card ${isSelected ? 'selected' : ''} ${provider.isLocal ? 'local' : 'cloud'}`}
            >
              <div
                className="provider-header"
                onClick={() => setExpandedProvider(isExpanded ? null : provider.id)}
              >
                <span className="provider-icon">{getProviderIcon(provider.id)}</span>
                <div className="provider-info">
                  <span className="provider-name">{provider.name}</span>
                  <span className="provider-desc">{provider.description}</span>
                </div>
                <div className="provider-meta">
                  {provider.isLocal ? (
                    <span className="cost-badge free">FREE</span>
                  ) : (
                    <span className="cost-badge paid">${provider.costPerMToken}/M</span>
                  )}
                  {usage > 0 && (
                    <span className="usage-badge">{usage} active</span>
                  )}
                </div>
                <button
                  className={`select-btn ${isSelected ? 'active' : ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleProviderSelect(provider.id);
                  }}
                  disabled={selectedFace === null}
                >
                  {isSelected ? '✓ Active' : 'Select'}
                </button>
              </div>

              {isExpanded && (
                <div className="provider-details">
                  <div className="models-section">
                    <span className="section-label">Available Models:</span>
                    <div className="models-list">
                      {provider.models.map(model => (
                        <span key={model} className="model-tag">{model}</span>
                      ))}
                    </div>
                  </div>
                  {provider.apiUrl && (
                    <div className="api-section">
                      <span className="section-label">API Endpoint:</span>
                      <code className="api-url">{provider.apiUrl}</code>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="providers-info">
        <div className="info-card">
          <h4>💡 Cost Optimization Tip</h4>
          <p>
            Use <strong>Ollama</strong> or <strong>Local LLMs</strong> for routine tasks
            (formatting, simple queries) and reserve cloud APIs for complex reasoning.
            Mix providers across sessions to optimize cost vs capability.
          </p>
        </div>
      </div>

      {selectedFace === null && (
        <div className="providers-hint">
          <p>Select a session on the icosahedron to assign an AI provider</p>
        </div>
      )}
    </div>
  );
};
