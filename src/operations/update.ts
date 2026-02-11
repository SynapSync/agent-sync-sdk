import type { CognitError } from '../errors/base.js';
import type { LockEntry } from '../types/lock.js';
import type { RemoteCognitive } from '../types/cognitive.js';
import type { Result } from '../types/result.js';
import type {
  UpdateOptions,
  UpdateResult,
  UpdateInfo,
  UpdateError,
} from '../types/operations.js';
import { OperationError } from '../errors/operation.js';
import { computeContentHash } from '../lock/integrity.js';
import { BaseOperation } from './base.js';

export class UpdateOperation extends BaseOperation {
  async execute(
    options?: Partial<UpdateOptions>,
  ): Promise<Result<UpdateResult, CognitError>> {
    return this.executeWithLifecycle('update', options, () => this.run(options));
  }

  private async run(options?: Partial<UpdateOptions>): Promise<UpdateResult> {
    const allEntries = await this.ctx.lockManager.getAllEntries();
    const entryNames = Object.keys(allEntries);

    const targetNames =
      options?.names != null && options.names.length > 0
        ? entryNames.filter((n) => options.names!.includes(n))
        : entryNames;

    const updates: UpdateInfo[] = [];
    const upToDate: string[] = [];
    const errors: UpdateError[] = [];

    for (const name of targetNames) {
      const entry = allEntries[name];
      if (entry == null) continue;

      try {
        const remotes = await this.fetchRemote(entry);
        if (remotes.length === 0) {
          errors.push({ name, error: `No remote content found for "${name}"` });
          continue;
        }

        const remote = remotes[0]!;
        const newHash = computeContentHash(remote.content);

        if (newHash === entry.contentHash) {
          upToDate.push(name);
          continue;
        }

        const applied =
          options?.checkOnly !== true && options?.confirmed === true;

        if (applied) {
          await this.applyUpdate(name, entry, remote);
        }

        updates.push({
          name,
          currentHash: entry.contentHash,
          newHash,
          applied,
        });
      } catch (cause) {
        const message =
          cause instanceof Error ? cause.message : String(cause);
        errors.push({ name, error: message });
      }
    }

    return {
      success: errors.length === 0,
      updates,
      upToDate,
      errors,
      message: this.buildMessage(updates, upToDate, errors, options),
    };
  }

  private async fetchRemote(entry: LockEntry): Promise<RemoteCognitive[]> {
    const provider = this.ctx.providerRegistry.findProvider(entry.sourceUrl);
    if (provider == null) {
      throw new OperationError(
        `No provider found for source URL: ${entry.sourceUrl}`,
      );
    }

    return provider.fetchAll(entry.sourceUrl, {
      cognitiveType: entry.cognitiveType,
    });
  }

  private async applyUpdate(
    name: string,
    entry: LockEntry,
    remote: RemoteCognitive,
  ): Promise<void> {
    const detectionResults = await this.ctx.agentRegistry.detectInstalled();
    const installedAgents = detectionResults.filter((r) => r.installed);

    for (const agentResult of installedAgents) {
      await this.ctx.installer.remove(name, entry.cognitiveType, {
        agent: agentResult.agent,
        scope: 'project',
        mode: 'copy',
      });

      await this.ctx.installer.install(
        { kind: 'remote', cognitive: remote },
        { agent: agentResult.agent, scope: 'project', mode: 'copy' },
        { cwd: this.ctx.config.cwd },
      );
    }

    const newHash = computeContentHash(remote.content);
    await this.ctx.lockManager.addEntry(name, {
      source: entry.source,
      sourceType: entry.sourceType,
      sourceUrl: entry.sourceUrl,
      ...(entry.cognitivePath != null && {
        cognitivePath: entry.cognitivePath,
      }),
      contentHash: newHash,
      cognitiveType: entry.cognitiveType,
    });
  }

  private buildMessage(
    updates: readonly UpdateInfo[],
    upToDate: readonly string[],
    errors: readonly UpdateError[],
    options?: Partial<UpdateOptions>,
  ): string {
    const parts: string[] = [];

    if (options?.checkOnly === true) {
      if (updates.length > 0) {
        parts.push(`${updates.length} update(s) available`);
      } else {
        parts.push('All cognitives are up to date');
      }
    } else {
      const applied = updates.filter((u) => u.applied);
      if (applied.length > 0) {
        parts.push(`${applied.length} cognitive(s) updated`);
      }
    }

    if (upToDate.length > 0) {
      parts.push(`${upToDate.length} already up to date`);
    }

    if (errors.length > 0) {
      parts.push(`${errors.length} error(s)`);
    }

    return parts.join(', ') || 'No cognitives to update';
  }
}
