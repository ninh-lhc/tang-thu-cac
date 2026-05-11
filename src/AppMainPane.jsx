// ==========================================
// AppMainPane.jsx
// Purpose: render the main workspace area to the right of the library sidebar.
// Imported by: App.jsx.
// Notes: keeps App.jsx focused on orchestration while preserving current UX.
// ==========================================

import React from 'react';
import { ChevronLeft } from 'lucide-react';
import { DashboardScreen, LandingScreen } from './MasterComponents.jsx';
import { AppNovelTocRail } from './AppNovelTocRail.jsx';
import { AppOverviewSection } from './AppOverviewSection.jsx';
import { AppCollectionSection } from './AppCollectionSection.jsx';
import { AppSectionErrorBoundary } from './AppSectionErrorBoundary.jsx';

export function AppMainPane({
  menu1Visible,
  activeNovelData,
  showConnectReminder,
  dirHandle,
  dismissConnectReminder,
  novelsMetadata,
  dashboardStats,
  isStatsBackfilling,
  novelStatsById,
  handleSelectNovel,
  handleOpenCreateNovel,
  setIsManageTabsOpen,
  menu2Expanded,
  setMenu2Expanded,
  handleMenu2MouseEnter,
  handleMenu2MouseLeave,
  sortedTabs,
  tocRailNavigationLocked = false,
  activeTabLon,
  activeTabNho,
  activeTabCon,
  handleSelectTabLon,
  handleSelectTabNho,
  handleSelectTabCon,
  navHistory,
  handleGoBack,
  collectionSubTab,
  overviewSectionProps,
  collectionSectionProps,
}) {
  return (
    <div className={`flex-1 flex bg-slate-950 transition-opacity duration-300 ${menu1Visible ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
      {!activeNovelData ? (
        <>
          {showConnectReminder && !!dirHandle && (
            <div className="mx-10 mt-6 mb-0 rounded-2xl border border-amber-700/40 bg-amber-900/20 px-5 py-4 text-sm text-amber-100 flex items-start justify-between gap-4">
              <div>
                <p className="font-bold uppercase tracking-widest text-[11px] text-amber-300 mb-1">Nhắc nhở vận hành</p>
                <p className="font-serif text-amber-100/90">Đã kết nối thư mục. Nên backup thư mục lưu trữ định kỳ (tuần/tháng), và thử restore trên bản sao trước khi cập nhật lớn.</p>
              </div>
              <button
                type="button"
                onClick={dismissConnectReminder}
                className="px-3 py-1.5 rounded-lg border border-amber-600/40 text-amber-200 hover:bg-amber-800/30 text-xs font-bold"
              >
                Đã rõ
              </button>
            </div>
          )}
          {novelsMetadata.length > 0 ? (
            <DashboardScreen
              novelsMetadata={novelsMetadata}
              stats={dashboardStats}
              isLoading={isStatsBackfilling}
              novelStatsById={novelStatsById}
              onSelectNovel={handleSelectNovel}
              onSelectNovelAtTab={(meta, lonId, nhoId) => handleSelectNovel(meta, { lonId, nhoId })}
              onAddNovel={handleOpenCreateNovel}
            />
          ) : (
            <LandingScreen
              setIsAddNovelOpen={handleOpenCreateNovel}
              setIsManageTabsOpen={() => setIsManageTabsOpen(true)}
            />
          )}
        </>
      ) : (
        <>
          <AppNovelTocRail
            menu2Expanded={menu2Expanded}
            setMenu2Expanded={setMenu2Expanded}
            handleMenu2MouseEnter={handleMenu2MouseEnter}
            handleMenu2MouseLeave={handleMenu2MouseLeave}
            sortedTabs={sortedTabs}
            navigationLocked={tocRailNavigationLocked}
            activeTabLon={activeTabLon}
            activeTabNho={activeTabNho}
            activeTabCon={activeTabCon}
            handleSelectTabLon={handleSelectTabLon}
            handleSelectTabNho={handleSelectTabNho}
            handleSelectTabCon={handleSelectTabCon}
            setIsManageTabsOpen={setIsManageTabsOpen}
          />

          <div className="flex-1 flex flex-col overflow-hidden relative bg-slate-950">
            <div
              id="main-scroll-container"
              className={`flex-1 overflow-y-auto custom-scrollbar transition-[padding] duration-200 ease-out ${menu2Expanded ? 'py-8 px-16' : 'py-8 px-12 sm:px-16 lg:px-20'}`}
            >
              <div
                className={`w-full mx-auto h-full flex flex-col transition-[max-width] duration-200 ease-out ${
                  menu2Expanded ? 'max-w-7xl' : 'max-w-none'
                }`}
              >
                {navHistory.length > 0 && (
                  <div className="mb-4">
                    <button
                      onClick={handleGoBack}
                      className="flex items-center gap-1 text-xs text-slate-400 hover:text-amber-400 transition-colors font-bold uppercase tracking-widest bg-slate-900/50 px-3 py-1.5 rounded-lg border border-slate-800 w-fit shadow-sm"
                    >
                      <ChevronLeft size={14} />
                      Quay Lại Dấu Vết Cũ
                    </button>
                  </div>
                )}

                {activeTabLon === 'tong-quan' ? (
                  <AppSectionErrorBoundary
                    resetKey={`overview:${activeNovelData?.id || activeNovelData?.title || 'none'}`}
                    title="Tổng quan đang gặp lỗi"
                    description="Phần tổng quan không render được. Các phần khác của app vẫn có thể sử dụng bình thường."
                  >
                    <AppOverviewSection {...overviewSectionProps} />
                  </AppSectionErrorBoundary>
                ) : (
                  <AppSectionErrorBoundary
                    resetKey={`collection:${activeNovelData?.id || activeNovelData?.title || 'none'}:${activeTabLon || 'lon'}:${activeTabNho || 'nho'}:${activeTabCon || 'con'}:${collectionSubTab || 'list'}`}
                    title="Khu vực thẻ đang gặp lỗi"
                    description="Phần danh sách, chi tiết hoặc timeline không render được. Hãy đổi tab hoặc nhấn thử lại."
                  >
                    <AppCollectionSection {...collectionSectionProps} />
                  </AppSectionErrorBoundary>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
