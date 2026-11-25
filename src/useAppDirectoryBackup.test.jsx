/**
 * Kiểm tra luồng chọn thư mục lưu truyện.
 * Mô phỏng File System Access API để kiểm tra phục hồi danh mục.
 */
// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useAppDirectoryBackup } from './useAppDirectoryBackup.js';
import { savePersistedDirectoryHandle } from './lib/directoryHandleStore.js';

vi.mock('./lib/directoryHandleStore.js', () => ({
  clearPersistedDirectoryHandle: vi.fn(),
  savePersistedDirectoryHandle: vi.fn(),
}));

afterEach(() => vi.unstubAllGlobals());

function setup(files) {
  function entries(children) {
    return Object.entries(children).map(([name, value]) => [
      name,
      typeof value === 'string'
        ? { kind: 'file', getFile: async () => ({ text: async () => value }) }
        : { kind: 'directory', entries: () => entries(value) },
    ]);
  }
  const folder = {
    entries: () => entries(files),
    async getFileHandle(name) {
      if (!Object.hasOwn(files, name)) throw new DOMException('', 'NotFoundError');
      return { getFile: async () => ({ text: async () => files[name] }) };
    },
  };
  vi.stubGlobal('showDirectoryPicker', async () => folder);
  const props = {
    novelStatsByIdRef: { current: {} },
    genreTabsTemplatesRef: { current: {} },
    resolveSafeTabsConfig: (config) => config,
    setActiveNovelData: vi.fn(),
    setActiveNovelDirHandle: vi.fn(),
    setDirHandle: vi.fn(),
    setGenreTabsTemplates: vi.fn(),
    setGlobalTabsConfig: vi.fn(),
    setNovelStatsById: vi.fn(),
    setNovelsMetadata: vi.fn(),
    showToast: vi.fn(),
    syncIndex: vi.fn(),
  };
  const { result } = renderHook(() => useAppDirectoryBackup(props));
  return { props, folder, connect: () => act(() => result.current.handleConnectFolder()) };
}

it('nạp truyện từ danh mục dự phòng khi index chính bị hỏng', async () => {
  const { props, folder, connect } = setup({
    'index.json': '{',
    'index.backup.json': JSON.stringify({ metadata: [{ id: 'n1', title: 'Truyện cũ' }] }),
  });
  await connect();
  expect(props.setNovelsMetadata).toHaveBeenCalledWith([
    expect.objectContaining({ id: 'n1', title: 'Truyện cũ' }),
  ]);
  expect(savePersistedDirectoryHandle).toHaveBeenCalledWith(folder);
});

it('dựng lại danh mục rỗng từ file truyện trong thư mục con', async () => {
  const novel = { id: 'n1', title: 'Truyện cũ', storageLayout: 'sharded' };
  const { props, folder, connect } = setup({
    'index.json': JSON.stringify({ metadata: [] }),
    'index.backup.json': JSON.stringify({ metadata: [] }),
    'Tên thư mục': {
      'Tên thư mục.backup-PC.json': JSON.stringify({ ...novel, title: 'Bản cũ' }),
      'Tên thư mục.json': JSON.stringify(novel),
    },
    'Calibre Library': { 'metadata.json': JSON.stringify({ id: 'foreign', title: 'Other' }) },
  });
  await connect();
  expect(props.setNovelsMetadata).toHaveBeenCalledWith([
    expect.objectContaining({ id: 'n1', title: 'Truyện cũ', folderName: 'Tên thư mục' }),
  ]);
  expect(props.setDirHandle).toHaveBeenCalledWith(folder);
});

it('báo lỗi khi danh mục hỏng và không có bản phục hồi', async () => {
  const { props, connect } = setup({ 'index.json': '{}' });
  await connect();
  expect(props.showToast).toHaveBeenCalledWith(expect.any(String), 'error');
  expect(props.setDirHandle).not.toHaveBeenCalled();
  expect(props.syncIndex).not.toHaveBeenCalled();
});
