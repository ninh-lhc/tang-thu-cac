import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { renderEntityNotesMarkdown } from './renderEntityNotesMarkdown.jsx';
import { buildEntityLinkMap } from './buildEntityLinkMap.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const queryBlock = [
  '```ttc-query',
  'VIEW TABLE',
  'FROM entity',
  'SELECT entity',
  '```',
].join('\n');

const badQueryBlock = [
  '```ttc-query',
  'VIEW TABLE',
  'FROM entity',
  'SORT f_missing ASC',
  'SELECT entity',
  '```',
].join('\n');

function novelWith(ent) {
  return {
    data: { lon: { nho: { entities: [ent] } } },
  };
}

describe('ttcQuery integration', () => {
  it('plain code fence is not executed as ttc-query', () => {
    const md = ['```javascript', 'VIEW TABLE', '```'].join('\n');
    const { container } = render(
      <div>{renderEntityNotesMarkdown(md, null, [], null, vi.fn())}</div>,
    );
    expect(container.querySelector('[data-ttc-query-view]')).toBeNull();
    expect(container.querySelector('pre code')?.textContent).toContain('VIEW TABLE');
  });

  it('renders query inside paragraph context and beside table/callout', () => {
    const md = [
      'Doan van truoc query.',
      '',
      queryBlock,
      '',
      '| A | B |',
      '|---|---|',
      '| 1 | 2 |',
      '',
      '> [!INFO] Callout',
      '> Noi dung callout',
    ].join('\n');
    const novel = novelWith({ id: 'e1', name: 'Ton Canh', dynamicData: { f_level: '9' } });
    const entityMap = buildEntityLinkMap(novel);
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(md, null, entityMap, null, vi.fn(), null, null, {
          activeNovelData: novel,
        })}
      </div>,
    );
    expect(container.textContent).toContain('Doan van truoc query');
    expect(container.querySelector('[data-ttc-query-view="table"]')).not.toBeNull();
    expect(container.querySelector('.entity-notes-md-table')).not.toBeNull();
    expect(container.textContent).toContain('Callout');
  });

  it('error block is local and does not break surrounding preview', () => {
    const md = ['Truoc loi.', '', badQueryBlock, '', 'Sau loi.'].join('\n');
    const novel = novelWith({ id: 'e1', name: 'X', dynamicData: {} });
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(md, null, buildEntityLinkMap(novel), null, vi.fn(), null, null, {
          activeNovelData: novel,
        })}
      </div>,
    );
    expect(container.querySelector('[data-ttc-query-error="true"]')).not.toBeNull();
    expect(container.textContent).toContain('Truoc loi');
    expect(container.textContent).toContain('Sau loi');
  });

  it('shows no_match block for valid query with zero rows', () => {
    const md = [
      '```ttc-query',
      'VIEW LIST',
      'FROM entity',
      'WHERE id = "missing-id-xyz"',
      'SELECT entity',
      '```',
    ].join('\n');
    const novel = novelWith({ id: 'e1', name: 'X', dynamicData: {} });
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(md, null, buildEntityLinkMap(novel), null, vi.fn(), null, null, {
          activeNovelData: novel,
        })}
      </div>,
    );
    expect(container.querySelector('[data-ttc-query-error="true"]')).toBeNull();
    expect(container.querySelector('[data-ttc-query-status="no_match"]')).not.toBeNull();
  });

  it('wiki entity column: self cyan, external violet, pending plus', () => {
    const novel = {
      data: {
        lon: {
          nho: {
            entities: [
              { id: 'self-1', name: 'Self Ent', dynamicData: {} },
              { id: 'ext-1', name: 'Ext Ent', dynamicData: {} },
            ],
          },
        },
      },
    };
    const entityMap = buildEntityLinkMap(novel);
    const md = [
      '```ttc-query',
      'VIEW TABLE',
      'FROM entity',
      'SELECT entity',
      '```',
    ].join('\n');
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(md, null, entityMap, null, vi.fn(), 'self-1', null, {
          activeNovelData: novel,
        })}
      </div>,
    );
    expect(container.querySelector('[data-entity-wiki-link="self"]')).not.toBeNull();
    expect(container.querySelector('[data-entity-wiki-link="external"]')).not.toBeNull();

    const pendingMd = [
      '```ttc-query',
      'VIEW LIST',
      'FROM entity',
      'SELECT entity',
      '```',
    ].join('\n');
    const pendingNovel = novelWith({ id: 'p1', name: 'Chua Co Trong Map', dynamicData: {} });
    const pendingRender = render(
      <div>
        {renderEntityNotesMarkdown(pendingMd, null, [], null, vi.fn(), null, null, {
          activeNovelData: pendingNovel,
        })}
      </div>,
    );
    expect(pendingRender.container.querySelector('[data-entity-wiki-link="pending"]')).not.toBeNull();
  });

  it('click wiki in query navigates to entity id', () => {
    const novel = novelWith({ id: 'entity-001', name: 'Ton Canh', dynamicData: { f_level: '1' } });
    const entityMap = buildEntityLinkMap(novel);
    const onNavigate = vi.fn();
    const md = queryBlock;
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(md, null, entityMap, null, onNavigate, null, null, {
          activeNovelData: novel,
        })}
      </div>,
    );
    const chip = container.querySelector('[data-entity-wiki-link="external"]');
    fireEvent.click(chip);
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'entity-001' }));
  });

  it('editor source module does not import ttc-query engine', () => {
    const editorPath = path.join(__dirname, '..', 'EntityNotesHighlightedEditor.jsx');
    const src = readFileSync(editorPath, 'utf8');
    expect(src.includes('ttcQuery')).toBe(false);
    expect(src.includes('TtcQuery')).toBe(false);
  });

  it('long notes with query still preserve fence source in markdown string', () => {
    const long = `${'Dong dai.\n'.repeat(40)}${queryBlock}\n${'Cuoi.\n'.repeat(10)}`;
    expect(long).toContain('```ttc-query');
    expect(long).toContain('VIEW TABLE');
    const novel = novelWith({ id: 'e1', name: 'A', dynamicData: {} });
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(long, null, buildEntityLinkMap(novel), null, vi.fn(), null, null, {
          activeNovelData: novel,
        })}
      </div>,
    );
    expect(container.querySelector('[data-ttc-query-view]')).not.toBeNull();
    expect(long).toContain('```ttc-query');
  });
});
