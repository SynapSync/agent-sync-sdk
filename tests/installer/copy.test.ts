import { describe, it, expect } from 'vitest';
import { createMemoryFs } from '../../src/fs/memory.js';
import { isExcluded, deepCopy } from '../../src/installer/copy.js';

describe('isExcluded()', () => {
  it('excludes names starting with underscore', () => {
    expect(isExcluded('_internal', false)).toBe(true);
    expect(isExcluded('_helper', true)).toBe(true);
  });

  it('excludes .git directories only', () => {
    expect(isExcluded('.git', true)).toBe(true);
    expect(isExcluded('.git', false)).toBe(false);
  });

  it('excludes README.md and metadata.json files', () => {
    expect(isExcluded('README.md', false)).toBe(true);
    expect(isExcluded('metadata.json', false)).toBe(true);
  });

  it('does not exclude normal files or directories', () => {
    expect(isExcluded('SKILL.md', false)).toBe(false);
    expect(isExcluded('src', true)).toBe(false);
    expect(isExcluded('index.ts', false)).toBe(false);
  });

  it('does not exclude README.md or metadata.json when they are directories', () => {
    expect(isExcluded('README.md', true)).toBe(false);
    expect(isExcluded('metadata.json', true)).toBe(false);
  });
});

describe('deepCopy()', () => {
  it('copies a flat directory of files', async () => {
    const memFs = createMemoryFs({
      '/src/SKILL.md': '# My Skill',
      '/src/helper.ts': 'export const x = 1;',
    });

    await deepCopy('/src', '/dest', memFs);

    expect(await memFs.readFile('/dest/SKILL.md', 'utf-8')).toBe('# My Skill');
    expect(await memFs.readFile('/dest/helper.ts', 'utf-8')).toBe('export const x = 1;');
  });

  it('copies nested directories recursively', async () => {
    const memFs = createMemoryFs({
      '/src/SKILL.md': '# Top',
      '/src/sub/nested.md': 'nested content',
    });

    await deepCopy('/src', '/dest', memFs);

    expect(await memFs.readFile('/dest/SKILL.md', 'utf-8')).toBe('# Top');
    expect(await memFs.readFile('/dest/sub/nested.md', 'utf-8')).toBe('nested content');
  });

  it('skips excluded entries during copy', async () => {
    const memFs = createMemoryFs({
      '/src/SKILL.md': '# Skill',
      '/src/README.md': '# Readme',
      '/src/metadata.json': '{}',
      '/src/_private.ts': 'secret',
    });

    await deepCopy('/src', '/dest', memFs);

    expect(await memFs.readFile('/dest/SKILL.md', 'utf-8')).toBe('# Skill');
    expect(await memFs.exists('/dest/README.md')).toBe(false);
    expect(await memFs.exists('/dest/metadata.json')).toBe(false);
    expect(await memFs.exists('/dest/_private.ts')).toBe(false);
  });
});
