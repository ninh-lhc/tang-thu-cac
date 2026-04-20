/**
 * AppEntityTemplateFieldEditor.jsx
 * UI tu do them/doi ten/xoa truong va chinh list goi y ngay trong modal Khoi tao the.
 * Ho tro 2 che do luu: 'nho' (chi cho tab nho dang chon) va 'lon' (toan bo tab con
 * trong cung tab lon, dung propagateWithinLon cua handler).
 */
import React, { useMemo, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { WIKI_ALIAS_FIELD } from './MasterEngines.js';

const SCOPE_LOCAL = 'nho';
const SCOPE_AREA = 'lon';

export function AppEntityTemplateFieldEditor({
  tabConfig,
  parentTabId,
  parentLabel,
  handleAddTabTemplateField,
  handleRemoveTabTemplateField,
  handleRenameTabTemplateFieldLabel,
  handleMergeTabFieldSuggestionList,
  setConfirmDialog,
  showToast,
}) {
  const lonId = safeString(parentTabId).trim();
  const nhoId = safeString(tabConfig?.id).trim();
  const nhoLabel = safeString(tabConfig?.label).trim();
  const lonLabel = safeString(parentLabel).trim() || lonId;
  const templateFields = useMemo(() => {
    const list = Array.isArray(tabConfig?.fieldsTemplate) ? tabConfig.fieldsTemplate : [];
    return list.filter((f) => f && safeString(f.id).trim());
  }, [tabConfig]);
  const suggestionLists = tabConfig?.fieldSuggestionLists || {};

  const [isOpen, setIsOpen] = useState(false);
  const [scope, setScope] = useState(SCOPE_LOCAL);
  const [draft, setDraft] = useState('');
  const pathKey = `${lonId}::${nhoId}`;

  if (tabConfig?.viewType !== 'collection-track') return null;
  if (!lonId || !nhoId) return null;
  if (
    typeof handleAddTabTemplateField !== 'function' ||
    typeof handleRemoveTabTemplateField !== 'function' ||
    typeof handleRenameTabTemplateFieldLabel !== 'function' ||
    typeof handleMergeTabFieldSuggestionList !== 'function'
  ) {
    return null;
  }

  const propagate = scope === SCOPE_AREA;
  const opts = { propagateWithinLon: propagate };
  const scopeLabel = propagate
    ? `Toàn bộ tab con thuộc «${lonLabel}»`
    : `Chỉ tab con «${nhoLabel || nhoId}»`;
  const scopeTone = propagate
    ? 'border-violet-600/55 bg-violet-950/35 text-violet-100'
    : 'border-emerald-600/45 bg-emerald-950/30 text-emerald-100';

  const handleAdd = () => {
    const name = safeString(draft).trim();
    if (!name) {
      showToast?.('Nhập tên trường trước khi thêm.', 'warning');
      return;
    }
    handleAddTabTemplateField(lonId, nhoId, name, opts);
    setDraft('');
    if (!propagate) {
      showToast?.(`Đã thêm trường «${name}» cho tab «${nhoLabel || nhoId}».`, 'success');
    }
  };

  const confirmRemove = (field) => {
    const fid = safeString(field?.id).trim();
    if (!fid || fid === WIKI_ALIAS_FIELD.id) return;
    const label = safeString(field?.label) || fid;
    const scopeText = propagate
      ? `toàn bộ tab con trong «${lonLabel}»`
      : `tab con «${nhoLabel || nhoId}»`;
    const openConfirm = typeof setConfirmDialog === 'function'
      ? (payload) => setConfirmDialog(payload)
      : null;
    const run = () => handleRemoveTabTemplateField(lonId, nhoId, fid, opts);
    if (!openConfirm) {
      run();
      return;
    }
    openConfirm({
      isOpen: true,
      title: 'Xóa trường',
      message: `Xóa trường <b>${label}</b> khỏi ${scopeText}? Danh sách gợi ý gắn trường cũng sẽ xóa.`,
      onConfirm: run,
    });
  };

  const scopeButtonClass = (active) =>
    `px-3 py-1.5 text-[11px] font-bold transition-colors ${
      active
        ? 'bg-amber-700/80 text-white'
        : 'bg-slate-950/60 text-slate-300 hover:bg-slate-900/70'
    }`;

  return (
    <div className="rounded-xl border border-amber-900/45 bg-amber-950/10 p-4 space-y-3">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 text-left"
        aria-expanded={isOpen}
      >
        <div>
          <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
            Trường hồ sơ & danh sách gợi ý
          </div>
          <div className="text-[12px] text-slate-300 font-serif mt-1">
            Thêm trường tuỳ chỉnh, đổi tên và chỉnh list gợi ý ngay khi khởi tạo thẻ —
            áp dụng cho tab con hiện tại hoặc toàn bộ tab lớn. Trường «Mục lục danh sách (AUTO)» dùng quy ước I / 1 / 1.1 để sắp thứ tự trong thẻ Danh sách.
          </div>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-amber-800/50 bg-amber-950/40 px-2.5 py-1.5 text-[11px] font-bold text-amber-100 shrink-0">
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isOpen ? 'Thu gọn' : 'Mở chỉnh'}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
              Chế độ lưu
            </span>
            <div className="inline-flex rounded-lg border border-amber-900/55 overflow-hidden">
              <button
                type="button"
                onClick={() => setScope(SCOPE_LOCAL)}
                className={scopeButtonClass(scope === SCOPE_LOCAL)}
                aria-pressed={scope === SCOPE_LOCAL}
                title="Chỉ lưu cho tab con đang mở"
              >
                Cục bộ (tab con)
              </button>
              <button
                type="button"
                onClick={() => setScope(SCOPE_AREA)}
                className={scopeButtonClass(scope === SCOPE_AREA)}
                aria-pressed={scope === SCOPE_AREA}
                title="Lưu cho tất cả tab con trong cùng tab lớn"
              >
                Khu vực (tab lớn)
              </button>
            </div>
            <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${scopeTone}`}>
              {scopeLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[220px] flex-1">
              <label className="block text-[10px] font-bold text-amber-200 uppercase tracking-widest mb-1">
                Thêm trường mới
              </label>
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                placeholder="Ví dụ: Phẩm cấp, Tộc hệ, Chức nghiệp…"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 font-serif outline-none focus:border-amber-600/55"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 rounded-lg border border-amber-700/55 bg-amber-950/35 px-3 py-2 text-[11px] font-bold text-amber-100 hover:bg-amber-900/45"
            >
              <Plus size={12} /> Thêm
            </button>
          </div>

          {templateFields.length === 0 ? (
            <p className="text-[11px] text-amber-100/90 font-serif">
              Chưa có trường nào. Thêm trường đầu tiên để bắt đầu khởi tạo thẻ theo ý bạn.
            </p>
          ) : (
            <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 custom-scrollbar">
              {templateFields.map((field) => {
                const fid = safeString(field?.id).trim();
                if (!fid) return null;
                const isWiki = fid === WIKI_ALIAS_FIELD.id;
                const suggestionLines = Array.isArray(suggestionLists[fid])
                  ? suggestionLists[fid].join('\n')
                  : '';
                const labelDomId = `ttc-entity-field-label-${pathKey}-${fid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                return (
                  <div
                    key={fid}
                    className="rounded-lg border border-slate-800/90 bg-slate-950/55 p-2.5 space-y-2"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">
                            Tên hiển thị (form / mốc)
                          </span>
                          <button
                            type="button"
                            title="Sửa tên hiển thị của trường này"
                            onClick={() => document.getElementById(labelDomId)?.focus()}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-amber-900/40"
                          >
                            <Edit2 size={12} /> Sửa tên
                          </button>
                        </div>
                        <input
                          id={labelDomId}
                          type="text"
                          defaultValue={safeString(field.label)}
                          key={`entity-lab-${pathKey}-${fid}-${safeString(field.label)}`}
                          onBlur={(e) =>
                            handleRenameTabTemplateFieldLabel(lonId, nhoId, fid, e.target.value, opts)
                          }
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-serif"
                          aria-label={`Tên hiển thị trường ${fid}`}
                        />
                      </div>
                      <code
                        className="text-[10px] text-slate-500 shrink-0 max-w-[8rem] truncate"
                        title={fid}
                      >
                        {fid}
                      </code>
                      {!isWiki && (
                        <button
                          type="button"
                          onClick={() => confirmRemove(field)}
                          className="shrink-0 rounded-lg border border-rose-800/50 bg-rose-950/25 px-2 py-1 text-[10px] font-bold text-rose-100 hover:bg-rose-900/35"
                          title={
                            propagate
                              ? 'Xóa trường ở tất cả tab con trong tab lớn'
                              : 'Xóa trường chỉ ở tab con này'
                          }
                        >
                          Xóa
                        </button>
                      )}
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500 mb-1">
                        Danh sách gợi ý — mỗi dòng một mục (hiện ở form / mốc timeline / khởi tạo thẻ)
                      </div>
                      <textarea
                        defaultValue={suggestionLines}
                        key={`entity-sugg-${pathKey}-${fid}-${suggestionLines.length}`}
                        onBlur={(e) =>
                          handleMergeTabFieldSuggestionList(lonId, nhoId, fid, e.target.value, opts)
                        }
                        rows={3}
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 font-mono leading-relaxed"
                        placeholder="Mỗi dòng một giá trị gợi ý…"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[11px] text-slate-500 font-serif leading-relaxed">
            Lưu ý: đổi tên hiển thị / danh sách gợi ý áp dụng ngay khi rời ô (blur). Chế độ
            «Khu vực» sẽ ghi đè cùng trường trên mọi tab con thu thập trong tab lớn — hữu ích
            khi muốn các tab con chia sẻ cùng một bộ trường.
          </p>
        </div>
      )}
    </div>
  );
}
