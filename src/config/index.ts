import { homedir } from 'node:os';
import type {
  SDKConfig,
  FileSystemAdapter,
  ProviderConfig,
  AgentRegistryConfig,
  TelemetryConfig,
} from '../types/config.js';
import { validateConfig } from './validation.js';
import {
  DEFAULT_AGENTS_DIR,
  DEFAULT_LOCK_FILE_NAME,
  DEFAULT_CLONE_TIMEOUT_MS,
  DEFAULT_CLONE_DEPTH,
  DEFAULT_TELEMETRY_ENABLED,
} from './defaults.js';

function detectGitHubToken(): string | undefined {
  return process.env['GITHUB_TOKEN']?.trim() || process.env['GH_TOKEN']?.trim() || undefined;
}

export function resolveConfig(
  partial?: Partial<SDKConfig>,
  defaultFs?: FileSystemAdapter,
): SDKConfig {
  const resolvedToken = partial?.providers?.githubToken ?? detectGitHubToken();
  const providers: ProviderConfig = resolvedToken != null
    ? { githubToken: resolvedToken, custom: partial?.providers?.custom ?? [] }
    : { custom: partial?.providers?.custom ?? [] };

  const agents: AgentRegistryConfig = partial?.agents?.definitionsPath != null
    ? { definitionsPath: partial.agents.definitionsPath, additional: partial.agents.additional ?? [] }
    : { additional: partial?.agents?.additional ?? [] };

  const telemetry: TelemetryConfig = partial?.telemetry?.endpoint != null
    ? { enabled: partial.telemetry.enabled ?? DEFAULT_TELEMETRY_ENABLED, endpoint: partial.telemetry.endpoint }
    : { enabled: partial?.telemetry?.enabled ?? DEFAULT_TELEMETRY_ENABLED };

  const config: SDKConfig = {
    agentsDir: partial?.agentsDir ?? DEFAULT_AGENTS_DIR,
    lockFileName: partial?.lockFileName ?? DEFAULT_LOCK_FILE_NAME,
    cwd: partial?.cwd ?? process.cwd(),
    homeDir: partial?.homeDir ?? homedir(),
    fs: partial?.fs ?? defaultFs!,
    git: {
      cloneTimeoutMs: partial?.git?.cloneTimeoutMs ?? DEFAULT_CLONE_TIMEOUT_MS,
      depth: partial?.git?.depth ?? DEFAULT_CLONE_DEPTH,
    },
    providers,
    agents,
    telemetry,
  };

  validateConfig(config);
  return config;
}

export { validateConfig } from './validation.js';
