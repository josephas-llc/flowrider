import React, { useState, useEffect } from 'react';
import { useStore, AIProvider } from '../store';

export interface SessionTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: 'development' | 'research' | 'writing' | 'custom';
  config: {
    aiProvider: AIProvider;
    aiModel?: string;
    workingDir?: string;
    notes?: string;
  };
  isBuiltIn: boolean;
  createdAt: number;
  updatedAt: number;
}

interface SessionTemplatesProps {
  faceIndex: number;
  onApply?: () => void;
}

export const SessionTemplates: React.FC<SessionTemplatesProps> = ({ faceIndex, onApply }) => {
  const { updateSession, sessions } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(false);
  const [templates, setTemplates] = useState<SessionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<SessionTemplate | null>(null);
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  const session = sessions[faceIndex];

  // Load templates from backend
  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    if (!window.flowrider) return;

    try {
      setLoading(true);
      const result = await window.flowrider.templates.list();
      if (result.success && result.data) {
        setTemplates(result.data);
      } else {
        setError(result.error || 'Failed to load templates');
      }
    } catch (err) {
      setError('Failed to load templates');
      console.error('[SessionTemplates] Error loading templates:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show templates when there's no active tmux session
  if (!session || session.tmuxSession) {
    return null;
  }

  const filteredTemplates = selectedCategory === 'all'
    ? templates
    : templates.filter(t => t.category === selectedCategory);

  const applyTemplate = (template: SessionTemplate) => {
    // Pre-fill session configuration from template
    // This doesn't create the session - user still needs to click Create Session
    updateSession(faceIndex, {
      name: template.name,
      aiProvider: template.config.aiProvider,
      aiModel: template.config.aiModel,
      notes: template.config.notes,
      workingDir: template.config.workingDir || session.workingDir,
      // Don't set status - session is still empty until tmux session is created
    });
    onApply?.();
  };

  const handleDeleteTemplate = async (templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!window.flowrider) return;

    if (!confirm('Delete this template?')) return;

    try {
      const result = await window.flowrider.templates.delete(templateId);
      if (result.success) {
        // Reload templates
        await loadTemplates();
      } else {
        alert(result.error || 'Failed to delete template');
      }
    } catch (err) {
      alert('Failed to delete template');
      console.error('[SessionTemplates] Error deleting template:', err);
    }
  };

  const handleSaveAsTemplate = () => {
    if (!session.name) {
      alert('Please name your session first');
      return;
    }
    setShowSaveDialog(true);
  };

  const handleSaveTemplate = async (templateData: Partial<SessionTemplate>) => {
    if (!window.flowrider) return;

    try {
      const result = await window.flowrider.templates.save(templateData);
      if (result.success) {
        setShowSaveDialog(false);
        setEditingTemplate(null);
        // Reload templates
        await loadTemplates();
      } else {
        alert(result.error || 'Failed to save template');
      }
    } catch (err) {
      alert('Failed to save template');
      console.error('[SessionTemplates] Error saving template:', err);
    }
  };

  const categories = [
    { id: 'all', label: 'All', icon: '📋' },
    { id: 'development', label: 'Dev', icon: '💻' },
    { id: 'research', label: 'Research', icon: '🔍' },
    { id: 'writing', label: 'Writing', icon: '✍️' },
  ];

  return (
    <div className="session-templates">
      <div
        className="templates-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="templates-title">Quick Start Templates</span>
        <span className="templates-toggle">{isExpanded ? '−' : '+'}</span>
      </div>

      {isExpanded && (
        <div className="templates-content">
          {error && (
            <div style={{
              padding: '8px',
              background: 'rgba(255, 68, 68, 0.1)',
              border: '1px solid #ff4444',
              borderRadius: 4,
              fontSize: 11,
              color: '#ff6666',
              marginBottom: 8,
            }}>
              {error}
            </div>
          )}

          <div className="templates-categories">
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat.id)}
              >
                <span className="category-icon">{cat.icon}</span>
                {cat.label}
              </button>
            ))}
          </div>

          <button
            className="save-as-template-btn"
            onClick={handleSaveAsTemplate}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: 8,
              background: 'rgba(0, 255, 255, 0.1)',
              border: '1px solid rgba(0, 255, 255, 0.3)',
              borderRadius: 4,
              color: '#00ffff',
              fontSize: 11,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            + Save Current as Template
          </button>

          {loading ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#888', fontSize: 11 }}>
              Loading templates...
            </div>
          ) : (
            <div className="templates-grid">
              {filteredTemplates.map(template => (
                <div
                  key={template.id}
                  className="template-card"
                  onClick={() => applyTemplate(template)}
                >
                  <span className="template-icon">{template.icon}</span>
                  <div className="template-info">
                    <div className="template-name">
                      {template.name}
                      {!template.isBuiltIn && (
                        <span style={{
                          marginLeft: 6,
                          fontSize: 9,
                          padding: '2px 4px',
                          background: 'rgba(0, 255, 255, 0.2)',
                          borderRadius: 2,
                          color: '#00ffff',
                        }}>
                          CUSTOM
                        </span>
                      )}
                    </div>
                    <div className="template-desc">{template.description}</div>
                  </div>
                  <div className="template-provider">
                    {template.config.aiProvider === 'claude-code' ? 'Claude' : 'Ollama'}
                  </div>
                  {!template.isBuiltIn && (
                    <button
                      className="template-delete-btn"
                      onClick={(e) => handleDeleteTemplate(template.id, e)}
                      style={{
                        marginLeft: 8,
                        padding: '2px 6px',
                        background: 'rgba(255, 68, 68, 0.1)',
                        border: '1px solid rgba(255, 68, 68, 0.3)',
                        borderRadius: 3,
                        color: '#ff4444',
                        fontSize: 10,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                      title="Delete template"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Save Template Dialog */}
          {showSaveDialog && (
            <SaveTemplateDialog
              session={session}
              onSave={handleSaveTemplate}
              onCancel={() => setShowSaveDialog(false)}
            />
          )}
        </div>
      )}

      <style>{`
        .session-templates {
          margin: 12px 0;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          overflow: hidden;
        }

        .templates-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .templates-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .templates-title {
          font-size: 12px;
          font-weight: 600;
          color: #00ffff;
        }

        .templates-toggle {
          color: #666;
          font-size: 14px;
        }

        .templates-content {
          padding: 12px;
          border-top: 1px solid rgba(255, 255, 255, 0.05);
        }

        .templates-categories {
          display: flex;
          gap: 6px;
          margin-bottom: 12px;
        }

        .category-btn {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          color: #888;
          font-size: 10px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.2s;
        }

        .category-btn:hover {
          background: rgba(255, 255, 255, 0.05);
          color: #ccc;
        }

        .category-btn.active {
          background: rgba(0, 255, 255, 0.15);
          border-color: rgba(0, 255, 255, 0.3);
          color: #00ffff;
        }

        .category-icon {
          font-size: 12px;
        }

        .templates-grid {
          display: flex;
          flex-direction: column;
          gap: 6px;
          max-height: 200px;
          overflow-y: auto;
        }

        .template-card {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .template-card:hover {
          background: rgba(0, 255, 255, 0.05);
          border-color: rgba(0, 255, 255, 0.3);
        }

        .template-icon {
          font-size: 20px;
          width: 32px;
          text-align: center;
        }

        .template-info {
          flex: 1;
          min-width: 0;
        }

        .template-name {
          font-size: 12px;
          font-weight: 600;
          color: #e0e0e0;
        }

        .template-desc {
          font-size: 10px;
          color: #888;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .template-provider {
          font-size: 9px;
          color: #666;
          padding: 2px 6px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 3px;
        }

        /* Scrollbar styling */
        .templates-grid::-webkit-scrollbar {
          width: 4px;
        }

        .templates-grid::-webkit-scrollbar-track {
          background: transparent;
        }

        .templates-grid::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 2px;
        }
      `}</style>
    </div>
  );
};

// Save Template Dialog Component
interface SaveTemplateDialogProps {
  session: any;
  onSave: (template: Partial<SessionTemplate>) => void;
  onCancel: () => void;
}

const SaveTemplateDialog: React.FC<SaveTemplateDialogProps> = ({ session, onSave, onCancel }) => {
  const [name, setName] = useState(session.name || '');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('⚡');
  const [category, setCategory] = useState<TemplateCategory>('custom');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a template name');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim() || `Custom template for ${name}`,
      icon,
      category,
      config: {
        aiProvider: session.aiProvider || 'claude-code',
        aiModel: session.aiModel,
        workingDir: session.workingDir,
        notes: session.notes,
      },
    });
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        background: '#1a1a1f',
        border: '1px solid rgba(0, 255, 255, 0.3)',
        borderRadius: 8,
        padding: 24,
        width: 400,
        maxWidth: '90%',
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#00ffff', fontSize: 16 }}>
          Save as Template
        </h3>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>
              Template Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Custom Template"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                color: '#e0e0e0',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>
              Description
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this template for?"
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                color: '#e0e0e0',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>
              Icon (emoji)
            </label>
            <input
              type="text"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="⚡"
              maxLength={2}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                color: '#e0e0e0',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', marginBottom: 4, fontSize: 12, color: '#888' }}>
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as TemplateCategory)}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                color: '#e0e0e0',
                fontSize: 13,
                fontFamily: 'inherit',
              }}
            >
              <option value="development">Development</option>
              <option value="research">Research</option>
              <option value="writing">Writing</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: '8px 16px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 4,
                color: '#888',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              style={{
                padding: '8px 16px',
                background: 'rgba(0, 255, 255, 0.2)',
                border: '1px solid rgba(0, 255, 255, 0.4)',
                borderRadius: 4,
                color: '#00ffff',
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Save Template
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
