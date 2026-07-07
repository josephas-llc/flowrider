# CHANGELOG.md - Flowrider Version History

All notable changes to Flowrider will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Energy Tracking & ESG Reporting** - Track energy consumption per AI provider
  - `wattsPerMToken` estimates for all supported AI providers
  - Baseline comparison vs Claude Opus (most energy-intensive)
  - Dashboard displays energy used (mWh/Wh/kWh) and energy saved
  - Percentage reduction calculation for sustainability reporting
  - Green-highlighted metrics for ESG appeal
- iCloud backup script for LEO AI data (`scripts/backup-to-icloud.sh`)
- Daily automated backup cron job (2am)
- Safe debloat commands in AGENTS.md (no data loss by default)
- Documentation files: DEVELOPMENT.md, CHANGELOG.md, ARCHITECTURE.md, API.md

### Changed
- Moved "Compress old responses" debloat command to optional section with warning

### Fixed
- (Pending) Flowrider app build/launch issues

---

## [0.1.0] - 2024-06-18

### Added

#### Core Features
- 3D icosahedron visualization (Three.js + React Three Fiber)
- 20-face session management (one AI session per face)
- tmux integration for persistent terminal sessions
- xterm.js terminal embedding
- Electron desktop app framework

#### LEO AI Learning System
- **LeoMemory**: SQLite persistence layer (`~/.flowrider/leo-ai.db`)
- **LeoCollector**: Captures prompts, responses, and outcomes
- **LeoAnalyzer**: Pattern detection (error, code, workflow, prompt patterns)
- **LeoDistiller**: Converts knowledge into context for new sessions
- **LeoAI**: Main coordinator for the learning system

#### Session Monitoring
- **SessionMonitor**: Auto-captures tmux interactions
- Prompt/response boundary detection
- Error pattern extraction
- File modification tracking
- Outcome inference (success/failure/partial)

#### Context Injection
- **ContextInjector**: Prepends learned context to prompts
- Configurable: patterns, snippets, warnings
- Token-aware truncation

#### UI Components
- Icosahedron 3D view with face selection
- Session panel with terminal embed
- Thumbs up/down feedback buttons
- Dark sci-fi command center aesthetic

#### IPC API
- `window.flowrider.tmux.*` - Session management
- `window.flowrider.leoai.*` - Learning system
- `window.flowrider.monitor.*` - Session monitoring
- `window.flowrider.context.*` - Context injection
- `window.flowrider.leo.*` - Meta-orchestration (future)

#### Multi-Provider Support (Planned)
- Claude Code CLI (primary)
- Ollama (local models)
- OpenAI API
- Anthropic API direct

#### LEO Meta-Orchestration (Framework)
- LeoManager for multi-Flowrider coordination
- Support for up to 20 Flowriders (400 total sessions)
- Discovery and ping protocols

### Technical Stack
- **Frontend**: React 18, React Three Fiber, Zustand
- **Backend**: Electron 34, TypeScript
- **Storage**: better-sqlite3
- **Terminal**: xterm.js, node-pty
- **Build**: Vite, electron-builder

---

## Version History Format

```
## [X.Y.Z] - YYYY-MM-DD

### Added
- New features

### Changed
- Changes in existing functionality

### Deprecated
- Soon-to-be removed features

### Removed
- Removed features

### Fixed
- Bug fixes

### Security
- Security-related changes
```

---

## Roadmap

### v0.2.0 (Planned)
- [ ] Fix app build/launch issues
- [ ] End-to-end LEO AI learning loop testing
- [ ] Session rename functionality
- [ ] First-run onboarding experience

### v0.3.0 (Planned)
- [ ] LEO AI dashboard view
- [ ] Cross-session context sharing
- [ ] Cost tracking integration
- [ ] Project management UI

### v1.0.0 (Vision)
- [ ] Stable LEO AI learning
- [ ] Production-ready packaging
- [ ] Full documentation
- [ ] Autonomous task execution (with approval gates)
