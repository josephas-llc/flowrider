# Flowrider v2.0 Roadmap
## From MVP to Production-Ready Multi-Agent Orchestration

---

## Vision Statement

**Flowrider v2.0**: The command center for AI-assisted development. While others perfect the single AI assistant, we're building the AI workforce management layer.

**Target**: First production-ready multi-agent terminal orchestrator in a $12.8B market growing 27% CAGR.

---

## Version Milestones

### v0.2.0 - "Activation" (1-2 weeks)
**Goal**: Fix critical onboarding issues; +40% activation rate

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| First-run wizard modal | P0 | 4h | +40% activation |
| Remove DevTools in production | P0 | 30m | Security fix |
| Rename "Attached" → "Connected" | P0 | 2h | -20% confusion |
| Session search (Cmd+/) | P1 | 3h | +20% productivity |
| Simplify Dashboard (4 tabs + Advanced) | P1 | 3h | -30% cognitive load |
| Persistent terminal header | P1 | 2h | Better orientation |
| Keyboard shortcut help (?) | P2 | 2h | Discoverability |

**Technical Tasks**:
- [ ] Add `isFirstRun` flag to store
- [ ] Create `WelcomeWizard.tsx` component
- [ ] Wrap DevTools in `if (isDev)` condition
- [ ] Add `SessionSearch.tsx` with fuzzy matching
- [ ] Reorganize Dashboard tabs (Overview, AI Models, Projects, Advanced)
- [ ] Add `TerminalHeader.tsx` with session context

---

### v0.3.0 - "Power User" (1 month)
**Goal**: Features that make power users sticky

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| File browser in session panel | P1 | 8h | File context |
| Git diff viewer | P1 | 6h | Code review |
| Session templates UI | P1 | 4h | Faster starts |
| AI model selector in session panel | P1 | 2h | Easy switching |
| Command palette (Cmd+K) | P2 | 6h | Power users |
| Configurable AI CLI (not just Claude) | P2 | 4h | Multi-tool |

**Technical Tasks**:
- [ ] Create `FileBrowser.tsx` with tree view
- [ ] Add `git diff` IPC handler
- [ ] Create `DiffViewer.tsx` component
- [ ] Surface `SessionTemplates` in create flow
- [ ] Add AI model dropdown to SessionPanel
- [ ] Build `CommandPalette.tsx` with action registry
- [ ] Make TmuxManager CLI configurable

---

### v0.4.0 - "Intelligence" (2 months)
**Goal**: LEO Learning Module active; AI gets smarter over time

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| LEO Learning active analysis | P1 | 16h | Core value |
| Cross-session context sharing | P1 | 12h | Coordination |
| Suggestion engine live | P1 | 8h | Proactive help |
| Cost optimization suggestions | P2 | 6h | ROI visible |
| Pattern detection alerts | P2 | 4h | User awareness |

**Technical Tasks**:
- [ ] Activate `LearningModule` in AICore
- [ ] Implement cross-session context injection
- [ ] Connect SuggestionEngine to UI
- [ ] Create `CostOptimizer.tsx` recommendations
- [ ] Add pattern notification system

---

### v1.0.0 - "Production Ready" (3 months)
**Goal**: Stable, tested, enterprise-ready

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| 60% test coverage | P0 | 40h | Stability |
| Session recovery on restart | P0 | 8h | Reliability |
| Performance optimizations | P1 | 16h | Scalability |
| Database retention policy | P1 | 4h | Storage |
| Error recovery with retry | P2 | 8h | Resilience |

**Technical Tasks**:
- [ ] Write tests for TmuxManager
- [ ] Write tests for AIService
- [ ] Write tests for IPC handlers
- [ ] Implement session reconnection on startup
- [ ] Add polling throttling for 20 sessions
- [ ] Add 30-day log retention + VACUUM job
- [ ] Implement exponential backoff for API calls

---

### v2.0.0 - "LEO Mode" (6 months)
**Goal**: 400-agent orchestration; enterprise-grade

| Feature | Priority | Effort | Impact |
|---------|----------|--------|--------|
| LEO Mode (20 Flowriders × 20 sessions) | P0 | 80h | 20x scale |
| Enterprise SSO/SAML | P1 | 40h | Enterprise |
| On-prem deployment option | P1 | 40h | Security |
| API v2 with webhooks | P1 | 24h | Integration |
| Multi-user collaboration | P2 | 60h | Teams |

**Technical Tasks**:
- [ ] Design LEO network protocol
- [ ] Implement FlowriderProxy for remote management
- [ ] Add SSO provider integrations
- [ ] Create Docker/Kubernetes deployment configs
- [ ] Build webhook system for external triggers
- [ ] Design real-time collaboration protocol

---

## Feature Details

### First-Run Wizard (v0.2.0)

```typescript
// WelcomeWizard.tsx
const WelcomeWizard: React.FC = () => {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to Flowrider",
      subtitle: "Run 20 AI sessions in parallel",
      content: <IntroAnimation />,
    },
    {
      title: "Pick Your First Session",
      subtitle: "Click any numbered slot (1-20)",
      content: <SessionPicker onSelect={() => setStep(2)} />,
    },
    {
      title: "Choose Your AI",
      subtitle: "Claude, GPT-4, or local models",
      content: <AIProviderPicker />,
    },
    {
      title: "You're Ready!",
      subtitle: "Start building in parallel",
      content: <Confetti />,
    },
  ];

  return <WizardModal steps={steps} currentStep={step} />;
};
```

### Session Search (v0.2.0)

```typescript
// SessionSearch.tsx
const SessionSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const { sessions, selectFace } = useStore();

  const results = useMemo(() => {
    if (!query) return [];
    return sessions
      .map((s, i) => ({ session: s, index: i }))
      .filter(({ session }) =>
        session.name?.toLowerCase().includes(query.toLowerCase()) ||
        session.project?.toLowerCase().includes(query.toLowerCase())
      );
  }, [query, sessions]);

  return (
    <CommandPalette
      placeholder="Search sessions... (Cmd+/)"
      value={query}
      onChange={setQuery}
      results={results}
      onSelect={({ index }) => selectFace(index)}
    />
  );
};
```

### LEO Mode Architecture (v2.0.0)

```
┌─────────────────────────────────────────────────────────────┐
│                      LEO Controller                          │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                    LeoCore Singleton                     │ │
│  │  - Manages up to 20 FlowriderProxy instances            │ │
│  │  - Cross-instance load balancing                        │ │
│  │  - Global cost tracking                                 │ │
│  │  - 3-tier escalation protocol                           │ │
│  └─────────────────────────────────────────────────────────┘ │
│                              │                               │
│    ┌─────────────────────────┴─────────────────────────┐    │
│    │                    │                    │          │    │
│    ▼                    ▼                    ▼          ▼    │
│ ┌──────────┐       ┌──────────┐       ┌──────────┐  (×20)   │
│ │Flowrider │       │Flowrider │       │Flowrider │          │
│ │   #1     │       │   #2     │       │   #3     │   ...    │
│ │(20 sess) │       │(20 sess) │       │(20 sess) │          │
│ └──────────┘       └──────────┘       └──────────┘          │
│                                                              │
│  Total Capacity: 20 × 20 = 400 concurrent AI sessions       │
└─────────────────────────────────────────────────────────────┘
```

---

## Technical Debt to Address

### Critical (v0.2.0)
- [ ] DevTools in production (main.ts:89)
- [ ] Hardcoded `claude` CLI command (TmuxManager.ts:158)
- [ ] No first-run detection

### High Priority (v0.3.0)
- [ ] main.ts is 1,352 LOC - split into services
- [ ] store.ts is 880 LOC - split by domain
- [ ] Inconsistent IPC validation patterns

### Medium Priority (v1.0.0)
- [ ] Unbounded database growth
- [ ] No session recovery
- [ ] 100ms polling per session (CPU concern)
- [ ] Missing tests for critical paths

---

## Success Metrics

### v0.2.0
- [ ] First-time activation rate > 70%
- [ ] Support ticket reduction > 30%
- [ ] Time to first session < 30 seconds

### v0.3.0
- [ ] Power user retention > 60%
- [ ] Average sessions per user > 5
- [ ] NPS > 40

### v1.0.0
- [ ] Test coverage > 60%
- [ ] Crash rate < 0.1%
- [ ] Session recovery success > 99%

### v2.0.0
- [ ] LEO Mode adoption > 20% of Pro users
- [ ] Enterprise pipeline > $1M ARR
- [ ] Average sessions per LEO user > 50

---

## Dependencies & Risks

### Dependencies
- Electron 34.x stability
- xterm.js 5.x compatibility
- Three.js performance on older Macs
- tmux availability on target systems

### Risks
| Risk | Mitigation |
|------|------------|
| Cursor adds multi-session | Ship LEO Mode first (400 > their 20) |
| Performance at 20 sessions | Implement polling throttling |
| Enterprise security concerns | SOC 2 Type II certification |
| Local LLM quality stalls | Maintain cloud provider support |

---

## Resource Allocation

### Phase 1 (v0.2.0 - v0.3.0)
- 1 senior developer (full-time)
- Focus: UX fixes, onboarding, power user features

### Phase 2 (v0.4.0 - v1.0.0)
- 2 developers (full-time)
- Focus: Intelligence features, testing, stability

### Phase 3 (v2.0.0)
- 3 developers + 1 designer
- Focus: LEO Mode, enterprise features, scale

---

## Competitive Timeline

```
Timeline                    Flowrider              Competition
────────────────────────────────────────────────────────────────
July 2026      ──────►      v0.1.6 (current)       No competitors
August 2026    ──────►      v0.2.0 (onboarding)    Still none
September 2026 ──────►      v0.3.0 (power user)    Possible Cursor announcement
November 2026  ──────►      v0.4.0 (intelligence)  Unknown
January 2027   ──────►      v1.0.0 (production)    Cursor multi-session beta?
June 2027      ──────►      v2.0.0 (LEO Mode)      We're at 400, they're at 20
```

**Key Insight**: We have 18-24 months first-mover advantage. LEO Mode (400 agents) is our long-term moat.

---

## Next Steps

1. **Immediate**: Fix DevTools security issue
2. **This Week**: Build first-run wizard, session search
3. **This Month**: Ship v0.2.0, begin v0.3.0 planning
4. **This Quarter**: Reach 500 active users, launch on Product Hunt

---

*Document Version: 1.0*
*Last Updated: July 2026*
*Author: Strategic Planning Team*
