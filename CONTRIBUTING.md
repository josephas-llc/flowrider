# Contributing to Flowrider & Zoix

First off, thank you for considering contributing! Every improvement to Zoix routing means less energy wasted on AI inference worldwide.

## Our Mission

**Your work costs less of the world.**

We're building smart AI routing that reduces the computational (and environmental) cost of AI-assisted development. Every contribution that improves routing accuracy or reduces unnecessary token usage has real-world impact.

## What's Open for Contribution

### Zoix Core (MIT - Fully Open)

We actively welcome contributions to:

| Area | Examples |
|------|----------|
| **Routing Intelligence** | Better model selection heuristics, ML-based routing |
| **Feedback Loops** | Improved outcome tracking, learning algorithms |
| **Provider Support** | New AI provider integrations |
| **Energy Estimation** | More accurate Wh/token models |
| **Cost Optimization** | Retry strategies, caching, batching |

Location: `src/main/ai-core/`, `src/main/providers/`, `src/main/AIService.ts`

### Flowrider App (Open, but check first)

UI and orchestration contributions are welcome, but please open an issue first to discuss:
- We want to keep the UI focused and simple
- Some features are reserved for Flowrider Pro

### What We're NOT Looking For

- Features that dilute the core routing mission
- Vendor lock-in or proprietary dependencies
- Complexity without clear user benefit

## How to Contribute

### 1. Quick Fixes (Typos, Bugs, Small Improvements)

Just open a PR! No issue needed for:
- Documentation fixes
- Bug fixes with clear reproduction
- Performance improvements with benchmarks

### 2. New Features or Significant Changes

1. **Open an issue first** - Describe what you want to build and why
2. **Wait for feedback** - We'll discuss approach and confirm it fits
3. **Fork and build** - Create your feature branch
4. **Submit PR** - Reference the issue

### 3. Zoix Routing Improvements

This is where we need the most help! If you have ideas for:
- Better model selection (when to use Opus vs Haiku vs local)
- Task categorization (is this a debug task? refactor? code gen?)
- Outcome prediction (will this model succeed on this task?)
- Energy optimization (routing for minimum watts, not just cost)

Please reach out! These are high-impact contributions.

## Development Setup

```bash
# Clone
git clone https://github.com/josephas-llc/flowrider.git
cd flowrider

# Install (requires Node 20+, tmux)
npm install

# Run in dev mode
npm run dev

# Type check
npm run typecheck

# Run audit
/audit 1  # In Claude Code, or manually check docs/AUDIT_CHECKLIST.md
```

## Code Standards

### Style
- TypeScript strict mode
- Prettier for formatting (run `npm run format`)
- ESLint for linting (run `npm run lint`)

### Architecture
- Keep files under 500 lines (split if larger)
- Use the Provider interface for new AI providers
- Log routing decisions to TaskOutcomes for learning

### Commits
- Use conventional commits: `feat:`, `fix:`, `docs:`, `refactor:`
- Reference issues: `feat: add Gemini provider (#123)`
- Keep commits atomic and focused

### Testing
- Add tests for new routing logic
- Test with multiple providers if possible
- Include energy/cost impact in PR description

## Pull Request Process

1. **Update docs** if you changed behavior
2. **Run the audit** - `/audit 2` for routing changes, `/audit 3` for security
3. **Describe the impact** - "This reduces token usage by X% for Y tasks"
4. **Be patient** - We review PRs weekly

## Getting Help

- **Questions**: Open a Discussion on GitHub
- **Bugs**: Open an Issue with reproduction steps
- **Ideas**: Open an Issue tagged `enhancement`
- **Security**: Email security@josephas.com (do not open public issue)

## Recognition

Contributors are recognized in:
- Release notes
- Contributors list in README
- Annual "Impact Report" showing collective energy savings

## Code of Conduct

Be kind. We're all here to reduce AI's environmental footprint.

- No harassment, discrimination, or personal attacks
- Assume good intent
- Focus on the code, not the person
- Help newcomers learn

Violations can be reported to conduct@josephas.com.

---

## First-Time Contributors

Look for issues tagged `good first issue`:
- These are well-scoped and have clear acceptance criteria
- We'll provide extra guidance and review

**Ideas for first contributions:**
- Add a new AI provider to `src/main/providers/`
- Improve task categorization in `TaskOutcomes.ts`
- Add tests for routing edge cases
- Improve energy estimation accuracy

---

Thank you for helping make AI development more sustainable!

*Your work costs less of the world.*
