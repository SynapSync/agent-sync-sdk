import type { AgentName } from './brands.js';
import type { CognitiveType } from './cognitive.js';

// ---------- AgentType ----------

import type { AgentType } from '../agents/__generated__/agent-type.js';
export type { AgentType } from '../agents/__generated__/agent-type.js';

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
  getDir(
    type: AgentType,
    cognitiveType: CognitiveType,
    scope: 'local' | 'global',
  ): string | undefined;
  detectInstalled(): Promise<AgentDetectionResult[]>;
  register(config: AgentConfig): void;
}
