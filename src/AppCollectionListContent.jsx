import React, { memo } from 'react';
import { EntityCard } from './MasterComponents.jsx';

export const AppCollectionListContent = memo(function AppCollectionListContent({
  collectionSubTab,
  entitiesList,
  entityPage,
  setEntityPage,
  entityGroupBy,
  pagedEntitiesList,
  groupedEntitiesList,
  groupVisibleCount,
  setGroupVisibleCount,
  currentTabConfig,
  onEntityCardSelect,
  onEntityCardDelete,
  onEntityCardAddMilestone,
  onEntityCardTogglePin,
  currentContextDirHandle,
  activeTabLon,
  entityPageSize,
}) {
  const [virtualVisibleCount, setVirtualVisibleCount] = React.useState(80);
  const virtualSentinelRef = React.useRef(null);
  const groupSentinelNodesRef = React.useRef(new Map());
  const groupObserverRef = React.useRef(null);
  const shouldVirtualize = entityGroupBy === 'none' && entitiesList.length > 200;
  const shouldVirtualizeGrouped = entityGroupBy !== 'none' && entitiesList.length > 200;

  React.useEffect(() => {
    if (!shouldVirtualize) return;
    setVirtualVisibleCount(80);
  }, [shouldVirtualize, entitiesList.length, activeTabLon, currentTabConfig?.id]);

  React.useEffect(() => {
    if (!shouldVirtualize) return undefined;
    const node = virtualSentinelRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry?.isIntersecting) return;
      setVirtualVisibleCount((prev) => Math.min(entitiesList.length, prev + 80));
    }, { root: null, rootMargin: '220px 0px', threshold: 0.01 });
    observer.observe(node);
    return () => observer.disconnect();
  }, [shouldVirtualize, entitiesList.length]);

  React.useEffect(() => {
    if (!shouldVirtualizeGrouped) {
      if (groupObserverRef.current) {
        groupObserverRef.current.disconnect();
        groupObserverRef.current = null;
      }
      return undefined;
    }
    if (typeof IntersectionObserver === 'undefined') return undefined;
    if (groupObserverRef.current) groupObserverRef.current.disconnect();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const groupName = entry.target.getAttribute('data-group-name');
          if (!groupName) return;
          setGroupVisibleCount((prev) => ({ ...prev, [groupName]: (prev[groupName] || 1) + 1 }));
        });
      },
      { root: null, rootMargin: '260px 0px', threshold: 0.01 }
    );
    groupObserverRef.current = observer;
    groupSentinelNodesRef.current.forEach((node) => {
      if (node) observer.observe(node);
    });
    return () => {
      observer.disconnect();
      if (groupObserverRef.current === observer) groupObserverRef.current = null;
    };
  }, [shouldVirtualizeGrouped, groupedEntitiesList, setGroupVisibleCount]);

  if (collectionSubTab !== 'list') return null;

  const renderGrid = (list) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 content-start">
      {list.map((ent) => (
        <EntityCard
          key={ent.id}
          entity={ent}
          tabConfig={currentTabConfig}
          onSelect={onEntityCardSelect}
          onDelete={onEntityCardDelete}
          onAddMilestone={onEntityCardAddMilestone}
          onTogglePin={onEntityCardTogglePin}
          dirHandle={currentContextDirHandle}
          parentTabId={activeTabLon}
          parentLabel={currentTabConfig?._parentLabel}
        />
      ))}
    </div>
  );

  const totalPages = Math.ceil(entitiesList.length / entityPageSize);
  const pagination =
    totalPages <= 1 ? null : (
      <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-slate-800">
        <button type="button" onClick={() => setEntityPage((p) => Math.max(1, p - 1))} disabled={entityPage === 1} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors">← Trước</button>
        <div className="flex gap-1">
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1 : entityPage <= 4 ? i + 1 : entityPage >= totalPages - 3 ? totalPages - 6 + i : entityPage - 3 + i;
            return (
              <button type="button" key={p} onClick={() => setEntityPage(p)} className={`w-8 h-8 rounded-lg text-xs font-bold transition-colors ${p === entityPage ? 'bg-amber-700 text-white' : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-200'}`}>{p}</button>
            );
          })}
        </div>
        <button type="button" onClick={() => setEntityPage((p) => Math.min(totalPages, p + 1))} disabled={entityPage === totalPages} className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 transition-colors">Sau →</button>
        <span className="text-xs text-slate-600 font-serif ml-2">{entitiesList.length} thực thể</span>
      </div>
    );

  if (entityGroupBy === 'none') {
    if (shouldVirtualize) {
      const virtualItems = entitiesList.slice(0, virtualVisibleCount);
      const hasMoreVirtual = virtualVisibleCount < entitiesList.length;
      return (
        <>
          {renderGrid(virtualItems)}
          {hasMoreVirtual && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={() => setVirtualVisibleCount((prev) => Math.min(entitiesList.length, prev + 80))}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 font-serif"
              >
                Tải thêm ({entitiesList.length - virtualVisibleCount} còn lại)
              </button>
              <div ref={virtualSentinelRef} className="h-1 w-full" />
              <span className="text-[11px] text-slate-600 font-serif">
                Đang hiển thị {virtualItems.length}/{entitiesList.length} thực thể (chế độ tối ưu hiệu năng)
              </span>
            </div>
          )}
        </>
      );
    }
    return (
      <>
        {renderGrid(pagedEntitiesList)}
        {pagination}
      </>
    );
  }

  return (
    <div className="space-y-8">
      {groupedEntitiesList.map(([groupName, groupItems]) => {
        const visible = (groupVisibleCount[groupName] || 1) * entityPageSize;
        const visibleItems = groupItems.slice(0, visible);
        const hasMore = groupItems.length > visible;
        const remaining = groupItems.length - visible;
        return (
          <div key={groupName} className="animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 rounded-full px-4 py-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                <span className="text-sm font-bold text-amber-400 font-serif">{groupName}</span>
                <span className="text-xs text-slate-600 font-serif">({groupItems.length})</span>
              </div>
              <div className="flex-1 h-px bg-slate-800"></div>
            </div>
            {renderGrid(visibleItems)}
            {hasMore && (
              <div className="mt-4 flex justify-center">
                <button onClick={() => setGroupVisibleCount((prev) => ({ ...prev, [groupName]: (prev[groupName] || 1) + 1 }))} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm text-slate-300 font-serif">Xem thêm ({remaining} còn lại)</button>
              </div>
            )}
            {hasMore && shouldVirtualizeGrouped && (
              <div
                data-group-name={groupName}
                ref={(node) => {
                  if (node) groupSentinelNodesRef.current.set(groupName, node);
                  else groupSentinelNodesRef.current.delete(groupName);
                }}
                className="h-1 w-full"
              />
            )}
          </div>
        );
      })}
    </div>
  );
});
