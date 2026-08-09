# Focused Audit Command

Run a focused audit on this codebase using lens **$ARGUMENTS**.

## Available Lenses:
1. **Architecture** - Components, abstractions, coupling, state management
2. **Core Differentiator** - Is Zoix routing working? Feedback loops? Learning?
3. **Security** - API keys, sandboxing, injection, dependencies
4. **Cost/Metrics** - Is cost tracked? Energy estimated? Savings measurable?
5. **Infrastructure** - Sessions, concurrency, streaming, cleanup
6. **DX** - Fresh clone experience, docs, demo path
7. **Cognitive Load** - How much must user hold in head? Trust signals?
8. **Flow/Feedback** - Dead air? Celebrations? Progression visible?
9. **Soul** - One clear purpose? First 90 seconds? What to cut?

## Instructions:
1. Explore relevant parts of the codebase for the chosen lens
2. Score each area: **STRONG** / **ADEQUATE** / **WEAK** / **MISSING**
3. List **top 3 risks** for this lens
4. List **top 3 quick wins** (with effort estimate S/M/L)
5. Be concise - this is a check-in, not a full audit

## Output Format:
```
## Audit: [Lens Name]
**Date:** [today]
**Overall:** [STRONG/ADEQUATE/WEAK]

### Scores
| Area | Score | Notes |
|------|-------|-------|
| ... | ... | ... |

### Top 3 Risks
1. ...
2. ...
3. ...

### Top 3 Quick Wins
1. [S] ...
2. [M] ...
3. [L] ...

### Recommended Next Action
[Single most important thing to do]
```

If no lens number provided, default to lens **9 (Soul)** - the most important one.
