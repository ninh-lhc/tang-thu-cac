import { describe, expect, it } from 'vitest';
import { buildEntityNotesEditorHighlightHtml } from './entityNotesEditorWikiHighlight.js';

describe('buildEntityNotesEditorHighlightHtml', () => {
  it('wraps wiki links with bold highlight class', () => {
    const html = buildEntityNotesEditorHighlightHtml('Gap [[Ngo Tri]] o day.');
    expect(html).toContain('<span class="text-violet-300 font-bold">[[Ngo Tri]]</span>');
    expect(html).toContain('Gap ');
  });

  it('highlights multiple wiki links in one line', () => {
    const html = buildEntityNotesEditorHighlightHtml('[[A]] va [[B]]');
    expect(html.match(/text-violet-300 font-bold/g)?.length).toBe(2);
  });

  it('plain text without brackets stays unwrapped', () => {
    const html = buildEntityNotesEditorHighlightHtml('Chi la text thuong.');
    expect(html).not.toContain('<span');
  });
});
