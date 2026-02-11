import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const GENERATED_DIR = join(ROOT, 'src', 'agents', '__generated__');
const DEFINITIONS_DIR = join(ROOT, 'src', 'agents', 'definitions');

/** Run the compile-agents script via tsx and return stdout. */
function runCompile(args: string[] = []): string {
  return execFileSync(
    'npx',
    ['tsx', join(ROOT, 'src', 'agents', 'compile', 'compile.ts'), ...args],
    {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 30_000,
    },
  );
}

/** Count agent YAML definitions (excludes cognitive-types.yaml). */
function countDefinitions(): number {
  return readdirSync(DEFINITIONS_DIR).filter(
    (f) => f.endsWith('.yaml') && f !== 'cognitive-types.yaml',
  ).length;
}

describe('compile-agents', () => {
  it('should generate files in __generated__ directory', () => {
    runCompile(['--quiet']);

    expect(existsSync(join(GENERATED_DIR, 'agent-type.ts'))).toBe(true);
    expect(existsSync(join(GENERATED_DIR, 'agents.ts'))).toBe(true);
  });

  it('agent-type.ts should contain all agent types', () => {
    runCompile(['--quiet']);

    const content = readFileSync(join(GENERATED_DIR, 'agent-type.ts'), 'utf-8');
    const expectedCount = countDefinitions();

    // Each agent appears as "| 'agent-name'" in the union type
    const matches = content.match(/\| '[\w-]+'/g);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(expectedCount);

    // Verify the union type declaration exists
    expect(content).toContain('export type AgentType =');
  });

  it('agents.ts should contain AGENT_CONFIGS with all entries', () => {
    runCompile(['--quiet']);

    const content = readFileSync(join(GENERATED_DIR, 'agents.ts'), 'utf-8');
    const expectedCount = countDefinitions();

    // Verify AGENT_CONFIGS export exists
    expect(content).toContain('export const AGENT_CONFIGS');

    // Each agent has a "name: 'agent-name'," entry inside AGENT_CONFIGS
    const nameEntries = content.match(/^\s+name: '[\w-]+',$/gm);
    expect(nameEntries).not.toBeNull();
    expect(nameEntries!.length).toBe(expectedCount);

    // Verify AGENT_NAMES array exists with the same count
    expect(content).toContain('export const AGENT_NAMES = [');
    const agentNamesBlock = content.slice(content.indexOf('export const AGENT_NAMES = ['));
    const agentNameEntries = agentNamesBlock.match(/^\s+'[\w-]+',$/gm);
    expect(agentNameEntries).not.toBeNull();
    expect(agentNameEntries!.length).toBe(expectedCount);
  });

  it('--quiet flag should suppress stdout output', () => {
    const quietOutput = runCompile(['--quiet']);
    const normalOutput = runCompile();

    expect(quietOutput.trim()).toBe('');
    expect(normalOutput).toContain('compile-agents:');
    expect(normalOutput).toContain('done!');
  });

  it('DEFINITIONS_DIR should resolve to correct path with YAML files', () => {
    expect(existsSync(DEFINITIONS_DIR)).toBe(true);

    const yamlFiles = readdirSync(DEFINITIONS_DIR).filter((f) => f.endsWith('.yaml'));
    expect(yamlFiles.length).toBeGreaterThan(0);

    // cognitive-types.yaml must exist (required by compile script)
    expect(yamlFiles).toContain('cognitive-types.yaml');

    // Agent YAML count should be positive and match generated output
    const agentYamlCount = yamlFiles.filter((f) => f !== 'cognitive-types.yaml').length;
    expect(agentYamlCount).toBe(39);

    // Verify definitions dir is a sibling of compile dir (the path relationship
    // that broke in Sprint 4 when DEFINITIONS_DIR had a wrong relative path)
    const compileDir = join(ROOT, 'src', 'agents', 'compile');
    const expectedDefsDir = join(compileDir, '..', 'definitions');
    expect(resolve(expectedDefsDir)).toBe(resolve(DEFINITIONS_DIR));
  });
});
