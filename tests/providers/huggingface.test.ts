import { describe, it, expect } from 'vitest';
import { HuggingFaceProvider } from '../../src/providers/huggingface.js';

describe('HuggingFaceProvider', () => {
  const provider = new HuggingFaceProvider();

  it('has correct id and displayName', () => {
    expect(provider.id).toBe('huggingface');
    expect(provider.displayName).toBe('Hugging Face');
  });

  describe('match', () => {
    it('matches https://huggingface.co/owner/repo', () => {
      const result = provider.match('https://huggingface.co/owner/repo');
      expect(result.matches).toBe(true);
    });

    it('does not match https://github.com/owner/repo', () => {
      const result = provider.match('https://github.com/owner/repo');
      expect(result.matches).toBe(false);
    });

    it('does not match non-URL string', () => {
      const result = provider.match('not-a-url');
      expect(result.matches).toBe(false);
    });

    it('returns sourceIdentifier from URL pathname', () => {
      const result = provider.match('https://huggingface.co/org/model');
      expect(result.matches).toBe(true);
      expect(result.sourceIdentifier).toBe('org/model');
    });
  });

  describe('fetchCognitive', () => {
    it('returns null (stub)', async () => {
      const result = await provider.fetchCognitive('https://huggingface.co/owner/repo');
      expect(result).toBeNull();
    });
  });

  describe('fetchAll', () => {
    it('returns empty array (stub)', async () => {
      const result = await provider.fetchAll('https://huggingface.co/owner/repo');
      expect(result).toEqual([]);
    });
  });

  describe('toRawUrl', () => {
    it('returns input unchanged', () => {
      const url = 'https://huggingface.co/owner/repo';
      expect(provider.toRawUrl(url)).toBe(url);
    });
  });

  describe('getSourceIdentifier', () => {
    it('returns pathname without leading slash for valid URL', () => {
      const result = provider.getSourceIdentifier('https://huggingface.co/org/model');
      expect(result).toBe('org/model');
    });

    it('returns source for invalid URL', () => {
      const result = provider.getSourceIdentifier('not-a-url');
      expect(result).toBe('not-a-url');
    });
  });
});
