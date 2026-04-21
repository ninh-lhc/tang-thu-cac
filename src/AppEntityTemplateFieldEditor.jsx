/**
 * AppEntityTemplateFieldEditor.jsx
 * UI them/doi ten/xoa truong va chinh list goi y — dung trong Quan ly tab (khong con trong modal Khoi tao the).
 * Ho tro 2 che do luu: 'nho' (chi cho tab nho dang chon) va 'lon' (toan bo tab con
 * trong cung tab lon, dung propagateWithinLon cua handler).
 */
import React, { useId, useMemo, useState } from 'react';
import { Plus, ChevronDown, ChevronUp, Edit2 } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { WIKI_ALIAS_FIELD } from './MasterEngines.js';
import {
  FIELD_SOURCE_KIND,
  FIELD_SOURCE_OPTIONS,
  NOVEL_METADATA_KEYS,
  filterFieldSourceOptions,
  getFieldSourceDescriptor,
} from './lib/fieldValueSources.js';
import { getGenreTabsTemplate } from './lib/genreTabsTemplateStore.js';

const NOVEL_METADATA_OPTIONS = [
  { key: NOVEL_METADATA_KEYS.GENRES, label: 'Thể loại truyện' },
  { key: NOVEL_METADATA_KEYS.AUTHOR, label: 'Tác giả' },
  { key: NOVEL_METADATA_KEYS.TITLE, label: 'Tên truyện' },
];

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
  /** Pha 2: đặt nguồn giá trị (manual / subTabLabel / siblingTabs / entityNames / mapTypes / mapHierarchy / novelMetadata). */
  handleSetTabFieldSource,
  /** Dùng để biết tên truyện / thể loại khi preview nguồn NOVEL_METADATA. */
  activeNovelData = null,
  setConfirmDialog,
  showToast,
  /** Gộp ô nhập «Mục lục danh sách (AUTO)» vào đúng trường + list gợi ý tab (không tách rời form). */
  outlineMeta = null,
  entityDynamicData = {},
  onPatchEntityDynamic,
  /** Dòng ngữ cảnh nhỏ hiển thị trong panel đã mở (để phân biệt điểm vào: Khởi tạo thẻ vs Quản lý tab). */
  contextHint = '',
  /** Cho phép gọi mở sẵn khi nhúng gần «Gợi ý nhanh» trong Khởi tạo thẻ. */
  defaultOpen = false,
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

  /** Mặc định thu gọn để modal ngắn; mở khi cần chỉnh mẫu tab / list gợi ý.
   *  `defaultOpen=true` khi nhúng ngay dưới «Gợi ý nhanh» — dễ CRUD trường. */
  const [isOpen, setIsOpen] = useState(Boolean(defaultOpen));
  const [scope, setScope] = useState(SCOPE_LOCAL);
  const [draft, setDraft] = useState('');
  const pathKey = `${lonId}::${nhoId}`;
  const outlineDlId = useId().replace(/:/g, '');
  const outlineOid = outlineMeta && safeString(outlineMeta.oid).trim() ? safeString(outlineMeta.oid).trim() : '';
  const outlineLabel = outlineOid ? safeString(outlineMeta.label || outlineOid).trim() : '';
  const outlineSuggestions = Array.isArray(outlineMeta?.sug) ? outlineMeta.sug : [];
  const patchEntity =
    typeof onPatchEntityDynamic === 'function' ? onPatchEntityDynamic : null;

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
    <div className="rounded-lg border border-amber-900/45 bg-amber-950/10 p-2.5 space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left min-h-0"
        aria-expanded={isOpen}
      >
        <div className="min-w-0">
          <div className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
            Trường thông tin (thêm · sửa · xoá)
          </div>
          <div className="text-[11px] text-slate-400 font-serif mt-0.5 leading-snug">
            Mỗi trường có <strong className="text-amber-200">Tên hiển thị</strong> (sửa tuỳ ý) &amp;{' '}
            <strong className="text-amber-200">ID hệ thống</strong> (sinh khi thêm, bất biến — chỉ mất khi xoá trường).
          </div>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-amber-800/50 bg-amber-950/40 px-2 py-1 text-[10px] font-bold text-amber-100 shrink-0">
          {isOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          {isOpen ? 'Thu' : 'Mở'}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2 pt-0.5 border-t border-amber-900/30">
          {safeString(contextHint).trim() && (
            <p className="text-[10px] text-amber-200/75 font-serif leading-snug">
              {contextHint}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[9px] font-bold text-amber-300 uppercase tracking-widest">
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
            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${scopeTone}`}>
              {scopeLabel}
            </span>
          </div>

          <div className="flex flex-wrap items-end gap-1.5">
            <div className="min-w-[180px] flex-1">
              <label className="block text-[9px] font-bold text-amber-200 uppercase tracking-widest mb-0.5">
                Thêm trường
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
                placeholder="Ví dụ: Phẩm cấp, Tộc hệ…"
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-slate-100 font-serif outline-none focus:border-amber-600/55"
              />
            </div>
            <button
              type="button"
              onClick={handleAdd}
              className="inline-flex items-center gap-1 rounded-md border border-amber-700/55 bg-amber-950/35 px-2.5 py-1.5 text-[10px] font-bold text-amber-100 hover:bg-amber-900/45"
            >
              <Plus size={11} /> Thêm
            </button>
          </div>

          {templateFields.length === 0 ? (
            <p className="text-[11px] text-amber-100/90 font-serif">
              Chưa có trường nào. Thêm trường đầu tiên để bắt đầu khởi tạo thẻ theo ý bạn.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-[min(40vh,260px)] overflow-y-auto pr-0.5 custom-scrollbar">
              {templateFields.map((field) => {
                const fid = safeString(field?.id).trim();
                if (!fid) return null;
                const isWiki = fid === WIKI_ALIAS_FIELD.id;
                const isOutlineField = outlineOid && fid === outlineOid;
                const suggestionLines = Array.isArray(suggestionLists[fid])
                  ? suggestionLists[fid].join('\n')
                  : '';
                const labelDomId = `ttc-entity-field-label-${pathKey}-${fid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                const outlineVal = safeString(
                  entityDynamicData && typeof entityDynamicData === 'object' ? entityDynamicData[fid] : ''
                );
                return (
                  <div
                    key={fid}
                    className="rounded-md border border-slate-800/90 bg-slate-950/55 p-2 space-y-1.5"
                  >
                    {isOutlineField && patchEntity && (
                      <div className="rounded-md border border-emerald-800/50 bg-emerald-950/20 p-2 space-y-1.5">
                        <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-300">
                          Giá trị khi tạo thẻ — {outlineLabel || fid}
                        </div>
                        <input
                          aria-label={outlineLabel || 'Mục lục danh sách'}
                          type="text"
                          list={outlineSuggestions.length ? outlineDlId : undefined}
                          value={outlineVal}
                          onChange={(e) => patchEntity({ [fid]: e.target.value })}
                          className="w-full bg-slate-950 border border-emerald-800/55 rounded-md px-2 py-1.5 text-sm text-slate-100 font-serif outline-none focus:border-emerald-500/80"
                          placeholder="I / 1 / 1.1 — cùng mục xếp theo tên thẻ"
                          title="Quy ước I·II·1·1.1 — list mẫu chỉnh ở ô dưới"
                        />
                        {outlineSuggestions.length > 0 && (
                          <datalist id={outlineDlId}>
                            {outlineSuggestions.map((item) => (
                              <option key={item} value={item} />
                            ))}
                          </datalist>
                        )}
                        <p className="text-[10px] text-slate-500 font-serif leading-snug">
                          List gợi ý mẫu (I, 1, 1.1…) sửa ở khung dưới cùng trường.
                        </p>
                        <div className="h-px bg-slate-800/80" />
                        <div className="text-[9px] font-bold uppercase tracking-wide text-amber-200/90">
                          Mẫu tab: nhãn &amp; list gợi ý
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] font-bold uppercase tracking-wide text-amber-200/90">
                            Tên hiển thị
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
                      <div className="shrink-0 flex flex-col items-end gap-0.5 max-w-[10rem]">
                        <span className="text-[9px] font-bold uppercase tracking-wide text-slate-500">
                          ID hệ thống
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            try {
                              navigator.clipboard?.writeText(fid);
                              showToast?.(`Đã copy ID hệ thống: ${fid}`, 'info');
                            } catch {
                              /* ignore */
                            }
                          }}
                          title={`ID hệ thống (bất biến): ${fid} — click để copy`}
                          className="font-mono text-[10px] text-slate-400 bg-slate-950/70 border border-slate-800 rounded px-1.5 py-0.5 hover:text-amber-200 hover:border-amber-800/55 truncate max-w-full"
                        >
                          {fid}
                        </button>
                      </div>
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
                    {!isWiki && typeof handleSetTabFieldSource === 'function' && (
                      <FieldSourceRow
                        lonId={lonId}
                        nhoId={nhoId}
                        fid={fid}
                        tabConfig={tabConfig}
                        activeNovelData={activeNovelData}
                        opts={opts}
                        handleSetTabFieldSource={handleSetTabFieldSource}
                      />
                    )}
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
                        rows={2}
                        className="w-full bg-slate-950 border border-slate-800 rounded-md px-2 py-1 text-[10px] text-slate-200 font-mono leading-relaxed"
                        placeholder="Mỗi dòng một giá trị gợi ý…"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-slate-500 font-serif leading-snug">
            Blur để lưu nhãn/list. «Khu vực» = ghi đè mọi tab con trong tab lớn.
          </p>
        </div>
      )}
    </div>
  );
}

function FieldSourceRow({ lonId, nhoId, fid, tabConfig, activeNovelData, opts, handleSetTabFieldSource }) {
  const descriptor = getFieldSourceDescriptor(tabConfig, fid);
  const currentKind = descriptor.kind || FIELD_SOURCE_KIND.MANUAL;
  const currentMetaKey = safeString(descriptor.metadataKey).trim() || NOVEL_METADATA_KEYS.GENRES;

  /** Pha 6 — lọc option theo ngữ cảnh truyện/tab; nếu kind đã lưu không còn khả dụng
   *  (vd. truyện mới không có tab Bản đồ), vẫn giữ trong select kèm nhãn cảnh báo
   *  để người dùng thấy và đổi sang nguồn khác. */
  const genres = useMemo(() => {
    const raw = activeNovelData?.genres;
    if (Array.isArray(raw)) return raw.map((x) => safeString(x).trim()).filter(Boolean);
    const one = safeString(raw || activeNovelData?.genre || '').trim();
    return one ? [one] : [];
  }, [activeNovelData]);
  const genreTemplate = useMemo(
    () => (genres.length > 0 ? getGenreTabsTemplate(genres) : null),
    [genres]
  );
  const availableOptions = useMemo(
    () => filterFieldSourceOptions({ tabConfig, genreTemplate }),
    [tabConfig, genreTemplate]
  );
  const isOrphanKind = !availableOptions.some((o) => o.kind === currentKind);
  const displayOptions = useMemo(() => {
    if (!isOrphanKind) return availableOptions;
    const orphanBase = FIELD_SOURCE_OPTIONS.find((o) => o.kind === currentKind);
    const orphanLabel = orphanBase
      ? `${orphanBase.label} (không khả dụng)`
      : `${currentKind} (không khả dụng)`;
    return [
      ...availableOptions,
      {
        kind: currentKind,
        label: orphanLabel,
        hint: 'Tab/truyện hiện tại không có dữ liệu cho nguồn này. Chọn nguồn khác hoặc Thủ công.',
      },
    ];
  }, [availableOptions, isOrphanKind, currentKind]);
  const option = displayOptions.find((o) => o.kind === currentKind);

  const commit = (kind, metadataKey) => {
    const payload = { kind };
    if (kind === FIELD_SOURCE_KIND.NOVEL_METADATA) payload.metadataKey = metadataKey || NOVEL_METADATA_KEYS.GENRES;
    handleSetTabFieldSource(lonId, nhoId, fid, payload, opts);
  };

  return (
    <div className="rounded-md border border-sky-900/40 bg-sky-950/20 p-1.5 space-y-1">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[9px] font-bold uppercase tracking-wide text-sky-200/90">
          Nguồn giá trị
        </span>
        <select
          value={currentKind}
          onChange={(e) => commit(e.target.value, currentMetaKey)}
          className={`bg-slate-950 border rounded-md px-1.5 py-0.5 text-[11px] font-serif outline-none focus:border-sky-600/55 ${
            isOrphanKind
              ? 'border-amber-700/70 text-amber-200'
              : 'border-slate-700 text-slate-100'
          }`}
          aria-label={`Nguồn giá trị của trường ${fid}`}
        >
          {displayOptions.map((o) => (
            <option key={o.kind} value={o.kind}>
              {o.label}
            </option>
          ))}
        </select>
        {currentKind === FIELD_SOURCE_KIND.NOVEL_METADATA && (
          <select
            value={currentMetaKey}
            onChange={(e) => commit(currentKind, e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-md px-1.5 py-0.5 text-[11px] text-slate-100 font-serif outline-none focus:border-sky-600/55"
            aria-label={`Khoá metadata của trường ${fid}`}
          >
            {NOVEL_METADATA_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
          </select>
        )}
      </div>
      {option?.hint && (
        <p
          className={`text-[9.5px] leading-snug font-serif ${
            isOrphanKind ? 'text-amber-200/85' : 'text-sky-100/75'
          }`}
        >
          {option.hint}
        </p>
      )}
    </div>
  );
}
