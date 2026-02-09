# 08 -- Lock File System

## 1. Overview

The lock file is the single source of truth for what cognitives are installed. It tracks every installed cognitive's source, version, integrity hash, category, target agents, and timestamps. The lock file enables:

- **Update detection** -- comparing installed hashes against remote sources
- **Drift detection** -- verifying filesystem matches lock expectations
- **Reproducible installs** -- re-installing exact same versions
- **Audit trail** -- when was each cognitive installed/updated and from where

---

## 2. Lock File Location

### 2.1 Project-Level Lock

```
<project-root>/.agents/cognit/.cognit-lock.json
```

Tracks cognitives installed at project scope. Committed to version control so team members share the same cognitive versions.

### 2.2 Global-Level Lock

```
~/.agents/cognit/.cognit-lock.json          # macOS
~/.local/share/cognit/.cognit-lock.json     # Linux (XDG)
%APPDATA%\cognit\.cognit-lock.json          # Windows
```

Tracks cognitives installed at global scope. Not version-controlled.

### 2.3 Migration from Previous Formats

The SDK migrates old lock files on first read:

| Old File | Origin | Migration |
|----------|--------|-----------|
| `.skill-lock.json` | vercel-labs/skills upstream | Rename to `.cognit-lock.json` |
| `.synk-lock.json` | cognit v1 (when named synk) | Rename to `.cognit-lock.json` |
| `synapsync.lock` | synapse-cli | Parse and convert schema |

---

## 3. JSON Schema

### 3.1 Full Lock File Schema

```typescript
interface CognitLockFile {
  /** Schema version. Current: 5. Used for migration detection. */
  version: 5;

  /** Map of cognitive entries, keyed by unique identifier: "{type}:{category}:{name}" */
  entries: Record<string, CognitLockEntry>;

  /** Metadata about the lock file itself */
  metadata: LockMetadata;
}

interface LockMetadata {
  /** ISO timestamp of when this lock file was created */
  createdAt: string;

  /** ISO timestamp of last modification */
  updatedAt: string;

  /** SDK version that last wrote this file */
  sdkVersion: string;

  /** Last selected agents (for remembering user preferences) */
  lastSelectedAgents?: string[];

  /** Dismissed prompts (find-skills, etc.) */
  dismissedPrompts?: Record<string, boolean>;
}
```

### 3.2 Lock Entry Schema

```typescript
interface CognitLockEntry {
  /** Human-readable display name from cognitive frontmatter */
  name: string;

  /** The cognitive type: 'skill' | 'prompt' | 'rule' | 'agent' */
  cognitiveType: CognitiveType;

  /** Category the cognitive is organized under */
  category: string;

  /** ── Source Information ── */

  /** Normalized source identifier (e.g., "owner/repo", "mintlify/bun.com") */
  source: string;

  /** The provider/source type */
  sourceType: CognitiveSourceType;

  /** The original URL used to install (for re-fetching) */
  sourceUrl: string;

  /** Subpath within the source repo, if applicable */
  sourcePath?: string;

  /** ── Version & Integrity ── */

  /** Git commit SHA at time of installation */
  commitSha?: string;

  /** Semver version if the source provides one */
  version?: string;

  /** Git tree SHA for the cognitive folder (for update detection) */
  folderHash: string;

  /** SHA-256 hash of the primary cognitive file content */
  contentHash: string;

  /** ── Installation State ── */

  /** Installation mode used */
  installMode: InstallMode;

  /** Installation scope */
  installScope: InstallScope;

  /** List of agents this cognitive is installed to */
  installedAgents: AgentType[];

  /** Canonical filesystem path (relative to project root or global base) */
  canonicalPath: string;

  /** ── Timestamps ── */

  /** ISO timestamp when first installed */
  installedAt: string;

  /** ISO timestamp when last updated */
  updatedAt: string;
}

/** Source types for cognitives */
type CognitiveSourceType =
  | 'github'
  | 'gitlab'
  | 'local'
  | 'registry'
  | 'mintlify'
  | 'huggingface'
  | 'wellknown'
  | 'direct-url';
```

---

## 4. Example Lock File

```json
{
  "version": 5,
  "entries": {
    "skill:frontend:react-19": {
      "name": "React 19 Best Practices",
      "cognitiveType": "skill",
      "category": "frontend",
      "source": "vercel-labs/agent-skills",
      "sourceType": "github",
      "sourceUrl": "https://github.com/vercel-labs/agent-skills",
      "sourcePath": "skills/react-19",
      "commitSha": "a1b2c3d4e5f6789012345678901234567890abcd",
      "version": null,
      "folderHash": "8f14e45fceea167a5a36dedd4bea2543",
      "contentHash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "installMode": "symlink",
      "installScope": "project",
      "installedAgents": ["claude-code", "cursor", "codex"],
      "canonicalPath": "skills/frontend/react-19",
      "installedAt": "2026-02-05T14:30:00.000Z",
      "updatedAt": "2026-02-08T09:15:00.000Z"
    },
    "skill:planning:task-decomposition": {
      "name": "Task Decomposition",
      "cognitiveType": "skill",
      "category": "planning",
      "source": "synapsync/cognitive-library",
      "sourceType": "github",
      "sourceUrl": "https://github.com/synapsync/cognitive-library",
      "sourcePath": "skills/task-decomposition",
      "commitSha": "b2c3d4e5f67890123456789012345678901abcde",
      "version": "1.2.0",
      "folderHash": "7c211433f02024a5b5903e59c8f7f92f",
      "contentHash": "d7a8fbb307d7809469ca9abcb0082e4f8d5651e46d3cdb762d02d0bf37c9e592",
      "installMode": "symlink",
      "installScope": "project",
      "installedAgents": ["claude-code"],
      "canonicalPath": "skills/planning/task-decomposition",
      "installedAt": "2026-02-06T10:00:00.000Z",
      "updatedAt": "2026-02-06T10:00:00.000Z"
    },
    "prompt:backend:api-design": {
      "name": "API Design Prompt",
      "cognitiveType": "prompt",
      "category": "backend",
      "source": "local",
      "sourceType": "local",
      "sourceUrl": "/Users/dev/my-prompts/api-design",
      "sourcePath": null,
      "commitSha": null,
      "version": null,
      "folderHash": "",
      "contentHash": "abc123def456789012345678901234567890abcdef1234567890abcdef12345678",
      "installMode": "copy",
      "installScope": "global",
      "installedAgents": ["claude-code", "cursor", "opencode"],
      "canonicalPath": "prompts/backend/api-design",
      "installedAt": "2026-02-07T16:45:00.000Z",
      "updatedAt": "2026-02-07T16:45:00.000Z"
    },
    "rule:security:owasp-top-10": {
      "name": "OWASP Top 10 Rules",
      "cognitiveType": "rule",
      "category": "security",
      "source": "synapsync/security-rules",
      "sourceType": "github",
      "sourceUrl": "https://github.com/synapsync/security-rules",
      "sourcePath": "rules/owasp-top-10",
      "commitSha": "c3d4e5f678901234567890123456789012abcdef0",
      "version": "2.0.1",
      "folderHash": "6512bd43d9caa6e02c990b0a82652dca",
      "contentHash": "ef2d127de37b942baad06145e54b0c619a1f22327b2ebbcfbec78f5564afe39d",
      "installMode": "symlink",
      "installScope": "project",
      "installedAgents": ["claude-code", "cursor", "windsurf", "copilot-chat"],
      "canonicalPath": "rules/security/owasp-top-10",
      "installedAt": "2026-02-03T08:00:00.000Z",
      "updatedAt": "2026-02-09T12:00:00.000Z"
    },
    "agent:devops:ci-pipeline": {
      "name": "CI Pipeline Agent",
      "cognitiveType": "agent",
      "category": "devops",
      "source": "mintlify/devops.example.com",
      "sourceType": "mintlify",
      "sourceUrl": "https://devops.example.com/.well-known/skills/ci-pipeline",
      "sourcePath": null,
      "commitSha": null,
      "version": null,
      "folderHash": "",
      "contentHash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
      "installMode": "symlink",
      "installScope": "project",
      "installedAgents": ["claude-code"],
      "canonicalPath": "agents/devops/ci-pipeline",
      "installedAt": "2026-02-08T11:30:00.000Z",
      "updatedAt": "2026-02-08T11:30:00.000Z"
    }
  },
  "metadata": {
    "createdAt": "2026-02-03T08:00:00.000Z",
    "updatedAt": "2026-02-09T12:00:00.000Z",
    "sdkVersion": "1.0.0",
    "lastSelectedAgents": ["claude-code", "cursor"],
    "dismissedPrompts": {
      "findSkillsPrompt": true
    }
  }
}
```

---

## 5. CRUD Operations

### 5.1 TypeScript Interface

```typescript
interface LockFileManager {
  /** Read the lock file. Returns empty structure if not found. */
  read(scope: InstallScope, projectRoot?: string): Promise<CognitLockFile>;

  /** Write the lock file atomically (temp + rename). */
  write(lock: CognitLockFile, scope: InstallScope, projectRoot?: string): Promise<void>;

  /** Add or update a single entry. */
  upsert(
    key: string,
    entry: CognitLockEntry,
    scope: InstallScope,
    projectRoot?: string
  ): Promise<void>;

  /** Remove an entry by key. Returns true if entry existed. */
  remove(
    key: string,
    scope: InstallScope,
    projectRoot?: string
  ): Promise<boolean>;

  /** Get a single entry by key. Returns null if not found. */
  get(
    key: string,
    scope: InstallScope,
    projectRoot?: string
  ): Promise<CognitLockEntry | null>;

  /** Get all entries. */
  getAll(
    scope: InstallScope,
    projectRoot?: string
  ): Promise<Record<string, CognitLockEntry>>;

  /** Query entries by filter criteria. */
  query(
    filter: LockQueryFilter,
    scope: InstallScope,
    projectRoot?: string
  ): Promise<CognitLockEntry[]>;

  /** Get entries grouped by source (for batch update operations). */
  getBySource(
    scope: InstallScope,
    projectRoot?: string
  ): Promise<Map<string, { names: string[]; entry: CognitLockEntry }>>;

  /** Get the lock file path for the given scope. */
  getLockFilePath(scope: InstallScope, projectRoot?: string): string;

  /** Check if a lock file exists. */
  exists(scope: InstallScope, projectRoot?: string): Promise<boolean>;
}

interface LockQueryFilter {
  cognitiveType?: CognitiveType;
  category?: string;
  sourceType?: CognitiveSourceType;
  agent?: AgentType;
  installedBefore?: Date;
  installedAfter?: Date;
}
```

### 5.2 Key Generation

Lock entry keys follow the pattern `{type}:{category}:{name}`:

```typescript
function makeLockKey(cognitiveType: CognitiveType, category: string, name: string): string {
  return `${cognitiveType}:${sanitizeName(category)}:${sanitizeName(name)}`;
}

// Examples:
// "skill:frontend:react-19"
// "prompt:backend:api-design"
// "rule:security:owasp-top-10"
// "agent:devops:ci-pipeline"
```

This key structure ensures uniqueness across types and categories while remaining human-readable.

---

## 6. Update Detection

### 6.1 GitHub SHA Comparison

For GitHub-sourced cognitives, the SDK compares the installed `folderHash` against the current tree SHA:

```typescript
async function checkForUpdates(
  entries: CognitLockEntry[]
): Promise<UpdateCheckResult[]> {
  const results: UpdateCheckResult[] = [];
  const token = getGitHubToken(); // GITHUB_TOKEN, GH_TOKEN, or `gh auth token`

  // Group by source to minimize API calls
  const bySource = groupBy(entries, e => e.source);

  for (const [source, sourceEntries] of bySource) {
    if (sourceEntries[0].sourceType !== 'github') continue;

    // Fetch full tree in one API call
    const tree = await fetchGitHubTree(source, token);
    if (!tree) continue;

    for (const entry of sourceEntries) {
      const currentHash = findTreeHash(tree, entry.sourcePath);
      if (currentHash && currentHash !== entry.folderHash) {
        results.push({
          key: makeLockKey(entry.cognitiveType, entry.category, entry.name),
          entry,
          currentHash,
          hasUpdate: true,
        });
      }
    }
  }

  return results;
}
```

### 6.2 Semver Comparison

If a cognitive provides a `version` field (from frontmatter), the SDK can compare using semver:

```typescript
function hasNewerVersion(installed: string, remote: string): boolean {
  // Simple semver comparison without full semver library
  const parse = (v: string) => v.split('.').map(Number);
  const [iMajor, iMinor, iPatch] = parse(installed);
  const [rMajor, rMinor, rPatch] = parse(remote);

  if (rMajor > iMajor) return true;
  if (rMajor === iMajor && rMinor > iMinor) return true;
  if (rMajor === iMajor && rMinor === iMinor && rPatch > iPatch) return true;
  return false;
}
```

### 6.3 Content Hash Comparison

For local sources where git SHAs are not available, the SDK computes SHA-256 of the primary cognitive file and compares:

```typescript
function computeContentHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}
```

### 6.4 Modification Time

As a fallback when no hash is available (e.g., local file sources), the SDK checks `mtime`:

```typescript
async function hasFileChanged(path: string, lastKnownMtime: string): Promise<boolean> {
  const stats = await stat(path);
  return stats.mtime.toISOString() !== lastKnownMtime;
}
```

### 6.5 Detection Priority

1. **Git tree SHA** -- most reliable for GitHub/GitLab sources
2. **Semver** -- if source provides version metadata
3. **Content hash** -- for any source type
4. **Modification time** -- last resort for local files

---

## 7. Migration

### 7.1 Version Bumps

The lock file includes a `version` field. On read, the SDK checks the version and migrates if needed:

```typescript
const CURRENT_LOCK_VERSION = 5;

async function readWithMigration(lockPath: string): Promise<CognitLockFile> {
  const raw = await readFile(lockPath, 'utf-8');
  const parsed = JSON.parse(raw);

  if (typeof parsed.version !== 'number') {
    return createEmptyLockFile();
  }

  // Version-specific migrations
  if (parsed.version < 4) {
    // Pre-v4: had 'skills' key instead of 'cognitives'/'entries'
    return migrateFromV3(parsed);
  }

  if (parsed.version === 4) {
    // v4 -> v5: cognitives -> entries, add category, add metadata block
    return migrateFromV4(parsed);
  }

  return parsed as CognitLockFile;
}
```

### 7.2 Migration Functions

```typescript
function migrateFromV4(old: CognitLockFileV4): CognitLockFile {
  const entries: Record<string, CognitLockEntry> = {};

  for (const [name, entry] of Object.entries(old.cognitives)) {
    const cognitiveType = entry.cognitiveType || 'skill';
    const category = 'general'; // v4 had no categories
    const key = `${cognitiveType}:${category}:${name}`;

    entries[key] = {
      name,
      cognitiveType,
      category,
      source: entry.source,
      sourceType: entry.sourceType as CognitiveSourceType,
      sourceUrl: entry.sourceUrl,
      sourcePath: entry.cognitivePath,
      commitSha: undefined,
      version: undefined,
      folderHash: entry.cognitiveFolderHash,
      contentHash: '',
      installMode: 'symlink',
      installScope: 'global', // v4 was global-only
      installedAgents: old.lastSelectedAgents || [],
      canonicalPath: `${COGNITIVE_SUBDIRS[cognitiveType]}/${category}/${name}`,
      installedAt: entry.installedAt,
      updatedAt: entry.updatedAt,
    };
  }

  return {
    version: CURRENT_LOCK_VERSION,
    entries,
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      sdkVersion: SDK_VERSION,
      lastSelectedAgents: old.lastSelectedAgents,
      dismissedPrompts: old.dismissed
        ? { findSkillsPrompt: old.dismissed.findSkillsPrompt ?? false }
        : undefined,
    },
  };
}
```

### 7.3 Backward Compatibility

- The SDK always writes the latest version format
- Old lock files are migrated in-place on first read
- If migration fails, the SDK creates a fresh empty lock file and logs a warning
- The old file is backed up as `.cognit-lock.json.bak` before migration

---

## 8. Conflict Resolution

### 8.1 Lock vs Filesystem Disagreement

When the lock says a cognitive is installed but the filesystem disagrees:

| Scenario | Detection | Resolution |
|----------|-----------|------------|
| Lock has entry, canonical dir missing | `stat()` fails | Mark entry as `orphaned`; `sync` re-installs or removes from lock |
| Lock has entry, symlink broken | `readlink()` target doesn't exist | `sync` recreates symlink |
| Lock missing entry, cognitive exists | Filesystem scan finds unlocked cognitive | `sync` adds to lock or warns |
| Lock hash differs from filesystem | `contentHash` mismatch | `sync` updates lock hash |

### 8.2 The `doctor` Operation

The doctor operation audits lock-vs-filesystem consistency:

```typescript
interface DoctorResult {
  healthy: string[];     // Entries where lock matches filesystem
  orphaned: string[];    // Lock entries with missing files
  unlocked: string[];    // Files present but not in lock
  broken: string[];      // Broken symlinks
  hashMismatch: string[]; // Content hash doesn't match
  fixable: string[];     // Issues that can be auto-fixed
}
```

---

## 9. Atomic Writes

All lock file writes use the temp-file-then-rename pattern to prevent corruption:

```typescript
async function writeLockFileAtomic(
  lockPath: string,
  lock: CognitLockFile
): Promise<void> {
  // Ensure directory exists
  await mkdir(dirname(lockPath), { recursive: true });

  // Write to temp file first
  const tempPath = lockPath + '.tmp.' + process.pid;
  const content = JSON.stringify(lock, null, 2) + '\n';

  try {
    await writeFile(tempPath, content, 'utf-8');
    await rename(tempPath, lockPath); // Atomic on POSIX
  } catch (error) {
    // Clean up temp file on failure
    try { await rm(tempPath, { force: true }); } catch {}
    throw error;
  }
}
```

On POSIX systems, `rename()` is atomic -- the lock file is never in a partially-written state. On Windows, `rename()` may not be fully atomic, but the temp file approach still provides crash safety.

---

## 10. Existing Code Reference

The current cognit lock file system lives in `src/services/lock/lock-file.ts` (450 LOC). Key differences in the SDK redesign:

| Current | SDK Redesign |
|---------|--------------|
| Global-only lock file at `~/.agents/.cognit-lock.json` | Both project and global lock files |
| Flat key: cognitive name | Composite key: `type:category:name` |
| No categories | Category field per entry |
| `cognitives` top-level key | `entries` top-level key |
| No content hash | `contentHash` (SHA-256) per entry |
| No commit SHA | `commitSha` for git sources |
| No metadata block | `metadata` block with timestamps, SDK version |
| No query/filter API | Structured `query()` with filter criteria |
| Functional API (standalone functions) | `LockFileManager` class with scope parameter |
| No backup on migration | `.bak` backup before migration |
| Version 4 | Version 5 |
