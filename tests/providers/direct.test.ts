import { describe, it, expect } from 'vitest';
import { DirectURLProvider } from '../../src/providers/direct.js';
import { ProviderNotImplementedError } from '../../src/errors/provider.js';

describe('DirectURLProvider', () => {
  const provider = new DirectURLProvider();

  it('has correct id and displayName', () => {
    expect(provider.id).toBe('direct-url');
    expect(provider.displayName).toBe('Direct URL');
  });

  describe('match', () => {
    it('matches https://example.com/path/SKILL.md', () => {
      const result = provider.match('https://example.com/path/SKILL.md');
      expect(result.matches).toBe(true);
    });

    it('matches https://example.com/AGENT.md', () => {
      const result = provider.match('https://example.com/AGENT.md');
      expect(result.matches).toBe(true);
    });

    it('matches https://example.com/PROMPT.md', () => {
      const result = provider.match('https://example.com/PROMPT.md');
      expect(result.matches).toBe(true);
    });

    it('matches https://example.com/RULE.md', () => {
      const result = provider.match('https://example.com/RULE.md');
      expect(result.matches).toBe(true);
    });

    it('does not match URLs without cognitive file pattern', () => {
      const result = provider.match('https://example.com/readme.md');
      expect(result.matches).toBe(false);
    });

    it('does not match github.com without /raw/', () => {
      const result = provider.match('https://github.com/owner/repo/blob/main/SKILL.md');
      expect(result.matches).toBe(false);
    });

    it('matches github.com/raw/ URL with .md', () => {
      const result = provider.match('https://github.com/owner/repo/raw/main/SKILL.md');
      expect(result.matches).toBe(true);
    });

    it('does not match non-URL string', () => {
      const result = provider.match('not-a-url');
      expect(result.matches).toBe(false);
    });

    it('returns sourceIdentifier equal to the source', () => {
      const source = 'https://example.com/path/SKILL.md';
      const result = provider.match(source);
      expect(result.matches).toBe(true);
      expect(result.sourceIdentifier).toBe(source);
    });
  });

  describe('fetchCognitive', () => {
    it('throws ProviderNotImplementedError', async () => {
      await expect(provider.fetchCognitive('https://example.com/SKILL.md'))
        .rejects.toThrow(ProviderNotImplementedError);
    });

    it('includes provider id in error', async () => {
      await expect(provider.fetchCognitive('https://example.com/SKILL.md'))
        .rejects.toThrow('direct-url');
    });
  });

  describe('fetchAll', () => {
    it('throws ProviderNotImplementedError', async () => {
      await expect(provider.fetchAll('https://example.com/SKILL.md'))
        .rejects.toThrow(ProviderNotImplementedError);
    });
  });

  describe('toRawUrl', () => {
    it('returns input unchanged', () => {
      const url = 'https://example.com/SKILL.md';
      expect(provider.toRawUrl(url)).toBe(url);
    });
  });

  describe('getSourceIdentifier', () => {
    it('returns source as-is', () => {
      const source = 'https://example.com/SKILL.md';
      expect(provider.getSourceIdentifier(source)).toBe(source);
    });
  });
});
