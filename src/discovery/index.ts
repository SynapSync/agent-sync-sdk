import type { FileSystemAdapter } from '../types/config.js';
import type { EventBus } from '../types/events.js';
import type { Cognitive, CognitiveType } from '../types/cognitive.js';
import { CognitiveScanner } from './scanner.js';
import { CognitiveParser } from './parser.js';
import { CognitiveFilter } from './filter.js';
import { CognitiveValidator } from './validator.js';
import type { ScanOptions } from './scanner.js';
import type { FilterCriteria } from './filter.js';

export interface DiscoverOptions {
  readonly subpath?: string;
  readonly types?: CognitiveType[];
  readonly namePattern?: string;
  readonly tags?: readonly string[];
  readonly category?: string;
  readonly maxDepth?: number;
}

export interface DiscoveryService {
  discover(basePath: string, options?: DiscoverOptions): Promise<Cognitive[]>;
  discoverByType(basePath: string, type: CognitiveType, options?: DiscoverOptions): Promise<Cognitive[]>;
}

export class DiscoveryServiceImpl implements DiscoveryService {
  private readonly scanner: CognitiveScanner;
  private readonly parser: CognitiveParser;
  private readonly filter: CognitiveFilter;
  private readonly validator: CognitiveValidator;

  constructor(
    private readonly fs: FileSystemAdapter,
    private readonly eventBus: EventBus,
  ) {
    this.scanner = new CognitiveScanner(fs);
    this.parser = new CognitiveParser(fs);
    this.filter = new CognitiveFilter();
    this.validator = new CognitiveValidator();
  }

  async discover(basePath: string, options?: DiscoverOptions): Promise<Cognitive[]> {
    const start = Date.now();
    this.eventBus.emit('discovery:start', { path: basePath });

    const scanOptions: ScanOptions = {
      ...(options?.types != null && { types: options.types }),
      ...(options?.subpath != null && { subpath: options.subpath }),
      ...(options?.maxDepth != null && { maxDepth: options.maxDepth }),
    };
    const scanResults = await this.scanner.scan(basePath, scanOptions);

    const cognitives: Cognitive[] = [];
    for (const scan of scanResults) {
      try {
        const cognitive = await this.parser.parse(scan);
        const validationResult = this.validator.validate(cognitive);
        if (validationResult.ok) {
          cognitives.push(validationResult.value);
          this.eventBus.emit('discovery:found', {
            cognitive: { name: cognitive.name, type: cognitive.type, path: cognitive.path, description: cognitive.description },
            type: cognitive.type,
          });
        }
      } catch {
        // Skip unparseable files
      }
    }

    const criteria: FilterCriteria = {
      ...(options?.namePattern != null && { namePattern: options.namePattern }),
      ...(options?.tags != null && { tags: options.tags }),
      ...(options?.category != null && { category: options.category }),
    };
    const filtered = this.filter.filter(cognitives, criteria);

    this.eventBus.emit('discovery:complete', { count: filtered.length, durationMs: Date.now() - start });
    return filtered;
  }

  async discoverByType(basePath: string, type: CognitiveType, options?: DiscoverOptions): Promise<Cognitive[]> {
    return this.discover(basePath, { ...options, types: [type] });
  }
}

export { CognitiveScanner } from './scanner.js';
export type { ScanResult, ScanOptions } from './scanner.js';
export { CognitiveParser } from './parser.js';
export type { RawScanResult } from './parser.js';
export { CognitiveFilter } from './filter.js';
export type { FilterCriteria } from './filter.js';
export { CognitiveValidator } from './validator.js';
