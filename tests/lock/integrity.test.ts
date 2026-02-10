import { describe, it, expect } from 'vitest';
import { createMemoryFs } from '../../src/fs/memory.js';
import {
  computeContentHash,
  verifyContentHash,
  computeDirectoryHash,
} from '../../src/lock/integrity.js';

describe('computeContentHash()', () => {
  it('returns a deterministic SHA-256 hex digest', () => {
    const hash1 = computeContentHash('hello world');
    const hash2 = computeContentHash('hello world');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex = 64 chars
  });

  it('produces different hashes for different content', () => {
    const hash1 = computeContentHash('content A');
    const hash2 = computeContentHash('content B');
    expect(hash1).not.toBe(hash2);
  });
});

describe('verifyContentHash()', () => {
  it('returns true when the file content matches the expected hash', async () => {
    const content = '# My Skill';
    const hash = computeContentHash(content);
    const memFs = createMemoryFs({ '/skill.md': content });

    const result = await verifyContentHash('/skill.md', hash, memFs);
    expect(result).toBe(true);
  });

  it('returns false when the file content does not match', async () => {
    const memFs = createMemoryFs({ '/skill.md': 'original content' });
    const wrongHash = computeContentHash('different content');

    const result = await verifyContentHash('/skill.md', wrongHash, memFs);
    expect(result).toBe(false);
  });

  it('returns false when the file does not exist', async () => {
    const memFs = createMemoryFs();
    const result = await verifyContentHash('/nonexistent.md', 'abc123', memFs);
    expect(result).toBe(false);
  });
});

describe('computeDirectoryHash()', () => {
  it('returns a deterministic hash for a directory', async () => {
    const memFs = createMemoryFs({
      '/dir/a.txt': 'alpha',
      '/dir/b.txt': 'beta',
    });

    const hash1 = await computeDirectoryHash('/dir', memFs);
    const hash2 = await computeDirectoryHash('/dir', memFs);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });

  it('hashes files in sorted order (deterministic regardless of insertion)', async () => {
    // Both should produce the same hash since files are sorted by name
    const fsA = createMemoryFs({
      '/dir/b.txt': 'beta',
      '/dir/a.txt': 'alpha',
    });
    const fsB = createMemoryFs({
      '/dir/a.txt': 'alpha',
      '/dir/b.txt': 'beta',
    });

    const hashA = await computeDirectoryHash('/dir', fsA);
    const hashB = await computeDirectoryHash('/dir', fsB);
    expect(hashA).toBe(hashB);
  });
});
