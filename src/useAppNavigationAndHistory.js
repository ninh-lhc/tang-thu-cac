// Hook điều hướng trung tâm cho App.jsx.
// Tách logic history + scroll reset khỏi file trục để dễ theo dõi.
// App.jsx truyền state hiện tại và toàn bộ setter cần thiết.
// Dùng cho wiki-link navigate, quick-create và nút quay lại.
import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

export function useAppNavigationAndHistory({
  activeTabLon,
  activeTabNho,
  activeTabCon,
  selectedEntityId,
  collectionSubTab,
  navHistory,
  setNavHistory,
  setEntitySearch,
  setRecentlyMergedFields,
  setActiveTabLon,
  setActiveTabNho,
  setActiveTabCon,
  setSelectedEntityId,
  setCollectionSubTab,
  setIsEditingMode,
  setIsEntityEditing,
  setQuickCreateData,
}) {
  const pendingScrollResetRef = useRef({
    raf1: 0,
    raf2: 0,
    timeoutId: 0,
  });

  const cancelPendingScrollReset = useCallback(() => {
    const pending = pendingScrollResetRef.current;
    if (pending.raf1 && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(pending.raf1);
    }
    if (pending.raf2 && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(pending.raf2);
    }
    if (pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }
    pendingScrollResetRef.current = { raf1: 0, raf2: 0, timeoutId: 0 };
  }, []);

  const scrollAppContentToTop = useCallback(() => {
    if (typeof document === 'undefined') return;
    const mainScroller = document.getElementById('main-scroll-container');
    const colScroller = document.getElementById('collection-scroll-container');
    if (mainScroller) {
      mainScroller.scrollTop = 0;
      if (typeof mainScroller.scrollTo === 'function') {
        mainScroller.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
    if (colScroller) {
      colScroller.scrollTop = 0;
      if (typeof colScroller.scrollTo === 'function') {
        colScroller.scrollTo({ top: 0, behavior: 'auto' });
      }
    }
  }, []);

  const scheduleScrollAppContentToTop = useCallback(() => {
    cancelPendingScrollReset();
    scrollAppContentToTop();
    if (typeof requestAnimationFrame === 'function') {
      pendingScrollResetRef.current.raf1 = requestAnimationFrame(() => {
        scrollAppContentToTop();
        pendingScrollResetRef.current.raf2 = requestAnimationFrame(() => {
          scrollAppContentToTop();
        });
      });
    }
    pendingScrollResetRef.current.timeoutId = setTimeout(() => {
      scrollAppContentToTop();
      pendingScrollResetRef.current.timeoutId = 0;
    }, 120);
  }, [cancelPendingScrollReset, scrollAppContentToTop]);

  const handleNavigate = useCallback(
    (dest) => {
      if (dest?.type === 'QUICK_CREATE') {
        setQuickCreateData(dest.name);
        return;
      }
      setNavHistory((prev) => {
        const next = [
          ...prev,
          {
            lonId: activeTabLon,
            nhoId: activeTabNho,
            conId: activeTabCon,
            entityId: selectedEntityId,
            subTab: collectionSubTab,
          },
        ];
        // Giữ lịch sử trong ngưỡng an toàn để tránh phình bộ nhớ.
        return next.length > 120 ? next.slice(next.length - 120) : next;
      });
      setEntitySearch('');
      setRecentlyMergedFields(new Set());
      setActiveTabLon(dest.lonId);
      if (dest.nhoId) setActiveTabNho(dest.nhoId);
      if (dest.conId) setActiveTabCon(dest.conId);
      else setActiveTabCon(null);
      if (dest.entityId) {
        setSelectedEntityId(dest.entityId);
        setCollectionSubTab('detail');
      } else {
        setSelectedEntityId(null);
        setCollectionSubTab('list');
      }
      setIsEditingMode(false);
      setIsEntityEditing(false);
      // Link navigation should always land at top, including same-tab hops.
      scheduleScrollAppContentToTop();
    },
    [
      activeTabLon,
      activeTabNho,
      activeTabCon,
      selectedEntityId,
      collectionSubTab,
      setNavHistory,
      setEntitySearch,
      setRecentlyMergedFields,
      setActiveTabLon,
      setActiveTabNho,
      setActiveTabCon,
      setSelectedEntityId,
      setCollectionSubTab,
      setIsEditingMode,
      setIsEntityEditing,
      setQuickCreateData,
      scheduleScrollAppContentToTop,
    ]
  );

  const handleGoBack = useCallback(() => {
    if (navHistory.length === 0) return;
    const last = navHistory[navHistory.length - 1];
    setNavHistory((prev) => prev.slice(0, -1));
    setActiveTabLon(last.lonId);
    setActiveTabNho(last.nhoId);
    setActiveTabCon(last.conId);
    setSelectedEntityId(last.entityId);
    setCollectionSubTab(last.subTab || 'list');
  }, [
    navHistory,
    setNavHistory,
    setActiveTabLon,
    setActiveTabNho,
    setActiveTabCon,
    setSelectedEntityId,
    setCollectionSubTab,
  ]);

  useLayoutEffect(() => {
    scheduleScrollAppContentToTop();
      // Tránh tích lũy nhiều animation "smooth" khi chuyển tab nhanh.
    return cancelPendingScrollReset;
  }, [
    activeTabLon,
    activeTabNho,
    activeTabCon,
    selectedEntityId,
    collectionSubTab,
    scheduleScrollAppContentToTop,
    cancelPendingScrollReset,
  ]);

  useEffect(() => cancelPendingScrollReset, [cancelPendingScrollReset]);

  return {
    handleNavigate,
    handleGoBack,
    scrollAppContentToTop,
  };
}
