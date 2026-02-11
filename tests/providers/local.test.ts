import { describe, it, expect, vi } from 'vitest';
import { createCapturingEventBus } from '../../src/events/index.js';
import { createMemoryFs } from '../../src/fs/memory.js';
import { LocalProvider } from '../../src/providers/local.js';

function createMockDiscovery(
  cognitives: Array<{
    name: string;
    description: string;
    path: string;
    type: string;
    rawContent: string;
    metadata: Record<string, unknown>;
  }> = [],
) {
  return {
    discover: vi.fn().mockResolvedValue(cognitives),
  };
}

describe('LocalProvider', () => {
  it('matches relative path ./', () => {
    const fs = createMemoryFs();
    const provider = new LocalProvider(
      fs,
      createMockDiscovery(),
      createCapturingEventBus(),
      '/home/user',
    );
    expect(provider.match('./skills').matches).toBe(true);
  });

  it('matches absolute path', () => {
    const fs = createMemoryFs();
    const provider = new LocalProvider(
      fs,
      createMockDiscovery(),
      createCapturingEventBus(),
      '/home/user',
    );
    expect(provider.match('/absolute/path').matches).toBe(true);
  });

  it('matches current directory .', () => {
    const fs = createMemoryFs();
    const provider = new LocalProvider(
      fs,
      createMockDiscovery(),
      createCapturingEventBus(),
      '/home/user',
    );
    expect(provider.match('.').matches).toBe(true);
  });

  it('does NOT match owner/repo shorthand', () => {
    const fs = createMemoryFs();
    const provider = new LocalProvider(
      fs,
      createMockDiscovery(),
      createCapturingEventBus(),
      '/home/user',
    );
    expect(provider.match('owner/repo').matches).toBe(false);
  });

  it('fetchAll returns discovered cognitives', async () => {
    const fs = createMemoryFs({
      '/project/skills/my-skill/SKILL.md':
        '---\nname: my-skill\ndescription: A skill\n---\n# My Skill\n',
    });
    const mockCognitives = [
      {
        name: 'my-skill',
        description: 'A skill',
        path: '/project/skills/my-skill',
        type: 'skill',
        rawContent: '---\nname: my-skill\ndescription: A skill\n---\n# My Skill\n',
        metadata: { name: 'my-skill', description: 'A skill' },
      },
    ];
    const discovery = createMockDiscovery(mockCognitives);
    const eventBus = createCapturingEventBus();
    const provider = new LocalProvider(fs, discovery, eventBus, '/');

    const results = await provider.fetchAll('/project');
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('my-skill');
    expect(results[0]!.providerId).toBe('local');
  });

  it('getSourceIdentifier returns resolved path', () => {
    const fs = createMemoryFs();
    const provider = new LocalProvider(
      fs,
      createMockDiscovery(),
      createCapturingEventBus(),
      '/home/user',
    );
    const id = provider.getSourceIdentifier('./skills');
    expect(id).toContain('skills');
  });
});
