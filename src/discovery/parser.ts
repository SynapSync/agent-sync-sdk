import matter from 'gray-matter';
import type { FileSystemAdapter } from '../types/config.js';
import type { Cognitive, CognitiveType } from '../types/cognitive.js';
import type { CognitiveName } from '../types/brands.js';
import { cognitiveName } from '../types/brands.js';
import { ParseError } from '../errors/discovery.js';

export interface RawScanResult {
  readonly path: string;
  readonly type: CognitiveType;
  readonly fileName: string;
}

export class CognitiveParser {
  constructor(private readonly fs: FileSystemAdapter) {}

  async parse(scan: RawScanResult): Promise<Cognitive> {
    const filePath = `${scan.path}/${scan.fileName}`;
    let rawContent: string;

    try {
      rawContent = await this.fs.readFile(filePath, 'utf-8');
    } catch (cause) {
      throw new ParseError(filePath, { cause: cause as Error });
    }

    let parsed: matter.GrayMatterFile<string>;
    try {
      parsed = matter(rawContent);
    } catch (cause) {
      throw new ParseError(filePath, { cause: cause as Error });
    }

    const data = parsed.data as Record<string, unknown>;
    const dirName = scan.path.split('/').pop() ?? 'unknown';

    const name = this.extractName(data, dirName);
    const description = this.extractDescription(data, parsed.content);

    return {
      name,
      description,
      path: scan.path,
      type: scan.type,
      rawContent,
      metadata: Object.freeze({ ...data }),
    };
  }

  private extractName(data: Record<string, unknown>, fallback: string): CognitiveName {
    const raw = typeof data['name'] === 'string' ? data['name'] : fallback;
    return cognitiveName(raw);
  }

  private extractDescription(data: Record<string, unknown>, content: string): string {
    if (typeof data['description'] === 'string' && data['description'].length > 0) {
      return data['description'];
    }
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('#')) {
        return trimmed;
      }
    }
    return '';
  }
}
