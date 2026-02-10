import { LOCK_VERSION } from '../types/lock.js';
import type { LockFile, LockEntry } from '../types/lock.js';
import type { CognitiveType } from '../types/cognitive.js';
import type { EventBus } from '../types/events.js';
import { sourceIdentifier } from '../types/brands.js';
import { createEmptyLockFile, validateLockFile } from './schema.js';

// ----------------------------------------------------------------
// Internal old-format types (NOT exported)
// ----------------------------------------------------------------

interface LockFileV3 {
  version: 3;
  skills: Record<string, {
    source: string;
    sourceType: string;
    installedAt: string;
    updatedAt: string;
  }>;
  lastSelectedAgents?: string[];
}

interface LockFileV4 {
  version: 4;
  cognitives: Record<string, {
    source: string;
    sourceType: string;
    sourceUrl: string;
    cognitivePath?: string;
    cognitiveType?: string;
    cognitiveFolderHash: string;
    installedAt: string;
    updatedAt: string;
  }>;
  lastSelectedAgents?: string[];
  dismissed?: { findSkillsPrompt?: boolean };
}

// ----------------------------------------------------------------
// Migration helpers
// ----------------------------------------------------------------

function migrateFromV3(old: LockFileV3, eventBus: EventBus): LockFile {
  eventBus.emit('lock:migrate', { fromVersion: 3, toVersion: LOCK_VERSION });

  const cognitives: Record<string, LockEntry> = {};

  for (const [name, skill] of Object.entries(old.skills)) {
    if (!skill) continue;
    cognitives[name] = {
      source: sourceIdentifier(skill.source),
      sourceType: skill.sourceType,
      sourceUrl: '',
      contentHash: '',
      cognitiveType: 'skill' as CognitiveType,
      installedAt: skill.installedAt,
      updatedAt: skill.updatedAt,
    };
  }

  return {
    version: LOCK_VERSION,
    cognitives,
    ...(old.lastSelectedAgents != null && { lastSelectedAgents: old.lastSelectedAgents }),
  };
}

function migrateFromV4(old: LockFileV4, eventBus: EventBus): LockFile {
  eventBus.emit('lock:migrate', { fromVersion: 4, toVersion: LOCK_VERSION });

  const cognitives: Record<string, LockEntry> = {};

  for (const [name, entry] of Object.entries(old.cognitives)) {
    if (!entry) continue;

    const cogType = (entry.cognitiveType ?? 'skill') as CognitiveType;

    cognitives[name] = {
      source: sourceIdentifier(entry.source),
      sourceType: entry.sourceType,
      sourceUrl: entry.sourceUrl ?? '',
      contentHash: entry.cognitiveFolderHash ?? '',
      cognitiveType: cogType,
      installedAt: entry.installedAt,
      updatedAt: entry.updatedAt,
      ...(entry.cognitivePath != null && { cognitivePath: entry.cognitivePath }),
    };
  }

  return {
    version: LOCK_VERSION,
    cognitives,
    ...(old.lastSelectedAgents != null && { lastSelectedAgents: old.lastSelectedAgents }),
  };
}

// ----------------------------------------------------------------
// Public API
// ----------------------------------------------------------------

/**
 * Given a parsed JSON value, detect its version and migrate to the current
 * `LockFile` format if necessary.  Returns `createEmptyLockFile()` when
 * the data is unrecoverable.
 */
export function readWithMigration(parsed: unknown, eventBus: EventBus): LockFile {
  try {
    if (parsed == null || typeof parsed !== 'object') {
      return createEmptyLockFile();
    }

    const obj = parsed as Record<string, unknown>;
    const version = obj['version'];

    if (typeof version !== 'number') {
      return createEmptyLockFile();
    }

    if (version === LOCK_VERSION) {
      if (!validateLockFile(parsed)) {
        return createEmptyLockFile();
      }
      return parsed as LockFile;
    }

    if (version === 3) {
      return migrateFromV3(parsed as unknown as LockFileV3, eventBus);
    }

    if (version === 4) {
      return migrateFromV4(parsed as unknown as LockFileV4, eventBus);
    }

    // Unknown version — return empty
    return createEmptyLockFile();
  } catch {
    return createEmptyLockFile();
  }
}
