import { describe, it, expect, vi } from 'vitest';
import { createCapturingEventBus } from '../../src/events/index.js';
import { GitHubProvider } from '../../src/providers/github.js';
import type { GitClient } from '../../src/types/source.js';

function createMockGitClient(): GitClient {
  return {
    clone: vi.fn().mockResolvedValue('/tmp/mock-clone'),
    cleanup: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockDiscovery() {
  return {
    discover: vi.fn().mockResolvedValue([
      {
        name: 'test-skill',
        description: 'A test skill',
        path: '/tmp/mock-clone/skills/test-skill',
        type: 'skill',
        rawContent: '---\nname: test-skill\n---\n# Test',
        metadata: { name: 'test-skill' },
      },
    ]),
  };
}

describe('GitHubProvider', () => {
  it('matches owner/repo shorthand', () => {
    const provider = new GitHubProvider(createMockGitClient(), createMockDiscovery(), createCapturingEventBus());
    const result = provider.match('owner/repo');
    expect(result.matches).toBe(true);
  });

  it('matches https://github.com/owner/repo', () => {
    const provider = new GitHubProvider(createMockGitClient(), createMockDiscovery(), createCapturingEventBus());
    const result = provider.match('https://github.com/owner/repo');
    expect(result.matches).toBe(true);
  });

  it('does NOT match gitlab URL', () => {
    const provider = new GitHubProvider(createMockGitClient(), createMockDiscovery(), createCapturingEventBus());
    const result = provider.match('https://gitlab.com/owner/repo');
    expect(result.matches).toBe(false);
  });

  it('does NOT match local path', () => {
    const provider = new GitHubProvider(createMockGitClient(), createMockDiscovery(), createCapturingEventBus());
    const result = provider.match('./local/path');
    expect(result.matches).toBe(false);
  });

  it('converts blob URL to raw URL', () => {
    const provider = new GitHubProvider(createMockGitClient(), createMockDiscovery(), createCapturingEventBus());
    const raw = provider.toRawUrl('https://github.com/owner/repo/blob/main/skills/test/SKILL.md');
    expect(raw).toBe('https://raw.githubusercontent.com/owner/repo/main/skills/test/SKILL.md');
  });

  it('extracts owner/repo from source identifier', () => {
    const provider = new GitHubProvider(createMockGitClient(), createMockDiscovery(), createCapturingEventBus());
    expect(provider.getSourceIdentifier('https://github.com/owner/repo')).toBe('owner/repo');
    expect(provider.getSourceIdentifier('owner/repo')).toBe('owner/repo');
  });

  it('fetchAll clones, discovers, and cleans up', async () => {
    const gitClient = createMockGitClient();
    const discovery = createMockDiscovery();
    const eventBus = createCapturingEventBus();
    const provider = new GitHubProvider(gitClient, discovery, eventBus);

    const results = await provider.fetchAll('owner/repo');

    expect(gitClient.clone).toHaveBeenCalledOnce();
    expect(discovery.discover).toHaveBeenCalledWith('/tmp/mock-clone', undefined);
    expect(gitClient.cleanup).toHaveBeenCalledWith('/tmp/mock-clone');
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('test-skill');
    expect(results[0]!.providerId).toBe('github');
  });
});
