# Cursor IDE Integration

This document describes the Cursor IDE integration feature in Flowrider.

## Overview

The Cursor integration allows users to quickly open a session's working directory in Cursor IDE with a single click. This is useful for switching between the Flowrider terminal interface and a full-featured code editor.

## Features

- **One-click opening**: Click the "Open in Cursor" button to open the session's working directory in Cursor IDE
- **Auto-detection**: The button only appears if Cursor CLI is installed on the system
- **Visual feedback**: Shows "Opening..." state while launching Cursor
- **Error handling**: Displays helpful error messages if Cursor CLI is not installed

## Installation Requirements

For the integration to work, users must have the Cursor CLI command installed:

1. Open Cursor IDE
2. Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
3. Type "Install cursor command" and select it
4. The `cursor` command will be installed to your system PATH

## Architecture

### Files

- **`src/main/ipc/cursor-handlers.ts`**: IPC handlers for Cursor integration
  - `cursor:open` - Opens a directory in Cursor IDE
  - `cursor:check` - Checks if Cursor CLI is installed

- **`src/renderer/components/OpenInCursor.tsx`**: React component that renders the button

- **`src/main/preload.ts`**: Exposes Cursor IPC methods to renderer process

### IPC Methods

#### `cursor:open`
Opens a directory in Cursor IDE.

**Parameters:**
- `workingDir: string` - The directory path to open

**Returns:**
```typescript
{
  success: boolean;
  error?: string;
}
```

#### `cursor:check`
Checks if the Cursor CLI is installed.

**Returns:**
```typescript
{
  installed: boolean;
}
```

### Component Usage

The `OpenInCursor` component is integrated into the SessionPanel:

```tsx
import { OpenInCursor } from './OpenInCursor';

// In SessionPanel
{selectedSession.workingDir && (
  <OpenInCursor workingDir={selectedSession.workingDir} />
)}
```

## User Experience

1. User creates a session with a working directory
2. The `OpenInCursor` component checks if Cursor CLI is installed on mount
3. If installed, displays the "Open in Cursor" button
4. User clicks the button
5. Cursor IDE opens with the session's working directory
6. If Cursor CLI is not installed, shows an error message with installation instructions

## Error Handling

- **Directory doesn't exist**: Returns error message
- **Cursor CLI not installed**: Returns error with installation instructions
- **Other errors**: Returns generic error message

## Future Enhancements

Potential future improvements:
- Support for other IDEs (VS Code, WebStorm, etc.)
- Open specific files instead of just directories
- Configure default IDE in settings
- Deep linking to specific lines/files
