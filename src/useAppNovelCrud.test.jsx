/**
 * Kiểm tra thứ tự lưu dữ liệu truyện và danh mục khi tạo truyện.
 * Dùng hook qua các thao tác mở form và bấm lưu.
 */
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { useAppNovelCrud } from './useAppNovelCrud.js';

function setup(syncNovel) {
  const props = {
    initialTabsConfig: [],
    generateId: () => 'novel-new',
    novelsMetadataRef: { current: [] },
    novelStatsByIdRef: { current: {} },
    syncNovel,
    syncIndex: vi.fn(async () => ({ ok: true })),
    showToast: vi.fn(),
    setNovelStatsById: vi.fn(),
    setNovelsMetadata: vi.fn(),
    setActiveNovelData: vi.fn(),
    setActiveNovelDirHandle: vi.fn(),
    setMenu1Visible: vi.fn(),
    setActiveTabLon: vi.fn(),
    setActiveTabNho: vi.fn(),
    setActiveTabCon: vi.fn(),
  };
  const { result } = renderHook(() => useAppNovelCrud(props));
  act(() => result.current.handleOpenCreateNovel());
  act(() => result.current.setNovelForm((form) => ({ ...form, title: 'Truyện mới' })));
  return { props, result, save: () => act(() => result.current.handleSaveNovelModal()) };
}

it('ghi truyện trước khi đưa truyện vào danh mục', async () => {
  const syncNovel = vi.fn(async () => ({ ok: true }));
  const { props, save } = setup(syncNovel);
  await save();
  expect(syncNovel.mock.invocationCallOrder[0]).toBeLessThan(
    props.syncIndex.mock.invocationCallOrder[0],
  );
  expect(props.novelsMetadataRef.current).toEqual([expect.objectContaining({ id: 'novel-new' })]);
});

it('giữ form để thử lại khi không ghi được truyện', async () => {
  const { props, result, save } = setup(vi.fn(async () => ({ ok: false })));
  await save();
  expect(result.current.isAddNovelOpen).toBe(true);
  expect(props.syncIndex).not.toHaveBeenCalled();
  expect(props.setNovelsMetadata).not.toHaveBeenCalled();
});
