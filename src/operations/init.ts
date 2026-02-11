import { join } from 'node:path';
import type { CognitError } from '../errors/base.js';
import type { CognitiveType } from '../types/cognitive.js';
import type { Result } from '../types/result.js';
import type { InitOptions, InitResult } from '../types/operations.js';
import { OperationError } from '../errors/operation.js';
import { COGNITIVE_FILE_NAMES } from '../types/cognitive.js';
import { sanitizeName } from '../installer/security.js';
import { BaseOperation } from './base.js';

export class InitOperation extends BaseOperation {
  async execute(
    name: string,
    cognitiveType: CognitiveType,
    options?: Partial<InitOptions>,
  ): Promise<Result<InitResult, CognitError>> {
    return this.executeWithLifecycle(
      'init',
      { name, cognitiveType, ...options },
      () => this.run(name, cognitiveType, options),
    );
  }

  private async run(
    name: string,
    cognitiveType: CognitiveType,
    options?: Partial<InitOptions>,
  ): Promise<InitResult> {
    const safeName = sanitizeName(name);
    const outputDir =
      options?.outputDir != null ? options.outputDir : this.ctx.config.cwd;
    const targetDir = join(outputDir, safeName);

    const exists = await this.ctx.config.fs.exists(targetDir);
    if (exists) {
      throw new OperationError(`Directory already exists: ${targetDir}`);
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

    return {
      success: true,
      path: targetDir,
      files: [filePath],
      cognitiveType,
      message: `Initialized ${cognitiveType} "${safeName}" at ${targetDir}`,
    };
  }
}
