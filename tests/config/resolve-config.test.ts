import { describe, it, expect } from 'vitest';
import { resolveConfig, validateConfig } from '../../src/config/index.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import { InvalidConfigError } from '../../src/errors/config.js';
import {
  DEFAULT_AGENTS_DIR,
  DEFAULT_LOCK_FILE_NAME,
  DEFAULT_CLONE_TIMEOUT_MS,
  DEFAULT_CLONE_DEPTH,
  DEFAULT_TELEMETRY_ENABLED,
} from '../../src/config/defaults.js';

function makeFs() {
  return createMemoryFs();
}

describe('resolveConfig()', () => {
  it('applies all defaults when called with no overrides', () => {
    const fs = makeFs();
    const config = resolveConfig(undefined, fs);

    expect(config.agentsDir).toBe(DEFAULT_AGENTS_DIR);
    expect(config.lockFileName).toBe(DEFAULT_LOCK_FILE_NAME);
    expect(config.cwd).toBe(process.cwd());
    expect(config.git.cloneTimeoutMs).toBe(DEFAULT_CLONE_TIMEOUT_MS);
    expect(config.git.depth).toBe(DEFAULT_CLONE_DEPTH);
    expect(config.telemetry.enabled).toBe(DEFAULT_TELEMETRY_ENABLED);
    expect(config.providers.custom).toEqual([]);
    expect(config.agents.additional).toEqual([]);
    expect(config.fs).toBe(fs);
  });

  it('partial override: only cwd changes, rest stays default', () => {
    const fs = makeFs();
    const config = resolveConfig({ cwd: '/custom/dir' }, fs);

    expect(config.cwd).toBe('/custom/dir');
    expect(config.agentsDir).toBe(DEFAULT_AGENTS_DIR);
    expect(config.lockFileName).toBe(DEFAULT_LOCK_FILE_NAME);
    expect(config.git.cloneTimeoutMs).toBe(DEFAULT_CLONE_TIMEOUT_MS);
    expect(config.git.depth).toBe(DEFAULT_CLONE_DEPTH);
  });

  it('nested override: git.depth changes, cloneTimeoutMs stays default', () => {
    const fs = makeFs();
    const config = resolveConfig({ git: { depth: 5, cloneTimeoutMs: DEFAULT_CLONE_TIMEOUT_MS } }, fs);

    expect(config.git.depth).toBe(5);
    expect(config.git.cloneTimeoutMs).toBe(DEFAULT_CLONE_TIMEOUT_MS);
  });
});

describe('validateConfig()', () => {
  it('throws InvalidConfigError on empty agentsDir', () => {
    const fs = makeFs();
    expect(() =>
      resolveConfig({ agentsDir: '' }, fs),
    ).toThrow(InvalidConfigError);
  });

  it('throws InvalidConfigError on non-JSON lockFileName', () => {
    const fs = makeFs();
    expect(() =>
      resolveConfig({ lockFileName: 'lock.yaml' }, fs),
    ).toThrow(InvalidConfigError);
  });

  it('throws InvalidConfigError on negative cloneTimeoutMs', () => {
    const fs = makeFs();
    expect(() =>
      resolveConfig({ git: { cloneTimeoutMs: -1, depth: DEFAULT_CLONE_DEPTH } }, fs),
    ).toThrow(InvalidConfigError);
  });

  it('throws InvalidConfigError directly via validateConfig()', () => {
    const fs = makeFs();
    const badConfig = {
      agentsDir: '',
      lockFileName: '.cognit-lock.json',
      cwd: '/tmp',
      homeDir: '/home',
      fs,
      git: { cloneTimeoutMs: 30_000, depth: 1 },
      providers: { custom: [] as const },
      agents: { additional: [] as const },
      telemetry: { enabled: true },
    };
    expect(() => validateConfig(badConfig)).toThrow(InvalidConfigError);
  });
});
