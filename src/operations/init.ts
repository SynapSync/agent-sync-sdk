import { join } from 'node:path';
import type { CognitError } from '../errors/base.js';
import type { CognitiveType } from '../types/cognitive.js';
import type { Result } from '../types/result.js';
import type { InitOptions, InitResult } from '../types/operations.js';
import type { OperationContext } from './context.js';
import { ok, err } from '../types/result.js';
import { OperationError } from '../errors/operation.js';
import { COGNITIVE_FILE_NAMES } from '../types/cognitive.js';
import { sanitizeName } from '../installer/security.js';

export class InitOperation {
  constructor(private readonly ctx: OperationContext) {}

  async execute(
    name: string,
    cognitiveType: CognitiveType,
    options?: Partial<InitOptions>,
  ): Promise<Result<InitResult, CognitError>> {
    const startTime = Date.now();
    const opName = 'init';

    this.ctx.eventBus.emit('operation:start', {
      operation: opName,
      options: { name, cognitiveType, ...options } as unknown,
    });

    try {
      const safeName = sanitizeName(name);
      const outputDir =
        options?.outputDir != null ? options.outputDir : this.ctx.config.cwd;
      const targetDir = join(outputDir, safeName);

      const exists = await this.ctx.config.fs.exists(targetDir);
      if (exists) {
        const error = new OperationError(
          `Directory already exists: ${targetDir}`,
        );
        this.ctx.eventBus.emit('operation:error', {
          operation: opName,
          error,
        });
        return err(error);
      }

      await this.ctx.config.fs.mkdir(targetDir, { recursive: true });

      const fileName = COGNITIVE_FILE_NAMES[cognitiveType];
      const filePath = join(targetDir, fileName);
      const description =
        options?.description != null
          ? options.description
          : 'TODO: Add description';

      const content = [
        '---',
        `name: ${safeName}`,
        `description: ${description}`,
        '---',
        `# ${safeName}`,
        '',
        'TODO: Add content here.',
        '',
      ].join('\n');

      await this.ctx.config.fs.writeFile(filePath, content, 'utf-8');

      const createdFiles = [filePath];

      const result: InitResult = {
        success: true,
        path: targetDir,
        files: createdFiles,
        cognitiveType,
        message: `Initialized ${cognitiveType} "${safeName}" at ${targetDir}`,
      };

      this.ctx.eventBus.emit('operation:complete', {
        operation: opName,
        result: result as unknown,
        durationMs: Date.now() - startTime,
      });

      return ok(result);
    } catch (cause) {
      if (cause instanceof OperationError) {
        return err(cause);
      }
      const error = new OperationError('Init operation failed', { cause });
      this.ctx.eventBus.emit('operation:error', {
        operation: opName,
        error,
      });
      return err(error);
    }
  }
}
