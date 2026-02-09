# 02 - Complete Type System

**Author:** Agent A -- SDK Core Architect
**Date:** 2026-02-09
**Status:** Plan

---

## 1. Branded Types (`types/branded.ts`)

Branded types prevent accidental mixing of string IDs from different domains.

```typescript
// ---------- Branding utility ----------

declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ---------- Domain brands ----------

/** A validated agent name (e.g., "claude-code", "cursor") */
export type AgentName = Brand<string, 'AgentName'>;

/** A validated cognitive name (e.g., "react-best-practices") */
export type CognitiveName = Brand<string, 'CognitiveName'>;

/** A sanitized filesystem-safe name */
export type SafeName = Brand<string, 'SafeName'>;

/** A validated source identifier (e.g., "owner/repo", "mintlify/bun.com") */
export type SourceIdentifier = Brand<string, 'SourceIdentifier'>;

// ---------- Brand constructors ----------

export function agentName(raw: string): AgentName {
  // Validation: lowercase, alphanumeric + hyphens
  if (!/^[a-z0-9][a-z0-9-]*$/.test(raw)) {
    throw new Error(`Invalid agent name: "${raw}"`);
  }
  return raw as AgentName;
}

export function cognitiveName(raw: string): CognitiveName {
  if (!raw || raw.includes('/') || raw.includes('\\')) {
    throw new Error(`Invalid cognitive name: "${raw}"`);
  }
  return raw as CognitiveName;
}

export function safeName(raw: string): SafeName {
  // Must not contain path separators, dots-only, or null bytes
  if (!raw || /[/\\:]/.test(raw) || raw === '.' || raw === '..' || raw.includes('\0')) {
    throw new Error(`Unsafe name: "${raw}"`);
  }
  return raw as SafeName;
}

export function sourceIdentifier(raw: string): SourceIdentifier {
  if (!raw) throw new Error('Empty source identifier');
  return raw as SourceIdentifier;
}
```

---

## 2. Result Type (`types/result.ts`)

```typescript
import type { CognitError } from '../errors/base.js';

/**
 * Discriminated union for operations that can fail with expected errors.
 * Use this instead of throwing for recoverable failures.
 */
export type Result<T, E extends CognitError = CognitError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Create a success result */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Create a failure result */
export function err<E extends CognitError>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Unwrap a result or throw the error */
export function unwrap<T, E extends CognitError>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

/** Map the success value of a result */
export function mapResult<T, U, E extends CognitError>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (result.ok) return ok(fn(result.value));
  return result;
}
```

---

## 3. Cognitive Types (`types/cognitive.ts`)

```typescript
import type { CognitiveName } from './branded.js';

// ---------- CognitiveType ----------

/**
 * The supported cognitive types.
 * This is a string literal union generated from config/cognitive-types.yaml at build time.
 * Shown here as the source of truth for the type system.
 */
export type CognitiveType = 'skill' | 'agent' | 'prompt' | 'rule';

/**
 * Configuration for a cognitive type (generated from YAML).
 * Maps each type to its filesystem conventions.
 */
export interface CognitiveTypeConfig {
  /** Subdirectory name (e.g., "skills", "prompts") */
  readonly subdir: string;
  /** Canonical file name (e.g., "SKILL.md", "PROMPT.md") */
  readonly fileName: string;
}

/**
 * Complete mapping of cognitive types to their configs.
 * Const assertion ensures literal types are preserved.
 */
export const COGNITIVE_TYPE_CONFIGS = {
  skill:  { subdir: 'skills',  fileName: 'SKILL.md' },
  agent:  { subdir: 'agents',  fileName: 'AGENT.md' },
  prompt: { subdir: 'prompts', fileName: 'PROMPT.md' },
  rule:   { subdir: 'rules',   fileName: 'RULE.md' },
} as const satisfies Record<CognitiveType, CognitiveTypeConfig>;

/** Subdirectory names indexed by cognitive type */
export const COGNITIVE_SUBDIRS: Record<CognitiveType, string> = {
  skill:  COGNITIVE_TYPE_CONFIGS.skill.subdir,
  agent:  COGNITIVE_TYPE_CONFIGS.agent.subdir,
  prompt: COGNITIVE_TYPE_CONFIGS.prompt.subdir,
  rule:   COGNITIVE_TYPE_CONFIGS.rule.subdir,
};

/** File names indexed by cognitive type */
export const COGNITIVE_FILE_NAMES: Record<CognitiveType, string> = {
  skill:  COGNITIVE_TYPE_CONFIGS.skill.fileName,
  agent:  COGNITIVE_TYPE_CONFIGS.agent.fileName,
  prompt: COGNITIVE_TYPE_CONFIGS.prompt.fileName,
  rule:   COGNITIVE_TYPE_CONFIGS.rule.fileName,
};

/** The canonical agents directory name */
export const AGENTS_DIR = '.agents' as const;

// ---------- Cognitive ----------

/**
 * A cognitive discovered on the filesystem.
 * This is the core data type -- every discovered cognitive resolves to this shape.
 */
export interface Cognitive {
  /** Display name from frontmatter */
  readonly name: CognitiveName;

  /** Human-readable description from frontmatter */
  readonly description: string;

  /** Absolute path to the cognitive's directory */
  readonly path: string;

  /** The cognitive type */
  readonly type: CognitiveType;

  /** Raw file content (SKILL.md, AGENT.md, etc.) for hashing */
  readonly rawContent: string;

  /** Additional metadata from frontmatter */
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ---------- Type-specific subtypes ----------

/**
 * A Skill cognitive -- task-oriented instructions for an agent.
 */
export interface Skill extends Cognitive {
  readonly type: 'skill';
}

/**
 * A Prompt cognitive -- reusable prompt templates.
 */
export interface Prompt extends Cognitive {
  readonly type: 'prompt';
}

/**
 * A Rule cognitive -- behavioral rules and constraints.
 */
export interface Rule extends Cognitive {
  readonly type: 'rule';
}

/**
 * An AgentCognitive -- persona/behavior definitions.
 * Named AgentCognitive to avoid collision with AgentConfig.
 */
export interface AgentCognitive extends Cognitive {
  readonly type: 'agent';
}

// ---------- Remote cognitive ----------

/**
 * A cognitive fetched from a remote provider (not yet on disk).
 */
export interface RemoteCognitive {
  /** Display name from frontmatter */
  readonly name: string;

  /** Description from frontmatter */
  readonly description: string;

  /** Full markdown content including frontmatter */
  readonly content: string;

  /** Filesystem-safe name for the install directory */
  readonly installName: SafeName;

  /** The original source URL */
  readonly sourceUrl: string;

  /** ID of the provider that fetched this */
  readonly providerId: string;

  /** Source identifier for tracking (e.g., "mintlify/bun.com") */
  readonly sourceIdentifier: SourceIdentifier;

  /** The cognitive type */
  readonly type: CognitiveType;

  /** Additional metadata from frontmatter */
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ---------- CognitiveRef (lightweight reference) ----------

/**
 * Lightweight reference to a cognitive, without content.
 * Used in list results, event payloads, etc.
 */
export interface CognitiveRef {
  readonly name: CognitiveName;
  readonly type: CognitiveType;
  readonly path: string;
  readonly description: string;
}
```

---

## 4. Agent Types (`types/agent.ts`)

```typescript
import type { AgentName } from './branded.js';
import type { CognitiveType } from './cognitive.js';

// ---------- AgentType ----------

/**
 * Union of all known agent identifiers.
 * Generated at build time from agents/*.yaml.
 * Shown here with representative values.
 */
export type AgentType =
  | 'adal'
  | 'amp'
  | 'augment'
  | 'claude-code'
  | 'cline'
  | 'codex'
  | 'cursor'
  | 'gemini-cli'
  | 'github-copilot'
  | 'goose'
  | 'junie'
  | 'kiro-cli'
  | 'opencode'
  | 'roo'
  | 'trae'
  | 'windsurf'
  // ... 39+ total, generated from YAML
  ;

// ---------- AgentConfig ----------

/**
 * Directory configuration for a specific cognitive type within an agent.
 */
export interface AgentDirConfig {
  /** Relative path for project-local installation (e.g., ".cursor/skills") */
  readonly local: string;
  /** Absolute path for global installation, or undefined if not supported */
  readonly global: string | undefined;
}

/**
 * Complete configuration for a single AI coding agent.
 * Generated from agents/*.yaml at build time.
 */
export interface AgentConfig {
  /** Machine-readable identifier (e.g., "claude-code") */
  readonly name: AgentName;

  /** Human-readable display name (e.g., "Claude Code") */
  readonly displayName: string;

  /** Directory mappings for each cognitive type */
  readonly dirs: Readonly<Record<CognitiveType, AgentDirConfig>>;

  /** Async function to detect if this agent is installed on the system */
  readonly detectInstalled: () => Promise<boolean>;

  /** Whether to show this agent in the universal agents list. Default: true */
  readonly showInUniversalList: boolean;
}

// ---------- AgentDetectionResult ----------

/**
 * Result of detecting installed agents.
 */
export interface AgentDetectionResult {
  /** The agent that was detected */
  readonly agent: AgentType;

  /** The agent's display name */
  readonly displayName: string;

  /** Whether the agent was found installed */
  readonly installed: boolean;

  /** Whether this agent uses universal .agents/ directory */
  readonly isUniversal: boolean;
}

// ---------- AgentRegistry interface ----------

/**
 * Registry providing access to agent configurations.
 * This is the public interface; implementation is internal.
 */
export interface AgentRegistry {
  /** Get all registered agent types */
  getAll(): ReadonlyMap<AgentType, AgentConfig>;

  /** Get a specific agent config. Returns undefined if not found. */
  get(type: AgentType): AgentConfig | undefined;

  /** Get agents that use the universal .agents/<type> directory */
  getUniversalAgents(cognitiveType?: CognitiveType): AgentType[];

  /** Get agents that have agent-specific directories (need symlinks) */
  getNonUniversalAgents(cognitiveType?: CognitiveType): AgentType[];

  /** Check if an agent uses the universal directory for a given cognitive type */
  isUniversal(type: AgentType, cognitiveType?: CognitiveType): boolean;

  /** Get the directory path for a specific agent + cognitive type + scope */
  getDir(type: AgentType, cognitiveType: CognitiveType, scope: 'local' | 'global'): string | undefined;

  /** Detect which agents are installed on this system */
  detectInstalled(): Promise<AgentDetectionResult[]>;

  /** Register an additional agent at runtime */
  register(config: AgentConfig): void;
}
```

---

## 5. Provider Types (`types/provider.ts`)

```typescript
import type { CognitiveType } from './cognitive.js';
import type { RemoteCognitive } from './cognitive.js';
import type { SourceIdentifier } from './branded.js';

// ---------- SourceDescriptor ----------

/**
 * Describes a parsed source input (URL, path, shorthand).
 * This is the output of the SourceParser.
 */
export interface SourceDescriptor {
  /** The type of source */
  readonly kind: 'github' | 'gitlab' | 'git' | 'local' | 'direct-url' | 'well-known';

  /** The resolved URL or path */
  readonly url: string;

  /** Subpath within the source (e.g., "skills/react" within a repo) */
  readonly subpath?: string;

  /** Local filesystem path (for 'local' kind) */
  readonly localPath?: string;

  /** Git ref (branch/tag/commit) */
  readonly ref?: string;

  /** Filter: only install cognitives matching this name */
  readonly nameFilter?: string;

  /** Filter: only install cognitives of this type */
  readonly typeFilter?: CognitiveType;
}

// ---------- ParsedSource (alias for compatibility) ----------
export type ParsedSource = SourceDescriptor;

// ---------- ProviderMatch ----------

/**
 * Result of checking if a URL matches a provider.
 */
export interface ProviderMatch {
  /** Whether the URL matches this provider */
  readonly matches: boolean;
  /** Source identifier for tracking/grouping */
  readonly sourceIdentifier?: SourceIdentifier;
}

// ---------- HostProvider ----------

/**
 * Interface for remote cognitive host providers.
 * Each provider knows how to fetch cognitives from a specific type of remote host.
 */
export interface HostProvider {
  /** Unique provider identifier (e.g., "mintlify", "huggingface") */
  readonly id: string;

  /** Human-readable provider name */
  readonly displayName: string;

  /**
   * Check if a URL belongs to this provider.
   */
  match(url: string): ProviderMatch;

  /**
   * Fetch and parse a cognitive from the given URL.
   * Returns null if the URL is valid for this provider but no cognitive was found.
   */
  fetchCognitive(url: string): Promise<RemoteCognitive | null>;

  /**
   * Convert a user-facing URL to a raw content URL.
   * For example: GitHub blob URL -> raw.githubusercontent.com URL.
   */
  toRawUrl(url: string): string;

  /**
   * Get a stable source identifier for grouping/tracking.
   */
  getSourceIdentifier(url: string): SourceIdentifier;
}

// ---------- ProviderRegistry ----------

/**
 * Registry of host providers. Supports dynamic registration.
 */
export interface ProviderRegistry {
  /** Register a new provider */
  register(provider: HostProvider): void;

  /** Find the first provider matching the given URL */
  findProvider(url: string): HostProvider | null;

  /** Get all registered providers */
  getAll(): readonly HostProvider[];
}

// ---------- SourceParser ----------

/**
 * Parses raw source strings into structured SourceDescriptors.
 */
export interface SourceParser {
  /**
   * Parse a raw source string (URL, path, or shorthand like "owner/repo").
   */
  parse(source: string): SourceDescriptor;

  /**
   * Extract owner/repo from a GitHub or GitLab source descriptor.
   * Returns undefined for non-git sources.
   */
  getOwnerRepo(source: SourceDescriptor): string | undefined;
}

// ---------- GitClient ----------

/**
 * Abstraction for git operations.
 */
export interface GitClient {
  /**
   * Clone a repository to a temporary directory.
   * Returns the path to the temp directory.
   */
  clone(url: string, options?: GitCloneOptions): Promise<string>;

  /**
   * Clean up a temporary clone directory.
   */
  cleanup(tempDir: string): Promise<void>;
}

export interface GitCloneOptions {
  /** Clone depth. Default: 1 (shallow) */
  readonly depth?: number;
  /** Timeout in milliseconds */
  readonly timeoutMs?: number;
  /** Specific ref to clone */
  readonly ref?: string;
}
```

---

## 6. Installer Types (`types/installer.ts`)

```typescript
import type { AgentType } from './agent.js';
import type { CognitiveType, Cognitive, RemoteCognitive } from './cognitive.js';
import type { SafeName } from './branded.js';

// ---------- InstallMode ----------

/** How the cognitive files are linked to agent directories */
export type InstallMode = 'symlink' | 'copy';

// ---------- InstallScope ----------

/** Where to install: project-local or user-global */
export type InstallScope = 'project' | 'global';

// ---------- InstallTarget ----------

/** Specifies where and how to install a cognitive for a single agent */
export interface InstallTarget {
  /** The agent to install for */
  readonly agent: AgentType;
  /** Project or global scope */
  readonly scope: InstallScope;
  /** Installation mode */
  readonly mode: InstallMode;
}

// ---------- InstallResult ----------

/**
 * Result of installing a single cognitive for a single agent.
 */
export interface InstallResult {
  /** Whether installation succeeded */
  readonly success: boolean;

  /** The agent this was installed for */
  readonly agent: AgentType;

  /** The cognitive name */
  readonly cognitiveName: string;

  /** The cognitive type */
  readonly cognitiveType: CognitiveType;

  /** Final installation path */
  readonly path: string;

  /** Canonical path (for symlink mode, the source of the link) */
  readonly canonicalPath?: string;

  /** The mode that was actually used */
  readonly mode: InstallMode;

  /** Whether symlink creation failed and fell back to copy */
  readonly symlinkFailed?: boolean;

  /** Error message if success is false */
  readonly error?: string;
}

// ---------- InstallRequest ----------

/**
 * A request to install a cognitive. Unifies local and remote cognitives.
 */
export type InstallRequest =
  | { readonly kind: 'local'; readonly cognitive: Cognitive }
  | { readonly kind: 'remote'; readonly cognitive: RemoteCognitive }
  | { readonly kind: 'wellknown'; readonly cognitive: WellKnownCognitive };

/**
 * A well-known cognitive with multiple files.
 */
export interface WellKnownCognitive {
  readonly name: string;
  readonly installName: SafeName;
  readonly description: string;
  readonly type: CognitiveType;
  readonly sourceUrl: string;
  readonly files: ReadonlyMap<string, string>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ---------- Installer interface ----------

/**
 * Handles the actual file operations for installing cognitives.
 */
export interface Installer {
  /**
   * Install a cognitive for a specific agent.
   */
  install(
    request: InstallRequest,
    target: InstallTarget,
    options: InstallerOptions,
  ): Promise<InstallResult>;

  /**
   * Remove an installed cognitive from an agent's directory.
   */
  remove(
    cognitiveName: string,
    cognitiveType: CognitiveType,
    target: InstallTarget,
  ): Promise<boolean>;
}

export interface InstallerOptions {
  /** Working directory for project-local installs */
  readonly cwd: string;
}
```

---

## 7. Lock Types (`types/lock.ts`)

```typescript
import type { CognitiveType } from './cognitive.js';
import type { SourceIdentifier } from './branded.js';

// ---------- Lock version ----------

/** Current lock file schema version */
export const LOCK_VERSION = 5 as const;

// ---------- LockEntry ----------

/**
 * A single entry in the lock file representing an installed cognitive.
 */
export interface LockEntry {
  /** Normalized source identifier (e.g., "owner/repo") */
  readonly source: SourceIdentifier;

  /** The provider/source type (e.g., "github", "mintlify") */
  readonly sourceType: string;

  /** The original URL used to install (for re-fetching) */
  readonly sourceUrl: string;

  /** Subpath within the source repo */
  readonly cognitivePath?: string;

  /**
   * Hash of the cognitive folder for update detection.
   * For GitHub sources: Git tree SHA.
   * For other sources: SHA-256 of content.
   */
  readonly contentHash: string;

  /** The cognitive type */
  readonly cognitiveType: CognitiveType;

  /** ISO timestamp of first installation */
  readonly installedAt: string;

  /** ISO timestamp of last update */
  readonly updatedAt: string;
}

// ---------- LockFile ----------

/**
 * The complete lock file structure.
 */
export interface LockFile {
  /** Schema version */
  readonly version: typeof LOCK_VERSION;

  /** Map of cognitive name -> lock entry */
  readonly cognitives: Readonly<Record<string, LockEntry>>;

  /** Last selected agent list (user preference) */
  readonly lastSelectedAgents?: readonly string[];
}

// ---------- LockManager ----------

/**
 * Manages reading, writing, and querying the lock file.
 */
export interface LockManager {
  /** Read the current lock file. Returns empty if not found. */
  read(): Promise<LockFile>;

  /** Write the lock file to disk */
  write(lock: LockFile): Promise<void>;

  /** Add or update a cognitive entry */
  addEntry(name: string, entry: Omit<LockEntry, 'installedAt' | 'updatedAt'>): Promise<void>;

  /** Remove a cognitive entry. Returns true if it existed. */
  removeEntry(name: string): Promise<boolean>;

  /** Get a specific entry */
  getEntry(name: string): Promise<LockEntry | null>;

  /** Get all entries */
  getAllEntries(): Promise<Readonly<Record<string, LockEntry>>>;

  /** Get entries grouped by source */
  getBySource(): Promise<ReadonlyMap<SourceIdentifier, { names: string[]; entry: LockEntry }>>;

  /** Get/save last selected agents */
  getLastSelectedAgents(): Promise<readonly string[] | undefined>;
  saveLastSelectedAgents(agents: readonly string[]): Promise<void>;
}
```

---

## 8. Operation Types (`types/operations.ts`)

```typescript
import type { AgentType } from './agent.js';
import type { CognitiveType, Cognitive, CognitiveRef, RemoteCognitive } from './cognitive.js';
import type { InstallMode, InstallScope, InstallResult } from './installer.js';
import type { LockEntry } from './lock.js';

// ============================================================
// ADD
// ============================================================

export interface AddOptions {
  /** Target agents. If empty, the consumer must select from detected agents. */
  readonly agents?: readonly AgentType[];

  /** Installation scope */
  readonly scope?: InstallScope;

  /** Installation mode */
  readonly mode?: InstallMode;

  /** Working directory */
  readonly cwd?: string;

  /** Only install cognitives of this type */
  readonly typeFilter?: CognitiveType;

  /** Only install cognitives matching these names */
  readonly nameFilter?: readonly string[];

  /**
   * If the source contains multiple cognitives, should we install all of them
   * or should the consumer select? When true, installs all discovered cognitives.
   */
  readonly installAll?: boolean;
}

export interface AddResult {
  /** Source that was resolved */
  readonly source: string;

  /** All cognitives that were discovered */
  readonly discovered: readonly CognitiveRef[];

  /** Cognitives that were actually installed (after filtering) */
  readonly installed: readonly InstallResultEntry[];

  /** Lock entries that were created/updated */
  readonly lockEntries: readonly string[];
}

export interface InstallResultEntry {
  /** The cognitive that was installed */
  readonly cognitive: CognitiveRef;

  /** Per-agent installation results */
  readonly results: readonly InstallResult[];
}

// ============================================================
// LIST
// ============================================================

export interface ListOptions {
  /** Filter by cognitive type */
  readonly typeFilter?: CognitiveType;

  /** Filter by agent */
  readonly agentFilter?: AgentType;

  /** Scope to list */
  readonly scope?: InstallScope;

  /** Working directory */
  readonly cwd?: string;

  /** Include lock file metadata */
  readonly includeLockData?: boolean;
}

export interface ListResult {
  /** Discovered installed cognitives */
  readonly cognitives: readonly InstalledCognitive[];
}

export interface InstalledCognitive {
  /** Cognitive reference */
  readonly cognitive: CognitiveRef;

  /** Which agents this cognitive is installed for */
  readonly agents: readonly AgentType[];

  /** Lock file metadata (if includeLockData is true) */
  readonly lockEntry?: LockEntry;

  /** Installation scope */
  readonly scope: InstallScope;
}

// ============================================================
// REMOVE
// ============================================================

export interface RemoveOptions {
  /** Target agents to remove from. If empty, removes from all agents. */
  readonly agents?: readonly AgentType[];

  /** Scope to remove from */
  readonly scope?: InstallScope;

  /** Working directory */
  readonly cwd?: string;

  /** The cognitive type */
  readonly cognitiveType?: CognitiveType;
}

export interface RemoveResult {
  /** Name of the cognitive that was removed */
  readonly name: string;

  /** Whether the lock entry was removed */
  readonly lockEntryRemoved: boolean;

  /** Per-agent removal results */
  readonly removedFrom: readonly {
    readonly agent: AgentType;
    readonly path: string;
    readonly success: boolean;
  }[];
}

// ============================================================
// UPDATE
// ============================================================

export interface UpdateOptions {
  /** Specific cognitives to update. If empty, checks all. */
  readonly names?: readonly string[];

  /** Working directory */
  readonly cwd?: string;
}

export interface UpdateResult {
  /** Cognitives that were checked for updates */
  readonly checked: readonly UpdateCheckEntry[];

  /** Cognitives that were updated */
  readonly updated: readonly string[];

  /** Cognitives that failed to update */
  readonly failed: readonly { readonly name: string; readonly error: string }[];
}

export interface UpdateCheckEntry {
  /** Cognitive name */
  readonly name: string;

  /** Whether an update is available */
  readonly hasUpdate: boolean;

  /** Current content hash */
  readonly currentHash: string;

  /** Remote content hash (if checked) */
  readonly remoteHash?: string;
}

// ============================================================
// SYNC
// ============================================================

export interface SyncOptions {
  /** Working directory */
  readonly cwd?: string;

  /** Target agents. If empty, syncs all detected agents. */
  readonly agents?: readonly AgentType[];
}

export interface SyncResult {
  /** Cognitives that were re-linked/copied to agents */
  readonly synced: readonly {
    readonly name: string;
    readonly agent: AgentType;
    readonly result: InstallResult;
  }[];

  /** Orphaned entries (in lock file but not on disk) */
  readonly orphaned: readonly string[];
}
```

---

## 9. Category Types (`types/category.ts`)

```typescript
/**
 * A category (department) for organizing cognitives.
 * Categories are an SDK concept -- individual agents may not support them.
 */
export interface Category {
  /** Machine-readable slug (e.g., "planning", "qa", "frontend") */
  readonly slug: string;

  /** Human-readable display name */
  readonly displayName: string;

  /** Optional description */
  readonly description?: string;
}

/**
 * Maps a cognitive to its category.
 * Categories are stored in the canonical .agents/<type>/<category>/<cognitive>/ structure
 * but flattened when installing to agents that don't support categories.
 */
export interface CategoryMapping {
  /** The cognitive name */
  readonly cognitiveName: string;

  /** The assigned category slug */
  readonly category: string;
}

/**
 * Predefined categories (extensible by consumers).
 */
export const DEFAULT_CATEGORIES = {
  planning:  { slug: 'planning',  displayName: 'Planning' },
  qa:        { slug: 'qa',        displayName: 'QA' },
  growth:    { slug: 'growth',    displayName: 'Growth' },
  frontend:  { slug: 'frontend',  displayName: 'Frontend' },
  backend:   { slug: 'backend',   displayName: 'Backend' },
  devops:    { slug: 'devops',    displayName: 'DevOps' },
  security:  { slug: 'security',  displayName: 'Security' },
  general:   { slug: 'general',   displayName: 'General' },
} as const satisfies Record<string, Category>;
```

---

## 10. Config Types (`types/config.ts`)

```typescript
import type { AgentConfig } from './agent.js';
import type { HostProvider } from './provider.js';

/**
 * Filesystem adapter interface for testability.
 * All SDK filesystem I/O goes through this interface.
 */
export interface FileSystemAdapter {
  readFile(path: string, encoding: 'utf-8'): Promise<string>;
  writeFile(path: string, content: string, encoding: 'utf-8'): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string, options: { withFileTypes: true }): Promise<Dirent[]>;
  stat(path: string): Promise<FsStats>;
  lstat(path: string): Promise<FsStats>;
  symlink(target: string, path: string): Promise<void>;
  readlink(path: string): Promise<string>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  copyDirectory(source: string, target: string): Promise<void>;
}

/** Minimal stat result */
export interface FsStats {
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

/** Minimal directory entry */
export interface Dirent {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

/**
 * Complete SDK configuration.
 */
export interface SDKConfig {
  /** Base directory for canonical cognitive storage. Default: ".agents" */
  readonly agentsDir: string;

  /** Lock file name. Default: ".cognit-lock.json" */
  readonly lockFileName: string;

  /** Working directory. Default: process.cwd() */
  readonly cwd: string;

  /** Home directory for global installs. Default: os.homedir() */
  readonly homeDir: string;

  /** Filesystem adapter */
  readonly fs: FileSystemAdapter;

  /** Git configuration */
  readonly git: Readonly<GitConfig>;

  /** Provider configuration */
  readonly providers: Readonly<ProviderConfig>;

  /** Agent configuration */
  readonly agents: Readonly<AgentRegistryConfig>;

  /** Telemetry configuration */
  readonly telemetry: Readonly<TelemetryConfig>;
}

export interface GitConfig {
  /** Clone timeout in ms. Default: 30000 */
  readonly cloneTimeoutMs: number;
  /** Shallow clone depth. Default: 1 */
  readonly depth: number;
}

export interface ProviderConfig {
  /** GitHub token for API calls. Auto-detected if not provided. */
  readonly githubToken?: string;
  /** Custom providers to register */
  readonly custom: readonly HostProvider[];
}

export interface AgentRegistryConfig {
  /** Path to directory containing agent YAML definitions */
  readonly definitionsPath?: string;
  /** Additional agent configs to register at runtime */
  readonly additional: readonly AgentConfig[];
}

export interface TelemetryConfig {
  /** Enable/disable telemetry. Default: true */
  readonly enabled: boolean;
  /** Custom telemetry endpoint */
  readonly endpoint?: string;
}
```

---

## 11. Event Types (`types/events.ts`)

```typescript
import type { AgentType, AgentDetectionResult } from './agent.js';
import type { CognitiveType, CognitiveRef } from './cognitive.js';
import type { InstallMode, InstallResult } from './installer.js';
import type { CognitError } from '../errors/base.js';

/**
 * Complete event map. Keys are event names, values are payload types.
 */
export interface SDKEventMap {
  // -- SDK lifecycle --
  'sdk:initialized': { readonly configHash: string };
  'sdk:error': { readonly error: CognitError };

  // -- Operation lifecycle --
  'operation:start': { readonly operation: string; readonly options: unknown };
  'operation:complete': { readonly operation: string; readonly result: unknown; readonly durationMs: number };
  'operation:error': { readonly operation: string; readonly error: CognitError };

  // -- Discovery --
  'discovery:start': { readonly path: string };
  'discovery:found': { readonly cognitive: CognitiveRef; readonly type: CognitiveType };
  'discovery:complete': { readonly count: number; readonly durationMs: number };

  // -- Provider --
  'provider:fetch:start': { readonly providerId: string; readonly url: string };
  'provider:fetch:complete': { readonly providerId: string; readonly url: string; readonly found: boolean };
  'provider:fetch:error': { readonly providerId: string; readonly url: string; readonly error: string };

  // -- Installer --
  'install:start': { readonly cognitive: string; readonly agent: AgentType; readonly mode: InstallMode };
  'install:symlink': { readonly source: string; readonly target: string };
  'install:copy': { readonly source: string; readonly target: string };
  'install:complete': { readonly cognitive: string; readonly agent: AgentType; readonly result: InstallResult };

  // -- Lock --
  'lock:read': { readonly path: string };
  'lock:write': { readonly path: string; readonly entryCount: number };
  'lock:migrate': { readonly fromVersion: number; readonly toVersion: number };

  // -- Git --
  'git:clone:start': { readonly url: string };
  'git:clone:complete': { readonly url: string; readonly path: string; readonly durationMs: number };
  'git:clone:error': { readonly url: string; readonly error: string };

  // -- Agent detection --
  'agent:detect:start': Record<string, never>;
  'agent:detect:found': { readonly agent: AgentType; readonly displayName: string };
  'agent:detect:complete': { readonly results: readonly AgentDetectionResult[]; readonly durationMs: number };

  // -- Progress (generic) --
  'progress:start': { readonly id: string; readonly message: string; readonly total?: number };
  'progress:update': { readonly id: string; readonly message: string; readonly current?: number };
  'progress:complete': { readonly id: string; readonly message: string };
}

/**
 * Unsubscribe function returned by event subscriptions.
 */
export type Unsubscribe = () => void;

/**
 * The event bus interface for SDK consumers.
 */
export interface EventBus {
  emit<K extends keyof SDKEventMap>(event: K, payload: SDKEventMap[K]): void;
  on<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;
  once<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;
}
```

---

## 12. Error Hierarchy (`errors/`)

### 12.1 Base Error (`errors/base.ts`)

```typescript
/**
 * Base class for all SDK errors.
 * Every error has a code for programmatic matching and a human-readable message.
 */
export abstract class CognitError extends Error {
  /** Machine-readable error code (e.g., "PROVIDER_FETCH_ERROR") */
  abstract readonly code: string;

  /** The module that produced this error */
  abstract readonly module: string;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = this.constructor.name;
  }

  /** Structured JSON representation */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      module: this.module,
      message: this.message,
      cause: this.cause,
    };
  }
}
```

### 12.2 Provider Errors (`errors/provider.ts`)

```typescript
import { CognitError } from './base.js';

export class ProviderError extends CognitError {
  readonly code = 'PROVIDER_ERROR';
  readonly module = 'providers';

  constructor(
    message: string,
    readonly providerId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class ProviderFetchError extends ProviderError {
  override readonly code = 'PROVIDER_FETCH_ERROR';

  constructor(
    readonly url: string,
    readonly providerId: string,
    readonly statusCode?: number,
    options?: ErrorOptions,
  ) {
    super(`Failed to fetch from ${providerId}: ${url} (${statusCode ?? 'network error'})`, providerId, options);
  }
}

export class ProviderMatchError extends ProviderError {
  override readonly code = 'PROVIDER_MATCH_ERROR';
}
```

### 12.3 Install Errors (`errors/install.ts`)

```typescript
import { CognitError } from './base.js';

export class InstallError extends CognitError {
  readonly code = 'INSTALL_ERROR';
  readonly module = 'installer';
}

export class PathTraversalError extends InstallError {
  override readonly code = 'PATH_TRAVERSAL_ERROR';

  constructor(readonly attemptedPath: string) {
    super(`Path traversal detected: ${attemptedPath}`);
  }
}

export class SymlinkError extends InstallError {
  override readonly code = 'SYMLINK_ERROR';

  constructor(
    readonly source: string,
    readonly target: string,
    options?: ErrorOptions,
  ) {
    super(`Failed to create symlink: ${source} -> ${target}`, options);
  }
}

export class FileWriteError extends InstallError {
  override readonly code = 'FILE_WRITE_ERROR';

  constructor(readonly filePath: string, options?: ErrorOptions) {
    super(`Failed to write file: ${filePath}`, options);
  }
}
```

### 12.4 Discovery Errors (`errors/discovery.ts`)

```typescript
import { CognitError } from './base.js';

export class DiscoveryError extends CognitError {
  readonly code = 'DISCOVERY_ERROR';
  readonly module = 'discovery';
}

export class ParseError extends DiscoveryError {
  override readonly code = 'PARSE_ERROR';

  constructor(readonly filePath: string, options?: ErrorOptions) {
    super(`Failed to parse cognitive file: ${filePath}`, options);
  }
}

export class ScanError extends DiscoveryError {
  override readonly code = 'SCAN_ERROR';

  constructor(readonly directory: string, options?: ErrorOptions) {
    super(`Failed to scan directory: ${directory}`, options);
  }
}
```

### 12.5 Lock Errors (`errors/lock.ts`)

```typescript
import { CognitError } from './base.js';

export class LockError extends CognitError {
  readonly code = 'LOCK_ERROR';
  readonly module = 'lock';
}

export class LockReadError extends LockError {
  override readonly code = 'LOCK_READ_ERROR';

  constructor(readonly lockPath: string, options?: ErrorOptions) {
    super(`Failed to read lock file: ${lockPath}`, options);
  }
}

export class LockWriteError extends LockError {
  override readonly code = 'LOCK_WRITE_ERROR';

  constructor(readonly lockPath: string, options?: ErrorOptions) {
    super(`Failed to write lock file: ${lockPath}`, options);
  }
}

export class LockMigrationError extends LockError {
  override readonly code = 'LOCK_MIGRATION_ERROR';

  constructor(
    readonly fromVersion: number,
    readonly toVersion: number,
    options?: ErrorOptions,
  ) {
    super(`Failed to migrate lock file from v${fromVersion} to v${toVersion}`, options);
  }
}
```

### 12.6 Config Errors (`errors/config.ts`)

```typescript
import { CognitError } from './base.js';

export class ConfigError extends CognitError {
  readonly code = 'CONFIG_ERROR';
  readonly module = 'config';
}

export class InvalidConfigError extends ConfigError {
  override readonly code = 'INVALID_CONFIG_ERROR';

  constructor(readonly field: string, readonly reason: string) {
    super(`Invalid config: ${field} -- ${reason}`);
  }
}
```

### 12.7 Source Errors (`errors/source.ts`)

```typescript
import { CognitError } from './base.js';

export class SourceError extends CognitError {
  readonly code = 'SOURCE_ERROR';
  readonly module = 'source';
}

export class SourceParseError extends SourceError {
  override readonly code = 'SOURCE_PARSE_ERROR';

  constructor(readonly rawSource: string, options?: ErrorOptions) {
    super(`Failed to parse source: "${rawSource}"`, options);
  }
}

export class GitCloneError extends SourceError {
  override readonly code = 'GIT_CLONE_ERROR';

  constructor(
    readonly url: string,
    readonly reason: string,
    options?: ErrorOptions,
  ) {
    super(`Failed to clone ${url}: ${reason}`, options);
  }
}
```

### 12.8 Agent Errors (`errors/agent.ts`)

```typescript
import { CognitError } from './base.js';

export class AgentError extends CognitError {
  readonly code = 'AGENT_ERROR';
  readonly module = 'agents';
}

export class AgentNotFoundError extends AgentError {
  override readonly code = 'AGENT_NOT_FOUND';

  constructor(readonly agentType: string) {
    super(`Agent not found: "${agentType}"`);
  }
}

export class AgentDetectionError extends AgentError {
  override readonly code = 'AGENT_DETECTION_ERROR';

  constructor(readonly agentType: string, options?: ErrorOptions) {
    super(`Failed to detect agent: "${agentType}"`, options);
  }
}
```

---

## 13. Error Code Map (for programmatic handling)

```typescript
/**
 * All possible error codes in the SDK.
 * Consumers can switch on these for structured error handling.
 */
export const ERROR_CODES = {
  // Provider
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_FETCH_ERROR: 'PROVIDER_FETCH_ERROR',
  PROVIDER_MATCH_ERROR: 'PROVIDER_MATCH_ERROR',

  // Installer
  INSTALL_ERROR: 'INSTALL_ERROR',
  PATH_TRAVERSAL_ERROR: 'PATH_TRAVERSAL_ERROR',
  SYMLINK_ERROR: 'SYMLINK_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',

  // Discovery
  DISCOVERY_ERROR: 'DISCOVERY_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  SCAN_ERROR: 'SCAN_ERROR',

  // Lock
  LOCK_ERROR: 'LOCK_ERROR',
  LOCK_READ_ERROR: 'LOCK_READ_ERROR',
  LOCK_WRITE_ERROR: 'LOCK_WRITE_ERROR',
  LOCK_MIGRATION_ERROR: 'LOCK_MIGRATION_ERROR',

  // Config
  CONFIG_ERROR: 'CONFIG_ERROR',
  INVALID_CONFIG_ERROR: 'INVALID_CONFIG_ERROR',

  // Source
  SOURCE_ERROR: 'SOURCE_ERROR',
  SOURCE_PARSE_ERROR: 'SOURCE_PARSE_ERROR',
  GIT_CLONE_ERROR: 'GIT_CLONE_ERROR',

  // Agent
  AGENT_ERROR: 'AGENT_ERROR',
  AGENT_NOT_FOUND: 'AGENT_NOT_FOUND',
  AGENT_DETECTION_ERROR: 'AGENT_DETECTION_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
```

---

## 14. Type Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| `CognitiveType` as string union | Yes | Generated from YAML, extensible, no runtime cost |
| Branded types for IDs | Yes, for `AgentName`, `CognitiveName`, `SafeName`, `SourceIdentifier` | Prevents mixing string types across domains |
| `readonly` on all interface properties | Yes | SDK returns immutable data. Mutations go through methods. |
| Error hierarchy with abstract base | Yes | Enables `instanceof` matching while enforcing `code` + `module` |
| `Result<T, E>` for expected failures | Yes | Explicit, no try/catch needed, composable |
| No `any` anywhere | Strict | Only `unknown` at JSON deserialization boundaries, immediately narrowed |
| `Cognitive.type` required (not optional) | Yes | Existing code uses optional `cognitiveType` defaulting to 'skill'. New SDK makes it explicit. |
| Separate `CognitiveRef` from `Cognitive` | Yes | Lightweight references for events and list results without carrying content |
| Unified `InstallRequest` discriminated union | Yes | Replaces 3 separate install functions in existing code |
| `const maps` over enums | Yes | Better type inference, tree-shakeable, no TypeScript enum pitfalls |
| `satisfies` for const assertions | Yes | Ensures the const object matches the expected shape while preserving literal types |
