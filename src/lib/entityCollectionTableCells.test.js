import { describe, expect, it } from 'vitest';
import { readCollectionTableCellRaw } from './entityCollectionTableCells.js';

describe('entityCollectionTableCells', () => {
  it('reads displayString and dynamic fields without mutation', () => {
    const ent = {
      id: 'a',
      name: 'Alpha',
      dynamicData: { f_status: 'Line', f_alias: 'A' },
    };
    const before = JSON.stringify(ent);
    expect(readCollectionTableCellRaw(ent, 'entity')).toBe('Alpha');
    expect(readCollectionTableCellRaw(ent, 'displayString')).toBe('Line');
    expect(readCollectionTableCellRaw(ent, 'f_alias')).toBe('A');
    expect(readCollectionTableCellRaw(ent, 'f_missing')).toBe('');
    expect(JSON.stringify(ent)).toBe(before);
  });

  it('handles array values safely', () => {
    const ent = { id: 'b', name: 'B', dynamicData: { f_tags: ['x', 'y'] } };
    expect(readCollectionTableCellRaw(ent, 'f_tags')).toBe('x, y');
  });
});
