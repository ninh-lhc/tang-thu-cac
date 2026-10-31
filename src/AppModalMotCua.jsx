/**
 * Modal "Một cửa cập nhật" — tạo thẻ nhanh + phân tích nhật ký batch.
 *
 * State & handler: App.jsx truyền props (hubCreate*, hubUpdate*, runHub*, v.v.).
 */
import React from 'react';
import { X, Layers, Sparkles } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { resolveFieldsTemplate } from './MasterEngines.js';
import { useFocusTrap } from './lib/useFocusTrap.js';

export function AppModalMotCua({
  activeNovelData,
  onClose,
  overviewHubTab,
  setOverviewHubTab,
  hubCreatePath,
  setHubCreatePath,
  hubCreateInput,
  setHubCreateInput,
  hubCreateBusy,
  hubCreatePreview,
  setHubCreatePreview,
  hubUpdateChapter,
  setHubUpdateChapter,
  hubUpdateText,
  setHubUpdateText,
  hubUpdatePanel,
  setHubUpdatePanel,
  activeTabs,
  hubRunCreateAi,
  hubSaveCreateEntity,
  runHubUpdateAi,
  applyHubUpdateSelected,
  findEntitiesByXrefHint,
}) {
  const trapRef = useFocusTrap(Boolean(activeNovelData));
  if (!activeNovelData) return null;

  return (
    <div
      className="fixed inset-0 z-[var(--z-modal-hub)] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4 animate-fade-in"
      onClick={() => !hubCreateBusy && !hubUpdatePanel?.loading && onClose()}
      role="dialog"
      aria-modal="true"
      aria-label="Một cửa cập nhật"
    >
      <div
        ref={trapRef}
        className="bg-slate-900 border border-violet-800/45 rounded-2xl w-full max-w-2xl max-h-[min(92vh,720px)] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-slate-800 flex justify-between items-center gap-3 bg-slate-950/80">
          <div className="flex items-center gap-2 min-w-0">
            <Layers size={22} className="text-violet-400 flex-shrink-0" />
            <div>
              <h2 className="font-heading text-lg text-violet-100">Một cửa cập nhật</h2>
              <p className="text-[10px] text-slate-500 font-serif truncate">{safeString(activeNovelData.title)}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={hubCreateBusy || hubUpdatePanel?.loading}
            onClick={onClose}
            className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 disabled:opacity-40"
            aria-label="Đóng"
          >
            <X size={20} />
          </button>
        </div>
        <div className="flex border-b border-slate-800">
          <button
            type="button"
            onClick={() => setOverviewHubTab('create')}
            className={`flex-1 py-3 text-sm font-heading font-bold transition-colors ${overviewHubTab === 'create' ? 'text-violet-300 border-b-2 border-violet-500 bg-violet-950/25' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Tạo mới
          </button>
          <button
            type="button"
            onClick={() => setOverviewHubTab('update')}
            className={`flex-1 py-3 text-sm font-heading font-bold transition-colors ${overviewHubTab === 'update' ? 'text-emerald-300 border-b-2 border-emerald-500 bg-emerald-950/20' : 'text-slate-500 hover:text-slate-300'}`}
          >
            Cập nhật
          </button>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 min-h-[200px]">
          {overviewHubTab === 'create' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-serif leading-relaxed">
                Chọn mục → dán hoặc gõ mô tả. AI điền tên và các trường để tạo thẻ nhanh.{' '}
                <b className="text-slate-400">Không tạo liên kết wiki hay ảnh</b> — muốn link/avatar thì vào đúng mục → thẻ.
              </p>
              <div>
                <label className="text-[10px] uppercase text-slate-500 font-bold tracking-wider">Mục sưu tập</label>
                <select
                  className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 focus:border-violet-600/50 outline-none font-serif"
                  value={hubCreatePath}
                  onChange={(e) => setHubCreatePath(e.target.value)}
                >
                  <option value="">— Chọn —</option>
                  {activeTabs
                    .filter((lon) => lon.id !== 'tong-quan')
                    .flatMap((lon) =>
                      (lon.subTabs || [])
                        .filter((n) => n.viewType === 'collection-track')
                        .map((n) => (
                          <option key={`${lon.id}|${n.id}`} value={`${lon.id}|${n.id}`}>
                            {safeString(lon.label)} › {safeString(n.label)}
                          </option>
                        ))
                    )}
                </select>
              </div>
              <textarea
                className="w-full min-h-[100px] bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 font-serif focus:border-violet-600/40 outline-none resize-y"
                placeholder="Dán đoạn mô tả nhân vật, pháp bảo, cảnh giới..."
                value={hubCreateInput}
                onChange={(e) => setHubCreateInput(e.target.value)}
              />
              <button
                type="button"
                disabled={hubCreateBusy || !hubCreatePath}
                onClick={() => hubRunCreateAi()}
                className="w-full py-2.5 rounded-xl bg-violet-800 hover:bg-violet-700 disabled:opacity-50 text-white font-heading text-sm flex items-center justify-center gap-2"
              >
                {hubCreateBusy ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Sparkles size={16} />}
                Phân tích AI (tạo thẻ nhanh)
              </button>
              {hubCreatePreview && (() => {
                const [hlon, hnho] = hubCreatePath.split('|');
                const hlonObj = activeTabs.find((t) => t.id === hlon);
                const hnhoObj = hlonObj?.subTabs?.find((s) => s.id === hnho);
                const ft = hnhoObj
                  ? resolveFieldsTemplate(hnhoObj, hlon, hlonObj?.label || '')
                  : [];
                return (
                  <div className="rounded-xl border border-violet-900/40 bg-slate-950/60 p-4 space-y-3 mt-2">
                    <p className="text-[10px] text-amber-700/90 font-serif">Duyệt rồi bấm Lưu. Đã bỏ qua avatar từ AI.</p>
                    <div>
                      <label className="text-[10px] uppercase text-slate-500">Tên thẻ *</label>
                      <input
                        className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-amber-100 font-serif text-sm"
                        value={hubCreatePreview.name}
                        onChange={(e) =>
                          setHubCreatePreview((p) => (p ? { ...p, name: e.target.value } : p))
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase text-slate-500">Bản thảo (text)</label>
                      <textarea
                        className="mt-1 w-full min-h-[72px] bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-300 font-serif"
                        value={hubCreatePreview.rawText}
                        onChange={(e) =>
                          setHubCreatePreview((p) => (p ? { ...p, rawText: e.target.value } : p))
                        }
                      />
                    </div>
                    {ft.map((f) => (
                      <div key={f.id}>
                        <label className="text-[10px] uppercase text-slate-500">{safeString(f.label)}</label>
                        <input
                          className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 font-serif"
                          value={safeString(hubCreatePreview.dynamicData[f.id])}
                          onChange={(e) =>
                            setHubCreatePreview((p) =>
                              p
                                ? {
                                    ...p,
                                    dynamicData: { ...p.dynamicData, [f.id]: e.target.value },
                                  }
                                : p
                            )
                          }
                        />
                      </div>
                    ))}
                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => hubSaveCreateEntity()}
                        className="flex-1 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm"
                      >
                        Lưu thẻ
                      </button>
                      <button
                        type="button"
                        onClick={() => setHubCreatePreview(null)}
                        className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-400 text-sm hover:bg-slate-800"
                      >
                        Phân tích lại
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
          {overviewHubTab === 'update' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-500 font-serif leading-relaxed">
                Giống nhật ký nhanh: AI tách gợi ý (chữ thường).{' '}
                <b className="text-slate-400">Không tạo [[liên kết wiki]] hay ảnh</b> — muốn link/avatar thì vào đúng mục → thẻ.
              </p>
              <div className="flex gap-2 items-end flex-wrap">
                <div>
                  <label className="text-[10px] uppercase text-slate-500">Chương</label>
                  <input
                    type="number"
                    min="0"
                    className="mt-1 w-24 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-emerald-100"
                    value={hubUpdateChapter}
                    onChange={(e) => setHubUpdateChapter(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setHubUpdateChapter(
                      String(
                        Math.max(
                          0,
                          parseInt(
                            activeNovelData.readingAnchorChapter ?? activeNovelData.chaptersRead ?? 0,
                            10
                          ) || 0
                        )
                      )
                    )
                  }
                  className="text-xs text-slate-500 hover:text-emerald-400 font-serif mb-1"
                >
                  = neo
                </button>
              </div>
              <textarea
                className="w-full min-h-[100px] bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-slate-200 font-serif"
                placeholder="ch.200: …"
                value={hubUpdateText}
                onChange={(e) => setHubUpdateText(e.target.value)}
              />
              <button
                type="button"
                disabled={hubUpdatePanel?.loading}
                onClick={() => runHubUpdateAi()}
                className="w-full py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-700 disabled:opacity-50 text-white font-heading text-sm flex items-center justify-center gap-2"
              >
                {hubUpdatePanel?.loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Sparkles size={16} />
                )}
                Phân tích & hiện gợi ý
              </button>
              {hubUpdatePanel && !hubUpdatePanel.loading && hubUpdatePanel.error && (
                <p className="text-rose-400 text-sm">{hubUpdatePanel.error}</p>
              )}
              {hubUpdatePanel && !hubUpdatePanel.loading && hubUpdatePanel.suggestions?.length > 0 && (
                <div className="space-y-2 max-h-[280px] overflow-y-auto custom-scrollbar border border-slate-800 rounded-xl p-2 bg-slate-950/50">
                  {hubUpdatePanel.suggestions.map((sug, idx) => {
                    const key = `j-${idx}`;
                    const kind = safeString(sug.kind).toLowerCase().replace(/\s/g, '_');
                    const kindLabel =
                      kind === 'new_entity'
                        ? 'Tạo thẻ'
                        : kind === 'milestone'
                          ? 'Mốc'
                          : kind === 'update_profile'
                            ? 'Hồ sơ'
                            : kind;
                    const matches =
                      kind === 'milestone' || kind === 'update_profile'
                        ? findEntitiesByXrefHint(sug.entityHint)
                        : [];
                    return (
                      <label
                        key={key}
                        className={`flex gap-2 items-start rounded-lg border p-2 cursor-pointer text-xs ${hubUpdatePanel.selectedKeys.has(key) ? 'border-emerald-700/50 bg-emerald-950/15' : 'border-slate-800'}`}
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 rounded border-slate-600 text-emerald-600"
                          checked={hubUpdatePanel.selectedKeys.has(key)}
                          onChange={() =>
                            setHubUpdatePanel((p) => {
                              if (!p) return p;
                              const next = new Set(p.selectedKeys);
                              if (next.has(key)) next.delete(key);
                              else next.add(key);
                              return { ...p, selectedKeys: next };
                            })
                          }
                        />
                        <span>
                          <span className="font-bold text-emerald-600/90">{kindLabel}</span>{' '}
                          {kind === 'new_entity' ? safeString(sug.suggestedName) : matches[0] ? safeString(matches[0].ent.name) : safeString(sug.entityHint)}
                          {safeString(sug.why) && (
                            <span className="text-slate-500 block mt-0.5">{safeString(sug.why)}</span>
                          )}
                          {(kind === 'milestone' || kind === 'update_profile') &&
                            safeString(sug.entityHint) &&
                            matches.length === 0 && (
                              <span className="text-amber-700 block mt-0.5">Không khớp thẻ — sẽ lỗi khi áp</span>
                            )}
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
              {hubUpdatePanel && !hubUpdatePanel.loading && hubUpdatePanel.suggestions?.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-between items-center pt-2">
                  <button
                    type="button"
                    className="text-xs text-slate-500"
                    onClick={() =>
                      setHubUpdatePanel((p) =>
                        p
                          ? {
                              ...p,
                              selectedKeys: new Set(p.suggestions.map((_, i) => `j-${i}`)),
                            }
                          : p
                      )
                    }
                  >
                    Chọn tất cả
                  </button>
                  <button
                    type="button"
                    onClick={() => applyHubUpdateSelected()}
                    disabled={!hubUpdatePanel.selectedKeys?.size}
                    className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:opacity-40 text-white font-bold text-sm"
                  >
                    Áp dụng ({hubUpdatePanel.selectedKeys.size})
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
