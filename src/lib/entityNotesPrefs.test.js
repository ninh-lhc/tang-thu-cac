import { describe, it, expect, beforeEach } from 'vitest';
import {
  clampEntityNotesSizePx,
  ENTITY_NOTES_FONT_OPTIONS,
  ENTITY_NOTES_FONT_SIZE_OPTIONS,
  getEntityNotesPrefs,
  setEntityNotesPrefs,
  getEntityNotesFontStack,
} from './entityNotesPrefs.js';

describe('entityNotesPrefs', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('clampEntityNotesSizePx', () => {
    expect(clampEntityNotesSizePx(7)).toBe(8);
    expect(clampEntityNotesSizePx(8)).toBe(8);
    expect(clampEntityNotesSizePx(18)).toBe(18);
    expect(clampEntityNotesSizePx(30)).toBe(30);
    expect(clampEntityNotesSizePx(31)).toBe(30);
    expect(clampEntityNotesSizePx(NaN)).toBe(16);
  });

  it('ENTITY_NOTES_FONT_SIZE_OPTIONS is 8..30', () => {
    expect(ENTITY_NOTES_FONT_SIZE_OPTIONS[0]).toBe(8);
    expect(ENTITY_NOTES_FONT_SIZE_OPTIONS.at(-1)).toBe(30);
    expect(ENTITY_NOTES_FONT_SIZE_OPTIONS.length).toBe(23);
  });

  it('getEntityNotesPrefs defaults and setEntityNotesPrefs', () => {
    const a = getEntityNotesPrefs();
    expect(a.fontKey).toBe('times');
    expect(a.sizePx).toBe(16);
    setEntityNotesPrefs({ fontKey: 'verdana', sizePx: 12 });
    const b = getEntityNotesPrefs();
    expect(b.fontKey).toBe('verdana');
    expect(b.sizePx).toBe(12);
  });

  it('getEntityNotesPrefs returns same snapshot reference when prefs unchanged (useSyncExternalStore)', () => {
    localStorage.clear();
    const x = getEntityNotesPrefs();
    const y = getEntityNotesPrefs();
    expect(x).toBe(y);
  });

  it('getEntityNotesFontStack', () => {
    const s = getEntityNotesFontStack('verdana');
    expect(s).toContain('Verdana');
    expect(ENTITY_NOTES_FONT_OPTIONS.some((o) => o.id === 'times')).toBe(true);
  });
});
