import { describe, it, expect } from 'vitest';
import { createMemoryFs } from '../../src/fs/memory.js';
import { createCapturingEventBus } from '../../src/events/index.js';
import { DiscoveryServiceImpl } from '../../src/discovery/index.js';

function createSeededFs() {
  return createMemoryFs({
    // 3 skills
    '/project/skills/react-hooks/SKILL.md':
      '---\nname: react-hooks\ndescription: React hooks patterns\ncategory: frontend\ntags:\n  - react\n  - hooks\n---\n# React Hooks\n',
    '/project/skills/typescript-patterns/SKILL.md':
      '---\nname: typescript-patterns\ndescription: TypeScript patterns\ncategory: frontend\ntags:\n  - typescript\n---\n# TS Patterns\n',
    '/project/skills/node-testing/SKILL.md':
      '---\nname: node-testing\ndescription: Node.js testing guide\ncategory: backend\ntags:\n  - node\n  - testing\n---\n# Node Testing\n',
    // 2 prompts
    '/project/prompts/code-review/PROMPT.md':
      '---\nname: code-review\ndescription: Code review prompt\ncategory: qa\ntags:\n  - review\n---\n# Code Review\n',
    '/project/prompts/bug-fix/PROMPT.md':
      '---\nname: bug-fix\ndescription: Bug fixing prompt\ncategory: qa\ntags:\n  - debugging\n---\n# Bug Fix\n',
    // 1 rule
    '/project/rules/no-console/RULE.md':
      '---\nname: no-console\ndescription: No console.log rule\ncategory: qa\ntags:\n  - linting\n---\n# No Console\n',
  });
}

describe('DiscoveryServiceImpl', () => {
  it('discovers all cognitives across types', async () => {
    const fs = createSeededFs();
    const eventBus = createCapturingEventBus();
    const discovery = new DiscoveryServiceImpl(fs, eventBus);
    const results = await discovery.discover('/project');
    expect(results).toHaveLength(6);
  });

  it('discoverByType returns only matching type', async () => {
    const fs = createSeededFs();
    const eventBus = createCapturingEventBus();
    const discovery = new DiscoveryServiceImpl(fs, eventBus);
    const skills = await discovery.discoverByType('/project', 'skill');
    expect(skills).toHaveLength(3);
    expect(skills.every((s) => s.type === 'skill')).toBe(true);
  });

  it('filters by name pattern', async () => {
    const fs = createSeededFs();
    const eventBus = createCapturingEventBus();
    const discovery = new DiscoveryServiceImpl(fs, eventBus);
    const results = await discovery.discover('/project', { namePattern: 'react' });
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('react-hooks');
  });

  it('filters by tags', async () => {
    const fs = createSeededFs();
    const eventBus = createCapturingEventBus();
    const discovery = new DiscoveryServiceImpl(fs, eventBus);
    const results = await discovery.discover('/project', { tags: ['testing'] });
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe('node-testing');
  });

  it('filters by category', async () => {
    const fs = createSeededFs();
    const eventBus = createCapturingEventBus();
    const discovery = new DiscoveryServiceImpl(fs, eventBus);
    const results = await discovery.discover('/project', { category: 'qa' });
    expect(results).toHaveLength(3);
  });

  it('emits discovery:start event', async () => {
    const fs = createSeededFs();
    const eventBus = createCapturingEventBus();
    const discovery = new DiscoveryServiceImpl(fs, eventBus);
    await discovery.discover('/project');
    const startEvents = eventBus.events.filter((e) => e.event === 'discovery:start');
    expect(startEvents).toHaveLength(1);
    expect((startEvents[0]!.payload as { path: string }).path).toBe('/project');
  });

  it('emits discovery:found events for each cognitive', async () => {
    const fs = createSeededFs();
    const eventBus = createCapturingEventBus();
    const discovery = new DiscoveryServiceImpl(fs, eventBus);
    await discovery.discover('/project');
    const foundEvents = eventBus.events.filter((e) => e.event === 'discovery:found');
    expect(foundEvents).toHaveLength(6);
  });

  it('emits discovery:complete event with count', async () => {
    const fs = createSeededFs();
    const eventBus = createCapturingEventBus();
    const discovery = new DiscoveryServiceImpl(fs, eventBus);
    await discovery.discover('/project');
    const completeEvents = eventBus.events.filter((e) => e.event === 'discovery:complete');
    expect(completeEvents).toHaveLength(1);
    expect((completeEvents[0]!.payload as { count: number }).count).toBe(6);
  });
});
