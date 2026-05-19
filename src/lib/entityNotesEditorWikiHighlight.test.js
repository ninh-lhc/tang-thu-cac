import { describe, expect, it } from 'vitest';
import { buildEntityNotesEditorHighlightHtml } from './entityNotesEditorWikiHighlight.js';

describe('buildEntityNotesEditorHighlightHtml', () => {
  it('wraps unresolved wiki links with amber highlight', () => {
    const html = buildEntityNotesEditorHighlightHtml('Gap [[Ngo Tri]] o day.');
    expect(html).toContain('<span class="text-amber-300 font-bold">[[Ngo Tri]]</span>');
    expect(html).toContain('Gap ');
  });

  it('highlights resolved external wiki links in violet when entityMap matches', () => {
    const html = buildEntityNotesEditorHighlightHtml('[[Vo Gia]]', {
      entityMap: [{ id: 'e1', name: 'Vo Gia', dest: { entityId: 'e1' } }],
    });
    expect(html).toContain('text-violet-300 font-bold');
  });

  it('plain text without brackets stays unwrapped', () => {
    const html = buildEntityNotesEditorHighlightHtml('Chi la text thuong.');
    expect(html).not.toContain('<span');
  });
});
