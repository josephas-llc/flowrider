# Flowrider Game UX Research

Research compiled from 5 expert agent analyses of modern video game UI/UX design patterns. This informs v0.3.0+ GUI improvements.

## Executive Summary

Flowrider's multi-session AI orchestration UI can benefit significantly from patterns established in:
- **RTS Games** (StarCraft, Age of Empires): Multi-unit selection, control groups
- **Action RPGs** (Diablo 4, Hades): Status visualization, attention feedback
- **Tactical Games** (XCOM, Stellaris): Progress bars, information density
- **Modern Shooters** (Valorant, Apex): Minimal HUDs, contextual UI

---

## 1. Color Palette (Cyberpunk/Sci-Fi)

### Recommended Palette

```css
/* Background Layers (Dark to Light) */
--bg-deep:      #0B0C10;    /* Deepest background */
--bg-panel:     #1F2833;    /* Panel backgrounds */
--bg-elevated:  #304151;    /* Elevated surfaces */

/* Text Hierarchy */
--text-primary:   #E0E0E0;  /* Main text */
--text-secondary: #B0B0B0;  /* Subdued text */
--text-muted:     #666666;  /* Disabled/hints */

/* Session Status Colors */
--status-running:   #00FF7F;  /* Active session (spring green) */
--status-idle:      #66FCF1;  /* Idle/waiting (cyan) */
--status-warning:   #FFEB0B;  /* Needs attention (yellow) */
--status-error:     #FF2E63;  /* Error/failed (hot pink) */
--status-thinking:  #05D9E8;  /* AI processing (electric blue) */

/* Interactive Accents */
--accent-primary:   #66FCF1;  /* Main accent (cyan) */
--accent-secondary: #FF2E63;  /* Contrast accent (pink) */
--accent-ai:        #BF00FF;  /* AI-specific (purple) */
--accent-glow:      rgba(102, 252, 241, 0.3);  /* Glow effect */
```

### Color Usage Guidelines
- **80% of screen**: Dark backgrounds (#0B0C10 to #1F2833)
- **15%**: Status/accent colors for active elements
- **5%**: Bright highlights for critical alerts

---

## 2. Animation Timing Standards

### Game-Proven Timing Values

| Animation | Duration | Easing | Source |
|-----------|----------|--------|--------|
| Button hover | 100-150ms | ease-out | Valorant |
| Button press | 80-100ms | ease-in-out | Hades |
| Panel slide | 200-240ms | cubic-bezier(0.16, 1, 0.3, 1) | Persona 5 |
| Session switch | 150ms | ease-out | StarCraft |
| Notification in | 200ms | spring | Diablo 4 |
| Notification out | 150ms | ease-in | Diablo 4 |
| Glow pulse | 1.5-2s | sine | XCOM |
| Progress bar | 300ms | linear | General |

### CSS Implementation

```css
:root {
  --anim-instant: 80ms;
  --anim-fast: 150ms;
  --anim-normal: 200ms;
  --anim-slow: 300ms;

  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-spring: cubic-bezier(0.175, 0.885, 0.32, 1.275);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

---

## 3. Multi-Unit Management (RTS Patterns)

### Control Groups (StarCraft-style)

**Implementation**: Ctrl+1-9 to save session groups, 1-9 to recall

```
Ctrl+1  → Save current session selection to group 1
1       → Select all sessions in group 1
1+1     → Double-tap to center view on group
```

### Selection Patterns

| Action | Shortcut | Behavior |
|--------|----------|----------|
| Select single | Click | Select one session |
| Add to selection | Shift+Click | Add session to current selection |
| Box select | Drag | Select all sessions in box |
| Select all | Ctrl+A | Select all 20 sessions |
| Deselect all | Escape | Clear selection |

### Session Grid Visual Hierarchy

```
┌─────────────────────────┐
│  [1]  Status Indicator  │  ← Status dot (green/yellow/red)
│                         │
│       SESSION #         │  ← Large, prominent number
│                         │
│  ████████░░░░░  65%     │  ← Progress bar (if applicable)
│  project-name           │  ← Project name (truncated)
│  2m ago                 │  ← Last activity timestamp
└─────────────────────────┘
```

---

## 4. Attention & Notification System

### Attention Glow Effects (Diablo 4 Style)

**Sessions Needing Attention**:
- Vibrating glow animation (0.5s cycle)
- Color: `#FF6B6B` (soft red)
- Intensity increases with urgency

**New Output Shimmer**:
- Subtle horizontal shimmer sweep (2s)
- Indicates activity without distraction
- Toggleable in settings

### Notification Queue (Hades Style)

```
┌──────────────────────────────────────┐
│ ⚡ Session 3 completed: build task   │  ← Slides in from right
│    3 files changed, 0 errors         │
└──────────────────────────────────────┘
                                    ↑
                            Auto-dismiss: 3s
```

---

## 5. Command Palette Enhancements

### Tab Completion (Shell-style)

```
> ses<TAB>     → session
> session <TAB> → [session 1] [session 2] [session 3]...
> session 3 <TAB> → [attach] [detach] [rename] [delete]
```

### Fuzzy Matching

```
> s3      → Session 3
> proj    → Projects panel
> set     → Settings
> ai cl   → AI: Claude
```

### Category Navigation

| Key | Action |
|-----|--------|
| Tab | Complete/cycle options |
| Ctrl+N/P | Next/prev in list |
| Ctrl+J/K | Same as above (vim) |
| / | Filter by category |
| : | Command mode |

---

## 6. Session Minimap (Optional)

Inspired by: StarCraft minimap, VS Code minimap

### Design

```
┌─────────────┐
│ ● ● ○ ○ ●   │  ← Row of 5 dots per row
│ ○ ○ ● ● ○   │     4 rows = 20 sessions
│ ● ○ ○ ○ ●   │
│ ○ ○ ○ ○ ○   │  ● = Active session
└─────────────┘     ○ = Empty session
```

- Position: Bottom-right corner (toggleable)
- Size: ~80x40px
- Click to select session
- Drag to box-select multiple

---

## 7. Accessibility Features

### Reduce Motion Mode

When enabled:
- Disable all animations
- Instant transitions
- No shimmer/glow effects
- Static UI only

### Colorblind Support

| Mode | Adjustments |
|------|-------------|
| Protanopia | Red → Blue shift |
| Deuteranopia | Green → Purple shift |
| Tritanopia | Blue → Orange shift |

### High Contrast Mode

- Increase border contrast to 3:1 minimum
- Add underlines to clickable elements
- Larger touch targets (44px minimum)

---

## 8. Implementation Priority

### Phase 1 (v0.3.0) - High Impact, Low Risk
- [x] Updated color palette CSS variables
- [x] Animation timing standardization
- [x] Control groups (Ctrl+1-9)
- [ ] Shimmer effect for new output

### Phase 2 (v0.3.1) - Enhanced Interactions
- [ ] Enhanced SessionGrid with progress bars
- [ ] Tab completion in Command Palette
- [ ] Improved keyboard navigation

### Phase 3 (v0.4.0) - Polish
- [ ] Session Minimap (toggleable)
- [ ] Reduce motion accessibility
- [ ] Colorblind mode support

---

## 9. Developer Experience Notes

### Features with Sensible Defaults

| Feature | Default | Why |
|---------|---------|-----|
| Shimmer effects | Subtle (2s, low opacity) | Can be distracting |
| Sound effects | OFF | Developers prefer quiet |
| Hover delay | 100ms (not 150ms) | Faster feels more responsive |
| Minimap | OFF | Screen real estate |
| Glow effects | ON | Easy to toggle off |

### Settings Panel Additions

```typescript
interface FlowriderSettings {
  // Accessibility
  reduceMotion: boolean;        // Default: false
  colorblindMode: 'none' | 'protanopia' | 'deuteranopia' | 'tritanopia';
  highContrast: boolean;        // Default: false

  // Visual Effects
  enableShimmer: boolean;       // Default: true
  enableGlow: boolean;          // Default: true
  animationSpeed: 'instant' | 'fast' | 'normal' | 'slow';

  // Audio
  enableSounds: boolean;        // Default: false
  notificationSound: 'none' | 'subtle' | 'prominent';

  // UI
  showMinimap: boolean;         // Default: false
  compactMode: boolean;         // Default: false
}
```

---

## References

### Games Analyzed
- **Hades** (Supergiant Games) - Microinteractions, menu flow
- **Diablo 4** (Blizzard) - Status visualization, loot shimmer
- **StarCraft II** (Blizzard) - Control groups, minimap
- **Valorant** (Riot) - Minimal HUD, quick responsiveness
- **Persona 5** (Atlus) - Stylish transitions, bold colors
- **XCOM 2** (Firaxis) - Segmented health bars, tactical UI
- **Dead Space** (EA) - Diegetic UI, immersion
- **EVE Online** (CCP) - Information density, multi-window management
- **Stellaris** (Paradox) - Empire management, notifications

### Resources
- [Game UI Database](https://gameuidatabase.com)
- [Interface in Game](https://interfaceingame.com)
- [Material Design Motion](https://m3.material.io/styles/motion)
