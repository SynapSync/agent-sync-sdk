import { describe, it, expect } from 'vitest';
import {
  agentName,
  cognitiveName,
  safeName,
  sourceIdentifier,
  isAgentName,
  isCognitiveName,
} from '../../src/types/brands.js';

describe('Branded Types', () => {
  describe('agentName()', () => {
    it('accepts valid agent names', () => {
      expect(() => agentName('claude-code')).not.toThrow();
      expect(() => agentName('cursor')).not.toThrow();
      expect(() => agentName('a1')).not.toThrow();
      expect(() => agentName('gemini-cli')).not.toThrow();
    });

    it('rejects invalid agent names', () => {
      expect(() => agentName('Claude-Code')).toThrow('Invalid agent name');
      expect(() => agentName('has space')).toThrow('Invalid agent name');
      expect(() => agentName('-starts-hyphen')).toThrow('Invalid agent name');
      expect(() => agentName('')).toThrow('Invalid agent name');
    });
  });

  describe('cognitiveName()', () => {
    it('accepts valid cognitive names', () => {
      expect(() => cognitiveName('react-best-practices')).not.toThrow();
      expect(() => cognitiveName('My Skill')).not.toThrow();
    });

    it('rejects names with path separators', () => {
      expect(() => cognitiveName('path/name')).toThrow('Invalid cognitive name');
      expect(() => cognitiveName('path\\name')).toThrow('Invalid cognitive name');
      expect(() => cognitiveName('')).toThrow('Invalid cognitive name');
    });
  });

  describe('safeName()', () => {
    it('accepts filesystem-safe names', () => {
      expect(() => safeName('my-skill')).not.toThrow();
      expect(() => safeName('react-best-practices')).not.toThrow();
    });

    it('rejects unsafe names', () => {
      expect(() => safeName('.')).toThrow('Unsafe name');
      expect(() => safeName('..')).toThrow('Unsafe name');
      expect(() => safeName('a/b')).toThrow('Unsafe name');
      expect(() => safeName('a\\b')).toThrow('Unsafe name');
      expect(() => safeName('a:b')).toThrow('Unsafe name');
      expect(() => safeName('a\0b')).toThrow('Unsafe name');
      expect(() => safeName('')).toThrow('Unsafe name');
    });
  });

  describe('sourceIdentifier()', () => {
    it('accepts non-empty strings', () => {
      expect(() => sourceIdentifier('owner/repo')).not.toThrow();
    });

    it('rejects empty string', () => {
      expect(() => sourceIdentifier('')).toThrow('Empty source identifier');
    });
  });

  describe('type guards', () => {
    it('isAgentName validates correctly', () => {
      expect(isAgentName('claude-code')).toBe(true);
      expect(isAgentName('INVALID')).toBe(false);
    });

    it('isCognitiveName validates correctly', () => {
      expect(isCognitiveName('my-skill')).toBe(true);
      expect(isCognitiveName('')).toBe(false);
      expect(isCognitiveName('a/b')).toBe(false);
    });
  });
});
