// ==========================================
// EntityTabFieldsCustomizerPanel.jsx
// Purpose: chỉnh fieldsTemplate + fieldSuggestionLists cho đúng tab thu thập, từ modal Khởi tạo thẻ.
// Imported by: MasterComponents.jsx (ModalEntity).
// Notes: gọi handler từ App.jsx (cùng luồng với Quản lý tab, không phải tabsConfig nháp).
// ==========================================

import React, { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { WIKI_ALIAS_FIELD } from './MasterEngines.js';
import { safeString } from './MasterUtils.jsx';

export function EntityTabFieldsCustomizerPanel({
  lonId,
  tabNho,
  parentLonLabel,
  collectionTabCount = 1,
  saveScope,
  onSaveScopeChange,
  onAddField,
  onRemoveField,
  onRenameField,
  onMergeSuggestionList,
  /** Số thứ tự gộp list AUTO + nhãn nhóm (listMergeOrder trên fieldsTemplate). */
  onSetFieldListMergeOrder,
  /** Gộp list gợi ý cho ô nhập nhanh bản đồ (mapEntrySuggestions) — tránh một khối chỉnh riêng trên modal. */
  mapQuickEntryLists = null,
}) {
  const [extraDraft, setExtraDraft] = useState('');
  if (!tabNho || tabNho.viewType !== 'collection-track') return null;

  const tabPathKey = `${lonId}::${tabNho.id}`;
  const templateFields = Array.isArray(tabNho.fieldsTemplate) ? tabNho.fieldsTemplate : [];
  const scopeOpts = () => ({ propagateWithinLon: saveScope === 'lon' });
  const lonScopeLabel = safeString(parentLonLabel) || safeString(lonId);

  return (
    <div className="rounded-2xl border border-cyan-800/40 bg-cyan-950/10 p-4 space-y-3">
      <div className="rounded-lg border border-slate-800/80 bg-slate-950/40 p-2.5 space-y-2">
        <div className="text-[10px] font-bold uppercase tracking-wide text-cyan-300/90">Phạm vi lưu</div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <label className="inline-flex cursor-pointer items-start gap-2 text-[11px] text-slate-300 font-serif leading-snug">
            <input
              type="radio"
              name={`ttc-entity-field-scope-${tabPathKey}`}
              checked={saveScope === 'local'}
              onChange={() => onSaveScopeChange?.('local')}
              className="mt-0.5 rounded border-slate-600"
            />
            <span>
              <strong className="text-cyan-200/95">Cục bộ</strong> — chỉ tab con «{safeString(tabNho.label) || tabNho.id}»
            </span>
          </label>
          <label className="inline-flex cursor-pointer items-start gap-2 text-[11px] text-slate-300 font-serif leading-snug">
            <input
              type="radio"
              name={`ttc-entity-field-scope-${tabPathKey}`}
              checked={saveScope === 'lon'}
              onChange={() => onSaveScopeChange?.('lon')}
              className="mt-0.5 rounded border-slate-600"
            />
            <span>
              <strong className="text-cyan-200/95">Cả tab lớn</strong> — «{lonScopeLabel}» ({collectionTabCount} tab thu thập)
            </span>
          </label>
        </div>
      </div>

      <p className="text-[11px] text-slate-400 font-serif leading-relaxed">
        Thêm / đổi tên / xóa trường và list gợi ý (mỗi dòng một mục).{' '}
        {saveScope === 'lon' ? (
          <>
            <strong className="text-slate-500">Thêm / xóa / đổi tên</strong> kích hoạt AUTO toàn nhánh tab lớn;{' '}
            <strong className="text-slate-500">list gợi ý</strong> ghi cùng nội dung cho mọi tab thu thập trong nhánh.
          </>
        ) : (
          <>Chỉ áp dụng cho tab con hiện tại.</>
        )}{' '}
        <strong className="text-slate-500">Thứ tự dòng trong mỗi list</strong> (dòng trên = ưu tiên trước trong list đó) hỗ trợ AUTO
        cấp 2 khi chưa có list Nhóm tĩnh. <strong className="text-slate-500">STT gộp list AUTO</strong> (ở từng trường) quyết định thứ
        tự ghép các list giữa các trường trên thẻ Danh sách — dùng chung mọi thể loại khi bạn đánh số ít nhất một trường.
        {mapQuickEntryLists ? (
          <>
            {' '}
            Với tab bản đồ / thế lực, chỉnh «Giới Diện» / «Đặc Tính Địa Vực» ở cuối khối. List cấp bậc Thế lực theo thẻ Bản đồ nằm ở «Quy chuẩn nhóm» trên modal (không chỉnh ở đây).
          </>
        ) : null}
      </p>

      <div className="flex flex-wrap items-end gap-2">
        <input
          type="text"
          value={extraDraft}
          onChange={(e) => setExtraDraft(e.target.value)}
          placeholder="Tên trường mới (vd. Phẩm cấp, Tộc hệ)"
          className="min-w-[180px] flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-100 font-serif outline-none focus:border-cyan-600/50"
        />
        <button
          type="button"
          onClick={() => {
            const raw = safeString(extraDraft).trim();
            if (!raw || typeof onAddField !== 'function') return;
            onAddField(raw, scopeOpts());
            setExtraDraft('');
          }}
          className="rounded-lg border border-cyan-700/50 bg-cyan-950/35 px-3 py-2 text-[11px] font-bold text-cyan-100 hover:bg-cyan-900/45"
        >
          Thêm trường
        </button>
      </div>

      <div className="space-y-2 max-h-[min(40vh,320px)] overflow-y-auto pr-1 custom-scrollbar">
        {templateFields.map((field) => {
          const fid = safeString(field?.id).trim();
          if (!fid) return null;
          const isWiki = fid === WIKI_ALIAS_FIELD.id;
          const suggestionLines = (tabNho.fieldSuggestionLists?.[fid] || []).join('\n');
          const labelDomId = `entity-tab-field-label-${tabPathKey}-${fid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
          return (
            <div key={fid} className="rounded-lg border border-slate-800/90 bg-slate-950/50 p-2 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">Tên hiển thị</span>
                    <button
                      type="button"
                      title="Đặt focus vào ô tên"
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
                    key={`entity-lab-${tabPathKey}-${fid}-${safeString(field.label)}`}
                    onBlur={(e) => typeof onRenameField === 'function' && onRenameField(fid, e.target.value, scopeOpts())}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 font-serif outline-none focus:border-amber-600/45"
                    aria-label={`Tên hiển thị trường ${fid}`}
                  />
                </div>
                <code className="text-[10px] text-slate-500 shrink-0 max-w-[7rem] truncate" title={fid}>
                  {fid}
                </code>
                {!isWiki && typeof onSetFieldListMergeOrder === 'function' && (
                  <label className="flex flex-col gap-0.5 shrink-0">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-cyan-500/90 whitespace-nowrap">
                      STT gộp list
                    </span>
                    <input
                      type="number"
                      title="Số nhỏ = gộp list AUTO trước. Để trống = xếp sau các trường đã đánh số."
                      defaultValue={
                        typeof field.listMergeOrder === 'number' && Number.isFinite(field.listMergeOrder)
                          ? field.listMergeOrder
                          : ''
                      }
                      key={`entity-merge-ord-${tabPathKey}-${fid}-${field.listMergeOrder ?? 'none'}`}
                      onBlur={(e) => onSetFieldListMergeOrder(fid, e.target.value, scopeOpts())}
                      className="w-14 bg-slate-950 border border-slate-700 rounded-lg px-1.5 py-1 text-[11px] text-slate-100 font-mono outline-none focus:border-cyan-600/45"
                    />
                  </label>
                )}
                {!isWiki && typeof onRemoveField === 'function' && (
                  <button
                    type="button"
                    onClick={() => {
                      if (
                        !window.confirm(
                          saveScope === 'lon'
                            ? `Xóa trường «${safeString(field.label)}» khỏi mọi tab thu thập trong «${lonScopeLabel}»? Gợi ý gắn trường cũng sẽ xóa.`
                            : `Xóa trường «${safeString(field.label)}» khỏi tab này? Gợi ý gắn trường cũng sẽ xóa.`
                        )
                      )
                        return;
                      onRemoveField(fid, scopeOpts());
                    }}
                    className="shrink-0 rounded-lg border border-rose-800/50 bg-rose-950/25 px-2 py-1 text-[10px] font-bold text-rose-100 hover:bg-rose-900/35"
                  >
                    Xóa
                  </button>
                )}
              </div>
              <div>
                <div className="text-[10px] text-slate-500 mb-1 font-serif">
                  Danh sách gợi ý / chọn — mỗi dòng một mục (dòng 1, 2, 3… = thứ tự trong nhóm này)
                </div>
                <textarea
                  defaultValue={suggestionLines}
                  key={`entity-sugg-${tabPathKey}-${fid}-${suggestionLines}`}
                  onBlur={(e) =>
                    typeof onMergeSuggestionList === 'function' &&
                    onMergeSuggestionList(fid, e.target.value, scopeOpts())
                  }
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 font-mono leading-relaxed outline-none focus:border-cyan-700/50"
                />
              </div>
            </div>
          );
        })}
      </div>

      {mapQuickEntryLists &&
        typeof mapQuickEntryLists.onSaveTypes === 'function' &&
        typeof mapQuickEntryLists.onSaveHierarchy === 'function' && (
        <div className="rounded-lg border border-slate-800/80 bg-slate-950/35 p-3 space-y-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-cyan-300/90">
            List gợi ý nhập nhanh (Bản đồ / Thế lực)
          </div>
          <p className="text-[11px] text-slate-500 font-serif leading-relaxed">
            Mỗi dòng một mục; lưu khi rời ô. Áp dụng lần tạo / sửa thẻ sau (đồng bộ nhánh bản đồ + mẫu thể loại như Quản lý tab).
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-cyan-300/85">Giới Diện</span>
              <textarea
                rows={4}
                defaultValue={safeString(mapQuickEntryLists.typesLines)}
                key={`entity-panel-map-types-${tabPathKey}-${safeString(mapQuickEntryLists.typesLines)}`}
                onBlur={(e) => mapQuickEntryLists.onSaveTypes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-[11px] text-slate-200 font-mono leading-relaxed outline-none focus:border-cyan-600/45"
                placeholder={'Ví dụ:\nGiới\nTinh cầu\nĐại lục'}
              />
            </label>
            <label className="space-y-1">
              <span className="block text-[10px] font-bold uppercase tracking-wide text-cyan-300/85">Đặc Tính Địa Vực</span>
              <textarea
                rows={4}
                defaultValue={safeString(mapQuickEntryLists.hierarchyLines)}
                key={`entity-panel-map-hierarchy-${tabPathKey}-${safeString(mapQuickEntryLists.hierarchyLines)}`}
                onBlur={(e) => mapQuickEntryLists.onSaveHierarchy(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-[11px] text-slate-200 font-mono leading-relaxed outline-none focus:border-cyan-600/45"
                placeholder={'Ví dụ:\nCửu cấp\nVương giới\nTôn giới'}
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}
