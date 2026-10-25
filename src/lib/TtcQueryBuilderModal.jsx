/**
 * Query Builder: chọn phạm vi/cột/lọc/sort/limit, xem trước, chèn block ttc-query.
 */
import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { executeTtcQuery } from './ttcQueryEngine.js';
import { parseTtcQuery } from './ttcQueryParser.js';
import {
  TTC_BUILDER_OPS,
  compileTtcQueryMarkdown,
  listTtcQueryFieldOptions,
  listTtcQueryScopes,
  ttcFieldGroupTitle,
} from './ttcQueryBuilder.js';

const emptyFilter = () => ({ field: 'entity', op: 'contains', value: '' });
const PREVIEW_CAP = 20;
const GROUP_ORDER = ['content', 'advanced'];

function initialScopeId(scopes, lonId, nhoId) {
  if (lonId && nhoId && scopes.some((item) => item.id === `nho:${lonId}|${nhoId}`)) {
    return `nho:${lonId}|${nhoId}`;
  }
  if (lonId && scopes.some((item) => item.id === `lon:${lonId}`)) return `lon:${lonId}`;
  return 'all';
}

function FieldOptionGrid({ rows, columns, toggleColumn }) {
  return (
    <div className="grid gap-1 sm:grid-cols-2">
      {rows.map((field) => (
          <label
            key={field.id}
            title={field.fallback ? `${field.label} (nhãn tạm từ mã field)` : field.label}
            className="flex items-start gap-2 rounded-lg border border-slate-800 px-2 py-1.5"
          >
            <input
              type="checkbox"
              className="mt-0.5"
              checked={columns.includes(field.id)}
              onChange={() => toggleColumn(field.id)}
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
                              {field.sampleValues?.[0]
                                ? ` · Ví dụ: ${field.sampleValues[0]}`
                                : field.populatedCount === 0
                                  ? ' · (trống trong phạm vi)'
                                  : ''}
                            </span>
                          )}
                          {field.semanticMismatch?.message && (
                            <span className="mt-0.5 block text-[10px] text-amber-400/90">
                              {field.semanticMismatch.message}
                            </span>
                          )}
                        </span>
                      </label>
        ))}
    </div>
  );
}

function FieldCheckboxList({ group, scope, rows, columns, toggleColumn }) {
  if (!rows.length) return null;

  if (group === 'advanced') {
    return (
      <details className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-3 py-2">
        <summary className="cursor-pointer text-[11px] font-bold text-slate-400">
          {ttcFieldGroupTitle('advanced', scope)} (mở rộng)
        </summary>
        <div className="mt-2">
          <FieldOptionGrid rows={rows} columns={columns} toggleColumn={toggleColumn} />
        </div>
        <p className="mt-2 text-[10px] text-slate-600">
          Trường <span className="font-mono">folder</span> vẫn dùng được trong query cũ; builder chỉ hiển thị{' '}
          <span className="font-mono">folderPath</span>.
        </p>
      </details>
    );
  }

  return (
    <fieldset className="space-y-1">
      <legend className="text-[11px] font-bold text-slate-400">{ttcFieldGroupTitle(group, scope)}</legend>
      <FieldOptionGrid rows={rows} columns={columns} toggleColumn={toggleColumn} />
    </fieldset>
  );
}

export function TtcQueryBuilderModal({
  activeNovelData,
  initialLonId = '',
  initialNhoId = '',
  onClose,
  onInsert,
}) {
  const scopes = useMemo(() => listTtcQueryScopes(activeNovelData), [activeNovelData]);
  const [scopeId, setScopeId] = useState(() => initialScopeId(scopes, initialLonId, initialNhoId));
  const scope = scopes.find((item) => item.id === scopeId) || scopes[0];
  const fields = useMemo(
    () => listTtcQueryFieldOptions(activeNovelData, scope),
    [activeNovelData, scope],
  );
  const [columns, setColumns] = useState(['entity']);
  const [filters, setFilters] = useState([]);
  const [sortField, setSortField] = useState('entity');
  const [sortDir, setSortDir] = useState('asc');
  const [limit, setLimit] = useState(50);
  const [fieldQuery, setFieldQuery] = useState('');

  const compiled = useMemo(
    () =>
      compileTtcQueryMarkdown({
        scope,
        columns,
        filters,
        sortField,
        sortDir,
        limit,
      }),
    [scope, columns, filters, sortField, sortDir, limit],
  );

  const preview = useMemo(() => {
    if (!columns.length) {
      return { ok: false, errors: ['Hãy chọn ít nhất một cột.'] };
    }
    if (!compiled.ok) return null;
    const parsed = parseTtcQuery(compiled.source);
    if (!parsed.ok) return { ok: false, errors: parsed.errors };
    return executeTtcQuery(activeNovelData, parsed.query);
  }, [activeNovelData, compiled, columns.length]);

  const visibleFields = fields.filter((field) => {
    const q = fieldQuery.trim().toLowerCase();
    if (!q) return true;
    return field.label.toLowerCase().includes(q) || field.id.toLowerCase().includes(q);
  });

  const toggleColumn = (id) => {
    setColumns((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  const moveColumn = (id, delta) => {
    setColumns((current) => {
      const index = current.indexOf(id);
      const next = index + delta;
      if (index < 0 || next < 0 || next >= current.length) return current;
      const copy = [...current];
      const [item] = copy.splice(index, 1);
      copy.splice(next, 0, item);
      return copy;
    });
  };

  const shown = Math.min(PREVIEW_CAP, preview?.rows?.length || 0);
  const total = preview?.totalMatched ?? 0;
  const insertDisabled =
    !columns.length || !compiled.ok || !preview?.ok;

  const dialog = (
    <div
      className="fixed inset-0 z-[1000] flex items-stretch justify-center bg-slate-950/70 p-[4vh_4vw]"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ttc-query-builder-title"
        className="ttc-query-builder-dialog flex min-h-0 w-full max-w-3xl flex-col rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl"
        style={{ maxHeight: '92vh' }}
      >
        <header className="ttc-query-builder-header flex shrink-0 items-center justify-between border-b border-slate-800 px-4 py-3">
          <div>
            <h2 id="ttc-query-builder-title" className="text-sm font-bold text-slate-100">
              Tạo bảng dữ liệu
            </h2>
            <p className="text-[11px] text-slate-500">
              Chèn block ttc-query — kết quả cập nhật theo truyện đang mở.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            title="Đóng"
            className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-800"
          >
            ×
          </button>
        </header>

        <div className="ttc-query-builder-body min-h-0 flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-4 py-4 text-sm text-slate-200">
          <label className="block space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Phạm vi</span>
            <select
              aria-label="Phạm vi"
              value={scope?.id || 'all'}
              onChange={(e) => setScopeId(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2"
            >
              {scopes.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Cột hiển thị</span>
              <input
                value={fieldQuery}
                onChange={(e) => setFieldQuery(e.target.value)}
                placeholder="Tìm field"
                aria-label="Tìm field"
                className="w-40 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-[12px]"
              />
            </div>
            {columns.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {columns.map((id) => {
                  const field = fields.find((item) => item.id === id);
                  return (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full border border-violet-800/60 px-2 py-0.5 text-[11px]"
                    >
                      {field?.label || id}
                      <button type="button" aria-label={`Đưa ${field?.label || id} lên`} onClick={() => moveColumn(id, -1)}>
                        ↑
                      </button>
                      <button type="button" aria-label={`Đưa ${field?.label || id} xuống`} onClick={() => moveColumn(id, 1)}>
                        ↓
                      </button>
                    </span>
                  );
                })}
              </div>
            )}
            {GROUP_ORDER.map((group) => (
              <FieldCheckboxList
                key={group}
                group={group}
                scope={scope}
                rows={visibleFields.filter((field) => field.group === group)}
                columns={columns}
                toggleColumn={toggleColumn}
              />
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Bộ lọc (AND)</span>
              <button
                type="button"
                className="text-[11px] font-bold text-cyan-300"
                onClick={() => setFilters((rows) => [...rows, emptyFilter()])}
              >
                Thêm điều kiện
              </button>
            </div>
            {filters.map((filter, index) => (
              <div key={`filter-${index}`} className="grid grid-cols-[1fr_auto_1fr_auto] gap-2">
                <select
                  aria-label={`Field lọc ${index + 1}`}
                  value={filter.field}
                  onChange={(e) =>
                    setFilters((rows) => rows.map((row, i) => (i === index ? { ...row, field: e.target.value } : row)))
                  }
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                >
                  {fields.map((field) => (
                    <option key={field.id} value={field.id}>
                      {field.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={`Toán tử lọc ${index + 1}`}
                  value={filter.op}
                  onChange={(e) =>
                    setFilters((rows) => rows.map((row, i) => (i === index ? { ...row, op: e.target.value } : row)))
                  }
                  className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                >
                  {TTC_BUILDER_OPS.map((op) => (
                    <option key={op.id} value={op.id}>
                      {op.label}
                    </option>
                  ))}
                </select>
                {filter.op === 'isEmpty' || filter.op === 'isNotEmpty' ? (
                  <span className="self-center text-[11px] text-slate-500">Không cần giá trị</span>
                ) : (
                  <input
                    aria-label={`Giá trị lọc ${index + 1}`}
                    value={filter.value}
                    onChange={(e) =>
                      setFilters((rows) => rows.map((row, i) => (i === index ? { ...row, value: e.target.value } : row)))
                    }
                    className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
                    placeholder="Giá trị"
                  />
                )}
                <button
                  type="button"
                  className="text-[11px] text-rose-300"
                  onClick={() => setFilters((rows) => rows.filter((_, i) => i !== index))}
                >
                  Xóa
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-2">
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Sắp xếp</span>
              <select
                aria-label="Sắp xếp"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
              >
                <option value="">Không sắp xếp thêm</option>
                {fields.map((field) => (
                  <option key={field.id} value={field.id}>
                    {field.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Chiều</span>
              <select
                aria-label="Chiều sắp xếp"
                value={sortDir}
                onChange={(e) => setSortDir(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
              >
                <option value="asc">Tăng dần</option>
                <option value="desc">Giảm dần</option>
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">Số dòng tối đa</span>
              <input
                aria-label="Số dòng tối đa"
                type="number"
                min={1}
                max={500}
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1"
              />
            </label>
          </div>

          {!compiled.ok && (
            <ul className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-[12px] text-rose-100">
              {compiled.errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}

          {preview && !preview.ok && (
            <ul className="rounded-xl border border-rose-500/40 bg-rose-950/30 px-3 py-2 text-[12px] text-rose-100">
              {(preview.errors || []).map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}

          {preview?.ok && (
            <div className="ttc-query-builder-preview max-h-[260px] overflow-auto rounded-xl border border-slate-800 bg-slate-900/60 p-3">
              <div className="mb-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                {shown}/{total} kết quả
                {shown < total ? ` (xem trước ${shown} dòng đầu)` : ''}
              </div>
              {preview.rows.length === 0 ? (
                <p className="text-[12px] italic text-slate-500">Không có kết quả phù hợp.</p>
              ) : (
                <table className="w-full text-left text-[12px]">
                  <thead>
                    <tr>
                      {preview.columns.map((col) => (
                        <th key={col.id} className="px-2 py-1 text-slate-400">
                          {col.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.rows.slice(0, PREVIEW_CAP).map((row) => (
                      <tr key={row.entityId}>
                        {row.cells.map((cell) => (
                          <td key={`${row.entityId}-${cell.fieldId}`} className="px-2 py-1">
                            {cell.display}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          <details className="rounded-xl bg-slate-900 px-3 py-2">
            <summary className="cursor-pointer text-[11px] font-bold text-slate-400">Nguồn Markdown</summary>
            <pre className="mt-2 max-h-24 overflow-auto font-mono text-[11px] text-slate-400">{compiled.markdown}</pre>
          </details>
        </div>

        <footer className="ttc-query-builder-footer flex shrink-0 justify-end gap-2 border-t border-slate-800 bg-slate-950 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-xl border border-slate-700 px-3 py-2 text-xs text-slate-300">
            Hủy
          </button>
          <button
            type="button"
            disabled={insertDisabled}
            onClick={() => !insertDisabled && onInsert(compiled.markdown)}
            className="rounded-xl bg-violet-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            Chèn bảng động
          </button>
        </footer>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return dialog;
  return createPortal(dialog, document.body);
}

