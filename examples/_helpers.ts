// examples/_helpers.ts
// Shared utilities for all SDK examples.

import { createAgentSyncSDK, isOk, isErr } from '../src/index.js';
import type { AgentSyncSDK, Result, CognitiveType, CognitError } from '../src/index.js';
import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---------- Setup / Teardown ----------

export interface TempProject {
  tempDir: string;
  projectDir: string;
  sourceDir: string;
  sdk: AgentSyncSDK;
}

export async function setupTempProject(): Promise<TempProject> {
  const tempDir = await mkdtemp(join(tmpdir(), 'sdk-example-'));
  const projectDir = join(tempDir, 'project');
  const sourceDir = join(tempDir, 'source');
  await mkdir(projectDir, { recursive: true });
  await mkdir(sourceDir, { recursive: true });

  const sdk = createAgentSyncSDK({
    cwd: projectDir,
    homeDir: tempDir,
    telemetry: { enabled: false },
  });

  return { tempDir, projectDir, sourceDir, sdk };
}

export async function teardown(tempDir: string): Promise<void> {
  await rm(tempDir, { recursive: true, force: true });
}

// ---------- Cognitive file helpers ----------

const FILE_NAMES: Record<CognitiveType, string> = {
  skill: 'SKILL.md',
  agent: 'AGENT.md',
  prompt: 'PROMPT.md',
  rule: 'RULE.md',
};

export async function writeCognitive(
  sourceDir: string,
  type: CognitiveType,
  name: string,
  description: string,
  content: string,
): Promise<string> {
  const typeDir = `${type}s`; // skill -> skills, rule -> rules, etc.
  const dir = join(sourceDir, typeDir, name);
  await mkdir(dir, { recursive: true });

  const filePath = join(dir, FILE_NAMES[type]);
  const fileContent = [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    'category: general',
    '---',
    content,
  ].join('\n');

  await writeFile(filePath, fileContent, 'utf-8');
  return filePath;
}

// ---------- Output helpers ----------

export function printHeader(title: string): void {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${title}`);
  console.log(`${'='.repeat(60)}\n`);
}

export function printStep(step: number, description: string): void {
  console.log(`\n--- Step ${step}: ${description} ---\n`);
}

export function printResult<T>(label: string, result: Result<T, CognitError>): void {
  if (isOk(result)) {
    console.log(`[OK] ${label}`);
    console.log(JSON.stringify(result.value, null, 2));
  } else {
    console.log(`[ERR] ${label}`);
    console.log(JSON.stringify(result.error, null, 2));
  }
}

export function printTable(rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    console.log('  (empty)');
    return;
  }
  console.table(rows);
}

export { isOk, isErr };
