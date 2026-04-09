import { describe, expect, it } from 'vitest';
import { resolveEntityPageForSelection } from './entitySelectionPage.js';

describe('resolveEntityPageForSelection', () => {
  const entities = Array.from({ length: 25 }, (_, index) => ({ id: `ent-${index + 1}` }));

  it('returns the page containing the selected entity', () => {
    expect(resolveEntityPageForSelection(entities, 'ent-1', 12)).toBe(1);
    expect(resolveEntityPageForSelection(entities, 'ent-12', 12)).toBe(1);
    expect(resolveEntityPageForSelection(entities, 'ent-13', 12)).toBe(2);
    expect(resolveEntityPageForSelection(entities, 'ent-25', 12)).toBe(3);
  });

  it('returns null when selection is missing or not present in the current list', () => {
    expect(resolveEntityPageForSelection(entities, null, 12)).toBeNull();
    expect(resolveEntityPageForSelection(entities, 'ent-99', 12)).toBeNull();
    expect(resolveEntityPageForSelection([], 'ent-1', 12)).toBeNull();
  });
});
