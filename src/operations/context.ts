import type { AgentRegistry } from '../types/agent.js';
import type { SDKConfig } from '../types/config.js';
import type { EventBus } from '../types/events.js';
import type { Installer } from '../types/install.js';
import type { LockManager } from '../types/lock.js';
import type { ProviderRegistry, SourceParser, GitClient } from '../types/source.js';
import type { DiscoveryService } from '../discovery/index.js';

export interface OperationContext {
  readonly agentRegistry: AgentRegistry;
  readonly providerRegistry: ProviderRegistry;
  readonly sourceParser: SourceParser;
  readonly gitClient: GitClient;
  readonly discoveryService: DiscoveryService;
  readonly installer: Installer;
  readonly lockManager: LockManager;
  readonly eventBus: EventBus;
  readonly config: SDKConfig;
}
