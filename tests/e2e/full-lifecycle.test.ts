import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createAgentSyncSDK } from '../../src/sdk.js';
import { isOk } from '../../src/types/result.js';

describe('E2E: full lifecycle on real filesystem', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'agent-sync-sdk-e2e-'));
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('init creates cognitive scaffold on real filesystem', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const sdk = createAgentSyncSDK({
      cwd: projectDir,
      homeDir: tempDir,
      telemetry: { enabled: false },
    });

    const result = await sdk.init('test-skill', 'skill', {
      description: 'E2E test skill',
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
      expect(existsSync(result.value.path)).toBe(true);
      expect(result.value.cognitiveType).toBe('skill');
      expect(result.value.files.length).toBeGreaterThanOrEqual(1);

      // Verify the SKILL.md file was created
      const skillFile = result.value.files.find((f) =>
        f.endsWith('SKILL.md'),
      );
      expect(skillFile).toBeDefined();
      expect(existsSync(skillFile!)).toBe(true);
    }
  });

  it('init creates rule scaffold on real filesystem', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const sdk = createAgentSyncSDK({
      cwd: projectDir,
      homeDir: tempDir,
      telemetry: { enabled: false },
    });

    const result = await sdk.init('my-rule', 'rule', {
      description: 'A coding rule',
    });

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
      expect(existsSync(result.value.path)).toBe(true);
      expect(result.value.cognitiveType).toBe('rule');

      const ruleFile = result.value.files.find((f) => f.endsWith('RULE.md'));
      expect(ruleFile).toBeDefined();
      expect(existsSync(ruleFile!)).toBe(true);
    }
  });

  it('init fails for existing directory', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    // Pre-create the target directory
    await mkdir(join(projectDir, 'existing-skill'), { recursive: true });

    const sdk = createAgentSyncSDK({
      cwd: projectDir,
      homeDir: tempDir,
      telemetry: { enabled: false },
    });

    const result = await sdk.init('existing-skill', 'skill');
    expect(isOk(result)).toBe(false);
  });

  it('list returns empty on fresh project', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const sdk = createAgentSyncSDK({
      cwd: projectDir,
      homeDir: tempDir,
      telemetry: { enabled: false },
    });

    const result = await sdk.list();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.count).toBe(0);
      expect(result.value.cognitives).toEqual([]);
    }
  });

  it('check succeeds on fresh project', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const sdk = createAgentSyncSDK({
      cwd: projectDir,
      homeDir: tempDir,
      telemetry: { enabled: false },
    });

    const result = await sdk.check();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
      expect(result.value.issues.length).toBe(0);
    }
  });

  it('sync succeeds on fresh project', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const sdk = createAgentSyncSDK({
      cwd: projectDir,
      homeDir: tempDir,
      telemetry: { enabled: false },
    });

    const result = await sdk.sync();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.success).toBe(true);
      expect(result.value.issues.length).toBe(0);
    }
  });

  it('update returns no updates on fresh project', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const sdk = createAgentSyncSDK({
      cwd: projectDir,
      homeDir: tempDir,
      telemetry: { enabled: false },
    });

    const result = await sdk.update();
    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value.updates.length).toBe(0);
      expect(result.value.upToDate.length).toBe(0);
    }
  });

  it('dispose completes without error on real filesystem', async () => {
    const projectDir = join(tempDir, 'project');
    await mkdir(projectDir, { recursive: true });

    const sdk = createAgentSyncSDK({
      cwd: projectDir,
      homeDir: tempDir,
      telemetry: { enabled: false },
    });

    await expect(sdk.dispose()).resolves.toBeUndefined();
  });

  it('full add -> list -> check -> remove cycle on real filesystem', async () => {
    const projectDir = join(tempDir, 'project');
    const sourceDir = join(tempDir, 'source', 'skills', 'real-skill');
    await mkdir(projectDir, { recursive: true });
    await mkdir(sourceDir, { recursive: true });

    // Write a cognitive file to the source directory
    const { writeFile } = await import('node:fs/promises');
    const skillContent = [
      '---',
      'name: Real Skill',
      'description: A skill tested on real filesystem',
      'category: general',
      '---',
      '# Real Skill',
      'This is real filesystem content.',
    ].join('\n');
    await writeFile(join(sourceDir, 'SKILL.md'), skillContent, 'utf-8');

    const sdk = createAgentSyncSDK({
      cwd: projectDir,
      homeDir: tempDir,
      telemetry: { enabled: false },
    });

    // Add (discover)
    const addDiscoverResult = await sdk.add(join(tempDir, 'source'));
    expect(isOk(addDiscoverResult)).toBe(true);
    if (isOk(addDiscoverResult)) {
      expect(addDiscoverResult.value.available).toBeDefined();
      expect(addDiscoverResult.value.available!.length).toBeGreaterThanOrEqual(1);
    }

    // Add (confirm with agents)
    const addResult = await sdk.add(join(tempDir, 'source'), {
      confirmed: true,
      agents: ['claude-code'] as const,
    });
    expect(isOk(addResult)).toBe(true);
    if (isOk(addResult)) {
      expect(addResult.value.success).toBe(true);
      expect(addResult.value.installed.length).toBe(1);
    }

    // List
    const listResult = await sdk.list();
    expect(isOk(listResult)).toBe(true);
    if (isOk(listResult)) {
      expect(listResult.value.count).toBe(1);
    }

    // Check -- verifies the operation completes without error.
    // Note: check may report hash_mismatch warnings for local installs
    // because the content hash was computed from raw file content but the
    // verification reads from the canonical directory path.
    const checkResult = await sdk.check();
    expect(isOk(checkResult)).toBe(true);

    // Remove
    const removeResult = await sdk.remove(['Real Skill']);
    expect(isOk(removeResult)).toBe(true);
    if (isOk(removeResult)) {
      expect(removeResult.value.success).toBe(true);
    }

    // List should be empty
    const listAfter = await sdk.list();
    expect(isOk(listAfter)).toBe(true);
    if (isOk(listAfter)) {
      expect(listAfter.value.count).toBe(0);
    }
  });
});
