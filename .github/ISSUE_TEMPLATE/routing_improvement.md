---
name: Zoix Routing Improvement
about: Improve Zoix routing intelligence (HIGH IMPACT)
title: '[Zoix] '
labels: zoix, high-impact
assignees: ''
---

## Routing Scenario

**Current behavior:**
When [describe task type], Zoix currently routes to [model].

**Proposed behavior:**
It should route to [model] because [reasoning].

## Task Category
- [ ] Code generation
- [ ] Debugging
- [ ] Refactoring
- [ ] Testing
- [ ] Documentation
- [ ] Explanation/Q&A
- [ ] Other: ___________

## Evidence
How do you know the current routing is suboptimal?

- [ ] I tested both models and [cheaper model] succeeded
- [ ] Task complexity analysis suggests [model] is sufficient
- [ ] Cost/token data shows [evidence]
- [ ] Other: ___________

## Estimated Impact
- Token savings: [e.g., 50% for this task type]
- Energy savings: [e.g., local model vs cloud]
- Frequency: [e.g., 10% of all tasks are this type]

## Proposed Implementation
(Optional but helpful!)

```typescript
// Example: Add to TaskOutcomes.ts or ZoixIntelligence.ts
if (taskCategory === 'documentation' && promptLength < 500) {
  // Route to cheaper model
  return 'claude-haiku';
}
```

## Files to Modify
- [ ] `src/main/ai-core/TaskOutcomes.ts` - Task categorization
- [ ] `src/main/ai-core/ZoixIntelligence.ts` - Routing logic
- [ ] `src/main/AIService.ts` - Provider selection
- [ ] Other: ___________

## Willing to Implement?
- [ ] Yes, I'll submit a PR
- [ ] Yes, with guidance
- [ ] No, just reporting

---

**Note:** Zoix routing improvements are HIGH IMPACT. Every improvement helps reduce energy usage for all Flowrider users. We prioritize these issues.
