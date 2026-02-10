import type { Cognitive } from '../types/cognitive.js';
import type { Result } from '../types/result.js';
import { ok, err } from '../types/result.js';
import { ValidationError } from '../errors/discovery.js';
import { COGNITIVE_TYPE_CONFIGS } from '../types/cognitive.js';

const VALID_TYPES = new Set<string>(Object.keys(COGNITIVE_TYPE_CONFIGS));

export class CognitiveValidator {
  validate(cognitive: Cognitive): Result<Cognitive, ValidationError> {
    if (!cognitive.name || cognitive.name.length === 0) {
      return err(new ValidationError('name', 'must be non-empty'));
    }

    if (!VALID_TYPES.has(cognitive.type)) {
      return err(new ValidationError('type', `must be one of: ${[...VALID_TYPES].join(', ')}`));
    }

    if (!cognitive.path || cognitive.path.length === 0) {
      return err(new ValidationError('path', 'must be non-empty'));
    }

    return ok(cognitive);
  }
}
