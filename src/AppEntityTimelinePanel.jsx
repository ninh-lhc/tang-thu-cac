/**
 * Panel timeline thẻ: danh sách mốc (cột trái) + chi tiết mốc (cột phải).
 * Cột mốc dùng @tanstack/react-virtual — tránh render hàng nghìn nút DOM (P0 roadmap).
 * Ai import: AppCollectionSection / luồng collection.
 */
import React, { memo, useState, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { History, Plus, Check, Edit2, Trash2, Clock, Sparkles } from 'lucide-react';
import { DEFAULT_ENTITY_FIELDS, FALLBACK_IMG } from './MasterEngines.js';
import { AsyncLocalImage, renderMarkdown, safeString } from './MasterUtils.jsx';

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

/** Chiều cao ước lượng mỗi hàng mốc (p-4 + 2 dòng + gap); virtualizer dùng làm mặc định. */
const MILESTONE_LIST_ROW_ESTIMATE_PX = 96;

export const AppEntityTimelinePanel = memo(function AppEntityTimelinePanel({
  collectionSubTab,
  selectedEntity,
  selectedMilestoneId,
  setSelectedMilestoneId,
  currentTabConfig,
  currentContextDirHandle,
  entityMap,
  globalLinkRegex,
  onNavigate,
  setEditingMilestoneData,
  setIsMilestoneModalOpen,
  handleMergeSnapshotToProfile,
  handleDeleteMilestone,
  getFieldValue,
  setLightboxSrc,
}) {
  const [showEmptyTimelineFields, setShowEmptyTimelineFields] = useState(false);
  const milestoneListScrollRef = useRef(null);
  const milestones = selectedEntity?.milestones ?? [];

  const rowVirtualizer = useVirtualizer({
    count: milestones.length,
    getScrollElement: () => milestoneListScrollRef.current,
    estimateSize: () => MILESTONE_LIST_ROW_ESTIMATE_PX,
    overscan: 8,
    getItemKey: (index) => milestones[index]?.id ?? index,
  });

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
  }, [selectedMilestoneId, selectedEntity?.id, milestones.length, collectionSubTab]);

  if (collectionSubTab !== 'timeline' || !selectedEntity) return null;

  return (
    <div className="flex gap-8 overflow-hidden max-w-6xl mx-auto h-full flex-col md:flex-row pb-10">
      <div className="w-full md:w-1/3 border-r border-slate-800/80 pr-6 flex flex-col flex-shrink-0 min-h-0 md:max-h-[min(85vh,720px)]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-lg font-heading font-bold text-amber-500">Mốc Sự Kiện</h3>
          <button onClick={() => { setEditingMilestoneData(null); setIsMilestoneModalOpen(true); }} className="p-2 bg-emerald-900/30 text-emerald-400 rounded-[40px] hover:bg-emerald-800/50 transition-colors" title="Thêm mốc mới"><Plus size={16}/></button>
        </div>

        {milestones.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-50 border border-dashed border-slate-700 rounded-[40px] shrink-0">
            <History size={24} className="text-slate-600 mb-2"/>
            <p className="text-slate-500 italic font-serif text-xs">Chưa có Kỷ Nguyên nào...</p>
          </div>
        ) : (
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
                      onClick={() => setSelectedMilestoneId(ms.id)}
                      className={`w-full text-left p-4 rounded-2xl flex items-start gap-4 transition-all duration-300 group ${isSelected ? 'bg-gradient-to-r from-amber-900/40 to-slate-900 border border-amber-700/50 shadow-lg translate-x-2' : 'bg-transparent border border-transparent hover:bg-slate-900 hover:border-slate-800'}`}
                    >
                      <div className={`mt-1 w-3 h-3 rounded-full flex-shrink-0 border-2 flex items-center justify-center transition-colors ${isSelected ? 'bg-amber-400 border-amber-900 shadow-[0_0_10px_var(--t-400)]' : 'bg-slate-800 border-slate-950 group-hover:bg-slate-600'}`}></div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-bold uppercase tracking-widest font-heading mb-1 transition-colors ${isSelected ? 'text-amber-400' : 'text-slate-400 group-hover:text-slate-300'}`}>Chương {safeString(ms.chapter)}</div>
                        <div className={`text-xs font-serif line-clamp-2 leading-relaxed ${isSelected ? 'text-slate-200' : 'text-slate-500 group-hover:text-slate-400'}`}>{safeString(ms.event)}</div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="w-full md:w-2/3 overflow-y-auto custom-scrollbar pl-2 pr-2">
        {selectedMilestoneId && selectedEntity.milestones?.find((m) => m.id === selectedMilestoneId) ? (() => {
          const selectedMs = selectedEntity.milestones.find((m) => m.id === selectedMilestoneId);
          const fields = currentTabConfig?.fieldsTemplate || DEFAULT_ENTITY_FIELDS;
          const mergedAvatar = selectedMs.snapshot?.avatar || selectedEntity.avatar;
          return (
            <div className="animate-fade-in space-y-6">
              <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[40px] p-8 shadow-2xl overflow-hidden group">
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-600/5 rounded-bl-[40px] pointer-events-none transition-transform duration-700 group-hover:scale-110"></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                  <div className="flex-1 pr-6">
                    <div className="flex items-center gap-2 mb-2 text-amber-600/80">
                      <History size={14}/> <span className="text-[10px] uppercase font-bold tracking-widest">Kỷ Nguyên / Sự kiện</span>
                    </div>
                    <h3 className="text-3xl font-heading font-bold text-amber-500">Giai đoạn chương {safeString(selectedMs.chapter)}</h3>
                  </div>
                  <div className="flex gap-2">
                    {selectedMs.snapshot && (Object.values(selectedMs.snapshot.dynamicData || {}).some((v) => v) || selectedMs.snapshot.avatar) && (
                      <button
                        onClick={() => handleMergeSnapshotToProfile(selectedMs.snapshot)}
                        className="px-3 py-2 bg-emerald-900/30 hover:bg-emerald-800/50 text-emerald-400 hover:text-emerald-300 rounded-xl transition-all border border-emerald-700/40 hover:border-emerald-500/60 shadow-sm text-xs font-bold flex items-center gap-1.5"
                        title="Áp dụng thông tin mốc này vào Hồ Sơ hiện tại"
                      >
                        <Check size={14}/> Áp dụng vào Hồ Sơ
                      </button>
                    )}
                    <button onClick={() => { setEditingMilestoneData(selectedMs); setIsMilestoneModalOpen(true); }} className="p-2.5 bg-slate-950/50 hover:bg-slate-800 hover:text-amber-400 text-slate-500 rounded-xl transition-all border border-slate-800 hover:border-amber-900/50 shadow-sm" title="Sửa lại nội dung"><Edit2 size={18}/></button>
                    <button onClick={() => handleDeleteMilestone(selectedMs.id)} className="p-2.5 bg-slate-950/50 hover:bg-rose-950 hover:text-rose-400 text-slate-500 rounded-xl transition-all border border-slate-800 hover:border-rose-900/50 shadow-sm" title="Xóa mốc thời gian này"><Trash2 size={18}/></button>
                  </div>
                </div>
                <div className="prose prose-invert max-w-none relative z-10 text-[17px] text-slate-200 font-serif leading-loose whitespace-pre-wrap">
                  {renderMarkdown(safeString(selectedMs.event), currentContextDirHandle, entityMap, globalLinkRegex, onNavigate)}
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

                <div className="flex justify-end mb-3">
                  <button
                    type="button"
                    onClick={() => setShowEmptyTimelineFields((v) => !v)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-colors ${
                      showEmptyTimelineFields
                        ? 'bg-amber-900/30 border-amber-700/50 text-amber-200'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {showEmptyTimelineFields ? 'Đang hiện field trống' : 'Ẩn field trống'}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {fields
                  .filter((f) => {
                    if (showEmptyTimelineFields) return true;
                    const baseVal = safeString(getFieldValue(f.id, selectedEntity));
                    const snapshotVal = safeString(selectedMs.snapshot?.dynamicData?.[f.id]);
                    const finalVal = snapshotVal || baseVal;
                    return isMeaningfulTimelineValue(finalVal);
                  })
                  .map((f) => {
                    const baseVal = safeString(getFieldValue(f.id, selectedEntity));
                    const snapshotVal = safeString(selectedMs.snapshot?.dynamicData?.[f.id]);
                    const finalVal = snapshotVal || baseVal;
                    const isChanged = !!snapshotVal && snapshotVal !== baseVal;
                    const isNew = !!snapshotVal && !baseVal;
                    const isCurrent = !snapshotVal && !!baseVal;
                    const statusNote = isNew
                      ? { text: '✦ Lần đầu xuất hiện', color: 'text-emerald-400', border: 'border-emerald-700/40', bg: 'bg-emerald-950/30' }
                      : isChanged
                      ? { text: '↑ Tiến bộ / Thay đổi', color: 'text-amber-400', border: 'border-amber-700/40', bg: 'bg-amber-950/20' }
                      : isCurrent
                      ? { text: '● Trạng thái hiện tại', color: 'text-slate-500', border: 'border-slate-700/40', bg: 'bg-slate-900/20' }
                      : null;

                    return (
                      <div key={f.id} className={`rounded-2xl p-4 border transition-all ${isNew ? 'bg-emerald-900/10 border-emerald-800/40' : isChanged ? 'bg-amber-900/10 border-amber-800/40' : 'bg-slate-900/30 border-slate-800/50'}`}>
                        <span className="text-[10px] uppercase tracking-widest font-bold text-slate-500 block mb-2">{safeString(f.label)}</span>
                        {statusNote && (
                          <div className={`inline-flex items-center px-2.5 py-1 rounded-full border mb-2.5 ${statusNote.bg} ${statusNote.border}`}>
                            <span className={`text-[10px] font-serif italic ${statusNote.color}`}>{statusNote.text}</span>
                          </div>
                        )}
                        {isChanged && !isNew && baseVal ? (
                          <div className="space-y-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-[9px] text-slate-600 uppercase font-bold flex-shrink-0">Cũ</span>
                              <span className="text-sm font-serif text-slate-600 line-through leading-relaxed">{baseVal}</span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-[9px] text-amber-600 uppercase font-bold flex-shrink-0">Mới</span>
                              <span className="text-sm font-serif text-amber-200 font-medium leading-relaxed">{snapshotVal}</span>
                            </div>
                          </div>
                        ) : isNew ? (
                          <span className="text-sm font-serif text-emerald-200 font-medium leading-relaxed">{snapshotVal}</span>
                        ) : isMeaningfulTimelineValue(finalVal) ? (
                          <span className="text-sm font-serif text-slate-400 leading-relaxed">{finalVal}</span>
                        ) : (
                          <span className="text-sm font-serif text-slate-700 italic">Chưa ghi nhận</span>
                        )}
                      </div>
                    );
                  })}
                </div>
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
