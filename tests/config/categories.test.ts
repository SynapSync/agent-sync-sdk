import { describe, it, expect } from 'vitest';
import { CategoryRegistry } from '../../src/config/categories.js';
import { DEFAULT_CATEGORIES } from '../../src/types/config.js';
import type { Category } from '../../src/types/config.js';

describe('CategoryRegistry', () => {
  it('constructor loads all DEFAULT_CATEGORIES', () => {
    const registry = new CategoryRegistry();
    const all = registry.getAll();
    const defaultSlugs = Object.values(DEFAULT_CATEGORIES).map((c) => c.slug);

    expect(all.size).toBe(defaultSlugs.length);
    for (const slug of defaultSlugs) {
      expect(all.has(slug)).toBe(true);
    }
  });

  it('get() returns an existing category by slug', () => {
    const registry = new CategoryRegistry();
    const cat = registry.get('general');
    expect(cat).toBeDefined();
    expect(cat!.slug).toBe('general');
    expect(cat!.displayName).toBe('General');
  });

  it('get() returns undefined for an unknown slug', () => {
    const registry = new CategoryRegistry();
    expect(registry.get('nonexistent-slug')).toBeUndefined();
  });

  it('getAll() returns a non-empty map', () => {
    const registry = new CategoryRegistry();
    expect(registry.getAll().size).toBeGreaterThan(0);
  });

  it('register() adds a new category retrievable by get()', () => {
    const registry = new CategoryRegistry();
    const custom: Category = { slug: 'ai', displayName: 'AI / ML' };
    registry.register(custom);

    const retrieved = registry.get('ai');
    expect(retrieved).toBeDefined();
    expect(retrieved!.slug).toBe('ai');
    expect(retrieved!.displayName).toBe('AI / ML');
  });

  it('register() overwrites an existing category with the same slug', () => {
    const registry = new CategoryRegistry();
    const override: Category = { slug: 'general', displayName: 'Overridden' };
    registry.register(override);

    const retrieved = registry.get('general');
    expect(retrieved).toBeDefined();
    expect(retrieved!.displayName).toBe('Overridden');
  });
});
