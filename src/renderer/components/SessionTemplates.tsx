import React, { useState } from 'react';
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
}

// Built-in templates
const BUILTIN_TEMPLATES: SessionTemplate[] = [
  {
    id: 'fullstack',
    name: 'Full-Stack Dev',
    description: 'Claude Code session for full-stack development',
    icon: '🏗️',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'Full-stack development session',
    },
  },
  {
    id: 'api-backend',
    name: 'API Backend',
    description: 'Backend API development with Claude',
    icon: '🔌',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'Backend API development',
    },
  },
  {
    id: 'react-frontend',
    name: 'React Frontend',
    description: 'React/TypeScript frontend development',
    icon: '⚛️',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'React frontend development',
    },
  },
  {
    id: 'testing',
    name: 'Test Suite',
    description: 'Writing and running tests',
    icon: '🧪',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'Testing and QA',
    },
  },
  {
    id: 'devops',
    name: 'DevOps/CI',
    description: 'CI/CD and infrastructure tasks',
    icon: '🚀',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'DevOps and CI/CD',
    },
  },
  {
    id: 'research-ollama',
    name: 'Local Research',
    description: 'Research using local Ollama models',
    icon: '🔬',
    category: 'research',
    config: {
      aiProvider: 'ollama',
      aiModel: 'llama3:latest',
      notes: 'Local AI research session',
    },
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Review and refactor existing code',
    icon: '👀',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'Code review and refactoring',
    },
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Write and update documentation',
    icon: '📚',
    category: 'writing',
    config: {
      aiProvider: 'claude-code',
      notes: 'Documentation session',
    },
  },
  {
    id: 'bugfix',
    name: 'Bug Hunting',
    description: 'Debug and fix issues',
    icon: '🐛',
    category: 'development',
    config: {
      aiProvider: 'claude-code',
      notes: 'Bug fixing session',
    },
  },
  {
    id: 'exploration',
    name: 'Codebase Explore',
    description: 'Explore and understand a codebase',
    icon: '🗺️',
    category: 'research',
    config: {
      aiProvider: 'claude-code',
      notes: 'Codebase exploration',
    },
  },
];

interface SessionTemplatesProps {
  faceIndex: number;
  onApply?: () => void;
}

export const SessionTemplates: React.FC<SessionTemplatesProps> = ({ faceIndex, onApply }) => {
  const { updateSession, sessions } = useStore();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isExpanded, setIsExpanded] = useState(false);

  const session = sessions[faceIndex];
  // Show templates when there's no active tmux session
  if (!session || session.tmuxSession) {
    return null;
  }

  const filteredTemplates = selectedCategory === 'all'
    ? BUILTIN_TEMPLATES
    : BUILTIN_TEMPLATES.filter(t => t.category === selectedCategory);

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

          <div className="templates-grid">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className="template-card"
                onClick={() => applyTemplate(template)}
              >
                <span className="template-icon">{template.icon}</span>
                <div className="template-info">
                  <div className="template-name">{template.name}</div>
                  <div className="template-desc">{template.description}</div>
                </div>
                <div className="template-provider">
                  {template.config.aiProvider === 'claude-code' ? 'Claude' : 'Ollama'}
                </div>
              </div>
            ))}
          </div>
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
