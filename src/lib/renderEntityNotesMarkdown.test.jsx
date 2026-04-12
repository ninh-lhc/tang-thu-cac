import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { buildEntityNotesPreviewModel, renderEntityNotesMarkdown } from './renderEntityNotesMarkdown.jsx';

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
    expect(container.textContent).toContain('Canh bao');
    expect(container.textContent).toContain('Dieu can nho');
  });
});
