import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { splitNoteAroundCollectionAutoBlock, COLLECTION_AUTO_LIST_TITLE } from './collectionListCardSync.js';
import { buildEntityCollectionViewModel } from './buildEntityCollectionViewModel.js';
import { EntityAutoView } from '../EntityAutoView.jsx';

const mk = (id, name, extra = {}) => ({
  id,
  name,
  dynamicData: {},
  milestones: [],
  ...extra,
});

describe('splitNoteAroundCollectionAutoBlock', () => {
  it('splits around title block and keeps user text outside', () => {
    const auto = `${COLLECTION_AUTO_LIST_TITLE}\n\n- Tổng số thẻ: 2\n\n1. [[A]]`;
    const text = `Intro\n\n${auto}\n\nTail`;
    const parts = splitNoteAroundCollectionAutoBlock(text);
    expect(parts.hasAutoBlock).toBe(true);
    expect(parts.before.trim()).toBe('Intro');
    expect(parts.after.trim()).toBe('Tail');
    expect(parts.before).not.toContain('[[A]]');
  });
});

describe('EntityAutoView', () => {
  const wikiContext = {
    dirHandle: null,
    lookup: new Map(),
    linkRegex: /\[\[(.+?)\]\]/g,
    onNavigate: () => {},
    selfEntityId: 'x',
  };

  it('renders list rows from view-model', () => {
    const vm = buildEntityCollectionViewModel({
      allEntities: [mk('1', 'Alpha'), mk('2', 'Beta')],
      filteredEntities: [mk('1', 'Alpha'), mk('2', 'Beta')],
      columns: ['entity', 'displayString'],
      columnMetaById: new Map([
        ['entity', { label: 'Thực thể' }],
        ['displayString', { label: 'Chuỗi hiển thị' }],
      ]),
      page: 1,
      pageSize: 12,
    });
    render(<EntityAutoView viewModel={vm} listViewMode="list" wikiContext={wikiContext} />);
    expect(screen.getByText(/Tổng số thẻ: 2/)).toBeTruthy();
    expect(screen.getByText('1.')).toBeTruthy();
  });

  it('renders table when mode is table', () => {
    const vm = buildEntityCollectionViewModel({
      allEntities: [mk('1', 'Alpha', { dynamicData: { f_alias: 'A1' } })],
      filteredEntities: [mk('1', 'Alpha', { dynamicData: { f_alias: 'A1' } })],
      columns: ['entity', 'f_alias'],
      columnMetaById: new Map([
        ['entity', { label: 'Thực thể' }],
        ['f_alias', { label: 'Tên gọi khác' }],
      ]),
      page: 1,
      pageSize: 12,
    });
    const { container } = render(
      <EntityAutoView viewModel={vm} listViewMode="table" wikiContext={wikiContext} />,
    );
    expect(container.querySelector('[data-ttc-auto-list="dynamic"] table')).toBeTruthy();
    expect(screen.getByText('STT')).toBeTruthy();
    expect(screen.getByText('A1')).toBeTruthy();
  });

  it('does not render more rows than pageSize', () => {
    const all = Array.from({ length: 20 }, (_, i) => mk(`e${i}`, `E${i}`));
    const vm = buildEntityCollectionViewModel({
      allEntities: all,
      filteredEntities: all,
      columns: ['entity'],
      page: 1,
      pageSize: 12,
    });
    render(<EntityAutoView viewModel={vm} listViewMode="list" wikiContext={wikiContext} />);
    expect(screen.getAllByText(/\./).length).toBeGreaterThan(0);
    expect(vm.rows).toHaveLength(12);
  });

  const thirty = () => Array.from({ length: 30 }, (_, i) => mk(`e${i}`, `Entity ${i + 1}`));

  it('shows pagination controls when pageCount > 1', () => {
    const all = thirty();
    const vm = buildEntityCollectionViewModel({
      allEntities: all,
      filteredEntities: all,
      columns: ['entity'],
      page: 1,
      pageSize: 12,
    });
    const { container } = render(
      <EntityAutoView viewModel={vm} listViewMode="table" wikiContext={wikiContext} setEntityPage={() => {}} />,
    );
    const nav = within(container.querySelector('[data-ttc-auto-list="dynamic"]'));
    expect(nav.getByRole('button', { name: 'Trang trước' })).toBeTruthy();
    expect(nav.getByRole('button', { name: 'Trang 3' })).toBeTruthy();
    expect(vm.pageCount).toBe(3);
  });

  it('page 2 list STT starts at 13', () => {
    const all = thirty();
    const vm = buildEntityCollectionViewModel({
      allEntities: all,
      filteredEntities: all,
      columns: ['entity'],
      page: 2,
      pageSize: 12,
    });
    render(<EntityAutoView viewModel={vm} listViewMode="list" wikiContext={wikiContext} />);
    expect(screen.getByText('13.')).toBeTruthy();
    expect(vm.rows).toHaveLength(12);
  });

  it('page 3 has 6 rows and STT 25', () => {
    const all = thirty();
    const vm = buildEntityCollectionViewModel({
      allEntities: all,
      filteredEntities: all,
      columns: ['entity'],
      page: 3,
      pageSize: 12,
    });
    const { container } = render(
      <EntityAutoView viewModel={vm} listViewMode="table" wikiContext={wikiContext} />,
    );
    expect(vm.rows).toHaveLength(6);
    const table = container.querySelector('[data-ttc-auto-list="dynamic"] table');
    const firstStt = within(table).getAllByRole('cell')[0];
    expect(firstStt.textContent).toBe('25');
  });

  it('invokes setEntityPage when clicking page 2', async () => {
    const user = userEvent.setup();
    const setPage = vi.fn();
    const all = thirty();
    const vm = buildEntityCollectionViewModel({
      allEntities: all,
      filteredEntities: all,
      columns: ['entity'],
      page: 1,
      pageSize: 12,
    });
    const { container } = render(
      <EntityAutoView viewModel={vm} listViewMode="list" wikiContext={wikiContext} setEntityPage={setPage} />,
    );
    const nav = within(container.querySelector('[data-ttc-auto-list="dynamic"]'));
    await user.click(nav.getByRole('button', { name: 'Trang 2' }));
    expect(setPage).toHaveBeenCalledWith(2);
  });
});
