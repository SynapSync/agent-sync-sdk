import { describe, it, expect } from 'vitest';
import { WellKnownProvider } from '../../src/providers/wellknown.js';

describe('WellKnownProvider', () => {
  const provider = new WellKnownProvider();

  describe('match()', () => {
    it('matches generic HTTPS domains', () => {
      const result = provider.match('https://example.com');
      expect(result.matches).toBe(true);
    });

    it('matches HTTPS domain with path', () => {
      const result = provider.match('https://my-cognitives.dev/api');
      expect(result.matches).toBe(true);
    });

    it('does not match github.com', () => {
      expect(provider.match('https://github.com/owner/repo').matches).toBe(false);
    });

    it('does not match gitlab.com', () => {
      expect(provider.match('https://gitlab.com/owner/repo').matches).toBe(false);
    });

    it('does not match huggingface.co', () => {
      expect(provider.match('https://huggingface.co/spaces/owner/repo').matches).toBe(false);
    });

    it('does not match .md URLs (caught by DirectURLProvider)', () => {
      expect(provider.match('https://example.com/path/SKILL.md').matches).toBe(false);
    });

    it('does not match non-HTTPS URLs', () => {
      expect(provider.match('http://example.com').matches).toBe(false);
    });

    it('does not match invalid URLs', () => {
      expect(provider.match('not-a-url').matches).toBe(false);
    });

    it('returns sourceIdentifier with wellknown/ prefix', () => {
      const result = provider.match('https://example.com/path');
      expect(result.sourceIdentifier).toBeDefined();
    });
  });

  describe('toRawUrl()', () => {
    it('returns URL unchanged', () => {
      expect(provider.toRawUrl('https://example.com')).toBe('https://example.com');
    });
  });

  describe('getSourceIdentifier()', () => {
    it('returns wellknown/hostname format', () => {
      expect(provider.getSourceIdentifier('https://example.com/path')).toBe(
        'wellknown/example.com',
      );
    });

    it('falls back for invalid URLs', () => {
      expect(provider.getSourceIdentifier('invalid')).toBe('wellknown/invalid');
    });
  });

  describe('fetchAll()', () => {
    it('returns empty array for invalid URL', async () => {
      const result = await provider.fetchAll('not-a-url');
      expect(result).toEqual([]);
    });
  });

  describe('fetchCognitive()', () => {
    it('returns null for invalid URL', async () => {
      const result = await provider.fetchCognitive('not-a-url');
      expect(result).toBeNull();
    });
  });
});
