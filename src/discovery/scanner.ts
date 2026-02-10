import type { FileSystemAdapter } from '../types/config.js';
import type { CognitiveType } from '../types/cognitive.js';
import { COGNITIVE_TYPE_CONFIGS } from '../types/cognitive.js';

export interface ScanResult {
  readonly path: string;
  readonly type: CognitiveType;
  readonly fileName: string;
}

export interface ScanOptions {
  readonly types?: CognitiveType[];
  readonly subpath?: string;
  readonly maxDepth?: number;
}

const SKIP_DIRS = new Set(['node_modules', '.git', '.svn', '__pycache__']);

export class CognitiveScanner {
  constructor(private readonly fs: FileSystemAdapter) {}

  async scan(basePath: string, options?: ScanOptions): Promise<ScanResult[]> {
    const types = options?.types ?? (Object.keys(COGNITIVE_TYPE_CONFIGS) as CognitiveType[]);
    const searchBase = options?.subpath ? `${basePath}/${options.subpath}` : basePath;
    const results: ScanResult[] = [];
    const maxDepth = options?.maxDepth ?? 3;

    for (const type of types) {
      const config = COGNITIVE_TYPE_CONFIGS[type];
      const subdir = config.subdir;
      const fileName = config.fileName;

      // Priority 1: {basePath}/{subdir}/<name>/{FILE}.md
      const typedDir = `${searchBase}/${subdir}`;
      if (await this.fs.exists(typedDir)) {
        await this.scanDirectory(typedDir, fileName, type, results, 0, maxDepth);
      }

      // Priority 2: {basePath}/<name>/{FILE}.md (flat layout)
      await this.scanDirectory(searchBase, fileName, type, results, 0, maxDepth);
    }

    return this.deduplicateResults(results);
  }

  private async scanDirectory(
    dir: string,
    targetFile: string,
    type: CognitiveType,
    results: ScanResult[],
    depth: number,
    maxDepth: number,
  ): Promise<void> {
    if (depth > maxDepth) return;

    try {
      const entries = await this.fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

        if (entry.isDirectory()) {
          const childPath = `${dir}/${entry.name}`;
          if (await this.fs.exists(`${childPath}/${targetFile}`)) {
            results.push({ path: childPath, type, fileName: targetFile });
          } else {
            await this.scanDirectory(childPath, targetFile, type, results, depth + 1, maxDepth);
          }
        }
      }
    } catch {
      // Directory doesn't exist or permission denied -- skip silently
    }
  }

  private deduplicateResults(results: ScanResult[]): ScanResult[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = `${r.path}:${r.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
}
