<p align="center">
  <img src="assets/flowrider-logo.png" alt="Flowrider" width="120" />
</p>

<h1 align="center">Flowrider</h1>

<p align="center">
  <strong>Run 20 AI Coding Sessions Simultaneously.</strong><br/>
  <em>The meta-layer for AI-assisted software development.</em>
</p>

<p align="center">
  <a href="#the-problem">Problem</a> •
  <a href="#features">Features</a> •
  <a href="#installation">Installation</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#why-flowrider">Why Flowrider</a> •
  <a href="#roadmap">Roadmap</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.1.0-blue" alt="Version" />
  <img src="https://img.shields.io/badge/platform-macOS-blue" alt="Platform" />
  <img src="https://img.shields.io/badge/license-MIT-green" alt="License" />
  <a href="https://github.com/josephas-llc/flowrider/releases"><img src="https://img.shields.io/badge/download-DMG-purple" alt="Download" /></a>
</p>

> **Cursor helps one developer write code faster. Flowrider lets one developer run 20 Cursors.**

---

## The Problem

Every AI coding tool today is **single-threaded**.

| Tool | Sessions |
|------|----------|
| Cursor | 1 |
| Copilot | 1 |
| Claude Code | 1 |
| Your backlog | 50+ |

You have 50 tickets. You can only talk to one AI at a time. **That's insane.**

## The Solution

Flowrider gives you an **icosahedron** - a 20-faced shape where each face is a separate AI session.

```
        ╱╲
       ╱  ╲
      ╱ 1  ╲
     ╱──────╲
    ╱ 2 ╱╲ 3 ╲      ← 20 parallel AI sessions
   ╱───╱  ╲───╲
  ╱ 4 ╱ 5  ╲ 6 ╲
 ╱───────────────╲
```

- **Face 1**: "Build the authentication API"
- **Face 2**: "Write unit tests for user service"
- **Face 3**: "Fix the CSS bug in navbar"

All running in parallel. You're the air traffic controller.

## Features

### Multi-Agent Orchestration
Run 20 AI coding sessions simultaneously. Each session maintains its own context, history, and task.

### Model Agnostic
Pick your AI for each session:

| Provider | Models | Cost |
|----------|--------|------|
| Claude (Anthropic) | Opus, Sonnet, Haiku | $$$ |
| OpenAI | GPT-4, GPT-4o | $$$ |
| Gemini (Google) | Pro, Flash | $$ |
| Grok (xAI) | Grok-2 | $$ |
| Ollama | Llama, Mistral, etc. | **FREE** |
| Local LLMs | Any GGUF model | **FREE** |

**Smart Strategy**: Use free local models for 80% of tasks. Reserve cloud APIs for complex reasoning. Users report **10x cost reduction**.

### Dashboard
- **ROI Calculator**: See exactly what you're saving vs hiring developers
- **AI Models**: Switch providers per-session with cost tracking
- **MCP Integration**: Connect to git, databases, browsers, anything
- **A2A Messaging**: Sessions can talk to each other
- **Activity Log**: Full audit trail, EU AI Act compliant

### Coming Soon: LEO Mode

**L**ocal **E**xecutive **O**rchestrator

One Flowrider = 20 sessions.
LEO manages 20 Flowriders.

```
LEO MODE: 20 × 20 = 400 AI Agents
```

Multi-repo development. Agency client management. Enterprise platform teams.

## Installation

### Requirements
- macOS 12+ (Apple Silicon or Intel)
- Node.js 18+
- tmux (for terminal sessions)

### Quick Install

```bash
# Install tmux if needed
brew install tmux

# Clone the repo
git clone https://github.com/josephas-llc/flowrider.git
cd flowrider

# Install dependencies
npm install

# Run in development mode
npm run dev

# Or build and run
npm run build
npm run start
```

### Download Binary

Download the latest `.dmg` from [Releases](https://github.com/josephas-llc/flowrider/releases).

## Quick Start

1. **Launch Flowrider** - The icosahedron appears, slowly rotating

2. **Click a face** - A session panel opens on the right

3. **Name your session** - e.g., "Auth API"

4. **Choose your AI** - Pick Claude, GPT-4, or a free local model

5. **Start coding** - The AI has full terminal access

6. **Repeat** - Click another face, start another task

7. **Monitor** - Use the Dashboard to see all sessions at once

## Why Flowrider

### vs Cursor
Cursor is 1 session. Flowrider is 20. When you're blocked on one task, switch to another. Keep all contexts alive.

### vs Copilot
Copilot suggests code. Flowrider executes tasks. It's the difference between autocomplete and an autonomous agent.

### vs Claude Code CLI
Same power, but multiplied by 20 and visualized. Plus model choice - run Claude for hard problems, free Llama for simple ones.

### vs Building It Yourself
You could tmux + Claude Code + custom scripts. We did that for you, added a 3D interface, cost tracking, and the roadmap to LEO.

## The Market

The AI coding tools market is exploding:

| Metric | Value |
|--------|-------|
| Market Size (2026) | $12.8B |
| Projected (2032) | $30.1B |
| CAGR | 27% |
| AI-generated code on GitHub | >50% |

**But every tool today is single-threaded.** Flowrider is the first multi-session orchestrator.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         ELECTRON APP                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │  React UI     │  │  Three.js     │  │  Zustand      │        │
│  │  (Dashboard)  │  │  (Icosahedron)│  │  (State)      │        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
├─────────────────────────────────────────────────────────────────┤
│                         MAIN PROCESS                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐        │
│  │  tmux Manager │  │  AI Router    │  │  SQLite DB    │        │
│  │  (Sessions)   │  │  (Providers)  │  │  (Persistence)│        │
│  └───────────────┘  └───────────────┘  └───────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

## Roadmap

### Phase 1: Core (Current)
- [x] 3D icosahedron interface
- [x] 20 session management
- [x] Multi-provider AI support
- [x] Dashboard with ROI, MCP, Activity
- [ ] Real terminal embedding (xterm.js)
- [ ] Full Ollama integration

### Phase 2: Intelligence
- [ ] Attention system (notifications)
- [ ] AI suggestion engine
- [ ] Cross-session awareness
- [ ] Pattern detection

### Phase 3: Autonomy
- [ ] 5 autonomy levels (Display → Full Auto)
- [ ] Action proposals with approval queue
- [ ] Guard rails and safety
- [ ] Rollback capability

### Phase 4: LEO Mode
- [ ] 20 Flowrider orchestration
- [ ] 400 concurrent agents
- [ ] Project portfolio management
- [ ] Escalation protocols

### Phase 5: LEO Learning
- [ ] Custom model fine-tuning
- [ ] Organizational pattern learning
- [ ] Proprietary AI asset creation

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Development

```bash
# Run in dev mode with hot reload
npm run dev

# Run tests
npm test

# Build for production
npm run build

# Create distributable
npm run dist
```

## License

MIT License. See [LICENSE](LICENSE) for details.

## Links

- [Website](https://flowrider.dev) (coming soon)
- [Documentation](https://docs.flowrider.dev) (coming soon)
- [Discord](https://discord.gg/flowrider) (coming soon)
- [Twitter/X](https://x.com/flowriderdev)

---

<p align="center">
  <strong>Flowrider: Run 20 AI agents while your competitors run 1.</strong>
</p>

<p align="center">
  <a href="https://github.com/josephas-llc/flowrider/releases">Download v0.1.0</a> •
  <a href="https://github.com/josephas-llc/flowrider">Star on GitHub</a>
</p>

<p align="center">
  <em>Built by <a href="https://github.com/josephas-llc">Josephas LLC</a></em>
</p>
