import { describe, it, expect } from 'vitest';
import { createCapturingEventBus } from '../../src/events/index.js';
import { readWithMigration } from '../../src/lock/migration.js';
import { CURRENT_LOCK_VERSION } from '../../src/lock/schema.js';

describe('readWithMigration()', () => {
  it('passes through a valid v5 lock file unchanged', () => {
    const eventBus = createCapturingEventBus();
    const v5 = {
      version: 5,
      cognitives: {
        'test-skill': {
          source: 'owner/repo',
          sourceType: 'github',
          sourceUrl: 'https://github.com/owner/repo',
          contentHash: 'abc123',
          cognitiveType: 'skill',
          installedAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        },
      },
    };

    const result = readWithMigration(v5, eventBus);

    expect(result.version).toBe(CURRENT_LOCK_VERSION);
    expect(result.cognitives['test-skill']).toBeDefined();
    // No migration events should be emitted
    const migrateEvents = eventBus.events.filter((e) => e.event === 'lock:migrate');
    expect(migrateEvents.length).toBe(0);
  });

  it('migrates a v3 lock file with skills to v5 cognitives', () => {
    const eventBus = createCapturingEventBus();
    const v3 = {
      version: 3,
      skills: {
        'react-hooks': {
          source: 'owner/repo',
          sourceType: 'github',
          installedAt: '2024-06-01T00:00:00.000Z',
          updatedAt: '2024-06-15T00:00:00.000Z',
        },
      },
      lastSelectedAgents: ['cursor'],
    };

    const result = readWithMigration(v3, eventBus);

    expect(result.version).toBe(CURRENT_LOCK_VERSION);
    const entry = result.cognitives['react-hooks'];
    expect(entry).toBeDefined();
    expect(entry!.cognitiveType).toBe('skill');
    expect(entry!.sourceUrl).toBe('');
    expect(entry!.contentHash).toBe('');
    expect(entry!.installedAt).toBe('2024-06-01T00:00:00.000Z');
    expect(result.lastSelectedAgents).toEqual(['cursor']);

    // Should emit migration event
    const migrateEvents = eventBus.events.filter((e) => e.event === 'lock:migrate');
    expect(migrateEvents.length).toBe(1);
    expect((migrateEvents[0]!.payload as { fromVersion: number }).fromVersion).toBe(3);
  });

  it('migrates a v4 lock file to v5', () => {
    const eventBus = createCapturingEventBus();
    const v4 = {
      version: 4,
      cognitives: {
        'test-agent': {
          source: 'org/tool',
          sourceType: 'github',
          sourceUrl: 'https://github.com/org/tool',
          cognitivePath: '/agents/test',
          cognitiveType: 'agent',
          cognitiveFolderHash: 'hash456',
          installedAt: '2024-08-01T00:00:00.000Z',
          updatedAt: '2024-08-10T00:00:00.000Z',
        },
      },
      lastSelectedAgents: ['claude-code'],
      dismissed: { findSkillsPrompt: true },
    };

    const result = readWithMigration(v4, eventBus);

    expect(result.version).toBe(CURRENT_LOCK_VERSION);
    const entry = result.cognitives['test-agent'];
    expect(entry).toBeDefined();
    expect(entry!.cognitiveType).toBe('agent');
    expect(entry!.contentHash).toBe('hash456');
    expect(entry!.cognitivePath).toBe('/agents/test');
    expect(result.lastSelectedAgents).toEqual(['claude-code']);

    const migrateEvents = eventBus.events.filter((e) => e.event === 'lock:migrate');
    expect(migrateEvents.length).toBe(1);
  });

  it('returns empty lock file for unknown version', () => {
    const eventBus = createCapturingEventBus();
    const unknownVersion = { version: 99, cognitives: {} };

    const result = readWithMigration(unknownVersion, eventBus);

    expect(result.version).toBe(CURRENT_LOCK_VERSION);
    expect(result.cognitives).toEqual({});
  });

  it('returns empty lock file for corrupted data', () => {
    const eventBus = createCapturingEventBus();

    expect(readWithMigration(null, eventBus).cognitives).toEqual({});
    expect(readWithMigration(undefined, eventBus).cognitives).toEqual({});
    expect(readWithMigration('not an object', eventBus).cognitives).toEqual({});
    expect(readWithMigration({ noVersion: true }, eventBus).cognitives).toEqual({});
  });
});
