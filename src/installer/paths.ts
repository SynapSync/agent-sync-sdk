import { join, resolve } from 'node:path';
import { homedir, platform } from 'node:os';

import type { FileSystemAdapter, EnvReader } from '../types/config.js';
import type { AgentRegistry } from '../types/agent.js';
import type { AgentType } from '../types/agent.js';
import type { CognitiveType } from '../types/cognitive.js';
import type { InstallScope } from '../types/install.js';
import { COGNITIVE_SUBDIRS, AGENTS_DIR } from '../types/cognitive.js';
import { sanitizeName } from './security.js';

const COGNIT_DIR = 'cognit';

const defaultEnv: EnvReader = (key) => process.env[key];

/**
 * Returns the global base directory for cognitive storage.
 * - macOS: ~/.agents/cognit
 * - Linux: $XDG_DATA_HOME/cognit or ~/.local/share/cognit
 * - Windows: %APPDATA%\cognit
 */
export function getGlobalBase(env: EnvReader = defaultEnv): string {
  const os = platform();
  if (os === 'win32') {
    const appData = env('APPDATA');
    if (appData) {
      return join(appData, COGNIT_DIR);
    }
    return join(homedir(), 'AppData', 'Roaming', COGNIT_DIR);
  }
  if (os === 'linux') {
    const xdg = env('XDG_DATA_HOME');
    if (xdg) {
      return join(xdg, COGNIT_DIR);
    }
    return join(homedir(), '.local', 'share', COGNIT_DIR);
  }
  // macOS and other unix-like
  return join(homedir(), AGENTS_DIR, COGNIT_DIR);
}

/**
 * Returns the canonical path for a cognitive:
 *   <base>/<typeSubdir>/<category>/<name>/
 *
 * - project scope: <projectRoot>/.agents/cognit/<typeSubdir>/<category>/<name>/
 * - global scope:  <globalBase>/<typeSubdir>/<category>/<name>/
 */
export function getCanonicalPath(
  cognitiveType: CognitiveType,
  category: string,
  name: string,
  scope: InstallScope,
  projectRoot?: string,
  env?: EnvReader,
): string {
  const typeSubdir = COGNITIVE_SUBDIRS[cognitiveType];
  const safeName = sanitizeName(name);
  const safeCategory = sanitizeName(category);

  if (scope === 'project') {
    if (!projectRoot) {
      throw new Error('projectRoot is required for project scope');
    }
    return join(projectRoot, AGENTS_DIR, COGNIT_DIR, typeSubdir, safeCategory, safeName);
  }
  return join(getGlobalBase(env), typeSubdir, safeCategory, safeName);
}

/**
 * Returns the agent-specific install path for a cognitive.
 * Uses agentRegistry.getDir() to resolve the agent's directory,
 * then appends the sanitized cognitive name.
 */
export function getAgentInstallPath(
  agentType: AgentType,
  cognitiveType: CognitiveType,
  name: string,
  scope: InstallScope,
  agentRegistry: AgentRegistry,
): string | undefined {
  const scopeKey = scope === 'project' ? 'local' : 'global';
  const dir = agentRegistry.getDir(agentType, cognitiveType, scopeKey);
  if (dir == null) {
    return undefined;
  }
  return join(dir, sanitizeName(name));
}

/**
 * Walk up from startDir looking for markers that indicate a project root:
 * .agents/cognit, .git, or package.json
 */
export async function findProjectRoot(
  startDir: string,
  fs: FileSystemAdapter,
): Promise<string | undefined> {
  let current = resolve(startDir);
  const root = resolve('/');

  while (current !== root) {
    const agentsPath = join(current, AGENTS_DIR, COGNIT_DIR);
    const gitPath = join(current, '.git');
    const pkgPath = join(current, 'package.json');

    const [hasAgents, hasGit, hasPkg] = await Promise.all([
      fs.exists(agentsPath),
      fs.exists(gitPath),
      fs.exists(pkgPath),
    ]);

    if (hasAgents || hasGit || hasPkg) {
      return current;
    }

    const parent = resolve(current, '..');
    if (parent === current) break;
    current = parent;
  }

  return undefined;
}
