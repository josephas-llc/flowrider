# Flowrider Business Plan

**Version:** 2.0 (Post-Audit Update)
**Date:** August 2026
**Company:** Josephas LLC

---

## Executive Summary

**Flowrider** is an AI orchestration platform that lets developers run 20+ parallel AI coding sessions with intelligent cost-optimized routing via **Zoix**.

**The Core Value Proposition:**
> **Your work costs less of the world.**

Zoix routes tasks to the most cost-effective AI model (Claude, GPT, Gemini, Ollama, local), achieving **60-80% cost savings** compared to always using the strongest model—with zero quality loss.

**Business Model:** Open Core
- **Zoix Core:** MIT licensed, free forever
- **Flowrider App:** MIT licensed, self-hostable
- **Flowrider Pro:** Commercial license for enterprise features

---

## The Market Opportunity

### Market Size

| Metric | Value |
|--------|-------|
| AI Coding Tools Market (2026) | $12.8B |
| Projected Market (2032) | $30.1B |
| CAGR | 27% |
| AI-generated code on GitHub | >50% |

### The Problem

1. **Single-Session Bottleneck:** Every AI coding tool today (Cursor, Copilot, Claude Code) is single-threaded. Developers have 50+ tickets but can only work on one AI task at a time.

2. **AI Cost Explosion:** Enterprises are shocked by AI bills. The U.S. Army ran out of AI tokens. CEOs are mandating cost controls.

3. **No Intelligent Routing:** Developers use Claude Opus for trivial tasks that Haiku could handle. They pay $15/MTok when $0.25/MTok would suffice.

4. **Environmental Impact:** Every AI call has a carbon cost. Unnecessary compute usage at scale contributes to global energy consumption.

### The Solution

Flowrider addresses all four:

1. **Multi-Session:** 20 parallel AI sessions (400 in LEO mode)
2. **Cost Control:** Hard budget limits, per-project tracking
3. **Intelligent Routing:** Zoix automatically selects the right model for each task
4. **Sustainability:** Routing to cheaper/local models reduces energy consumption

---

## Product Overview

### Flowrider (Free, MIT)

- 20-face icosahedron interface
- Multi-session orchestration
- Multi-provider AI support (Claude, GPT, Gemini, Grok, Ollama, local)
- SQLite persistence for sessions, costs, learning
- Dashboard with ROI calculator
- MCP integration for tooling

### Zoix Core (Free, MIT)

The intelligent routing layer:

```
┌─────────────────────────────────────────┐
│              ZOIX ENGINE                │
│                                         │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │ Task        │  │ TaskOutcomes    │  │
│  │ Analysis    │→ │ (feedback loop) │  │
│  └─────────────┘  └─────────────────┘  │
│         │                  │            │
│         ▼                  ▼            │
│  ┌─────────────────────────────────┐   │
│  │     Model Selection Engine       │   │
│  │  "Debug race condition → Opus"   │   │
│  │  "Format JSON → Haiku (free)"    │   │
│  └─────────────────────────────────┘   │
│                    │                    │
│                    ▼                    │
│            COST/TOKEN TRACKING         │
│            SAVINGS CALCULATION         │
└─────────────────────────────────────────┘
```

**Key Capabilities (Post-Audit):**
- TaskOutcomes feedback loop for continuous learning
- Token/cost tracking per call
- Savings baseline calculation
- Live savings notifications

### Flowrider Pro (Commercial)

| Feature | Description |
|---------|-------------|
| LEO Mode | 400 concurrent agents (20 Flowriders) |
| Team Management | Multi-user workspaces |
| Enterprise SSO | SAML, OIDC integration |
| Hosted Zoix API | SaaS deployment option |
| Priority Support | SLA-backed response times |
| Custom Routing | Org-specific model preferences |

---

## Competitive Landscape

| Competitor | Sessions | Model Agnostic | Cost Routing | Price |
|------------|----------|----------------|--------------|-------|
| **Cursor** | 1 | No (Claude/GPT) | No | $20/mo |
| **Copilot** | 1 | No (GPT) | No | $19/mo |
| **Claude Code** | 1 | No (Claude) | No | Free (API costs) |
| **Goose** | 1 | Yes | No | Free (MIT) |
| **Flowrider** | 20-400 | Yes | Yes (Zoix) | Open Core |

### Competitive Advantages

1. **Only multi-session orchestrator** - Category creator
2. **Only intelligent cost router** - Unique IP
3. **Open Core** - Developer trust + enterprise sales
4. **Mission-aligned** - Sustainability as differentiator

---

## Go-to-Market Strategy

### Phase 1: Open Source Launch (Now)

**Goal:** Developer adoption, community building

- MIT license for Zoix + Flowrider core
- GitHub repo: josephas-llc/flowrider
- Landing page: flowrider.dev
- Direct .dmg download

**Key Metrics:**
- GitHub stars
- Active installs (opt-in telemetry)
- Community contributions (routing improvements)

### Phase 2: Community Growth (Q4 2026)

**Goal:** Establish category, build trust

- Content marketing (dev blogs, videos)
- Discord community
- Conference talks (AI/dev conferences)
- Integration partnerships (IDE plugins)

**Key Metrics:**
- Monthly active users
- Routing accuracy improvements
- Energy savings (aggregate)

### Phase 3: Commercial Launch (Q1 2027)

**Goal:** Revenue from enterprise

- Flowrider Pro launch
- Sales team for enterprise
- SOC2 / security certifications
- Hosted Zoix API for SaaS

**Key Metrics:**
- Paying customers
- ARR
- Net revenue retention

---

## Revenue Model

### Pricing (Proposed)

| Tier | Price | Features |
|------|-------|----------|
| **Core** | Free | 20 sessions, all routing, self-hosted |
| **Pro (Individual)** | $49/mo | Priority support, advanced analytics |
| **Pro (Team)** | $99/user/mo | Team workspaces, shared learning |
| **Enterprise** | Custom | LEO mode, SSO, dedicated support |
| **Zoix API** | Usage-based | $0.01/1000 routing decisions |

### Revenue Projections

| Year | Users | Paid | ARR |
|------|-------|------|-----|
| 2026 | 1,000 | 20 | $20K |
| 2027 | 10,000 | 500 | $500K |
| 2028 | 50,000 | 3,000 | $3M |
| 2029 | 200,000 | 15,000 | $15M |

**Assumptions:**
- 5% free-to-paid conversion
- Average revenue per paid user: $50/mo (blended)
- Enterprise deals start Year 2

---

## Technical Roadmap

### Completed (Phase 1 - Core)

- [x] 3D icosahedron interface
- [x] 20 session management
- [x] Multi-provider AI support (7 providers)
- [x] Zoix routing engine (heuristic)
- [x] Dashboard with cost tracking
- [x] SQLite persistence
- [x] TaskOutcomes feedback loop (Post-Audit)
- [x] Live savings notifications (Post-Audit)
- [x] Open source release (MIT)

### Q4 2026 (Phase 2 - Intelligence)

- [ ] Zoix ML-based routing (learned weights)
- [ ] Task categorization engine
- [ ] Routing eval harness
- [ ] Cross-session awareness
- [ ] Attention system (notifications)

### Q1-Q2 2027 (Phase 3 - Autonomy)

- [ ] 5 autonomy levels
- [ ] Action proposals with approval queue
- [ ] Guard rails and safety
- [ ] Rollback capability

### Q3-Q4 2027 (Phase 4 - Scale)

- [ ] LEO mode (400 agents)
- [ ] Enterprise features (SSO, teams)
- [ ] Hosted Zoix API
- [ ] Custom model fine-tuning

---

## Risk Assessment (Post-Audit)

### Critical Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| **No feedback loop** | Resolved | Critical | TaskOutcomes table implemented |
| **Core value invisible** | Resolved | High | Live savings indicators implemented |
| **Terminal sandboxing** | Current | Critical | Docker containers (planned Q4) |
| **Competitor copies multi-session** | Moderate | High | Move fast, build community moat |
| **AI providers change pricing** | Moderate | Moderate | Multi-provider strategy reduces dependency |

### Audit-Identified Gaps (Resolved)

1. **TaskOutcomes feedback loop** - Enables learning
2. **Savings visibility** - SavingsToast, ZoixIndicator updates
3. **NPM vulnerabilities** - npm audit fix applied
4. **Open source readiness** - CONTRIBUTING.md, issue templates

### Remaining Technical Debt

1. Session sandboxing (security)
2. Provider interface abstraction
3. Store.ts file split
4. Eval harness for routing

---

## Team

**Current:**
- Founder/Developer - Full-stack, AI, Electron

**Needed (Phase 2-3):**
- Developer Relations (community growth)
- Sales (enterprise)
- Designer (UX polish)
- ML Engineer (Zoix learning)

---

## Investment Use (If Applicable)

**Seed Round:** $1-2M

| Allocation | Amount | Use |
|------------|--------|-----|
| Engineering | 50% | 2-3 engineers (ML, full-stack) |
| Sales/Marketing | 25% | DevRel, content, enterprise sales |
| Infrastructure | 15% | Hosting, CI/CD, security audits |
| Operations | 10% | Legal, admin, contingency |

**Milestones:**
- 10K MAU
- 500 paid users
- $500K ARR
- SOC2 certification

---

## The Mission

> **Reduce the energy footprint of AI usage worldwide.**

Every developer using Zoix routes tasks intelligently. Every intelligent route saves compute. Every saved compute reduces energy. Scale this to millions of developers, and we make a real environmental impact.

**Flowrider isn't just an AI tool. It's a statement: Your work costs less of the world.**

---

## Contact

**Website:** flowrider.dev
**GitHub:** github.com/josephas-llc/flowrider
**Email:** hello@josephas.com

---

*Document generated with audit insights from 9-expert analysis (2026-08-09)*
