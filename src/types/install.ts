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
