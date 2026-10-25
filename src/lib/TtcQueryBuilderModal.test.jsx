import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/react';
import { TtcQueryBuilderModal } from './TtcQueryBuilderModal.jsx';

const novel = {
  tabsConfig: [{ id: 'lon-a', label: 'Mục A', subTabs: [{ id: 'nho-a', label: 'Nhóm A', fieldsTemplate: [] }] }],
  data: { 'lon-a': { 'nho-a': { entities: [{ id: '1', name: 'Alpha', dynamicData: {} }] } } },
};

describe('TtcQueryBuilderModal', () => {
  afterEach(() => cleanup());

  it('renders in a portal on document.body with header, footer, and scroll regions', () => {
    render(<TtcQueryBuilderModal activeNovelData={novel} onClose={() => {}} onInsert={() => {}} />);
    const footer = document.body.querySelector('.ttc-query-builder-footer');
    const body = document.body.querySelector('.ttc-query-builder-body');
    const dialog = document.body.querySelector('.ttc-query-builder-dialog');
    expect(footer).toBeTruthy();
    expect(body).toBeTruthy();
    expect(dialog).toBeTruthy();
    expect(document.body.querySelector('#ttc-query-builder-title')?.textContent).toContain('Tạo bảng dữ liệu');
  });

  it('inserts a ttc-query markdown block', () => {
    const onInsert = vi.fn();
    const view = render(<TtcQueryBuilderModal activeNovelData={novel} onClose={() => {}} onInsert={onInsert} />);
    fireEvent.click(view.getByRole('button', { name: 'Chèn bảng động' }));
    expect(onInsert).toHaveBeenCalledTimes(1);
    const markdown = onInsert.mock.calls[0][0];
    expect(markdown).toContain('```ttc-query');
    expect(markdown).toContain('VIEW TABLE');
    expect(markdown).toContain('SELECT entity');
    expect(markdown.includes('<table')).toBe(false);
  });

  it('keeps cancel and close from inserting, and disables insert without columns', () => {
    const onInsert = vi.fn();
    const onClose = vi.fn();
    render(<TtcQueryBuilderModal activeNovelData={novel} onClose={onClose} onInsert={onInsert} />);
    const cancel = [...document.body.querySelectorAll('button')].find((b) => b.textContent?.trim() === 'Hủy');
    const close = document.body.querySelector('[aria-label="Đóng"]');
    expect(cancel).toBeTruthy();
    expect(close).toBeTruthy();
    expect(document.body.querySelector('.ttc-query-builder-preview')).toBeTruthy();
    fireEvent.click(cancel);
    fireEvent.click(close);
    expect(onInsert).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(2);

    const entityBox = [...document.body.querySelectorAll('label')].find((l) => l.textContent?.includes('Thực thể'));
    fireEvent.click(entityBox.querySelector('input'));
    const insertBtn = [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Chèn bảng động'),
    );
    expect(insertBtn.disabled).toBe(true);
  });

  it('opens on the current subtab and uses folderPath ids with friendly labels', () => {
    const onInsert = vi.fn();
    const scoped = {
      tabsConfig: [
        {
          id: 'nhan-vat-trieu-hoan',
          label: 'Nhân Vật Triệu Hoán',
          subTabs: [
            {
              id: 'he-co-long',
              label: 'Hệ Cổ Long',
              fieldsTemplate: [
                { id: 'f_status', label: 'Phẩm cấp' },
                { id: 'f_to_chuc', label: 'Thế lực' },
              ],
            },
          ],
        },
      ],
      data: {
        'nhan-vat-trieu-hoan': {
          'he-co-long': { entities: [{ id: '1', name: 'Rồng', dynamicData: { f_alias: 'Long' } }] },
        },
      },
    };
    render(
      <TtcQueryBuilderModal
        activeNovelData={scoped}
        initialLonId="nhan-vat-trieu-hoan"
        initialNhoId="he-co-long"
        onClose={() => {}}
        onInsert={onInsert}
      />,
    );
    expect(document.body.querySelector('[aria-label="Phạm vi"]').value).toBe('nho:nhan-vat-trieu-hoan|he-co-long');
    expect(document.body.textContent).toContain('Phẩm cấp');
    expect(document.body.textContent).toContain('Thế lực');
    expect(document.body.textContent).toContain('Cột thường');
    expect(document.body.querySelector('details summary')?.textContent).toMatch(/Cột hệ thống nâng cao/);

    const aliasBox = [...document.body.querySelectorAll('label')].find((l) => l.textContent?.includes('Tên gọi khác'));
    if (aliasBox) fireEvent.click(aliasBox.querySelector('input'));
    const statusBox = [...document.body.querySelectorAll('label')].find((l) => l.textContent?.includes('Phẩm cấp'));
    fireEvent.click(statusBox.querySelector('input'));
    const insertBtn = [...document.body.querySelectorAll('button')].find(
      (b) => b.textContent?.includes('Chèn bảng động'),
    );
    fireEvent.click(insertBtn);
    const markdown = onInsert.mock.calls[0][0];
    expect(markdown).toContain('folderPath = "nhan-vat-trieu-hoan/he-co-long"');
    expect(markdown).toContain('f_status');
    expect(markdown.includes('Phẩm cấp')).toBe(false);
  });

  it('shows preview result counts and empty-column hint', () => {
    render(<TtcQueryBuilderModal activeNovelData={novel} onClose={() => {}} onInsert={() => {}} />);
    expect(document.body.textContent).toMatch(/\d+\/\d+ kết quả/);
    const entityBox = [...document.body.querySelectorAll('label')].find((l) => l.textContent?.includes('Thực thể'));
    fireEvent.click(entityBox.querySelector('input'));
    expect(document.body.textContent).toContain('Hãy chọn ít nhất một cột.');
  });
});

