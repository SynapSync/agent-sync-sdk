import { join } from 'node:path';

import type { AgentRegistry, AgentType } from '../types/agent.js';
import type { FileSystemAdapter } from '../types/config.js';
import type { CognitiveType } from '../types/cognitive.js';
import type { EventBus } from '../types/events.js';
import type {
  Installer,
  InstallRequest,
  InstallResult,
  InstallTarget,
  InstallerOptions,
} from '../types/install.js';
import { COGNITIVE_FILE_NAMES } from '../types/cognitive.js';
import { getCanonicalPath, getAgentInstallPath } from './paths.js';
import { sanitizeName } from './security.js';
import { atomicWriteFile } from './atomic.js';
import { deepCopy } from './copy.js';
import { createSymlink } from './symlink.js';
import { shouldSkipSymlink } from './flatten.js';

const DEFAULT_CATEGORY = 'general';

export class InstallerImpl implements Installer {
  private readonly agentRegistry: AgentRegistry;
  private readonly fs: FileSystemAdapter;
  private readonly eventBus: EventBus;

  constructor(
    agentRegistry: AgentRegistry,
    fs: FileSystemAdapter,
    eventBus: EventBus,
  ) {
    this.agentRegistry = agentRegistry;
    this.fs = fs;
    this.eventBus = eventBus;
  }

  async install(
    request: InstallRequest,
    target: InstallTarget,
    options: InstallerOptions,
  ): Promise<InstallResult> {
    const { name, type, installName } = extractRequestInfo(request);

    const canonicalPath = getCanonicalPath(
      type,
      DEFAULT_CATEGORY,
      installName,
      target.scope,
      target.scope === 'project' ? options.cwd : undefined,
    );

    this.eventBus.emit('install:start', {
      cognitive: name,
      agent: target.agent,
      mode: target.mode,
    });

    try {
      // Write cognitive files to canonical path
      await this.writeCognitiveFiles(request, canonicalPath, type);

      // Determine the final agent path
      let agentPath = canonicalPath;
      let symlinkFailed: boolean | undefined;

      const isUniversal = shouldSkipSymlink(target.agent, type, this.agentRegistry);

      if (!isUniversal) {
        const computedAgentPath = getAgentInstallPath(
          target.agent,
          type,
          installName,
          target.scope,
          this.agentRegistry,
        );

        if (computedAgentPath != null) {
          agentPath = computedAgentPath;

          if (target.mode === 'symlink') {
            const linked = await createSymlink(canonicalPath, agentPath, this.fs);
            if (linked) {
              this.eventBus.emit('install:symlink', {
                source: canonicalPath,
                target: agentPath,
              });
            } else {
              // Fallback to copy
              symlinkFailed = true;
              await deepCopy(canonicalPath, agentPath, this.fs);
              this.eventBus.emit('install:copy', {
                source: canonicalPath,
                target: agentPath,
              });
            }
          } else {
            // Copy mode
            await deepCopy(canonicalPath, agentPath, this.fs);
            this.eventBus.emit('install:copy', {
              source: canonicalPath,
              target: agentPath,
            });
          }
        }
      }

      const result: InstallResult = {
        success: true,
        agent: target.agent,
        cognitiveName: name,
        cognitiveType: type,
        path: agentPath,
        mode: target.mode,
        ...(canonicalPath != null && { canonicalPath }),
        ...(symlinkFailed != null && { symlinkFailed }),
      };

      this.eventBus.emit('install:complete', {
        cognitive: name,
        agent: target.agent,
        result,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      const result: InstallResult = {
        success: false,
        agent: target.agent,
        cognitiveName: name,
        cognitiveType: type,
        path: canonicalPath,
        mode: target.mode,
        ...(errorMessage != null && { error: errorMessage }),
      };

      this.eventBus.emit('install:complete', {
        cognitive: name,
        agent: target.agent,
        result,
      });

      return result;
    }
  }

  async remove(
    cognitiveName: string,
    cognitiveType: CognitiveType,
    target: InstallTarget,
  ): Promise<boolean> {
    const agentPath = getAgentInstallPath(
      target.agent,
      cognitiveType,
      cognitiveName,
      target.scope,
      this.agentRegistry,
    );

    if (agentPath == null) {
      return false;
    }

    try {
      const exists = await this.fs.exists(agentPath);
      if (!exists) {
        return false;
      }

      await this.fs.rm(agentPath, { recursive: true, force: true });
      return true;
    } catch {
      return false;
    }
  }

  private async writeCognitiveFiles(
    request: InstallRequest,
    canonicalPath: string,
    cognitiveType: CognitiveType,
  ): Promise<void> {
    await this.fs.mkdir(canonicalPath, { recursive: true });

    switch (request.kind) {
      case 'local': {
        // Copy from local path to canonical
        await deepCopy(request.cognitive.path, canonicalPath, this.fs);
        break;
      }
      case 'remote': {
        // Write content to the canonical cognitive file
        const fileName = COGNITIVE_FILE_NAMES[cognitiveType];
        const filePath = join(canonicalPath, fileName);
        await atomicWriteFile(filePath, request.cognitive.content, this.fs);
        break;
      }
      case 'wellknown': {
        // Write all files from the files map
        const writePromises: Promise<void>[] = [];
        for (const [fileName, content] of request.cognitive.files) {
          const filePath = join(canonicalPath, fileName);
          writePromises.push(atomicWriteFile(filePath, content, this.fs));
        }
        await Promise.all(writePromises);
        break;
      }
    }
  }
}

function extractRequestInfo(request: InstallRequest): {
  name: string;
  type: CognitiveType;
  installName: string;
} {
  switch (request.kind) {
    case 'local':
      return {
        name: request.cognitive.name,
        type: request.cognitive.type,
        installName: sanitizeName(request.cognitive.name),
      };
    case 'remote':
      return {
        name: request.cognitive.name,
        type: request.cognitive.type,
        installName: request.cognitive.installName,
      };
    case 'wellknown':
      return {
        name: request.cognitive.name,
        type: request.cognitive.type,
        installName: request.cognitive.installName,
      };
  }
}
