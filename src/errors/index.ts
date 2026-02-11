// Base
export { CognitError } from './base.js';

// Config
export {
  ConfigError,
  ConfigNotFoundError,
  InvalidConfigError,
  ConfigValidationError,
} from './config.js';

// Provider
export {
  ProviderError,
  ProviderFetchError,
  ProviderMatchError,
  NoCognitivesFoundError,
  ProviderNotImplementedError,
} from './provider.js';

// Install
export {
  InstallError,
  PathTraversalError,
  SymlinkError,
  FileWriteError,
  EloopError,
} from './install.js';

// Lock
export {
  LockError,
  LockReadError,
  LockCorruptedError,
  LockWriteError,
  LockMigrationError,
  MigrationError,
} from './lock.js';

// Discovery
export { DiscoveryError, ParseError, ScanError, ValidationError } from './discovery.js';

// Operation
export { OperationError, ConflictError } from './operation.js';

// Source
export { SourceError, SourceParseError, InvalidSourceError, GitCloneError } from './source.js';

// ---------- Error Code Map ----------

export const ERROR_CODES = {
  // Provider
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_FETCH_ERROR: 'PROVIDER_FETCH_ERROR',
  PROVIDER_MATCH_ERROR: 'PROVIDER_MATCH_ERROR',
  NO_COGNITIVES_FOUND: 'NO_COGNITIVES_FOUND',
  PROVIDER_NOT_IMPLEMENTED: 'PROVIDER_NOT_IMPLEMENTED',

  // Installer
  INSTALL_ERROR: 'INSTALL_ERROR',
  PATH_TRAVERSAL_ERROR: 'PATH_TRAVERSAL_ERROR',
  SYMLINK_ERROR: 'SYMLINK_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  ELOOP_ERROR: 'ELOOP_ERROR',

  // Discovery
  DISCOVERY_ERROR: 'DISCOVERY_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  SCAN_ERROR: 'SCAN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Lock
  LOCK_ERROR: 'LOCK_ERROR',
  LOCK_READ_ERROR: 'LOCK_READ_ERROR',
  LOCK_WRITE_ERROR: 'LOCK_WRITE_ERROR',
  LOCK_MIGRATION_ERROR: 'LOCK_MIGRATION_ERROR',

  // Config
  CONFIG_ERROR: 'CONFIG_ERROR',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  INVALID_CONFIG_ERROR: 'INVALID_CONFIG_ERROR',

  // Source
  SOURCE_ERROR: 'SOURCE_ERROR',
  SOURCE_PARSE_ERROR: 'SOURCE_PARSE_ERROR',
  GIT_CLONE_ERROR: 'GIT_CLONE_ERROR',

  // Operation
  OPERATION_ERROR: 'OPERATION_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
