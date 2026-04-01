// Hook gom orchestration modal + command palette + phím tắt toàn cục.
// Mục tiêu là để App.jsx chỉ giữ wiring chính, không giữ chi tiết điều phối.
// Hook này gọi useAppPhimTatToanCuc và chuẩn hóa action từ command palette.
// Không tạo state mới; chỉ dùng state/setter truyền vào từ App.jsx.
import { useCallback, useMemo } from 'react';
import { buildCommandPaletteFiltered } from './lib/locLenhNhanhCommandPalette.js';
import { useAppPhimTatToanCuc } from './useAppPhimTatToanCuc.js';

export function useAppModalShortcutOrchestration({
  activeNovelData,
  isEntityModalOpen,
  setIsCommandPaletteOpen,
  setCommandPaletteQuery,
  setEditingEntityData,
  setIsEntityModalOpen,
  librarySearchInputRef,
  setMenu1Visible,
  commandPaletteOpenRef,
  setConfirmDialog,
  setIsSettingsOpen,
  setOverviewHubOpen,
  setIsDeepSearchOpen,
  setIsInNovelSearchOpen,
  setIsAddNovelOpen,
  setIsMilestoneModalOpen,
  setIsInsertImageModalOpen,
  setIsManageTabsOpen,
  setIsGenreFilterOpen,
  setQuickCreateData,
  setLightboxSrc,
  setIsEditingMode,
  setIsEntityEditing,
  isCommandPaletteOpen,
  deferredCommandPaletteQuery,
  novelsMetadata,
  safeString,
}) {
  useAppPhimTatToanCuc({
    activeNovelData,
    isEntityModalOpen,
    setIsCommandPaletteOpen,
    setCommandPaletteQuery,
    setEditingEntityData,
    setIsEntityModalOpen,
    librarySearchInputRef,
    setMenu1Visible,
    commandPaletteOpenRef,
    setConfirmDialog,
    setIsSettingsOpen,
    setOverviewHubOpen,
    setIsDeepSearchOpen,
    setIsInNovelSearchOpen,
    setIsAddNovelOpen,
    setIsMilestoneModalOpen,
    setIsInsertImageModalOpen,
    setIsManageTabsOpen,
    setIsGenreFilterOpen,
    setQuickCreateData,
    setLightboxSrc,
    setIsEditingMode,
    setIsEntityEditing,
  });

  const runCommandPaletteAction = useCallback(
    (fn) => {
      setIsCommandPaletteOpen(false);
      setCommandPaletteQuery('');
      fn();
    },
    [setIsCommandPaletteOpen, setCommandPaletteQuery]
  );

  const commandPaletteFiltered = useMemo(
    () =>
      isCommandPaletteOpen
        ? buildCommandPaletteFiltered(
            deferredCommandPaletteQuery,
            novelsMetadata,
            activeNovelData,
            safeString
          )
        : [],
    [
      isCommandPaletteOpen,
      deferredCommandPaletteQuery,
      novelsMetadata,
      activeNovelData,
      safeString,
    ]
  );

  return {
    runCommandPaletteAction,
    commandPaletteFiltered,
  };
}
