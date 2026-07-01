# Flowrider - Claude Code Instructions

## Project Overview
Flowrider is an Electron app for orchestrating multiple AI terminal sessions using a 3D icosahedron interface (20 faces = 20 sessions).

## Architecture
- **Main Process**: Electron main (`src/main/`) - handles IPC, tmux, database
- **Renderer Process**: React + Three.js (`src/renderer/`) - 3D UI, state management
- **State**: Zustand store (`src/renderer/store.ts`)
- **Tests**: Vitest unit tests + Playwright E2E

## Development Commands
```bash
npm run dev          # Start dev server + Electron
npm run test         # Run unit tests (Vitest)
npm run test:e2e     # Run E2E tests (Playwright)
npm run test:all     # Run all tests
npm run build        # Build for production
npm run dist:mac     # Build macOS DMG
```

## Testing Requirements (ALWAYS DO THIS)

### Before Any PR or Major Change:
1. **Run unit tests**: `npm run test`
2. **Run E2E tests**: `npm run test:e2e` (if UI changes)
3. **Build check**: `npm run build` (verify no TypeScript errors)

### GitHub Actions CI/CD
Tests run automatically on GitHub via `.github/workflows/test.yml`:
- **On every push** to main/master
- **On every pull request** to main/master
- Unit tests run first, then E2E tests
- Playwright reports are saved as artifacts for 30 days

### Test Coverage Areas:
- **Store tests** (`src/renderer/store.test.ts`): Session management, projects, LEO mode
- **Component tests** (`src/renderer/components/*.test.tsx`): UI components
- **E2E tests** (`e2e/`): Full user flows, accessibility

### When Adding New Features:
1. Add unit tests for new store actions
2. Add component tests for new React components
3. Add E2E tests for new user flows
4. Update this file if architecture changes

## Common Patterns

### React State Management
- Use Zustand for global state
- Reset local state when props change (see SessionPanel useEffect pattern)
- Normalize backend data before using in frontend

### IPC Communication
- Always handle errors gracefully
- Return `{ success: boolean, data?: T, error?: string }`
- Use defensive null checks for optional data

## Known Issues / Gotchas
- Local React state must be reset when switching faces (useEffect with selectedFace dependency)
- Backend may return different field names (e.g., `averageConfidence` vs `avgConfidence`)
- Three.js canvas requires proper cleanup on unmount

## File Structure
```
src/
├── main/           # Electron main process
│   ├── main.ts     # Entry point
│   ├── preload.ts  # IPC bridge
│   └── services/   # Backend services
├── renderer/       # React frontend
│   ├── App.tsx     # Main app
│   ├── store.ts    # Zustand state
│   ├── components/ # React components
│   └── hooks/      # Custom hooks
e2e/                # Playwright E2E tests
```
