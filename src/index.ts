/**
 * @synapsync/agent-sync-sdk — Public API entry point.
 *
 * Only types, error classes, result helpers, brand constructors,
 * and the SDK factory are exported here. Internal implementations
 * (InstallerImpl, LockFileManagerImpl, AgentRegistryImpl, etc.)
 * are NOT part of the public surface.
 */

// ---------- Main entry point ----------

export { createAgentSyncSDK } from './sdk.js';
export type { AgentSyncSDK } from './sdk.js';

// ---------- Types (re-export from types barrel) ----------

export type {
  // Cognitive types
  Cognitive, CognitiveType, CognitiveTypeConfig, CognitiveRef,
  Skill, Prompt, Rule, AgentCognitive,
  RemoteCognitive,
  // Agent types
  AgentConfig, AgentType, AgentDirConfig, AgentDetectionResult,
  AgentRegistry,
  // Provider types
  HostProvider, ProviderMatch, ProviderRegistry,
  SourceDescriptor, SourceParser,
  // Installer types
  InstallMode, InstallScope, InstallTarget, InstallResult,
  Installer,
  // Lock types
  LockFile, LockEntry, LockManager,
  // Config types
  SDKConfig, FileSystemAdapter,
  // Event types
  SDKEventMap, Unsubscribe, EventBus,
  // Result type
  Result,
  // Branded types
  AgentName, CognitiveName, SafeName, SourceIdentifier,
  // Category types
  Category, CategoryMapping,
} from './types/index.js';

// ---------- Operation types ----------

export type {
  AddOptions, AddResult,
  RemoveOptions, RemoveResult,
  ListOptions, ListResult,
  FindOptions, FindResult,
  UpdateOptions, UpdateResult,
  SyncOptions, SyncResult,
  CheckOptions, CheckResult,
  InitOptions, InitResult,
} from './types/operations.js';

// ---------- Errors (for consumers to catch/match) ----------

export {
  CognitError,
  ConfigError, InvalidConfigError,
  ProviderError, ProviderFetchError, ProviderMatchError, NoCognitivesFoundError,
  InstallError, PathTraversalError, SymlinkError,
  DiscoveryError, ParseError,
  LockError, LockReadError, LockWriteError, LockMigrationError,
  OperationError, ConflictError,
  SourceError, SourceParseError, GitCloneError,
} from './errors/index.js';

// ---------- Result helpers ----------

export { ok, err, isOk, isErr, unwrap, mapResult } from './types/result.js';

// ---------- Brand constructors (for consumers creating branded values) ----------

export { agentName, cognitiveName, safeName, sourceIdentifier } from './types/brands.js';

// ---------- FS adapters (for consumers who want custom FS) ----------

export { NodeFileSystem } from './fs/node.js';
export { createMemoryFs } from './fs/memory.js';
