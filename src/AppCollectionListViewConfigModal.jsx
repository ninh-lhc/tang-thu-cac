/**
 * Modal cấu hình cột bảng Danh sách AUTO — lưu vào tabsConfig.listViewConfig.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

export function AppCollectionListViewConfigModal({
  fieldOptions = [],
  initialColumns = [],
  onClose,
  onSave,
}) {
  const [columns, setColumns] = useState(() => [...initialColumns]);
  const [fieldQuery, setFieldQuery] = useState('');

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const visible = useMemo(() => {
    const q = fieldQuery.trim().toLowerCase();
    if (!q) return fieldOptions;
    return fieldOptions.filter(
      (f) => f.label.toLowerCase().includes(q) || f.id.toLowerCase().includes(q),
    );
  }, [fieldOptions, fieldQuery]);

  const toggle = (id) => {
    setColumns((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
  };

  const move = (id, delta) => {
    setColumns((cur) => {
      const i = cur.indexOf(id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= cur.length) return cur;
      const copy = [...cur];
      const [item] = copy.splice(i, 1);
      copy.splice(j, 0, item);
      return copy;
    });
  };

  const dialog = (
    <div
      className="fixed inset-0 z-[1000] flex items-stretch justify-center bg-slate-950/70 p-[4vh_4vw]"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="collection-list-view-config-title"
        className="flex min-h-0 w-full max-w-2xl flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
        style={{ maxHeight: '92vh' }}
      >
        <header className="flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
          <h2 id="collection-list-view-config-title" className="text-sm font-bold text-slate-100">
            Thiết lập bảng
          </h2>
          <button type="button" onClick={onClose} aria-label="Đóng" className="rounded-lg px-2 py-1 text-lg text-slate-400 hover:bg-slate-800">
            ×
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4 text-sm">
          <input
            value={fieldQuery}
            onChange={(e) => setFieldQuery(e.target.value)}
            placeholder="Tìm field"
            aria-label="Tìm field"
            className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-[12px]"
          />
          {columns.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {columns.map((id) => {
                const f = fieldOptions.find((x) => x.id === id);
                return (
                  <span key={id} className="inline-flex items-center gap-1 rounded-full border border-violet-800/60 px-2 py-0.5 text-[11px]">
                    {f?.label || id}
                    <button type="button" aria-label={`Đưa ${f?.label || id} lên`} onClick={() => move(id, -1)}>↑</button>
                    <button type="button" aria-label={`Đưa ${f?.label || id} xuống`} onClick={() => move(id, 1)}>↓</button>
                  </span>
                );
              })}
            </div>
          )}
          <div className="grid gap-1 sm:grid-cols-2">
            {visible.map((field) => (
              <label key={field.id} className="flex items-start gap-2 rounded-lg border border-slate-800 px-2 py-1.5">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={columns.includes(field.id)}
                  onChange={() => toggle(field.id)}
                />
                <span className="min-w-0">
                  <span className="block text-[13px] text-slate-100">
                    {field.label}
                    {field.ambiguous ? ` · ${field.scopeLabel || field.id}` : ''}
                  </span>
                  <span className="block font-mono text-[10px] text-slate-500">{field.id}</span>
                  {typeof field.populatedCount === 'number' && (
                    <span className="mt-0.5 block text-[10px] text-slate-600">
                      Có dữ liệu: {field.populatedCount}/{field.totalCount}
                      {field.sampleValues?.[0] ? ` · Ví dụ: ${field.sampleValues[0]}` : ''}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>
        <footer className="flex shrink-0 justify-end gap-2 border-t border-slate-800 bg-slate-950 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300">
            Hủy
          </button>
          <button
            type="button"
            disabled={!columns.length}
            onClick={() => columns.length && onSave(columns)}
            className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            Lưu cấu hình
          </button>
        </footer>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return dialog;
  return createPortal(dialog, document.body);
}
