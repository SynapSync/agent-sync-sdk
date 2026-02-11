import type { AgentConfig } from './agent.js';
import type { HostProvider } from './source.js';

// ---------- FileSystem Adapter ----------

export interface FileSystemAdapter {
  readFile(path: string, encoding: 'utf-8'): Promise<string>;
  writeFile(path: string, content: string, encoding: 'utf-8'): Promise<void>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
  readdir(path: string, options: { withFileTypes: true }): Promise<Dirent[]>;
  stat(path: string): Promise<FsStats>;
  lstat(path: string): Promise<FsStats>;
  symlink(target: string, path: string): Promise<void>;
  readlink(path: string): Promise<string>;
  rm(path: string, options?: { recursive?: boolean; force?: boolean }): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  exists(path: string): Promise<boolean>;
  copyDirectory(source: string, target: string): Promise<void>;
}

export interface FsStats {
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

export interface Dirent {
  name: string;
  isFile(): boolean;
  isDirectory(): boolean;
  isSymbolicLink(): boolean;
}

// ---------- Environment ----------

export type EnvReader = (key: string) => string | undefined;

// ---------- SDKConfig ----------

export interface SDKConfig {
  readonly agentsDir: string;
  readonly lockFileName: string;
  readonly cwd: string;
  readonly homeDir: string;
  readonly fs: FileSystemAdapter;
  readonly git: Readonly<GitConfig>;
  readonly providers: Readonly<ProviderConfig>;
  readonly agents: Readonly<AgentRegistryConfig>;
  readonly telemetry: Readonly<TelemetryConfig>;
  /** Timeout in milliseconds for HTTP fetch calls. Default: 15000 (15s). */
  readonly fetchTimeoutMs: number;
  /** Injectable environment variable reader. Default: reads from process.env. */
  readonly env: EnvReader;
}

export interface GitConfig {
  readonly cloneTimeoutMs: number;
  readonly depth: number;
}

export interface ProviderConfig {
  readonly githubToken?: string;
  readonly custom: readonly HostProvider[];
}

export interface AgentRegistryConfig {
  readonly definitionsPath?: string;
  readonly additional: readonly AgentConfig[];
}

export interface TelemetryConfig {
  readonly enabled: boolean;
  readonly endpoint?: string;
}

// ---------- Categories ----------

export interface Category {
  readonly slug: string;
  readonly displayName: string;
  readonly description?: string;
}

export interface CategoryMapping {
  readonly cognitiveName: string;
  readonly category: string;
}

export const DEFAULT_CATEGORIES = {
  general:   { slug: 'general',   displayName: 'General' },
  planning:  { slug: 'planning',  displayName: 'Planning' },
  qa:        { slug: 'qa',        displayName: 'QA' },
  growth:    { slug: 'growth',    displayName: 'Growth' },
  frontend:  { slug: 'frontend',  displayName: 'Frontend' },
  backend:   { slug: 'backend',   displayName: 'Backend' },
  devops:    { slug: 'devops',    displayName: 'DevOps' },
  security:  { slug: 'security',  displayName: 'Security' },
  data:      { slug: 'data',      displayName: 'Data' },
  mobile:    { slug: 'mobile',    displayName: 'Mobile' },
  infra:     { slug: 'infra',     displayName: 'Infrastructure' },
} as const satisfies Record<string, Category>;
