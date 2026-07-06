# Cursor IDE Integration - Visual Guide

## Button Location

The "Open in Cursor" button appears in the SessionPanel, right below the working directory information.

## Visual Design

The button features:
- **Gradient background**: Purple gradient from `#7c3aed` to `#6366f1`
- **Icon**: Document/code icon on the left
- **Text**: "Open in Cursor" or "Opening..." when active
- **Shadow**: Subtle purple glow for visual depth
- **Hover effect**: Slight elevation and increased shadow
- **Disabled state**: Reduced opacity when opening

## UI States

### 1. Normal State
```
┌─────────────────────────────────────┐
│ Session Panel                       │
├─────────────────────────────────────┤
│ Face: #01                           │
│ Name: my-project                    │
│ Tmux: my-project                    │
│ Directory: /Users/dev/my-project    │
│                                     │
│ ┌───────────────────────────────┐  │
│ │  📄 Open in Cursor            │  │  <- Button appears here
│ └───────────────────────────────┘  │
│                                     │
│ Notes:                              │
│ ┌─────────────────────────────────┐│
│ │ Working on feature X...         ││
│ └─────────────────────────────────┘│
└─────────────────────────────────────┘
```

### 2. Loading State
```
│ ┌───────────────────────────────┐  │
│ │  📄 Opening...                │  │  <- Disabled with reduced opacity
│ └───────────────────────────────┘  │
```

### 3. Hidden State (Cursor not installed)
```
│ Directory: /Users/dev/my-project    │
│                                     │  <- Button doesn't appear
│ Notes:                              │
```

## Error Messages

If Cursor CLI is not installed, the user sees an alert:

```
┌────────────────────────────────────────────────────────────┐
│  Failed to open Cursor. Make sure Cursor CLI is installed  │
│  (Cmd+Shift+P -> "Install cursor command" in Cursor IDE)   │
│                                                             │
│                          [ OK ]                             │
└────────────────────────────────────────────────────────────┘
```

## User Flow

1. **User creates a session** with a working directory
2. **Button appears** if Cursor CLI is installed
3. **User clicks button**
4. **Button shows "Opening..."** while launching
5. **Cursor IDE opens** with the directory
6. **Button returns to normal** state

## Integration Points

The button is positioned:
- After the "Directory" info row
- Before the "Notes" textarea
- Within the session info section (when tmux session exists)

## Styling Details

```css
background: linear-gradient(135deg, #7c3aed 0%, #6366f1 100%)
border: none
border-radius: 6px
color: #fff
font-size: 12px
font-weight: 500
padding: 6px 12px
box-shadow: 0 2px 8px rgba(124, 58, 237, 0.3)

/* Hover */
transform: translateY(-1px)
box-shadow: 0 4px 12px rgba(124, 58, 237, 0.4)

/* Disabled */
opacity: 0.6
cursor: not-allowed
```
