/**
 * Panel timeline thẻ: danh sách mốc (cột trái) + chi tiết mốc (cột phải).
 * Phân trang 10 mốc/trang (chương mới nhất trước); thanh trang luôn dùng được, kể cả khi cột mốc thu (icon ←/→).
 * Cột mốc dùng @tanstack/react-virtual — tránh render hàng nghìn nút DOM (P0 roadmap).
 * Ai import: AppCollectionSection / luồng collection.
 */
import React, { memo, useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { History, Plus, Edit2, Trash2, Clock, Sparkles, ChevronLeft, ChevronRight } from 'lucide-react';
import { DEFAULT_ENTITY_FIELDS, FALLBACK_IMG, resolveFieldsTemplate } from './MasterEngines.js';
import { AsyncLocalImage, renderMarkdown, safeString, processInline, generateId } from './MasterUtils.jsx';
import { MILESTONE_LABELS, parseMilestoneLabel, applyMilestoneLabel } from './lib/milestoneLabels.js';

function isMeaningfulTimelineValue(value) {
  const v = safeString(value).trim().toLowerCase();
  if (!v) return false;
  const emptyTokens = new Set([
    'khong',
    'không',
    'none',
    'n/a',
    'na',
    'null',
    'undefined',
    '---',
    '...',
    'chua ghi nhan',
    'chưa ghi nhận',
    'chua co',
    'chưa có',
    'chua co ghi chep',
    'chưa có ghi chép',
  ]);
  return !emptyTokens.has(v);
}

function normalizeAscii(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** Chiều cao ước lượng mỗi hàng mốc (p-4 + 2 dòng + gap); virtualizer dùng làm mặc định. */
const MILESTONE_LIST_ROW_ESTIMATE_PX = 96;

/** Cùng reference khi không có milestones — tránh dependency useMemo đổi mỗi render. */
const EMPTY_MILESTONES = [];
const LABEL_BADGE_CLASS = {
  critical: 'border-rose-700/50 bg-rose-950/35 text-rose-300',
  important: 'border-amber-700/50 bg-amber-950/35 text-amber-300',
  ongoing: 'border-cyan-700/50 bg-cyan-950/35 text-cyan-300',
  uncertain: 'border-violet-700/50 bg-violet-950/35 text-violet-300',
  drop: 'border-slate-600/60 bg-slate-900/80 text-slate-300',
};

function isAutoOwnerMilestone(ms) {
  if (!ms || typeof ms !== 'object') return false;
  if (ms.meta?.source === 'auto-owner') return true;
  return typeof ms.id === 'string' && ms.id.startsWith('ms-auto-');
}

export const AppEntityTimelinePanel = memo(function AppEntityTimelinePanel({
  collectionSubTab,
  selectedEntity,
  selectedMilestoneId,
  setSelectedMilestoneId,
  activeTabLon,
  currentTabConfig,
  currentContextDirHandle,
  entityMap,
  globalLinkRegex,
  onNavigate,
  setEditingMilestoneData,
  setIsMilestoneModalOpen,
  handleDeleteMilestone,
  handleReplaceMilestones,
  getFieldValue,
  setLightboxSrc,
}) {
  const labelTitleById = React.useMemo(
    () => new Map(MILESTONE_LABELS.map((x) => [x.id, x.title])),
    []
  );
  const getLabelBadgeClass = (labelId) =>
    LABEL_BADGE_CLASS[labelId] || 'border-cyan-700/40 bg-cyan-950/30 text-cyan-300';
  const [milestonesPage, setMilestonesPage] = useState(0);
  const milestoneListScrollRef = useRef(null);
  const eventColumnRef = useRef(null);
  const leaveCollapseTimeoutRef = useRef(null);
  const milestonesAll = Array.isArray(selectedEntity?.milestones)
    ? selectedEntity.milestones
    : EMPTY_MILESTONES;
  const PAGE_SIZE = 10;
  const milestonesSorted = React.useMemo(() => {
    if (!milestonesAll) return [];
    return [...milestonesAll].sort((a, b) => {
      const ca = typeof a?.chapter === 'number' ? a.chapter : parseInt(a?.chapter, 10) || 0;
      const cb = typeof b?.chapter === 'number' ? b.chapter : parseInt(b?.chapter, 10) || 0;
      // Mới nhất (chapter lớn hơn) lên trên
      if (cb !== ca) return cb - ca;
      // fallback để sắp xếp ổn định
      return String(b?.id ?? '').localeCompare(String(a?.id ?? ''));
    });
  }, [milestonesAll]);
  const totalPages = Math.max(1, Math.ceil(milestonesSorted.length / PAGE_SIZE));
  const safePage = Math.min(milestonesPage, totalPages - 1);
  const milestones = milestonesSorted.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  // Thu gọn sau khi đã chọn mốc. Mở rộng lại sẽ làm bằng CSS hover (không setState theo chuột để tránh lag).
  const isEventColumnCollapsed = !!selectedMilestoneId;
  const [isEventColumnHovered, setIsEventColumnHovered] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewPick, setReviewPick] = useState(() => new Set());
  const isEventColumnExpanded = !isEventColumnCollapsed || isEventColumnHovered;
  const isEventColumnContentHidden = isEventColumnCollapsed && !isEventColumnExpanded;

  const rowVirtualizer = useVirtualizer({
    count: milestones.length,
    getScrollElement: () => milestoneListScrollRef.current,
    estimateSize: () => MILESTONE_LIST_ROW_ESTIMATE_PX,
    overscan: 8,
    getItemKey: (index) => milestones[index]?.id ?? index,
  });

  useEffect(() => {
    // Clamp page khi đổi entity hoặc khi tổng số page giảm.
    setMilestonesPage((p) => Math.min(p, totalPages - 1));
  }, [selectedEntity?.id, totalPages]);

  // Nếu user đã hover vào cột trái ngay thời điểm vừa chọn milestone (đổi state),
  // thì onMouseEnter có thể không chạy lại. Dùng :hover để đồng bộ ngay lập tức.
  useEffect(() => {
    if (!isEventColumnCollapsed) {
      setIsEventColumnHovered(false);
      return;
    }
    const el = eventColumnRef.current;
    if (!el) return;
    if (el.matches(':hover')) setIsEventColumnHovered(true);
  }, [isEventColumnCollapsed]);

  useEffect(() => {
    return () => {
      if (leaveCollapseTimeoutRef.current) {
        clearTimeout(leaveCollapseTimeoutRef.current);
        leaveCollapseTimeoutRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    // Khi đang bật tab timeline và milestone được chọn nằm ở page khác,
    // tự động nhảy sang page đó để user thấy đúng hàng đang chọn.
    if (collectionSubTab !== 'timeline' || !selectedMilestoneId) return;
    const idxAll = milestonesSorted.findIndex((m) => m.id === selectedMilestoneId);
    if (idxAll < 0) return;
    const neededPage = Math.floor(idxAll / PAGE_SIZE);
    if (neededPage !== milestonesPage) setMilestonesPage(neededPage);
  }, [collectionSubTab, selectedMilestoneId, selectedEntity?.id, milestonesSorted, milestonesPage, PAGE_SIZE]);

  useEffect(() => {
    if (collectionSubTab !== 'timeline' || !selectedMilestoneId || milestones.length === 0) return;
    const idx = milestones.findIndex((m) => m.id === selectedMilestoneId);
    if (idx < 0) return;
    const raf = requestAnimationFrame(() => {
      try {
        rowVirtualizer.scrollToIndex(idx, { align: 'nearest' });
      } catch {
        /* ignore */
      }
    });
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps -- milestones trong closure; rowVirtualizer (TanStack) không khuyến nghị gắn deps
  }, [selectedMilestoneId, selectedEntity?.id, milestones.length, collectionSubTab, milestonesPage]);

  useEffect(() => {
    setIsReviewOpen(false);
    setReviewPick(new Set());
  }, [selectedEntity?.id]);

  if (collectionSubTab !== 'timeline' || !selectedEntity) return null;
  const canReviewTimeline = true;
  const shouldSuggestReview = canReviewTimeline && milestonesAll.length >= 30;
  const reviewRows = milestonesSorted.map((ms) => {
    const parsed = parseMilestoneLabel(ms.event);
    return { ...ms, labelId: parsed.labelId, body: parsed.body };
  });
  const reviewGroups = [
    { id: 'critical', title: 'Bước ngoặt', items: reviewRows.filter((x) => x.labelId === 'critical') },
    { id: 'important', title: 'Quan trọng', items: reviewRows.filter((x) => x.labelId === 'important') },
    { id: 'ongoing', title: 'Xuyên suốt', items: reviewRows.filter((x) => x.labelId === 'ongoing') },
    { id: 'uncertain', title: 'Chưa rõ', items: reviewRows.filter((x) => x.labelId === 'uncertain') },
    { id: 'drop', title: 'Tạm bỏ', items: reviewRows.filter((x) => x.labelId === 'drop') },
    { id: 'none', title: 'Chưa gắn nhãn', items: reviewRows.filter((x) => !x.labelId) },
  ];
  const selectedReviewIds = Array.from(reviewPick);
  const selectedCount = selectedReviewIds.length;
  const toggleReviewPick = (id) => {
    setReviewPick((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const applyReviewLabel = (labelId) => {
    if (!handleReplaceMilestones || selectedCount === 0) return;
    const selectedIdSet = new Set(selectedReviewIds);
    const next = milestonesAll.map((ms) => {
      if (!selectedIdSet.has(ms.id)) return ms;
      return { ...ms, event: applyMilestoneLabel(ms.event, labelId) };
    });
    handleReplaceMilestones(next, `Đã gắn nhãn cho ${selectedCount} mốc.`);
    setReviewPick(new Set());
  };
  const deleteReviewPicked = () => {
    if (!handleReplaceMilestones || selectedCount === 0) return;
    const selectedIdSet = new Set(selectedReviewIds);
    const next = milestonesAll.filter((ms) => !selectedIdSet.has(ms.id));
    handleReplaceMilestones(next, `Đã xóa ${selectedCount} mốc khỏi timeline.`);
    setReviewPick(new Set());
  };
  const mergeReviewPicked = () => {
    if (!handleReplaceMilestones || selectedCount < 2) return;
    const selectedIdSet = new Set(selectedReviewIds);
    const picked = milestonesAll.filter((ms) => selectedIdSet.has(ms.id));
    if (picked.length < 2) return;
    const sorted = [...picked].sort((a, b) => (parseInt(a.chapter, 10) || 0) - (parseInt(b.chapter, 10) || 0));
    const newestWithSnapshot = [...sorted].reverse().find((x) => x.snapshot) || null;
    const mergedEvent = sorted
      .map((x) => {
        const parsed = parseMilestoneLabel(x.event);
        return `- Ch.${safeString(x.chapter)}: ${safeString(parsed.body || x.event)}`;
      })
      .join('\n');
    const merged = {
      id: generateId('ms'),
      chapter: parseInt(sorted[0]?.chapter, 10) || 0,
      event: `[?] Gộp ${picked.length} mốc:\n${mergedEvent}`,
      snapshot: newestWithSnapshot?.snapshot || null,
    };
    const remained = milestonesAll.filter((ms) => !selectedIdSet.has(ms.id));
    handleReplaceMilestones([...remained, merged], `Đã ghép ${picked.length} mốc thành 1 mốc.`);
    setReviewPick(new Set());
  };

  return (
    <div className={`flex overflow-hidden w-full h-full flex-col md:flex-row pb-10`}>
      <div
        className={`group w-full border-r border-slate-800/80 flex flex-col flex-shrink-0 min-h-0 md:max-h-[min(85vh,720px)] transition-[width,padding] duration-200 ease-out ${
          isEventColumnCollapsed
            ? isEventColumnExpanded
              ? 'md:w-1/3 md:pr-6'
              : 'md:w-[92px] md:pr-2'
            : 'md:w-1/3 md:pr-6'
        }`}
        ref={eventColumnRef}
        onMouseEnter={() => {
          if (leaveCollapseTimeoutRef.current) {
            clearTimeout(leaveCollapseTimeoutRef.current);
            leaveCollapseTimeoutRef.current = null;
          }
          setIsEventColumnHovered(true);
        }}
        onMouseLeave={() => {
          if (leaveCollapseTimeoutRef.current) clearTimeout(leaveCollapseTimeoutRef.current);
          // Hysteresis để tránh "giật" khi transition làm hit-area thay đổi.
          leaveCollapseTimeoutRef.current = setTimeout(() => {
            setIsEventColumnHovered(false);
          }, 140);
        }}
      >
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className={`text-lg font-heading font-bold text-amber-500 transition-opacity duration-150 ${
            isEventColumnContentHidden
              ? 'opacity-0 pointer-events-none'
              : 'opacity-100'
          }`}>Mốc Sự Kiện</h3>
          <div className="flex items-center gap-2">
            {canReviewTimeline && (
              <button
                type="button"
                onClick={() => setIsReviewOpen((p) => !p)}
                className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-colors ${
                  isReviewOpen
                    ? 'text-cyan-300 bg-cyan-950/40 border-cyan-700/50'
                    : 'text-slate-300 bg-slate-900 border-slate-700 hover:border-cyan-700/40'
                }`}
                title="Rà soát mốc theo nhãn ký tự"
              >
                Rà soát
              </button>
            )}
            <button onClick={() => { setEditingMilestoneData(null); setIsMilestoneModalOpen(true); }} className="p-2 bg-emerald-900/30 text-emerald-400 rounded-[40px] hover:bg-emerald-800/50 transition-colors" title="Thêm mốc mới"><Plus size={16}/></button>
          </div>
        </div>

        {milestonesAll.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-50 border border-dashed border-slate-700 rounded-[40px] shrink-0">
            <History size={24} className="text-slate-600 mb-2"/>
            <p className="text-slate-500 italic font-serif text-xs">Chưa có Kỷ Nguyên nào...</p>
          </div>
        ) : (
          <>
            {shouldSuggestReview && !isReviewOpen && (
              <div className="mb-3 rounded-xl border border-cyan-700/40 bg-cyan-950/20 p-2.5 text-[11px] text-cyan-200 flex items-center justify-between gap-2">
                <span>Đã có {milestonesAll.length} mốc — nên rà soát nhãn/gộp để timeline gọn hơn.</span>
                <button
                  type="button"
                  onClick={() => setIsReviewOpen(true)}
                  className="px-2 py-1 rounded-md border border-cyan-700/50 bg-cyan-900/20 text-cyan-200 font-bold hover:bg-cyan-900/35 transition-colors"
                >
                  Mở rà soát
                </button>
              </div>
            )}
            <div ref={milestoneListScrollRef} className="flex-1 min-h-0 overflow-y-auto custom-scrollbar relative pl-1">
              <div
                className="absolute left-[14px] top-0 w-px bg-gradient-to-b from-amber-900/50 via-slate-700 to-transparent z-0 pointer-events-none"
                style={{ height: `${Math.max(rowVirtualizer.getTotalSize(), 120)}px` }}
                aria-hidden
              />
              <div className="relative z-10" style={{ height: `${rowVirtualizer.getTotalSize()}px` }}>
                {rowVirtualizer.getVirtualItems().map((vi) => {
                  const ms = milestones[vi.index];
                  if (!ms) return null;
                  const isSelected = selectedMilestoneId === ms.id;
                  const parsedMs = parseMilestoneLabel(ms.event);
                  const isAutoMs = isAutoOwnerMilestone(ms);
                  return (
                    <div
                      key={ms.id}
                      ref={rowVirtualizer.measureElement}
                      data-index={vi.index}
                      className="absolute top-0 left-0 w-full pb-4"
                      style={{ transform: `translateY(${vi.start}px)` }}
                    >
                      <button
                        type="button"
                        onClick={() => { setSelectedMilestoneId(ms.id); }}
                      className={`w-full text-left p-4 rounded-2xl flex items-start gap-4 transition-all duration-300 ${isSelected ? 'bg-gradient-to-r from-amber-900/40 to-slate-900 border border-amber-700/50 shadow-lg translate-x-2' : 'bg-transparent border border-transparent hover:bg-slate-900 hover:border-slate-800'}`}
                      >
                        <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-amber-400 border-amber-900 shadow-[0_0_10px_var(--t-400)]' : 'bg-slate-800 border-slate-950 group-hover:bg-slate-600'}`}></div>
                        {isEventColumnContentHidden && (
                          <div className="min-w-0 flex-1 pt-0.5">
                            <div className={`inline-flex items-center rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                              isSelected
                                ? 'border-amber-700/70 bg-amber-900/40 text-amber-300'
                                : 'border-slate-700/80 bg-slate-900/70 text-slate-400 group-hover:text-slate-300'
                            }`}>
                              Ch {safeString(ms.chapter)}
                            </div>
                          </div>
                        )}
                        <div
                          className={`flex-1 min-w-0 transition-[opacity,max-width] duration-150 overflow-hidden ${
                            isEventColumnContentHidden
                              ? 'opacity-0 max-w-0 pointer-events-none'
                              : 'opacity-100 max-w-[9999px]'
                          }`}
                        >
                          <div className={`text-sm font-bold uppercase tracking-widest font-heading mb-1 transition-colors ${isSelected ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-300'}`}>Chương {safeString(ms.chapter)}</div>
                          <div className="flex items-center gap-2 mb-1">
                            {parsedMs.labelId && (
                              <span className={`text-[10px] px-1.5 py-0.5 rounded border uppercase tracking-wide ${getLabelBadgeClass(parsedMs.labelId)}`}>
                                {safeString(labelTitleById.get(parsedMs.labelId))}
                              </span>
                            )}
                            {isAutoMs && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded border border-emerald-700/50 bg-emerald-950/30 text-emerald-300 uppercase tracking-wide">
                                AUTO
                              </span>
                            )}
                          </div>
                          <div className={`text-xs font-serif line-clamp-2 leading-relaxed ${isSelected ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-400'}`}>{safeString(parsedMs.body || ms.event)}</div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {totalPages > 1 && (
              <div
                className={`mt-3 shrink-0 px-1 transition-all duration-150 ${
                  isEventColumnContentHidden
                    ? 'flex flex-col items-center gap-1.5 py-2 border-t border-slate-800/70'
                    : 'flex max-h-[72px] items-center justify-between gap-2 sm:gap-3'
                }`}
                role="navigation"
                aria-label="Phân trang mốc thời gian (10 mốc gần nhất mỗi trang, trang 1 là mới nhất)"
              >
                {isEventColumnContentHidden ? (
                  <>
                    <button
                      type="button"
                      disabled={safePage <= 0}
                      title="Trang trước — các mốc mới hơn"
                      aria-label="Trang trước, mốc mới hơn"
                      onClick={() => setMilestonesPage((p) => Math.max(0, p - 1))}
                      className={`tt-kbd-focus p-2 rounded-lg border transition-colors ${
                        safePage <= 0
                          ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-900/50'
                      }`}
                    >
                      <ChevronLeft size={18} aria-hidden />
                    </button>
                    <span className="text-[10px] font-bold text-slate-500 tabular-nums leading-none">
                      {safePage + 1}/{totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages - 1}
                      title="Trang sau — các mốc cũ hơn"
                      aria-label="Trang sau, mốc cũ hơn"
                      onClick={() => setMilestonesPage((p) => Math.min(totalPages - 1, p + 1))}
                      className={`tt-kbd-focus p-2 rounded-lg border transition-colors ${
                        safePage >= totalPages - 1
                          ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-900/50'
                      }`}
                    >
                      <ChevronRight size={18} aria-hidden />
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      disabled={safePage <= 0}
                      onClick={() => setMilestonesPage((p) => Math.max(0, p - 1))}
                      className={`tt-kbd-focus px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        safePage <= 0
                          ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-900/50'
                      }`}
                    >
                      Trang trước
                    </button>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest tabular-nums">
                      {safePage + 1} / {totalPages}
                    </span>
                    <button
                      type="button"
                      disabled={safePage >= totalPages - 1}
                      onClick={() => setMilestonesPage((p) => Math.min(totalPages - 1, p + 1))}
                      className={`tt-kbd-focus px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                        safePage >= totalPages - 1
                          ? 'bg-slate-900 border-slate-800 text-slate-600 opacity-50 cursor-not-allowed'
                          : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-amber-300 hover:border-amber-900/50'
                      }`}
                    >
                      Trang sau
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar pl-2 pr-2">
        {canReviewTimeline && isReviewOpen && (
          <div className="mb-4 rounded-2xl border border-cyan-800/40 bg-cyan-950/10 p-4">
            <div className="text-[11px] font-bold uppercase tracking-widest text-cyan-300 mb-2">Bộ nhãn ký tự</div>
            <div className="text-xs text-slate-300 font-serif mb-3">
              {MILESTONE_LABELS.map((x) => `${x.bracketToken} ${x.title}`).join(' · ')}
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {MILESTONE_LABELS.map((x) => (
                <button
                  key={x.id}
                  type="button"
                  disabled={selectedCount === 0}
                  onClick={() => applyReviewLabel(x.id)}
                  className="px-2.5 py-1 rounded-lg border border-slate-700 bg-slate-900 text-slate-300 text-[11px] font-bold disabled:opacity-40"
                >
                  Gắn {x.bracketToken}
                </button>
              ))}
              <button
                type="button"
                disabled={selectedCount === 0}
                onClick={() => applyReviewLabel(null)}
                className="px-2.5 py-1 rounded-lg border border-slate-700/60 bg-slate-950/30 text-slate-300 text-[11px] font-bold disabled:opacity-40"
                title="Xóa token nhãn ở đầu event"
              >
                Gỡ nhãn
              </button>
              <button type="button" disabled={selectedCount < 2} onClick={mergeReviewPicked} className="px-2.5 py-1 rounded-lg border border-amber-700/50 bg-amber-950/20 text-amber-300 text-[11px] font-bold disabled:opacity-40">Ghép mốc</button>
              <button type="button" disabled={selectedCount === 0} onClick={deleteReviewPicked} className="px-2.5 py-1 rounded-lg border border-rose-700/50 bg-rose-950/20 text-rose-300 text-[11px] font-bold disabled:opacity-40">Xóa</button>
            </div>
            <div className="text-[11px] text-slate-400 mb-2">Đã chọn: {selectedCount} mốc</div>
            <div className="max-h-[280px] overflow-y-auto custom-scrollbar space-y-3 pr-1">
              {reviewGroups.map((g) => (
                <div key={g.id}>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-1">{g.title} ({g.items.length})</div>
                  {g.items.length === 0 ? (
                    <div className="text-[11px] text-slate-600 italic mb-1">Không có mốc</div>
                  ) : g.items.map((ms) => (
                    <label key={ms.id} className="flex items-start gap-2 text-xs text-slate-200 py-1">
                      <input type="checkbox" checked={reviewPick.has(ms.id)} onChange={() => toggleReviewPick(ms.id)} className="mt-0.5" />
                      <span className="text-slate-500 w-12 flex-shrink-0">Ch.{safeString(ms.chapter)}</span>
                      <span className="line-clamp-2">{safeString(ms.body || ms.event)}</span>
                    </label>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
        {selectedMilestoneId && selectedEntity.milestones?.find((m) => m.id === selectedMilestoneId) ? (() => {
          const selectedMs = selectedEntity.milestones.find((m) => m.id === selectedMilestoneId);
          const selectedParsed = parseMilestoneLabel(selectedMs.event);
          const selectedIsAuto = isAutoOwnerMilestone(selectedMs);
          const fields =
            currentTabConfig && activeTabLon
              ? resolveFieldsTemplate(currentTabConfig, activeTabLon, currentTabConfig._parentLabel || '')
              : currentTabConfig?.fieldsTemplate || DEFAULT_ENTITY_FIELDS;
          const mergedAvatar = selectedMs.snapshot?.avatar || selectedEntity.avatar;
          const fieldIds = fields.map((f) => f.id);
          const chronMilestones = milestonesSorted.slice().reverse(); // oldest -> newest
          const selectedChronIndex = chronMilestones.findIndex((m) => m.id === selectedMilestoneId);
          const prevChronIndex = selectedChronIndex - 1;

          const renderInlineFieldValue = (text, valueClassName = '') => (
            <div className={`leading-relaxed line-clamp-4 ${valueClassName}`}>
              {processInline(
                safeString(text),
                currentContextDirHandle,
                entityMap,
                globalLinkRegex,
                onNavigate
              )}
            </div>
          );

          const buildEffectiveMap = (stopChronIndex) => {
            const eff = {};
            const fieldIdSet = new Set(fieldIds);

            // Base: giá trị profile hiện tại ở trạng thái "chưa có snapshot nào tác động".
            for (const fid of fieldIds) {
              eff[fid] = safeString(getFieldValue(fid, selectedEntity));
            }

            if (stopChronIndex < 0) return eff;

            for (let i = 0; i <= stopChronIndex; i++) {
              const dyn = chronMilestones[i]?.snapshot?.dynamicData;
              if (!dyn) continue;
              for (const [k, v] of Object.entries(dyn)) {
                if (fieldIdSet.has(k)) eff[k] = safeString(v);
              }
            }
            return eff;
          };

          const effectivePrev = buildEffectiveMap(prevChronIndex);
          const effectiveNow = buildEffectiveMap(selectedChronIndex);

          const fieldsForDisplay = fields.filter((f) => isMeaningfulTimelineValue(effectiveNow[f.id]));

          return (
            <div className="animate-fade-in space-y-6">
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[40px] p-8 shadow-2xl overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-600/5 rounded-bl-[40px] pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex-1 pr-6">
                    <div className="flex items-center gap-2 mb-2 text-amber-600/80">
                      <History size={14}/> <span className="text-[10px] uppercase font-bold tracking-widest">Kỷ Nguyên / Sự kiện</span>
                    </div>
                    {selectedParsed.labelId && (
                      <div className="mb-2">
                        <span className={`text-[11px] px-2 py-1 rounded-full border uppercase tracking-wide font-bold ${getLabelBadgeClass(selectedParsed.labelId)}`}>
                          {safeString(labelTitleById.get(selectedParsed.labelId))}
                        </span>
                      </div>
                    )}
                    {selectedIsAuto && (
                      <div className="mb-2">
                        <span className="text-[11px] px-2 py-1 rounded-full border border-emerald-700/50 bg-emerald-950/30 text-emerald-300 uppercase tracking-wide font-bold">
                          AUTO
                        </span>
                      </div>
                    )}
                    <h3 className="text-3xl font-heading font-bold text-amber-500">Giai đoạn chương {safeString(selectedMs.chapter)}</h3>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingMilestoneData(selectedMs); setIsMilestoneModalOpen(true); }} className="p-2.5 bg-slate-950/50 hover:bg-slate-800 hover:text-amber-400 text-slate-500 rounded-xl transition-all border border-slate-800 hover:border-amber-900/50 shadow-sm" title="Sửa lại nội dung"><Edit2 size={18}/></button>
                    <button onClick={() => handleDeleteMilestone(selectedMs.id)} className="p-2.5 bg-slate-950/50 hover:bg-rose-950 hover:text-rose-400 text-slate-500 rounded-xl transition-all border border-slate-800 hover:border-rose-900/50 shadow-sm" title="Xóa mốc thời gian này"><Trash2 size={18}/></button>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none relative z-10 text-[17px] text-slate-200 font-serif leading-loose whitespace-pre-wrap">
                  {renderMarkdown(safeString(selectedParsed.body || selectedMs.event), currentContextDirHandle, entityMap, globalLinkRegex, onNavigate)}
                </div>
              </div>

              <div className="relative mt-8 bg-amber-900/10 backdrop-blur-md border border-amber-700/30 rounded-[40px] p-8 pt-10 shadow-inner">
                <div className="absolute -top-4 left-8 bg-slate-950 px-4 py-1.5 text-[10px] text-amber-500 tracking-widest uppercase font-bold border border-amber-900/50 rounded-full shadow-lg flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></div> Hồ Sơ Thời Kỳ Này
                </div>

                <div className="flex flex-col md:flex-row gap-8 items-start mb-6 border-b border-amber-800/30 pb-6">
                  <div
                    className="w-24 h-24 rounded-2xl bg-slate-950 border-2 border-amber-500/30 overflow-hidden flex-shrink-0 flex items-center justify-center shadow-xl relative group/avatar cursor-zoom-in"
                    onClick={() => mergedAvatar && setLightboxSrc(mergedAvatar)}
                    title="Nhấp để xem ảnh đầy đủ"
                  >
                    {mergedAvatar ? (
                      mergedAvatar.startsWith('local_image:') ? (
                        <AsyncLocalImage filename={mergedAvatar.replace('local_image:', '')} alt="avatar" dirHandle={currentContextDirHandle} className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" />
                      ) : <img src={mergedAvatar} className="w-full h-full object-cover transition-transform duration-500 group-hover/avatar:scale-110" alt="avatar" onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />
                    ) : (
                      <span className="text-3xl font-bold text-amber-500">{safeString(selectedEntity.name).charAt(0)}</span>
                    )}
                  </div>
                  <div>
                    <h4 className="text-2xl font-heading font-bold text-amber-100 mb-1">{safeString(selectedEntity.name)}</h4>
                    <p className="text-xs text-amber-600/80 font-serif italic mb-2">Trạng thái được ghi nhận lúc chương {safeString(selectedMs.chapter)}.</p>
                    {selectedMs.snapshot?.avatar && <span className="px-2 py-1 bg-amber-900/30 text-amber-400 text-[10px] rounded border border-amber-700/50">Có thay đổi hình dáng</span>}
                  </div>
                </div>

                {fieldsForDisplay.length === 0 ? (
                  <div className="h-[220px] flex flex-col items-center justify-center text-slate-600 font-serif italic">
                    Chưa có field đáng ghi nhận ở mốc này.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {fieldsForDisplay.map((f) => {
                      const nowVal = effectiveNow[f.id];
                      const prevVal = effectivePrev[f.id];
                      const isChanged = safeString(nowVal) !== safeString(prevVal);

                      return (
                        <div
                          key={f.id}
                          className={`rounded-2xl p-4 border transition-all ${
                            isChanged ? 'bg-amber-900/10 border-amber-800/40' : 'bg-slate-900/30 border-slate-800/50'
                          }`}
                        >
                          <span className="text-[9px] uppercase tracking-widest font-bold text-amber-400 block mb-2">
                            Hiện tại
                          </span>
                          <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 block mb-2">
                            {safeString(f.label)}
                          </span>
                          {isChanged
                            ? renderInlineFieldValue(nowVal, 'text-sm font-serif text-amber-200')
                            : renderInlineFieldValue(nowVal, 'text-sm font-serif text-slate-400')}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          );
        })() : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 font-serif italic pb-20">
            <div className="relative mb-6">
              <Clock size={64} className="text-slate-800" />
              <Sparkles size={24} className="absolute -top-2 -right-2 text-amber-900/50" />
            </div>
            Chọn một Kỷ nguyên bên trái để lật giở trang sử...
          </div>
        )}
      </div>
    </div>
  );
});
