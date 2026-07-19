import React, { useState, useEffect, useCallback } from 'react';

interface FileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  isFile: boolean;
  size: number;
}

interface FileBrowserProps {
  rootPath: string;
  onFileSelect?: (filePath: string) => void;
  maxHeight?: string;
}

const FILE_ICONS: Record<string, string> = {
  // Folders
  folder: '◇',
  folderOpen: '◈',
  // Code files
  ts: '◆',
  tsx: '◆',
  js: '◆',
  jsx: '◆',
  py: '◆',
  rs: '◆',
  go: '◆',
  // Config/data
  json: '▣',
  yaml: '▣',
  yml: '▣',
  toml: '▣',
  // Docs
  md: '▤',
  txt: '▤',
  // Default
  default: '○',
};

const getFileIcon = (entry: FileEntry): string => {
  if (entry.isDirectory) return FILE_ICONS.folder;
  const ext = entry.name.split('.').pop()?.toLowerCase() || '';
  return FILE_ICONS[ext] || FILE_ICONS.default;
};

const formatSize = (bytes: number): string => {
  if (bytes === 0) return '';
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

interface TreeNodeProps {
  entry: FileEntry;
  level: number;
  onSelect: (path: string) => void;
  selectedPath: string | null;
}

const TreeNode: React.FC<TreeNodeProps> = ({ entry, level, onSelect, selectedPath }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [children, setChildren] = useState<FileEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const loadChildren = useCallback(async () => {
    if (!entry.isDirectory || children.length > 0) return;
    setIsLoading(true);
    try {
      const result = await window.flowrider.fs.readDirectory(entry.path);
      if (result.success && result.data) {
        setChildren(result.data);
      }
    } catch (error) {
      console.error('[FileBrowser] Error loading directory:', error);
    }
    setIsLoading(false);
  }, [entry.path, entry.isDirectory, children.length]);

  const handleClick = () => {
    if (entry.isDirectory) {
      if (!isExpanded) {
        loadChildren();
      }
      setIsExpanded(!isExpanded);
    }
    onSelect(entry.path);
  };

  const isSelected = selectedPath === entry.path;
  const icon = entry.isDirectory && isExpanded ? FILE_ICONS.folderOpen : getFileIcon(entry);

  return (
    <div className="file-tree-node">
      <div
        className={`file-tree-item ${isSelected ? 'selected' : ''} ${entry.isDirectory ? 'directory' : 'file'}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={handleClick}
      >
        {entry.isDirectory && (
          <span className={`tree-chevron ${isExpanded ? 'expanded' : ''}`}>
            {isLoading ? '...' : '▸'}
          </span>
        )}
        <span className="file-icon">{icon}</span>
        <span className="file-name">{entry.name}</span>
        {entry.isFile && entry.size > 0 && (
          <span className="file-size">{formatSize(entry.size)}</span>
        )}
      </div>
      {isExpanded && children.length > 0 && (
        <div className="file-tree-children">
          {children.map((child) => (
            <TreeNode
              key={child.path}
              entry={child}
              level={level + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FileBrowser: React.FC<FileBrowserProps> = ({
  rootPath,
  onFileSelect,
  maxHeight = '300px',
}) => {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadRoot = async () => {
      if (!rootPath) {
        setEntries([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await window.flowrider.fs.readDirectory(rootPath);
        if (result.success && result.data) {
          setEntries(result.data);
        } else {
          setError(result.error || 'Failed to load directory');
        }
      } catch (err) {
        setError(String(err));
      }

      setIsLoading(false);
    };

    loadRoot();
  }, [rootPath]);

  const handleSelect = (path: string) => {
    setSelectedPath(path);
    if (onFileSelect) {
      onFileSelect(path);
    }
  };

  if (!rootPath) {
    return (
      <div className="file-browser empty">
        <div className="file-browser-empty-state">
          <span className="empty-icon">◇</span>
          <span>No project directory</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="file-browser loading">
        <div className="file-browser-loading">Loading files...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-browser error">
        <div className="file-browser-error">
          <span className="error-icon">⚠</span>
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="file-browser" style={{ maxHeight }}>
      <div className="file-browser-header">
        <span className="header-icon">◇</span>
        <span className="header-title">Files</span>
        <span className="header-count">{entries.length}</span>
      </div>
      <div className="file-tree">
        {entries.map((entry) => (
          <TreeNode
            key={entry.path}
            entry={entry}
            level={0}
            onSelect={handleSelect}
            selectedPath={selectedPath}
          />
        ))}
        {entries.length === 0 && (
          <div className="file-browser-empty">Empty directory</div>
        )}
      </div>
    </div>
  );
};
