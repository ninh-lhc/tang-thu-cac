import React, { memo, useMemo, useState, useDeferredValue } from 'react';
import { Network, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { FALLBACK_IMG } from './MasterEngines.js';
import { AsyncLocalImage, safeString } from './MasterUtils.jsx';
import {
  filterRelatedEntities,
  sortRelatedEntitiesForDisplay,
  groupByTabLabel,
  uniqueTabLabels,
} from './lib/relatedEntitiesNetwork.js';

/** Số thẻ tối đa mỗi trang trong một nhóm (nhãn tab) — giới hạn DOM / ảnh. */
const NETWORK_GROUP_PAGE_SIZE = 10;

function normalizeSearch(s) {
  return safeString(s)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

const NETWORK_TAB_COLOR_STYLES = [
  {
    key: 'indigo',
    sectionText: 'text-indigo-400/80',
    sectionDivider: 'bg-indigo-800/80',
    itemBadgeBg: 'bg-indigo-900/20',
    itemBadgeBorder: 'border-indigo-700/30',
    itemBadgeText: 'text-indigo-200',
    itemGlow: 'hover:shadow-[0_5px_20px_rgba(99,102,241,0.18)]',
    itemHoverGradient: 'from-indigo-400/10',
    itemHoverBorder: 'hover:border-indigo-500/60',
    itemIconBorder: 'group-hover:border-indigo-400/50',
    itemIconOverlayBg: 'bg-indigo-500/10',
    itemNameHoverText: 'group-hover:text-indigo-300',
  },
  {
    key: 'emerald',
    sectionText: 'text-emerald-400/80',
    sectionDivider: 'bg-emerald-800/80',
    itemBadgeBg: 'bg-emerald-900/20',
    itemBadgeBorder: 'border-emerald-700/30',
    itemBadgeText: 'text-emerald-200',
    itemGlow: 'hover:shadow-[0_5px_20px_rgba(16,185,129,0.18)]',
    itemHoverGradient: 'from-emerald-400/10',
    itemHoverBorder: 'hover:border-emerald-500/60',
    itemIconBorder: 'group-hover:border-emerald-400/50',
    itemIconOverlayBg: 'bg-emerald-500/10',
    itemNameHoverText: 'group-hover:text-emerald-300',
  },
  {
    key: 'amber',
    sectionText: 'text-amber-400/80',
    sectionDivider: 'bg-amber-800/80',
    itemBadgeBg: 'bg-amber-900/20',
    itemBadgeBorder: 'border-amber-700/30',
    itemBadgeText: 'text-amber-200',
    itemGlow: 'hover:shadow-[0_5px_20px_rgba(245,158,11,0.18)]',
    itemHoverGradient: 'from-amber-400/10',
    itemHoverBorder: 'hover:border-amber-500/60',
    itemIconBorder: 'group-hover:border-amber-400/50',
    itemIconOverlayBg: 'bg-amber-500/10',
    itemNameHoverText: 'group-hover:text-amber-300',
  },
  {
    key: 'rose',
    sectionText: 'text-rose-400/80',
    sectionDivider: 'bg-rose-800/80',
    itemBadgeBg: 'bg-rose-900/20',
    itemBadgeBorder: 'border-rose-700/30',
    itemBadgeText: 'text-rose-200',
    itemGlow: 'hover:shadow-[0_5px_20px_rgba(244,63,94,0.18)]',
    itemHoverGradient: 'from-rose-400/10',
    itemHoverBorder: 'hover:border-rose-500/60',
    itemIconBorder: 'group-hover:border-rose-400/50',
    itemIconOverlayBg: 'bg-rose-500/10',
    itemNameHoverText: 'group-hover:text-rose-300',
  },
  {
    key: 'cyan',
    sectionText: 'text-cyan-400/80',
    sectionDivider: 'bg-cyan-800/80',
    itemBadgeBg: 'bg-cyan-900/20',
    itemBadgeBorder: 'border-cyan-700/30',
    itemBadgeText: 'text-cyan-200',
    itemGlow: 'hover:shadow-[0_5px_20px_rgba(22,182,210,0.18)]',
    itemHoverGradient: 'from-cyan-400/10',
    itemHoverBorder: 'hover:border-cyan-500/60',
    itemIconBorder: 'group-hover:border-cyan-400/50',
    itemIconOverlayBg: 'bg-cyan-500/10',
    itemNameHoverText: 'group-hover:text-cyan-300',
  },
];

function hashStringToIndex(s, mod) {
  const str = safeString(s);
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
  return mod > 0 ? h % mod : 0;
}

function getNetworkTabStyles(tabLabel) {
  const idx = hashStringToIndex(tabLabel, NETWORK_TAB_COLOR_STYLES.length);
  return NETWORK_TAB_COLOR_STYLES[idx] ?? NETWORK_TAB_COLOR_STYLES[0];
}

function renderHighlightedText(raw, query) {
  const text = safeString(raw);
  const q = normalizeSearch(query).trim();
  if (!q) return text;

  const tNorm = normalizeSearch(text);
  const isMatch = tNorm.includes(q);
  if (!isMatch) return text;

  // Highlight kiểu đơn giản: nếu query match theo chữ thường không dấu.
  // Trường hợp dấu/diacritics khác nhau thì fallback nhấn toàn bộ chuỗi (vẫn giúp "nổi bật").
  const qPlain = query.trim();
  if (!qPlain) return text;
  const rawLower = text.toLowerCase();
  const qLower = qPlain.toLowerCase();
  const idx = rawLower.indexOf(qLower);
  if (idx === -1) {
    return <span className="text-indigo-200 font-bold">{text}</span>;
  }

  const before = text.slice(0, idx);
  const mid = text.slice(idx, idx + qPlain.length);
  const after = text.slice(idx + qPlain.length);
  return (
    <span className="inline-flex items-baseline gap-0">
      {before}
      <span className="text-indigo-200 font-bold bg-indigo-500/10 px-1 rounded">{mid}</span>
      {after}
    </span>
  );
}

const RelatedEntitiesNetworkSection = memo(function RelatedEntitiesNetworkSection({
  relatedEntities,
  isCalculatingNetwork,
  currentContextDirHandle,
  onNavigate,
  tocRailExpanded = true,
}) {
  const [networkTabKey, setNetworkTabKey] = useState('all');
  const [networkSearch, setNetworkSearch] = useState('');
  const [pageByGroup, setPageByGroup] = useState(() => ({}));
  const deferredSearch = useDeferredValue(networkSearch);

  const tabOptions = useMemo(() => uniqueTabLabels(relatedEntities), [relatedEntities]);

  const tabMatchCounts = useMemo(() => {
    // Tính số lượng item match cho từng tab (kèm search hiện tại)
    const m = new Map();
    m.set('all', filterRelatedEntities(relatedEntities, { tabKey: 'all', searchQuery: deferredSearch }).length);
    for (const tab of tabOptions) {
      m.set(tab, filterRelatedEntities(relatedEntities, { tabKey: tab, searchQuery: deferredSearch }).length);
    }
    return m;
  }, [relatedEntities, tabOptions, deferredSearch]);

  const filtered = useMemo(
    () => filterRelatedEntities(relatedEntities, { tabKey: networkTabKey, searchQuery: deferredSearch }),
    [relatedEntities, networkTabKey, deferredSearch]
  );
  const sorted = useMemo(() => sortRelatedEntitiesForDisplay(filtered), [filtered]);
  const grouped = useMemo(() => groupByTabLabel(sorted), [sorted]);
  const totalFiltered = filtered.length;

  const renderedCount = useMemo(() => {
    let n = 0;
    for (const sec of grouped) {
      const maxPage = Math.max(1, Math.ceil(sec.items.length / NETWORK_GROUP_PAGE_SIZE));
      const page = Math.min(pageByGroup[sec.tabLabel] ?? 1, maxPage);
      const start = (page - 1) * NETWORK_GROUP_PAGE_SIZE;
      n += Math.min(NETWORK_GROUP_PAGE_SIZE, Math.max(0, sec.items.length - start));
    }
    return n;
  }, [grouped, pageByGroup]);

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
                : `Tổng ${relatedEntities.length} liên kết · ${totalFiltered} khớp bộ lọc · đang hiện ${renderedCount} thẻ`}
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
                setPageByGroup({});
              }}
              placeholder="Lọc tên, ngữ cảnh, nhãn tab…"
              autoComplete="off"
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950/80 border border-slate-700/80 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50"
              aria-label="Lọc mạng lưới nhân quả"
            />
            {normalizeSearch(networkSearch).trim() && (
              <div className="mt-1 text-[10px] text-slate-500">
                Khớp theo: tên · nhãn tab · ngữ cảnh
              </div>
            )}
          </div>
        )}
        </div>

        {!isCalculatingNetwork && relatedEntities.length > 0 && tabOptions.length > 1 && (
          <div className="flex flex-wrap gap-2 mb-6">
          <button
            type="button"
            onClick={() => {
              setNetworkTabKey('all');
              setPageByGroup({});
            }}
            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors shadow-sm ${
              networkTabKey === 'all'
                ? 'bg-indigo-900/45 border-indigo-500/60 text-indigo-100 ring-1 ring-indigo-400/30'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-indigo-500/40'
            }`}
          >
            Tất cả tab <span className="text-[10px] text-indigo-200/80 font-bold">({tabMatchCounts.get('all') || 0})</span>
          </button>
          {tabOptions.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => {
                setNetworkTabKey(tab);
                setPageByGroup({});
              }}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-colors max-w-[200px] truncate shadow-sm ${
                networkTabKey === tab
                  ? 'bg-indigo-900/45 border-indigo-500/60 text-indigo-100 ring-1 ring-indigo-400/30'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-indigo-500/40'
              }`}
              title={tab}
            >
              {tab} <span className="text-[10px] text-indigo-200/80 font-bold">({tabMatchCounts.get(tab) || 0})</span>
            </button>
          ))}
          </div>
        )}

        {!isCalculatingNetwork && (
          <div className="space-y-8">
          {grouped.map((sec) => {
            const totalPages = Math.max(1, Math.ceil(sec.items.length / NETWORK_GROUP_PAGE_SIZE));
            const page = Math.min(pageByGroup[sec.tabLabel] ?? 1, totalPages);
            const start = (page - 1) * NETWORK_GROUP_PAGE_SIZE;
            const pageSlice = sec.items.slice(start, start + NETWORK_GROUP_PAGE_SIZE);
            return (
            <div key={sec.tabLabel}>
              {(() => {
                const tabStyles = getNetworkTabStyles(sec.tabLabel);
                return (
                  <div className="flex items-center gap-2 px-1 mb-3">
                    <span className={`text-[10px] uppercase tracking-widest ${tabStyles.sectionText} font-bold`}>{sec.tabLabel}</span>
                    <span className="text-[10px] text-slate-600 tabular-nums">({sec.items.length})</span>
                    <span className={`h-px flex-1 ${tabStyles.sectionDivider}`} />
                  </div>
                );
              })()}
              <div
                className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${
                  tocRailExpanded ? 'lg:grid-cols-4' : 'lg:grid-cols-4 xl:grid-cols-5'
                }`}
              >
                {pageSlice.map((rel) => {
                  const tabStyles = getNetworkTabStyles(sec.tabLabel);
                  return (
                    <button
                      key={`${rel.lonId}|${rel.nhoId}|${rel.entity.id}`}
                      type="button"
                      onClick={() => onNavigate({ lonId: rel.lonId, nhoId: rel.nhoId, entityId: rel.entity.id })}
                      className={`flex items-start gap-3 bg-slate-900/80 backdrop-blur-md border border-slate-700 hover:-translate-y-0.5 p-3 rounded-2xl transition-all duration-300 shadow-md hover:shadow-md group w-full min-h-[72px] relative overflow-hidden ${tabStyles.itemGlow} ${tabStyles.itemHoverBorder}`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-r ${tabStyles.itemHoverGradient} via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none`} />
                      <div className={`w-10 h-10 rounded-[14px] bg-slate-950 overflow-hidden flex-shrink-0 border border-slate-800 ${tabStyles.itemIconBorder} transition-colors relative`}>
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
                          <span className="w-full h-full flex items-center justify-center text-slate-500 font-bold text-base">
                            {safeString(rel.entity.name).charAt(0)}
                          </span>
                        )}
                        <div className={`absolute inset-0 ${tabStyles.itemIconOverlayBg} opacity-0 group-hover:opacity-100 transition-opacity`} />
                      </div>
                      <div className="text-left min-w-0">
                        <div className={`text-[14px] font-bold text-slate-200 ${tabStyles.itemNameHoverText} font-serif transition-colors truncate leading-tight relative z-10`}>
                          {renderHighlightedText(rel.entity.name, networkSearch)}
                        </div>
                        <div className="mt-2 flex flex-col gap-1 min-w-0">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full ${tabStyles.itemBadgeBg} border ${tabStyles.itemBadgeBorder} ${tabStyles.itemBadgeText} text-[10px] font-bold uppercase tracking-widest w-fit relative z-10`}>
                            {safeString(rel.tabLabel)}
                          </span>
                          <div className="text-[9px] text-slate-400 font-serif line-clamp-1 leading-relaxed relative z-10">
                            {renderHighlightedText(rel.context, networkSearch)}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
              {sec.items.length > NETWORK_GROUP_PAGE_SIZE && (
                <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-4">
                  <button
                    type="button"
                    disabled={page <= 1}
                    onClick={() => {
                      setPageByGroup((prev) => ({
                        ...prev,
                        [sec.tabLabel]: Math.max(1, (prev[sec.tabLabel] ?? 1) - 1),
                      }));
                    }}
                    className="tt-kbd-focus flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900 text-slate-300 hover:border-indigo-600/50 hover:text-indigo-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft size={16} aria-hidden /> Trước
                  </button>
                  <span className="text-[11px] text-slate-500 font-medium tabular-nums">
                    Trang {page}/{totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={page >= totalPages}
                    onClick={() => {
                      setPageByGroup((prev) => ({
                        ...prev,
                        [sec.tabLabel]: Math.min(totalPages, (prev[sec.tabLabel] ?? 1) + 1),
                      }));
                    }}
                    className="tt-kbd-focus flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900 text-slate-300 hover:border-indigo-600/50 hover:text-indigo-200 disabled:opacity-40 disabled:pointer-events-none transition-colors"
                  >
                    Sau <ChevronRight size={16} aria-hidden />
                  </button>
                </div>
              )}
            </div>
            );
          })}
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
  tocRailExpanded = true,
}) {
  if (!selectedEntity || collectionSubTab !== 'detail') return null;

  return (
    <RelatedEntitiesNetworkSection
      key={selectedEntity?.id ?? 'none'}
      relatedEntities={relatedEntities}
      isCalculatingNetwork={isCalculatingNetwork}
      currentContextDirHandle={currentContextDirHandle}
      onNavigate={onNavigate}
      tocRailExpanded={tocRailExpanded}
    />
  );
});
