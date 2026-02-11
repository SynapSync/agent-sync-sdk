import type { CognitError } from '../errors/base.js';
import type { AgentType } from '../types/agent.js';
import type { RemoveOptions, RemoveResult, RemovedCognitiveInfo } from '../types/operations.js';
import type { Result } from '../types/result.js';
import { BaseOperation } from './base.js';

export class RemoveOperation extends BaseOperation {
  async execute(
    names: readonly string[],
    options?: Partial<RemoveOptions>,
  ): Promise<Result<RemoveResult, CognitError>> {
    return this.executeWithLifecycle('remove', options, () => this.run(names, options));
  }

  private async run(
    names: readonly string[],
    options?: Partial<RemoveOptions>,
  ): Promise<RemoveResult> {
    const allEntries = await this.ctx.lockManager.getAllEntries();
    const scope = options?.scope ?? 'project';

    // Determine which agents to remove from
    const agents = await this.resolveAgents(options?.agents);

    const removed: RemovedCognitiveInfo[] = [];
    const notFound: string[] = [];

    for (const name of names) {
      // Find matching entry by key
      const entry = allEntries[name];

      if (!entry) {
        notFound.push(name);
        continue;
      }

      const removedAgents: string[] = [];

      for (const agent of agents) {
        const target = { agent, scope, mode: 'copy' as const };
        try {
          const success = await this.ctx.installer.remove(name, entry.cognitiveType, target);
          if (success) {
            removedAgents.push(agent);
          }
        } catch {
          // Continue with other agents even if one fails
        }
      }

      // Remove from lock file
      await this.ctx.lockManager.removeEntry(name);

      if (removedAgents.length > 0) {
        removed.push({ name, agents: removedAgents });
      } else {
        // Still removed from lock even if no agent dirs found
        removed.push({ name, agents: [] });
      }
    }

    const success = removed.length > 0;
    const message = success
      ? `Removed ${removed.length} cognitive(s).`
      : `No matching cognitives found to remove.`;

    return { success, removed, notFound, message };
  }

  private async resolveAgents(agentsOption?: readonly AgentType[]): Promise<readonly AgentType[]> {
    if (agentsOption != null && agentsOption.length > 0) {
      return agentsOption;
    }

    // Fall back to all known agents
    const allAgents = this.ctx.agentRegistry.getAll();
    return Array.from(allAgents.keys());
  }
}
