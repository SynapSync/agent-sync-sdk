# Sprint 8: Quality & Hardening

**Duration:** 7 days
**Status:** NOT_STARTED
**Dependencies:** Sprint 1-7 (all prior sprints)
**Layer:** All layers (cross-cutting)

---

## Sprint Goal

Audit test coverage across every module, fill gaps in unit tests, build comprehensive integration and E2E test suites, configure CI with coverage thresholds, and ensure the SDK is production-ready. This sprint produces **zero new features** -- it hardens everything built in Sprints 1-7.

---

## Phase 8.1: Unit Test Audit (2 days)

### Task 8.1.1: Audit Coverage for Each Module

- [ ] Run `pnpm vitest run --coverage` and identify modules below target thresholds
- [ ] Generate per-module coverage report
- [ ] Create a gap list: which specific functions, branches, and edge cases are uncovered

### Task 8.1.2: Fill Gaps -- Types & Branded Types

**Files:** `tests/types/branded.test.ts`, `tests/types/result.test.ts`

- [ ] Test all branded type constructors with valid inputs: `agentName('claude-code')`, `cognitiveName('react-19')`, `safeName('my-skill')`, `sourceIdentifier('owner/repo')`
- [ ] Test rejection of invalid inputs:
  - Empty strings
  - Strings with spaces, uppercase, special characters
  - Leading/trailing hyphens
  - Path separators (`/`, `\`, `../`)
  - Extremely long strings (> 255 chars)
- [ ] Test `Result` utilities: `ok()`, `err()`, `unwrap()`, `mapResult()`, `flatMapResult()`
- [ ] Test `unwrap()` throws for `err` results with the original error
- [ ] Test `mapResult()` passes through `err` without calling mapper
- [ ] Test `isOk()` and `isErr()` type guards

```typescript
// tests/types/branded.test.ts
describe('branded types', () => {
  describe('agentName', () => {
    it.each(['claude-code', 'cursor', 'a1', 'my-agent-42'])('accepts valid name: %s', (input) => {
      expect(agentName(input)).toBe(input);
    });

    it.each(['', 'Claude-Code', 'agent name', '-start', 'end-', 'a/b', 'a\\b', '../escape'])('rejects invalid: %s', (input) => {
      expect(() => agentName(input)).toThrow();
    });
  });

  describe('cognitiveName', () => {
    it('rejects names with path separators', () => {
      expect(() => cognitiveName('../escape')).toThrow();
      expect(() => cognitiveName('path/name')).toThrow();
      expect(() => cognitiveName('path\\name')).toThrow();
    });

    it('rejects extremely long names', () => {
      expect(() => cognitiveName('a'.repeat(300))).toThrow();
    });
  });
});
```

### Task 8.1.3: Fill Gaps -- Error Hierarchy

**Files:** `tests/errors/hierarchy.test.ts`, `tests/errors/codes.test.ts`, `tests/errors/serialization.test.ts`

- [ ] Test `instanceof` chains: `ProviderFetchError instanceof ProviderError instanceof CognitError instanceof Error`
- [ ] Test every error class has `code` and `module` properties set correctly
- [ ] Test `toJSON()` produces structured output with `name`, `code`, `module`, `message`, `cause`
- [ ] Test error constructors accept and pass through `cause` (error chaining)
- [ ] Test all error codes are unique across the hierarchy
- [ ] Verify error messages are human-readable (no `[object Object]`)

### Task 8.1.4: Fill Gaps -- Config Resolution

**Files:** `tests/config/resolve.test.ts`, `tests/config/validation.test.ts`

- [ ] Test `resolveConfig()` with no args applies all defaults
- [ ] Test `resolveConfig()` with partial overrides merges correctly (deep merge for `git`, `providers`, `agents`, `telemetry`)
- [ ] Test missing `cwd` falls back to `process.cwd()`
- [ ] Test missing `homeDir` falls back to `os.homedir()`
- [ ] Test custom `fs` adapter is preserved
- [ ] Test GitHub token detection: `GITHUB_TOKEN` -> `GH_TOKEN` -> `gh auth token` -> undefined
- [ ] Test `validateConfig()` rejects invalid `agentsDir` (empty string, `/`)
- [ ] Test config with every field set to non-default values

### Task 8.1.5: Fill Gaps -- EventBus

**Files:** `tests/events/event-bus.test.ts`

- [ ] Test handler ordering: handlers fire in registration order
- [ ] Test multiple listeners on same event all receive payload
- [ ] Test `off()` (returned by `on()`) removes only the specific handler
- [ ] Test `once()` fires exactly once then auto-removes
- [ ] Test emitting event with no listeners does not throw
- [ ] Test re-entrant emit (handler emits another event during handling)
- [ ] Test `createCapturingEventBus()` records timestamp and event type in order

### Task 8.1.6: Fill Gaps -- Agent YAML Validation

**Files:** `tests/agents/registry.test.ts`, `tests/agents/detector.test.ts`, `tests/agents/generated.test.ts`

- [ ] Test `getAll()` returns 39+ agents
- [ ] Test `get('claude-code')` returns correct config with `localRoot: '.claude'`
- [ ] Test `get('nonexistent')` returns undefined
- [ ] Test `isUniversal()`: codex (`.agents` localRoot) returns true, cursor returns false
- [ ] Test `getDir()` resolves correct skill/prompt/rule/agent directories per agent
- [ ] Test `register()` adds runtime agent, rejects duplicate names
- [ ] Test `detectInstalled()` with mock filesystem seeded with agent directories
- [ ] Test compiled agent YAML includes all detection rule types: `homeDir`, `xdgConfig`, `cwdDir`

### Task 8.1.7: Fill Gaps -- Source Parser Edge Cases

**Files:** `tests/source/parser.test.ts`

- [ ] Test all 12 source input patterns:
  - `owner/repo` shorthand
  - `owner/repo/subpath`
  - `owner/repo@nameFilter`
  - `./relative/path`, `/absolute/path`, `.`
  - `https://github.com/o/r`
  - `https://github.com/o/r/tree/main`
  - `https://github.com/o/r/tree/main/skills`
  - `https://docs.example.com/SKILL.md`
  - `https://example.com` (well-known)
- [ ] Test edge cases: trailing slashes, double slashes, empty subpath, empty nameFilter
- [ ] Test rejection of invalid URLs (malformed, missing protocol)
- [ ] Test `ref` extraction from GitHub tree URLs (`/tree/main`, `/tree/v1.0.0`, `/tree/abc123`)

### Task 8.1.8: Fill Gaps -- Provider Matching Priority

**Files:** `tests/providers/registry.test.ts`

- [ ] Test provider priority: GitHub URL matches GitHubProvider before WellKnownProvider
- [ ] Test HuggingFace URL matches HuggingFaceProvider before DirectProvider
- [ ] Test `.md` URL on unknown domain matches MintlifyProvider or DirectProvider (not WellKnown)
- [ ] Test local path matches LocalProvider, not any URL-based provider
- [ ] Test no match returns null

### Task 8.1.9: Fill Gaps -- Installer Cross-Platform

**Files:** `tests/installer/installer.test.ts`, `tests/installer/symlink.test.ts`

- [ ] Test symlink creation on non-universal agent (cursor)
- [ ] Test symlink skip for universal agent (codex with `.agents` localRoot)
- [ ] Test copy fallback when symlink throws EPERM
- [ ] Test ELOOP detection and recovery
- [ ] Test Windows junction type selection (mocked `process.platform`)
- [ ] Test path separator normalization for lock storage
- [ ] Test dry-run mode reports actions without executing
- [ ] Test rollback on partial failure (canonical written, 2nd agent symlink fails)

### Task 8.1.10: Fill Gaps -- Lock Migration

**Files:** `tests/lock/migration.test.ts`

- [ ] Test migration from v3 format (`skills` key, flat names)
- [ ] Test migration from v4 format (`cognitives` key, no category)
- [ ] Test migration preserves all data fields
- [ ] Test migration adds category `'general'` to v4 entries
- [ ] Test migration generates composite keys correctly
- [ ] Test old file name detection: `.skill-lock.json`, `.synk-lock.json`, `synapsync.lock`
- [ ] Test `.bak` backup creation before migration
- [ ] Test corrupted JSON falls back to empty lock with warning
- [ ] Test unknown version number falls back to empty lock

### Task 8.1.11: Fill Gaps -- Operations Edge Cases

**Files:** `tests/operations/*.test.ts`

- [ ] Test all operations with empty lock file
- [ ] Test all operations with corrupted lock file (invalid JSON)
- [ ] Test `add` with source that returns zero cognitives -> `NoCognitivesFoundError`
- [ ] Test `add` with invalid frontmatter -> `ParseError`
- [ ] Test `remove` with cognitive name not in lock -> `notFound`
- [ ] Test `update` when source is no longer available -> error per entry
- [ ] Test `sync` with completely empty filesystem (all entries are missing_files)
- [ ] Test `check` with all-healthy installation
- [ ] Test `init` with name that needs sanitization
- [ ] Test `find` with provider that returns empty

**Verification:**
```bash
pnpm vitest run --coverage
# Check per-module coverage against targets
```

---

## Phase 8.2: Integration Tests (2 days)

### Task 8.2.1: Full Add Flow Integration

**File:** `tests/integration/add-flow.test.ts`

- [ ] Wire real implementations with `createMemoryFs()` and `createCapturingEventBus()`
- [ ] Test: source -> SourceParser -> ProviderRegistry -> DiscoveryService -> Installer -> LockManager
- [ ] Verify canonical directory created at correct path
- [ ] Verify agent symlinks created for each target agent
- [ ] Verify lock entry written with correct fields
- [ ] Verify event sequence: `operation:start` -> `git:clone:start` -> `discovery:start` -> `discovery:found` -> `install:start` -> `install:complete` -> `lock:write` -> `operation:complete`
- [ ] Use fake git client that returns pre-seeded temp directory

```typescript
// tests/integration/add-flow.test.ts
describe('Integration: add flow', () => {
  it('installs from local source with full pipeline', async () => {
    const eventBus = createCapturingEventBus();
    const fs = createMemoryFs({
      '/source/skills/react-19/SKILL.md': '---\nname: React 19\ndescription: React patterns\ncategory: frontend\n---\n# React 19\nContent.',
    });

    const sdk = createAgentSyncSDK({
      cwd: '/project',
      fs,
      telemetry: { enabled: false },
    });

    // Override event bus to capture
    // ...

    const result = await sdk.add('/source', {
      agents: ['claude-code' as AgentType, 'cursor' as AgentType],
      confirmed: true,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.installed).toHaveLength(1);
      expect(result.value.installed[0]!.name).toBe('React 19');
      expect(result.value.installed[0]!.agents).toHaveLength(2);
    }

    // Verify filesystem state
    expect(await fs.exists('/project/.agents/cognit/skills/frontend/react-19/SKILL.md')).toBe(true);
    expect(await fs.exists('/project/.claude/skills/react-19')).toBe(true);
    expect(await fs.exists('/project/.cursor/skills/react-19')).toBe(true);

    // Verify lock file
    const lockContent = await fs.readFile('/project/.agents/cognit/.cognit-lock.json', 'utf-8');
    const lock = JSON.parse(lockContent);
    expect(lock.version).toBe(5);
    expect(lock.entries['skill:frontend:react-19']).toBeDefined();
  });
});
```

### Task 8.2.2: Full Lifecycle Integration

**File:** `tests/integration/lifecycle.test.ts`

- [ ] Test complete lifecycle: `add` -> `list` -> `update` -> `remove`
- [ ] After add: verify `list` returns the cognitive with correct metadata
- [ ] After update check: verify update detection works (change content hash in mock)
- [ ] After remove: verify `list` returns empty, files cleaned up, lock entry removed

```typescript
// tests/integration/lifecycle.test.ts
describe('Integration: full lifecycle', () => {
  it('add -> list -> update -> remove', async () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', fs, telemetry: { enabled: false } });

    // Seed source
    await seedMemoryFs(fs, {
      '/source/skills/my-skill/SKILL.md': '---\nname: My Skill\ndescription: Test\n---\nContent v1',
    });

    // Add
    const addResult = await sdk.add('/source', { agents: ['claude-code' as AgentType], confirmed: true });
    expect(addResult.ok).toBe(true);

    // List
    const listResult = await sdk.list();
    expect(listResult.ok).toBe(true);
    if (listResult.ok) {
      expect(listResult.value.cognitives).toHaveLength(1);
      expect(listResult.value.cognitives[0]!.name).toBe('My Skill');
    }

    // Remove
    const removeResult = await sdk.remove('my-skill');
    expect(removeResult.ok).toBe(true);

    // Verify empty
    const listResult2 = await sdk.list();
    expect(listResult2.ok).toBe(true);
    if (listResult2.ok) {
      expect(listResult2.value.cognitives).toHaveLength(0);
    }
  });
});
```

### Task 8.2.3: Sync Flow Integration

**File:** `tests/integration/sync-flow.test.ts`

- [ ] Install a cognitive normally
- [ ] Corrupt the installation (delete canonical dir, break symlink, modify content)
- [ ] Run `sync` and verify drift detected
- [ ] Run `sync` with `confirmed: true` and verify repairs
- [ ] Verify lock file updated after repair

```typescript
// tests/integration/sync-flow.test.ts
describe('Integration: sync flow', () => {
  it('detects and fixes broken symlink', async () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', fs, telemetry: { enabled: false } });

    // Install
    await seedAndInstall(sdk, fs, '/source');

    // Break canonical dir
    await fs.rm('/project/.agents/cognit/skills/general/test-skill', { recursive: true });

    // Sync detect
    const syncResult = await sdk.sync({ dryRun: true });
    expect(syncResult.ok).toBe(true);
    if (syncResult.ok) {
      expect(syncResult.value.issues.length).toBeGreaterThan(0);
      expect(syncResult.value.issues[0]!.type).toBe('missing_files');
    }
  });

  it('detects content hash mismatch', async () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', fs, telemetry: { enabled: false } });

    await seedAndInstall(sdk, fs, '/source');

    // Modify content without updating lock
    await fs.writeFile(
      '/project/.agents/cognit/skills/general/test-skill/SKILL.md',
      '---\nname: Modified\ndescription: Changed\n---\nDifferent content',
      'utf-8',
    );

    const checkResult = await sdk.check();
    expect(checkResult.ok).toBe(true);
    if (checkResult.ok) {
      const hashIssue = checkResult.value.issues.find(i => i.type === 'hash_mismatch');
      expect(hashIssue).toBeDefined();
    }
  });
});
```

### Task 8.2.4: Multi-Agent Integration

**File:** `tests/integration/multi-agent.test.ts`

- [ ] Install same cognitive to 3 agents simultaneously: claude-code, cursor, windsurf
- [ ] Verify canonical directory created once
- [ ] Verify 3 separate symlinks created (one per non-universal agent)
- [ ] Verify lock entry has all 3 agents in `installedAgents`
- [ ] Remove from one agent -- verify symlink removed, others intact, lock updated
- [ ] Test with mix of universal and non-universal agents

```typescript
// tests/integration/multi-agent.test.ts
describe('Integration: multi-agent', () => {
  it('installs to 3 agents with correct symlinks', async () => {
    const fs = createMemoryFs();
    const sdk = createAgentSyncSDK({ cwd: '/project', fs, telemetry: { enabled: false } });

    await seedMemoryFs(fs, {
      '/source/skills/react/SKILL.md': '---\nname: React\ndescription: React skill\n---\nContent',
    });

    const result = await sdk.add('/source', {
      agents: ['claude-code', 'cursor', 'windsurf'] as AgentType[],
      confirmed: true,
    });

    expect(result.ok).toBe(true);

    // Canonical exists once
    expect(await fs.exists('/project/.agents/cognit/skills/general/react/SKILL.md')).toBe(true);

    // Agent symlinks
    expect(await fs.exists('/project/.claude/skills/react')).toBe(true);
    expect(await fs.exists('/project/.cursor/skills/react')).toBe(true);
    expect(await fs.exists('/project/.windsurf/skills/react')).toBe(true);
  });
});
```

**Verification:**
```bash
pnpm vitest run tests/integration/
```

---

## Phase 8.3: E2E Tests (1.5 days)

### Task 8.3.1: Test Fixtures

**Directory:** `tests/fixtures/`

- [ ] Create fixture directory with valid, minimal, and invalid cognitive files:
  - `tests/fixtures/skills/valid-skill/SKILL.md` -- full frontmatter (name, description, version, category, tags, author, globs)
  - `tests/fixtures/skills/minimal-skill/SKILL.md` -- only required fields (name, description)
  - `tests/fixtures/skills/no-frontmatter/SKILL.md` -- no YAML frontmatter (should fail parsing)
  - `tests/fixtures/skills/internal-skill/SKILL.md` -- `internal: true` (should be hidden from default discovery)
  - `tests/fixtures/prompts/valid-prompt/PROMPT.md`
  - `tests/fixtures/rules/valid-rule/RULE.md`
  - `tests/fixtures/agents/valid-agent/AGENT.md`
- [ ] Create lock file fixtures:
  - `tests/fixtures/lock/v4-lock.json` -- v4 format for migration testing
  - `tests/fixtures/lock/v5-lock.json` -- v5 format for validation
  - `tests/fixtures/lock/corrupted-lock.json` -- invalid JSON
  - `tests/fixtures/lock/empty-lock.json` -- valid but empty `entries: {}`
- [ ] Create agent YAML fixtures:
  - `tests/fixtures/agent-yamls/minimal.yaml` -- 3-line agent definition
  - `tests/fixtures/agent-yamls/complex.yaml` -- agent with all optional fields
  - `tests/fixtures/agent-yamls/invalid-no-name.yaml` -- missing required `name`

### Task 8.3.2: Full Lifecycle E2E Test

**File:** `tests/e2e/full-lifecycle.test.ts`

- [ ] Uses real filesystem (`os.tmpdir()`)
- [ ] Creates a temp project directory with source cognitive files
- [ ] Creates SDK with real FS adapter (no in-memory)
- [ ] Runs complete workflow: init -> add from local -> list -> check -> remove
- [ ] Verifies real files exist on disk at expected paths
- [ ] Cleans up temp directory in `afterEach`

```typescript
// tests/e2e/full-lifecycle.test.ts
import { mkdtemp, rm, writeFile, mkdir, existsSync } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createAgentSyncSDK } from '../../src/index.js';

describe('E2E: full lifecycle on real filesystem', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agent-sync-sdk-e2e-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('complete workflow: add -> list -> check -> remove', async () => {
    // Create source cognitive
    const sourceDir = join(tempDir, 'source', 'skills', 'test-skill');
    await mkdir(sourceDir, { recursive: true });
    await writeFile(join(sourceDir, 'SKILL.md'), [
      '---',
      'name: E2E Test Skill',
      'description: A skill for end-to-end testing',
      '---',
      '# E2E Test Skill',
      'This is a test skill for E2E testing.',
    ].join('\n'));

    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const sdk = createAgentSyncSDK({ cwd: projectDir });

    // Add
    const addResult = await sdk.add(join(tempDir, 'source'), {
      agents: ['claude-code' as AgentType],
      confirmed: true,
    });
    expect(addResult.ok).toBe(true);

    // Verify files on real filesystem
    const canonicalPath = join(projectDir, '.agents', 'cognit', 'skills', 'general', 'test-skill', 'SKILL.md');
    expect(existsSync(canonicalPath)).toBe(true);

    // List
    const listResult = await sdk.list();
    expect(listResult.ok).toBe(true);
    if (listResult.ok) {
      expect(listResult.value.count).toBe(1);
    }

    // Check
    const checkResult = await sdk.check();
    expect(checkResult.ok).toBe(true);
    if (checkResult.ok) {
      expect(checkResult.value.issues).toHaveLength(0);
      expect(checkResult.value.healthy).toHaveLength(1);
    }

    // Remove
    const removeResult = await sdk.remove('test-skill');
    expect(removeResult.ok).toBe(true);

    // Verify cleanup
    expect(existsSync(canonicalPath)).toBe(false);
  });
});
```

### Task 8.3.3: GitHub Provider E2E Test (Network, Skippable)

**File:** `tests/e2e/github-provider.test.ts`

- [ ] Skippable with `describe.skipIf(!process.env.CI_NETWORK)` or `describe.skipIf(!process.env.GITHUB_TOKEN)`
- [ ] Clones a real public repository (small, stable, e.g., a test fixtures repo)
- [ ] Discovers cognitives from the cloned repo
- [ ] Verifies correct cognitive files found
- [ ] Cleans up clone directory

```typescript
// tests/e2e/github-provider.test.ts
describe.skipIf(!process.env.GITHUB_TOKEN)('E2E: GitHub provider', () => {
  it('clones and discovers cognitives from a public repo', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'agent-sync-sdk-github-'));
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const sdk = createAgentSyncSDK({ cwd: projectDir });

    // Find (discover without installing)
    const findResult = await sdk.find('vercel-labs/ai-sdk-preview-internal-knowledge');
    expect(findResult.ok).toBe(true);

    await rm(tempDir, { recursive: true, force: true });
  });
});
```

**Verification:**
```bash
# Unit + integration (no network)
pnpm vitest run tests/e2e/ --exclude '*github*'

# Full E2E with network (manual/nightly)
GITHUB_TOKEN=xxx pnpm vitest run tests/e2e/
```

---

## Phase 8.4: CI & Coverage (1.5 days)

### Task 8.4.1: GitHub Actions CI Workflow

**File:** `.github/workflows/ci.yml`

- [ ] Triggers on `push` and `pull_request`
- [ ] Matrix: Node 20 and Node 22, ubuntu-latest
- [ ] Steps: checkout -> pnpm setup -> install -> compile-agents -> lint -> typecheck -> build -> test with coverage
- [ ] Upload coverage to Codecov (optional)

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node: [20, 22]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4
        with:
          version: 9

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
          cache: pnpm

      - run: pnpm install --frozen-lockfile

      - name: Compile agent definitions
        run: pnpm run compile-agents

      - name: Lint
        run: pnpm run lint

      - name: Type check
        run: pnpm tsc --noEmit

      - name: Build
        run: pnpm run build

      - name: Test with coverage
        run: pnpm vitest run --coverage

      - name: Upload coverage
        if: matrix.node == 22
        uses: codecov/codecov-action@v4
        with:
          files: coverage/lcov.info
          fail_ci_if_error: false
```

### Task 8.4.2: Coverage Thresholds in Vitest Config

**File:** `vitest.config.ts`

- [ ] Set global thresholds: statements 85%, branches 80%, functions 85%
- [ ] Configure per-module overrides where targets differ
- [ ] Exclude from coverage: `__generated__`, barrel `index.ts` files, pure type files, `fs/node.ts` (thin wrapper)

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: '.',
    include: ['tests/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'lcov', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/__generated__/**',
        'src/**/index.ts',
        'src/types/**/*.ts',    // pure type files (no runtime to test)
        'src/fs/node.ts',       // thin Node.js wrapper (tested by E2E)
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
});
```

### Task 8.4.3: Per-Module Coverage Targets

Verify each module meets its individual target:

| Module | Statements | Branches | Functions | Target Met? |
|--------|-----------|----------|-----------|-------------|
| `types/branded.ts` | 95% | 90% | 95% | [ ] |
| `types/result.ts` | 100% | 100% | 100% | [ ] |
| `errors/*` | 90% | 85% | 90% | [ ] |
| `config/*` | 85% | 80% | 85% | [ ] |
| `events/*` | 90% | 85% | 90% | [ ] |
| `fs/memory.ts` | 85% | 80% | 85% | [ ] |
| `agents/registry.ts` | 85% | 80% | 85% | [ ] |
| `agents/detector.ts` | 80% | 75% | 80% | [ ] |
| `discovery/parser.ts` | 85% | 80% | 85% | [ ] |
| `discovery/scanner.ts` | 85% | 80% | 85% | [ ] |
| `source/parser.ts` | 85% | 80% | 85% | [ ] |
| `providers/registry.ts` | 85% | 80% | 85% | [ ] |
| `providers/*.ts` (each) | 80% | 75% | 80% | [ ] |
| `installer/service.ts` | 80% | 75% | 80% | [ ] |
| `installer/paths.ts` | 80% | 75% | 80% | [ ] |
| `installer/symlink.ts` | 80% | 75% | 80% | [ ] |
| `lock/manager.ts` | 85% | 80% | 85% | [ ] |
| `lock/migration.ts` | 85% | 80% | 85% | [ ] |
| `lock/integrity.ts` | 85% | 80% | 85% | [ ] |
| `operations/*.ts` (each) | 85% | 80% | 85% | [ ] |
| `sdk.ts` | 85% | 80% | 85% | [ ] |

- [ ] Run `pnpm vitest run --coverage` and compare against targets
- [ ] Add missing tests for any module below threshold
- [ ] Re-run until all modules meet targets

**Verification:**
```bash
pnpm vitest run --coverage
# Review HTML coverage report at coverage/index.html
```

---

## Phase 8.5: Final Verification (0.5 days)

### Task 8.5.1: TypeScript Strict Compliance

- [ ] Run `pnpm tsc --noEmit` with strict config: zero errors
- [ ] Verify no `any` in `src/` (grep for `: any`, `as any`, `<any>`)
- [ ] Verify no `console.` in `src/` (grep for `console.log`, `console.warn`, `console.error`)
- [ ] Verify no `process.exit` in `src/`
- [ ] Verify no `process.stdout` or `process.stderr` in `src/`

```bash
# TypeScript strict
pnpm tsc --noEmit

# No 'any' usage
grep -r "any" src/ --include="*.ts" | grep -v "node_modules" | grep -v "__generated__" | grep -E ": any|as any|<any>"
# Expected: zero results

# No console usage
grep -r "console\." src/ --include="*.ts" | grep -v "node_modules"
# Expected: zero results

# No process.exit
grep -r "process\.exit" src/ --include="*.ts" | grep -v "node_modules"
# Expected: zero results
```

### Task 8.5.2: Full Test Suite

- [ ] Run all tests: `pnpm vitest run`
- [ ] All unit tests pass
- [ ] All integration tests pass
- [ ] All E2E tests pass (non-network)
- [ ] Coverage thresholds met

```bash
pnpm vitest run --coverage
```

### Task 8.5.3: Build Verification

- [ ] Run `pnpm build` (tsup)
- [ ] Verify `dist/index.js` exists and is valid ESM
- [ ] Verify `dist/index.d.ts` exists and exports all public types
- [ ] Verify `dist/` does not contain test files or internal implementations

```bash
pnpm build
ls -la dist/
# Verify index.js and index.d.ts exist
```

### Task 8.5.4: Lint Clean

- [ ] Run `pnpm lint`
- [ ] Zero lint errors
- [ ] Zero lint warnings (or documented exceptions)

```bash
pnpm lint
```

### Task 8.5.5: Package Verification

- [ ] Run `pnpm pack --dry-run` to verify package contents
- [ ] Verify only `dist/` is included (per `"files": ["dist"]`)
- [ ] Verify no test files, no source files, no `.env`, no credentials

```bash
pnpm pack --dry-run
```

---

## Definition of Done

### Unit Tests
- [ ] All branded type constructors tested with valid and invalid inputs
- [ ] All error classes tested for `instanceof` chains, codes, modules, serialization, error chaining
- [ ] Config resolution tested with no args, partial overrides, and full overrides
- [ ] EventBus tested for ordering, multiple listeners, unsubscribe, once, re-entrant emit
- [ ] Agent registry tested for 39+ agents, universal detection, directory resolution, runtime registration
- [ ] Source parser tested for all 12 input patterns and edge cases
- [ ] Provider priority tested: specific providers match before catch-all
- [ ] Installer tested for symlink, copy, ELOOP, cross-platform, dry-run, rollback
- [ ] Lock migration tested from v3, v4, old file names, corrupted files
- [ ] All 8 operations tested with edge cases (empty lock, corrupt lock, not-found, partial failure)

### Integration Tests
- [ ] Full add flow: source -> provider -> discover -> install -> lock
- [ ] Full lifecycle: add -> list -> update -> remove
- [ ] Sync flow: install -> corrupt -> sync -> verify repair
- [ ] Multi-agent: install to 3+ agents simultaneously, verify symlinks

### E2E Tests
- [ ] Full lifecycle on real filesystem (temp directory)
- [ ] GitHub provider with real network (skippable)
- [ ] Test fixtures directory with valid/minimal/invalid cognitives

### CI & Coverage
- [ ] GitHub Actions workflow: lint + typecheck + build + test + coverage
- [ ] Global thresholds: statements 85%, branches 80%, functions 85%
- [ ] All per-module thresholds met (see table in Phase 8.4)
- [ ] Node 20 and Node 22 matrix

### Final Checks
- [ ] `pnpm tsc --noEmit` -- zero errors
- [ ] `pnpm vitest run --coverage` -- all tests pass, thresholds met
- [ ] `pnpm build` -- produces valid `dist/index.js` and `dist/index.d.ts`
- [ ] `pnpm lint` -- zero errors
- [ ] Zero `any` in `src/`
- [ ] Zero `console.` in `src/`
- [ ] Zero `process.exit` in `src/`
- [ ] `pnpm pack --dry-run` -- only `dist/` in package

---

## Risks

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| **Coverage below 85%** | CI fails, cannot ship | Medium | Start with highest-gap modules first. Track coverage delta per day. |
| **Flaky E2E tests** | CI unreliable, developer frustration | Medium | E2E tests use fresh temp directories. Network tests are skippable. No timing-dependent assertions. |
| **Cross-platform CI failures** | Tests pass on macOS but fail on Linux or Windows | Medium | GitHub Actions matrix includes ubuntu-latest. Symlink tests mock `process.platform`. Path tests use `path.join()`. |
| **Integration test coupling** | Tests break when internal implementation changes | Low | Integration tests use the public SDK API (`createAgentSyncSDK`), not internal classes. Only E2E tests touch real filesystem. |
| **Coverage threshold too aggressive** | Impossible to reach 85% for some complex modules | Low | Adjust per-module targets based on actual complexity. `source/git.ts` has lower target (75%) because it wraps shell commands. |
| **Test suite runtime** | Full test suite takes too long for developer iteration | Medium | Unit tests run in < 5 seconds (in-memory everything). Integration tests < 10 seconds. E2E tests separated and skippable. |
| **Missing edge cases** | Production bug in untested path | Medium | Phase 8.1 specifically audits every module. Test quality checklist applied per module. |

---

## Rollback Strategy

If Sprint 8 cannot be completed:

1. **Coverage-first approach:** If time runs short, prioritize Phase 8.1 (unit test gaps) and Phase 8.4 (CI). Integration and E2E tests add confidence but unit tests catch the most bugs per test.

2. **Ship without CI initially:** If the CI workflow has issues, the test suite can be run locally. CI is important for long-term maintenance but not a blocker for initial SDK usage.

3. **Incremental coverage:** Set initial thresholds at 70% (lower than target) to unblock CI, then raise them in subsequent iterations as tests are added.

4. **Sprint 1-7 independence:** All functionality built in Sprints 1-7 is complete and working. Sprint 8 adds quality assurance -- the SDK is usable without it, just less thoroughly tested.

---

## Notes

- This sprint adds zero new features. It is entirely about quality, reliability, and confidence.
- The `createMemoryFs()` utility is the primary tool for all unit and integration tests. It implements the full `FileSystemAdapter` interface with an in-memory tree structure. Only E2E tests use the real filesystem.
- The `createCapturingEventBus()` utility records all emitted events with timestamps, enabling exact event sequence assertions in tests.
- No mocking libraries are used. The DI architecture (composition root pattern from Sprint 7) makes hand-written fakes trivial: inject a custom `FileSystemAdapter`, `GitClient`, or `HostProvider` in tests.
- Test names should describe what is being tested, not how: "accepts valid agent names" not "calls validateAgentName with valid input".
- All tests must be parallelizable: no shared mutable state, no global singletons, no filesystem cleanup dependencies between tests.
- The test quality checklist from `12-testing-strategy.md` is applied per module: happy path, error paths, edge cases, events verified, result pattern tested, no test ordering dependency, no real I/O, no timing constructs.
