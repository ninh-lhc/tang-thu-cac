/**
 * AppEntityTemplateFieldEditor.jsx
 * UI thêm/đổi tên/xoá trường + chỉnh ký hiệu sắp xếp + list gợi ý.
 * Hiện CHỈ nhúng trong modal «Khởi tạo thẻ» (ModalEntity) — không còn xuất hiện trong
 * «Quản lý tab» (cải tạo thư mục) để tránh lặp UI; user chỉnh template ngay khi đang tạo/sửa thẻ.
 * Hỗ trợ 2 chế độ lưu: 'nho' (chỉ tab con đang chọn) và 'lon' (toàn bộ tab con trong cùng tab lớn,
 * dùng `propagateWithinLon` của handler).
 */
import React, { useEffect, useId, useMemo, useState } from 'react';
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
import {
  normalizeSuggestionRows,
  serializeSuggestionRows,
} from './lib/suggestionRowFormat.js';

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
  handleSetTabTemplateFieldSortPrefix,
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
  const suggestionLists = tabConfig?.fieldSuggestionLists;

  /** Mặc định thu gọn (vd. tổng quan) hoặc mở theo `defaultOpen` (tab sưu tập: đồng bộ giao diện Khởi tạo thẻ). */
  const [isOpen, setIsOpen] = useState(Boolean(defaultOpen));
  const [scope, setScope] = useState(SCOPE_LOCAL);
  const [draft, setDraft] = useState('');
  const [suggestionRowsByField, setSuggestionRowsByField] = useState({});
  const pathKey = `${lonId}::${nhoId}`;
  const outlineDlId = useId().replace(/:/g, '');
  const outlineOid = outlineMeta && safeString(outlineMeta.oid).trim() ? safeString(outlineMeta.oid).trim() : '';
  const outlineLabel = outlineOid ? safeString(outlineMeta.label || outlineOid).trim() : '';
  const outlineSuggestions = Array.isArray(outlineMeta?.sug) ? outlineMeta.sug : [];
  const patchEntity =
    typeof onPatchEntityDynamic === 'function' ? onPatchEntityDynamic : null;

  // Chữ ký nội dung các list hiện lưu trên tab (ổn định qua render).
  // Chỉ đồng bộ lại draft-rows khi nội dung thật sự đổi — tránh `|| {}` tạo ref mới
  // làm useEffect chạy lại và xoá mất dòng user vừa bấm "+ Dòng".
  const suggestionListsSignature = useMemo(() => {
    const src = suggestionLists && typeof suggestionLists === 'object' ? suggestionLists : {};
    const out = {};
    templateFields.forEach((field) => {
      const fid = safeString(field?.id).trim();
      if (!fid) return;
      const list = Array.isArray(src[fid]) ? src[fid] : [];
      out[fid] = list.map((x) => safeString(x)).join('\n');
    });
    return JSON.stringify(out);
  }, [suggestionLists, templateFields]);

  useEffect(() => {
    const src = suggestionLists && typeof suggestionLists === 'object' ? suggestionLists : {};
    const next = {};
    templateFields.forEach((field) => {
      const fid = safeString(field?.id).trim();
      if (!fid) return;
      const list = Array.isArray(src[fid]) ? src[fid] : [];
      next[fid] = normalizeSuggestionRows(list);
    });
    setSuggestionRowsByField(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionListsSignature, pathKey]);

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
    `flex-1 min-w-0 min-h-[2.5rem] px-2 sm:px-2.5 py-1.5 text-sm font-semibold leading-tight text-center transition-colors ${
      active
        ? 'bg-amber-700/80 text-white'
        : 'bg-slate-950/60 text-slate-300 hover:bg-slate-900/70'
    }`;

  return (
    <div className="rounded-lg border border-amber-900/40 bg-amber-950/10 p-3 space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-left min-h-0"
        aria-expanded={isOpen}
        title="Tên hiển thị sửa tùy ý; ID hệ thống sinh khi thêm, không đổi trừ khi xoá trường."
      >
        <div className="min-w-0">
          <div className="text-xs font-bold text-amber-300 uppercase tracking-widest">
            Trường thông tin (thêm · sửa · xoá)
          </div>
        </div>
        <span className="inline-flex items-center gap-0.5 rounded-md border border-amber-800/45 bg-amber-950/35 px-2 py-1 text-xs font-bold text-amber-100/95 shrink-0">
          {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          {isOpen ? 'Thu' : 'Mở'}
        </span>
      </button>

      {isOpen && (
        <div className="space-y-2 pt-2 border-t border-amber-900/30">
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-amber-300/90 uppercase tracking-widest">Chế độ lưu</div>
            <div className="grid grid-cols-2 gap-0 rounded-lg border border-amber-900/50 overflow-hidden w-full min-h-[2.35rem]">
              <button
                type="button"
                onClick={() => setScope(SCOPE_LOCAL)}
                className={scopeButtonClass(scope === SCOPE_LOCAL)}
                aria-pressed={scope === SCOPE_LOCAL}
                title="Chỉ lưu cho tab con đang mở"
              >
                Cục bộ
              </button>
              <button
                type="button"
                onClick={() => setScope(SCOPE_AREA)}
                className={scopeButtonClass(scope === SCOPE_AREA)}
                aria-pressed={scope === SCOPE_AREA}
                title="Lưu mọi tab con cùng tab lớn"
              >
                Khu vực
              </button>
            </div>
            <p className={`text-[11px] font-medium leading-tight break-words rounded border px-2 py-1 ${scopeTone}`}>
              {scopeLabel}
            </p>
          </div>

          <div className="flex flex-wrap items-stretch gap-2">
            <div className="min-w-[min(100%,10rem)] flex-1">
              <label className="block text-[11px] font-bold text-amber-200/90 uppercase tracking-widest mb-1">
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
                className="w-full bg-slate-950 border border-slate-700 rounded-md px-2.5 py-2 text-sm text-slate-100 font-serif outline-none focus:border-amber-600/55"
              />
            </div>
            <div className="flex items-end">
              <button
                type="button"
                onClick={handleAdd}
                className="inline-flex h-9 items-center gap-1 rounded-md border border-amber-700/55 bg-amber-950/40 px-3 text-sm font-bold text-amber-100 hover:bg-amber-900/45"
                title="Thêm trường vào mẫu (theo chế độ lưu)"
              >
                <Plus size={14} />
                <span>Thêm</span>
              </button>
            </div>
          </div>

          {templateFields.length === 0 ? (
            <p className="text-[11px] text-amber-100/90 font-serif">
              Chưa có trường nào. Thêm trường đầu tiên để bắt đầu khởi tạo thẻ theo ý bạn.
            </p>
          ) : (
            <div className="space-y-2 max-h-[min(40vh,260px)] overflow-y-auto pr-0.5 custom-scrollbar">
              {templateFields.map((field) => {
                const fid = safeString(field?.id).trim();
                if (!fid) return null;
                const isWiki = fid === WIKI_ALIAS_FIELD.id;
                const isOutlineField = outlineOid && fid === outlineOid;
                const storedList = Array.isArray(suggestionLists?.[fid]) ? suggestionLists[fid] : [];
                const suggestionRows = Array.isArray(suggestionRowsByField[fid])
                  ? suggestionRowsByField[fid]
                  : normalizeSuggestionRows(storedList);
                const labelDomId = `ttc-entity-field-label-${pathKey}-${fid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                const outlineVal = safeString(
                  entityDynamicData && typeof entityDynamicData === 'object' ? entityDynamicData[fid] : ''
                );
                const sortPrefixId = `ttc-entity-field-sort-prefix-${pathKey}-${fid.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
                return (
                  <div
                    key={fid}
                    className="rounded-md border border-slate-800/90 bg-slate-950/55 p-2 space-y-2"
                  >
                    {isOutlineField && patchEntity && (
                      <div className="rounded-md border border-emerald-800/50 bg-emerald-950/20 p-2 space-y-1.5">
                        <div className="text-[11px] font-bold uppercase tracking-wide text-emerald-300">
                          Giá trị khi tạo thẻ — {outlineLabel || fid}
                        </div>
                        <input
                          aria-label={outlineLabel || 'Mục lục danh sách'}
                          type="text"
                          list={outlineSuggestions.length ? outlineDlId : undefined}
                          value={outlineVal}
                          onChange={(e) => patchEntity({ [fid]: e.target.value })}
                          className="w-full bg-slate-950 border border-emerald-800/55 rounded-md px-2.5 py-2 text-sm text-slate-100 font-serif outline-none focus:border-emerald-500/80"
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
                        <div className="h-px bg-slate-800/80" />
                        <div className="text-[11px] font-bold uppercase tracking-wide text-amber-200/90">
                          Mẫu tab: nhãn &amp; list gợi ý
                        </div>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="w-20 shrink-0 space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wide text-emerald-200/90">
                          Ký hiệu
                        </span>
                        <input
                          id={sortPrefixId}
                          type="text"
                          defaultValue={safeString(field.sortPrefix)}
                          key={`entity-prefix-${pathKey}-${fid}-${safeString(field.sortPrefix)}`}
                          onBlur={(e) =>
                            typeof handleSetTabTemplateFieldSortPrefix === 'function'
                              ? handleSetTabTemplateFieldSortPrefix(lonId, nhoId, fid, e.target.value, opts)
                              : null
                          }
                          className="w-full bg-slate-950 border border-emerald-800/50 rounded-lg px-2 py-1.5 text-sm text-emerald-100 font-mono"
                          aria-label={`Ký hiệu sắp xếp của trường ${fid}`}
                          placeholder="I / 1 / 1.1"
                        />
                      </div>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[11px] font-bold uppercase tracking-wide text-amber-200/90">
                            Tên hiển thị
                          </span>
                          <button
                            type="button"
                            title="Sửa tên hiển thị của trường này"
                            onClick={() => document.getElementById(labelDomId)?.focus()}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-1 text-xs font-bold text-amber-100 hover:bg-amber-900/40"
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
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-100 font-serif"
                          aria-label={`Tên hiển thị trường ${fid}`}
                        />
                      </div>
                      <div className="shrink-0 flex flex-col items-end gap-0.5 max-w-[10rem]">
                        <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
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
                          className="font-mono text-xs text-slate-400 bg-slate-950/70 border border-slate-800 rounded px-1.5 py-1 hover:text-amber-200 hover:border-amber-800/55 truncate max-w-full"
                        >
                          {fid}
                        </button>
                      </div>
                      {!isWiki && (
                        <button
                          type="button"
                          onClick={() => confirmRemove(field)}
                          className="shrink-0 rounded-lg border border-rose-800/50 bg-rose-950/25 px-2.5 py-1.5 text-xs font-bold text-rose-100 hover:bg-rose-900/35"
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
                      <div className="space-y-1">
                        {suggestionRows.map((row, rowIdx) => (
                          <div key={`${fid}-row-${rowIdx}`} className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={safeString(row.prefix)}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSuggestionRowsByField((prev) => {
                                  const list = Array.isArray(prev[fid]) ? [...prev[fid]] : [];
                                  list[rowIdx] = { ...list[rowIdx], prefix: val };
                                  return { ...prev, [fid]: list };
                                });
                              }}
                              className="w-20 bg-slate-950 border border-emerald-800/45 rounded-md px-2 py-1.5 text-xs text-emerald-100 font-mono"
                              placeholder="I / 1 / 1.1"
                              aria-label={`Ký hiệu dòng gợi ý ${rowIdx + 1} của ${fid}`}
                            />
                            <input
                              type="text"
                              value={safeString(row.value)}
                              onChange={(e) => {
                                const val = e.target.value;
                                setSuggestionRowsByField((prev) => {
                                  const list = Array.isArray(prev[fid]) ? [...prev[fid]] : [];
                                  list[rowIdx] = { ...list[rowIdx], value: val };
                                  return { ...prev, [fid]: list };
                                });
                              }}
                              className="flex-1 bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200 font-mono"
                              placeholder="Nội dung gợi ý..."
                              aria-label={`Nội dung dòng gợi ý ${rowIdx + 1} của ${fid}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setSuggestionRowsByField((prev) => {
                                  const list = Array.isArray(prev[fid]) ? [...prev[fid]] : [];
                                  list.splice(rowIdx, 1);
                                  return { ...prev, [fid]: list };
                                });
                              }}
                              className="rounded-md border border-rose-800/50 bg-rose-950/20 px-2 py-1.5 text-xs font-bold text-rose-100"
                            >
                              X
                            </button>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setSuggestionRowsByField((prev) => {
                                const list = Array.isArray(prev[fid]) ? [...prev[fid]] : [];
                                list.push({ prefix: '', value: '' });
                                return { ...prev, [fid]: list };
                              });
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/50 px-2.5 py-1.5 text-xs font-bold text-slate-200"
                          >
                            <Plus size={10} /> Dòng
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const serialized = serializeSuggestionRows(suggestionRows);
                              handleMergeTabFieldSuggestionList(lonId, nhoId, fid, serialized, opts);
                              const count = serialized ? serialized.split('\n').filter(Boolean).length : 0;
                              const fieldLabel = safeString(field.label).trim() || fid;
                              showToast?.(
                                count > 0
                                  ? `Đã lưu ${count} dòng gợi ý cho «${fieldLabel}».`
                                  : `Đã xoá list gợi ý của «${fieldLabel}».`,
                                'success'
                              );
                            }}
                            className="inline-flex items-center gap-1 rounded-md border border-amber-700/55 bg-amber-950/35 px-2.5 py-1.5 text-xs font-bold text-amber-100 hover:bg-amber-900/40"
                          >
                            Lưu list
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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
    <div className="rounded-md border border-sky-900/40 bg-sky-950/20 p-2 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-bold uppercase tracking-wide text-sky-200/90">
          Nguồn giá trị
        </span>
        <select
          value={currentKind}
          onChange={(e) => commit(e.target.value, currentMetaKey)}
          className={`bg-slate-950 border rounded-md px-2 py-1.5 text-sm font-serif outline-none focus:border-sky-600/55 ${
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
            className="bg-slate-950 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-slate-100 font-serif outline-none focus:border-sky-600/55"
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
