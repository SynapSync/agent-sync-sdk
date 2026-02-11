import type { AgentType, AgentDetectionResult } from './agent.js';
import type { CognitiveType, CognitiveRef } from './cognitive.js';
import type { InstallMode, InstallResult } from './install.js';
import type { CognitError } from '../errors/base.js';

export type OperationName = 'add' | 'remove' | 'list' | 'find' | 'update' | 'sync' | 'check' | 'init';

export interface SDKEventMap {
  // -- SDK lifecycle --
  'sdk:initialized': { readonly configHash: string };
  'sdk:error': { readonly error: CognitError };

  // -- Operation lifecycle --
  'operation:start': { readonly operation: OperationName; readonly options: unknown };
  'operation:complete': { readonly operation: OperationName; readonly result: unknown; readonly durationMs: number };
  'operation:error': { readonly operation: OperationName; readonly error: CognitError };

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
