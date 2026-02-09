import type { CognitiveType, RemoteCognitive } from './cognitive.js';
import type { SourceIdentifier } from './brands.js';

// ---------- SourceDescriptor ----------

export interface SourceDescriptor {
  readonly kind: 'github' | 'gitlab' | 'git' | 'local' | 'direct-url' | 'well-known';
  readonly url: string;
  readonly subpath?: string;
  readonly localPath?: string;
  readonly ref?: string;
  readonly nameFilter?: string;
  readonly typeFilter?: CognitiveType;
}

export type ParsedSource = SourceDescriptor;

// ---------- ProviderMatch ----------

export interface ProviderMatch {
  readonly matches: boolean;
  readonly sourceIdentifier?: SourceIdentifier;
}

// ---------- HostProvider ----------

export interface HostProvider {
  readonly id: string;
  readonly displayName: string;
  match(source: string): ProviderMatch;
  fetchCognitive(source: string, options?: ProviderFetchOptions): Promise<RemoteCognitive | null>;
  fetchAll(source: string, options?: ProviderFetchOptions): Promise<RemoteCognitive[]>;
  toRawUrl(url: string): string;
  getSourceIdentifier(source: string): string;
}

// ---------- ProviderFetchOptions ----------

export interface ProviderFetchOptions {
  readonly cognitiveType?: CognitiveType;
  readonly subpath?: string;
  readonly ref?: string;
  readonly nameFilter?: string;
  readonly timeout?: number;
  readonly signal?: AbortSignal;
}

// ---------- ProviderRegistry ----------

export interface ProviderRegistry {
  register(provider: HostProvider): void;
  findProvider(url: string): HostProvider | null;
  getAll(): readonly HostProvider[];
}

// ---------- SourceParser ----------

export interface SourceParser {
  parse(source: string): SourceDescriptor;
  getOwnerRepo(source: SourceDescriptor): string | undefined;
}

// ---------- GitClient ----------

export interface GitClient {
  clone(url: string, options?: GitCloneOptions): Promise<string>;
  cleanup(tempDir: string): Promise<void>;
}

export interface GitCloneOptions {
  readonly depth?: number;
  readonly timeoutMs?: number;
  readonly ref?: string;
}
