/**
 * Phím tắt toàn cục (window keydown): Ctrl+K lệnh nhanh, Ctrl+S lưu, Ctrl+Shift+N thẻ mới,
 * / mở sidebar thư viện, Escape đóng modal.
 *
 * Không chứa logic nghiệp vụ truyện — chỉ gọi setter/ref do App.jsx truyền vào.
 * Ai dùng: App.jsx một lần ở root.
 */
import { useEffect } from 'react';

export function useAppPhimTatToanCuc({
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
}) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsCommandPaletteOpen((o) => !o);
        setCommandPaletteQuery('');
        return;
      }
      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent('ttc-save'));
        return;
      }
      if (e.ctrlKey && e.shiftKey && (e.key === 'N' || e.key === 'n')) {
        e.preventDefault();
        if (activeNovelData && !isEntityModalOpen) {
          setEditingEntityData(null);
          setIsEntityModalOpen(true);
        }
        return;
      }
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (e.target && e.target.isContentEditable)) return;
        e.preventDefault();
        setMenu1Visible(true);
        setTimeout(() => librarySearchInputRef.current?.focus?.(), 0);
        return;
      }
      if (e.key === 'Escape') {
        if (commandPaletteOpenRef.current) {
          setIsCommandPaletteOpen(false);
          return;
        }
        setConfirmDialog((c) => (c.isOpen ? { ...c, isOpen: false } : c));
        setIsSettingsOpen(false);
        setOverviewHubOpen(false);
        setIsDeepSearchOpen(false);
        setIsInNovelSearchOpen(false);
        setIsAddNovelOpen(false);
        setIsEntityModalOpen(false);
        setIsMilestoneModalOpen(false);
        setIsInsertImageModalOpen(false);
        setIsManageTabsOpen(false);
        setIsGenreFilterOpen(false);
        setQuickCreateData(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
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
  ]);
}
