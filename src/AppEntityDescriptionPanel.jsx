/**
 * Panel "Miêu Tả": danh sách miêu tả theo chương (cột trái) + nội dung chi tiết (cột phải).
 * Mỗi entry là { id, chapter, content }. Sắp xếp theo `chapter` giảm dần (mới nhất trên).
 * Ai import: AppCollectionSection (luồng collection-track).
 * Lưu ý: chỉ render khi collectionSubTab === 'description' và có entity được chọn.
 */
import React, { memo, useEffect } from 'react';
import { FileText, Plus, Edit2, Trash2, BookOpen } from 'lucide-react';
import { renderMarkdown, safeString } from './MasterUtils.jsx';

const EMPTY_LIST = [];

export const AppEntityDescriptionPanel = memo(function AppEntityDescriptionPanel({
  collectionSubTab,
  selectedEntity,
  selectedDescriptionId,
  setSelectedDescriptionId,
  currentContextDirHandle,
  entityMap,
  globalLinkRegex,
  onNavigate,
  setEditingDescriptionData,
  setIsDescriptionModalOpen,
  handleDeleteDescription,
}) {
  const descriptionsAll = Array.isArray(selectedEntity?.descriptions)
    ? selectedEntity.descriptions
    : EMPTY_LIST;

  const descriptionsSorted = React.useMemo(() => {
    if (!descriptionsAll || descriptionsAll.length === 0) return [];
    return [...descriptionsAll].sort((a, b) => {
      const ca = typeof a?.chapter === 'number' ? a.chapter : parseInt(a?.chapter, 10) || 0;
      const cb = typeof b?.chapter === 'number' ? b.chapter : parseInt(b?.chapter, 10) || 0;
      if (cb !== ca) return cb - ca;
      return String(b?.id ?? '').localeCompare(String(a?.id ?? ''));
    });
  }, [descriptionsAll]);

  useEffect(() => {
    if (collectionSubTab !== 'description') return;
    if (!selectedDescriptionId) return;
    const stillExists = descriptionsAll.some((d) => d?.id === selectedDescriptionId);
    if (!stillExists) setSelectedDescriptionId(null);
  }, [collectionSubTab, selectedDescriptionId, descriptionsAll, setSelectedDescriptionId]);

  if (collectionSubTab !== 'description' || !selectedEntity) return null;

  const selected = selectedDescriptionId
    ? descriptionsAll.find((d) => d?.id === selectedDescriptionId) || null
    : null;

  const handleAddNew = () => {
    setEditingDescriptionData(null);
    setIsDescriptionModalOpen(true);
  };

  const handleEditSelected = () => {
    if (!selected) return;
    setEditingDescriptionData(selected);
    setIsDescriptionModalOpen(true);
  };

  return (
    <div className="flex overflow-hidden w-full h-full flex-col md:flex-row pb-10">
      <div className="w-full border-r border-slate-800/80 flex flex-col flex-shrink-0 min-h-0 md:w-44 md:pr-4 md:max-h-[min(85vh,720px)]">
        <div className="flex justify-between items-center mb-4 shrink-0">
          <h3 className="text-xs font-heading font-bold text-amber-500 uppercase tracking-widest">Số Chương</h3>
          <button
            type="button"
            onClick={handleAddNew}
            className="p-1.5 bg-emerald-900/30 text-emerald-400 rounded-full hover:bg-emerald-800/50 transition-colors"
            title="Thêm miêu tả mới"
          >
            <Plus size={14} />
          </button>
        </div>

        {descriptionsSorted.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 opacity-60 border border-dashed border-slate-700 rounded-2xl shrink-0 px-3 text-center">
            <FileText size={20} className="text-slate-600 mb-2" />
            <p className="text-slate-500 italic font-serif text-[11px] leading-relaxed">
              Chưa có miêu tả. Bấm <span className="text-emerald-400 font-bold">+</span> để thêm.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar pr-1">
            <div className="space-y-2">
              {descriptionsSorted.map((d) => {
                const isSelected = selectedDescriptionId === d.id;
                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setSelectedDescriptionId(d.id)}
                    className={`w-full text-center px-3 py-2.5 rounded-xl font-bold uppercase tracking-widest text-xs font-heading transition-all duration-200 border ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-900/50 to-amber-800/30 border-amber-700/60 text-amber-300 shadow-md'
                        : 'bg-slate-900/40 border-slate-800/80 text-slate-400 hover:bg-slate-900 hover:border-slate-700 hover:text-slate-200'
                    }`}
                    title={`Miêu tả tại chương ${safeString(d.chapter)}`}
                  >
                    Chương {safeString(d.chapter)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 overflow-y-auto custom-scrollbar md:pl-6">
        {selected ? (
          <div className="animate-fade-in">
            <div className="relative bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 rounded-[40px] p-8 shadow-2xl overflow-hidden group">
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-600/5 rounded-bl-[40px] pointer-events-none transition-transform duration-700 group-hover:scale-110" />
              <div className="flex justify-end gap-2 mb-4 relative z-[var(--z-local-10)]">
                <button
                  type="button"
                  onClick={handleEditSelected}
                  className="p-2.5 bg-slate-950/50 hover:bg-slate-800 hover:text-amber-400 text-slate-500 rounded-xl transition-all border border-slate-800 hover:border-amber-900/50 shadow-sm"
                  title="Sửa miêu tả"
                >
                  <Edit2 size={18} />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDescription?.(selected.id)}
                  className="p-2.5 bg-slate-950/50 hover:bg-rose-950 hover:text-rose-400 text-slate-500 rounded-xl transition-all border border-slate-800 hover:border-rose-900/50 shadow-sm"
                  title="Xóa miêu tả này"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="prose prose-invert max-w-none relative z-[var(--z-local-10)] text-[17px] text-slate-200 font-serif leading-loose whitespace-pre-wrap">
                {renderMarkdown(
                  safeString(selected.content),
                  currentContextDirHandle,
                  entityMap,
                  globalLinkRegex,
                  onNavigate,
                  selectedEntity?.id
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-600 font-serif italic pb-20 text-center px-4">
            <BookOpen size={64} className="text-slate-800 mb-4" />
            Chọn một chương bên trái để xem miêu tả, hoặc bấm <span className="text-emerald-400 font-bold mx-1">+</span> để thêm mới...
          </div>
        )}
      </div>
    </div>
  );
});
