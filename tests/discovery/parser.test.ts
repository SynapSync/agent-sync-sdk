import { describe, it, expect } from 'vitest';
import { createMemoryFs } from '../../src/fs/memory.js';
import { CognitiveParser } from '../../src/discovery/parser.js';
import { ParseError } from '../../src/errors/discovery.js';

describe('CognitiveParser', () => {
  it('extracts name from frontmatter', async () => {
    const fs = createMemoryFs({
      '/cognitives/my-skill/SKILL.md': '---\nname: react-hooks\ndescription: React hooks guide\n---\n# Content\n',
    });
    const parser = new CognitiveParser(fs);
    const result = await parser.parse({ path: '/cognitives/my-skill', type: 'skill', fileName: 'SKILL.md' });
    expect(result.name).toBe('react-hooks');
  });

  it('extracts description from frontmatter', async () => {
    const fs = createMemoryFs({
      '/cognitives/my-skill/SKILL.md': '---\nname: test\ndescription: My custom description\n---\n# Content\n',
    });
    const parser = new CognitiveParser(fs);
    const result = await parser.parse({ path: '/cognitives/my-skill', type: 'skill', fileName: 'SKILL.md' });
    expect(result.description).toBe('My custom description');
  });

  it('falls back to directory name when name is missing', async () => {
    const fs = createMemoryFs({
      '/cognitives/fallback-name/SKILL.md': '---\ndescription: No name field\n---\n# Content\n',
    });
    const parser = new CognitiveParser(fs);
    const result = await parser.parse({ path: '/cognitives/fallback-name', type: 'skill', fileName: 'SKILL.md' });
    expect(result.name).toBe('fallback-name');
  });

  it('falls back to first content line when description is missing', async () => {
    const fs = createMemoryFs({
      '/cognitives/my-skill/SKILL.md': '---\nname: test\n---\n# Heading\nFirst paragraph line.\n',
    });
    const parser = new CognitiveParser(fs);
    const result = await parser.parse({ path: '/cognitives/my-skill', type: 'skill', fileName: 'SKILL.md' });
    expect(result.description).toBe('First paragraph line.');
  });

  it('returns complete Cognitive object with all fields', async () => {
    const content = '---\nname: complete-skill\ndescription: Complete description\ncategory: frontend\ntags:\n  - react\n  - typescript\n---\n# Content\n';
    const fs = createMemoryFs({
      '/cognitives/my-skill/SKILL.md': content,
    });
    const parser = new CognitiveParser(fs);
    const result = await parser.parse({ path: '/cognitives/my-skill', type: 'skill', fileName: 'SKILL.md' });
    expect(result.name).toBe('complete-skill');
    expect(result.description).toBe('Complete description');
    expect(result.path).toBe('/cognitives/my-skill');
    expect(result.type).toBe('skill');
    expect(result.rawContent).toBe(content);
  });

  it('throws ParseError for non-existent file', async () => {
    const fs = createMemoryFs({});
    const parser = new CognitiveParser(fs);
    await expect(
      parser.parse({ path: '/missing', type: 'skill', fileName: 'SKILL.md' })
    ).rejects.toThrow(ParseError);
  });

  it('stores all frontmatter keys in metadata', async () => {
    const fs = createMemoryFs({
      '/cognitives/my-skill/SKILL.md': '---\nname: test\nauthor: john\nversion: 1.0.0\ncustom_field: custom_value\n---\n# Content\n',
    });
    const parser = new CognitiveParser(fs);
    const result = await parser.parse({ path: '/cognitives/my-skill', type: 'skill', fileName: 'SKILL.md' });
    expect(result.metadata['author']).toBe('john');
    expect(result.metadata['version']).toBe('1.0.0');
    expect(result.metadata['custom_field']).toBe('custom_value');
  });
});
