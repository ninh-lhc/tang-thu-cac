import React, { memo, useMemo, useState, useDeferredValue } from 'react';
import { Network, Search } from 'lucide-react';
import { FALLBACK_IMG } from './MasterEngines.js';
import { AsyncLocalImage, safeString } from './MasterUtils.jsx';
import {
  filterRelatedEntities,
  sortRelatedEntitiesForDisplay,
  groupByTabLabel,
  uniqueTabLabels,
  takeGroupedForDisplay,
} from './lib/relatedEntitiesNetwork.js';

const NETWORK_PAGE_SIZE = 24;

const RelatedEntitiesNetworkSection = memo(function RelatedEntitiesNetworkSection({
  relatedEntities,
  isCalculatingNetwork,
  currentContextDirHandle,
  onNavigate,
}) {
  const [networkTabKey, setNetworkTabKey] = useState('all');
  const [networkSearch, setNetworkSearch] = useState('');
  const [visibleCount, setVisibleCount] = useState(NETWORK_PAGE_SIZE);
  const deferredSearch = useDeferredValue(networkSearch);

  const tabOptions = useMemo(() => uniqueTabLabels(relatedEntities), [relatedEntities]);
  const filtered = useMemo(
    () => filterRelatedEntities(relatedEntities, { tabKey: networkTabKey, searchQuery: deferredSearch }),
    [relatedEntities, networkTabKey, deferredSearch]
  );
  const sorted = useMemo(() => sortRelatedEntitiesForDisplay(filtered), [filtered]);
  const grouped = useMemo(() => groupByTabLabel(sorted), [sorted]);
  const { sections, hasMore, totalShown, totalFiltered } = useMemo(
    () => takeGroupedForDisplay(grouped, visibleCount),
    [grouped, visibleCount]
  );

  if (relatedEntities.length === 0 && !isCalculatingNetwork) return null;

  return (
    <div className="mt-8 mb-10 animate-fade-in relative">
      <div className="bg-slate-900/30 border border-slate-800/80 rounded-[24px] p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-6 pb-2 border-b border-slate-800/80">
        <div className="flex items-center gap-3 min-w-0">
          <div className="p-2 bg-indigo-900/20 text-indigo-400 rounded-lg border border-indigo-700/30 shrink-0">
            <Network size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h3 className="text-xl font-heading font-bold text-indigo-100">Mạng Lưới Nhân Quả</h3>
              {isCalculatingNetwork && (
                <div className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">
              {isCalculatingNetwork
                ? 'Thần thức đang dò xét...'
                : `Tổng ${relatedEntities.length} liên kết · ${totalFiltered} khớp bộ lọc · đang hiện ${totalShown}`}
            </p>
          </div>
        </div>
        {!isCalculatingNetwork && relatedEntities.length > 0 && (
          <div className="relative w-full sm:max-w-xs shrink-0">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none"
              size={16}
              aria-hidden
            />
            <input
              type="search"
              value={networkSearch}
              onChange={(e) => {
                setNetworkSearch(e.target.value);
                setVisibleCount(NETWORK_PAGE_SIZE);
              }}
              placeholder="Lọc tên, ngữ cảnh, nhãn tab…"
              autoComplete="off"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50"
              aria-label="Lọc mạng lưới nhân quả"
            />
          </div>
        )}
        </div>

        {!isCalculatingNetwork && relatedEntities.length > 0 && tabOptions.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setNetworkTabKey('all');
              setVisibleCount(NETWORK_PAGE_SIZE);
            }}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
              networkTabKey === 'all'
                ? 'bg-indigo-900/40 border-indigo-600/50 text-indigo-200'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả tab
          </button>
          {tabOptions.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setNetworkTabKey(tab);
                setVisibleCount(NETWORK_PAGE_SIZE);
              }}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors max-w-[200px] truncate ${
                networkTabKey === tab
                  ? 'bg-indigo-900/40 border-indigo-600/50 text-indigo-200'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
              title={tab}
            >
              {tab}
            </button>
          ))}
          </div>
        )}

        {!isCalculatingNetwork && (
          <div className="space-y-8">
          {sections.map((sec) => (
            <div key={sec.tabLabel}>
              <div className="flex items-center gap-2 px-1 mb-3">
                <span className="text-[10px] uppercase tracking-widest text-indigo-400/80 font-bold">{sec.tabLabel}</span>
                <span className="h-px flex-1 bg-slate-800/80" />
              </div>
              <div className="flex flex-wrap gap-4">
                {sec.items.map((rel) => (
                  <button
                    key={`${rel.lonId}|${rel.nhoId}|${rel.entity.id}`}
                    type="button"
                    onClick={() => onNavigate({ lonId: rel.lonId, nhoId: rel.nhoId, entityId: rel.entity.id })}
                    className="flex items-start gap-4 bg-slate-900/80 backdrop-blur-md border border-slate-700 hover:border-indigo-500/60 p-4 rounded-2xl transition-all duration-300 shadow-md hover:shadow-[0_5px_20px_rgba(99,102,241,0.15)] hover:-translate-y-0.5 group w-full md:w-auto md:min-w-[320px] min-h-[78px]"
                  >
                    <div className="w-12 h-12 rounded-[16px] bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-800 group-hover:border-indigo-400/50 transition-colors relative">
                      {rel.entity.avatar ? (
                        rel.entity.avatar.startsWith('local_image:') ? (
                          <AsyncLocalImage
                            filename={rel.entity.avatar.replace('local_image:', '')}
                            alt=""
                            dirHandle={currentContextDirHandle}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <img
                            src={rel.entity.avatar}
                            className="w-full h-full object-cover"
                            alt=""
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = FALLBACK_IMG;
                            }}
                          />
                        )
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-lg">
                          {safeString(rel.entity.name).charAt(0)}
                        </span>
                      )}
                      <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-left min-w-0">
                      <div className="text-[15px] font-bold text-slate-200 group-hover:text-indigo-300 font-serif transition-colors truncate leading-tight">
                        {safeString(rel.entity.name)}
                      </div>
                      <div className="mt-2 flex flex-col gap-1 min-w-0">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-900/20 border border-indigo-700/30 text-indigo-200 text-[10px] font-bold uppercase tracking-widest w-fit">
                          {safeString(rel.tabLabel)}
                        </span>
                        <div className="text-[10px] text-slate-400 font-serif line-clamp-2 leading-relaxed">
                          {safeString(rel.context)}
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="flex justify-center pt-2">
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + NETWORK_PAGE_SIZE)}
                className="flex items-center justify-center bg-slate-950/50 border border-dashed border-indigo-700/50 hover:border-indigo-400/80 px-6 py-3 rounded-[24px] transition-all duration-300 hover:bg-indigo-900/20 text-indigo-400/70 hover:text-indigo-300 text-sm font-serif"
              >
                Xem thêm ({totalFiltered - totalShown} còn lại)
              </button>
            </div>
          )}
          {totalFiltered === 0 && relatedEntities.length > 0 && (
            <p className="text-center text-slate-500 text-sm py-6">Không có mục nào khớp bộ lọc hiện tại.</p>
          )}
          </div>
        )}
      </div>
    </div>
  );
});

export const AppEntitySummaryBlocks = memo(function AppEntitySummaryBlocks({
  selectedEntity,
  collectionSubTab,
  currentContextDirHandle,
  relatedEntities,
  isCalculatingNetwork,
  onNavigate,
}) {
  if (!selectedEntity || collectionSubTab !== 'detail') return null;

  return (
    <RelatedEntitiesNetworkSection
      key={selectedEntity?.id ?? 'none'}
      relatedEntities={relatedEntities}
      isCalculatingNetwork={isCalculatingNetwork}
      currentContextDirHandle={currentContextDirHandle}
      onNavigate={onNavigate}
    />
  );
});
