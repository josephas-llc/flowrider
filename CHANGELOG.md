# Changelog

All notable changes to Flowrider will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Version tracking and changelog system
- Automated changelog generation on releases
- Attention indicators: pulsating red rings on icosahedron faces when sessions need input
- Auto-attach when creating sessions (no extra click needed)
- Terminal visual improvements (glowing border, prominent header)

### Changed
- Disabled auto-rotation on icosahedron for better usability

### Future Features (Backlog)
- Voice commands via Vosk (offline speech recognition)
- TTS for session status announcements
- Wake word detection ("Hey Flowrider")

---

## [0.1.5] - 2024-XX-XX

### Added
- AI suggestions IPC integration
- LEO session counting

### Fixed
- Native module compilation for Electron

## [0.1.4] - 2024-XX-XX

### Added
- Energy tracking and ESG reporting for enterprise sustainability

## [0.1.3] - 2024-XX-XX

### Fixed
- macOS unsigned build: add identity: null to skip code signing
- macOS code signing config for unsigned CI builds

## [0.1.2] - 2024-XX-XX

### Fixed
- macOS and Linux CI build failures
- CI: Add --legacy-peer-deps for react-three version conflict
- CI: Add Python and build deps for native modules

### Changed
- Cross-platform build support + refactoring

## [0.1.1] - 2024-XX-XX

### Added
- Hacker News Show HN post draft
- Enhanced README with clearer value proposition

## [0.1.0] - 2024-XX-XX

### Added
- Initial release
- 3D icosahedron visualization (Three.js + React Three Fiber)
- tmux session management for Claude Code
- Multi-AI provider support (Claude, Ollama, OpenAI, Anthropic, local LLMs)
- Electron app with secure IPC
- xterm.js terminal embedding
- SQLite session persistence
- Zustand state management
- Dark sci-fi command center UI
- LEO (Local Execution Orchestrator) framework for managing multiple Flowrider instances
- Projects panel with GitHub repository detection

---

[Unreleased]: https://github.com/josephas-llc/flowrider/compare/v0.1.5...HEAD
[0.1.5]: https://github.com/josephas-llc/flowrider/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/josephas-llc/flowrider/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/josephas-llc/flowrider/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/josephas-llc/flowrider/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/josephas-llc/flowrider/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/josephas-llc/flowrider/releases/tag/v0.1.0
