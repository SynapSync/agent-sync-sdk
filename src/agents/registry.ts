import { homedir } from 'node:os';
import { join } from 'node:path';
import type { AgentType, AgentConfig, AgentDirConfig, AgentRegistry, AgentDetectionResult } from '../types/agent.js';
import type { CognitiveType } from '../types/cognitive.js';
import { AGENTS_DIR } from '../types/cognitive.js';
import type { SDKConfig } from '../types/config.js';
import type { EventBus } from '../types/events.js';
import { agentName } from '../types/brands.js';
import { AGENT_CONFIGS } from './__generated__/agents.js';
import type { GeneratedAgentConfig, GeneratedDetectRule } from './__generated__/agents.js';

function resolveHomeTilde(p: string, home: string): string {
  if (p.startsWith('~/')) return join(home, p.slice(2));
  return p;
}

function buildDetectFn(
  rules: readonly GeneratedDetectRule[],
  config: SDKConfig,
): () => Promise<boolean> {
  return async () => {
    for (const rule of rules) {
      if (rule.cwdDir) {
        const dir = join(config.cwd, rule.cwdDir);
        if (await config.fs.exists(dir)) return true;
      }
      if (rule.homeDir) {
        const dir = join(config.homeDir, rule.homeDir);
        if (await config.fs.exists(dir)) return true;
      }
      if (rule.envVar) {
        if (process.env[rule.envVar]) return true;
      }
      if (rule.absolutePath) {
        if (await config.fs.exists(rule.absolutePath)) return true;
      }
    }
    return false;
  };
}

function buildAgentConfig(
  gen: GeneratedAgentConfig,
  config: SDKConfig,
): AgentConfig {
  const dirs: Record<CognitiveType, AgentDirConfig> = {
    skill: {
      local: join(config.cwd, gen.dirs['skill']!.local),
      global: gen.dirs['skill']!.global
        ? resolveHomeTilde(gen.dirs['skill']!.global, config.homeDir)
        : undefined,
    },
    agent: {
      local: join(config.cwd, gen.dirs['agent']!.local),
      global: gen.dirs['agent']!.global
        ? resolveHomeTilde(gen.dirs['agent']!.global, config.homeDir)
        : undefined,
    },
    prompt: {
      local: join(config.cwd, gen.dirs['prompt']!.local),
      global: gen.dirs['prompt']!.global
        ? resolveHomeTilde(gen.dirs['prompt']!.global, config.homeDir)
        : undefined,
    },
    rule: {
      local: join(config.cwd, gen.dirs['rule']!.local),
      global: gen.dirs['rule']!.global
        ? resolveHomeTilde(gen.dirs['rule']!.global, config.homeDir)
        : undefined,
    },
  };

  return {
    name: agentName(gen.name),
    displayName: gen.displayName,
    dirs,
    detectInstalled: buildDetectFn(gen.detect, config),
    showInUniversalList: gen.localRoot === AGENTS_DIR,
  };
}

export class AgentRegistryImpl implements AgentRegistry {
  private readonly agents = new Map<AgentType, AgentConfig>();
  private readonly localRoots = new Map<AgentType, string>();

  constructor(
    private readonly config: SDKConfig,
    private readonly eventBus: EventBus,
  ) {
    // Load all generated agent configs
    for (const [name, gen] of Object.entries(AGENT_CONFIGS)) {
      const agentConfig = buildAgentConfig(gen, config);
      this.agents.set(name as AgentType, agentConfig);
      this.localRoots.set(name as AgentType, gen.localRoot);
    }

    // Register any additional agents from SDK config
    for (const additional of config.agents.additional) {
      this.register(additional);
    }
  }

  getAll(): ReadonlyMap<AgentType, AgentConfig> {
    return this.agents;
  }

  get(type: AgentType): AgentConfig | undefined {
    return this.agents.get(type);
  }

  getUniversalAgents(_cognitiveType?: CognitiveType): AgentType[] {
    const result: AgentType[] = [];
    for (const [type] of this.agents) {
      if (this.isUniversal(type)) {
        result.push(type);
      }
    }
    return result;
  }

  getNonUniversalAgents(_cognitiveType?: CognitiveType): AgentType[] {
    const result: AgentType[] = [];
    for (const [type] of this.agents) {
      if (!this.isUniversal(type)) {
        result.push(type);
      }
    }
    return result;
  }

  isUniversal(type: AgentType, _cognitiveType?: CognitiveType): boolean {
    const localRoot = this.localRoots.get(type);
    return localRoot === AGENTS_DIR;
  }

  getDir(
    type: AgentType,
    cognitiveType: CognitiveType,
    scope: 'local' | 'global',
  ): string | undefined {
    const agent = this.agents.get(type);
    if (!agent) return undefined;
    const dirConfig = agent.dirs[cognitiveType];
    return scope === 'local' ? dirConfig.local : dirConfig.global;
  }

  async detectInstalled(): Promise<AgentDetectionResult[]> {
    this.eventBus.emit('agent:detect:start', {});
    const startTime = Date.now();

    const entries = [...this.agents.entries()];
    const settled = await Promise.allSettled(
      entries.map(async ([type, agentConfig]) => {
        const installed = await agentConfig.detectInstalled();
        if (installed) {
          this.eventBus.emit('agent:detect:found', {
            agent: type,
            displayName: agentConfig.displayName,
          });
        }
        return {
          agent: type,
          displayName: agentConfig.displayName,
          installed,
          isUniversal: this.isUniversal(type),
        } satisfies AgentDetectionResult;
      }),
    );

    const results: AgentDetectionResult[] = [];
    for (const result of settled) {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      }
    }

    this.eventBus.emit('agent:detect:complete', {
      results,
      durationMs: Date.now() - startTime,
    });

    return results;
  }

  register(config: AgentConfig): void {
    const type = config.name as AgentType;
    if (this.agents.has(type)) {
      throw new Error(`Agent '${type}' is already registered`);
    }
    this.agents.set(type, config);
    // For runtime-registered agents, infer localRoot from skill dir
    const skillLocal = config.dirs.skill.local;
    const cwdPrefix = this.config.cwd + '/';
    const relative = skillLocal.startsWith(cwdPrefix)
      ? skillLocal.slice(cwdPrefix.length)
      : skillLocal;
    // Extract root from 'rootDir/skills' -> 'rootDir'
    const parts = relative.split('/');
    parts.pop(); // remove 'skills'
    this.localRoots.set(type, parts.join('/') || AGENTS_DIR);
  }
}
