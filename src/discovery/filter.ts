import type { Cognitive, CognitiveType } from '../types/cognitive.js';

export interface FilterCriteria {
  readonly type?: CognitiveType;
  readonly namePattern?: string;
  readonly tags?: readonly string[];
  readonly category?: string;
}

export class CognitiveFilter {
  filter(cognitives: readonly Cognitive[], criteria: FilterCriteria): Cognitive[] {
    return cognitives.filter((cog) => {
      if (criteria.type && cog.type !== criteria.type) return false;

      if (criteria.namePattern) {
        const pattern = criteria.namePattern.toLowerCase();
        if (!cog.name.toLowerCase().includes(pattern)) return false;
      }

      if (criteria.tags && criteria.tags.length > 0) {
        const cogTags = (cog.metadata['tags'] as string[] | undefined) ?? [];
        const hasMatch = criteria.tags.some((t) => cogTags.includes(t));
        if (!hasMatch) return false;
      }

      if (criteria.category) {
        const cogCategory = cog.metadata['category'] as string | undefined;
        if (cogCategory !== criteria.category) return false;
      }

      return true;
    });
  }
}
