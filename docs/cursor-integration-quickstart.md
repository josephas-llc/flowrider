# Cursor IDE Integration - Quick Start Guide

## For Users

### Prerequisites
1. Install [Cursor IDE](https://cursor.sh/)
2. Install the Cursor CLI command:
   - Open Cursor
   - Press `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
   - Type "Install cursor command"
   - Select it from the menu

### Using the Feature
1. Launch Flowrider
2. Create or select a session
3. Look for the purple "Open in Cursor" button below the directory path
4. Click it to open the session's working directory in Cursor IDE

### Troubleshooting

**Button doesn't appear?**
- Make sure you have a tmux session created
- Verify Cursor CLI is installed (run `which cursor` in terminal)
- Restart Flowrider after installing Cursor CLI

**Get an error when clicking?**
- Make sure the working directory exists
- Verify Cursor CLI is in your PATH
- Try opening Cursor manually first to ensure it works

## For Developers

### Testing the Integration

#### 1. Unit Tests
```bash
npm test -- OpenInCursor.test.tsx
```

#### 2. Manual Testing
```bash
npm run dev
```
Then:
1. Create a session with a working directory
2. Click "Open in Cursor" button
3. Verify Cursor opens with the correct directory

#### 3. Test Without Cursor Installed
Temporarily rename the cursor binary:
```bash
# Backup
sudo mv /usr/local/bin/cursor /usr/local/bin/cursor.bak

# Test in Flowrider - button should not appear

# Restore
sudo mv /usr/local/bin/cursor.bak /usr/local/bin/cursor
```

### Adding Support for Other IDEs

To add support for another IDE (e.g., VS Code), follow this pattern:

1. **Create IPC handlers** (`src/main/ipc/vscode-handlers.ts`):
```typescript
ipcMain.handle('vscode:open', async (_event, workingDir: string) => {
  // Use 'code' command for VS Code
  await execAsync(`code "${workingDir}"`);
});
```

2. **Update preload** (`src/main/preload.ts`):
```typescript
vscode: {
  open: (workingDir: string) => ipcRenderer.invoke('vscode:open', workingDir),
  checkInstalled: () => ipcRenderer.invoke('vscode:check'),
}
```

3. **Create component** (`src/renderer/components/OpenInVSCode.tsx`):
```tsx
export function OpenInVSCode({ workingDir }: Props) {
  // Similar to OpenInCursor
}
```

4. **Add to SessionPanel**:
```tsx
<OpenInCursor workingDir={selectedSession.workingDir} />
<OpenInVSCode workingDir={selectedSession.workingDir} />
```

### Code Structure

```
src/
├── main/
│   └── ipc/
│       └── cursor-handlers.ts    # IPC handlers (main process)
├── renderer/
│   └── components/
│       ├── OpenInCursor.tsx      # React component
│       └── OpenInCursor.test.tsx # Unit tests
└── main/
    └── preload.ts                # IPC bridge
```

### Key Implementation Details

1. **Auto-detection**: Component checks if Cursor CLI is installed on mount
2. **Silent degradation**: Button hides if Cursor not installed (no error)
3. **Error handling**: Shows alert with helpful message on failure
4. **Loading states**: Button disabled with "Opening..." text while launching
5. **Type safety**: Full TypeScript coverage in preload and handlers

### Performance Considerations

- CLI check happens once on component mount (cached in state)
- Opening Cursor is async and non-blocking
- Component unmounts cleanly (no memory leaks)

### Security Considerations

- Directory path validation before opening
- No shell injection vulnerabilities (uses proper escaping)
- Follows Electron security best practices (contextIsolation, nodeIntegration: false)

## FAQ

**Q: Can I add keyboard shortcuts?**
A: Yes, you can add global shortcuts in `main.ts` using Electron's `globalShortcut` API.

**Q: Can I configure which IDE to use?**
A: Not yet, but this could be added in settings. See "Future Enhancements" in the main docs.

**Q: Does this work on Windows/Linux?**
A: Yes, the code uses cross-platform Node.js APIs. Just ensure Cursor CLI is installed.

**Q: Can I open specific files instead of directories?**
A: Not currently, but the handlers could be extended to support file paths.

## Resources

- [Cursor Documentation](https://cursor.sh/docs)
- [Electron IPC Guide](https://www.electronjs.org/docs/latest/tutorial/ipc)
- [Flowrider Architecture](../CLAUDE.md)
