import { normalize, resolve } from 'node:path';

const MAX_NAME_LENGTH = 255;
const FALLBACK_NAME = 'unnamed-cognitive';

/**
 * Sanitize a cognitive name to a kebab-case, filesystem-safe string.
 * - Rejects path traversal sequences, slashes, and null bytes
 * - Strips non-alphanumeric/non-hyphen characters
 * - Strips leading/trailing dots and hyphens
 * - Limits to 255 characters
 */
export function sanitizeName(name: string): string {
  if (!name || name.includes('\0') || name.includes('/') || name.includes('\\')) {
    return FALLBACK_NAME;
  }

  if (name.includes('../') || name.includes('./')) {
    return FALLBACK_NAME;
  }

  // Lowercase and replace non-alphanumeric (except hyphen) with hyphens
  let sanitized = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-');

  // Strip leading/trailing dots and hyphens
  sanitized = sanitized.replace(/^[.\-]+/, '').replace(/[.\-]+$/, '');

  if (sanitized.length === 0) {
    return FALLBACK_NAME;
  }

  if (sanitized.length > MAX_NAME_LENGTH) {
    sanitized = sanitized.slice(0, MAX_NAME_LENGTH);
  }

  return sanitized;
}

/**
 * Check that a target path is safely contained within a base path.
 * Prevents path traversal attacks.
 */
export function isPathSafe(basePath: string, targetPath: string): boolean {
  const resolvedBase = resolve(normalize(basePath));
  const resolvedTarget = resolve(normalize(targetPath));
  return resolvedTarget === resolvedBase || resolvedTarget.startsWith(resolvedBase + '/');
}
