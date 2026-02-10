import type { CognitiveType } from '../types/cognitive.js';
import { LOCK_VERSION } from '../types/lock.js';
import type { LockFile } from '../types/lock.js';

export const CURRENT_LOCK_VERSION = LOCK_VERSION;

export const SDK_VERSION = '0.1.0' as const;

/**
 * Build a composite lock-file key: `{cognitiveType}:{name}`.
 */
export function makeLockKey(cognitiveType: CognitiveType, name: string): string {
  return `${cognitiveType}:${name}`;
}

/**
 * Decompose a composite lock key back to its parts.
 * Returns `null` when the key is not in the expected `{type}:{name}` format.
 */
export function parseLockKey(
  key: string,
): { cognitiveType: CognitiveType; name: string } | null {
  const idx = key.indexOf(':');
  if (idx === -1) return null;

  const type = key.slice(0, idx);
  const name = key.slice(idx + 1);

  if (!name) return null;

  const validTypes: readonly string[] = ['skill', 'agent', 'prompt', 'rule'];
  if (!validTypes.includes(type)) return null;

  return { cognitiveType: type as CognitiveType, name };
}

/**
 * Create a fresh, empty lock file at the current version.
 */
export function createEmptyLockFile(): LockFile {
  return {
    version: LOCK_VERSION,
    cognitives: {},
  };
}

/**
 * Runtime validation that a parsed JSON value looks like a LockFile.
 * Returns `true` when the shape has the required `version` (number) and
 * `cognitives` (object) properties.
 */
export function validateLockFile(raw: unknown): raw is { version: number; cognitives: Record<string, unknown> } {
  if (raw == null || typeof raw !== 'object') return false;

  const obj = raw as Record<string, unknown>;

  if (typeof obj['version'] !== 'number') return false;
  if (obj['cognitives'] == null || typeof obj['cognitives'] !== 'object' || Array.isArray(obj['cognitives'])) {
    return false;
  }

  return true;
}
