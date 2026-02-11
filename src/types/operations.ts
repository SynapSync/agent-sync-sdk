import type { AgentType } from './agent.js';
import type { CognitiveType } from './cognitive.js';
import type { InstallMode, InstallScope } from './install.js';

// ---------- Add ----------

export interface AddOptions {
  readonly agents: readonly AgentType[];
  readonly cognitiveType?: CognitiveType;
  readonly cognitiveNames?: readonly string[];
  readonly subpath?: string;
  readonly mode: InstallMode;
  readonly scope: InstallScope;
  readonly category: string;
  readonly confirmed: boolean;
}

export interface AddResult {
  readonly success: boolean;
  readonly installed: readonly InstalledCognitiveInfo[];
  readonly failed: readonly FailedInstallInfo[];
  readonly available?: readonly AvailableCognitive[];
  readonly source: SourceInfo;
  readonly message: string;
}

export interface InstalledCognitiveInfo {
  readonly name: string;
  readonly cognitiveType: CognitiveType;
  readonly agents: readonly AgentInstallInfo[];
}

export interface AgentInstallInfo {
  readonly agent: AgentType;
  readonly path: string;
  readonly mode: InstallMode;
  readonly symlinkFailed?: boolean;
}

export interface FailedInstallInfo {
  readonly name: string;
  readonly agent: AgentType;
  readonly error: string;
}

export interface AvailableCognitive {
  readonly name: string;
  readonly description: string;
  readonly cognitiveType: CognitiveType;
}

export interface SourceInfo {
  readonly kind: string;
  readonly identifier: string;
  readonly url: string;
  readonly provider: string;
}

// ---------- Remove ----------

export interface RemoveOptions {
  readonly agents?: readonly AgentType[];
  readonly scope: InstallScope;
  readonly confirmed: boolean;
}

export interface RemoveResult {
  readonly success: boolean;
  readonly removed: readonly RemovedCognitiveInfo[];
  readonly notFound: readonly string[];
  readonly message: string;
}

export interface RemovedCognitiveInfo {
  readonly name: string;
  readonly agents: readonly string[];
}

// ---------- List ----------

export interface ListOptions {
  readonly scope: InstallScope;
  readonly cognitiveType?: CognitiveType;
  readonly agent?: AgentType;
}

export interface ListResult {
  readonly success: boolean;
  readonly cognitives: readonly ListedCognitive[];
  readonly count: number;
  readonly message: string;
}

export interface ListedCognitive {
  readonly name: string;
  readonly cognitiveType: CognitiveType;
  readonly source: string;
  readonly sourceUrl: string;
  readonly installedAt: string;
  readonly updatedAt: string;
  readonly contentHash: string;
}

// ---------- Find ----------

export interface FindOptions {
  readonly cognitiveType?: CognitiveType;
  readonly limit?: number;
}

export interface FindResult {
  readonly success: boolean;
  readonly results: readonly DiscoveredCognitive[];
  readonly total: number;
  readonly source: string;
  readonly message: string;
}

export interface DiscoveredCognitive {
  readonly name: string;
  readonly description: string;
  readonly cognitiveType: CognitiveType;
  readonly installed: boolean;
}

// ---------- Update ----------

export interface UpdateOptions {
  readonly names?: readonly string[];
  readonly scope: InstallScope;
  readonly checkOnly: boolean;
  readonly confirmed: boolean;
}

export interface UpdateResult {
  readonly success: boolean;
  readonly updates: readonly UpdateInfo[];
  readonly upToDate: readonly string[];
  readonly errors: readonly UpdateError[];
  readonly message: string;
}

export interface UpdateInfo {
  readonly name: string;
  readonly currentHash: string;
  readonly newHash: string;
  readonly applied: boolean;
}

export interface UpdateError {
  readonly name: string;
  readonly error: string;
}

// ---------- Sync ----------

export interface SyncOptions {
  readonly scope: InstallScope;
  readonly dryRun: boolean;
  readonly confirmed: boolean;
}

export interface SyncResult {
  readonly success: boolean;
  readonly issues: readonly SyncIssue[];
  readonly fixed: number;
  readonly remaining: number;
  readonly message: string;
}

export type SyncIssueType = 'missing_files' | 'broken_symlink' | 'orphaned_files' | 'lock_mismatch';

export interface SyncIssue {
  readonly name: string;
  readonly type: SyncIssueType;
  readonly description: string;
  readonly fixed: boolean;
}

// ---------- Check ----------

export interface CheckOptions {
  readonly scope: InstallScope;
}

export interface CheckResult {
  readonly success: boolean;
  readonly healthy: readonly string[];
  readonly issues: readonly CheckIssue[];
  readonly message: string;
}

export type CheckSeverity = 'error' | 'warning';
export type CheckIssueType =
  | 'missing_canonical'
  | 'missing_agent_dir'
  | 'broken_symlink'
  | 'hash_mismatch'
  | 'lock_orphan'
  | 'filesystem_orphan';

export interface CheckIssue {
  readonly name: string;
  readonly type: CheckIssueType;
  readonly description: string;
  readonly severity: CheckSeverity;
}

// ---------- Init ----------

export interface InitOptions {
  readonly outputDir?: string;
  readonly description?: string;
}

export interface InitResult {
  readonly success: boolean;
  readonly path: string;
  readonly files: readonly string[];
  readonly cognitiveType: CognitiveType;
  readonly message: string;
}
