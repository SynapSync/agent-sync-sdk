import { CognitError } from './base.js';

export class LockError extends CognitError {
  readonly code: string = 'LOCK_ERROR';
  readonly module = 'lock';
}

export class LockReadError extends LockError {
  override readonly code = 'LOCK_READ_ERROR';

  constructor(readonly lockPath: string, options?: ErrorOptions) {
    super(`Failed to read lock file: ${lockPath}`, options);
  }
}

/** Alias for corrupted lock files */
export { LockReadError as LockCorruptedError };

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

/** Alias for naming consistency */
export { LockMigrationError as MigrationError };
