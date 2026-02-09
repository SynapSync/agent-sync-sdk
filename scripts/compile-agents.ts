#!/usr/bin/env tsx
// scripts/compile-agents.ts
// Reads agents/*.yaml and config/cognitive-types.yaml, generates TypeScript files
// in src/agents/__generated__/.

import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import { parse } from 'yaml';

// ---------- Types for YAML input ----------

interface AgentYaml {
  name: string;
  displayName: string;
  rootDir?: string;
  localRoot?: string;
  globalRoot?: string;
  detect?: DetectRule[];
}

type DetectRule =
  | { homeDir: string }
  | { xdgConfig: string }
  | { cwdDir: string }
  | { absolutePath: string }
  | { envVar: string }
  | { envResolved: string };

interface CognitiveTypeYaml {
  type: string;
  subdir: string;
  fileName: string;
}

// ---------- Resolved agent config ----------

interface ResolvedAgent {
  name: string;
  displayName: string;
  localRoot: string;
  globalRoot: string | undefined;
  detect: DetectRule[];
  dirs: Record<string, { local: string; global: string | undefined }>;
}

// ---------- Paths ----------

const ROOT = join(import.meta.dirname ?? process.cwd(), '..');
const AGENTS_DIR = join(ROOT, 'agents');
const CONFIG_DIR = join(ROOT, 'config');
const OUT_DIR = join(ROOT, 'src', 'agents', '__generated__');

const HEADER = '// AUTO-GENERATED -- DO NOT EDIT\n';

// ---------- Phase 1: Load and validate ----------

function loadCognitiveTypes(): CognitiveTypeYaml[] {
  const raw = readFileSync(join(CONFIG_DIR, 'cognitive-types.yaml'), 'utf-8');
  const parsed = parse(raw) as CognitiveTypeYaml[];
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('cognitive-types.yaml must be a non-empty array');
  }
  for (const ct of parsed) {
    if (!ct.type || !ct.subdir || !ct.fileName) {
      throw new Error(`Invalid cognitive type entry: ${JSON.stringify(ct)}`);
    }
  }
  return parsed;
}

function loadAgents(): AgentYaml[] {
  const files = readdirSync(AGENTS_DIR).filter((f) => f.endsWith('.yaml')).sort();
  const agents: AgentYaml[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    const raw = readFileSync(join(AGENTS_DIR, file), 'utf-8');
    const agent = parse(raw) as AgentYaml;
    const expectedName = basename(file, '.yaml');

    // Validate required fields
    if (!agent.name) throw new Error(`${file}: missing 'name'`);
    if (!agent.displayName) throw new Error(`${file}: missing 'displayName'`);
    if (!agent.rootDir && !agent.localRoot) {
      throw new Error(`${file}: must have 'rootDir' or 'localRoot'`);
    }

    // Validate name matches filename
    if (agent.name !== expectedName) {
      throw new Error(`${file}: name '${agent.name}' does not match filename '${expectedName}'`);
    }

    // Check for duplicates
    if (seen.has(agent.name)) {
      throw new Error(`Duplicate agent name: '${agent.name}'`);
    }
    seen.add(agent.name);

    agents.push(agent);
  }

  return agents;
}

// ---------- Phase 2: Resolve conventions ----------

function resolveAgent(agent: AgentYaml, cognitiveTypes: CognitiveTypeYaml[]): ResolvedAgent {
  let localRoot: string;
  let globalRoot: string | undefined;

  if (agent.rootDir) {
    // Convention: rootDir -> localRoot = rootDir, globalRoot = ~/rootDir
    localRoot = agent.rootDir;
    globalRoot = agent.globalRoot ?? `~/${agent.rootDir}`;
  } else {
    localRoot = agent.localRoot!;
    globalRoot = agent.globalRoot;
  }

  // Build cognitive type dirs
  const dirs: Record<string, { local: string; global: string | undefined }> = {};
  for (const ct of cognitiveTypes) {
    dirs[ct.type] = {
      local: `${localRoot}/${ct.subdir}`,
      global: globalRoot ? `${globalRoot}/${ct.subdir}` : undefined,
    };
  }

  return {
    name: agent.name,
    displayName: agent.displayName,
    localRoot,
    globalRoot,
    detect: agent.detect ?? [],
    dirs,
  };
}

// ---------- Phase 3: Generate TypeScript ----------

function generateAgentType(agents: ResolvedAgent[]): string {
  const names = agents.map((a) => `  | '${a.name}'`).join('\n');
  return `${HEADER}
export type AgentType =
${names}
  ;
`;
}

function generateAgents(agents: ResolvedAgent[], cognitiveTypes: CognitiveTypeYaml[]): string {
  const lines: string[] = [];
  lines.push(HEADER);
  lines.push(`export interface GeneratedAgentDirConfig {`);
  lines.push(`  readonly local: string;`);
  lines.push(`  readonly global: string | undefined;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export interface GeneratedDetectRule {`);
  lines.push(`  readonly homeDir?: string;`);
  lines.push(`  readonly xdgConfig?: string;`);
  lines.push(`  readonly cwdDir?: string;`);
  lines.push(`  readonly absolutePath?: string;`);
  lines.push(`  readonly envVar?: string;`);
  lines.push(`  readonly envResolved?: string;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export interface GeneratedAgentConfig {`);
  lines.push(`  readonly name: string;`);
  lines.push(`  readonly displayName: string;`);
  lines.push(`  readonly localRoot: string;`);
  lines.push(`  readonly globalRoot: string | undefined;`);
  lines.push(`  readonly detect: readonly GeneratedDetectRule[];`);
  lines.push(`  readonly dirs: Readonly<Record<string, GeneratedAgentDirConfig>>;`);
  lines.push(`}`);
  lines.push(``);
  lines.push(`export const AGENT_CONFIGS: Record<string, GeneratedAgentConfig> = {`);

  for (const agent of agents) {
    lines.push(`  '${agent.name}': {`);
    lines.push(`    name: '${agent.name}',`);
    lines.push(`    displayName: '${agent.displayName}',`);
    lines.push(`    localRoot: '${agent.localRoot}',`);
    lines.push(`    globalRoot: ${agent.globalRoot ? `'${agent.globalRoot}'` : 'undefined'},`);
    lines.push(`    detect: [`);
    for (const rule of agent.detect) {
      const entries = Object.entries(rule);
      if (entries.length > 0) {
        const [key, value] = entries[0]!;
        lines.push(`      { ${key}: '${value}' },`);
      }
    }
    lines.push(`    ],`);
    lines.push(`    dirs: {`);
    for (const ct of cognitiveTypes) {
      const dir = agent.dirs[ct.type]!;
      lines.push(`      ${ct.type}: { local: '${dir.local}', global: ${dir.global ? `'${dir.global}'` : 'undefined'} },`);
    }
    lines.push(`    },`);
    lines.push(`  },`);
  }

  lines.push(`};`);
  lines.push(``);
  lines.push(`export const AGENT_NAMES = [`);
  for (const agent of agents) {
    lines.push(`  '${agent.name}',`);
  }
  lines.push(`] as const;`);
  lines.push(``);

  return lines.join('\n');
}

// ---------- Main ----------

function main(): void {
  console.log('compile-agents: loading cognitive types...');
  const cognitiveTypes = loadCognitiveTypes();
  console.log(`  loaded ${cognitiveTypes.length} cognitive types`);

  console.log('compile-agents: loading agent definitions...');
  const agents = loadAgents();
  console.log(`  loaded ${agents.length} agents`);

  console.log('compile-agents: resolving conventions...');
  const resolved = agents.map((a) => resolveAgent(a, cognitiveTypes));

  // Ensure output directory exists
  if (!existsSync(OUT_DIR)) {
    mkdirSync(OUT_DIR, { recursive: true });
  }

  console.log('compile-agents: generating agent-type.ts...');
  writeFileSync(join(OUT_DIR, 'agent-type.ts'), generateAgentType(resolved), 'utf-8');

  console.log('compile-agents: generating agents.ts...');
  writeFileSync(join(OUT_DIR, 'agents.ts'), generateAgents(resolved, cognitiveTypes), 'utf-8');

  console.log(`compile-agents: done! Generated 2 files in ${OUT_DIR}`);
}

main();
