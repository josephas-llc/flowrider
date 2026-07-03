# Show HN: Flowrider - Run 20 AI Coding Sessions Simultaneously

## Title (80 char max)
```
Show HN: Flowrider - Run 20 AI coding sessions at once (3D orchestration UI)
```

## Post Text

Hey HN,

I built Flowrider because I got tired of context-switching between AI coding tasks. Cursor helps you code faster with 1 session. Flowrider lets you run 20 Cursors.

**The problem:** Every AI coding tool is single-threaded. You have 50 tickets. You can only talk to one AI at a time.

**The solution:** A 3D icosahedron (20-faced shape) where each face is a separate AI session. Click a face, start a task. Click another, start another. All running in parallel.

**What it does:**
- 20 concurrent AI coding sessions with independent contexts
- Provider agnostic: Claude, GPT-4, Ollama, any local LLM
- Cost optimization: Use free local models for 80% of tasks
- Real terminal integration (tmux + xterm.js)
- Session persistence (SQLite)

**What makes it different:**
- No other tool orchestrates multiple AI sessions
- 3D interface makes session switching intuitive
- Mix expensive cloud APIs with free local models per-session
- Coming soon: LEO mode (20 Flowriders = 400 agents)

**Tech stack:**
- Electron + React + Three.js + React Three Fiber
- tmux for terminal sessions
- better-sqlite3 for persistence
- Zustand for state

**What I learned:**
- Three.js performance matters when you have 20 interactive faces
- tmux is underrated for AI session management
- The hard part isn't running AI, it's knowing which session needs your attention

Currently macOS only. Working on Linux/Windows.

Download: https://github.com/josephas-llc/flowrider/releases/tag/v0.1.0
Source: https://github.com/josephas-llc/flowrider

Would love feedback from anyone juggling multiple AI coding projects.

---

## Notes for Posting

**Best time to post:** Tuesday-Thursday, 7-9 AM PST (10 AM - 12 PM EST)

**HN title format:** "Show HN: [Name] - [one-liner value prop]"

**What HN likes:**
- Technical depth (mention the stack)
- Problem → Solution framing
- Open source
- Honesty about limitations
- "I built this because I needed it"

**What to avoid:**
- Marketing speak
- Valuation/funding mentions
- "Revolutionary" claims
- Too long posts

**Engagement strategy:**
1. Respond to every comment in first 2 hours
2. Be humble about limitations
3. Ask for specific feedback
4. Share technical decisions when asked

---

## Alternative Titles (test on Twitter first)

1. `Show HN: Flowrider - Run 20 AI coding sessions at once`
2. `Show HN: Flowrider - 3D orchestration for AI coding agents`
3. `Show HN: I built a tool to run 20 Claude Code sessions simultaneously`
4. `Show HN: Flowrider - The control tower for AI coding`
