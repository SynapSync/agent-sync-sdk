import { describe, it, expect, beforeEach } from 'vitest';
import { createMemoryFs } from '../../src/fs/memory.js';
import { createCapturingEventBus } from '../../src/events/index.js';
import { resolveConfig } from '../../src/config/index.js';
import { LockFileManagerImpl } from '../../src/lock/manager.js';
import { CURRENT_LOCK_VERSION } from '../../src/lock/schema.js';
import { sourceIdentifier } from '../../src/types/brands.js';
import type { SDKConfig } from '../../src/types/config.js';
import type { LockEntry } from '../../src/types/lock.js';

function makeEntryData(): Omit<LockEntry, 'installedAt' | 'updatedAt'> {
  return {
    source: sourceIdentifier('owner/repo'),
    sourceType: 'github',
    sourceUrl: 'https://github.com/owner/repo',
    contentHash: 'abc123hash',
    cognitiveType: 'skill',
  };
}

describe('LockFileManagerImpl', () => {
  let memFs: ReturnType<typeof createMemoryFs>;
  let eventBus: ReturnType<typeof createCapturingEventBus>;
  let config: SDKConfig;
  let manager: LockFileManagerImpl;

  beforeEach(() => {
    memFs = createMemoryFs();
    eventBus = createCapturingEventBus();
    config = resolveConfig({ cwd: '/test-project', fs: memFs });
    manager = new LockFileManagerImpl(config, eventBus);
  });

  describe('read()', () => {
    it('returns an empty lock file when no file exists', async () => {
      const lock = await manager.read();
      expect(lock.version).toBe(CURRENT_LOCK_VERSION);
      expect(lock.cognitives).toEqual({});
    });

    it('round-trips a written lock file', async () => {
      const entry = makeEntryData();
      await manager.addEntry('test-skill', entry);

      const lock = await manager.read();
      expect(lock.cognitives['test-skill']).toBeDefined();
      expect(lock.cognitives['test-skill']!.source).toBe('owner/repo');
    });
  });

  describe('addEntry()', () => {
    it('adds an entry with installedAt and updatedAt timestamps', async () => {
      await manager.addEntry('my-skill', makeEntryData());

      const entry = await manager.getEntry('my-skill');
      expect(entry).not.toBeNull();
      expect(entry!.source).toBe('owner/repo');
      expect(entry!.installedAt).toBeTruthy();
      expect(entry!.updatedAt).toBeTruthy();
    });
  });

  describe('removeEntry()', () => {
    it('returns true and removes an existing entry', async () => {
      await manager.addEntry('to-remove', makeEntryData());

      const removed = await manager.removeEntry('to-remove');
      expect(removed).toBe(true);

      const entry = await manager.getEntry('to-remove');
      expect(entry).toBeNull();
    });

    it('returns false for a non-existent entry', async () => {
      const removed = await manager.removeEntry('nonexistent');
      expect(removed).toBe(false);
    });
  });

  describe('getEntry()', () => {
    it('returns null for a non-existent key', async () => {
      const entry = await manager.getEntry('nope');
      expect(entry).toBeNull();
    });
  });

  describe('getAllEntries()', () => {
    it('returns all stored entries', async () => {
      await manager.addEntry('skill-a', makeEntryData());
      await manager.addEntry('skill-b', {
        ...makeEntryData(),
        source: sourceIdentifier('other/repo'),
      });

      const entries = await manager.getAllEntries();
      expect(Object.keys(entries)).toHaveLength(2);
      expect(entries['skill-a']).toBeDefined();
      expect(entries['skill-b']).toBeDefined();
    });
  });

  describe('getBySource()', () => {
    it('groups entries by their source identifier', async () => {
      const sameSource = makeEntryData();
      await manager.addEntry('skill-1', sameSource);
      await manager.addEntry('skill-2', sameSource);
      await manager.addEntry('skill-3', {
        ...makeEntryData(),
        source: sourceIdentifier('different/repo'),
      });

      const bySource = await manager.getBySource();
      expect(bySource.size).toBe(2);

      const ownerGroup = bySource.get(sourceIdentifier('owner/repo'));
      expect(ownerGroup).toBeDefined();
      expect(ownerGroup!.names).toContain('skill-1');
      expect(ownerGroup!.names).toContain('skill-2');
    });
  });

  describe('concurrency (write lock)', () => {
    it('concurrent addEntry calls preserve all entries', async () => {
      const entries = Array.from({ length: 10 }, (_, i) => ({
        name: `skill-${i}`,
        data: {
          ...makeEntryData(),
          source: sourceIdentifier(`owner/repo-${i}`),
        },
      }));

      // Fire all addEntry calls concurrently
      await Promise.all(
        entries.map(({ name, data }) => manager.addEntry(name, data)),
      );

      const all = await manager.getAllEntries();
      expect(Object.keys(all)).toHaveLength(10);

      for (const { name } of entries) {
        expect(all[name]).toBeDefined();
      }
    });

    it('concurrent addEntry and removeEntry are serialized', async () => {
      // Pre-populate an entry
      await manager.addEntry('existing', makeEntryData());

      // Concurrently: add a new entry AND remove the existing one
      const [, removed] = await Promise.all([
        manager.addEntry('new-skill', makeEntryData()),
        manager.removeEntry('existing'),
      ]);

      expect(removed).toBe(true);

      const all = await manager.getAllEntries();
      expect(all['existing']).toBeUndefined();
      expect(all['new-skill']).toBeDefined();
    });

    it('concurrent saveLastSelectedAgents and addEntry are serialized', async () => {
      await Promise.all([
        manager.addEntry('skill-a', makeEntryData()),
        manager.saveLastSelectedAgents(['cursor', 'claude-code']),
        manager.addEntry('skill-b', { ...makeEntryData(), source: sourceIdentifier('other/repo') }),
      ]);

      const all = await manager.getAllEntries();
      expect(all['skill-a']).toBeDefined();
      expect(all['skill-b']).toBeDefined();

      const agents = await manager.getLastSelectedAgents();
      expect(agents).toEqual(['cursor', 'claude-code']);
    });

    it('error in one write does not block subsequent writes', async () => {
      // Force a write error by making fs.writeFile throw once
      const originalWriteFile = memFs.writeFile.bind(memFs);
      let shouldFail = true;
      memFs.writeFile = async (...args: Parameters<typeof memFs.writeFile>) => {
        if (shouldFail) {
          shouldFail = false;
          throw new Error('Simulated write failure');
        }
        return originalWriteFile(...args);
      };

      // First addEntry should fail
      await expect(manager.addEntry('fail-skill', makeEntryData())).rejects.toThrow('Simulated write failure');

      // Second addEntry should succeed (lock released in finally)
      await manager.addEntry('ok-skill', makeEntryData());
      const entry = await manager.getEntry('ok-skill');
      expect(entry).not.toBeNull();
    });
  });

  describe('lastSelectedAgents', () => {
    it('returns undefined when no agents have been saved', async () => {
      const agents = await manager.getLastSelectedAgents();
      expect(agents).toBeUndefined();
    });

    it('round-trips saved agents', async () => {
      await manager.saveLastSelectedAgents(['cursor', 'claude-code']);
      const agents = await manager.getLastSelectedAgents();
      expect(agents).toEqual(['cursor', 'claude-code']);
    });
  });
});
