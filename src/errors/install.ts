import { CognitError } from './base.js';

export class InstallError extends CognitError {
  readonly code: string = 'INSTALL_ERROR';
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

  constructor(
    readonly filePath: string,
    options?: ErrorOptions,
  ) {
    super(`Failed to write file: ${filePath}`, options);
  }
}

export class EloopError extends InstallError {
  override readonly code = 'ELOOP_ERROR';

  constructor(readonly symlinkPath: string) {
    super(`Circular symlink detected: ${symlinkPath}`);
  }
}
