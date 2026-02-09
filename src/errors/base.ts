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
