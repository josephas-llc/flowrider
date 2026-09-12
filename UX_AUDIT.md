# Flowrider UX Audit

## The Core Problem

**Flowrider is feature-rich but workflow-poor.**

The app has sophisticated features (ZOIX intelligence, demo mode, session grid, minimap, voice control, etc.) but the basic workflow of "run 4-8 coding sessions simultaneously" is not intuitive.

## What a User Should Be Able to Do (in under 30 seconds)

1. Open Flowrider
2. See their projects
3. Start a coding session on a project
4. See what Claude is doing
5. Switch between sessions
6. Know when a session needs attention

**Current reality:** Users don't know what to click first. Too many UI elements compete for attention.

## Specific UX Problems

### 1. Session Creation is Confusing
- "+ New Session" button exists but what happens after clicking?
- Which project? Which AI? What directory?
- Too many decisions before work can begin

### 2. Session State is Unclear
- The numbered slots (1-8) don't communicate:
  - Is this session active?
  - Is Claude working or waiting?
  - Does it need my input?
  - What project is this?
- Colors exist but meaning isn't obvious

### 3. Terminal Focus Issues
- When I click a session, is the terminal ready for input?
- Can I type? Is Claude still outputting?
- Switching sessions feels disconnected

### 4. Information Overload
- Header has: session slots, ZOIX indicator, mic, demo button, tabs, cost tracker, settings
- Bottom has: minimap, demo button (duplicate?)
- Right side has: session panel with file browser, AI feedback
- Too much visual noise

### 5. No Clear "Home Base"
- Where do I look first?
- What's the primary action?
- What's secondary/optional?

## What We Need (Expert Input)

### UX/Workflow Expert
- Define the ONE primary workflow
- Reduce cognitive load
- Establish clear visual hierarchy
- Create onboarding flow

### Game UX Expert
- Session switching should feel like hotkey-based RTS
- Attention/notification system (which session needs me?)
- Quick mental model for 4-8 concurrent "units"

### Industrial Psychologist
- Task switching cognitive load
- Attention management
- Error recovery
- Mental models for parallel work

### Average Users (5 testers)
- Watch them try to use it
- Note where they get stuck
- What do they click first?
- What confuses them?

## Proposed Simplification (v0.3 "Usable")

### Phase 1: Strip to Core
1. Remove everything except:
   - Session slots (simplified)
   - Terminal
   - One-click session creation
2. Make session state OBVIOUS (working/waiting/error/done)
3. Keyboard-first navigation (1-8 to switch)

### Phase 2: Add Back Smartly
1. ZOIX only shows when relevant
2. Minimap only for 4+ sessions
3. File browser in a collapsible panel
4. Settings in a modal, not a tab

### Phase 3: Polish
1. Onboarding wizard (first-time only)
2. Keyboard shortcut overlay (?)
3. Demo mode for investors

## Immediate Actions

1. [ ] Record a 5-minute video of current UX problems
2. [ ] Create wireframe of simplified UI
3. [ ] Test with 1 person who's never seen it
4. [ ] List every UI element and justify its existence
5. [ ] Define the "30-second test" success criteria

## The Goal

A developer should be able to:
- Open Flowrider
- Start 4 sessions on 4 projects
- See all of them working
- Switch to whichever needs attention
- **Without reading any documentation**

---

*Written after user feedback: "I still am having trouble running terminal/coding sessions on Flowrider. It just doesn't seem easy enough to know what to do right now."*
