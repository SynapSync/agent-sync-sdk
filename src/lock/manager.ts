import { join } from 'node:path';
import type { SDKConfig } from '../types/config.js';
import type { EventBus } from '../types/events.js';
import type { LockFile, LockEntry, LockManager } from '../types/lock.js';
import type { SourceIdentifier } from '../types/brands.js';
import { writeLockFileAtomic } from './atomic.js';
import { createEmptyLockFile } from './schema.js';
import { readWithMigration } from './migration.js';

export class LockFileManagerImpl implements LockManager {
  private readonly lockPath: string;
  private readonly fs: SDKConfig['fs'];
  private readonly eventBus: EventBus;

  constructor(config: SDKConfig, eventBus: EventBus) {
    this.lockPath = join(config.cwd, '.agents', 'cognit', config.lockFileName);
    this.fs = config.fs;
    this.eventBus = eventBus;
  }

  async read(): Promise<LockFile> {
    this.eventBus.emit('lock:read', { path: this.lockPath });

    try {
      const fileExists = await this.fs.exists(this.lockPath);
      if (!fileExists) {
        return createEmptyLockFile();
      }

      const raw = await this.fs.readFile(this.lockPath, 'utf-8');
      const parsed: unknown = JSON.parse(raw);

      return readWithMigration(parsed, this.eventBus);
    } catch {
      return createEmptyLockFile();
    }
  }

  async write(lock: LockFile): Promise<void> {
    await writeLockFileAtomic(this.lockPath, lock, this.fs);
    this.eventBus.emit('lock:write', {
      path: this.lockPath,
      entryCount: Object.keys(lock.cognitives).length,
    });
  }

  async addEntry(
    name: string,
    entry: Omit<LockEntry, 'installedAt' | 'updatedAt'>,
  ): Promise<void> {
    const lock = await this.read();
    const cognitives = { ...lock.cognitives };
    const now = new Date().toISOString();
    cognitives[name] = { ...entry, installedAt: now, updatedAt: now };
    const updated: LockFile = { ...lock, cognitives };
    await this.write(updated);
  }

  async removeEntry(name: string): Promise<boolean> {
    const lock = await this.read();
    const cognitives = { ...lock.cognitives };

    if (!(name in cognitives)) {
      return false;
    }

    delete cognitives[name];
    const updated: LockFile = { ...lock, cognitives };
    await this.write(updated);
    return true;
  }

  async getEntry(name: string): Promise<LockEntry | null> {
    const lock = await this.read();
    const entry = lock.cognitives[name];
    return entry ?? null;
  }

  async getAllEntries(): Promise<Readonly<Record<string, LockEntry>>> {
    const lock = await this.read();
    return lock.cognitives;
  }

  async getBySource(): Promise<
    ReadonlyMap<SourceIdentifier, { names: string[]; entry: LockEntry }>
  > {
    const lock = await this.read();
    const map = new Map<SourceIdentifier, { names: string[]; entry: LockEntry }>();

    for (const [name, entry] of Object.entries(lock.cognitives)) {
      if (!entry) continue;
      const existing = map.get(entry.source);
      if (existing) {
        existing.names.push(name);
      } else {
        map.set(entry.source, { names: [name], entry });
      }
    }

    return map;
  }

  async getLastSelectedAgents(): Promise<readonly string[] | undefined> {
    const lock = await this.read();
    return lock.lastSelectedAgents;
  }

  async saveLastSelectedAgents(agents: readonly string[]): Promise<void> {
    const lock = await this.read();
    const updated: LockFile = { ...lock, lastSelectedAgents: agents };
    await this.write(updated);
  }
}
