# Flowrider Business Plan

**Version:** 1.0
**Date:** July 2026
**Company:** Grey Sky Labs (josephas-llc)

---

## Executive Summary

Flowrider is an AI session orchestration platform that enables developers to manage 20-400+ concurrent AI coding sessions through a 3D icosahedron interface. While tools like Cursor help one developer write code faster, Flowrider lets one developer run 20 Cursors simultaneously.

**Vision:** Become the meta-layer for AI-assisted software development.

**Target Valuation Path:** $0 → $400M Series A within 24 months.

---

## Market Opportunity

### The AI Coding Tools Market (2026)

| Metric | Value | Source |
|--------|-------|--------|
| Market Size | $12.8B | [IdeaPlan](https://www.ideaplan.io/blog/ai-coding-assistant-market-share-2026) |
| Projected (2032) | $30.1B | 27% CAGR |
| AI-generated code on GitHub | >50% | Industry reports |

### Recent Transactions

| Company | Valuation | Revenue | Event |
|---------|-----------|---------|-------|
| Cursor (Anysphere) | **$60B** | $4B ARR | [Acquired by SpaceX](https://techcrunch.com/2026/06/16/spacex-to-acquire-cursor-for-60b-in-stock-days-after-blockbuster-ipo/) |
| Windsurf (Codeium) | $3B | - | Acquired by Cognition |
| Tabnine | ~$200M | - | Enterprise focus |

### The Gap We Fill

| Tool | Function | Sessions |
|------|----------|----------|
| Cursor/Copilot | AI writes code | 1 |
| **Flowrider** | Orchestrates AI coders | 20-400 |

**Key Insight:** No tool currently exists to orchestrate multiple AI coding sessions. Power users are running multiple terminal tabs manually.

---

## Product

### Core Features

1. **3D Icosahedron Interface** - 20 faces = 20 sessions, intuitive spatial navigation
2. **tmux Session Management** - Native terminal integration with Claude Code
3. **Multi-AI Provider Support** - Claude, Ollama, OpenAI, local LLMs
4. **LEO Meta-Orchestration** - Manage 20 Flowriders = 400 concurrent sessions
5. **SQLite Persistence** - Session state, history, and context preserved
6. **Attention System** - Priority scoring to surface sessions needing human input

### Technology Stack

- **Frontend:** React + Three.js + React Three Fiber
- **Backend:** Electron + Node.js
- **Terminals:** xterm.js + node-pty
- **Database:** better-sqlite3
- **State:** Zustand

### Current Status

- v0.1.0 released (macOS DMG)
- Core orchestration working
- GitHub: [josephas-llc/flowrider](https://github.com/josephas-llc/flowrider)

---

## Business Model

### Pricing Tiers

| Tier | Price | Sessions | Features |
|------|-------|----------|----------|
| **Free** | $0 | 3 | Core orchestration |
| **Pro** | $29/mo | 20 | Full icosahedron, all providers |
| **Team** | $99/mo | 100 | LEO mode, team sharing |
| **Enterprise** | Custom | Unlimited | On-prem, SSO, support |

### Revenue Projections

| Milestone | Users | MRR | ARR |
|-----------|-------|-----|-----|
| Month 6 | 500 | $5K | $60K |
| Month 12 | 2,000 | $30K | $360K |
| Month 18 | 10,000 | $150K | $1.8M |
| Month 24 | 50,000 | $750K | $9M |

**Target for Series A:** $5-10M ARR

---

## Go-to-Market Strategy

### Phase 1: Product-Market Fit (Months 1-6)

**Cursor's Playbook:** Reached $100M ARR with zero marketing spend through product-led growth.

| Action | Timeline | Success Metric |
|--------|----------|----------------|
| Hacker News "Show HN" launch | Week 1 | 100+ upvotes, 50 signups |
| Open source core (keep LEO closed) | Week 2 | 500 GitHub stars |
| Demo video (60 sec) | Week 1 | 10K views |
| Landing page + waitlist | Week 1 | 1,000 signups |
| First 100 paying users | Month 3 | $2-5K MRR |

### Target Early Adopters

1. Power users running multiple Claude Code instances
2. Indie hackers with 5+ active projects
3. Consultants managing multiple client codebases
4. Agency developers juggling client work

### Distribution Channels

| Channel | Cost | Expected Users |
|---------|------|----------------|
| Hacker News | Free | 500-2,000 |
| Twitter/X tech community | Free | 1,000-5,000 |
| YouTube demos | Free | 2,000-10,000 |
| Dev.to / Hashnode articles | Free | 500-2,000 |
| Product Hunt launch | Free | 1,000-3,000 |

**Total Marketing Budget:** $0 (product-led growth)

---

## Competitive Landscape

### Direct Competitors

None identified. No existing tool orchestrates multiple AI coding sessions.

### Adjacent Tools

| Tool | What They Do | Our Advantage |
|------|--------------|---------------|
| Cursor | Single AI coding session | We run 20 Cursors |
| tmux | Terminal multiplexer | We add AI orchestration |
| VS Code | IDE | We're provider-agnostic |
| Warp | Modern terminal | We focus on AI sessions |

### Defensibility

1. **Novel Architecture** - LEO meta-orchestration is genuinely new
2. **3D Interface** - Unique UX for session management
3. **Provider Agnostic** - Works with any AI (Claude, GPT, Ollama, local)
4. **Network Effects** - Team features create switching costs

---

## Funding Strategy

### Cursor's Funding History

| Round | Amount | Valuation | Date |
|-------|--------|-----------|------|
| Seed | $8M | ~$40M | 2023 |
| Series A | $60M | $400M | Aug 2024 |
| Series B | $105M | $2.5B | Dec 2024 |
| Series C | - | $9B | May 2025 |
| Series D | $2.3B | $29.3B | Nov 2025 |

Source: [Contrary Research](https://research.contrary.com/company/cursor), [Value Add VC](https://valueaddvc.com/blog/cursor-ai-valuation-how-a-code-editor-became-a-9b-company)

### Our Target Path

| Round | Target | Valuation | Timeline | Requirements |
|-------|--------|-----------|----------|--------------|
| **Pre-seed** | $500K | $5M | Q3 2026 | 1K users, working product |
| **Seed** | $2-3M | $20-30M | Q1 2027 | 5K users, $10K MRR |
| **Series A** | $30-60M | $400M | Q1 2028 | 50K users, $5M ARR |

### Target Investors

Based on [top dev tools investors](https://evilmartians.com/chronicles/top-16-developer-tool-investors-and-vcs-going-into-2025):

| Investor | Why | Notable Investments |
|----------|-----|---------------------|
| OpenAI Startup Fund | Backed Cursor seed | Cursor, dev tools focus |
| Andreessen Horowitz (a16z) | Most active in dev tools | Cursor, Anduril |
| Thrive Capital | Led multiple Cursor rounds | Cursor Series B, C, D |
| Firestreak Ventures | Fast (2-3 week term sheets) | Anthropic, Hugging Face |
| Y Combinator | Accelerator + network | Cursor went through OpenAI's |

### Alternative Funding

| Source | Amount | Equity | Notes |
|--------|--------|--------|-------|
| SBIR Phase I | $275K | 0% | 6 months R&D |
| SBIR Phase II | $1.8M | 0% | 24 months |
| Revenue | - | 0% | Bootstrap if needed |

---

## Key Metrics for Investors

Based on [current VC expectations](https://insights.tryspecter.com/devtools-landscape-2025/):

| Metric | Target | Industry Benchmark |
|--------|--------|-------------------|
| Burn Multiple | <1.5x | Median 1.8x (2024) |
| Monthly Growth | 15-20% | Cursor: 50%+ |
| DAU/MAU | >30% | Strong engagement |
| Net Revenue Retention | >120% | Expansion revenue |
| CAC Payback | <12 months | Efficient growth |

---

## Team

### Current

- **Zachary Kramer** - Founder, Grey Sky Labs
  - Background: [Your relevant experience]
  - Other projects: tenfourOS, nightjarOS, alotallamasOS

### Hiring Plan

| Role | Timeline | Priority |
|------|----------|----------|
| Full-stack engineer | Post-seed | High |
| Developer advocate | Post-seed | High |
| Designer | Series A | Medium |

---

## Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| AI providers build this | Medium | High | Stay provider-agnostic |
| Market timing too early | Low | Medium | Market is hot now |
| Technical complexity | Medium | Medium | Focus on stability |
| Competition emerges | Medium | Medium | Move fast, build moat |

---

## 90-Day Action Plan

### Week 1-2: Launch Prep

- [ ] Sign macOS DMG (Apple Developer cert)
- [ ] Create demo video (60 seconds)
- [ ] Build landing page (flowrider.dev)
- [ ] Write README with clear value prop
- [ ] Prepare HN "Show HN" post

### Week 3-4: Public Launch

- [ ] Post to Hacker News
- [ ] Share on Twitter/X
- [ ] Engage with early users
- [ ] Collect feedback, iterate

### Month 2: Iterate

- [ ] Fix bugs from user feedback
- [ ] Add most-requested features
- [ ] Start charging ($29/mo Pro tier)
- [ ] Hit 100 paying users

### Month 3: Scale

- [ ] Product Hunt launch
- [ ] First YouTube tutorials
- [ ] Reach $5K MRR
- [ ] Begin investor conversations

---

## Appendix

### A. Market Research Sources

- [TechCrunch: SpaceX Cursor Acquisition](https://techcrunch.com/2026/06/16/spacex-to-acquire-cursor-for-60b-in-stock-days-after-blockbuster-ipo/)
- [AI Coding Assistant Market Share 2026](https://www.ideaplan.io/blog/ai-coding-assistant-market-share-2026)
- [Bloomberg: Cursor $50B Valuation](https://www.bloomberg.com/news/articles/2026-03-12/ai-coding-startup-cursor-in-talks-for-about-50-billion-valuation)
- [Contrary Research: Cursor](https://research.contrary.com/company/cursor)
- [Cursor: Fastest Growing SaaS](https://www.spearhead.so/blogs/cursor-by-anysphere-the-fastest-growing-saas-product-ever)
- [Top 16 Dev Tool Investors 2025](https://evilmartians.com/chronicles/top-16-developer-tool-investors-and-vcs-going-into-2025)
- [DevTools Landscape 2025](https://insights.tryspecter.com/devtools-landscape-2025/)

### B. Technical Documentation

- [BUILD.md](docs/BUILD.md) - Build instructions
- [CLAUDE.md](CLAUDE.md) - Development guide
- [ARCHITECTURE.md](ARCHITECTURE.md) - System design

### C. Current Release

- **Version:** 0.1.0
- **Platforms:** macOS (arm64, x64)
- **Download:** [GitHub Releases](https://github.com/josephas-llc/flowrider/releases/tag/v0.1.0)

---

*Document generated: July 2026*
*Flowrider v0.1.0*
*Grey Sky Labs*
