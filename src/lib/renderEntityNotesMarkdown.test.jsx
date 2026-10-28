import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';
import { safeString } from '../MasterUtils.jsx';
import {
  buildEntityNotesPreviewModel,
  computeEntityNotesHeadingSectionCounts,
  renderEntityNotesMarkdown,
} from './renderEntityNotesMarkdown.jsx';
import { buildEntityLinkMap } from './buildEntityLinkMap.js';

describe('renderEntityNotesMarkdown', () => {
  it('renders long-form analysis blocks with stronger structure', () => {
    const sample = [
      'Mo dau dai ve [[Ton Canh]] va vi tri cua no trong boi canh lon.',
      'Dong nay noi tiep de doan mo dau du dai va duoc ghep lai thanh mot khoi.',
      '',
      '**1. Phan tang suc manh**',
      '',
      '- **So ky:** Ton Gia.',
      '- **Trung ky:** Dai Ton.',
      '',
      '### Ghi chu them',
      '',
      '---',
      '',
      '> Tong ket ngan',
    ].join('\n');

    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          sample,
          null,
          [{ id: 'entity-1', name: 'Ton Canh' }],
          null,
          vi.fn(),
        )}
      </div>
    );

    expect(container.textContent).toContain(
      'Mo dau dai ve Ton Canh va vi tri cua no trong boi canh lon. Dong nay noi tiep de doan mo dau du dai va duoc ghep lai thanh mot khoi.'
    );
    expect(container.querySelector('ul')).not.toBeNull();
    expect(container.querySelector('blockquote')).not.toBeNull();
    expect(container.querySelectorAll('h3').length).toBeGreaterThan(0);
    expect(container.querySelector('.bg-gradient-to-r')).not.toBeNull();
  });

  it('renders custom inline text colors from the notes toolbar markup', () => {
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          '[color=#ff88cc]Noi dung nhan mau[/color]',
          null,
          [],
          null,
          vi.fn(),
        )}
      </div>
    );

    const colored = container.querySelector('[style]');
    expect(colored).not.toBeNull();
    expect(colored?.textContent).toContain('Noi dung nhan mau');
    expect(colored?.style.color).toBe('rgb(255, 136, 204)');
  });

  it('renders strikethrough markup in preview mode', () => {
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          '~~Noi dung bi gach~~',
          null,
          [],
          null,
          vi.fn(),
        )}
      </div>
    );

    const deleted = container.querySelector('del');
    expect(deleted).not.toBeNull();
    expect(deleted?.textContent).toContain('Noi dung bi gach');
  });

  it('renders bold markup with neutral emphasis so it does not mimic wiki-link accent colors', () => {
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          'Noi dung co **Ton Luc** duoc nhan manh.',
          null,
          [],
          null,
          vi.fn(),
        )}
      </div>
    );

    const strong = container.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.className).toContain('text-inherit');
    expect(strong?.className).not.toContain('text-amber-400');
  });

  it('renders a wiki link nested inside bold without leaking [[ ]] or partial inner matches', () => {
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          '- **[[Dai Ton Dan]]** giup [[Dai Ton]] dot pha.',
          null,
          [
            { id: 'pill', name: 'Dai Ton Dan' },
            { id: 'realm', name: 'Dai Ton' },
          ],
          null,
          vi.fn(),
        )}
      </div>
    );

    expect(container.textContent).not.toContain('[[');
    expect(container.textContent).toContain('Dai Ton Dan');
    expect(container.textContent).toContain('Dai Ton');
    expect(container.querySelectorAll('.cursor-pointer').length).toBeGreaterThanOrEqual(2);
  });

  it('keeps an unresolved manual wiki link nested inside bold as one quick-create chip', () => {
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          '**[[Pha Ton Dan]]**',
          null,
          [{ id: 'realm', name: 'Ton Dan' }],
          null,
          vi.fn(),
        )}
      </div>
    );

    expect(container.textContent).not.toContain('[[');
    expect(container.textContent).toContain('Pha Ton Dan');
    expect(container.querySelector('.border-dashed')).not.toBeNull();
  });

  it('renders plain «Tên trường: giá trị» bullets with field label styling', () => {
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          '- Danh xung / Ten goi: Vo Gia',
          null,
          [],
          null,
          vi.fn(),
        )}
      </div>
    );
    const label = container.querySelector('[data-entity-field-label="true"]');
    expect(label?.textContent).toContain('Danh xung / Ten goi:');
    expect(label?.className).toContain('text-cyan-300');
  });

  it('renders lead labels inline in bullet items with bold label before colon', () => {
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          '- **Su dung bi phap quan the:** **Ton Luc** co the duoc dung.',
          null,
          [],
          null,
          vi.fn(),
        )}
      </div>
    );

    const leadLabel = container.querySelector('[data-entity-field-label="true"]');
    const leadRule = container.querySelector('[data-entity-lead-label-rule="true"]');
    const li = container.querySelector('li');

    expect(leadLabel).not.toBeNull();
    expect(leadLabel?.textContent).toContain('Su dung bi phap quan the:');
    expect(leadLabel?.className).toContain('font-bold');
    expect(leadLabel?.className).not.toContain('uppercase');
    expect(leadRule).toBeNull();
    expect(li?.textContent).toMatch(/Su dung bi phap quan the:.*Ton Luc/);
  });

  it('uses the same major heading color for every ## section', () => {
    const md = ['## Muc A', '', '- a', '## Muc B', '', '- b'].join('\n');
    const { container } = render(
      <div>{renderEntityNotesMarkdown(md, null, [], null, vi.fn())}</div>,
    );
    const h2 = [...container.querySelectorAll('h2')];
    expect(h2).toHaveLength(2);
    expect(h2[0].className).toBe(h2[1].className);
    expect(h2[0].className).toContain('text-violet-200');
  });

  it('styles wiki links differently from field labels in entity notes preview', () => {
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          '- **Danh xung:** [[Vo Gia]]',
          null,
          [{ id: 'e1', name: 'Vo Gia', dest: { entityId: 'e1' } }],
          null,
          vi.fn(),
          'other-id',
        )}
      </div>
    );

    const fieldLabel = container.querySelector('[data-entity-field-label="true"]');
    const wiki = container.querySelector('[data-entity-wiki-link="external"]');
    expect(fieldLabel?.className).toContain('text-cyan-300');
    const wikiLabel = wiki?.querySelector('span.font-bold');
    expect(wikiLabel?.className).toContain('text-violet-300');
    expect(wikiLabel?.className).not.toContain('text-emerald-300');
  });

  it('uses the same wiki chip for quoted plain names and [[wiki]] syntax', () => {
    const entityMap = [
      { id: 'hlm', name: 'Hồng Lâu Mộng', dest: { entityId: 'hlm' } },
      { id: 'hl', name: 'Hồng Lâu', dest: { entityId: 'hl' } },
    ];
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          [
            '- **Đối tượng:** thế giới "Hồng Lâu Mộng".',
            '- Phụ kiện [[Hồng Lâu Mộng]] và [[Hồng Lâu]].',
          ].join('\n'),
          null,
          entityMap,
          null,
          vi.fn(),
          'other-id',
        )}
      </div>
    );

    const chips = container.querySelectorAll('[data-entity-wiki-link="external"]');
    expect(chips.length).toBeGreaterThanOrEqual(2);
    const shell = chips[0]?.className || '';
    chips.forEach((chip) => {
      expect(chip.className).toContain('border-violet-400');
      expect(chip.className).toBe(shell);
    });
  });

  it('keeps alias wiki label in preview while resolving to canonical entity', () => {
    const novel = {
      tabsConfig: [{ id: 'lon', label: 'L', subTabs: [{ id: 'sub', label: 'S' }] }],
      data: {
        lon: {
          sub: {
            entities: [
              {
                id: 'entity-001',
                name: 'Tiểu Lý Phi Đao',
                dynamicData: { f_alias: 'A Phi, Phi Đao' },
              },
            ],
          },
        },
      },
    };
    const entityMap = buildEntityLinkMap(novel);
    const onNavigate = vi.fn();
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown('Nhan vat [[A Phi]] va [[Tiểu Lý Phi Đao]].', null, entityMap, null, onNavigate, 'entity-001')}
      </div>
    );

    expect(container.textContent).toContain('A Phi');
    expect(container.textContent).not.toMatch(/Tiểu Lý Phi Đao.*A Phi/);
    const selfLinks = container.querySelectorAll('[data-entity-wiki-link="self"]');
    expect(selfLinks.length).toBe(2);
    fireEvent.click(selfLinks[0]);
    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({ entityId: 'entity-001' }));
  });

  it('distinguishes self vs external wiki links on the same card', () => {
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          '- [[Ten The]] — [[The Khac]]',
          null,
          [
            { id: 'self-1', name: 'Ten The', dest: { entityId: 'self-1' } },
            { id: 'other-1', name: 'The Khac', dest: { entityId: 'other-1' } },
          ],
          null,
          vi.fn(),
          'self-1',
        )}
      </div>
    );

    const selfLink = container.querySelector('[data-entity-wiki-link="self"]');
    const externalLink = container.querySelector('[data-entity-wiki-link="external"]');
    expect(selfLink?.querySelector('span.font-bold')?.className).toContain('text-emerald-300');
    expect(selfLink?.className).toContain('border-emerald-400');
    expect(externalLink?.querySelector('span.font-bold')?.className).toContain('text-violet-300');
    expect(externalLink?.className).toContain('border-violet-400');
  });

  it('uses hierarchy colors for minor headings and field labels', () => {
    const md = ['## Muc', '', '### Tieu muc', '', '- **Nhan truong:** Gia tri'].join('\n');
    const { container } = render(
      <div>{renderEntityNotesMarkdown(md, null, [], null, vi.fn())}</div>,
    );
    expect(container.querySelector('h3')?.className).toContain('text-amber-200');
    expect(container.querySelector('[data-entity-field-label="true"]')?.className).toContain('text-cyan-300');
  });

  it('keeps [color] blocks intact in ordered list lines when values contain parentheses (address meta)', () => {
    const md = [
      '## Danh sach (1)',
      '',
      '1. [[Ten The]] [color=#e2e8f0]**Nhan - Gia tri (Cap 1 - 99)**[/color]',
    ].join('\n');
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(md, null, [{ id: 'e1', name: 'Ten The' }], null, vi.fn())}
      </div>,
    );
    expect(container.textContent).toContain('Gia tri (Cap 1 - 99)');
    expect(container.textContent).not.toContain('[/color]');
    expect(container.textContent).not.toContain('[color=');
  });

  it('applies distinct [color] for AUTO-style label vs bold value (strong inherits span color)', () => {
    const md =
      '1. [[X]] [color=#93c5fd]Nhan truong[/color] [color=#a8c0d8]-[/color] [color=#f8fafc]**Gia tri**[/color]';
    const { container } = render(
      <div>{renderEntityNotesMarkdown(md, null, [{ id: '1', name: 'X' }], null, vi.fn())}</div>,
    );
    const styles = [...container.querySelectorAll('[style]')].map((el) => safeString(el.getAttribute('style')));
    expect(styles.some((s) => s.includes('147, 197, 253'))).toBe(true);
    expect(styles.some((s) => s.includes('248, 250, 252'))).toBe(true);
  });

  it('builds TOC metadata and renders semantic callouts', () => {
    const model = buildEntityNotesPreviewModel(
      [
        '# Tieu de lon',
        '',
        '> [!WARNING] Canh bao',
        '> - Dieu can nho',
        '',
        '### Tieu muc',
      ].join('\n'),
      null,
      [],
      null,
      vi.fn(),
    );

    const { container } = render(<div>{model.blocks}</div>);

    expect(model.toc.map((item) => item.title)).toEqual(['Tieu de lon', 'Tieu muc']);
    expect(model.toc.map((item) => item.count ?? 0)).toEqual([0, 0]);
    expect(container.textContent).toContain('Canh bao');
    expect(container.textContent).toContain('Dieu can nho');
  });

  it('đếm mục danh sách theo tiêu đề cho TOC; không gắn (n) sau tiêu đề khi render', () => {
    const md = [
      '# Bang Thien',
      '## De Quoc',
      '- [[A]]',
      '- [[B]]',
      '## Gia Toc',
      '- [[C]]',
    ].join('\n');
    const lines = md.split('\n');
    const counts = computeEntityNotesHeadingSectionCounts(lines);
    expect(counts.get(1)).toBe(3);
    expect(counts.get(2)).toBe(2);
    expect(counts.get(5)).toBe(1);
    const model = buildEntityNotesPreviewModel(md, null, [], null, vi.fn());
    expect(model.toc.map((t) => [t.title, t.count])).toEqual([
      ['Bang Thien', 3],
      ['De Quoc', 2],
      ['Gia Toc', 1],
    ]);
    const { container } = render(<div>{model.blocks}</div>);
    expect(container.textContent).toContain('Bang Thien');
    const flat = container.textContent.replace(/\s+/g, ' ').trim();
    expect(flat).not.toMatch(/Bang Thien\s*\(\d+\)/);
    expect(flat).not.toMatch(/De Quoc\s*\(\d+\)/);
    expect(flat).not.toMatch(/Gia Toc\s*\(\d+\)/);
  });

  it('renders auto-sync footer quote as subtle footer note', () => {
    const sample = [
      '## AUTO',
      '',
      '> (Tự động cập nhật theo Thế Lực ↔ Bản đồ)',
    ].join('\n');
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          sample,
          null,
          [],
          null,
          vi.fn(),
        )}
      </div>
    );

    expect(container.querySelector('[data-auto-sync-footer="true"]')).not.toBeNull();
    expect(container.querySelector('blockquote')).toBeNull();
  });

  it('emphasizes colon values and parenthetical map meta without overriding wiki link chips', () => {
    const sample =
      '- Địa chỉ (chuỗi địa lý): Hạ Giới → [[Việt Long Tinh]]\n- [[Băng Thiên Đại Lục]] (Giới · Hạ Giới · [[Việt Long Tinh]] · Tinh Cầu)';
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          sample,
          null,
          [
            { id: 'e1', name: 'Việt Long Tinh' },
            { id: 'e2', name: 'Băng Thiên Đại Lục' },
          ],
          null,
          vi.fn(),
        )}
      </div>
    );

    const sky = container.querySelector('.text-sky-200\\/95');
    const violet = container.querySelector('.text-violet-200\\/90');
    expect(sky).not.toBeNull();
    expect(violet).not.toBeNull();
    const wikiSpans = container.querySelectorAll('[data-entity-wiki-link]');
    expect(wikiSpans.length).toBeGreaterThanOrEqual(2);
  });

  it('ordered list: renders [color]…[/color] with parentheses inside bold (AUTO danh sách meta)', () => {
    const md = [
      '## Danh sách (1)',
      '',
      '1. [[Lý Mộ]] • [color=#e2e8f0]**Bất Hủ Tiên Thần (Cấp 200 đến 499)**[/color]',
    ].join('\n');
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(md, null, [{ id: 'e', name: 'Lý Mộ' }], null, vi.fn())}
      </div>
    );

    expect(container.textContent).not.toContain('[color=');
    expect(container.textContent).not.toContain('[/color]');
    expect(container.textContent).toContain('Bất Hủ Tiên Thần');
    expect(container.textContent).toContain('Cấp 200 đến 499');
  });

  it('renders GFM markdown tables with alignment and wiki links', () => {
    const md = [
      '| Nhân vật | Cảnh giới |',
      '|:---|:---:|',
      '| **[[Tô Thần]]** | [[Luyện Khí]] |',
      '',
      '| Trái | Giữa | Phải |',
      '|---|:---:|---:|',
      '| A | B | C |',
    ].join('\n');
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          md,
          null,
          [
            { id: 'e1', name: 'Tô Thần' },
            { id: 'e2', name: 'Luyện Khí' },
          ],
          null,
          vi.fn(),
        )}
      </div>
    );

    const tables = container.querySelectorAll('.entity-notes-md-table');
    expect(tables.length).toBe(2);
    expect(container.querySelectorAll('th').length).toBeGreaterThanOrEqual(5);
    expect(container.querySelectorAll('[data-entity-wiki-link]').length).toBeGreaterThanOrEqual(2);
    expect(container.textContent).toContain('Tô Thần');
    expect(container.textContent).toContain('Luyện Khí');
  });

  it('renders escaped pipe inside table cell', () => {
    const md = ['| Nội dung |', '|---|', '| A \\| B |'].join('\n');
    const { container } = render(
      <div>{renderEntityNotesMarkdown(md, null, [], null, vi.fn())}</div>
    );
    expect(container.querySelector('.entity-notes-md-table')).not.toBeNull();
    expect(container.textContent).toContain('A | B');
  });

  it('keeps markdown table lines inside fenced code as plain code', () => {
    const md = ['```', '| A | B |', '|---|---|', '```'].join('\n');
    const { container } = render(
      <div>{renderEntityNotesMarkdown(md, null, [], null, vi.fn())}</div>
    );
    expect(container.querySelector('.entity-notes-md-table')).toBeNull();
    expect(container.querySelector('pre code')?.textContent).toContain('| A | B |');
  });

  it('pads short table rows to header column count', () => {
    const md = ['| A | B | C |', '|---|---|---|', '| 1 | 2 |'].join('\n');
    const { container } = render(
      <div>{renderEntityNotesMarkdown(md, null, [], null, vi.fn())}</div>
    );
    const cells = container.querySelectorAll('tbody tr:first-child td');
    expect(cells.length).toBe(3);
  });

  it('shows safe pending wiki chip for unknown entity in table', () => {
    const md = ['| X |', '|---|', '| [[Khong Ton Tai]] |'].join('\n');
    const { container } = render(
      <div>{renderEntityNotesMarkdown(md, null, [], null, vi.fn())}</div>
    );
    expect(container.querySelector('[data-entity-wiki-link="pending"]')).not.toBeNull();
  });

  it('renders Obsidian-style info callout with icon and nested table', () => {
    const md = [
      '> [!info] Tiêu đề bảng',
      '> | Cột | Giá trị |',
      '> |---|---|',
      '> | [[A]] | 100 |',
    ].join('\n');
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(md, null, [{ id: '1', name: 'A' }], null, vi.fn())}
      </div>
    );
    expect(container.textContent).toContain('Tiêu đề bảng');
    expect(container.querySelector('section .entity-notes-md-table')).not.toBeNull();
    expect(container.querySelector('section svg')).not.toBeNull();
  });

  it('keeps plain blockquote when line is not a callout marker', () => {
    const md = '> Tong ket ngan gon';
    const { container } = render(
      <div>{renderEntityNotesMarkdown(md, null, [], null, vi.fn())}</div>
    );
    expect(container.querySelector('blockquote')).not.toBeNull();
    expect(container.querySelector('section')).toBeNull();
  });

  it('marks wide tables for horizontal scroll layout', () => {
    const header = Array.from({ length: 16 }, (_, i) => `C${i + 1}`).join(' | ');
    const sep = Array.from({ length: 16 }, () => '---').join('|');
    const row = Array.from({ length: 16 }, (_, i) => String(i)).join(' | ');
    const md = [`| ${header} |`, `|${sep}|`, `| ${row} |`].join('\n');
    const { container } = render(
      <div>{renderEntityNotesMarkdown(md, null, [], null, vi.fn())}</div>
    );
    expect(container.querySelector('.entity-notes-md-table[data-wide="true"]')).not.toBeNull();
  });

  it('pending wiki-link uses accessible label and opens QUICK_CREATE on click', () => {
    const onNavigate = vi.fn();
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown('Xem [[Triệu Hoán Không Gian]]', null, [], null, onNavigate)}
      </div>
    );
    const pending = container.querySelector('[data-entity-wiki-link="pending"]');
    expect(pending).not.toBeNull();
    expect(pending?.getAttribute('aria-label')).toBe('Tạo ghi chú cho Triệu Hoán Không Gian');
    expect(pending?.className).toContain('wiki-link--missing');
    expect(pending?.textContent).toContain('Triệu Hoán Không Gian');
    expect(pending?.textContent).not.toMatch(/^\+\s/);
    fireEvent.click(pending);
    expect(onNavigate).toHaveBeenCalledWith({
      type: 'QUICK_CREATE',
      name: 'Triệu Hoán Không Gian',
    });
  });

  it('renders pending and existing wiki links in the same table row', () => {
    const md = [
      '| Entity chưa tồn tại | Entity đã tồn tại |',
      '|---|---|',
      '| [[Entity Mới]] | [[Entity Đã Có]] |',
    ].join('\n');
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(
          md,
          null,
          [{ id: 'e2', name: 'Entity Đã Có' }],
          null,
          vi.fn(),
        )}
      </div>
    );
    expect(container.querySelector('[data-entity-wiki-link="pending"]')).not.toBeNull();
    expect(container.querySelector('[data-entity-wiki-link="external"]')).not.toBeNull();
  });

  it('wiki chips in table are keyboard-focusable', () => {
    const md = ['| X |', '|---|---|', '| [[Ton Canh]] |'].join('\n');
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(md, null, [{ id: 'e', name: 'Ton Canh' }], null, vi.fn())}
      </div>
    );
    const chip = container.querySelector('[data-entity-wiki-link="external"]');
    expect(chip?.getAttribute('tabindex')).toBe('0');
    expect(chip?.className).toContain('tt-kbd-focus');
  });

  it('renders ttc-query block as dynamic table with wiki entity links', () => {
    const novel = {
      data: {
        'do-thi-nhan-vat': {
          hero: {
            entities: [{ id: 'c1', name: 'Ton Canh', dynamicData: { f_level: '9' } }],
          },
        },
      },
    };
    const md = [
      '```ttc-query',
      'VIEW TABLE',
      'FROM entity',
      'SELECT entity, f_level',
      '```',
    ].join('\n');
    const entityMap = [{ id: 'c1', name: 'Ton Canh', dest: { entityId: 'c1', lonId: 'do-thi-nhan-vat', nhoId: 'hero' } }];
    const { container } = render(
      <div>
        {renderEntityNotesMarkdown(md, null, entityMap, null, vi.fn(), null, null, { activeNovelData: novel })}
      </div>,
    );
    expect(container.querySelector('[data-ttc-query-view="table"]')).not.toBeNull();
    expect(container.querySelector('[data-entity-wiki-link]')).not.toBeNull();
    expect(container.textContent).toContain('9');
  });

  it('renders edit-table control when onEditMarkdownTable is provided', () => {
    const md = ['| A | B |', '|---|---|', '| 1 | [[Wiki]] |'].join('\n');
    const onEdit = vi.fn();
    const model = buildEntityNotesPreviewModel(md, null, [], null, vi.fn(), null, {
      onEditMarkdownTable: onEdit,
    });
    const { container } = render(<div>{model.blocks}</div>);
    const btn = container.querySelector('[data-testid="edit-md-table-0"]');
    expect(btn).not.toBeNull();
    expect(btn?.getAttribute('aria-label')).toBe('Chỉnh sửa bảng');
    expect(btn?.getAttribute('title')).toBe('Chỉnh sửa bảng Markdown');
    expect(btn?.textContent).toContain('Chỉnh sửa bảng');
    const toolbar = container.querySelector('.entity-notes-md-table-edit-toolbar');
    expect(toolbar).not.toBeNull();
    expect(toolbar?.contains(btn)).toBe(true);
    expect(container.querySelector('thead')?.contains(btn)).toBe(false);
    expect(container.querySelector('.entity-notes-md-table-scroll')?.contains(container.querySelector('table'))).toBe(
      true,
    );
    fireEvent.click(btn);
    expect(onEdit).toHaveBeenCalledWith(0);
  });

  it('omits edit-table control when callback is missing', () => {
    const md = ['| A |', '|---|', '| 1 |'].join('\n');
    const model = buildEntityNotesPreviewModel(md, null, [], null, vi.fn());
    const { container } = render(<div>{model.blocks}</div>);
    expect(container.querySelector('[data-testid^="edit-md-table-"]')).toBeNull();
  });

  it('assigns distinct edit-table test ids for multiple GFM tables', () => {
    const md = ['| T1 |', '|---|', '| a |', '', '| T2 |', '|---|', '| b |'].join('\n');
    const onEdit = vi.fn();
    const model = buildEntityNotesPreviewModel(md, null, [], null, vi.fn(), null, {
      onEditMarkdownTable: onEdit,
    });
    const { container } = render(<div>{model.blocks}</div>);
    fireEvent.click(container.querySelector('[data-testid="edit-md-table-0"]'));
    expect(onEdit).toHaveBeenLastCalledWith(0);
    fireEvent.click(container.querySelector('[data-testid="edit-md-table-1"]'));
    expect(onEdit).toHaveBeenLastCalledWith(1);
  });

  it('does not add edit-table control for ttc-query table blocks', () => {
    const novel = {
      data: {
        tab: { sub: { entities: [{ id: 'e1', name: 'A', dynamicData: { f_x: '1' } }] } },
      },
    };
    const md = ['```ttc-query', 'VIEW TABLE', 'FROM entity', 'SELECT entity, f_x', '```'].join('\n');
    const model = buildEntityNotesPreviewModel(md, null, [], null, vi.fn(), null, {
      activeNovelData: novel,
      onEditMarkdownTable: vi.fn(),
    });
    const { container } = render(<div>{model.blocks}</div>);
    expect(container.querySelector('[data-testid^="edit-md-table-"]')).toBeNull();
  });

  it('keeps edit-table button focusable for keyboard users', () => {
    const md = ['| A |', '|---|', '| 1 |'].join('\n');
    const model = buildEntityNotesPreviewModel(md, null, [], null, vi.fn(), null, {
      onEditMarkdownTable: vi.fn(),
    });
    const { container } = render(<div>{model.blocks}</div>);
    const btn = container.querySelector('[data-testid="edit-md-table-0"]');
    btn?.focus();
    expect(document.activeElement).toBe(btn);
    expect(container.querySelector('.entity-notes-md-table-edit-toolbar')?.className).toContain(
      'group-focus-within:opacity-100',
    );
  });
});
