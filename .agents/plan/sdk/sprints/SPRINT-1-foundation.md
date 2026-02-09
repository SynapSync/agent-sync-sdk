# Sprint 1: Foundation

**Duration:** 5 days
**Status:** NOT_STARTED
**Dependencies:** None (first sprint)
**Goal:** Set up the project scaffolding, implement the complete type system (Layer 0), and build the error hierarchy. At the end of this sprint, the entire shared vocabulary of the SDK compiles with zero errors under strict TypeScript.

---

## Phase 1.1: Project Scaffolding (1 day)

### Task 1.1.1: Initialize package.json

**File:** `package.json`
**Steps:**
- [ ] Run `pnpm init` in the project root
- [ ] Set `name` to `@synapsync/agent-sync-sdk`
- [ ] Set `type` to `"module"`
- [ ] Configure `exports` field with types + import conditions
- [ ] Set `engines.node` to `>=20`
- [ ] Add `files: ["dist"]`
- [ ] Add scripts: `build`, `test`, `compile-agents`, `prebuild`, `lint`, `typecheck`

**BEFORE:** No file exists.

**AFTER:**
```json
{
  "name": "@synapsync/agent-sync-sdk",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "types": "./dist/index.d.ts",
  "files": ["dist"],
  "engines": {
    "node": ">=20"
  },
  "scripts": {
    "build": "tsup",
    "test": "vitest",
    "test:run": "vitest run",
    "compile-agents": "tsx scripts/compile-agents.ts",
    "prebuild": "pnpm run compile-agents",
    "lint": "eslint src/",
    "typecheck": "tsc --noEmit"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "vitest": "^3.0.0",
    "tsup": "^8.0.0",
    "tsx": "^4.0.0",
    "eslint": "^9.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "prettier": "^3.0.0"
  },
  "dependencies": {
    "gray-matter": "^4.0.3",
    "simple-git": "^3.27.0"
  }
}
```

**Verification:**
```bash
pnpm install
```

---

### Task 1.1.2: Create tsconfig.json

**File:** `tsconfig.json`
**Steps:**
- [ ] Create `tsconfig.json` with strict mode enabled
- [ ] Set target to `ES2022`, module to `NodeNext`
- [ ] Enable `declaration`, `declarationMap`, `sourceMap`
- [ ] Enable `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`
- [ ] Set `outDir` to `dist`, `rootDir` to `src`

**BEFORE:** No file exists.

**AFTER:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "dist",
    "rootDir": "src",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "verbatimModuleSyntax": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.1.3: Create vitest.config.ts

**File:** `vitest.config.ts`
**Steps:**
- [ ] Create vitest config with TypeScript path resolution
- [ ] Set test include pattern for `tests/**/*.test.ts`
- [ ] Configure coverage provider as `v8`
- [ ] Set coverage thresholds: statements 85%, branches 80%, functions 85%

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    globals: true,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/__generated__/**', 'src/**/index.ts'],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
      },
    },
  },
});
```

**Verification:**
```bash
pnpm vitest run --passWithNoTests
```

---

### Task 1.1.4: Create tsup.config.ts

**File:** `tsup.config.ts`
**Steps:**
- [ ] Configure ESM-only output
- [ ] Enable declaration generation via `dts: true`
- [ ] Set entry point to `src/index.ts`

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20',
});
```

**Verification:**
```bash
pnpm tsup --dry-run
```

---

### Task 1.1.5: Create eslint.config.js

**File:** `eslint.config.js`
**Steps:**
- [ ] Configure flat config for TypeScript
- [ ] Enable strict type-checked rules
- [ ] Add `no-restricted-imports` for layer enforcement (operations cannot be imported from lower layers)
- [ ] Ban `any` usage

**BEFORE:** No file exists.

**AFTER:**
```javascript
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-restricted-imports': ['error', {
        patterns: [
          { group: ['../operations/*'], message: 'Lower layers cannot import from operations/' },
          { group: ['../sdk'], message: 'Only index.ts may import from sdk.ts' },
        ],
      }],
    },
  },
];
```

**Verification:**
```bash
pnpm eslint src/
```

---

### Task 1.1.6: Create .gitignore and .prettierrc

**Files:** `.gitignore`, `.prettierrc`
**Steps:**
- [ ] Create `.gitignore` with node_modules, dist, coverage, .env patterns
- [ ] Create `.prettierrc` with single quotes, trailing commas, 100 print width

**BEFORE:** No files exist.

**AFTER (.gitignore):**
```
node_modules/
dist/
coverage/
.env
.env.*
*.tsbuildinfo
```

**AFTER (.prettierrc):**
```json
{
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2,
  "semi": true
}
```

**Verification:**
```bash
ls .gitignore .prettierrc
```

---

## Phase 1.2: Type System (2 days)

### Task 1.2.1: Create src/types/brands.ts

**File:** `src/types/brands.ts`
**Steps:**
- [ ] Define `Brand<T, B>` utility type using unique symbol
- [ ] Define `AgentName`, `CognitiveName`, `SafeName`, `SourceIdentifier` branded types
- [ ] Implement `agentName()` constructor with lowercase alphanumeric + hyphen validation
- [ ] Implement `cognitiveName()` constructor with no-slash validation
- [ ] Implement `safeName()` constructor with path-separator and null-byte rejection
- [ ] Implement `sourceIdentifier()` constructor with non-empty validation
- [ ] Export `isAgentName()`, `isCognitiveName()` type guards

**BEFORE:** No file exists.

**AFTER:**
```typescript
// ---------- Branding utility ----------

declare const __brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [__brand]: B };

// ---------- Domain brands ----------

/** A validated agent name (e.g., "claude-code", "cursor") */
export type AgentName = Brand<string, 'AgentName'>;

/** A validated cognitive name (e.g., "react-best-practices") */
export type CognitiveName = Brand<string, 'CognitiveName'>;

/** A sanitized filesystem-safe name */
export type SafeName = Brand<string, 'SafeName'>;

/** A validated source identifier (e.g., "owner/repo", "mintlify/bun.com") */
export type SourceIdentifier = Brand<string, 'SourceIdentifier'>;

// ---------- Brand constructors ----------

const AGENT_NAME_RE = /^[a-z0-9][a-z0-9-]*$/;

export function agentName(raw: string): AgentName {
  if (!AGENT_NAME_RE.test(raw)) {
    throw new Error(`Invalid agent name: "${raw}"`);
  }
  return raw as AgentName;
}

export function cognitiveName(raw: string): CognitiveName {
  if (!raw || raw.includes('/') || raw.includes('\\')) {
    throw new Error(`Invalid cognitive name: "${raw}"`);
  }
  return raw as CognitiveName;
}

export function safeName(raw: string): SafeName {
  if (!raw || /[/\\:]/.test(raw) || raw === '.' || raw === '..' || raw.includes('\0')) {
    throw new Error(`Unsafe name: "${raw}"`);
  }
  return raw as SafeName;
}

export function sourceIdentifier(raw: string): SourceIdentifier {
  if (!raw) throw new Error('Empty source identifier');
  return raw as SourceIdentifier;
}

// ---------- Type guards ----------

export function isAgentName(value: string): value is AgentName {
  return AGENT_NAME_RE.test(value);
}

export function isCognitiveName(value: string): value is CognitiveName {
  return value.length > 0 && !value.includes('/') && !value.includes('\\');
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.2.2: Create src/types/result.ts

**File:** `src/types/result.ts`
**Steps:**
- [ ] Define `Result<T, E>` discriminated union with `ok` discriminant
- [ ] Implement `ok<T>()` success constructor
- [ ] Implement `err<E>()` failure constructor
- [ ] Implement `unwrap<T, E>()` that extracts value or throws error
- [ ] Implement `mapResult<T, U, E>()` for transforming success values
- [ ] Implement `isOk()` and `isErr()` type guards

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { CognitError } from '../errors/base.js';

/**
 * Discriminated union for operations that can fail with expected errors.
 * Use this instead of throwing for recoverable failures.
 */
export type Result<T, E extends CognitError = CognitError> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: E };

/** Create a success result */
export function ok<T>(value: T): Result<T, never> {
  return { ok: true, value };
}

/** Create a failure result */
export function err<E extends CognitError>(error: E): Result<never, E> {
  return { ok: false, error };
}

/** Unwrap a result or throw the error */
export function unwrap<T, E extends CognitError>(result: Result<T, E>): T {
  if (result.ok) return result.value;
  throw result.error;
}

/** Map the success value of a result */
export function mapResult<T, U, E extends CognitError>(
  result: Result<T, E>,
  fn: (value: T) => U,
): Result<U, E> {
  if (result.ok) return ok(fn(result.value));
  return result;
}

/** Type guard: is this result a success? */
export function isOk<T, E extends CognitError>(result: Result<T, E>): result is { readonly ok: true; readonly value: T } {
  return result.ok;
}

/** Type guard: is this result a failure? */
export function isErr<T, E extends CognitError>(result: Result<T, E>): result is { readonly ok: false; readonly error: E } {
  return !result.ok;
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.2.3: Create src/types/cognitive.ts

**File:** `src/types/cognitive.ts`
**Steps:**
- [ ] Define `CognitiveType` string literal union: `'skill' | 'agent' | 'prompt' | 'rule'`
- [ ] Define `CognitiveTypeConfig` interface with `subdir` and `fileName`
- [ ] Define `COGNITIVE_TYPE_CONFIGS` const map with `satisfies`
- [ ] Define `COGNITIVE_SUBDIRS` and `COGNITIVE_FILE_NAMES` derived maps
- [ ] Define `AGENTS_DIR` constant as `'.agents'`
- [ ] Define `Cognitive` interface with name, description, path, type, rawContent, metadata
- [ ] Define `Skill`, `Prompt`, `Rule`, `AgentCognitive` subtypes
- [ ] Define `RemoteCognitive` interface for fetched cognitives
- [ ] Define `CognitiveRef` lightweight reference interface

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { CognitiveName, SafeName, SourceIdentifier } from './brands.js';

// ---------- CognitiveType ----------

export type CognitiveType = 'skill' | 'agent' | 'prompt' | 'rule';

export interface CognitiveTypeConfig {
  readonly subdir: string;
  readonly fileName: string;
}

export const COGNITIVE_TYPE_CONFIGS = {
  skill:  { subdir: 'skills',  fileName: 'SKILL.md' },
  agent:  { subdir: 'agents',  fileName: 'AGENT.md' },
  prompt: { subdir: 'prompts', fileName: 'PROMPT.md' },
  rule:   { subdir: 'rules',   fileName: 'RULE.md' },
} as const satisfies Record<CognitiveType, CognitiveTypeConfig>;

export const COGNITIVE_SUBDIRS: Record<CognitiveType, string> = {
  skill:  COGNITIVE_TYPE_CONFIGS.skill.subdir,
  agent:  COGNITIVE_TYPE_CONFIGS.agent.subdir,
  prompt: COGNITIVE_TYPE_CONFIGS.prompt.subdir,
  rule:   COGNITIVE_TYPE_CONFIGS.rule.subdir,
};

export const COGNITIVE_FILE_NAMES: Record<CognitiveType, string> = {
  skill:  COGNITIVE_TYPE_CONFIGS.skill.fileName,
  agent:  COGNITIVE_TYPE_CONFIGS.agent.fileName,
  prompt: COGNITIVE_TYPE_CONFIGS.prompt.fileName,
  rule:   COGNITIVE_TYPE_CONFIGS.rule.fileName,
};

export const AGENTS_DIR = '.agents' as const;

// ---------- Cognitive ----------

export interface Cognitive {
  readonly name: CognitiveName;
  readonly description: string;
  readonly path: string;
  readonly type: CognitiveType;
  readonly rawContent: string;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface Skill extends Cognitive { readonly type: 'skill'; }
export interface Prompt extends Cognitive { readonly type: 'prompt'; }
export interface Rule extends Cognitive { readonly type: 'rule'; }
export interface AgentCognitive extends Cognitive { readonly type: 'agent'; }

// ---------- RemoteCognitive ----------

export interface RemoteCognitive {
  readonly name: string;
  readonly description: string;
  readonly content: string;
  readonly installName: SafeName;
  readonly sourceUrl: string;
  readonly providerId: string;
  readonly sourceIdentifier: SourceIdentifier;
  readonly type: CognitiveType;
  readonly metadata: Readonly<Record<string, unknown>>;
}

// ---------- CognitiveRef ----------

export interface CognitiveRef {
  readonly name: CognitiveName;
  readonly type: CognitiveType;
  readonly path: string;
  readonly description: string;
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.2.4: Create src/types/agent.ts

**File:** `src/types/agent.ts`
**Steps:**
- [ ] Define `AgentType` string literal union (representative values; full union is generated)
- [ ] Define `AgentDirConfig` interface with `local` and `global` paths
- [ ] Define `AgentConfig` interface with name, displayName, dirs, detectInstalled, showInUniversalList
- [ ] Define `AgentDetectionResult` interface
- [ ] Define `AgentRegistry` interface with getAll, get, getUniversalAgents, getNonUniversalAgents, isUniversal, getDir, detectInstalled, register

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { AgentName } from './brands.js';
import type { CognitiveType } from './cognitive.js';

// ---------- AgentType ----------

export type AgentType =
  | 'adal'
  | 'amp'
  | 'augment'
  | 'claude-code'
  | 'cline'
  | 'codex'
  | 'cursor'
  | 'gemini-cli'
  | 'github-copilot'
  | 'goose'
  | 'junie'
  | 'kiro-cli'
  | 'opencode'
  | 'roo'
  | 'trae'
  | 'windsurf'
  // ... 39+ total, generated from YAML at build time
  ;

// ---------- AgentDirConfig ----------

export interface AgentDirConfig {
  readonly local: string;
  readonly global: string | undefined;
}

// ---------- AgentConfig ----------

export interface AgentConfig {
  readonly name: AgentName;
  readonly displayName: string;
  readonly dirs: Readonly<Record<CognitiveType, AgentDirConfig>>;
  readonly detectInstalled: () => Promise<boolean>;
  readonly showInUniversalList: boolean;
}

// ---------- AgentDetectionResult ----------

export interface AgentDetectionResult {
  readonly agent: AgentType;
  readonly displayName: string;
  readonly installed: boolean;
  readonly isUniversal: boolean;
}

// ---------- AgentRegistry ----------

export interface AgentRegistry {
  getAll(): ReadonlyMap<AgentType, AgentConfig>;
  get(type: AgentType): AgentConfig | undefined;
  getUniversalAgents(cognitiveType?: CognitiveType): AgentType[];
  getNonUniversalAgents(cognitiveType?: CognitiveType): AgentType[];
  isUniversal(type: AgentType, cognitiveType?: CognitiveType): boolean;
  getDir(type: AgentType, cognitiveType: CognitiveType, scope: 'local' | 'global'): string | undefined;
  detectInstalled(): Promise<AgentDetectionResult[]>;
  register(config: AgentConfig): void;
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.2.5: Create src/types/install.ts

**File:** `src/types/install.ts`
**Steps:**
- [ ] Define `InstallMode` type: `'symlink' | 'copy'`
- [ ] Define `InstallScope` type: `'project' | 'global'`
- [ ] Define `InstallTarget` interface
- [ ] Define `InstallResult` interface with success, agent, cognitiveName, mode, symlinkFailed
- [ ] Define `InstallRequest` discriminated union: local, remote, wellknown
- [ ] Define `WellKnownCognitive` interface
- [ ] Define `Installer` interface with install() and remove()
- [ ] Define `InstallerOptions` interface

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { AgentType } from './agent.js';
import type { CognitiveType, Cognitive, RemoteCognitive } from './cognitive.js';
import type { SafeName } from './brands.js';

export type InstallMode = 'symlink' | 'copy';
export type InstallScope = 'project' | 'global';

export interface InstallTarget {
  readonly agent: AgentType;
  readonly scope: InstallScope;
  readonly mode: InstallMode;
}

export interface InstallResult {
  readonly success: boolean;
  readonly agent: AgentType;
  readonly cognitiveName: string;
  readonly cognitiveType: CognitiveType;
  readonly path: string;
  readonly canonicalPath?: string;
  readonly mode: InstallMode;
  readonly symlinkFailed?: boolean;
  readonly error?: string;
}

export type InstallRequest =
  | { readonly kind: 'local'; readonly cognitive: Cognitive }
  | { readonly kind: 'remote'; readonly cognitive: RemoteCognitive }
  | { readonly kind: 'wellknown'; readonly cognitive: WellKnownCognitive };

export interface WellKnownCognitive {
  readonly name: string;
  readonly installName: SafeName;
  readonly description: string;
  readonly type: CognitiveType;
  readonly sourceUrl: string;
  readonly files: ReadonlyMap<string, string>;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface Installer {
  install(
    request: InstallRequest,
    target: InstallTarget,
    options: InstallerOptions,
  ): Promise<InstallResult>;

  remove(
    cognitiveName: string,
    cognitiveType: CognitiveType,
    target: InstallTarget,
  ): Promise<boolean>;
}

export interface InstallerOptions {
  readonly cwd: string;
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.2.6: Create src/types/lock.ts

**File:** `src/types/lock.ts`
**Steps:**
- [ ] Define `LOCK_VERSION` constant as `5`
- [ ] Define `LockEntry` interface with source, sourceType, sourceUrl, contentHash, cognitiveType, installedAt, updatedAt
- [ ] Define `LockFile` interface with version, cognitives map, lastSelectedAgents
- [ ] Define `LockManager` interface with read, write, addEntry, removeEntry, getEntry, getAllEntries, getBySource, getLastSelectedAgents, saveLastSelectedAgents

**BEFORE:** No file exists.

**AFTER:**
```typescript
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
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.2.7: Create src/types/source.ts

**File:** `src/types/source.ts`
**Steps:**
- [ ] Define `SourceDescriptor` interface with kind, url, subpath, localPath, ref, nameFilter, typeFilter
- [ ] Define `ParsedSource` type alias
- [ ] Define `ProviderMatch` interface
- [ ] Define `HostProvider` interface with id, displayName, match, fetchCognitive, fetchAll, toRawUrl, getSourceIdentifier
- [ ] Define `ProviderRegistry` interface with register, findProvider, getAll
- [ ] Define `SourceParser` interface with parse, getOwnerRepo
- [ ] Define `GitClient` interface with clone, cleanup
- [ ] Define `GitCloneOptions` interface
- [ ] Define `ProviderFetchOptions` interface

**BEFORE:** No file exists.

**AFTER:**
```typescript
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
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.2.8: Create src/types/events.ts

**File:** `src/types/events.ts`
**Steps:**
- [ ] Define `SDKEventMap` interface with all 26+ typed event payloads
- [ ] Include events for: sdk lifecycle, operation lifecycle, discovery, provider, install, lock, git, agent detection, progress
- [ ] Define `Unsubscribe` type
- [ ] Define `EventBus` interface with emit, on, once

**BEFORE:** No file exists.

**AFTER:**
```typescript
import type { AgentType, AgentDetectionResult } from './agent.js';
import type { CognitiveType, CognitiveRef } from './cognitive.js';
import type { InstallMode, InstallResult } from './install.js';
import type { CognitError } from '../errors/base.js';

export interface SDKEventMap {
  // -- SDK lifecycle --
  'sdk:initialized': { readonly configHash: string };
  'sdk:error': { readonly error: CognitError };

  // -- Operation lifecycle --
  'operation:start': { readonly operation: string; readonly options: unknown };
  'operation:complete': { readonly operation: string; readonly result: unknown; readonly durationMs: number };
  'operation:error': { readonly operation: string; readonly error: CognitError };

  // -- Discovery --
  'discovery:start': { readonly path: string };
  'discovery:found': { readonly cognitive: CognitiveRef; readonly type: CognitiveType };
  'discovery:complete': { readonly count: number; readonly durationMs: number };

  // -- Provider --
  'provider:fetch:start': { readonly providerId: string; readonly url: string };
  'provider:fetch:complete': { readonly providerId: string; readonly url: string; readonly found: boolean };
  'provider:fetch:error': { readonly providerId: string; readonly url: string; readonly error: string };

  // -- Installer --
  'install:start': { readonly cognitive: string; readonly agent: AgentType; readonly mode: InstallMode };
  'install:symlink': { readonly source: string; readonly target: string };
  'install:copy': { readonly source: string; readonly target: string };
  'install:complete': { readonly cognitive: string; readonly agent: AgentType; readonly result: InstallResult };

  // -- Lock --
  'lock:read': { readonly path: string };
  'lock:write': { readonly path: string; readonly entryCount: number };
  'lock:migrate': { readonly fromVersion: number; readonly toVersion: number };

  // -- Git --
  'git:clone:start': { readonly url: string };
  'git:clone:complete': { readonly url: string; readonly path: string; readonly durationMs: number };
  'git:clone:error': { readonly url: string; readonly error: string };

  // -- Agent detection --
  'agent:detect:start': Record<string, never>;
  'agent:detect:found': { readonly agent: AgentType; readonly displayName: string };
  'agent:detect:complete': { readonly results: readonly AgentDetectionResult[]; readonly durationMs: number };

  // -- Progress (generic) --
  'progress:start': { readonly id: string; readonly message: string; readonly total?: number };
  'progress:update': { readonly id: string; readonly message: string; readonly current?: number };
  'progress:complete': { readonly id: string; readonly message: string };
}

export type Unsubscribe = () => void;

export interface EventBus {
  emit<K extends keyof SDKEventMap>(event: K, payload: SDKEventMap[K]): void;
  on<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;
  once<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.2.9: Create src/types/config.ts

**File:** `src/types/config.ts`
**Steps:**
- [ ] Define `FileSystemAdapter` interface with 12 filesystem methods
- [ ] Define `FsStats` and `Dirent` minimal interfaces
- [ ] Define `SDKConfig` interface with agentsDir, lockFileName, cwd, homeDir, fs, git, providers, agents, telemetry
- [ ] Define `GitConfig`, `ProviderConfig`, `AgentRegistryConfig`, `TelemetryConfig` sub-interfaces
- [ ] Define `Category` and `CategoryMapping` interfaces
- [ ] Define `DEFAULT_CATEGORIES` const map

**BEFORE:** No file exists.

**AFTER:**
```typescript
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
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.2.10: Create src/types/index.ts

**File:** `src/types/index.ts`
**Steps:**
- [ ] Barrel export all types from brands, result, cognitive, agent, install, lock, source, events, config
- [ ] Export all value exports (constructors, const maps, type guards)

**BEFORE:** No file exists.

**AFTER:**
```typescript
// Branded types
export type { AgentName, CognitiveName, SafeName, SourceIdentifier } from './brands.js';
export { agentName, cognitiveName, safeName, sourceIdentifier, isAgentName, isCognitiveName } from './brands.js';

// Result
export type { Result } from './result.js';
export { ok, err, unwrap, mapResult, isOk, isErr } from './result.js';

// Cognitive
export type { CognitiveType, CognitiveTypeConfig, Cognitive, Skill, Prompt, Rule, AgentCognitive, RemoteCognitive, CognitiveRef } from './cognitive.js';
export { COGNITIVE_TYPE_CONFIGS, COGNITIVE_SUBDIRS, COGNITIVE_FILE_NAMES, AGENTS_DIR } from './cognitive.js';

// Agent
export type { AgentType, AgentDirConfig, AgentConfig, AgentDetectionResult, AgentRegistry } from './agent.js';

// Install
export type { InstallMode, InstallScope, InstallTarget, InstallResult, InstallRequest, WellKnownCognitive, Installer, InstallerOptions } from './install.js';

// Lock
export type { LockEntry, LockFile, LockManager } from './lock.js';
export { LOCK_VERSION } from './lock.js';

// Source / Provider
export type { SourceDescriptor, ParsedSource, ProviderMatch, HostProvider, ProviderFetchOptions, ProviderRegistry, SourceParser, GitClient, GitCloneOptions } from './source.js';

// Events
export type { SDKEventMap, Unsubscribe, EventBus } from './events.js';

// Config
export type { FileSystemAdapter, FsStats, Dirent, SDKConfig, GitConfig, ProviderConfig, AgentRegistryConfig, TelemetryConfig, Category, CategoryMapping } from './config.js';
export { DEFAULT_CATEGORIES } from './config.js';
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 1.3: Error Hierarchy (1.5 days)

### Task 1.3.1: Create src/errors/base.ts

**File:** `src/errors/base.ts`
**Steps:**
- [ ] Define `CognitError` abstract class extending `Error`
- [ ] Add abstract `code: string` and `module: string` properties
- [ ] Accept `ErrorOptions` in constructor for `cause` chaining
- [ ] Override `name` to `this.constructor.name`
- [ ] Implement `toJSON()` returning structured error object

**BEFORE:** No file exists.

**AFTER:**
```typescript
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
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.3.2: Create src/errors/config.ts

**File:** `src/errors/config.ts`
**Steps:**
- [ ] Define `ConfigError` extending `CognitError` with code `CONFIG_ERROR`, module `config`
- [ ] Define `ConfigNotFoundError` with code `CONFIG_NOT_FOUND`
- [ ] Define `ConfigValidationError` (alias `InvalidConfigError`) with code `INVALID_CONFIG_ERROR`, field, and reason

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { CognitError } from './base.js';

export class ConfigError extends CognitError {
  readonly code = 'CONFIG_ERROR';
  readonly module = 'config';
}

export class ConfigNotFoundError extends ConfigError {
  override readonly code = 'CONFIG_NOT_FOUND';

  constructor(readonly configPath: string) {
    super(`Config file not found: ${configPath}`);
  }
}

export class InvalidConfigError extends ConfigError {
  override readonly code = 'INVALID_CONFIG_ERROR';

  constructor(readonly field: string, readonly reason: string) {
    super(`Invalid config: ${field} -- ${reason}`);
  }
}

/** Alias for consistency with naming conventions */
export { InvalidConfigError as ConfigValidationError };
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.3.3: Create src/errors/provider.ts

**File:** `src/errors/provider.ts`
**Steps:**
- [ ] Define `ProviderError` with code `PROVIDER_ERROR`, module `providers`, and `providerId`
- [ ] Define `ProviderFetchError` with code `PROVIDER_FETCH_ERROR`, `url`, `statusCode`
- [ ] Define `ProviderMatchError` with code `PROVIDER_MATCH_ERROR`
- [ ] Define `NoCognitivesFoundError` with code `NO_COGNITIVES_FOUND`
- [ ] Define `GitCloneError` with code `GIT_CLONE_ERROR`, `url`, `reason`

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { CognitError } from './base.js';

export class ProviderError extends CognitError {
  readonly code = 'PROVIDER_ERROR';
  readonly module = 'providers';

  constructor(
    message: string,
    readonly providerId: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}

export class ProviderFetchError extends ProviderError {
  override readonly code = 'PROVIDER_FETCH_ERROR';

  constructor(
    readonly url: string,
    providerId: string,
    readonly statusCode?: number,
    options?: ErrorOptions,
  ) {
    super(
      `Failed to fetch from ${providerId}: ${url} (${statusCode ?? 'network error'})`,
      providerId,
      options,
    );
  }
}

export class ProviderMatchError extends ProviderError {
  override readonly code = 'PROVIDER_MATCH_ERROR';
}

export class NoCognitivesFoundError extends ProviderError {
  override readonly code = 'NO_COGNITIVES_FOUND';

  constructor(readonly source: string, providerId: string) {
    super(`No cognitives found at: ${source}`, providerId);
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.3.4: Create src/errors/install.ts

**File:** `src/errors/install.ts`
**Steps:**
- [ ] Define `InstallError` with code `INSTALL_ERROR`, module `installer`
- [ ] Define `SymlinkError` with code `SYMLINK_ERROR`, source, target
- [ ] Define `PathTraversalError` with code `PATH_TRAVERSAL_ERROR`, attemptedPath
- [ ] Define `FileWriteError` with code `FILE_WRITE_ERROR`, filePath
- [ ] Define `EloopError` with code `ELOOP_ERROR` for circular symlink detection

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { CognitError } from './base.js';

export class InstallError extends CognitError {
  readonly code = 'INSTALL_ERROR';
  readonly module = 'installer';
}

export class PathTraversalError extends InstallError {
  override readonly code = 'PATH_TRAVERSAL_ERROR';

  constructor(readonly attemptedPath: string) {
    super(`Path traversal detected: ${attemptedPath}`);
  }
}

export class SymlinkError extends InstallError {
  override readonly code = 'SYMLINK_ERROR';

  constructor(
    readonly source: string,
    readonly target: string,
    options?: ErrorOptions,
  ) {
    super(`Failed to create symlink: ${source} -> ${target}`, options);
  }
}

export class FileWriteError extends InstallError {
  override readonly code = 'FILE_WRITE_ERROR';

  constructor(readonly filePath: string, options?: ErrorOptions) {
    super(`Failed to write file: ${filePath}`, options);
  }
}

export class EloopError extends InstallError {
  override readonly code = 'ELOOP_ERROR';

  constructor(readonly symlinkPath: string) {
    super(`Circular symlink detected: ${symlinkPath}`);
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.3.5: Create src/errors/lock.ts

**File:** `src/errors/lock.ts`
**Steps:**
- [ ] Define `LockError` with code `LOCK_ERROR`, module `lock`
- [ ] Define `LockCorruptedError` (alias `LockReadError`) with code `LOCK_READ_ERROR`, lockPath
- [ ] Define `LockWriteError` with code `LOCK_WRITE_ERROR`, lockPath
- [ ] Define `MigrationError` (alias `LockMigrationError`) with code `LOCK_MIGRATION_ERROR`, fromVersion, toVersion

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { CognitError } from './base.js';

export class LockError extends CognitError {
  readonly code = 'LOCK_ERROR';
  readonly module = 'lock';
}

export class LockReadError extends LockError {
  override readonly code = 'LOCK_READ_ERROR';

  constructor(readonly lockPath: string, options?: ErrorOptions) {
    super(`Failed to read lock file: ${lockPath}`, options);
  }
}

/** Alias for corrupted lock files */
export { LockReadError as LockCorruptedError };

export class LockWriteError extends LockError {
  override readonly code = 'LOCK_WRITE_ERROR';

  constructor(readonly lockPath: string, options?: ErrorOptions) {
    super(`Failed to write lock file: ${lockPath}`, options);
  }
}

export class LockMigrationError extends LockError {
  override readonly code = 'LOCK_MIGRATION_ERROR';

  constructor(
    readonly fromVersion: number,
    readonly toVersion: number,
    options?: ErrorOptions,
  ) {
    super(`Failed to migrate lock file from v${fromVersion} to v${toVersion}`, options);
  }
}

/** Alias for naming consistency */
export { LockMigrationError as MigrationError };
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.3.6: Create src/errors/discovery.ts

**File:** `src/errors/discovery.ts`
**Steps:**
- [ ] Define `DiscoveryError` with code `DISCOVERY_ERROR`, module `discovery`
- [ ] Define `ParseError` with code `PARSE_ERROR`, filePath
- [ ] Define `ScanError` with code `SCAN_ERROR`, directory
- [ ] Define `ValidationError` with code `VALIDATION_ERROR`, field, reason

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { CognitError } from './base.js';

export class DiscoveryError extends CognitError {
  readonly code = 'DISCOVERY_ERROR';
  readonly module = 'discovery';
}

export class ParseError extends DiscoveryError {
  override readonly code = 'PARSE_ERROR';

  constructor(readonly filePath: string, options?: ErrorOptions) {
    super(`Failed to parse cognitive file: ${filePath}`, options);
  }
}

export class ScanError extends DiscoveryError {
  override readonly code = 'SCAN_ERROR';

  constructor(readonly directory: string, options?: ErrorOptions) {
    super(`Failed to scan directory: ${directory}`, options);
  }
}

export class ValidationError extends DiscoveryError {
  override readonly code = 'VALIDATION_ERROR';

  constructor(readonly field: string, readonly reason: string) {
    super(`Validation failed: ${field} -- ${reason}`);
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.3.7: Create src/errors/operation.ts

**File:** `src/errors/operation.ts`
**Steps:**
- [ ] Define `OperationError` with code `OPERATION_ERROR`, module `operations`
- [ ] Define `ConflictError` with code `CONFLICT_ERROR` for conflicting cognitive names

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { CognitError } from './base.js';

export class OperationError extends CognitError {
  readonly code = 'OPERATION_ERROR';
  readonly module = 'operations';
}

export class ConflictError extends OperationError {
  override readonly code = 'CONFLICT_ERROR';

  constructor(readonly cognitiveName: string, readonly existingSource: string) {
    super(`Cognitive "${cognitiveName}" already exists from source: ${existingSource}`);
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.3.8: Create src/errors/source.ts

**File:** `src/errors/source.ts`
**Steps:**
- [ ] Define `SourceError` with code `SOURCE_ERROR`, module `source`
- [ ] Define `InvalidSourceError` (alias `SourceParseError`) with code `SOURCE_PARSE_ERROR`, rawSource
- [ ] Define `GitCloneError` with code `GIT_CLONE_ERROR`, url, reason

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { CognitError } from './base.js';

export class SourceError extends CognitError {
  readonly code = 'SOURCE_ERROR';
  readonly module = 'source';
}

export class SourceParseError extends SourceError {
  override readonly code = 'SOURCE_PARSE_ERROR';

  constructor(readonly rawSource: string, options?: ErrorOptions) {
    super(`Failed to parse source: "${rawSource}"`, options);
  }
}

/** Alias for InvalidSourceError */
export { SourceParseError as InvalidSourceError };

export class GitCloneError extends SourceError {
  override readonly code = 'GIT_CLONE_ERROR';

  constructor(
    readonly url: string,
    readonly reason: string,
    options?: ErrorOptions,
  ) {
    super(`Failed to clone ${url}: ${reason}`, options);
  }
}
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

### Task 1.3.9: Create src/errors/index.ts

**File:** `src/errors/index.ts`
**Steps:**
- [ ] Barrel export all error classes
- [ ] Export `ERROR_CODES` const map and `ErrorCode` type
- [ ] Ensure every error is importable from `errors/index.js`

**BEFORE:** No file exists.

**AFTER:**
```typescript
// Base
export { CognitError } from './base.js';

// Config
export { ConfigError, ConfigNotFoundError, InvalidConfigError, ConfigValidationError } from './config.js';

// Provider
export { ProviderError, ProviderFetchError, ProviderMatchError, NoCognitivesFoundError } from './provider.js';

// Install
export { InstallError, PathTraversalError, SymlinkError, FileWriteError, EloopError } from './install.js';

// Lock
export { LockError, LockReadError, LockCorruptedError, LockWriteError, LockMigrationError, MigrationError } from './lock.js';

// Discovery
export { DiscoveryError, ParseError, ScanError, ValidationError } from './discovery.js';

// Operation
export { OperationError, ConflictError } from './operation.js';

// Source
export { SourceError, SourceParseError, InvalidSourceError, GitCloneError } from './source.js';

// ---------- Error Code Map ----------

export const ERROR_CODES = {
  // Provider
  PROVIDER_ERROR: 'PROVIDER_ERROR',
  PROVIDER_FETCH_ERROR: 'PROVIDER_FETCH_ERROR',
  PROVIDER_MATCH_ERROR: 'PROVIDER_MATCH_ERROR',
  NO_COGNITIVES_FOUND: 'NO_COGNITIVES_FOUND',

  // Installer
  INSTALL_ERROR: 'INSTALL_ERROR',
  PATH_TRAVERSAL_ERROR: 'PATH_TRAVERSAL_ERROR',
  SYMLINK_ERROR: 'SYMLINK_ERROR',
  FILE_WRITE_ERROR: 'FILE_WRITE_ERROR',
  ELOOP_ERROR: 'ELOOP_ERROR',

  // Discovery
  DISCOVERY_ERROR: 'DISCOVERY_ERROR',
  PARSE_ERROR: 'PARSE_ERROR',
  SCAN_ERROR: 'SCAN_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',

  // Lock
  LOCK_ERROR: 'LOCK_ERROR',
  LOCK_READ_ERROR: 'LOCK_READ_ERROR',
  LOCK_WRITE_ERROR: 'LOCK_WRITE_ERROR',
  LOCK_MIGRATION_ERROR: 'LOCK_MIGRATION_ERROR',

  // Config
  CONFIG_ERROR: 'CONFIG_ERROR',
  CONFIG_NOT_FOUND: 'CONFIG_NOT_FOUND',
  INVALID_CONFIG_ERROR: 'INVALID_CONFIG_ERROR',

  // Source
  SOURCE_ERROR: 'SOURCE_ERROR',
  SOURCE_PARSE_ERROR: 'SOURCE_PARSE_ERROR',
  GIT_CLONE_ERROR: 'GIT_CLONE_ERROR',

  // Operation
  OPERATION_ERROR: 'OPERATION_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
} as const;

export type ErrorCode = typeof ERROR_CODES[keyof typeof ERROR_CODES];
```

**Verification:**
```bash
pnpm tsc --noEmit
```

---

## Phase 1.4: Foundation Tests (0.5 days)

### Task 1.4.1: Create tests/types/result.test.ts

**File:** `tests/types/result.test.ts`
**Steps:**
- [ ] Test `ok()` creates a success result with `ok: true`
- [ ] Test `err()` creates a failure result with `ok: false`
- [ ] Test `unwrap()` returns value for ok results
- [ ] Test `unwrap()` throws error for err results
- [ ] Test `mapResult()` transforms success values
- [ ] Test `mapResult()` passes through errors unchanged
- [ ] Test `isOk()` and `isErr()` type guards

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { describe, it, expect } from 'vitest';
import { ok, err, unwrap, mapResult, isOk, isErr } from '../../src/types/result.js';
import { CognitError } from '../../src/errors/base.js';

class TestError extends CognitError {
  readonly code = 'TEST_ERROR';
  readonly module = 'test';
}

describe('Result<T, E>', () => {
  describe('ok()', () => {
    it('creates a success result', () => {
      const result = ok(42);
      expect(result.ok).toBe(true);
      expect(result.value).toBe(42);
    });
  });

  describe('err()', () => {
    it('creates a failure result', () => {
      const error = new TestError('something failed');
      const result = err(error);
      expect(result.ok).toBe(false);
      expect(result.error).toBe(error);
    });
  });

  describe('unwrap()', () => {
    it('returns value for ok result', () => {
      expect(unwrap(ok('hello'))).toBe('hello');
    });

    it('throws for err result', () => {
      const error = new TestError('fail');
      expect(() => unwrap(err(error))).toThrow(error);
    });
  });

  describe('mapResult()', () => {
    it('transforms success value', () => {
      const result = mapResult(ok(10), (v) => v * 2);
      expect(result).toEqual({ ok: true, value: 20 });
    });

    it('passes through error unchanged', () => {
      const error = new TestError('fail');
      const result = mapResult(err(error), (v: number) => v * 2);
      expect(result).toEqual({ ok: false, error });
    });
  });

  describe('isOk() / isErr()', () => {
    it('isOk returns true for ok results', () => {
      expect(isOk(ok(1))).toBe(true);
      expect(isOk(err(new TestError('f')))).toBe(false);
    });

    it('isErr returns true for err results', () => {
      expect(isErr(err(new TestError('f')))).toBe(true);
      expect(isErr(ok(1))).toBe(false);
    });
  });
});
```

**Verification:**
```bash
pnpm vitest run tests/types/result.test.ts
```

---

### Task 1.4.2: Create tests/types/brands.test.ts

**File:** `tests/types/brands.test.ts`
**Steps:**
- [ ] Test `agentName()` accepts valid names like `"claude-code"`, `"cursor"`, `"a1"`
- [ ] Test `agentName()` rejects uppercase, spaces, starting with hyphen, empty
- [ ] Test `cognitiveName()` accepts `"react-best-practices"`, rejects strings with `/`
- [ ] Test `safeName()` rejects `"."`, `".."`, strings with `:`, `/`, `\`, null bytes
- [ ] Test `sourceIdentifier()` rejects empty string
- [ ] Test `isAgentName()` type guard
- [ ] Test `isCognitiveName()` type guard

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { describe, it, expect } from 'vitest';
import {
  agentName,
  cognitiveName,
  safeName,
  sourceIdentifier,
  isAgentName,
  isCognitiveName,
} from '../../src/types/brands.js';

describe('Branded Types', () => {
  describe('agentName()', () => {
    it('accepts valid agent names', () => {
      expect(() => agentName('claude-code')).not.toThrow();
      expect(() => agentName('cursor')).not.toThrow();
      expect(() => agentName('a1')).not.toThrow();
      expect(() => agentName('gemini-cli')).not.toThrow();
    });

    it('rejects invalid agent names', () => {
      expect(() => agentName('Claude-Code')).toThrow('Invalid agent name');
      expect(() => agentName('has space')).toThrow('Invalid agent name');
      expect(() => agentName('-starts-hyphen')).toThrow('Invalid agent name');
      expect(() => agentName('')).toThrow('Invalid agent name');
    });
  });

  describe('cognitiveName()', () => {
    it('accepts valid cognitive names', () => {
      expect(() => cognitiveName('react-best-practices')).not.toThrow();
      expect(() => cognitiveName('My Skill')).not.toThrow();
    });

    it('rejects names with path separators', () => {
      expect(() => cognitiveName('path/name')).toThrow('Invalid cognitive name');
      expect(() => cognitiveName('path\\name')).toThrow('Invalid cognitive name');
      expect(() => cognitiveName('')).toThrow('Invalid cognitive name');
    });
  });

  describe('safeName()', () => {
    it('accepts filesystem-safe names', () => {
      expect(() => safeName('my-skill')).not.toThrow();
      expect(() => safeName('react-best-practices')).not.toThrow();
    });

    it('rejects unsafe names', () => {
      expect(() => safeName('.')).toThrow('Unsafe name');
      expect(() => safeName('..')).toThrow('Unsafe name');
      expect(() => safeName('a/b')).toThrow('Unsafe name');
      expect(() => safeName('a\\b')).toThrow('Unsafe name');
      expect(() => safeName('a:b')).toThrow('Unsafe name');
      expect(() => safeName('a\0b')).toThrow('Unsafe name');
      expect(() => safeName('')).toThrow('Unsafe name');
    });
  });

  describe('sourceIdentifier()', () => {
    it('accepts non-empty strings', () => {
      expect(() => sourceIdentifier('owner/repo')).not.toThrow();
    });

    it('rejects empty string', () => {
      expect(() => sourceIdentifier('')).toThrow('Empty source identifier');
    });
  });

  describe('type guards', () => {
    it('isAgentName validates correctly', () => {
      expect(isAgentName('claude-code')).toBe(true);
      expect(isAgentName('INVALID')).toBe(false);
    });

    it('isCognitiveName validates correctly', () => {
      expect(isCognitiveName('my-skill')).toBe(true);
      expect(isCognitiveName('')).toBe(false);
      expect(isCognitiveName('a/b')).toBe(false);
    });
  });
});
```

**Verification:**
```bash
pnpm vitest run tests/types/brands.test.ts
```

---

### Task 1.4.3: Create tests/errors/base.test.ts

**File:** `tests/errors/base.test.ts`
**Steps:**
- [ ] Test `CognitError` subclass instantiation preserves code and module
- [ ] Test `name` property matches constructor name
- [ ] Test `toJSON()` returns structured object with code, module, message
- [ ] Test `cause` chaining via `ErrorOptions`
- [ ] Test `instanceof` hierarchy: `ProviderFetchError instanceof ProviderError instanceof CognitError`
- [ ] Test `PathTraversalError instanceof InstallError instanceof CognitError`

**BEFORE:** No file exists.

**AFTER:**
```typescript
import { describe, it, expect } from 'vitest';
import { CognitError } from '../../src/errors/base.js';
import { ProviderError, ProviderFetchError } from '../../src/errors/provider.js';
import { InstallError, PathTraversalError } from '../../src/errors/install.js';
import { LockReadError, LockMigrationError } from '../../src/errors/lock.js';
import { InvalidConfigError } from '../../src/errors/config.js';

describe('Error Hierarchy', () => {
  it('CognitError subclasses preserve code and module', () => {
    const error = new ProviderError('test', 'github');
    expect(error.code).toBe('PROVIDER_ERROR');
    expect(error.module).toBe('providers');
    expect(error.message).toBe('test');
  });

  it('error name matches constructor name', () => {
    const error = new ProviderFetchError('https://example.com', 'github', 404);
    expect(error.name).toBe('ProviderFetchError');
  });

  it('toJSON() returns structured object', () => {
    const error = new InvalidConfigError('cwd', 'must be absolute path');
    const json = error.toJSON();
    expect(json).toEqual({
      name: 'InvalidConfigError',
      code: 'INVALID_CONFIG_ERROR',
      module: 'config',
      message: 'Invalid config: cwd -- must be absolute path',
      cause: undefined,
    });
  });

  it('supports cause chaining', () => {
    const rootCause = new Error('ENOENT');
    const error = new LockReadError('/path/to/lock', { cause: rootCause });
    expect(error.cause).toBe(rootCause);
  });

  it('instanceof hierarchy works for providers', () => {
    const error = new ProviderFetchError('url', 'github', 500);
    expect(error).toBeInstanceOf(ProviderFetchError);
    expect(error).toBeInstanceOf(ProviderError);
    expect(error).toBeInstanceOf(CognitError);
    expect(error).toBeInstanceOf(Error);
  });

  it('instanceof hierarchy works for installer', () => {
    const error = new PathTraversalError('../../../etc/passwd');
    expect(error).toBeInstanceOf(PathTraversalError);
    expect(error).toBeInstanceOf(InstallError);
    expect(error).toBeInstanceOf(CognitError);
  });

  it('lock migration error stores version info', () => {
    const error = new LockMigrationError(3, 5);
    expect(error.fromVersion).toBe(3);
    expect(error.toVersion).toBe(5);
    expect(error.code).toBe('LOCK_MIGRATION_ERROR');
  });
});
```

**Verification:**
```bash
pnpm vitest run tests/errors/base.test.ts
```

---

## Definition of Done

- [ ] `pnpm install` succeeds with zero errors
- [ ] `pnpm tsc --noEmit` compiles all types and errors with zero errors under strict mode
- [ ] `pnpm vitest run` passes all 3 test files (result, brands, errors)
- [ ] All type files export from `src/types/index.ts` barrel
- [ ] All error files export from `src/errors/index.ts` barrel
- [ ] No `any` in any source file
- [ ] All interface properties are `readonly`
- [ ] `eslint src/` reports zero errors
- [ ] `src/index.ts` placeholder re-exports from `types/` and `errors/`

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| `exactOptionalPropertyTypes` causes too many errors | Medium | Low | Can disable this flag initially, re-enable in Sprint 8 |
| `verbatimModuleSyntax` breaks imports | Low | Medium | Remove flag if it conflicts with vitest transform |
| `gray-matter` types are outdated | Low | Low | Use `@types/gray-matter` or declare module |
| Branded type constructors too strict | Medium | Low | Relax validation regex after testing against real data |

---

## Rollback Strategy

If this sprint fails:
1. The entire `src/types/` and `src/errors/` directories can be deleted without affecting any other code
2. No external consumers depend on these types yet
3. All scaffolding files (package.json, tsconfig, etc.) can be regenerated from scratch
4. No database, API, or infrastructure changes to revert
