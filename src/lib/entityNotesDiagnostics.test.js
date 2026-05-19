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

  it('suppresses transient bold/wiki warnings on the line being edited', () => {
    const line = '- **[[Phap Tat]] ([[Chi Cao';
    const midLine = line.length;
    expect(
      collectEntityNotesDiagnostics(line, {
        caretIndex: midLine,
        suppressTransientWhileTyping: true,
      }).map((item) => item.id)
    ).not.toContain('bold-unclosed');

    expect(
      collectEntityNotesDiagnostics(line, {
        caretIndex: midLine,
        suppressTransientWhileTyping: false,
      }).map((item) => item.id)
    ).toContain('bold-unclosed');
  });

  it('detects ):* typo and fixes to ):**', () => {
    const sample = '- **Nhan:** [[A]] ([[B):*noi dung';
    const warning = collectEntityNotesDiagnostics(sample).find((item) => item.id === 'colon-star-typo');
    expect(warning).toBeTruthy();
    expect(applyEntityNotesDiagnosticFix(sample, warning)).toContain('):**');
  });

  it('does not count ** inside closed wiki links for bold balance', () => {
    expect(
      collectEntityNotesDiagnostics('Xem [[co ** trong]] o day.').map((item) => item.id)
    ).not.toContain('bold-unclosed');
  });

  it('fixAll closes bold and wiki on the same line only', () => {
    const input = '- **Mo dau\n## Khac\n[[wiki mo';
    const out = fixAllEntityNotesDiagnostics(input);
    expect(out).toBe('- **Mo dau**\n## Khac\n[[wiki mo]]');
  });
});
