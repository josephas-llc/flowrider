import React, { useState } from 'react';

interface EndpointExample {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  headers?: Record<string, string>;
  body?: string;
  response?: string;
}

const API_ENDPOINTS: EndpointExample[] = [
  {
    method: 'GET',
    path: '/api/health',
    description: 'Check API health status',
    response: JSON.stringify({ status: 'ok', version: '1.0.0' }, null, 2),
  },
  {
    method: 'GET',
    path: '/api/sessions',
    description: 'List all sessions',
    headers: { 'X-API-Key': 'your_api_key_here' },
    response: JSON.stringify(
      {
        sessions: [
          {
            id: 'session-1',
            name: 'Development',
            faceIndex: 0,
            status: 'active',
            workingDir: '/projects/myapp',
          },
        ],
      },
      null,
      2
    ),
  },
  {
    method: 'GET',
    path: '/api/sessions/:id',
    description: 'Get details of a specific session',
    headers: { 'X-API-Key': 'your_api_key_here' },
    response: JSON.stringify(
      {
        id: 'session-1',
        name: 'Development',
        faceIndex: 0,
        status: 'active',
        workingDir: '/projects/myapp',
        aiProvider: 'claude',
        totalTokens: 15000,
        estimatedCost: 0.45,
      },
      null,
      2
    ),
  },
  {
    method: 'POST',
    path: '/api/sessions',
    description: 'Create a new session',
    headers: {
      'X-API-Key': 'your_api_key_here',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      {
        name: 'New Session',
        workingDir: '/projects/newproject',
        aiProvider: 'claude',
      },
      null,
      2
    ),
    response: JSON.stringify(
      {
        id: 'session-2',
        name: 'New Session',
        faceIndex: 5,
        status: 'active',
      },
      null,
      2
    ),
  },
  {
    method: 'POST',
    path: '/api/sessions/:id/command',
    description: 'Execute a command in a session',
    headers: {
      'X-API-Key': 'your_api_key_here',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(
      {
        command: 'npm install',
      },
      null,
      2
    ),
    response: JSON.stringify(
      {
        success: true,
        output: 'Installing dependencies...',
      },
      null,
      2
    ),
  },
  {
    method: 'GET',
    path: '/api/projects',
    description: 'List all projects',
    headers: { 'X-API-Key': 'your_api_key_here' },
    response: JSON.stringify(
      {
        projects: [
          {
            id: 'proj-1',
            name: 'E-commerce Platform',
            sessionCount: 5,
            totalCost: 12.45,
          },
        ],
      },
      null,
      2
    ),
  },
  {
    method: 'GET',
    path: '/api/metrics',
    description: 'Get usage metrics',
    headers: { 'X-API-Key': 'your_api_key_here' },
    response: JSON.stringify(
      {
        totalSessions: 12,
        activeSessions: 8,
        totalCost: 45.67,
        totalTokens: 1500000,
      },
      null,
      2
    ),
  },
  {
    method: 'DELETE',
    path: '/api/sessions/:id',
    description: 'Delete a session',
    headers: { 'X-API-Key': 'your_api_key_here' },
    response: JSON.stringify(
      {
        success: true,
        message: 'Session deleted',
      },
      null,
      2
    ),
  },
];

export const ApiDocs: React.FC = () => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<EndpointExample | null>(
    API_ENDPOINTS[0]
  );
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [apiUrl, setApiUrl] = useState('http://localhost:3847');

  const handleCopyExample = (index: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getMethodColor = (method: string): string => {
    switch (method) {
      case 'GET':
        return '#00aaff';
      case 'POST':
        return '#00ff88';
      case 'PUT':
        return '#ff8800';
      case 'DELETE':
        return '#ff4444';
      default:
        return '#888';
    }
  };

  const generateCurlExample = (endpoint: EndpointExample): string => {
    const lines = [`curl -X ${endpoint.method} "${apiUrl}${endpoint.path}"`];

    if (endpoint.headers) {
      Object.entries(endpoint.headers).forEach(([key, value]) => {
        lines.push(`  -H "${key}: ${value}"`);
      });
    }

    if (endpoint.body) {
      lines.push(`  -d '${endpoint.body}'`);
    }

    return lines.join(' \\\n');
  };

  const handleOpenSwagger = () => {
    window.open(`${apiUrl}/api/docs`, '_blank');
  };

  return (
    <div className="api-docs" style={styles.panel}>
      <div style={styles.header}>
        <div>
          <h3 style={styles.title}>API Documentation</h3>
          <p style={styles.subtitle}>
            REST API reference for Flowrider integration
          </p>
        </div>
        <button onClick={handleOpenSwagger} style={styles.swaggerButton}>
          📘 Open Swagger UI
        </button>
      </div>

      {/* Base URL Setting */}
      <div style={styles.baseUrlSection}>
        <label style={styles.label}>Base URL:</label>
        <input
          type="text"
          value={apiUrl}
          onChange={(e) => setApiUrl(e.target.value)}
          style={styles.urlInput}
          placeholder="http://localhost:3847"
        />
      </div>

      {/* Main Content */}
      <div style={styles.content}>
        {/* Endpoints List */}
        <div style={styles.sidebar}>
          <h4 style={styles.sidebarTitle}>Endpoints</h4>
          {API_ENDPOINTS.map((endpoint, index) => (
            <button
              key={index}
              onClick={() => setSelectedEndpoint(endpoint)}
              style={{
                ...styles.endpointButton,
                backgroundColor:
                  selectedEndpoint === endpoint
                    ? 'rgba(0, 255, 255, 0.1)'
                    : 'transparent',
                borderLeft:
                  selectedEndpoint === endpoint
                    ? `3px solid ${getMethodColor(endpoint.method)}`
                    : '3px solid transparent',
              }}
            >
              <span
                style={{
                  ...styles.methodBadge,
                  backgroundColor: getMethodColor(endpoint.method),
                }}
              >
                {endpoint.method}
              </span>
              <span style={styles.endpointPath}>{endpoint.path}</span>
            </button>
          ))}
        </div>

        {/* Endpoint Details */}
        {selectedEndpoint && (
          <div style={styles.details}>
            <div style={styles.detailsHeader}>
              <span
                style={{
                  ...styles.methodBadgeLarge,
                  backgroundColor: getMethodColor(selectedEndpoint.method),
                }}
              >
                {selectedEndpoint.method}
              </span>
              <code style={styles.pathCode}>{selectedEndpoint.path}</code>
            </div>

            <p style={styles.description}>{selectedEndpoint.description}</p>

            {/* cURL Example */}
            <div style={styles.section}>
              <div style={styles.sectionHeader}>
                <h4 style={styles.sectionTitle}>cURL Example</h4>
                <button
                  onClick={() =>
                    handleCopyExample(0, generateCurlExample(selectedEndpoint))
                  }
                  style={styles.copyButton}
                >
                  {copiedIndex === 0 ? '✓ Copied' : '📋 Copy'}
                </button>
              </div>
              <pre style={styles.codeBlock}>
                <code>{generateCurlExample(selectedEndpoint)}</code>
              </pre>
            </div>

            {/* Request Headers */}
            {selectedEndpoint.headers && (
              <div style={styles.section}>
                <h4 style={styles.sectionTitle}>Request Headers</h4>
                <pre style={styles.codeBlock}>
                  <code>
                    {JSON.stringify(selectedEndpoint.headers, null, 2)}
                  </code>
                </pre>
              </div>
            )}

            {/* Request Body */}
            {selectedEndpoint.body && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h4 style={styles.sectionTitle}>Request Body</h4>
                  <button
                    onClick={() =>
                      handleCopyExample(1, selectedEndpoint.body!)
                    }
                    style={styles.copyButton}
                  >
                    {copiedIndex === 1 ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
                <pre style={styles.codeBlock}>
                  <code>{selectedEndpoint.body}</code>
                </pre>
              </div>
            )}

            {/* Response Example */}
            {selectedEndpoint.response && (
              <div style={styles.section}>
                <div style={styles.sectionHeader}>
                  <h4 style={styles.sectionTitle}>Response Example</h4>
                  <button
                    onClick={() =>
                      handleCopyExample(2, selectedEndpoint.response!)
                    }
                    style={styles.copyButton}
                  >
                    {copiedIndex === 2 ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
                <pre style={styles.codeBlock}>
                  <code>{selectedEndpoint.response}</code>
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Authentication Info */}
      <div style={styles.authInfo}>
        <h4 style={styles.authTitle}>🔐 Authentication</h4>
        <p style={styles.authText}>
          Most endpoints require an API key. Include it in the request headers:
        </p>
        <pre style={styles.authCode}>
          <code>X-API-Key: your_api_key_here</code>
        </pre>
        <p style={styles.authText}>
          Generate API keys in the <strong>API Keys</strong> tab of the
          dashboard.
        </p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  panel: {
    padding: '24px',
    color: '#fff',
    fontFamily: 'monospace',
    maxWidth: '1200px',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#00ffff',
    margin: 0,
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#888',
    margin: 0,
  },
  swaggerButton: {
    padding: '10px 20px',
    background: '#00aaff',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  baseUrlSection: {
    marginBottom: '24px',
    padding: '16px',
    background: 'rgba(0, 255, 255, 0.05)',
    borderRadius: '8px',
    border: '1px solid rgba(0, 255, 255, 0.2)',
  },
  label: {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  urlInput: {
    width: '100%',
    padding: '10px',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '4px',
    color: '#00ffff',
    fontFamily: 'monospace',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  content: {
    display: 'grid',
    gridTemplateColumns: '300px 1fr',
    gap: '24px',
    marginBottom: '32px',
  },
  sidebar: {
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    padding: '16px',
    maxHeight: '600px',
    overflowY: 'auto',
  },
  sidebarTitle: {
    fontSize: '14px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginTop: 0,
    marginBottom: '16px',
  },
  endpointButton: {
    width: '100%',
    padding: '12px',
    background: 'transparent',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '4px',
    textAlign: 'left',
  },
  methodBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
    color: '#fff',
    minWidth: '50px',
    textAlign: 'center',
  },
  endpointPath: {
    fontSize: '13px',
    color: '#fff',
    fontFamily: 'monospace',
    flex: 1,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  details: {
    background: 'rgba(0, 255, 255, 0.05)',
    border: '1px solid rgba(0, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '24px',
  },
  detailsHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  methodBadgeLarge: {
    padding: '8px 16px',
    borderRadius: '4px',
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#fff',
  },
  pathCode: {
    fontSize: '18px',
    color: '#00ffff',
    fontFamily: 'monospace',
  },
  description: {
    fontSize: '14px',
    color: '#aaa',
    marginBottom: '24px',
  },
  section: {
    marginBottom: '24px',
  },
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  sectionTitle: {
    fontSize: '14px',
    color: '#888',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    margin: 0,
  },
  copyButton: {
    padding: '6px 12px',
    background: 'rgba(0, 255, 255, 0.1)',
    border: '1px solid rgba(0, 255, 255, 0.3)',
    borderRadius: '4px',
    color: '#00ffff',
    fontFamily: 'monospace',
    fontSize: '12px',
    cursor: 'pointer',
  },
  codeBlock: {
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '4px',
    padding: '16px',
    overflow: 'auto',
    fontSize: '13px',
    color: '#00ff88',
    margin: 0,
    lineHeight: '1.6',
  },
  authInfo: {
    padding: '20px',
    background: 'rgba(0, 100, 255, 0.1)',
    border: '1px solid rgba(0, 100, 255, 0.3)',
    borderRadius: '8px',
  },
  authTitle: {
    fontSize: '16px',
    color: '#00aaff',
    margin: 0,
    marginBottom: '12px',
  },
  authText: {
    fontSize: '14px',
    color: '#aaa',
    margin: '8px 0',
    lineHeight: '1.6',
  },
  authCode: {
    background: 'rgba(0, 0, 0, 0.5)',
    border: '1px solid rgba(0, 100, 255, 0.3)',
    borderRadius: '4px',
    padding: '12px',
    fontSize: '13px',
    color: '#00aaff',
    margin: '12px 0',
  },
};

export default ApiDocs;
