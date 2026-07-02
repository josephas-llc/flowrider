# GitHub Automation Stack for Node.js Projects

A complete guide to setting up free CI/CD automation for your GitHub projects.

## What You Get

| Tool | Cost | Purpose |
|------|------|---------|
| **GitHub Actions CI** | Free | Runs tests on every push/PR |
| **TypeScript Check** | Free | Catches type errors before merge |
| **Test Coverage** | Free | Tracks code coverage with Codecov |
| **E2E Tests** | Free | Playwright browser testing |
| **Dependabot** | Free | Auto-updates dependencies weekly |
| **CodeQL** | Free | Security vulnerability scanning |
| **Auto-Release** | Free | Builds artifacts on release |

---

## Quick Setup

### 1. Create `.github/workflows/test.yml`

```yaml
name: Tests

on:
  push:
    branches: [main, master]
  pull_request:
    branches: [main, master]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: TypeScript check
        run: npx tsc --noEmit

  test:
    runs-on: ubuntu-latest
    needs: lint

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests with coverage
        run: npm run test:coverage

      - name: Upload coverage reports
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info
          fail_ci_if_error: false
        env:
          CODECOV_TOKEN: ${{ secrets.CODECOV_TOKEN }}

      - name: Build project
        run: npm run build

  e2e:
    runs-on: ubuntu-latest
    needs: test

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps chromium

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

### 2. Create `.github/workflows/release.yml`

```yaml
name: Release

on:
  release:
    types: [created]

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test

      - name: Build project
        run: npm run build

      - name: Upload Release Assets
        uses: softprops/action-gh-release@v1
        with:
          files: |
            dist/*
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### 3. Create `.github/dependabot.yml`

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    groups:
      # Group minor/patch updates together to reduce PR noise
      dependencies:
        patterns:
          - "*"
        update-types:
          - "minor"
          - "patch"
    commit-message:
      prefix: "deps"
    labels:
      - "dependencies"

  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    commit-message:
      prefix: "ci"
    labels:
      - "ci"
```

---

## Customization Options

### For Different Languages

**Python:**
```yaml
- name: Setup Python
  uses: actions/setup-python@v5
  with:
    python-version: '3.11'
    cache: 'pip'

- name: Install dependencies
  run: pip install -r requirements.txt

- name: Run tests
  run: pytest --cov
```

**Go:**
```yaml
- name: Setup Go
  uses: actions/setup-go@v5
  with:
    go-version: '1.21'

- name: Run tests
  run: go test ./...
```

**Rust:**
```yaml
- name: Setup Rust
  uses: dtolnay/rust-toolchain@stable

- name: Run tests
  run: cargo test
```

### For Different Platforms

**macOS build:**
```yaml
jobs:
  build-mac:
    runs-on: macos-latest
```

**Windows build:**
```yaml
jobs:
  build-windows:
    runs-on: windows-latest
```

**Multi-platform matrix:**
```yaml
jobs:
  build:
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]
    runs-on: ${{ matrix.os }}
```

### For Electron Apps

```yaml
- name: Build macOS DMG
  run: npm run dist:mac
  env:
    GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- name: Upload Release Assets
  uses: softprops/action-gh-release@v1
  with:
    files: |
      release/*.dmg
      release/*.zip
      release/*.exe
```

---

## Required package.json Scripts

Add these to your `package.json`:

```json
{
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test"
  }
}
```

---

## Optional: Add Coverage Badge

1. Sign up at [codecov.io](https://codecov.io) with your GitHub account
2. Add your repo
3. Copy the `CODECOV_TOKEN` to your repo's Settings > Secrets > Actions
4. Add badge to README:

```markdown
[![codecov](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/YOUR_REPO)
```

---

## Optional: Enable CodeQL

Go to your repo's **Security** tab > **Code scanning** > **Set up code scanning** > **Configure CodeQL alerts**

Or create `.github/workflows/codeql.yml`:

```yaml
name: CodeQL

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  analyze:
    runs-on: ubuntu-latest
    permissions:
      security-events: write

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Initialize CodeQL
        uses: github/codeql-action/init@v3
        with:
          languages: javascript-typescript

      - name: Autobuild
        uses: github/codeql-action/autobuild@v3

      - name: Perform CodeQL Analysis
        uses: github/codeql-action/analyze@v3
```

---

## Troubleshooting

### Push fails with "workflow scope" error

Run this to add the workflow scope to your GitHub CLI:
```bash
gh auth refresh -h github.com -s workflow
```

Then follow the device flow authentication at the URL shown.

### Tests pass locally but fail in CI

- Check Node.js version matches
- Ensure all dependencies are in `package.json` (not just globally installed)
- Check for OS-specific code paths

### Dependabot PRs failing

- Review the PR to see what changed
- Run tests locally with the updated dependency
- If it's a breaking change, pin the version in `package.json`

---

## Claude Code Integration

To have Claude Code set this up for you, just say:

> "Set up GitHub Actions CI/CD with tests, Dependabot, and auto-release"

Claude Code will create all the necessary files and push them to your repo.

---

## License

MIT - Use this guide freely for any project.
