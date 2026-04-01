/**
 * Modal gợi ý AI từ ghi chú nối tra cứu (cross-ref).
 *
 * State: xrefAiPanel từ App.jsx. Callbacks applyXrefSuggestion* cũng từ App.
 */
import React from 'react';
import { X, Sparkles } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { useFocusTrap } from './lib/useFocusTrap.js';

export function AppModalGoiYNoiTraCuu({
  panel,
  onClose,
  findEntitiesByXrefHint,
  applyXrefSuggestionNewEntity,
  applyXrefSuggestionMilestone,
  applyXrefSuggestionProfile,
  activeNovelData,
}) {
  const trapRef = useFocusTrap(Boolean(panel));
  if (!panel) return null;

  return (
    <div
      className="fixed inset-0 z-[210] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Gợi ý nối tra cứu"
    >
      <div
        ref={trapRef}
        className="bg-slate-900 border border-amber-700/40 rounded-2xl w-full max-w-lg max-h-[min(85vh,560px)] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-start gap-3">
          <div className="min-w-0">
            <h3 className="font-heading text-lg text-amber-400 flex items-center gap-2">
              <Sparkles size={18} className="flex-shrink-0" /> Gợi ý từ nối tra cứu
            </h3>
            <p className="text-xs text-slate-500 font-serif mt-1 tabular-nums">
              Ch.{panel.xref.fromCh} → Ch.{panel.xref.toCh}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-500 hover:text-white p-1 rounded-lg hover:bg-slate-800 flex-shrink-0"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-4 py-2 text-sm text-slate-400 font-serif border-b border-slate-800/80 max-h-20 overflow-y-auto custom-scrollbar">
          {safeString(panel.xref.note)}
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3 min-h-[120px]">
          {panel.loading && (
            <div className="flex flex-col items-center gap-3 py-10">
              <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
              <p className="text-sm text-slate-500">Đang phân tích ghi chú…</p>
            </div>
          )}
          {panel.error && <p className="text-rose-400 text-sm">{panel.error}</p>}
          {!panel.loading && !panel.error && panel.suggestions.length === 0 && (
            <p className="text-slate-500 text-sm italic text-center py-8 leading-relaxed">
              Không có gợi ý thao tác — có thể ghi chú chỉ để tra cứu chéo.
            </p>
          )}
          {!panel.loading &&
            !panel.error &&
            panel.suggestions.map((sug, idx) => {
              const kind = safeString(sug.kind).toLowerCase().replace(/\s/g, '_');
              const matches =
                kind === 'milestone' || kind === 'update_profile' ? findEntitiesByXrefHint(sug.entityHint) : [];
              const kindLabel =
                kind === 'new_entity'
                  ? 'Thẻ mới'
                  : kind === 'milestone'
                    ? 'Mốc timeline'
                    : kind === 'update_profile'
                      ? 'Cập nhật hồ sơ'
                      : safeString(sug.kind);
              return (
                <div key={idx} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-amber-600/90 tracking-wider">{kindLabel}</span>
                  {safeString(sug.why) && (
                    <p className="text-sm text-slate-300 leading-snug">{safeString(sug.why)}</p>
                  )}
                  {kind === 'new_entity' && (
                    <button
                      type="button"
                      onClick={() => applyXrefSuggestionNewEntity(sug, panel.xref)}
                      className="w-full py-2.5 rounded-xl bg-amber-800/80 hover:bg-amber-700 text-white text-sm font-bold font-heading transition-colors"
                    >
                      Mở form tạo: {safeString(sug.suggestedName) || 'Thẻ mới'}
                    </button>
                  )}
                  {(kind === 'milestone' || kind === 'update_profile') && !safeString(sug.entityHint) && (
                    <p className="text-xs text-amber-700/90">Thiếu tên thẻ gợi ý từ AI.</p>
                  )}
                  {(kind === 'milestone' || kind === 'update_profile') &&
                    safeString(sug.entityHint) &&
                    matches.length === 0 && (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Không khớp thẻ «{safeString(sug.entityHint)}» trong danh mục — thử tạo thẻ mới hoặc đổi tên trong
                        ghi chú rồi gợi ý lại.
                      </p>
                    )}
                  {kind === 'milestone' &&
                    matches.slice(0, 6).map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyXrefSuggestionMilestone(m, sug, panel.xref)}
                        className="w-full text-left py-2 px-3 rounded-xl bg-cyan-950/50 border border-cyan-900/40 hover:border-cyan-600/50 text-sm text-cyan-200/95 transition-colors"
                      >
                        <span className="text-cyan-600/80 text-xs font-sans uppercase">
                          Thêm mốc · ch.
                          {parseInt(sug.chapter, 10) >= 0 ? sug.chapter : panel.xref.fromCh}
                        </span>
                        <br />
                        <span className="font-medium">{safeString(m.ent.name)}</span>
                        <span className="text-slate-500 text-xs ml-1">
                          ({safeString(sug.eventText).slice(0, 80)}
                          {safeString(sug.eventText).length > 80 ? '…' : ''})
                        </span>
                      </button>
                    ))}
                  {kind === 'update_profile' &&
                    matches.slice(0, 6).map((m, i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => applyXrefSuggestionProfile(m, sug, activeNovelData)}
                        className="w-full text-left py-2 px-3 rounded-xl bg-emerald-950/40 border border-emerald-900/40 hover:border-emerald-600/50 text-sm text-emerald-200/95 transition-colors"
                      >
                        Sửa hồ sơ: <span className="font-medium">{safeString(m.ent.name)}</span>
                      </button>
                    ))}
                </div>
              );
            })}
        </div>
        <p className="px-4 py-2.5 text-[10px] text-slate-600 text-center border-t border-slate-800/80 leading-relaxed">
          Chỉ mở form — không tự lưu. Bạn xác nhận khi bấm Lưu trong modal thẻ / mốc.
        </p>
      </div>
    </div>
  );
}
