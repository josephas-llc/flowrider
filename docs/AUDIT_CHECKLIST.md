# Flowrider 5-Minute Audit Checklist

Quick self-audit you can run weekly. Pick one section per week for rotation, or scan all for pre-release.

---

## Week 1: Architecture + Security

### Architecture
- [ ] Can I explain the system in one diagram?
- [ ] Is there a clean interface for adding new AI providers?
- [ ] Are there any files > 500 lines that should be split?
- [ ] Is state recoverable after crash?

### Security
- [ ] Run `npm audit` - any high/critical?
- [ ] Are API keys in `.env` and `.gitignore`?
- [ ] Can AI-generated commands escape their session?
- [ ] Is there session isolation?

**If any boxes unchecked:** Create issue, tag `tech-debt`

---

## Week 2: Core Differentiator + Cost

### Zoix Routing (THE CORE)
- [ ] Is every AI call logged to `task_outcomes`?
- [ ] Are tokens in/out tracked per call?
- [ ] Can I answer "how much did Zoix save yesterday?"
- [ ] Is there a feedback loop (outcome → better routing)?

### Cost Visibility
- [ ] Is savings visible to user in UI?
- [ ] Is baseline cost calculated (vs always-Opus)?
- [ ] Are retries counted in cost?

**If Zoix gaps:** This is P0. Fix before new features.

---

## Week 3: Infrastructure + DX

### Infrastructure
- [ ] What breaks at 20 concurrent sessions?
- [ ] Are idle sessions cleaned up?
- [ ] Is there a health check for sessions?
- [ ] Is capture buffer sufficient (5000+ lines)?

### Developer Experience
- [ ] Can someone clone and run in < 5 minutes?
- [ ] Is there a 2-minute demo path?
- [ ] Is the README accurate and current?
- [ ] Are there obvious error messages?

**If DX broken:** Fix immediately - this is your funnel.

---

## Week 4: Human Experience

### Cognitive Load
- [ ] Can user see status of all sessions at a glance?
- [ ] Is there a summary for each session (not just raw terminal)?
- [ ] Are attention-needed sessions highlighted?
- [ ] Is the user a conductor or a babysitter?

### Flow & Feedback
- [ ] Is there visual feedback during AI inference?
- [ ] Is there celebration on task completion?
- [ ] Can user see their progression over time?
- [ ] Is there any "dead air" > 3 seconds?

### Soul Check (Most Important)
- [ ] Can I state the purpose in ONE sentence?
- [ ] Does the UI communicate that sentence?
- [ ] What feature should we CUT to sharpen focus?
- [ ] Would I be proud to demo this today?

**The sentence:** "Your work costs less of the world."

---

## Quick Scoring

After checking, score overall:

| Rating | Meaning |
|--------|---------|
| **GREEN** | All boxes checked, ship it |
| **YELLOW** | 1-2 gaps, create issues, can still ship |
| **RED** | Core gaps (Zoix, DX, Security), fix before shipping |

---

## Audit Log

Track your audits here:

| Date | Focus | Score | Notes |
|------|-------|-------|-------|
| | | | |
| | | | |
| | | | |

---

## Full 9-Expert Audit

For pre-release or quarterly deep dive, run the full audit:
```bash
# In Claude Code, paste contents of AUDIT.md prompt
# Or use: /audit 1 through /audit 9
```

See `AUDIT.md` in repo root for the complete multi-expert framework.
