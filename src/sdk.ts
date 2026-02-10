/**
 * Composition root and SDK facade for @synapsync/agent-sync-sdk.
 * This is the ONLY place concrete implementations are instantiated.
 */

// ---------- Type-only imports ----------

import type { SDKConfig } from './types/config.js';
import type { EventBus, SDKEventMap, Unsubscribe } from './types/events.js';
import type { AgentRegistry } from './types/agent.js';
import type { ProviderRegistry } from './types/source.js';
import type { CognitiveType } from './types/cognitive.js';
import type { CognitError } from './errors/base.js';
import type { Result } from './types/result.js';
import type {
  AddOptions, AddResult,
  RemoveOptions, RemoveResult,
  ListOptions, ListResult,
  FindOptions, FindResult,
  UpdateOptions, UpdateResult,
  SyncOptions, SyncResult,
  CheckOptions, CheckResult,
  InitOptions, InitResult,
} from './types/operations.js';
import type { OperationContext } from './operations/context.js';

// ---------- Concrete implementation imports ----------

import { resolveConfig } from './config/index.js';
import { EventBusImpl } from './events/index.js';
import { NodeFileSystem } from './fs/node.js';
import { AgentRegistryImpl } from './agents/registry.js';
import { SourceParserImpl } from './source/parser.js';
import { GitClientImpl } from './source/git.js';
import { ProviderRegistryImpl } from './providers/registry.js';
import { GitHubProvider } from './providers/github.js';
import { LocalProvider } from './providers/local.js';
import { MintlifyProvider } from './providers/mintlify.js';
import { HuggingFaceProvider } from './providers/huggingface.js';
import { WellKnownProvider } from './providers/wellknown.js';
import { DirectURLProvider } from './providers/direct.js';
import { DiscoveryServiceImpl } from './discovery/index.js';
import { LockFileManagerImpl } from './lock/manager.js';
import { InstallerImpl } from './installer/service.js';
import { AddOperation } from './operations/add.js';
import { RemoveOperation } from './operations/remove.js';
import { ListOperation } from './operations/list.js';
import { FindOperation } from './operations/find.js';
import { UpdateOperation } from './operations/update.js';
import { SyncOperation } from './operations/sync.js';
import { CheckOperation } from './operations/check.js';
import { InitOperation } from './operations/init.js';

// ---------- Public SDK interface ----------

export interface AgentSyncSDK {
  // Operations
  add(source: string, options?: Partial<AddOptions>): Promise<Result<AddResult, CognitError>>;
  remove(names: readonly string[], options?: Partial<RemoveOptions>): Promise<Result<RemoveResult, CognitError>>;
  list(options?: Partial<ListOptions>): Promise<Result<ListResult, CognitError>>;
  find(source: string, options?: Partial<FindOptions>): Promise<Result<FindResult, CognitError>>;
  update(options?: Partial<UpdateOptions>): Promise<Result<UpdateResult, CognitError>>;
  sync(options?: Partial<SyncOptions>): Promise<Result<SyncResult, CognitError>>;
  check(options?: Partial<CheckOptions>): Promise<Result<CheckResult, CognitError>>;
  init(name: string, cognitiveType: CognitiveType, options?: Partial<InitOptions>): Promise<Result<InitResult, CognitError>>;

  // Accessors
  readonly events: EventBus;
  readonly config: Readonly<SDKConfig>;
  readonly agents: AgentRegistry;
  readonly providers: ProviderRegistry;

  // Event subscription convenience
  on<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;
  once<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe;

  // Lifecycle
  dispose(): Promise<void>;
}

// ---------- Internal operations map ----------

interface OperationMap {
  readonly add: AddOperation;
  readonly remove: RemoveOperation;
  readonly list: ListOperation;
  readonly find: FindOperation;
  readonly update: UpdateOperation;
  readonly sync: SyncOperation;
  readonly check: CheckOperation;
  readonly init: InitOperation;
}

// ---------- SDK implementation ----------

class AgentSyncSDKImpl implements AgentSyncSDK {
  readonly events: EventBus;
  readonly config: Readonly<SDKConfig>;
  readonly agents: AgentRegistry;
  readonly providers: ProviderRegistry;

  private readonly ops: OperationMap;

  constructor(
    config: Readonly<SDKConfig>,
    eventBus: EventBus,
    ops: OperationMap,
    agentRegistry: AgentRegistry,
    providerRegistry: ProviderRegistry,
  ) {
    this.config = config;
    this.events = eventBus;
    this.ops = ops;
    this.agents = agentRegistry;
    this.providers = providerRegistry;
  }

  // -- Operations --

  add(source: string, options?: Partial<AddOptions>): Promise<Result<AddResult, CognitError>> {
    return this.ops.add.execute(source, options);
  }

  remove(names: readonly string[], options?: Partial<RemoveOptions>): Promise<Result<RemoveResult, CognitError>> {
    return this.ops.remove.execute(names, options);
  }

  list(options?: Partial<ListOptions>): Promise<Result<ListResult, CognitError>> {
    return this.ops.list.execute(options);
  }

  find(source: string, options?: Partial<FindOptions>): Promise<Result<FindResult, CognitError>> {
    return this.ops.find.execute(source, options);
  }

  update(options?: Partial<UpdateOptions>): Promise<Result<UpdateResult, CognitError>> {
    return this.ops.update.execute(options);
  }

  sync(options?: Partial<SyncOptions>): Promise<Result<SyncResult, CognitError>> {
    return this.ops.sync.execute(options);
  }

  check(options?: Partial<CheckOptions>): Promise<Result<CheckResult, CognitError>> {
    return this.ops.check.execute(options);
  }

  init(name: string, cognitiveType: CognitiveType, options?: Partial<InitOptions>): Promise<Result<InitResult, CognitError>> {
    return this.ops.init.execute(name, cognitiveType, options);
  }

  // -- Event subscription convenience --

  on<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe {
    return this.events.on(event, handler);
  }

  once<K extends keyof SDKEventMap>(event: K, handler: (payload: SDKEventMap[K]) => void): Unsubscribe {
    return this.events.once(event, handler);
  }

  // -- Lifecycle --

  async dispose(): Promise<void> {
    // Future: cancel in-flight operations, cleanup caches
  }
}

// ---------- Factory function ----------

export function createAgentSyncSDK(userConfig?: Partial<SDKConfig>): AgentSyncSDK {
  // Layer 1: Config & Events
  const defaultFs = new NodeFileSystem();
  const config = resolveConfig(userConfig, defaultFs);
  const eventBus = new EventBusImpl();

  // Layer 2: Agents
  const agentRegistry = new AgentRegistryImpl(config, eventBus);

  // Layer 3: Source parsing, Git, Discovery & Providers
  const sourceParser = new SourceParserImpl();
  const gitClient = new GitClientImpl(config, eventBus);
  const discoveryService = new DiscoveryServiceImpl(config.fs, eventBus);
  const providerRegistry = new ProviderRegistryImpl(eventBus);

  // Register providers in priority order (first match wins).
  // Custom providers first (highest priority, user-specified).
  for (const custom of config.providers.custom) {
    providerRegistry.register(custom);
  }

  // GitHub and Local need constructor dependencies
  providerRegistry.register(new GitHubProvider(gitClient, discoveryService, eventBus));
  providerRegistry.register(new LocalProvider(config.fs, discoveryService, eventBus, config.cwd));

  // Stub providers (no constructor args)
  providerRegistry.register(new MintlifyProvider());
  providerRegistry.register(new HuggingFaceProvider());
  providerRegistry.register(new WellKnownProvider());
  providerRegistry.register(new DirectURLProvider());

  // Layer 4: Installer & Lock
  const lockManager = new LockFileManagerImpl(config, eventBus);
  const installer = new InstallerImpl(agentRegistry, config.fs, eventBus);

  // Layer 5: Operations
  const ctx: OperationContext = {
    agentRegistry,
    providerRegistry,
    sourceParser,
    gitClient,
    discoveryService,
    installer,
    lockManager,
    eventBus,
    config,
  };

  const ops: OperationMap = {
    add: new AddOperation(ctx),
    remove: new RemoveOperation(ctx),
    list: new ListOperation(ctx),
    find: new FindOperation(ctx),
    update: new UpdateOperation(ctx),
    sync: new SyncOperation(ctx),
    check: new CheckOperation(ctx),
    init: new InitOperation(ctx),
  };

  eventBus.emit('sdk:initialized', { configHash: '' });

  return new AgentSyncSDKImpl(config, eventBus, ops, agentRegistry, providerRegistry);
}
