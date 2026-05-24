// ==========================================
// AppNovelTocRail.jsx
// Purpose: render the active novel table-of-contents rail and its nested tab tree.
// Imported by: App.jsx.
// Notes: presentational only; navigation and collapse state are owned by App hooks.
// ==========================================

import React from 'react';
import { ChevronDown, ChevronRight, LayoutGrid, Network } from 'lucide-react';
import { getIconComponent, safeString } from './MasterUtils.jsx';

export function AppNovelTocRail({
  menu2Expanded,
  setMenu2Expanded,
  handleMenu2MouseEnter,
  handleMenu2MouseLeave,
  sortedTabs,
  navigationLocked = false,
  activeTabLon,
  activeTabNho,
  activeTabCon,
  handleSelectTabLon,
  handleSelectTabNho,
  handleSelectTabCon,
  setIsManageTabsOpen,
}) {
  const renderTabIconNode = (iconImage, fallbackNode, sizeClass = 'w-4 h-4') => {
    if (safeString(iconImage).trim()) {
      return <img src={iconImage} alt="" className={`${sizeClass} object-cover rounded-sm`} />;
    }
    return fallbackNode;
  };

  const renderSubTabChildren = (tab) => {
    if (!(activeTabLon === tab.id && tab.subTabs?.length > 0 && menu2Expanded)) return null;
    return (
      <div className="mt-1 ml-6 border-l border-slate-700/50 pl-2 space-y-1 animate-fade-in">
        {tab.subTabs.map((sub) => {
          const isActiveNho = activeTabNho === sub.id;
          const hasTabCon = sub.tabCon && sub.tabCon.length > 0;
          return (
            <div key={sub.id}>
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  if (navigationLocked) return;
                  handleSelectTabNho(tab.id, sub.id);
                }}
                className={`w-full text-left py-2 px-3 text-sm rounded-md font-serif flex items-center justify-between transition-colors ${
                  isActiveNho
                    ? 'bg-slate-800/80 text-amber-300'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-2">
                  {renderTabIconNode(
                    sub.iconImage,
                    sub.viewType === 'collection-track' ? (
                      <LayoutGrid size={12} className="opacity-50 flex-shrink-0" />
                    ) : null,
                    'w-3 h-3'
                  )}
                  <span className="whitespace-nowrap">{safeString(sub.label)}</span>
                </span>
                {hasTabCon && (
                  <ChevronDown
                    size={14}
                    className={`flex-shrink-0 transition-transform ${
                      isActiveNho ? 'text-amber-400' : 'text-slate-600 -rotate-90'
                    }`}
                  />
                )}
              </button>
              {isActiveNho && hasTabCon && sub.viewType !== 'collection-track' && (
                <div className="mt-1 ml-4 border-l border-dashed border-slate-700/50 pl-2 space-y-1 animate-fade-in">
                  {sub.tabCon.map((con) => (
                    <button
                      key={con.id}
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (navigationLocked) return;
                        handleSelectTabCon(con.id);
                      }}
                      className={`w-full text-left py-1.5 px-3 text-xs rounded-md font-serif whitespace-nowrap transition-colors ${
                        activeTabCon === con.id
                          ? 'bg-amber-900/30 text-amber-400'
                          : 'text-slate-500 hover:text-slate-300 hover:bg-slate-800/50'
                      }`}
                    >
                      {safeString(con.label)}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTabButton = (tab) => {
    const isActive = activeTabLon === tab.id;
    return (
      <div key={tab.id} className="mb-1">
        <button
          type="button"
          onClick={() => {
            if (navigationLocked) return;
            handleSelectTabLon(tab.id);
          }}
          className={`w-full flex items-center rounded-lg transition-colors whitespace-nowrap ${
            menu2Expanded ? 'p-3 justify-start' : 'p-2 justify-center'
          } ${
            isActive && !activeTabNho
              ? 'bg-amber-900/20 text-amber-400 border-l-2 border-amber-500'
              : 'text-slate-500 hover:bg-slate-800 border-l-2 border-transparent'
          }`}
        >
          <div className="w-5 flex justify-center flex-shrink-0">
            {renderTabIconNode(tab.iconImage, getIconComponent(tab.iconName))}
          </div>
          <span
            className={`font-serif text-sm transition-[opacity,margin-left] duration-200 ${
              menu2Expanded ? 'ml-3 opacity-100' : 'ml-0 opacity-0 w-0 overflow-hidden'
            }`}
          >
            {safeString(tab.label)}
          </span>
        </button>
        {renderSubTabChildren(tab)}
      </div>
    );
  };

  return (
    <div
      className={`bg-slate-900 border-r border-slate-800 transition-[width] duration-200 ease-out flex flex-col z-20 flex-shrink-0 h-full ${
        menu2Expanded ? 'w-max min-w-48' : 'w-12'
      }`}
      onMouseEnter={handleMenu2MouseEnter}
      onMouseLeave={handleMenu2MouseLeave}
    >
      <div className="p-4 border-b border-slate-800 min-h-16 flex items-center justify-between gap-2 shrink-0">
        <button
          type="button"
          onClick={() => setMenu2Expanded((prev) => !prev)}
          className={`font-serif text-amber-500 font-bold text-[10px] uppercase tracking-widest transition-all flex items-center gap-2 ${
            menu2Expanded ? 'opacity-100' : 'opacity-0 w-0 overflow-hidden'
          }`}
          title={navigationLocked ? 'Đang xem trước mục lục truyện mới (theo thể loại)' : undefined}
        >
          Mục Lục
          {navigationLocked && (
            <span className="ml-1 rounded bg-cyan-950/80 px-1 py-0.5 text-[8px] font-bold normal-case tracking-normal text-cyan-300/90">
              xem trước
            </span>
          )}
        </button>
        {!menu2Expanded && (
          <button
            type="button"
            onClick={() => setMenu2Expanded(true)}
            className="w-8 h-8 flex items-center justify-center text-amber-600 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors mx-auto"
            title="Mở mục lục"
          >
            <ChevronRight size={16} />
          </button>
        )}
        {menu2Expanded && (
          <button
            type="button"
            onClick={() => {
              if (navigationLocked) return;
              setIsManageTabsOpen(true);
            }}
            disabled={navigationLocked}
            className="p-1.5 text-amber-600 hover:text-amber-400 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:pointer-events-none"
            title={navigationLocked ? 'Đóng Khai Sinh Thư Tịch để quản lý tab truyện hiện tại' : 'Quản lý tab'}
          >
            <Network size={18} />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-auto custom-scrollbar">
        <div className="py-3 flex flex-col w-max min-w-full">
          {sortedTabs.map((tab) => (
            <div key={tab.id} className={`${menu2Expanded ? 'px-3' : 'px-1'} mb-1`}>
              {renderTabButton(tab)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
