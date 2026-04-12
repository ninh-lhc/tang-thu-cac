import { describe, expect, it } from 'vitest';
import {
  applyEntityNotesDiagnosticFix,
  collectEntityNotesDiagnostics,
  fixAllEntityNotesDiagnostics,
} from './entityNotesDiagnostics.js';

describe('collectEntityNotesDiagnostics', () => {
  it('reports broken inline markers and excessive blank lines', () => {
    const warnings = collectEntityNotesDiagnostics('**Mo dau\n[[wiki\n[color=#12GG]sai[/color]\n\n\nKet');

    expect(warnings.map((item) => item.id)).toContain('bold-unclosed');
    expect(warnings.map((item) => item.id)).toContain('wiki-unclosed');
    expect(warnings.map((item) => item.id)).toContain('color-invalid-value');
    expect(warnings.map((item) => item.id)).toContain('blank-lines');
  });

  it('reports numbering gaps and unsupported callout roles', () => {
    const warnings = collectEntityNotesDiagnostics('1. Mot\n3. Ba\n> [!UNKNOWN] Thu xem');

    expect(warnings.some((item) => item.id.startsWith('ordered-gap'))).toBe(true);
    expect(warnings.map((item) => item.id)).toContain('callout-role');
  });

  it('applies quick fixes and normalizes all fixable warnings', () => {
    const boldWarning = collectEntityNotesDiagnostics('**Mo dau').find((item) => item.id === 'bold-unclosed');
    expect(applyEntityNotesDiagnosticFix('**Mo dau', boldWarning)).toBe('**Mo dau**');

    expect(
      fixAllEntityNotesDiagnostics('**Mo dau\n\n\n3. Ba\n> [!UNKNOWN] Thu xem')
    ).toContain('> [!NOTE] Thu xem');
  });
});
