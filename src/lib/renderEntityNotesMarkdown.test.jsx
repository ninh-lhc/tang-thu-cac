import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { safeString } from '../MasterUtils.jsx';
import {
  buildEntityNotesPreviewModel,
  computeEntityNotesHeadingSectionCounts,
  renderEntityNotesMarkdown,
} from './renderEntityNotesMarkdown.jsx';

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
    expect(wiki?.className).toContain('text-orange-300');
    expect(wiki?.className).not.toContain('text-cyan-300');
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
    expect(selfLink?.className).toContain('text-emerald-300');
    expect(externalLink?.className).toContain('text-orange-300');
    expect(selfLink?.className).not.toContain('text-violet-200');
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
});
