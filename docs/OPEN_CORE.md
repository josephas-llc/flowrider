# Flowrider Open Core Model

## TL;DR

| Component | License | You Can... |
|-----------|---------|------------|
| **Zoix Core** | MIT | Use anywhere, fork, sell, modify, no restrictions |
| **Flowrider App** | MIT | Self-host, modify, use commercially |
| **Flowrider Pro** | Commercial | Purchase for enterprise features |

## Why Open Core?

### The Mission

**Reduce the energy footprint of AI usage worldwide.**

Every AI call has a carbon cost. A complex task routed to Claude Opus when Haiku would suffice wastes energy. Multiply by millions of developers, and we're talking real environmental impact.

**Smart routing = Less waste = Better world.**

### The Problem with Pure Open Source

We love open source. But:
- Maintainers burn out without funding
- Enterprise adoption requires support/SLAs
- Sustained development needs sustainable revenue

### The Problem with Pure Commercial

We could keep everything proprietary. But:
- Limited adoption = Limited impact
- Developers can't verify our routing claims
- No community contributions to improve routing

### The Solution: Open Core

**Open source the impact. Commercialize the convenience.**

## What's Open (MIT License)

Everything in these directories is fully MIT licensed:

```
src/main/ai-core/           # Zoix brain
├── TaskOutcomes.ts         # Feedback loop & learning
├── ZoixIntelligence.ts     # Routing decisions
├── Memory.ts               # Pattern storage
├── SkillTracker.ts         # Progression tracking
└── *.ts                    # All learning components

src/main/providers/         # Provider abstractions
├── Provider.ts             # Interface for any AI
└── [future providers]

src/main/AIService.ts       # Unified AI calling
```

**You can:**
- Use Zoix in your own products (commercial or not)
- Fork and modify the routing algorithms
- Build competing products (we hope you won't, but you can)
- Self-host everything with zero payment to us

**We ask (but don't require):**
- Attribution: "Powered by Zoix" or link back
- Contribute improvements upstream
- Share your energy savings data (anonymized)

## What's Commercial (Flowrider Pro)

Some features are only in the paid version:

| Feature | Why Commercial |
|---------|---------------|
| **LEO Mode** (400 agents) | Enterprise scale, requires support |
| **Team Management** | Multi-user = complexity = support |
| **Enterprise SSO** | Security compliance requires commitment |
| **Hosted Zoix API** | Infrastructure costs money |
| **Priority Support** | Our time has value |
| **Custom Routing Models** | Consulting/integration work |

**Pricing:** Contact hello@josephas.com

## For Companies

### Using Zoix in Your Product

**Go for it.** MIT license means:
- No royalties
- No permission needed
- No usage reporting required

We'd love to hear about it, but you don't have to tell us.

### Using Flowrider for Your Team

**Self-host free** with the open source version, or **purchase Pro** for:
- Support SLAs
- Team features
- Enterprise security

### Concerned About License Changes?

We commit to:
1. **Never relicense Zoix core** - MIT forever for all current code
2. **FOSS exception** - If we ever go proprietary, all existing code stays MIT
3. **Community fork rights** - You can always fork if we go evil

## For Contributors

### What Happens to My Contributions?

- **Zoix Core contributions**: Stay MIT forever, you retain copyright
- **Flowrider UI contributions**: MIT, but we may include in Pro version
- **You're credited**: In release notes, README, and impact reports

### Contributor License Agreement (CLA)

We use a simple CLA:
- You certify you wrote the code (or have rights to it)
- You grant us permission to include it (MIT terms)
- You retain your copyright

This lets us:
- Include contributions in Pro without legal issues
- Defend the project legally if needed

## Impact Tracking

We track (anonymized, aggregated):
- Total tasks routed by Zoix (open source + hosted)
- Estimated energy saved vs. baseline
- Tokens saved via smart routing

**Public dashboard coming soon** showing collective impact.

## FAQ

**Q: Can I use Zoix in a closed-source product?**
A: Yes. MIT allows this.

**Q: Can I sell a product built on Zoix?**
A: Yes. MIT allows this.

**Q: Can I remove the Zoix branding?**
A: Yes, but we'd appreciate attribution.

**Q: What if you get acquired and go evil?**
A: All current code stays MIT. Fork and continue.

**Q: How do I get Flowrider Pro?**
A: Contact hello@josephas.com

**Q: Can I contribute and then use my contribution commercially?**
A: Yes! You retain copyright on your contributions.

---

## The Big Picture

```
More developers using Zoix
        ↓
More smart routing decisions
        ↓
Less wasted compute
        ↓
Lower energy consumption
        ↓
Better for the planet
```

That's why we open source the core. Impact > Revenue.

Flowrider Pro funds continued development so we can keep improving Zoix.

**Your work costs less of the world.**
