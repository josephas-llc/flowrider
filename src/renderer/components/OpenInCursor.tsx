import React, { useState, useEffect } from 'react';

interface Props {
  workingDir: string;
}

export function OpenInCursor({ workingDir }: Props) {
  const [isInstalled, setIsInstalled] = useState<boolean | null>(null);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    // Check if Cursor CLI is installed
    if (window.flowrider?.cursor) {
      window.flowrider.cursor.checkInstalled().then(r => setIsInstalled(r.installed));
    }
  }, []);

  const handleClick = async () => {
    if (!window.flowrider?.cursor) return;

    setOpening(true);
    const result = await window.flowrider.cursor.open(workingDir);
    setOpening(false);

    if (!result.success) {
      alert(result.error);
    }
  };

  // Don't show if Cursor isn't installed
  if (isInstalled === false) {
    return null;
  }

  // Show loading state while checking installation
  if (isInstalled === null) {
    return null;
  }

  return (
    <button
      onClick={handleClick}
      disabled={opening}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 12px',
        background: 'linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)',
        border: 'none',
        borderRadius: 6,
        color: '#fff',
        fontSize: 12,
        fontWeight: 500,
        cursor: opening ? 'not-allowed' : 'pointer',
        opacity: opening ? 0.6 : 1,
        transition: 'all 0.2s ease',
        boxShadow: '0 2px 8px rgba(124, 58, 237, 0.3)',
      }}
      title="Open this session's working directory in Cursor IDE"
      onMouseEnter={(e) => {
        if (!opening) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(124, 58, 237, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!opening) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 2px 8px rgba(124, 58, 237, 0.3)';
        }
      }}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="12" y1="18" x2="12" y2="12" />
        <line x1="9" y1="15" x2="15" y2="15" />
      </svg>
      {opening ? 'Opening...' : 'Open in Cursor'}
    </button>
  );
}
