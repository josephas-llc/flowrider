import React, { useState } from 'react';

interface MCPServer {
  id: string;
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  tools: string[];
  lastPing: number;
}

// Simulated MCP servers for demo
const DEMO_MCP_SERVERS: MCPServer[] = [
  {
    id: 'mcp-filesystem',
    name: 'Filesystem',
    status: 'connected',
    tools: ['read_file', 'write_file', 'list_directory', 'search_files'],
    lastPing: Date.now(),
  },
  {
    id: 'mcp-git',
    name: 'Git',
    status: 'connected',
    tools: ['git_status', 'git_diff', 'git_commit', 'git_log'],
    lastPing: Date.now(),
  },
  {
    id: 'mcp-browser',
    name: 'Browser',
    status: 'connected',
    tools: ['fetch_url', 'search_web', 'screenshot'],
    lastPing: Date.now(),
  },
  {
    id: 'mcp-database',
    name: 'Database',
    status: 'disconnected',
    tools: ['query', 'schema', 'migrate'],
    lastPing: Date.now() - 60000,
  },
];

export const MCPStatus: React.FC = () => {
  const [servers, setServers] = useState<MCPServer[]>(DEMO_MCP_SERVERS);
  const [showAddModal, setShowAddModal] = useState(false);

  const connectedCount = servers.filter(s => s.status === 'connected').length;
  const totalTools = servers
    .filter(s => s.status === 'connected')
    .reduce((sum, s) => sum + s.tools.length, 0);

  const toggleServer = (id: string) => {
    setServers(servers.map(s =>
      s.id === id
        ? { ...s, status: s.status === 'connected' ? 'disconnected' : 'connected', lastPing: Date.now() }
        : s
    ));
  };

  return (
    <div className="mcp-status">
      <div className="mcp-header">
        <div className="mcp-title">
          <h3>MCP Servers</h3>
          <span className="mcp-protocol-badge">Model Context Protocol</span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={() => setShowAddModal(true)}>
          + Add Server
        </button>
      </div>

      <div className="mcp-stats">
        <div className="mcp-stat">
          <span className="value">{connectedCount}/{servers.length}</span>
          <span className="label">Connected</span>
        </div>
        <div className="mcp-stat">
          <span className="value">{totalTools}</span>
          <span className="label">Tools Available</span>
        </div>
      </div>

      <div className="mcp-server-list">
        {servers.map(server => (
          <div key={server.id} className={`mcp-server ${server.status}`}>
            <div className="server-header">
              <span className={`status-dot ${server.status}`} />
              <span className="server-name">{server.name}</span>
              <button
                className="toggle-btn"
                onClick={() => toggleServer(server.id)}
              >
                {server.status === 'connected' ? 'Disconnect' : 'Connect'}
              </button>
            </div>
            <div className="server-tools">
              {server.tools.map(tool => (
                <span key={tool} className="tool-badge">{tool}</span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mcp-info">
        <p>MCP enables AI agents to securely access tools, data sources, and external services.</p>
        <a href="https://modelcontextprotocol.io" target="_blank" rel="noopener noreferrer">
          Learn more about MCP →
        </a>
      </div>
    </div>
  );
};
