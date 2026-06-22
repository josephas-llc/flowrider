# DEVELOPMENT.md - Flowrider Development Guide

## Prerequisites

- **Node.js**: v18+ (LTS recommended)
- **npm**: v9+
- **tmux**: Required for session management
- **macOS**: Primary development platform (Darwin)

### Install tmux (macOS)

```bash
brew install tmux
```

## Quick Start

```bash
# Clone and install
cd flowrider2
npm install

# Development mode (with hot reload)
npm run dev

# In a separate terminal, start Electron
npm run start
```

## Project Structure

```
flowrider2/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── main.ts           # Entry point, IPC handlers
│   │   ├── preload.ts        # Context bridge (window.flowrider API)
│   │   ├── TmuxManager.ts    # tmux session management
│   │   ├── SessionMonitor.ts # Auto-captures interactions for LEO AI
│   │   ├── ContextInjector.ts# Injects learned context into prompts
│   │   ├── LeoManager.ts     # LEO meta-orchestration
│   │   └── leo-ai/           # LEO AI learning system
│   │       ├── LeoAI.ts      # Main coordinator
│   │       ├── LeoMemory.ts  # SQLite persistence
│   │       ├── LeoCollector.ts
│   │       ├── LeoAnalyzer.ts
│   │       └── LeoDistiller.ts
│   └── renderer/             # React frontend (Vite)
│       ├── App.tsx           # Main app component
│       ├── components/       # React components
│       └── store/            # Zustand state management
├── dist/                     # Compiled output
│   ├── main/                 # Compiled main process
│   └── renderer/             # Compiled renderer (Vite output)
├── release/                  # Packaged app output
├── assets/                   # App icons
├── build/                    # Build configuration (entitlements)
└── scripts/                  # Utility scripts
```

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Run both main & renderer in watch mode |
| `npm run dev:main` | TypeScript watch for main process |
| `npm run dev:renderer` | Vite dev server for renderer |
| `npm run build` | Build both main & renderer |
| `npm run build:main` | Compile main process TypeScript |
| `npm run build:renderer` | Build renderer with Vite |
| `npm run start` | Launch Electron (requires build first) |
| `npm run dist` | Build and package for distribution |
| `npm run dist:mac` | Build macOS DMG |

## Development Workflow

### 1. Start Development Mode

```bash
# Terminal 1: Start watchers
npm run dev

# Terminal 2: Launch Electron (after build completes)
npm run start
```

### 2. Making Changes

- **Main process** (`src/main/*.ts`): Changes require restarting Electron
- **Renderer** (`src/renderer/*`): Hot module replacement (HMR) enabled
- **Preload** (`src/main/preload.ts`): Requires Electron restart

### 3. Clean Build

```bash
rm -rf dist
npm run build
npm run start
```

## Troubleshooting

### App Won't Launch

```bash
# 1. Ensure build is complete
npm run build

# 2. Check for TypeScript errors
npm run build:main 2>&1 | grep -i error

# 3. Check if dist/main/main.js exists
ls -la dist/main/main.js

# 4. Run with debug output
DEBUG=* npm run start
```

### tmux Session Issues

```bash
# List all tmux sessions
tmux list-sessions

# Kill all flowrider sessions
tmux list-sessions | grep flowrider | cut -d: -f1 | xargs -I {} tmux kill-session -t {}

# Check if tmux is installed
which tmux
```

### Native Module Issues (better-sqlite3, node-pty)

```bash
# Rebuild native modules for Electron
npm rebuild

# Or reinstall everything
rm -rf node_modules package-lock.json
npm install
```

### SSL/TLS Certificate Issues

```bash
# If npm install fails due to SSL, temporarily bypass
NODE_TLS_REJECT_UNAUTHORIZED=0 npm install
```

### Port Conflicts

```bash
# Kill processes on Vite's port (5173)
lsof -ti:5173 | xargs kill -9
```

## Data Locations

| Path | Purpose |
|------|---------|
| `~/.flowrider/` | App data directory (created on first run) |
| `~/.flowrider/leo-ai.db` | LEO AI learning database (SQLite) |
| `~/.flowrider/flowrider.db` | Sessions and projects |
| `~/.flowrider/config.json` | User configuration |

## Building for Distribution

### macOS DMG

```bash
npm run dist:mac
# Output: release/Flowrider-{version}.dmg
```

### Code Signing (Production)

The build is configured for hardened runtime. For signed builds:

1. Set up Apple Developer certificates
2. Update `build/entitlements.mac.plist`
3. Run: `npm run dist:mac`

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `electron` | Desktop app framework |
| `@react-three/fiber` | 3D icosahedron visualization |
| `@xterm/xterm` | Terminal emulation |
| `better-sqlite3` | LEO AI persistent storage |
| `node-pty` | Pseudo-terminal for tmux |
| `zustand` | React state management |
| `vite` | Fast bundler for renderer |

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DEBUG=*` | Enable debug logging |
| `NODE_ENV=development` | Development mode (default) |
| `NODE_TLS_REJECT_UNAUTHORIZED=0` | Bypass SSL (dev only) |

## Testing

Currently manual testing. Future plans:
- Unit tests with Vitest
- E2E tests with Playwright

## Contributing

1. Create a feature branch
2. Make changes
3. Test locally with `npm run dev` + `npm run start`
4. Ensure build passes: `npm run build`
5. Submit PR

## Related Documentation

- [AGENTS.md](./AGENTS.md) - Agent architecture and LEO AI
- [ARCHITECTURE.md](./ARCHITECTURE.md) - System architecture
- [API.md](./API.md) - window.flowrider API reference
- [LEO_LEARNING.md](./LEO_LEARNING.md) - LEO AI deep dive
