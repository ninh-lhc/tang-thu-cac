import { describe, expect, it } from 'vitest';
import {
  buildEntityNotesEditorHighlightHtml,
  escapeEntityNotesEditorPlainHtml,
} from './entityNotesEditorWikiHighlight.js';

describe('buildEntityNotesEditorHighlightHtml', () => {
  it('wraps resolved wiki links without font-bold (caret-safe)', () => {
    const html = buildEntityNotesEditorHighlightHtml('Gap [[Ngo Tri]] o day.');
    expect(html).toContain('<span class="text-amber-300">[[Ngo Tri]]</span>');
    expect(html).not.toContain('font-bold');
    expect(html).toContain('Gap ');
  });

  it('highlights resolved external wiki links in violet when entityMap matches', () => {
    const html = buildEntityNotesEditorHighlightHtml('[[Vo Gia]]', {
      entityMap: [{ id: 'e1', name: 'Vo Gia', dest: { entityId: 'e1' } }],
    });
    expect(html).toContain('text-violet-300');
    expect(html).not.toContain('font-bold');
  });

  it('plain text without brackets stays unwrapped', () => {
    const html = buildEntityNotesEditorHighlightHtml('Chi la text thuong.');
    expect(html).not.toContain('<span');
  });

  it('escapeEntityNotesEditorPlainHtml escapes without wiki spans', () => {
    const text = 'Dong 1\nDong 2 & giữ [[literal]]';
    expect(escapeEntityNotesEditorPlainHtml(text)).toBe(
      'Dong 1\nDong 2 &amp; giữ [[literal]]'
    );
  });

  it('does not match [[ on one line to ]] on another line', () => {
    const html = buildEntityNotesEditorHighlightHtml('[[Mo dau\nKet]]');
    expect(html).toContain('[[Mo dau');
    expect(html).not.toContain('<span');
    expect(html).not.toMatch(/\[\[Mo dau[\s\S]*Ket\]\]<\/span>/);
  });

  it('leaves unclosed [[ as plain text so the caret stays aligned', () => {
    const html = buildEntityNotesEditorHighlightHtml('- **[[Hư Không]] ([[Chí Cao');
    expect(html).toContain('[[Chí Cao');
    expect(html).not.toMatch(/\[\[Chí Cao<\/span>/);
    expect(html).toContain('<span class="text-amber-300">[[Hư Không]]</span>');
  });
});
