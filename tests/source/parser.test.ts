import { describe, it, expect } from 'vitest';
import { SourceParserImpl } from '../../src/source/parser.js';

describe('SourceParserImpl', () => {
  const parser = new SourceParserImpl();

  describe('local paths', () => {
    it('resolves relative path with ./', () => {
      const result = parser.parse('./my-skills');
      expect(result.kind).toBe('local');
      expect(result.localPath).toBe('./my-skills');
    });

    it('resolves absolute path', () => {
      const result = parser.parse('/absolute/path');
      expect(result.kind).toBe('local');
      expect(result.localPath).toBe('/absolute/path');
    });

    it('resolves relative path with ../', () => {
      const result = parser.parse('../parent/skills');
      expect(result.kind).toBe('local');
    });

    it('resolves Windows path', () => {
      const result = parser.parse('C:\\Users\\skills');
      expect(result.kind).toBe('local');
    });
  });

  describe('direct cognitive URLs', () => {
    it('resolves non-git-host cognitive URL', () => {
      const result = parser.parse('https://docs.example.com/SKILL.md');
      expect(result.kind).toBe('direct-url');
      expect(result.url).toBe('https://docs.example.com/SKILL.md');
    });
  });

  describe('GitHub URLs', () => {
    it('resolves GitHub tree with path', () => {
      const result = parser.parse('https://github.com/owner/repo/tree/main/src/skills');
      expect(result.kind).toBe('github');
      expect(result.url).toBe('https://github.com/owner/repo.git');
      expect(result.ref).toBe('main');
      expect(result.subpath).toBe('src/skills');
    });

    it('resolves GitHub tree without path', () => {
      const result = parser.parse('https://github.com/owner/repo/tree/main');
      expect(result.kind).toBe('github');
      expect(result.url).toBe('https://github.com/owner/repo.git');
      expect(result.ref).toBe('main');
    });

    it('resolves GitHub repo URL', () => {
      const result = parser.parse('https://github.com/owner/repo');
      expect(result.kind).toBe('github');
      expect(result.url).toBe('https://github.com/owner/repo.git');
    });
  });

  describe('GitLab URLs', () => {
    it('resolves GitLab tree with path', () => {
      const result = parser.parse('https://gitlab.com/group/repo/-/tree/main/path');
      expect(result.kind).toBe('gitlab');
      expect(result.ref).toBe('main');
      expect(result.subpath).toBe('path');
    });

    it('resolves GitLab repo URL', () => {
      const result = parser.parse('https://gitlab.com/group/repo');
      expect(result.kind).toBe('gitlab');
    });
  });

  describe('shorthand patterns', () => {
    it('resolves owner/repo@name', () => {
      const result = parser.parse('owner/repo@skill-name');
      expect(result.kind).toBe('github');
      expect(result.url).toBe('https://github.com/owner/repo.git');
      expect(result.nameFilter).toBe('skill-name');
    });

    it('resolves owner/repo', () => {
      const result = parser.parse('owner/repo');
      expect(result.kind).toBe('github');
      expect(result.url).toBe('https://github.com/owner/repo.git');
    });

    it('resolves owner/repo/subpath', () => {
      const result = parser.parse('owner/repo/subpath');
      expect(result.kind).toBe('github');
      expect(result.subpath).toBe('subpath');
    });
  });

  describe('well-known and fallback', () => {
    it('resolves well-known URL', () => {
      const result = parser.parse('https://example.com/some/page');
      expect(result.kind).toBe('well-known');
    });

    it('falls back to git for SSH URLs', () => {
      const result = parser.parse('git@github.com:owner/repo.git');
      expect(result.kind).toBe('git');
    });
  });

  describe('getOwnerRepo', () => {
    it('extracts owner/repo from GitHub descriptor', () => {
      const desc = parser.parse('https://github.com/owner/repo');
      expect(parser.getOwnerRepo(desc)).toBe('owner/repo');
    });

    it('returns undefined for local descriptor', () => {
      const desc = parser.parse('./local-path');
      expect(parser.getOwnerRepo(desc)).toBeUndefined();
    });
  });

  describe('edge cases', () => {
    it('trims whitespace from input', () => {
      const result = parser.parse('  owner/repo  ');
      expect(result.kind).toBe('github');
    });
  });
});
