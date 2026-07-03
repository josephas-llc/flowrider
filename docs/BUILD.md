# Flowrider Build Guide

## Building macOS DMG Distribution

### Prerequisites
- Node.js 18+
- npm
- macOS (for signing and notarization)

### Quick Build

```bash
# Build unsigned DMG (development/testing)
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dist:mac
```

This creates:
- `release/Flowrider-{version}-arm64.dmg` - Apple Silicon
- `release/Flowrider-{version}.dmg` - Intel x64

### Build Process Details

1. **TypeScript Compilation** (`npm run build:main`)
   - Compiles `src/main/*.ts` to `dist/main/`

2. **Vite Bundle** (`npm run build:renderer`)
   - Bundles React + Three.js app to `dist/renderer/`

3. **Electron Builder** (`electron-builder --mac`)
   - Packages app with native modules (better-sqlite3, node-pty)
   - Creates DMG with drag-to-install interface

### Code Signing (Production)

For distribution outside your machine, you need:
1. Apple Developer ID certificate
2. Notarization with Apple

```bash
# With signing (requires Developer ID)
CSC_LINK=/path/to/cert.p12 \
CSC_KEY_PASSWORD=password \
npm run dist:mac
```

### Notes

- **TLS Bypass**: `NODE_TLS_REJECT_UNAUTHORIZED=0` may be needed on networks with SSL inspection
- **Native Modules**: better-sqlite3 and node-pty are rebuilt for each architecture
- **Universal Binary**: Not currently built; separate arm64/x64 DMGs are created

### Output Structure

```
release/
├── Flowrider-0.1.0-arm64.dmg      # Apple Silicon (~144MB)
├── Flowrider-0.1.0-arm64.dmg.blockmap
├── Flowrider-0.1.0.dmg            # Intel x64 (~146MB)
├── Flowrider-0.1.0.dmg.blockmap
├── mac-arm64/                     # Unpacked app (arm64)
│   └── Flowrider.app/
└── mac/                           # Unpacked app (x64)
    └── Flowrider.app/
```

### Troubleshooting

**TLS Certificate Errors**
```bash
NODE_TLS_REJECT_UNAUTHORIZED=0 npm run dist:mac
```

**Missing Dependencies**
```bash
npm install
npm run dist:mac
```

**Code Signing Skipped**
Normal for development. For production, set up Apple Developer certificates.

---

*Built: 2026-07-03*
*Version: 0.1.0*
