import { simpleGit } from 'simple-git';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { GitClient, GitCloneOptions } from '../types/source.js';
import type { SDKConfig } from '../types/config.js';
import type { EventBus } from '../types/events.js';
import { GitCloneError } from '../errors/source.js';

export class GitClientImpl implements GitClient {
  constructor(
    private readonly config: SDKConfig,
    private readonly eventBus: EventBus,
  ) {}

  async clone(url: string, options?: GitCloneOptions): Promise<string> {
    const depth = options?.depth ?? this.config.git.depth;
    const timeoutMs = options?.timeoutMs ?? this.config.git.cloneTimeoutMs;
    const start = Date.now();

    this.eventBus.emit('git:clone:start', { url });

    const tempDir = await mkdtemp(join(tmpdir(), 'cognit-'));

    try {
      const git = simpleGit({ timeout: { block: timeoutMs } });
      const cloneArgs = ['--depth', String(depth)];

      if (options?.ref) {
        cloneArgs.push('--branch', options.ref);
      }

      await git.clone(url, tempDir, cloneArgs);

      this.eventBus.emit('git:clone:complete', {
        url,
        path: tempDir,
        durationMs: Date.now() - start,
      });

      return tempDir;
    } catch (cause) {
      this.eventBus.emit('git:clone:error', {
        url,
        error: (cause as Error).message,
      });
      try {
        await rm(tempDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
      throw new GitCloneError(url, (cause as Error).message, { cause: cause as Error });
    }
  }

  async cleanup(tempDir: string): Promise<void> {
    await rm(tempDir, { recursive: true, force: true });
  }
}
