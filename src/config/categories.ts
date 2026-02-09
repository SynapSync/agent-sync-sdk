import type { Category } from '../types/config.js';
import { DEFAULT_CATEGORIES } from '../types/config.js';

export class CategoryRegistry {
  private readonly categories = new Map<string, Category>();

  constructor() {
    for (const cat of Object.values(DEFAULT_CATEGORIES)) {
      this.categories.set(cat.slug, cat);
    }
  }

  get(slug: string): Category | undefined {
    return this.categories.get(slug);
  }

  getAll(): ReadonlyMap<string, Category> {
    return this.categories;
  }

  register(category: Category): void {
    this.categories.set(category.slug, category);
  }
}
