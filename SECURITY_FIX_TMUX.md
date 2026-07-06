# Security Fix: Command Injection Vulnerability in TmuxManager

## Summary

Fixed a critical command injection vulnerability in `/Users/zacharykramer/flowrider2/src/main/TmuxManager.ts` where malicious session names or paths could execute arbitrary system commands.

## Vulnerability Details

### Before (Vulnerable)
```typescript
// String interpolation allowed command injection
this.exec(`${this.tmuxPath} has-session -t "${sessionName}" 2>/dev/null`);
this.exec(`${this.tmuxPath} new-session -d -s "${sessionName}" -c "${resolvedDir}"`);

// Malicious input example:
// sessionName = 'test"; rm -rf /; echo "pwned'
// Would execute: tmux has-session -t "test"; rm -rf /; echo "pwned" 2>/dev/null
```

### After (Secure)
```typescript
// Using spawnSync with array arguments prevents injection
this.execTmux(['has-session', '-t', sessionName]);
this.execTmux(['new-session', '-d', '-s', sessionName, '-c', resolvedDir]);

// Malicious input is now safely treated as a literal string argument
```

## Changes Made

### 1. Replaced String Interpolation with `spawnSync`

Created a new `execTmux()` helper method that uses `spawnSync` with array arguments:

```typescript
private execTmux(args: string[], options: { allowError?: boolean } = {}): string {
  const result = spawnSync(this.tmuxPath, args, {
    encoding: 'utf-8',
    timeout: 5000,
  });

  if (result.error) {
    throw new Error(`Failed to execute tmux: ${result.error.message}`);
  }

  if (!options.allowError && result.status !== 0) {
    const errorMsg = result.stderr?.trim() || result.stdout?.trim() || 'Command failed';
    throw new Error(errorMsg);
  }

  return result.stdout?.trim() || '';
}
```

### 2. Added Session Name Validation

Strict regex validation that only allows alphanumeric characters, dashes, and underscores:

```typescript
private validateSessionName(sessionName: string): void {
  if (!sessionName || typeof sessionName !== 'string') {
    throw new Error('Session name must be a non-empty string');
  }
  if (!SESSION_NAME_REGEX.test(sessionName)) {
    throw new Error(
      `Invalid session name: "${sessionName}". Only alphanumeric, dash, and underscore characters are allowed.`
    );
  }
}
```

### 3. Added Path Validation

Validates that working directories exist and are actual directories:

```typescript
private validateAndResolvePath(workingDir: string): string {
  if (!workingDir || typeof workingDir !== 'string') {
    throw new Error('Working directory must be a non-empty string');
  }

  // Expand ~ to home directory
  const resolvedDir = workingDir.startsWith('~')
    ? workingDir.replace('~', process.env.HOME || '')
    : workingDir;

  // Verify path exists and is a directory
  if (!existsSync(resolvedDir)) {
    throw new Error(`Working directory does not exist: ${resolvedDir}`);
  }

  const stats = statSync(resolvedDir);
  if (!stats.isDirectory()) {
    throw new Error(`Path is not a directory: ${resolvedDir}`);
  }

  return resolvedDir;
}
```

### 4. Updated All Methods

All tmux command executions now use the safe `execTmux()` method:

- ✅ `createSession()` - Uses `execTmux()` with array args
- ✅ `listSessions()` - Uses `execTmux()` with array args
- ✅ `killSession()` - Uses `execTmux()` with array args
- ✅ `sendInput()` - Uses `execTmux()` with array args and `-l` flag for literal input
- ✅ `getOutput()` - Uses `execTmux()` with array args
- ✅ `renameSession()` - Uses `execTmux()` with array args
- ✅ `detectGitRepo()` - Uses `spawnSync()` for git commands with array args

## Attack Vectors Prevented

### 1. Command Injection via Session Names
```typescript
// ❌ BLOCKED: Would have executed arbitrary commands
killSession('test"; rm -rf /; echo "pwned');
killSession('test$(whoami)');
killSession('test`cat /etc/passwd`');
```

### 2. Command Injection via Paths
```typescript
// ❌ BLOCKED: Path validation prevents non-existent or malicious paths
createSession('test', 0, '/nonexistent; rm -rf /');
createSession('test', 0, '$(malicious command)');
```

### 3. Command Injection via User Input
```typescript
// ✅ SAFE: Special characters are treated as literal data
sendInput('session', 'test"; rm -rf /; echo "pwned');
// Sent literally to tmux, not executed
```

## Verification

### 1. TypeScript Compilation
```bash
npx tsc --noEmit --skipLibCheck -p tsconfig.main.json 2>&1 | grep -i "TmuxManager"
# Should show: "No TmuxManager errors found"
```

### 2. Manual Testing
Try to create a session with malicious input:

```typescript
const tm = new TmuxManager();

// This should fail with validation error (not execute commands)
await tm.killSession('test"; echo "PWNED" > /tmp/hacked.txt; echo "');
// Error: Invalid session name: "test"; echo "PWNED" > /tmp/hacked.txt; echo "".
// Only alphanumeric, dash, and underscore characters are allowed.
```

### 3. Check File System Operations
```bash
# Verify spawnSync is being used correctly
grep -n "execTmux\|spawnSync" /Users/zacharykramer/flowrider2/src/main/TmuxManager.ts
```

## Security Best Practices Applied

1. ✅ **Input Validation**: Strict whitelist regex for session names
2. ✅ **Path Validation**: Verify paths exist and are directories
3. ✅ **Safe Command Execution**: Use `spawnSync` with array arguments instead of string interpolation
4. ✅ **Error Handling**: Clear error messages without exposing sensitive information
5. ✅ **Type Safety**: TypeScript type checking for all parameters

## Impact

- **Severity**: CRITICAL
- **CVE**: N/A (internal fix)
- **Affected Versions**: All versions before this fix
- **Fixed In**: Current version

## References

- [Node.js child_process security](https://nodejs.org/api/child_process.html#child_processspawnsynccommand-args-options)
- [OWASP Command Injection](https://owasp.org/www-community/attacks/Command_Injection)
- [CWE-78: OS Command Injection](https://cwe.mitre.org/data/definitions/78.html)

## Author

Security fix applied: 2026-07-06
