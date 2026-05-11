/**
 * Cấu hình bố cục ô «Gợi ý nhanh» (entityQuickEntry) — nháp + Áp dụng (Cục bộ / Khu vực) / Áp mọi mục lớn.
 * Đăng ký `registerFlushEntityQuickEntry`: trước «Lưu thông tin» modal gọi flush để ghi nháp vào mẫu tab (cục bộ).
 * Nhúng trong modal Khởi tạo thẻ (ModalEntity). Import bởi: MasterComponents.jsx
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeftRight, Edit2, Plus, Save, Trash2 } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { normalizeAsciiText } from './lib/statusHierarchyParser.js';
import { getEffectiveQuickEntrySlotFields, MAX_QUICK_ENTRY_SLOTS } from './lib/entityQuickEntrySlots.js';

const DEP_SCOPE_LOCAL = 'local';
const DEP_SCOPE_AREA = 'area';
const TIER_SCOPE_LOCAL = 'local';
const TIER_SCOPE_AREA = 'area';
const SLOT_APPLY_SCOPE_LOCAL = 'local';
const SLOT_APPLY_SCOPE_AREA = 'area';

function buildQuickEntryState(entityQuickEntry, templateList) {
  const tabStub = { entityQuickEntry };
  const slotFields = getEffectiveQuickEntrySlotFields(tabStub, templateList);
  const slotLabels = slotFields.map((_, i) => safeString(entityQuickEntry?.slotLabels?.[i] ?? '').trim());
  return {
    slotFields,
    slotLabels,
    dualFirstRow: entityQuickEntry?.dualFirstRow === true,
    useSelectUi: entityQuickEntry?.useSelectUi === true,
  };
}

function statesEqual(a, b) {
  if (!a || !b) return a === b;
  if (a.dualFirstRow !== b.dualFirstRow) return false;
  if (a.useSelectUi !== b.useSelectUi) return false;
  if (a.slotFields.length !== b.slotFields.length) return false;
  for (let i = 0; i < a.slotFields.length; i += 1) {
    if (a.slotFields[i] !== b.slotFields[i]) return false;
    if (a.slotLabels[i] !== b.slotLabels[i]) return false;
  }
  return true;
}

function buildDependencyDraft(raw, templateList) {
  const allowed = new Set((Array.isArray(templateList) ? templateList : []).map((f) => safeString(f?.id).trim()).filter(Boolean));
  const toCases = (casesRaw) => {
    if (Array.isArray(casesRaw)) return casesRaw;
    if (!casesRaw || typeof casesRaw !== 'object') return [];
    return Object.entries(casesRaw).map(([whenValue, suggestions]) => ({ whenValue, suggestions }));
  };
  return (Array.isArray(raw) ? raw : []).map((rule) => {
    const sourceFieldId = safeString(rule?.sourceFieldId).trim();
    const targetFieldId = safeString(rule?.targetFieldId).trim();
    const cases = toCases(rule?.cases)
      .map((entry) => {
        const whenValue = safeString(entry?.whenValue).trim();
        const suggestions = (Array.isArray(entry?.suggestions) ? entry.suggestions : [])
          .map((x) => safeString(x).trim())
          .filter(Boolean)
          .join('\n');
        return { whenValue, suggestions };
      })
      .filter((entry) => entry.whenValue || entry.suggestions);
    return {
      sourceFieldId: allowed.has(sourceFieldId) ? sourceFieldId : '',
      targetFieldId: allowed.has(targetFieldId) ? targetFieldId : '',
      cases: cases.length > 0 ? cases : [{ whenValue: '', suggestions: '' }],
    };
  });
}

function serializeDependencyDraft(draft, templateList) {
  const allowed = new Set(
    (Array.isArray(templateList) ? templateList : [])
      .map((f) => safeString(f?.id).trim())
      .filter((id) => id && id !== 'f_alias')
  );
  const dedupeValues = (text) => {
    const out = [];
    const seen = new Set();
    safeString(text)
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .forEach((value) => {
        const key = normalizeAsciiText(value);
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(value);
      });
    return out;
  };
  const out = [];
  (Array.isArray(draft) ? draft : []).forEach((rule) => {
    const sourceFieldId = safeString(rule?.sourceFieldId).trim();
    const targetFieldId = safeString(rule?.targetFieldId).trim();
    if (!sourceFieldId || !targetFieldId || sourceFieldId === targetFieldId) return;
    if (!allowed.has(sourceFieldId) || !allowed.has(targetFieldId)) return;
    const cases = [];
    (Array.isArray(rule?.cases) ? rule.cases : []).forEach((entry) => {
      const whenValue = safeString(entry?.whenValue).trim();
      const suggestions = dedupeValues(entry?.suggestions);
      if (!whenValue || suggestions.length < 1) return;
      cases.push({ whenValue, suggestions });
    });
    if (cases.length < 1) return;
    out.push({ sourceFieldId, targetFieldId, cases });
  });
  return out;
}

function normalizeTierSchemaDraft(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const toText = (arr) => (Array.isArray(arr) ? arr.map((x) => safeString(x).trim()).filter(Boolean).join('\n') : '');
  return {
    none: toText(source.none),
    one: toText(source.one),
    two: toText(source.two),
  };
}

function serializeTierSchemaDraft(draft) {
  const dedupe = (text) => {
    const out = [];
    const seen = new Set();
    safeString(text)
      .split(/\r?\n/)
      .map((line) => safeString(line).trim())
      .filter(Boolean)
      .forEach((line) => {
        const key = normalizeAsciiText(line);
        if (!key || seen.has(key)) return;
        seen.add(key);
        out.push(line);
      });
    return out;
  };
  return {
    none: dedupe(draft?.none),
    one: dedupe(draft?.one),
    two: dedupe(draft?.two),
  };
}

function normalizeTierFieldMapDraft(raw, selectable = []) {
  const allowed = new Set((Array.isArray(selectable) ? selectable : []).map((f) => safeString(f?.id).trim()).filter(Boolean));
  const scaleFieldIdRaw = safeString(raw?.scaleFieldId).trim();
  const parentFieldIdRaw = safeString(raw?.parentFieldId).trim();
  const fallbackScale = allowed.has('f_he_gioi_ban_do') ? 'f_he_gioi_ban_do' : '';
  const fallbackParent = allowed.has('f_vi_tri') ? 'f_vi_tri' : '';
  return {
    scaleFieldId: allowed.has(scaleFieldIdRaw) ? scaleFieldIdRaw : fallbackScale,
    parentFieldId: allowed.has(parentFieldIdRaw) ? parentFieldIdRaw : fallbackParent,
  };
}

function AppEntityQuickEntryConfigBody({
  lon,
  nho,
  fieldsTemplate,
  entityQuickEntry,
  fieldSuggestionDependencies,
  mapParentTierSchema,
  mapParentTierFieldMap,
  onSetEntityQuickEntry,
  onSetFieldSuggestionDependencies,
  onRequestPropagateDependenciesToLon,
  onSetMapParentTierSchema,
  onSetMapParentTierFieldMap,
  onRequestPropagateMapParentTierSchemaToLon,
  onRequestPropagateMapParentTierFieldMapToLon,
  onSetTemplateFieldSortPrefix,
  onRequestPropagateToLon,
  onRequestPropagateToAllLons,
  showToast,
  /** ModalEntity gọi trước Lưu thông tin — ghi nháp ô gợi ý vào mẫu tab (không tự «Khu vực»). */
  registerFlushEntityQuickEntry,
  /** false = tab Bản đồ / Thế lực (form gợi ý riêng); vẫn hiện «Phụ thuộc gợi ý». */
  showQuickEntrySlots = true,
}) {
  const canEditSlots = typeof onSetEntityQuickEntry === 'function';
  const canEditDeps = typeof onSetFieldSuggestionDependencies === 'function';
  const canEditTierSchema = typeof onSetMapParentTierSchema === 'function';
  const canEditTierFieldMap = typeof onSetMapParentTierFieldMap === 'function';

  const templateList = useMemo(
    () => (Array.isArray(fieldsTemplate) ? fieldsTemplate : []),
    [fieldsTemplate]
  );
  const pathKey = `${lon}-${nho}`;

  const saved = useMemo(
    () => buildQuickEntryState(entityQuickEntry, templateList),
    [entityQuickEntry, templateList]
  );
  const savedSig = useMemo(() => JSON.stringify(saved), [saved]);
  const savedDeps = useMemo(
    () => buildDependencyDraft(fieldSuggestionDependencies, templateList),
    [fieldSuggestionDependencies, templateList]
  );
  const savedDepsSig = useMemo(() => JSON.stringify(savedDeps), [savedDeps]);
  const savedTierSchema = useMemo(() => normalizeTierSchemaDraft(mapParentTierSchema), [mapParentTierSchema]);
  const savedTierSchemaSig = useMemo(() => JSON.stringify(savedTierSchema), [savedTierSchema]);
  /** Mọi trường mẫu (trừ biệt danh wiki); bỏ trùng `id` — dùng cho dropdown + nhóm «không gán ô nhanh». */
  const catalogAllTemplateFields = useMemo(() => {
    const out = [];
    const seen = new Set();
    for (const f of templateList) {
      const id = safeString(f?.id).trim();
      if (!id || id === 'f_alias') continue;
      if (seen.has(id)) continue;
      seen.add(id);
      out.push({ ...f, id });
    }
    return out;
  }, [templateList]);
  /** Mọi trường gán được (đã bỏ f_alias khỏi catalog); gồm cả Phẩm cấp / f_status nếu có trong mẫu. */
  const selectable = catalogAllTemplateFields;
  const savedTierFieldMap = useMemo(
    () => normalizeTierFieldMapDraft(mapParentTierFieldMap, selectable),
    [mapParentTierFieldMap, selectable]
  );
  const savedTierFieldMapSig = useMemo(() => JSON.stringify(savedTierFieldMap), [savedTierFieldMap]);

  const [draft, setDraft] = useState(() => saved);
  const [draftDeps, setDraftDeps] = useState(() => savedDeps);
  const [depScope, setDepScope] = useState(DEP_SCOPE_LOCAL);
  const [slotApplyScope, setSlotApplyScope] = useState(SLOT_APPLY_SCOPE_LOCAL);
  const [tierScope, setTierScope] = useState(TIER_SCOPE_LOCAL);
  const [draftTierSchema, setDraftTierSchema] = useState(() => savedTierSchema);
  const [draftTierFieldMap, setDraftTierFieldMap] = useState(() => savedTierFieldMap);

  /* eslint-disable react-hooks/set-state-in-effect -- đồng bộ nháp với dữ liệu đã lưu khi tab / chữ ký nguồn đổi */
  useEffect(() => {
    setDraft(saved);
  }, [pathKey, savedSig, saved]);
  useEffect(() => {
    setDraftDeps(savedDeps);
  }, [pathKey, savedDepsSig, savedDeps]);
  useEffect(() => {
    setDraftTierSchema(savedTierSchema);
  }, [pathKey, savedTierSchemaSig, savedTierSchema]);
  useEffect(() => {
    setDraftTierFieldMap(savedTierFieldMap);
  }, [pathKey, savedTierFieldMapSig, savedTierFieldMap]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const dirty = !statesEqual(draft, saved);
  const draftRef = useRef(draft);
  const savedRef = useRef(saved);
  const slotApplyScopeRef = useRef(slotApplyScope);
  useEffect(() => {
    draftRef.current = draft;
    savedRef.current = saved;
    slotApplyScopeRef.current = slotApplyScope;
  }, [draft, saved, slotApplyScope]);
  const hasTierFields = Boolean(draftTierFieldMap.scaleFieldId && draftTierFieldMap.parentFieldId);
  const { slotFields, slotLabels } = draft;
  const optIds = useMemo(() => new Set(catalogAllTemplateFields.map((f) => f.id)), [catalogAllTemplateFields]);
  const canAdd =
    slotFields.length < MAX_QUICK_ENTRY_SLOTS && selectable.some((f) => f && !slotFields.includes(f.id));

  const commitTabThis = useCallback(() => {
    if (!canEditSlots) return false;
    const ok = onSetEntityQuickEntry(lon, nho, draft.slotFields, draft.slotLabels, {
      dualFirstRow: draft.dualFirstRow,
      useSelectUi: draft.useSelectUi,
    });
    if (ok === false) {
      showToast?.(
        'Chưa lưu được ô gợi ý nhanh: kiểm tra mỗi ô chọn đúng một trường trong mẫu (không trùng, không rỗng).',
        'warning'
      );
      return false;
    }
    showToast?.('Đã lưu cấu hình ô gợi ý nhanh cho tab này (mẫu tab nhỏ).', 'success');
    return true;
  }, [canEditSlots, lon, nho, draft, onSetEntityQuickEntry, showToast]);

  const handleRevert = useCallback(() => {
    setDraft(saved);
  }, [saved]);

  const handlePropagateClick = useCallback(() => {
    if (!canEditSlots || typeof onRequestPropagateToLon !== 'function') return;
    onRequestPropagateToLon(lon, draft.slotFields, draft.slotLabels, {
      dualFirstRow: draft.dualFirstRow,
      useSelectUi: draft.useSelectUi,
    });
  }, [canEditSlots, lon, onRequestPropagateToLon, draft]);

  const handlePropagateAllLonsClick = useCallback(() => {
    if (!canEditSlots || typeof onRequestPropagateToAllLons !== 'function') return;
    onRequestPropagateToAllLons(draft.slotFields, draft.slotLabels, {
      dualFirstRow: draft.dualFirstRow,
      useSelectUi: draft.useSelectUi,
    });
  }, [canEditSlots, onRequestPropagateToAllLons, draft]);

  const handleApplyQuickSlots = useCallback(() => {
    if (!canEditSlots || !dirty) return;
    if (slotApplyScope === SLOT_APPLY_SCOPE_AREA && typeof onRequestPropagateToLon === 'function') {
      handlePropagateClick();
      return;
    }
    commitTabThis();
  }, [canEditSlots, dirty, slotApplyScope, onRequestPropagateToLon, handlePropagateClick, commitTabThis]);

  useEffect(() => {
    if (typeof registerFlushEntityQuickEntry !== 'function') return undefined;
    const flush = () => {
      if (!canEditSlots || !showQuickEntrySlots) return;
      const d = draftRef.current;
      const s = savedRef.current;
      if (statesEqual(d, s)) return;
      const ok = onSetEntityQuickEntry(lon, nho, d.slotFields, d.slotLabels, {
        dualFirstRow: d.dualFirstRow,
        useSelectUi: d.useSelectUi,
      });
      if (ok === false) {
        showToast?.(
          'Chưa lưu được ô gợi ý nhanh khi đóng / Lưu thông tin: kiểm tra các ô không trùng và thuộc mẫu tab.',
          'warning'
        );
        return;
      }
      if (slotApplyScopeRef.current === SLOT_APPLY_SCOPE_AREA) {
        showToast?.(
          'Đã lưu ô gợi ý nhanh cho tab này. «Khu vực» chưa áp — bấm «Áp dụng» nếu cần ghi đè mọi tab cùng mục lớn.',
          'warning'
        );
      } else {
        showToast?.('Đã lưu cấu hình ô gợi ý nhanh cho tab này (mẫu tab nhỏ).', 'success');
      }
    };
    registerFlushEntityQuickEntry(flush);
    return () => registerFlushEntityQuickEntry(null);
  }, [registerFlushEntityQuickEntry, canEditSlots, showQuickEntrySlots, lon, nho, onSetEntityQuickEntry, showToast]);
  const depsDirty = useMemo(() => {
    return JSON.stringify(draftDeps) !== savedDepsSig;
  }, [draftDeps, savedDepsSig]);
  const depScopeButtonClass = (active) =>
    `flex-1 min-w-0 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide transition-colors ${
      active
        ? 'bg-emerald-800/80 text-white'
        : 'bg-slate-950/65 text-slate-300 hover:bg-slate-900/75'
    }`;
  const tierSchemaDirty = useMemo(
    () => JSON.stringify(draftTierSchema) !== savedTierSchemaSig,
    [draftTierSchema, savedTierSchemaSig]
  );
  const tierFieldMapDirty = useMemo(
    () => JSON.stringify(draftTierFieldMap) !== savedTierFieldMapSig,
    [draftTierFieldMap, savedTierFieldMapSig]
  );
  const handleSaveDependencies = useCallback(() => {
    if (typeof onSetFieldSuggestionDependencies !== 'function') return;
    const normalized = serializeDependencyDraft(draftDeps, templateList);
    if (depScope === DEP_SCOPE_AREA && typeof onRequestPropagateDependenciesToLon === 'function') {
      onRequestPropagateDependenciesToLon(lon, normalized);
      return;
    }
    onSetFieldSuggestionDependencies(lon, nho, normalized);
    showToast?.('Đã lưu phụ thuộc gợi ý theo trường trong tab này.', 'success');
  }, [
    onSetFieldSuggestionDependencies,
    onRequestPropagateDependenciesToLon,
    depScope,
    draftDeps,
    templateList,
    lon,
    nho,
    showToast,
  ]);
  const handleSaveTierSchema = useCallback(() => {
    if (!canEditTierSchema) return;
    const normalized = serializeTierSchemaDraft(draftTierSchema);
    if (tierScope === TIER_SCOPE_AREA && typeof onRequestPropagateMapParentTierSchemaToLon === 'function') {
      onRequestPropagateMapParentTierSchemaToLon(lon, normalized);
      return;
    }
    onSetMapParentTierSchema(normalized, { lonId: lon, nhoId: nho });
    showToast?.('Đã lưu rule phân tầng «Trực thuộc» cho tab này.', 'success');
  }, [
    canEditTierSchema,
    draftTierSchema,
    tierScope,
    onRequestPropagateMapParentTierSchemaToLon,
    onSetMapParentTierSchema,
    lon,
    nho,
    showToast,
  ]);
  const handleSaveTierFieldMap = useCallback(() => {
    if (!canEditTierFieldMap) return;
    const normalized = normalizeTierFieldMapDraft(draftTierFieldMap, selectable);
    if (!normalized.scaleFieldId || !normalized.parentFieldId) {
      showToast?.('Chọn đủ Trường Quy mô và Trường Trực thuộc.', 'warning');
      return;
    }
    if (tierScope === TIER_SCOPE_AREA && typeof onRequestPropagateMapParentTierFieldMapToLon === 'function') {
      onRequestPropagateMapParentTierFieldMapToLon(lon, normalized);
      return;
    }
    onSetMapParentTierFieldMap(normalized, { lonId: lon, nhoId: nho });
    showToast?.('Đã lưu cặp trường cho rule phân tầng.', 'success');
  }, [
    canEditTierFieldMap,
    draftTierFieldMap,
    selectable,
    tierScope,
    onRequestPropagateMapParentTierFieldMapToLon,
    onSetMapParentTierFieldMap,
    lon,
    nho,
    showToast,
  ]);

  return (
    <details className="rounded-xl border border-amber-800/40 bg-amber-950/12 p-2.5" defaultOpen>
      <summary className="cursor-pointer list-none">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[9px] font-bold text-amber-300/95 uppercase tracking-widest">
              Cấu hình mẫu: các ô gợi ý nhanh
            </div>
            <div className="text-[10px] text-slate-400 font-serif mt-0.5 leading-snug line-clamp-3">
              {showQuickEntrySlots && canEditSlots ? (
                <>
                  Ngay <strong className="text-amber-200/90">đầu khối vàng</strong>: chọn trường cho từng ô (tối đa{' '}
                  {MAX_QUICK_ENTRY_SLOTS}), phạm vi <strong className="text-emerald-200/90">Cục bộ / Khu vực</strong>, rồi{' '}
                  <strong className="text-amber-200/90">Áp dụng</strong>. «Phụ thuộc gợi ý» nằm bên dưới (tuỳ chọn). Thêm{' '}
                  <code className="text-amber-200/90">f_*</code> ở «Trường thông tin» phía trên.
                </>
              ) : (
                <>
                  Tab này dùng <strong className="text-amber-200/90">form gợi ý riêng</strong> (Bản đồ / Thế lực) ở Tổng quan. Ở đây
                  bạn vẫn cấu hình <strong className="text-violet-200/90">phụ thuộc gợi ý theo trường</strong> (A → B); bấm{' '}
                  <strong className="text-emerald-200/90">Lưu phụ thuộc</strong> để ghi vào mẫu tab.
                </>
              )}
            </div>
          </div>
          <div className="text-[9px] text-amber-200/80 font-semibold shrink-0" title="Thu gọn / mở lại khối này">
            Thu / mở
          </div>
        </div>
      </summary>
      <div className="mt-2 space-y-2">
        {canEditSlots && showQuickEntrySlots && dirty && (
          <p className="text-[10px] text-amber-200/90 font-serif rounded-md border border-amber-800/50 bg-amber-950/30 px-2 py-1">
            Có thay đổi chưa lưu mẫu tab.
          </p>
        )}
        {canEditSlots && showQuickEntrySlots && (
          <>
            <div className="flex flex-wrap items-end gap-2">
              {typeof onRequestPropagateToLon === 'function' && (
                <div className="w-full max-w-[16rem] space-y-1">
                  <div className="text-[9px] font-bold text-emerald-200/90 uppercase tracking-widest">Phạm vi áp dụng</div>
                  <div className="grid grid-cols-2 rounded-md border border-emerald-900/45 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setSlotApplyScope(SLOT_APPLY_SCOPE_LOCAL)}
                      className={depScopeButtonClass(slotApplyScope === SLOT_APPLY_SCOPE_LOCAL)}
                      aria-pressed={slotApplyScope === SLOT_APPLY_SCOPE_LOCAL}
                      title="Chỉ tab con đang mở"
                    >
                      Cục bộ
                    </button>
                    <button
                      type="button"
                      onClick={() => setSlotApplyScope(SLOT_APPLY_SCOPE_AREA)}
                      className={depScopeButtonClass(slotApplyScope === SLOT_APPLY_SCOPE_AREA)}
                      aria-pressed={slotApplyScope === SLOT_APPLY_SCOPE_AREA}
                      title="Ghi đè mọi tab con cùng tab lớn"
                    >
                      Khu vực
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={handleApplyQuickSlots}
                disabled={!dirty}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-800/50 bg-emerald-950/40 px-2 py-1 text-[9px] font-bold text-emerald-100 hover:bg-emerald-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save size={12} /> Áp dụng
              </button>
              <button
                type="button"
                onClick={handleRevert}
                disabled={!dirty}
                className="inline-flex items-center gap-1 rounded-md border border-slate-600 bg-slate-950/60 px-2 py-1 text-[9px] font-bold text-slate-300 hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Hoàn tác
              </button>
              {typeof onRequestPropagateToAllLons === 'function' && (
                <button
                  type="button"
                  onClick={handlePropagateAllLonsClick}
                  className="inline-flex items-center gap-1 rounded-md border border-violet-800/50 bg-violet-950/35 px-2 py-1 text-[9px] font-bold text-violet-100 hover:bg-violet-900/40"
                >
                  Áp mọi mục lớn
                </button>
              )}
            </div>
            <p
              className="text-[9px] text-slate-500 font-serif leading-snug line-clamp-2"
              title="«Khu vực» / «Áp mọi mục lớn» dùng nháp hiện tại — xác nhận rồi ghi đè các tab sưu tập theo phạm vi. «Cục bộ» ghi ngay tab con đang mở."
            >
              «Khu vực» / «Áp mọi mục lớn»: nháp hiện tại, xác nhận rồi ghi đè. «Cục bộ»: ghi ngay tab này. Danh sách (AUTO)
              từng mục: chỉnh riêng từng tab con.
            </p>
          </>
        )}
        {canEditSlots && showQuickEntrySlots && (catalogAllTemplateFields.length === 0 ? (
          <p className="text-[11px] text-amber-100/90 font-serif">
            Thêm trường ở «Trường thông tin (mẫu tab)» trong cùng mục nâng cao (trên) để gán ô gợi ý.
          </p>
        ) : (
          <div className="space-y-3">
            <p className="text-[10px] text-slate-400 font-serif leading-snug">
              Chọn trường cho từng ô — danh sách gồm <strong className="text-amber-200/90">mọi trường trong mẫu</strong> (trừ
              biệt danh wiki <code className="font-mono text-amber-200/85">f_alias</code>). Có thể gán cả{' '}
              <code className="font-mono text-amber-200/85">f_status</code> (Phẩm cấp) nếu muốn gợi ý nhanh cùng ô chính;
              khi đó cơ chế «tự ghép trạng thái từ các ô khác» sẽ tắt để không ghi đè chip. Trùng{' '}
              <code className="font-mono text-amber-200/85">id</code> chỉ một dòng trong mẫu.
            </p>
            {slotFields.map((fieldId, idx) => {
              const qlabId = `ttc-entity-quick-slot-label-${pathKey}-${idx}`;
              const fieldForSlot = templateList.find((f) => f && f.id === fieldId);
              const sortPrefixValue = safeString(fieldForSlot?.sortPrefix).trim();
              const sortPrefixInputId = `ttc-entity-quick-sort-${pathKey}-${idx}`;
              return (
                <div
                  key={`quick-slot-${pathKey}-${fieldId}-${idx}`}
                  className="rounded-lg border border-amber-900/25 bg-slate-950/40 p-2 space-y-2"
                >
                  <div className="flex flex-wrap items-end gap-2">
                    <span className="text-[10px] font-bold text-slate-500 w-8 shrink-0 pb-2">Ô {idx + 1}</span>
                    <select
                      value={fieldId}
                      onChange={(e) => {
                        const v = safeString(e.target.value).trim();
                        setDraft((d) => {
                          const next = { ...d, slotFields: [...d.slotFields], slotLabels: [...d.slotLabels] };
                          const twin = next.slotFields.findIndex((x, j) => x === v && j !== idx);
                          if (twin >= 0) next.slotFields[twin] = next.slotFields[idx];
                          next.slotFields[idx] = v;
                          return next;
                        });
                      }}
                      aria-label={`Chọn trường cho ô gợi ý nhanh ${idx + 1}`}
                      className="min-h-9 min-w-[160px] flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 font-mono outline-none focus:border-amber-600/50"
                    >
                      {!optIds.has(fieldId) && <option value={fieldId}>{fieldId} (cần khớp template)</option>}
                      {selectable.map((f) => (
                        <option key={f.id} value={f.id}>
                          {safeString(f.label) || f.id} ({f.id})
                        </option>
                      ))}
                    </select>
                    <div className="shrink-0 w-[4.5rem] space-y-0.5">
                      <div className="text-[9px] font-bold uppercase tracking-wide text-emerald-200/80">Thứ tự</div>
                      <input
                        id={sortPrefixInputId}
                        type="text"
                        key={`qsp-${pathKey}-${fieldId}-${sortPrefixValue}`}
                        defaultValue={sortPrefixValue}
                        onBlur={(e) => {
                          if (typeof onSetTemplateFieldSortPrefix !== 'function') return;
                          onSetTemplateFieldSortPrefix(lon, nho, fieldId, e.target.value);
                        }}
                        disabled={!fieldId}
                        title="Lưu khi rời ô — mẫu trường chung cả tab; hiển thị trước nhãn ở khối gợi ý."
                        placeholder="I / 1"
                        aria-label={`Ký hiệu thứ tự cho trường ${fieldId || 'ô gợi ý'}`}
                        className="w-full bg-slate-950 border border-emerald-800/50 rounded-lg px-2 py-1.5 text-[11px] text-emerald-100 font-mono outline-none focus:border-emerald-500/70 disabled:opacity-40"
                      />
                    </div>
                  </div>
                  <div className="space-y-1 pl-0 md:pl-10">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wide text-amber-200/85">
                        Nhãn hiển thị (ô gợi ý)
                      </span>
                      <button
                        type="button"
                        title="Gõ vào ô dưới"
                        onClick={() => document.getElementById(qlabId)?.focus()}
                        className="inline-flex items-center gap-1 rounded-md border border-amber-800/50 bg-amber-950/35 px-2 py-0.5 text-[10px] font-bold text-amber-100 hover:bg-amber-900/45"
                      >
                        <Edit2 size={12} /> Sửa nhãn
                      </button>
                    </div>
                    <input
                      id={qlabId}
                      type="text"
                      value={slotLabels[idx] ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDraft((d) => {
                          const nextLabels = [...d.slotLabels];
                          while (nextLabels.length < d.slotFields.length) nextLabels.push('');
                          nextLabels[idx] = val;
                          return { ...d, slotLabels: nextLabels };
                        });
                      }}
                      placeholder="Để trống = dùng tên trường trong hồ sơ tab"
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-1.5 text-[11px] text-slate-200 font-serif outline-none focus:border-amber-600/45"
                    />
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!canAdd}
                onClick={() => {
                  const used = new Set(slotFields);
                  const pick = selectable.find((f) => f.id && !used.has(f.id));
                  if (!pick) return;
                  setDraft((d) => ({
                    ...d,
                    slotFields: [...d.slotFields, pick.id],
                    slotLabels: [...d.slotLabels, ''],
                  }));
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-amber-800/50 bg-amber-950/40 px-2.5 py-1.5 text-[10px] font-bold text-amber-100 hover:bg-amber-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus size={14} /> Thêm ô
              </button>
              <button
                type="button"
                disabled={slotFields.length <= 1}
                onClick={() => {
                  setDraft((d) => ({
                    ...d,
                    slotFields: d.slotFields.slice(0, -1),
                    slotLabels: d.slotLabels.slice(0, -1),
                  }));
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-950/50 px-2.5 py-1.5 text-[10px] font-bold text-slate-300 hover:bg-slate-800/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={14} /> Bớt một ô
              </button>
              <span className="text-[10px] text-slate-500 font-serif">
                Tối đa {MAX_QUICK_ENTRY_SLOTS} ô · {slotFields.length} ô hiện tại
              </span>
            </div>
            <div className="space-y-2 rounded-lg border border-amber-900/35 bg-slate-950/55 px-2.5 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="inline-flex cursor-pointer items-start gap-2 text-[11px] text-slate-300 font-serif leading-snug">
                  <input
                    type="checkbox"
                    checked={draft.dualFirstRow}
                    onChange={(e) => setDraft((d) => ({ ...d, dualFirstRow: e.target.checked }))}
                    className="mt-0.5 rounded border-slate-600"
                  />
                  <span>
                    Hai ô đầu <strong className="text-amber-200">song song</strong> (cạnh nhau trên màn hình rộng).
                  </span>
                </label>
                <button
                  type="button"
                  disabled={slotFields.length < 2}
                  onClick={() => {
                    setDraft((d) => {
                      if (d.slotFields.length < 2) return d;
                      const nextF = [d.slotFields[1], d.slotFields[0], ...d.slotFields.slice(2)];
                      const nextL = [d.slotLabels[1], d.slotLabels[0], ...d.slotLabels.slice(2)];
                      return { ...d, slotFields: nextF, slotLabels: nextL };
                    });
                  }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-amber-800/50 bg-amber-950/40 px-2.5 py-1.5 text-[10px] font-bold text-amber-100 hover:bg-amber-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Hoán đổi trường và nhãn của ô 1 và ô 2"
                >
                  <ArrowLeftRight size={14} /> Đổi ô 1 ↔ 2
                </button>
              </div>
              <label className="inline-flex cursor-pointer items-start gap-2 text-[11px] text-slate-300 font-serif leading-snug">
                <input
                  type="checkbox"
                  checked={draft.useSelectUi}
                  onChange={(e) => setDraft((d) => ({ ...d, useSelectUi: e.target.checked }))}
                  className="mt-0.5 rounded border-slate-600"
                />
                <span>
                  Dùng <strong className="text-amber-200">menu chọn (select)</strong> cho mọi ô (kèm ô gõ dưới mỗi ô); tắt = gõ + gợi
                  ý datalist.
                </span>
              </label>
            </div>
          </div>
        ))}
        {canEditDeps && (
        <details className="rounded-lg border border-violet-900/35 bg-slate-950/45 p-2" defaultOpen={!showQuickEntrySlots}>
          <summary className="cursor-pointer text-[10px] font-bold text-violet-200 uppercase tracking-widest">
            Phụ thuộc gợi ý (Trường A → Trường B)
          </summary>
          <div className="mt-2 space-y-2">
            <p className="text-[10px] text-slate-400 font-serif leading-snug">
              Ví dụ: A = «Hạ giới» thì B gợi ý «Nhất tinh…Cửu tinh»; A = «Tiên giới» thì B gợi ý «Cực tiên…Tiên đế».
            </p>
            {draftDeps.map((rule, ridx) => (
              <div key={`dep-rule-${pathKey}-${ridx}`} className="rounded-lg border border-violet-900/30 bg-slate-950/50 p-2 space-y-2">
                <div className="grid gap-2 md:grid-cols-2">
                  <label className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-violet-200/85">Trường nguồn (A)</span>
                    <select
                      value={rule.sourceFieldId}
                      onChange={(e) => {
                        const v = safeString(e.target.value).trim();
                        setDraftDeps((prev) => prev.map((it, i) => (i === ridx ? { ...it, sourceFieldId: v } : it)));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 font-mono outline-none focus:border-violet-600/50"
                    >
                      <option value="">-- Chọn trường nguồn --</option>
                      {selectable.map((f) => (
                        <option key={`src-${f.id}`} value={f.id}>{safeString(f.label) || f.id} ({f.id})</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-wide text-violet-200/85">Trường đích (B)</span>
                    <select
                      value={rule.targetFieldId}
                      onChange={(e) => {
                        const v = safeString(e.target.value).trim();
                        setDraftDeps((prev) => prev.map((it, i) => (i === ridx ? { ...it, targetFieldId: v } : it)));
                      }}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 font-mono outline-none focus:border-violet-600/50"
                    >
                      <option value="">-- Chọn trường đích --</option>
                      {selectable.map((f) => (
                        <option key={`dst-${f.id}`} value={f.id}>{safeString(f.label) || f.id} ({f.id})</option>
                      ))}
                    </select>
                  </label>
                </div>
                {rule.cases.map((entry, cidx) => (
                  <div key={`dep-case-${pathKey}-${ridx}-${cidx}`} className="rounded-md border border-slate-800/80 bg-slate-950/65 p-2 space-y-1.5">
                    <input
                      type="text"
                      value={entry.whenValue}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftDeps((prev) =>
                          prev.map((it, i) => {
                            if (i !== ridx) return it;
                            const nextCases = it.cases.map((ce, j) => (j === cidx ? { ...ce, whenValue: v } : ce));
                            return { ...it, cases: nextCases };
                          })
                        );
                      }}
                      placeholder="Khi A = ... (ví dụ: Hạ giới)"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 outline-none focus:border-violet-600/50"
                    />
                    <textarea
                      value={entry.suggestions}
                      onChange={(e) => {
                        const v = e.target.value;
                        setDraftDeps((prev) =>
                          prev.map((it, i) => {
                            if (i !== ridx) return it;
                            const nextCases = it.cases.map((ce, j) => (j === cidx ? { ...ce, suggestions: v } : ce));
                            return { ...it, cases: nextCases };
                          })
                        );
                      }}
                      rows={3}
                      placeholder="Gợi ý cho B, mỗi dòng 1 giá trị"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 font-serif outline-none focus:border-violet-600/50"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setDraftDeps((prev) =>
                          prev.map((it, i) => {
                            if (i !== ridx) return it;
                            const nextCases = it.cases.filter((_, j) => j !== cidx);
                            return { ...it, cases: nextCases.length > 0 ? nextCases : [{ whenValue: '', suggestions: '' }] };
                          })
                        );
                      }}
                      className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950/70 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-800/50"
                    >
                      <Trash2 size={12} /> Xóa nhánh
                    </button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftDeps((prev) =>
                        prev.map((it, i) => (i === ridx ? { ...it, cases: [...it.cases, { whenValue: '', suggestions: '' }] } : it))
                      );
                    }}
                    className="inline-flex items-center gap-1 rounded-md border border-violet-800/50 bg-violet-950/35 px-2 py-1 text-[10px] font-bold text-violet-100 hover:bg-violet-900/40"
                  >
                    <Plus size={12} /> Thêm nhánh
                  </button>
                  <button
                    type="button"
                    onClick={() => setDraftDeps((prev) => prev.filter((_, i) => i !== ridx))}
                    className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-950/60 px-2 py-1 text-[10px] font-bold text-slate-300 hover:bg-slate-800/50"
                  >
                    <Trash2 size={12} /> Xóa rule
                  </button>
                </div>
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-1.5">
              {typeof onRequestPropagateDependenciesToLon === 'function' && (
                <div className="w-full max-w-[16rem] space-y-1">
                  <div className="text-[9px] font-bold text-emerald-200/90 uppercase tracking-widest">Phạm vi lưu</div>
                  <div className="grid grid-cols-2 rounded-md border border-emerald-900/45 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setDepScope(DEP_SCOPE_LOCAL)}
                      className={depScopeButtonClass(depScope === DEP_SCOPE_LOCAL)}
                      aria-pressed={depScope === DEP_SCOPE_LOCAL}
                      title="Chỉ lưu cho tab con đang mở"
                    >
                      Cục bộ
                    </button>
                    <button
                      type="button"
                      onClick={() => setDepScope(DEP_SCOPE_AREA)}
                      className={depScopeButtonClass(depScope === DEP_SCOPE_AREA)}
                      aria-pressed={depScope === DEP_SCOPE_AREA}
                      title="Ghi đè mọi tab con cùng tab lớn"
                    >
                      Khu vực
                    </button>
                  </div>
                </div>
              )}
              <button
                type="button"
                onClick={() => {
                  setDraftDeps((prev) => [...prev, { sourceFieldId: '', targetFieldId: '', cases: [{ whenValue: '', suggestions: '' }] }]);
                }}
                className="inline-flex items-center gap-1 rounded-md border border-violet-800/50 bg-violet-950/35 px-2 py-1 text-[10px] font-bold text-violet-100 hover:bg-violet-900/40"
              >
                <Plus size={12} /> Thêm rule phụ thuộc
              </button>
              <button
                type="button"
                disabled={!depsDirty}
                onClick={handleSaveDependencies}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-800/50 bg-emerald-950/40 px-2 py-1 text-[10px] font-bold text-emerald-100 hover:bg-emerald-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Save size={12} /> {depScope === DEP_SCOPE_AREA ? 'Lưu khu vực' : 'Lưu cục bộ'}
              </button>
            </div>
          </div>
        </details>
        )}
        {(canEditTierSchema || canEditTierFieldMap) && (
          <details className="rounded-lg border border-fuchsia-900/35 bg-slate-950/45 p-2">
            <summary className="cursor-pointer text-[10px] font-bold text-fuchsia-200 uppercase tracking-widest">
              Rule phân tầng «Trực thuộc» (theo Quy mô)
            </summary>
            <div className="mt-2 space-y-2">
              <p className="text-[10px] text-slate-400 font-serif leading-snug">
                Mỗi dòng 1 từ khóa (không dấu). Quy mô chứa từ khóa sẽ hiện 0 / 1 / 2 ô «Trực thuộc».
              </p>
              <div className="grid gap-2 md:grid-cols-2">
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-fuchsia-200/85">Trường Quy mô</span>
                  <select
                    value={draftTierFieldMap.scaleFieldId}
                    onChange={(e) => setDraftTierFieldMap((d) => ({ ...d, scaleFieldId: safeString(e.target.value).trim() }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 font-mono outline-none focus:border-fuchsia-600/50"
                  >
                    <option value="">-- Chọn trường --</option>
                    {selectable.map((f) => (
                      <option key={`tier-scale-${f.id}`} value={f.id}>
                        {safeString(f.label) || f.id} ({f.id})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-fuchsia-200/85">Trường Trực thuộc</span>
                  <select
                    value={draftTierFieldMap.parentFieldId}
                    onChange={(e) => setDraftTierFieldMap((d) => ({ ...d, parentFieldId: safeString(e.target.value).trim() }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 font-mono outline-none focus:border-fuchsia-600/50"
                  >
                    <option value="">-- Chọn trường --</option>
                    {selectable.map((f) => (
                      <option key={`tier-parent-${f.id}`} value={f.id}>
                        {safeString(f.label) || f.id} ({f.id})
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-2 md:grid-cols-3">
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-fuchsia-200/85">0 ô trực thuộc</span>
                  <textarea
                    rows={4}
                    value={draftTierSchema.none}
                    onChange={(e) => setDraftTierSchema((d) => ({ ...d, none: e.target.value }))}
                    className="w-full bg-slate-950 border border-fuchsia-900/40 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 font-serif outline-none focus:border-fuchsia-600/50"
                    placeholder={'tinh cau\ngioi\nthien ha'}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-fuchsia-200/85">1 ô trực thuộc</span>
                  <textarea
                    rows={4}
                    value={draftTierSchema.one}
                    onChange={(e) => setDraftTierSchema((d) => ({ ...d, one: e.target.value }))}
                    className="w-full bg-slate-950 border border-fuchsia-900/40 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 font-serif outline-none focus:border-fuchsia-600/50"
                    placeholder={'dai luc\nchau\nde quoc'}
                  />
                </label>
                <label className="space-y-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-fuchsia-200/85">2 ô trực thuộc</span>
                  <textarea
                    rows={4}
                    value={draftTierSchema.two}
                    onChange={(e) => setDraftTierSchema((d) => ({ ...d, two: e.target.value }))}
                    className="w-full bg-slate-950 border border-fuchsia-900/40 rounded-lg px-2 py-1.5 text-[11px] text-slate-100 font-serif outline-none focus:border-fuchsia-600/50"
                    placeholder={'thanh\ntran\nlang'}
                  />
                </label>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {typeof onRequestPropagateMapParentTierSchemaToLon === 'function' && (
                  <div className="w-full max-w-[16rem] space-y-1">
                    <div className="text-[9px] font-bold text-emerald-200/90 uppercase tracking-widest">Phạm vi lưu</div>
                    <div className="grid grid-cols-2 rounded-md border border-emerald-900/45 overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setTierScope(TIER_SCOPE_LOCAL)}
                        className={depScopeButtonClass(tierScope === TIER_SCOPE_LOCAL)}
                        aria-pressed={tierScope === TIER_SCOPE_LOCAL}
                        title="Chỉ lưu cho tab con đang mở"
                      >
                        Cục bộ
                      </button>
                      <button
                        type="button"
                        onClick={() => setTierScope(TIER_SCOPE_AREA)}
                        className={depScopeButtonClass(tierScope === TIER_SCOPE_AREA)}
                        aria-pressed={tierScope === TIER_SCOPE_AREA}
                        title="Ghi đè mọi tab con cùng tab lớn"
                      >
                        Khu vực
                      </button>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  disabled={!tierFieldMapDirty}
                  onClick={handleSaveTierFieldMap}
                  className="inline-flex items-center gap-1 rounded-md border border-cyan-800/50 bg-cyan-950/40 px-2 py-1 text-[10px] font-bold text-cyan-100 hover:bg-cyan-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={12} /> {tierScope === TIER_SCOPE_AREA ? 'Lưu trường (khu vực)' : 'Lưu trường (cục bộ)'}
                </button>
                <button
                  type="button"
                  disabled={!tierSchemaDirty || !hasTierFields}
                  onClick={handleSaveTierSchema}
                  className="inline-flex items-center gap-1 rounded-md border border-fuchsia-800/50 bg-fuchsia-950/40 px-2 py-1 text-[10px] font-bold text-fuchsia-100 hover:bg-fuchsia-900/50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Save size={12} /> {tierScope === TIER_SCOPE_AREA ? 'Lưu rule (khu vực)' : 'Lưu rule (cục bộ)'}
                </button>
              </div>
            </div>
          </details>
        )}
      </div>
    </details>
  );
}

/** Shell không dùng hook: guard `return null` trước khi vào component có hooks. */
export function AppEntityQuickEntryConfig(props) {
  const lon = safeString(props.tabLonId).trim();
  const nho = safeString(props.tabNhoId).trim();
  const canEditSlots = typeof props.onSetEntityQuickEntry === 'function';
  const canEditDeps = typeof props.onSetFieldSuggestionDependencies === 'function';
  const canEditTierSchema = typeof props.onSetMapParentTierSchema === 'function';
  const canEditTierFieldMap = typeof props.onSetMapParentTierFieldMap === 'function';
  if (!lon || !nho || (!canEditSlots && !canEditDeps && !canEditTierSchema && !canEditTierFieldMap)) {
    return null;
  }
  return <AppEntityQuickEntryConfigBody {...props} lon={lon} nho={nho} />;
}
