import type { SourceDescriptor, SourceParser } from '../types/source.js';

const COGNITIVE_FILE_PATTERN = /\/(SKILL|AGENT|PROMPT|RULE)\.md$/i;

const GITHUB_TREE_WITH_PATH = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)\/(.+)$/;
const GITHUB_TREE = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/tree\/([^/]+)$/;
const GITHUB_REPO = /^https?:\/\/github\.com\/([^/]+)\/([^/]+)\/?$/;

const GITLAB_TREE_WITH_PATH = /^https?:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/-\/tree\/([^/]+)\/(.+)$/;
const GITLAB_TREE = /^https?:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/-\/tree\/([^/]+)$/;
const GITLAB_REPO = /^https?:\/\/gitlab\.com\/([^/]+)\/([^/]+)\/?$/;

const OWNER_REPO_AT_NAME = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)@(.+)$/;
const OWNER_REPO_PATH = /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)(\/(.+))?$/;

const GIT_HOSTS = new Set(['github.com', 'gitlab.com', 'bitbucket.org']);

function optionalProps(
  obj: Record<string, string | undefined>,
): Partial<Pick<SourceDescriptor, 'ref' | 'subpath' | 'nameFilter'>> {
  const result: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) result[k] = v;
  }
  return result as Partial<Pick<SourceDescriptor, 'ref' | 'subpath' | 'nameFilter'>>;
}

export class SourceParserImpl implements SourceParser {
  parse(source: string): SourceDescriptor {
    const trimmed = source.trim();

    // 1. Local path
    if (this.isLocalPath(trimmed)) {
      return { kind: 'local', url: trimmed, localPath: trimmed };
    }

    // 2. Direct cognitive URL
    if (this.isDirectCognitiveUrl(trimmed)) {
      return { kind: 'direct-url', url: trimmed };
    }

    // 3. GitHub tree with path
    const ghTreePath = trimmed.match(GITHUB_TREE_WITH_PATH);
    if (ghTreePath) {
      return {
        kind: 'github',
        url: `https://github.com/${ghTreePath[1]}/${ghTreePath[2]}.git`,
        ...optionalProps({ ref: ghTreePath[3], subpath: ghTreePath[4] }),
      };
    }

    // 4. GitHub tree
    const ghTree = trimmed.match(GITHUB_TREE);
    if (ghTree) {
      return {
        kind: 'github',
        url: `https://github.com/${ghTree[1]}/${ghTree[2]}.git`,
        ...optionalProps({ ref: ghTree[3] }),
      };
    }

    // 5. GitHub repo
    const ghRepo = trimmed.match(GITHUB_REPO);
    if (ghRepo) {
      return {
        kind: 'github',
        url: `https://github.com/${ghRepo[1]}/${ghRepo[2]}.git`,
      };
    }

    // 6. GitLab tree with path
    const glTreePath = trimmed.match(GITLAB_TREE_WITH_PATH);
    if (glTreePath) {
      return {
        kind: 'gitlab',
        url: `https://gitlab.com/${glTreePath[1]}/${glTreePath[2]}.git`,
        ...optionalProps({ ref: glTreePath[3], subpath: glTreePath[4] }),
      };
    }

    // 7. GitLab tree
    const glTree = trimmed.match(GITLAB_TREE);
    if (glTree) {
      return {
        kind: 'gitlab',
        url: `https://gitlab.com/${glTree[1]}/${glTree[2]}.git`,
        ...optionalProps({ ref: glTree[3] }),
      };
    }

    // 8. GitLab repo
    const glRepo = trimmed.match(GITLAB_REPO);
    if (glRepo) {
      return {
        kind: 'gitlab',
        url: `https://gitlab.com/${glRepo[1]}/${glRepo[2]}.git`,
      };
    }

    // 9. owner/repo@name
    const atMatch = trimmed.match(OWNER_REPO_AT_NAME);
    if (atMatch) {
      return {
        kind: 'github',
        url: `https://github.com/${atMatch[1]}/${atMatch[2]}.git`,
        ...optionalProps({ nameFilter: atMatch[3] }),
      };
    }

    // 10. owner/repo(/path)?
    const repoMatch = trimmed.match(OWNER_REPO_PATH);
    if (repoMatch && !trimmed.startsWith('.') && !trimmed.includes('://')) {
      return {
        kind: 'github',
        url: `https://github.com/${repoMatch[1]}/${repoMatch[2]}.git`,
        ...optionalProps({ subpath: repoMatch[4] }),
      };
    }

    // 11. Well-known URL
    if (this.isWellKnownUrl(trimmed)) {
      return { kind: 'well-known', url: trimmed };
    }

    // 12. Fallback: generic git
    return { kind: 'git', url: trimmed };
  }

  getOwnerRepo(source: SourceDescriptor): string | undefined {
    if (source.kind !== 'github' && source.kind !== 'gitlab') return undefined;
    const match = source.url.match(/([^/]+)\/([^/]+?)(?:\.git)?$/);
    return match ? `${match[1]}/${match[2]}` : undefined;
  }

  private isLocalPath(input: string): boolean {
    return (
      input.startsWith('/') ||
      input.startsWith('./') ||
      input.startsWith('../') ||
      input === '.' ||
      input === '..' ||
      /^[A-Z]:[/\\]/i.test(input)
    );
  }

  private isDirectCognitiveUrl(input: string): boolean {
    if (!input.startsWith('http://') && !input.startsWith('https://')) return false;
    if (COGNITIVE_FILE_PATTERN.test(input)) {
      try {
        const url = new URL(input);
        if (GIT_HOSTS.has(url.hostname) && !input.includes('/raw/')) return false;
      } catch {
        return false;
      }
      return true;
    }
    return false;
  }

  private isWellKnownUrl(input: string): boolean {
    if (!input.startsWith('http://') && !input.startsWith('https://')) return false;
    try {
      const url = new URL(input);
      if (GIT_HOSTS.has(url.hostname)) return false;
      if (COGNITIVE_FILE_PATTERN.test(input)) return false;
      if (input.endsWith('.git')) return false;
      return true;
    } catch {
      return false;
    }
  }
}
