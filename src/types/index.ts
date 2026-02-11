// Branded types
export type { AgentName, CognitiveName, SafeName, SourceIdentifier } from './brands.js';
export {
  agentName,
  cognitiveName,
  safeName,
  sourceIdentifier,
  isAgentName,
  isCognitiveName,
} from './brands.js';

// Result
export type { Result } from './result.js';
export { ok, err, unwrap, mapResult, isOk, isErr } from './result.js';

// Cognitive
export type {
  CognitiveType,
  CognitiveTypeConfig,
  Cognitive,
  Skill,
  Prompt,
  Rule,
  AgentCognitive,
  RemoteCognitive,
  CognitiveRef,
} from './cognitive.js';
export {
  COGNITIVE_TYPE_CONFIGS,
  COGNITIVE_SUBDIRS,
  COGNITIVE_FILE_NAMES,
  AGENTS_DIR,
  isCognitiveType,
} from './cognitive.js';

// Agent
export type {
  AgentType,
  AgentDirConfig,
  AgentConfig,
  AgentDetectionResult,
  AgentRegistry,
} from './agent.js';

// Install
export type {
  InstallMode,
  InstallScope,
  InstallTarget,
  InstallResult,
  InstallRequest,
  WellKnownCognitive,
  Installer,
  InstallerOptions,
} from './install.js';

// Lock
export type { LockEntry, LockFile, LockManager } from './lock.js';
export { LOCK_VERSION } from './lock.js';

// Source / Provider
export type {
  SourceDescriptor,
  ParsedSource,
  ProviderMatch,
  HostProvider,
  ProviderFetchOptions,
  ProviderRegistry,
  SourceParser,
  GitClient,
  GitCloneOptions,
} from './source.js';

// Events
export type { SDKEventMap, OperationName, Unsubscribe, EventBus } from './events.js';

// Config
export type {
  FileSystemAdapter,
  FsStats,
  Dirent,
  SDKConfig,
  GitConfig,
  ProviderConfig,
  AgentRegistryConfig,
  EnvReader,
  Category,
  CategoryMapping,
} from './config.js';
export { DEFAULT_CATEGORIES } from './config.js';
