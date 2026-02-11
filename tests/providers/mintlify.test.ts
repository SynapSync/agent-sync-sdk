import { describe, it, expect } from 'vitest';
import { MintlifyProvider } from '../../src/providers/mintlify.js';
import { ProviderNotImplementedError } from '../../src/errors/provider.js';

describe('MintlifyProvider', () => {
  const provider = new MintlifyProvider();

  it('has correct id and displayName', () => {
    expect(provider.id).toBe('mintlify');
    expect(provider.displayName).toBe('Mintlify');
  });

  describe('match', () => {
    it('matches https://mintlify.com/docs/path', () => {
      const result = provider.match('https://mintlify.com/docs/path');
      expect(result.matches).toBe(true);
    });

    it('matches https://docs.mintlify.com/path', () => {
      const result = provider.match('https://docs.mintlify.com/path');
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

    it('returns sourceIdentifier with hostname+path on match', () => {
      const result = provider.match('https://mintlify.com/docs/intro');
      expect(result.matches).toBe(true);
      expect(result.sourceIdentifier).toBe('mintlify.com/docs/intro');
    });
  });

  describe('fetchCognitive', () => {
    it('throws ProviderNotImplementedError', async () => {
      await expect(provider.fetchCognitive('https://mintlify.com/docs/path'))
        .rejects.toThrow(ProviderNotImplementedError);
    });

    it('includes provider id in error', async () => {
      await expect(provider.fetchCognitive('https://mintlify.com/docs/path'))
        .rejects.toThrow('mintlify');
    });
  });

  describe('fetchAll', () => {
    it('throws ProviderNotImplementedError', async () => {
      await expect(provider.fetchAll('https://mintlify.com/docs/path'))
        .rejects.toThrow(ProviderNotImplementedError);
    });
  });

  describe('toRawUrl', () => {
    it('returns input unchanged', () => {
      const url = 'https://mintlify.com/docs/path';
      expect(provider.toRawUrl(url)).toBe(url);
    });
  });

  describe('getSourceIdentifier', () => {
    it('returns hostname+pathname for valid URL', () => {
      const result = provider.getSourceIdentifier('https://mintlify.com/docs/intro');
      expect(result).toBe('mintlify.com/docs/intro');
    });

    it('returns source for invalid URL', () => {
      const result = provider.getSourceIdentifier('not-a-url');
      expect(result).toBe('not-a-url');
    });
  });
});
