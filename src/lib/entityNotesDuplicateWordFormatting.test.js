import { describe, expect, it } from 'vitest';
import { syncEntityNotesDuplicateWordFormatting } from './entityNotesDuplicateWordFormatting.js';

describe('syncEntityNotesDuplicateWordFormatting', () => {
  it('propagates a manual bold wrapper to plain duplicates', () => {
    const result = syncEntityNotesDuplicateWordFormatting('**Linh** tro lai. Linh gap Linh.');

    expect(result.text).toBe('**Linh** tro lai. **Linh** gap **Linh**.');
    expect(result.propagatedCount).toBe(2);
  });

  it('preserves the matched word casing when reapplying nested wrappers', () => {
    const result = syncEntityNotesDuplicateWordFormatting('[color=#ff0000]**Dao**[/color] va dao.');

    expect(result.text).toBe('[color=#ff0000]**Dao**[/color] va [color=#ff0000]**dao**[/color].');
    expect(result.propagatedCount).toBe(1);
  });

  it('skips propagation when the same word has conflicting manual wrappers', () => {
    const result = syncEntityNotesDuplicateWordFormatting('**Linh** dung day. *Linh* nhin lai. Linh boi roi.');

    expect(result.text).toBe('**Linh** dung day. *Linh* nhin lai. Linh boi roi.');
    expect(result.propagatedCount).toBe(0);
    expect(result.conflictCount).toBe(1);
  });

  it('does not wrap larger words or wiki links that only contain the same token', () => {
    const result = syncEntityNotesDuplicateWordFormatting('**Dao** DaoPhong [[Dao]] Dao.');

    expect(result.text).toBe('**Dao** DaoPhong [[Dao]] **Dao**.');
    expect(result.propagatedCount).toBe(1);
  });
});
