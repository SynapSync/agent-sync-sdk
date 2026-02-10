import type { AgentType, AgentRegistry } from '../types/agent.js';
import type { CognitiveType } from '../types/cognitive.js';
import type { InstallScope } from '../types/install.js';
import { getAgentInstallPath } from './paths.js';

/**
 * Returns true for universal agents, where the canonical path IS the agent path.
 * Universal agents don't need a separate symlink.
 */
export function shouldSkipSymlink(
  agentType: AgentType,
  cognitiveType: CognitiveType,
  agentRegistry: AgentRegistry,
): boolean {
  return agentRegistry.isUniversal(agentType, cognitiveType);
}

/**
 * Compute agent-specific symlink paths for non-universal agents.
 * Returns an array of { agentType, agentPath } for each agent that has a directory configured.
 */
export function getAgentSymlinkPaths(
  canonicalPath: string,
  name: string,
  cognitiveType: CognitiveType,
  agentTypes: readonly AgentType[],
  scope: InstallScope,
  agentRegistry: AgentRegistry,
): Array<{ agentType: AgentType; agentPath: string }> {
  const results: Array<{ agentType: AgentType; agentPath: string }> = [];

  for (const agentType of agentTypes) {
    // Skip universal agents — canonical IS the agent path
    if (agentRegistry.isUniversal(agentType, cognitiveType)) {
      continue;
    }

    const agentPath = getAgentInstallPath(agentType, cognitiveType, name, scope, agentRegistry);
    if (agentPath != null && agentPath !== canonicalPath) {
      results.push({ agentType, agentPath });
    }
  }

  return results;
}
