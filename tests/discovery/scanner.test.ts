import { describe, it, expect } from 'vitest';
import { createMemoryFs } from '../../src/fs/memory.js';
import { CognitiveScanner } from '../../src/discovery/scanner.js';

// Helper to create a valid cognitive file content
const SKILL_CONTENT = '---\nname: test-skill\ndescription: A test skill\n---\n# Test Skill\n';
const PROMPT_CONTENT = '---\nname: test-prompt\ndescription: A test prompt\n---\n# Test Prompt\n';
const RULE_CONTENT = '---\nname: test-rule\ndescription: A test rule\n---\n# Test Rule\n';
const AGENT_CONTENT = '---\nname: test-agent\ndescription: A test agent\n---\n# Test Agent\n';

describe('CognitiveScanner', () => {
  it('discovers SKILL.md in skills/<name>/ directories', async () => {
    const fs = createMemoryFs({
      '/base/skills/react-best-practices/SKILL.md': SKILL_CONTENT,
      '/base/skills/typescript-patterns/SKILL.md': SKILL_CONTENT,
    });
    const scanner = new CognitiveScanner(fs);
    const results = await scanner.scan('/base', { types: ['skill'] });
    expect(results).toHaveLength(2);
    expect(results.every((r) => r.type === 'skill')).toBe(true);
    expect(results.every((r) => r.fileName === 'SKILL.md')).toBe(true);
  });

  it('discovers PROMPT.md in prompts/<name>/ directories', async () => {
    const fs = createMemoryFs({
      '/base/prompts/code-review/PROMPT.md': PROMPT_CONTENT,
    });
    const scanner = new CognitiveScanner(fs);
    const results = await scanner.scan('/base', { types: ['prompt'] });
    expect(results).toHaveLength(1);
    expect(results[0]!.type).toBe('prompt');
  });

  it('discovers all 4 types when no filter is specified', async () => {
    const fs = createMemoryFs({
      '/base/skills/my-skill/SKILL.md': SKILL_CONTENT,
      '/base/prompts/my-prompt/PROMPT.md': PROMPT_CONTENT,
      '/base/rules/my-rule/RULE.md': RULE_CONTENT,
      '/base/agents/my-agent/AGENT.md': AGENT_CONTENT,
    });
    const scanner = new CognitiveScanner(fs);
    const results = await scanner.scan('/base');
    const types = new Set(results.map((r) => r.type));
    expect(types.size).toBe(4);
    expect(types.has('skill')).toBe(true);
    expect(types.has('prompt')).toBe(true);
    expect(types.has('rule')).toBe(true);
    expect(types.has('agent')).toBe(true);
  });

  it('respects types filter option', async () => {
    const fs = createMemoryFs({
      '/base/skills/my-skill/SKILL.md': SKILL_CONTENT,
      '/base/prompts/my-prompt/PROMPT.md': PROMPT_CONTENT,
      '/base/rules/my-rule/RULE.md': RULE_CONTENT,
    });
    const scanner = new CognitiveScanner(fs);
    const results = await scanner.scan('/base', { types: ['skill', 'rule'] });
    const types = new Set(results.map((r) => r.type));
    expect(types.has('skill')).toBe(true);
    expect(types.has('rule')).toBe(true);
    expect(types.has('prompt')).toBe(false);
  });

  it('skips node_modules and hidden directories', async () => {
    const fs = createMemoryFs({
      '/base/skills/good-skill/SKILL.md': SKILL_CONTENT,
      '/base/node_modules/bad-skill/SKILL.md': SKILL_CONTENT,
      '/base/.hidden/hidden-skill/SKILL.md': SKILL_CONTENT,
    });
    const scanner = new CognitiveScanner(fs);
    const results = await scanner.scan('/base', { types: ['skill'] });
    // Should only find the good-skill, not node_modules or hidden
    expect(results).toHaveLength(1);
    expect(results[0]!.path).toContain('good-skill');
  });

  it('deduplicates results from typed and flat scan', async () => {
    // A skill that would be found in both typed subdir scan and flat scan
    const fs = createMemoryFs({
      '/base/skills/my-skill/SKILL.md': SKILL_CONTENT,
    });
    const scanner = new CognitiveScanner(fs);
    const results = await scanner.scan('/base', { types: ['skill'] });
    // Should not have duplicate entries
    const paths = results.map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('respects maxDepth option', async () => {
    const fs = createMemoryFs({
      '/base/skills/shallow/SKILL.md': SKILL_CONTENT,
      '/base/skills/deep/nested/very/deep-skill/SKILL.md': SKILL_CONTENT,
    });
    const scanner = new CognitiveScanner(fs);
    const results = await scanner.scan('/base', { types: ['skill'], maxDepth: 1 });
    // Only the shallow skill should be found
    expect(results).toHaveLength(1);
    expect(results[0]!.path).toContain('shallow');
  });
});
