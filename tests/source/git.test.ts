import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GitClientImpl } from '../../src/source/git.js';
import { createCapturingEventBus } from '../../src/events/index.js';
import { resolveConfig } from '../../src/config/index.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import { GitCloneError } from '../../src/errors/source.js';

const mockClone = vi.fn();
const mockSimpleGit = vi.fn(() => ({
  clone: mockClone,
}));

vi.mock('simple-git', () => ({
  simpleGit: (...args: unknown[]) => mockSimpleGit(...args),
}));

const mockMkdtemp = vi.fn().mockResolvedValue('/tmp/cognit-abc123');
const mockRm = vi.fn().mockResolvedValue(undefined);

vi.mock('node:fs/promises', async (importOriginal) => {
  const original = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...original,
    mkdtemp: (...args: unknown[]) => mockMkdtemp(...args),
    rm: (...args: unknown[]) => mockRm(...args),
  };
});

describe('GitClientImpl', () => {
  let eventBus: ReturnType<typeof createCapturingEventBus>;
  let gitClient: GitClientImpl;

  beforeEach(() => {
    vi.clearAllMocks();
    mockClone.mockResolvedValue(undefined);
    mockMkdtemp.mockResolvedValue('/tmp/cognit-abc123');
    mockRm.mockResolvedValue(undefined);

    const fs = createMemoryFs();
    eventBus = createCapturingEventBus();
    const config = resolveConfig(undefined, fs);
    gitClient = new GitClientImpl(config, eventBus);
  });

  describe('clone', () => {
    it('emits git:clone:start event', async () => {
      await gitClient.clone('https://github.com/owner/repo.git');

      const startEvents = eventBus.events.filter((e) => e.event === 'git:clone:start');
      expect(startEvents).toHaveLength(1);
      expect(startEvents[0]!.payload).toEqual({ url: 'https://github.com/owner/repo.git' });
    });

    it('on success emits git:clone:complete and returns temp dir', async () => {
      const result = await gitClient.clone('https://github.com/owner/repo.git');

      expect(result).toBe('/tmp/cognit-abc123');

      const completeEvents = eventBus.events.filter((e) => e.event === 'git:clone:complete');
      expect(completeEvents).toHaveLength(1);
      const payload = completeEvents[0]!.payload as {
        url: string;
        path: string;
        durationMs: number;
      };
      expect(payload.url).toBe('https://github.com/owner/repo.git');
      expect(payload.path).toBe('/tmp/cognit-abc123');
      expect(typeof payload.durationMs).toBe('number');
    });

    it('on failure emits git:clone:error and throws GitCloneError', async () => {
      mockClone.mockRejectedValueOnce(new Error('network timeout'));

      await expect(gitClient.clone('https://github.com/owner/repo.git')).rejects.toThrow(
        GitCloneError,
      );

      const errorEvents = eventBus.events.filter((e) => e.event === 'git:clone:error');
      expect(errorEvents).toHaveLength(1);
      const payload = errorEvents[0]!.payload as { url: string; error: string };
      expect(payload.url).toBe('https://github.com/owner/repo.git');
      expect(payload.error).toBe('network timeout');

      // Should attempt to clean up temp dir
      expect(mockRm).toHaveBeenCalledWith('/tmp/cognit-abc123', { recursive: true, force: true });
    });

    it('passes --depth and --branch options', async () => {
      await gitClient.clone('https://github.com/owner/repo.git', {
        depth: 3,
        ref: 'develop',
      });

      expect(mockClone).toHaveBeenCalledWith(
        'https://github.com/owner/repo.git',
        '/tmp/cognit-abc123',
        ['--depth', '3', '--branch', 'develop'],
      );
    });
  });

  describe('cleanup', () => {
    it('calls rm with recursive and force', async () => {
      await gitClient.cleanup('/tmp/cognit-xyz789');

      expect(mockRm).toHaveBeenCalledWith('/tmp/cognit-xyz789', { recursive: true, force: true });
    });
  });
});
