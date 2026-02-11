import type { CognitiveType } from './cognitive.js';
import type { SourceIdentifier } from './brands.js';

export const LOCK_VERSION = 5 as const;

export interface LockEntry {
  readonly source: SourceIdentifier;
  readonly sourceType: string;
  readonly sourceUrl: string;
  readonly cognitivePath?: string;
  readonly contentHash: string;
  readonly cognitiveType: CognitiveType;
  readonly category?: string;
  readonly installedAt: string;
  readonly updatedAt: string;
}

export interface LockFile {
  readonly version: typeof LOCK_VERSION;
  readonly cognitives: Readonly<Record<string, LockEntry>>;
  readonly lastSelectedAgents?: readonly string[];
}

export interface LockManager {
  read(): Promise<LockFile>;
  write(lock: LockFile): Promise<void>;
  addEntry(name: string, entry: Omit<LockEntry, 'installedAt' | 'updatedAt'>): Promise<void>;
  removeEntry(name: string): Promise<boolean>;
  getEntry(name: string): Promise<LockEntry | null>;
  getAllEntries(): Promise<Readonly<Record<string, LockEntry>>>;
  getBySource(): Promise<ReadonlyMap<SourceIdentifier, { names: string[]; entry: LockEntry }>>;
  getLastSelectedAgents(): Promise<readonly string[] | undefined>;
  saveLastSelectedAgents(agents: readonly string[]): Promise<void>;
}
