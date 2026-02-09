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
