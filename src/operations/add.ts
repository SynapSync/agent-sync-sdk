import type { CognitError } from '../errors/base.js';
import type { Cognitive, CognitiveType, RemoteCognitive } from '../types/cognitive.js';
import type { InstallRequest, InstallResult } from '../types/install.js';
import type { ProviderFetchOptions, SourceDescriptor } from '../types/source.js';
import type {
  AddOptions,
  AddResult,
  AvailableCognitive,
  FailedInstallInfo,
  InstalledCognitiveInfo,
  AgentInstallInfo,
  SourceInfo,
} from '../types/operations.js';
import type { Result } from '../types/result.js';
import type { AgentType } from '../types/agent.js';
import { NoCognitivesFoundError } from '../errors/provider.js';
import { computeContentHash } from '../lock/integrity.js';
import { BaseOperation } from './base.js';

export class AddOperation extends BaseOperation {
  async execute(
    source: string,
    options?: Partial<AddOptions>,
  ): Promise<Result<AddResult, CognitError>> {
    return this.executeWithLifecycle('add', options, () => this.run(source, options));
  }

  private async run(
    source: string,
    options?: Partial<AddOptions>,
  ): Promise<AddResult> {
    // 1. Parse source
    const parsed = this.ctx.sourceParser.parse(source);

    // 2. Resolve cognitives
    const { cognitives, sourceInfo } = await this.resolveCognitives(
      source,
      parsed,
      options,
    );

    if (cognitives.length === 0) {
      return {
        success: false,
        installed: [],
        failed: [],
        source: sourceInfo,
        message: 'No cognitives found at the specified source.',
      };
    }

    // 3. Apply filters
    const filtered = this.applyFilters(cognitives, parsed, options);

    if (filtered.length === 0) {
      return {
        success: false,
        installed: [],
        failed: [],
        source: sourceInfo,
        message: 'No cognitives matched the specified filters.',
      };
    }

    // 4. If not confirmed or no agents, return available list
    const agents = options?.agents;
    if (!options?.confirmed || !agents || agents.length === 0) {
      const available: AvailableCognitive[] = filtered.map((c) => ({
        name: getCognitiveName(c),
        description: getCognitiveDescription(c),
        cognitiveType: getCognitiveType(c),
      }));
      return {
        success: true,
        installed: [],
        failed: [],
        available,
        source: sourceInfo,
        message: `Found ${available.length} cognitive(s) available for installation.`,
      };
    }

    // 5. Install each cognitive for each agent
    const mode = options.mode ?? 'copy';
    const scope = options.scope ?? 'project';
    const installed: InstalledCognitiveInfo[] = [];
    const failed: FailedInstallInfo[] = [];

    for (const cognitive of filtered) {
      const agentResults: AgentInstallInfo[] = [];
      const cogName = getCognitiveName(cognitive);
      const cogType = getCognitiveType(cognitive);

      for (const agent of agents) {
        this.ctx.eventBus.emit('install:start', {
          cognitive: cogName,
          agent,
          mode,
        });

        const request = buildInstallRequest(cognitive);
        const target = { agent, scope, mode };
        const installerOptions = { cwd: this.ctx.config.cwd };

        let result: InstallResult;
        try {
          result = await this.ctx.installer.install(
            request,
            target,
            installerOptions,
          );
        } catch (installError) {
          const errorMsg =
            installError instanceof Error
              ? installError.message
              : String(installError);
          failed.push({ name: cogName, agent, error: errorMsg });
          continue;
        }

        this.ctx.eventBus.emit('install:complete', {
          cognitive: cogName,
          agent,
          result,
        });

        if (result.success) {
          agentResults.push({
            agent: result.agent,
            path: result.path,
            mode: result.mode,
            ...(result.symlinkFailed != null && {
              symlinkFailed: result.symlinkFailed,
            }),
          });
        } else {
          failed.push({
            name: cogName,
            agent,
            error: result.error ?? 'Install failed',
          });
        }
      }

      if (agentResults.length > 0) {
        installed.push({
          name: cogName,
          cognitiveType: cogType,
          agents: agentResults,
        });

        // Record in lock
        await this.ctx.lockManager.addEntry(cogName, {
          source: getSourceIdentifier(cognitive, source),
          sourceType: getSourceType(cognitive),
          sourceUrl: getSourceUrl(cognitive, source),
          contentHash: getContentHash(cognitive),
          cognitiveType: cogType,
          category: options?.category ?? 'general',
        });
      }
    }

    const success = installed.length > 0;
    const message = success
      ? `Installed ${installed.length} cognitive(s) across ${agents.length} agent(s).`
      : `Failed to install any cognitives.`;

    return {
      success,
      installed,
      failed,
      source: sourceInfo,
      message,
    };
  }

  private async resolveCognitives(
    source: string,
    parsed: SourceDescriptor,
    options?: Partial<AddOptions>,
  ): Promise<{
    cognitives: Array<RemoteCognitive | Cognitive>;
    sourceInfo: SourceInfo;
  }> {
    // Try local source first
    if (parsed.kind === 'local') {
      const localPath = parsed.localPath ?? parsed.url;
      const discoverOptions = {
        ...(options?.subpath != null && { subpath: options.subpath }),
        ...(parsed.subpath != null && { subpath: parsed.subpath }),
        ...(options?.cognitiveType != null && {
          types: [options.cognitiveType],
        }),
      };
      const cognitives = await this.ctx.discoveryService.discover(
        localPath,
        discoverOptions,
      );

      return {
        cognitives,
        sourceInfo: {
          kind: parsed.kind,
          identifier: localPath,
          url: parsed.url,
          provider: 'local',
        },
      };
    }

    // Try provider match
    let provider = this.ctx.providerRegistry.findProvider(parsed.url);
    if (!provider) {
      provider = this.ctx.providerRegistry.findProvider(source);
    }

    if (provider) {
      const fetchOptions: ProviderFetchOptions = {
        ...(options?.cognitiveType != null && {
          cognitiveType: options.cognitiveType,
        }),
        ...(parsed.subpath != null && { subpath: parsed.subpath }),
        ...(options?.subpath != null && { subpath: options.subpath }),
        ...(parsed.ref != null && { ref: parsed.ref }),
        ...(parsed.nameFilter != null && { nameFilter: parsed.nameFilter }),
      };

      const cognitives = await provider.fetchAll(source, fetchOptions);

      return {
        cognitives,
        sourceInfo: {
          kind: parsed.kind,
          identifier: provider.getSourceIdentifier(source),
          url: parsed.url,
          provider: provider.id,
        },
      };
    }

    // Git clone fallback
    if (
      parsed.kind === 'git' ||
      parsed.kind === 'github' ||
      parsed.kind === 'gitlab'
    ) {
      const tempDir = await this.ctx.gitClient.clone(parsed.url, {
        ...(parsed.ref != null && { ref: parsed.ref }),
      });

      try {
        const discoverOptions = {
          ...(parsed.subpath != null && { subpath: parsed.subpath }),
          ...(options?.subpath != null && { subpath: options.subpath }),
          ...(options?.cognitiveType != null && {
            types: [options.cognitiveType],
          }),
        };
        const cognitives = await this.ctx.discoveryService.discover(
          tempDir,
          discoverOptions,
        );

        return {
          cognitives,
          sourceInfo: {
            kind: parsed.kind,
            identifier: parsed.url,
            url: parsed.url,
            provider: 'git',
          },
        };
      } finally {
        await this.ctx.gitClient.cleanup(tempDir);
      }
    }

    return {
      cognitives: [],
      sourceInfo: {
        kind: parsed.kind,
        identifier: source,
        url: parsed.url,
        provider: 'unknown',
      },
    };
  }

  private applyFilters(
    cognitives: Array<RemoteCognitive | Cognitive>,
    parsed: SourceDescriptor,
    options?: Partial<AddOptions>,
  ): Array<RemoteCognitive | Cognitive> {
    let result = cognitives;

    // Filter by nameFilter from parsed source
    if (parsed.nameFilter != null) {
      const filter = parsed.nameFilter;
      result = result.filter((c) =>
        getCognitiveName(c).toLowerCase().includes(filter.toLowerCase()),
      );
    }

    // Filter by cognitiveNames from options
    if (options?.cognitiveNames != null && options.cognitiveNames.length > 0) {
      const nameSet = new Set(
        options.cognitiveNames.map((n) => n.toLowerCase()),
      );
      result = result.filter((c) =>
        nameSet.has(getCognitiveName(c).toLowerCase()),
      );
    }

    // Filter by cognitiveType from options
    if (options?.cognitiveType != null) {
      const typeFilter = options.cognitiveType;
      result = result.filter((c) => getCognitiveType(c) === typeFilter);
    }

    // Filter by typeFilter from parsed source
    if (parsed.typeFilter != null) {
      const typeFilter = parsed.typeFilter;
      result = result.filter((c) => getCognitiveType(c) === typeFilter);
    }

    return result;
  }
}

// ---------- Helpers ----------

function isRemoteCognitive(
  c: RemoteCognitive | Cognitive,
): c is RemoteCognitive {
  return 'content' in c && 'installName' in c;
}

function getCognitiveName(c: RemoteCognitive | Cognitive): string {
  return isRemoteCognitive(c) ? c.installName : c.name;
}

function getCognitiveDescription(c: RemoteCognitive | Cognitive): string {
  return c.description;
}

function getCognitiveType(c: RemoteCognitive | Cognitive): CognitiveType {
  return c.type;
}

function buildInstallRequest(
  c: RemoteCognitive | Cognitive,
): InstallRequest {
  if (isRemoteCognitive(c)) {
    return { kind: 'remote', cognitive: c };
  }
  return { kind: 'local', cognitive: c };
}

function getSourceIdentifier(
  c: RemoteCognitive | Cognitive,
  fallback: string,
): import('../types/brands.js').SourceIdentifier {
  if (isRemoteCognitive(c)) {
    return c.sourceIdentifier;
  }
  return fallback as import('../types/brands.js').SourceIdentifier;
}

function getSourceType(c: RemoteCognitive | Cognitive): string {
  return isRemoteCognitive(c) ? 'remote' : 'local';
}

function getSourceUrl(c: RemoteCognitive | Cognitive, fallback: string): string {
  return isRemoteCognitive(c) ? c.sourceUrl : fallback;
}

function getContentHash(c: RemoteCognitive | Cognitive): string {
  const content = isRemoteCognitive(c) ? c.content : c.rawContent;
  return computeContentHash(content);
}
