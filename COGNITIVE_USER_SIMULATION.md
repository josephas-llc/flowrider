# Flowrider Cognitive User Simulation

## Purpose
This document simulates how different types of human users would experience Flowrider's UI,
based on cognitive psychology research. Each "user type" has different perception patterns,
patience levels, learning styles, and expectations.

---

## User Type Definitions

### 1. VISUAL-SPATIAL LEARNER ("Maya")
**Profile:** Designer, thinks in pictures, needs to see relationships
- **Attention Pattern:** Scans for shapes, colors, visual hierarchy
- **Patience:** Medium (will explore if visual cues are clear)
- **Pain Points:** Text-heavy interfaces, hidden features, abstract concepts
- **Learning Style:** Show me, don't tell me

### 2. ANALYTICAL-SEQUENTIAL ("David")
**Profile:** Backend developer, methodical, reads documentation
- **Attention Pattern:** Linear, top-to-bottom, reads labels
- **Patience:** High (will read tooltips, explore menus)
- **Pain Points:** Ambiguous controls, inconsistent behavior, no feedback
- **Learning Style:** Give me a manual and let me study it

### 3. IMPATIENT-INTUITIVE ("Alex")
**Profile:** Startup founder, 50+ tabs open, wants results NOW
- **Attention Pattern:** Rapid scanning, seeks obvious primary action
- **Patience:** Very Low (<5 seconds before frustration)
- **Pain Points:** ANY friction, unclear next steps, loading states
- **Learning Style:** I'll figure it out or leave

### 4. TECH-ANXIOUS NOVICE ("Jordan")
**Profile:** New to coding, overwhelmed by terminals
- **Attention Pattern:** Cautious, afraid to break things
- **Patience:** Moderate (if they feel safe)
- **Pain Points:** Jargon, too many options, no undo
- **Learning Style:** Hand-hold me through each step

### 5. POWER USER ("Sam")
**Profile:** Uses 10+ dev tools daily, keyboard-first
- **Attention Pattern:** Seeks shortcuts, configurability
- **Patience:** Low for basic tasks, high for power features
- **Pain Points:** Forced mouse usage, no customization, slow operations
- **Learning Style:** Give me the keyboard shortcuts and get out of my way

---

## Simulation: First 30 Seconds in Flowrider

### What Each User Sees on Launch

**Current Flowrider UI Elements (from UX_AUDIT.md):**
- Header: Session slots (1-8), ZOIX indicator, mic, demo button, tabs, cost tracker, settings
- Main: Terminal window (may be empty or have session)
- Bottom: Minimap, demo button (duplicate?)
- Right: Session panel with file browser, AI feedback

---

### MAYA (Visual-Spatial) - First 30 Seconds

```
Second 0-5:   Eyes scan entire screen for visual hierarchy
              PROBLEM: No obvious focal point. Too many elements compete.

Second 5-10:  Looks for color coding or spatial grouping
              PROBLEM: Session slots are numbered but meaning unclear.
              What's 1 vs 2 vs 3? Are they active? Empty?

Second 10-15: Tries to understand the purple ZOIX indicator
              PROBLEM: "ZOIX" means nothing visually. Is it clickable?

Second 15-20: Eyes drawn to largest element (terminal area)
              PROBLEM: Terminal is blank or shows cryptic text.
              No visual representation of "what's happening"

Second 20-30: Looks for a "Start" or "New" button
              PROBLEM: "+ New Session" exists but competes with 8 other things

RESULT: Confused. Doesn't know what to do first.
        Would benefit from: Visual onboarding, clear focal point, color-coded states
```

### DAVID (Analytical) - First 30 Seconds

```
Second 0-5:   Reads header left-to-right looking for menu structure
              OK: Sees tabs (Dashboard, Projects, Settings)

Second 5-15:  Looks for documentation or help
              PROBLEM: Where's the "?" or "Help" link?

Second 15-25: Tries to understand session slot numbering
              OBSERVES: Numbers 1-8, some may have colors
              WONDERS: What do these numbers mean? How do I start one?

Second 25-30: Would click a session slot to see what happens
              EXPECTATION: A dropdown or modal explaining options

RESULT: Mildly confused but willing to explore.
        Would benefit from: Tooltips, documentation link, consistent behavior
```

### ALEX (Impatient) - First 30 Seconds

```
Second 0-3:   "Where's the main action button?"
              Scans for: Big button, obvious CTA, something that screams "START"
              PROBLEM: No single obvious action

Second 3-8:   Sees "+ New Session" - might click it
              EXPECTATION: One click and I'm coding
              REALITY: ???

Second 8-15:  If not immediately working, looks for keyboard shortcut
              PROBLEM: No visible shortcut hints

Second 15-20: Frustrated. Opens Activity Monitor to check if app froze.

Second 20-30: Either gives up OR rage-clicks random things

RESULT: Abandoned or frustrated.
        Would benefit from: ONE obvious action, immediate feedback, keyboard shortcuts
```

### JORDAN (Novice) - First 30 Seconds

```
Second 0-10:  Overwhelmed by the interface
              "What is this? It looks like hacker stuff"
              SEES: Terminal, numbers, ZOIX, unfamiliar icons

Second 10-20: Afraid to click anything
              "What if I break something?"
              Looks for something safe like "Help" or "Tutorial"

Second 20-30: Might notice "Demo" button - that sounds safe!
              Clicks it to see what this thing does

RESULT: Demo mode might help, but needs explicit guidance.
        Would benefit from: Onboarding wizard, "safe mode", undo capability
```

### SAM (Power User) - First 30 Seconds

```
Second 0-3:   Hands already on keyboard
              Tries: Cmd+N, Cmd+T, Cmd+K (common shortcuts)

Second 3-10:  Looks for keyboard shortcut reference
              PROBLEM: None visible
              Tries: "?" key (nothing happens?)

Second 10-20: Notices session slots 1-8
              Tries: Press "1" to select first slot
              EXPECTS: Immediate response

Second 20-30: Looks for config/preferences to customize
              FINDS: Settings tab - might explore

RESULT: Functional but unimpressed.
        Would benefit from: Visible shortcut hints, power-user documentation
```

---

## Aggregate Pain Points

| Issue | Maya | David | Alex | Jordan | Sam | Priority |
|-------|------|-------|------|--------|-----|----------|
| No clear primary action | HIGH | MED | CRITICAL | HIGH | MED | **P0** |
| Session state unclear | HIGH | HIGH | HIGH | MED | MED | **P0** |
| Too many UI elements | HIGH | LOW | HIGH | HIGH | LOW | **P1** |
| No keyboard shortcuts visible | LOW | MED | HIGH | LOW | HIGH | **P1** |
| No onboarding | HIGH | MED | LOW | CRITICAL | LOW | **P1** |
| Terminal is cryptic | HIGH | LOW | MED | HIGH | LOW | **P2** |
| ZOIX meaning unclear | HIGH | MED | MED | HIGH | LOW | **P2** |

---

## Recommendations by Priority

### P0 - Critical (Do First)

1. **Single Primary Action**
   - Make "+ New Session" 3x larger, different color, center-bottom position
   - Or: Auto-create a session when app opens for first time

2. **Session State Visual Language**
   - Empty slot: Gray outline only
   - Active (AI working): Animated pulse
   - Waiting (needs input): Amber glow
   - Error: Red border
   - Done: Green checkmark

### P1 - Important

3. **Reduce Visual Noise**
   - Hide: ZOIX indicator, minimap, cost tracker, demo button (until relevant)
   - Show: Only session slots and terminal

4. **Keyboard Shortcut Hints**
   - Show "Cmd+N: New Session" on empty state
   - "?" key shows shortcut overlay
   - Numbers 1-8 select sessions (show this on hover)

5. **First-Time Onboarding**
   - 3-step wizard: "Let's start your first AI session"
   - Step 1: Pick a project folder
   - Step 2: Choose AI (Claude default)
   - Step 3: "Start" - immediate terminal action

### P2 - Nice to Have

6. **Visual Session Summary**
   - Each session slot shows: Project name, AI status, last activity

7. **ZOIX Explanation**
   - Only show ZOIX after 5+ sessions
   - Tooltip: "ZOIX learns your patterns to make suggestions"

---

## The 30-Second Test (Success Criteria)

A new user should be able to:
1. Open Flowrider (0-2 seconds)
2. Understand "I need to create a session" (2-5 seconds)
3. Click ONE obvious button (5-10 seconds)
4. See a terminal with AI ready (10-20 seconds)
5. Type a command and see a response (20-30 seconds)

**Current Reality:** Most users stall at step 2-3.

---

## Implementation Checklist

- [ ] Create "empty state" design with single obvious CTA
- [ ] Implement session state visual indicators
- [ ] Add keyboard shortcut hints to session slots
- [ ] Build 3-step onboarding wizard
- [ ] Hide advanced features until needed (progressive disclosure)
- [ ] User test with ONE real person per cognitive type

---

*This simulation was created to understand human perception patterns
and bridge the gap between AI-logical and human-visual thinking.*
