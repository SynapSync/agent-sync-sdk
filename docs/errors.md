# Error Handling

The `@synapsync/agent-sync-sdk` uses a structured error hierarchy rooted in the `CognitError` base class. All SDK errors carry a machine-readable `code` and a `module` string that identifies the subsystem where the error originated. Errors integrate with the [Result type](./type-system.md#resultt-e) for explicit, type-safe error handling.

---

## CognitError Base Class

```typescript
abstract class CognitError extends Error {
  abstract readonly code: string;
  abstract readonly module: string;

  constructor(message: string, options?: ErrorOptions);

  toJSON(): Record<string, unknown>;
}
```

| Property | Description |
|----------|-------------|
| `code` | Machine-readable error code (e.g., `'PROVIDER_FETCH_ERROR'`). Unique across the SDK. |
| `module` | Subsystem where the error originated (e.g., `'providers'`, `'installer'`, `'lock'`). |
| `message` | Human-readable error description (inherited from `Error`). |
| `cause` | Optional underlying cause (via `ErrorOptions`, inherited from `Error`). |

The `toJSON()` method returns a plain object with `code`, `module`, `message`, and `cause` fields, suitable for serialization and logging.

All SDK errors extend `CognitError`. You can use `instanceof CognitError` to catch any SDK error.

---

## Error Hierarchy

### Config Errors

**Module:** `'config'`

| Class | Code | Constructor | Description |
|-------|------|-------------|-------------|
| `ConfigError` | `CONFIG_ERROR` | `(message: string)` | General configuration error. |
| `InvalidConfigError` | `INVALID_CONFIG_ERROR` | `(field: string, reason: string)` | A specific configuration field has an invalid value. The error message includes the field name and the reason it is invalid. |

> **Note:** `ConfigValidationError` is exported as an alias for `InvalidConfigError`.

### Provider Errors

**Module:** `'providers'`

| Class | Code | Constructor | Description |
|-------|------|-------------|-------------|
| `ProviderError` | `PROVIDER_ERROR` | `(message: string, providerId: string, options?: ErrorOptions)` | General provider error. The `providerId` identifies which provider failed. |
| `ProviderFetchError` | `PROVIDER_FETCH_ERROR` | `(url: string, providerId: string, statusCode?: number, options?: ErrorOptions)` | Failed to fetch from a provider. Includes the URL and optional HTTP status code. |
| `ProviderMatchError` | `PROVIDER_MATCH_ERROR` | _(inherits from ProviderError)_ | No provider matched the given source string. |
| `NoCognitivesFoundError` | `NO_COGNITIVES_FOUND` | `(source: string, providerId: string)` | A provider matched the source but found no cognitives at the location. |

### Install Errors

**Module:** `'installer'`

| Class | Code | Constructor | Description |
|-------|------|-------------|-------------|
| `InstallError` | `INSTALL_ERROR` | `(message: string)` | General installation error. |
| `PathTraversalError` | `PATH_TRAVERSAL_ERROR` | `(attemptedPath: string)` | The resolved installation path attempts to escape the allowed directory (directory traversal attack prevention). |
| `SymlinkError` | `SYMLINK_ERROR` | `(source: string, target: string, options?: ErrorOptions)` | Failed to create a symbolic link. Includes the source and target paths. |
| `FileWriteError` | `FILE_WRITE_ERROR` | `(filePath: string, options?: ErrorOptions)` | Failed to write a file during installation. |
| `EloopError` | `ELOOP_ERROR` | `(symlinkPath: string)` | Detected a symlink loop (too many levels of symbolic links). |

### Lock Errors

**Module:** `'lock'`

| Class | Code | Constructor | Description |
|-------|------|-------------|-------------|
| `LockError` | `LOCK_ERROR` | `(message: string)` | General lock file error. |
| `LockReadError` | `LOCK_READ_ERROR` | `(lockPath: string, options?: ErrorOptions)` | Failed to read or parse the lock file. |
| `LockWriteError` | `LOCK_WRITE_ERROR` | `(lockPath: string, options?: ErrorOptions)` | Failed to write the lock file. |
| `LockMigrationError` | `LOCK_MIGRATION_ERROR` | `(fromVersion: number, toVersion: number, options?: ErrorOptions)` | Failed to migrate the lock file from one version to another. |

> **Aliases:**
> - `LockCorruptedError` is exported as an alias for `LockReadError`.
> - `MigrationError` is exported as an alias for `LockMigrationError`.

### Discovery Errors

**Module:** `'discovery'`

| Class | Code | Constructor | Description |
|-------|------|-------------|-------------|
| `DiscoveryError` | `DISCOVERY_ERROR` | `(message: string)` | General discovery error. |
| `ParseError` | `PARSE_ERROR` | `(filePath: string, options?: ErrorOptions)` | Failed to parse a cognitive file (invalid frontmatter, missing required fields, etc.). |
| `ScanError` | `SCAN_ERROR` | `(directory: string, options?: ErrorOptions)` | Failed to scan a directory for cognitives. |
| `ValidationError` | `VALIDATION_ERROR` | `(field: string, reason: string)` | A discovered cognitive failed validation. |

### Operation Errors

**Module:** `'operations'`

| Class | Code | Constructor | Description |
|-------|------|-------------|-------------|
| `OperationError` | `OPERATION_ERROR` | `(message: string)` | General operation error. |
| `ConflictError` | `CONFLICT_ERROR` | `(cognitiveName: string, existingSource: string)` | A cognitive with the same name is already installed from a different source. |

### Source Errors

**Module:** `'source'`

| Class | Code | Constructor | Description |
|-------|------|-------------|-------------|
| `SourceError` | `SOURCE_ERROR` | `(message: string)` | General source-handling error. |
| `SourceParseError` | `SOURCE_PARSE_ERROR` | `(rawSource: string, options?: ErrorOptions)` | Failed to parse a source string into a recognized format. |
| `GitCloneError` | `GIT_CLONE_ERROR` | `(url: string, reason: string, options?: ErrorOptions)` | A git clone operation failed. Includes the URL and the reason for failure. |

> **Alias:** `InvalidSourceError` is exported as an alias for `SourceParseError`.

---

## ERROR_CODES Map

All error codes are collected in the `ERROR_CODES` constant, exported from the package root. This is useful for matching errors by code string without importing individual error classes.

```typescript
const ERROR_CODES = {
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_FETCH_ERROR: 'PROVIDER_FETCH_ERROR',
  PROVIDER_MATCH_ERROR: 'PROVIDER_MATCH_ERROR',
  NO_COGNITIVES_FOUND: 'NO_COGNITIVES_FOUND',
  INSTALL_ERROR: 'INSTALL_ERROR',
  PATH_TRAVERSAL_ERROR: 'PATH_TRAVERSAL_ERROR',
  SYMLINK_ERROR: 'SYMLINK_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  ELOOP_ERROR: 'ELOOP_ERROR',
  DISCOVERY_ERROR: 'DISCOVERY_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  SCAN_ERROR: 'SCAN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  LOCK_ERROR: 'LOCK_ERROR',
  LOCK_READ_ERROR: 'LOCK_READ_ERROR',
  LOCK_WRITE_ERROR: 'LOCK_WRITE_ERROR',
  LOCK_MIGRATION_ERROR: 'LOCK_MIGRATION_ERROR',
  CONFIG_ERROR: 'CONFIG_ERROR',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  INVALID_CONFIG_ERROR: 'INVALID_CONFIG_ERROR',
  SOURCE_ERROR: 'SOURCE_ERROR',
  SOURCE_PARSE_ERROR: 'SOURCE_PARSE_ERROR',
  GIT_CLONE_ERROR: 'GIT_CLONE_ERROR',
  OPERATION_ERROR: 'OPERATION_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
} as const;
```

---

## Error Handling Patterns

### Pattern 1: Using the Result Type

The most common pattern. Every SDK method returns a `Result`, so you check `ok` before accessing the value.

```typescript
import { isOk, isErr } from '@synapsync/agent-sync-sdk';

const result = await sdk.add('owner/repo', { agents: ['cursor'], confirmed: true });

if (isOk(result)) {
  console.log('Installed:', result.value.installed.length);
} else {
  console.error(`[${result.error.code}] ${result.error.message}`);
}
```

### Pattern 2: Using unwrap (Throws on Error)

When you prefer exception-based error handling, use `unwrap` to extract the value or throw the `CognitError`.

```typescript
import { unwrap, CognitError } from '@synapsync/agent-sync-sdk';

try {
  const value = unwrap(await sdk.list());
  console.log(value.cognitives);
} catch (e) {
  if (e instanceof CognitError) {
    console.error(`${e.module}/${e.code}: ${e.message}`);
  }
}
```

### Pattern 3: Matching Specific Error Types

Use `instanceof` to handle specific error classes differently.

```typescript
import {
  isErr,
  ProviderFetchError,
  NoCognitivesFoundError,
  ConflictError,
} from '@synapsync/agent-sync-sdk';

const result = await sdk.add('owner/repo', { confirmed: true });

if (isErr(result)) {
  if (result.error instanceof ProviderFetchError) {
    console.error(`Failed to fetch from provider (HTTP ${result.error.statusCode})`);
  } else if (result.error instanceof NoCognitivesFoundError) {
    console.error('No cognitives found at the specified source');
  } else if (result.error instanceof ConflictError) {
    console.error('A cognitive with that name is already installed from a different source');
  } else {
    console.error(`Unexpected error: ${result.error.message}`);
  }
}
```

### Pattern 4: Matching by Error Code

When you do not want to import specific error classes, match on the `code` property using the `ERROR_CODES` map or string literals.

```typescript
import { isErr, ERROR_CODES } from '@synapsync/agent-sync-sdk';

const result = await sdk.add('owner/repo', { confirmed: true });

if (isErr(result)) {
  switch (result.error.code) {
    case ERROR_CODES.CONFLICT_ERROR:
      console.error('Cognitive already installed from a different source');
      break;
    case ERROR_CODES.PROVIDER_FETCH_ERROR:
      console.error('Could not reach the provider');
      break;
    case ERROR_CODES.NO_COGNITIVES_FOUND:
      console.error('No cognitives found at source');
      break;
    default:
      console.error(`[${result.error.code}] ${result.error.message}`);
  }
}
```

### Pattern 5: Matching by Module

Group error handling by subsystem using the `module` property.

```typescript
import { isErr } from '@synapsync/agent-sync-sdk';

const result = await sdk.add('owner/repo', { confirmed: true });

if (isErr(result)) {
  switch (result.error.module) {
    case 'providers':
      console.error('Provider issue:', result.error.message);
      break;
    case 'installer':
      console.error('Installation issue:', result.error.message);
      break;
    case 'lock':
      console.error('Lock file issue:', result.error.message);
      break;
    default:
      console.error(result.error.message);
  }
}
```

### Pattern 6: Logging with toJSON

Serialize errors for structured logging or error reporting.

```typescript
import { isErr } from '@synapsync/agent-sync-sdk';

const result = await sdk.add('owner/repo', { confirmed: true });

if (isErr(result)) {
  // Structured log output
  console.error(JSON.stringify(result.error.toJSON(), null, 2));
  // Output:
  // {
  //   "code": "PROVIDER_FETCH_ERROR",
  //   "module": "providers",
  //   "message": "Failed to fetch from https://github.com/owner/repo",
  //   "cause": { ... }
  // }
}
```

### Pattern 7: Wrapping with Error Cause

When rethrowing or wrapping SDK errors, use the `cause` option to preserve the error chain.

```typescript
import { isErr, OperationError } from '@synapsync/agent-sync-sdk';

const result = await sdk.add('owner/repo', { confirmed: true });

if (isErr(result)) {
  throw new OperationError(`Failed to add cognitives: ${result.error.message}`, {
    cause: result.error,
  });
}
```

---

## See Also

- [Type System](./type-system.md) — `Result<T, E>`, `CognitiveType`, and other types referenced by errors
- [API Reference](./api-reference.md) — SDK methods and their possible error types
