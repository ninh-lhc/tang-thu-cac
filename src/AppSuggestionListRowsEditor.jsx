/**
 * Danh sách dòng gợi ý (prefix + value) — thêm, xoá, đổi thứ tự, focus ô mới khi «+ Dòng».
 * Dùng trong AppEntityTemplateFieldEditor và MasterComponents (list Bản đồ).
 */
import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { moveSuggestionRowAt } from './lib/suggestionRowFormat.js';

export function AppSuggestionListRowsEditor({
  rows = [],
  onChange,
  idPrefix = 'ttc-suggestion',
  onSave,
  saveLabel = 'Lưu list',
  showSaveButton = true,
  valuePlaceholder = 'Nội dung gợi ý...',
  prefixPlaceholder = 'I / 1 / 1.1',
  valueInputClassName = 'flex-1 bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-200 font-mono',
}) {
  const [pendingFocusRowIdx, setPendingFocusRowIdx] = useState(null);
  const list = Array.isArray(rows) ? rows : [];

  useEffect(() => {
    if (pendingFocusRowIdx == null) return;
    const el = document.getElementById(`${idPrefix}-value-${pendingFocusRowIdx}`);
    el?.focus();
    queueMicrotask(() => setPendingFocusRowIdx(null));
  }, [pendingFocusRowIdx, idPrefix, list.length]);

  const updateRow = (rowIdx, patch) => {
    onChange(list.map((row, i) => (i === rowIdx ? { ...row, ...patch } : row)));
  };

  const removeRow = (rowIdx) => {
    onChange(list.filter((_, i) => i !== rowIdx));
  };

  const moveRow = (rowIdx, delta) => {
    onChange(moveSuggestionRowAt(list, rowIdx, delta));
  };

  const addRow = () => {
    const next = [...list, { prefix: '', value: '' }];
    onChange(next);
    setPendingFocusRowIdx(next.length - 1);
  };

  const handleEnterAddRow = (e) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent?.isComposing) return;
    e.preventDefault();
    addRow();
  };

  return (
    <div className="space-y-1">
      {list.map((row, rowIdx) => (
        <div key={`${idPrefix}-row-${rowIdx}`} className="flex items-center gap-1">
          <div className="flex flex-col shrink-0 gap-0.5">
            <button
              type="button"
              onClick={() => moveRow(rowIdx, -1)}
              disabled={rowIdx === 0}
              className="rounded border border-slate-700/80 bg-slate-900/60 p-0.5 text-slate-300 hover:bg-slate-800 disabled:opacity-25 disabled:pointer-events-none"
              title="Lên"
              aria-label={`Lên dòng ${rowIdx + 1}`}
            >
              <ChevronUp size={12} aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => moveRow(rowIdx, 1)}
              disabled={rowIdx >= list.length - 1}
              className="rounded border border-slate-700/80 bg-slate-900/60 p-0.5 text-slate-300 hover:bg-slate-800 disabled:opacity-25 disabled:pointer-events-none"
              title="Xuống"
              aria-label={`Xuống dòng ${rowIdx + 1}`}
            >
              <ChevronDown size={12} aria-hidden />
            </button>
          </div>
          <input
            type="text"
            value={safeString(row.prefix)}
            onChange={(e) => updateRow(rowIdx, { prefix: e.target.value })}
            onKeyDown={handleEnterAddRow}
            className="w-20 bg-slate-950 border border-emerald-800/45 rounded-md px-2 py-1.5 text-xs text-emerald-100 font-mono"
            placeholder={prefixPlaceholder}
            aria-label={`Ký hiệu dòng ${rowIdx + 1}`}
          />
          <input
            id={`${idPrefix}-value-${rowIdx}`}
            type="text"
            value={safeString(row.value)}
            onChange={(e) => updateRow(rowIdx, { value: e.target.value })}
            onKeyDown={handleEnterAddRow}
            className={valueInputClassName}
            placeholder={valuePlaceholder}
            aria-label={`Nội dung dòng ${rowIdx + 1}`}
          />
          <button
            type="button"
            onClick={() => removeRow(rowIdx)}
            className="rounded-md border border-rose-800/50 bg-rose-950/20 px-2 py-1.5 text-xs font-bold text-rose-100 shrink-0"
            aria-label={`Xóa dòng ${rowIdx + 1}`}
          >
            X
          </button>
        </div>
      ))}
      <div className="flex items-center justify-between pt-1">
        <button
          type="button"
          onClick={addRow}
          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-900/50 px-2.5 py-1.5 text-xs font-bold text-slate-200"
        >
          <Plus size={10} aria-hidden /> Dòng
        </button>
        {showSaveButton && typeof onSave === 'function' && (
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center gap-1 rounded-md border border-amber-700/55 bg-amber-950/35 px-2.5 py-1.5 text-xs font-bold text-amber-100 hover:bg-amber-900/40"
          >
            {saveLabel}
          </button>
        )}
      </div>
    </div>
  );
}
