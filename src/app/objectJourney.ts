import type { SemanticMathObject } from '../lib/math/types';
import { isVisualizable } from './visualizationModes';

// UI-only context. Never infer persistence from an object's display name:
// anonymous or unsaved work must not acquire durable-object actions.
export function objectJourneyState(object: SemanticMathObject, saved: boolean) {
  return {
    name: object.name || object.kind,
    ownership: saved ? 'Saved object' : 'Temporary work',
    canReopen: saved,
    canExplore: saved && isVisualizable(object),
  };
}
