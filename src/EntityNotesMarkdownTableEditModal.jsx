/**
 * Modal lưới chỉnh sửa bảng GFM — nguồn vẫn là Markdown, không rich-text.
 * Ai dùng: AppEntityDetailNotes (edit/read), MasterComponents ModalMilestone.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, Table2, Trash2, X } from 'lucide-react';
import { useFocusTrap } from './lib/useFocusTrap.js';
import {
  stepTableEditGridFocus,
  tableEditFocusTargetToSelector,
} from './lib/markdownTableEditGridFocus.js';
import {
  appendEditGridColumn,
  appendEditGridRow,
  editGridToMarkdown,
  removeEditGridColumn,
  removeEditGridRow,
  tableBlockToEditGrid,
} from './lib/markdownTableEditor.js';
import { EntityNotesTableCellHighlightTextarea } from './EntityNotesTableCellHighlightTextarea.jsx';

/** Chiều rộng tối thiểu mỗi cột (rem) — bảng 5+ cột scroll ngang trong grid. */
const COL_MIN_WIDTH_REM = 14;

export function EntityNotesMarkdownTableEditModal({
  isOpen,
  tableBlock,
  tableIndex = null,
  onApply,
  onClose,
  entityMap = null,
  selfEntityId = null,
}) {
  const trapRef = useFocusTrap(isOpen);
  const panelRef = useRef(null);
  const setTrapRef = useCallback(
    (node) => {
      trapRef.current = node;
      panelRef.current = node;
    },
    [trapRef],
  );
  const [grid, setGrid] = useState(null);

  useEffect(() => {
    if (!isOpen || !tableBlock) {
      setGrid(null);
      return;
    }
    setGrid(tableBlockToEditGrid(tableBlock));
  }, [isOpen, tableBlock]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const prevBodyOverflow = document.body.style.overflow;
    const prevHtmlOverflowX = document.documentElement.style.overflowX;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    document.body.setAttribute('data-entity-notes-table-edit-open', '');
    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overflowX = prevHtmlOverflowX;
      document.body.removeAttribute('data-entity-notes-table-edit-open');
    };
  }, [isOpen]);

  const patchHeader = useCallback((colIndex, value) => {
    setGrid((prev) => {
      if (!prev) return prev;
      const header = [...prev.header];
      header[colIndex] = value;
      return { ...prev, header };
    });
  }, []);

  const patchCell = useCallback((rowIndex, colIndex, value) => {
    setGrid((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.map((row, ri) =>
        ri === rowIndex ? row.map((cell, ci) => (ci === colIndex ? value : cell)) : row,
      );
      return { ...prev, rows };
    });
  }, []);

  const handleApply = useCallback(() => {
    if (!grid) return;
    onApply?.(editGridToMarkdown(grid));
    onClose?.();
  }, [grid, onApply, onClose]);

  const colCount = grid?.header?.length ?? 0;
  const rowCount = grid?.rows?.length ?? 0;
  const tableMinWidthRem = useMemo(
    () => Math.max(colCount * COL_MIN_WIDTH_REM, 48),
    [colCount],
  );

  const tableMetaLabel = useMemo(() => {
    const size = `${colCount} cột · ${rowCount} hàng`;
    if (tableIndex != null && Number.isFinite(tableIndex)) {
      return `Bảng ${tableIndex + 1} · ${size}`;
    }
    return size;
  }, [colCount, rowCount, tableIndex]);

  const focusTableEditCell = useCallback((target) => {
    const root = panelRef.current;
    if (!root || !target) return;
    const selector = tableEditFocusTargetToSelector(target);
    if (!selector) return;
    const el = root.querySelector(selector);
    if (el instanceof HTMLElement) el.focus();
  }, []);

  const handleCellKeyDown = useCallback(
    (coords) => (event) => {
      const isModEnter = event.key === 'Enter' && (event.ctrlKey || event.metaKey);
      if (isModEnter) {
        event.preventDefault();
        handleApply();
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose?.();
        return;
      }
      if (event.key !== 'Tab' || event.altKey) return;
      event.preventDefault();
      const direction = event.shiftKey ? 'prev' : 'next';
      const next = stepTableEditGridFocus({
        colCount,
        rowCount,
        kind: coords.kind,
        col: coords.col,
        row: coords.row,
        direction,
      });
      if (direction === 'prev' && next == null) {
        panelRef.current?.querySelector('[data-testid="entity-notes-table-edit-close"]')?.focus?.();
        return;
      }
      focusTableEditCell(next);
    },
    [colCount, rowCount, focusTableEditCell, onClose, handleApply],
  );

  const handlePanelKeyDown = useCallback(
    (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    },
    [onClose],
  );

  if (!isOpen || !grid) return null;

  const dialog = (
    <div
      data-testid="entity-notes-table-edit-modal-overlay"
      className="fixed inset-0 z-[260] box-border flex h-dvh max-h-dvh w-full items-center justify-center overflow-x-hidden overflow-y-auto bg-slate-950/85 p-3 backdrop-blur-sm sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Chỉnh sửa bảng Markdown"
    >
      <div
        ref={setTrapRef}
        data-testid="entity-notes-table-edit-modal-panel"
        onKeyDown={handlePanelKeyDown}
        className="box-border flex h-[min(92dvh,940px,calc(100dvh-1.5rem))] max-h-[min(92dvh,940px,calc(100dvh-1.5rem))] min-h-0 w-full min-w-0 max-w-[min(96vw,1880px)] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl animate-fade-in"
      >
        <div
          data-testid="entity-notes-table-edit-header"
          className="flex w-full min-w-0 shrink-0 items-center justify-between gap-3 overflow-hidden border-b border-slate-800 px-4 py-3 sm:px-5 sm:py-4"
        >
          <div className="flex min-w-0 flex-col gap-0.5 text-slate-100">
            <div className="flex min-w-0 items-center gap-2">
              <Table2 size={18} className="shrink-0 text-amber-400" aria-hidden />
              <h2 className="truncate text-lg font-heading font-bold">Chỉnh sửa bảng</h2>
            </div>
            <p
              data-testid="entity-notes-table-edit-meta"
              className="truncate pl-[26px] text-[11px] font-normal leading-snug text-slate-500"
            >
              {tableMetaLabel}
            </p>
          </div>
          <button
            type="button"
            data-testid="entity-notes-table-edit-close"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div
          data-testid="entity-notes-table-edit-grid-scroll"
          className="entity-notes-table-edit-grid-scroll relative isolate min-h-0 min-w-0 w-full max-w-full flex-1 overflow-x-auto overflow-y-auto overscroll-contain custom-scrollbar px-3 pb-3 pt-0 sm:px-5 sm:pb-4 sm:pt-0"
        >
          <div className="inline-block min-w-full align-top rounded-xl border border-slate-700/60">
            <table
              data-testid="entity-notes-table-edit-grid-table"
              className="entity-notes-table-edit-grid w-full border-separate border-spacing-0 text-[0.9375rem] leading-relaxed"
              style={{ minWidth: `${tableMinWidthRem}rem` }}
            >
              <colgroup>
                {grid.header.map((_, ci) => (
                  <col
                    key={`col-${ci}`}
                    style={{
                      minWidth: `${COL_MIN_WIDTH_REM}rem`,
                      width: `${100 / Math.max(colCount, 1)}%`,
                    }}
                  />
                ))}
              </colgroup>
              <thead data-testid="entity-notes-table-edit-thead" className="[position:static]">
                <tr>
                  {grid.header.map((cell, ci) => (
                    <th
                      key={`th-${ci}`}
                      className="entity-notes-table-edit-th sticky top-0 z-30 border border-slate-700/50 bg-slate-950 p-0 align-top [background-clip:padding-box] shadow-[0_1px_0_0_rgba(51,65,85,0.75)] [&_.markdown-table-cell-highlight]:bg-slate-950"
                    >
                      <EntityNotesTableCellHighlightTextarea
                        value={cell}
                        onChange={(e) => patchHeader(ci, e.target.value)}
                        onKeyDown={handleCellKeyDown({ kind: 'header', col: ci })}
                        tableEditCellId={`header-${ci}`}
                        rows={2}
                        headerCell
                        ariaLabel={`Tiêu đề cột ${ci + 1}`}
                        entityMap={entityMap}
                        selfEntityId={selfEntityId}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="relative z-0">
                {grid.rows.map((row, ri) => (
                  <tr key={`tr-${ri}`} className={ri % 2 === 1 ? 'bg-slate-900/55' : 'bg-slate-900/40'}>
                    {row.map((cell, ci) => (
                      <td
                        key={`td-${ri}-${ci}`}
                        className="entity-notes-table-edit-td isolate border border-slate-700/40 bg-slate-900/40 p-0 align-top [z-index:0]"
                      >
                        <EntityNotesTableCellHighlightTextarea
                          value={cell}
                          onChange={(e) => patchCell(ri, ci, e.target.value)}
                          onKeyDown={handleCellKeyDown({ kind: 'body', row: ri, col: ci })}
                          tableEditCellId={`body-${ri}-${ci}`}
                          rows={4}
                          ariaLabel={`Ô hàng ${ri + 1} cột ${ci + 1}`}
                          placeholder="Wiki [[Tên]], **bold**, xuống dòng…"
                          entityMap={entityMap}
                          selfEntityId={selfEntityId}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <footer
          data-testid="entity-notes-table-edit-footer"
          className="relative z-[2] flex w-full min-w-0 shrink-0 flex-col gap-3 overflow-hidden border-t border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-sm sm:px-5 sm:py-4"
        >
          <p className="text-[11px] leading-relaxed text-slate-500">
            Xuống dòng trong ô sẽ lưu thành <code className="text-slate-400">&lt;br&gt;</code> trong Markdown. Giữ nguyên{' '}
            <code className="text-slate-400">[[wiki-link]]</code> và định dạng inline cơ bản.
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setGrid((g) => (g ? appendEditGridRow(g) : g))}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                <Plus size={14} /> Thêm dòng
              </button>
              <button
                type="button"
                onClick={() => setGrid((g) => (g ? appendEditGridColumn(g) : g))}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-700"
              >
                <Plus size={14} /> Thêm cột
              </button>
              {grid.rows.length > 1 && (
                <button
                  type="button"
                  onClick={() => setGrid((g) => (g ? removeEditGridRow(g, g.rows.length - 1) : g))}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-900/50 bg-rose-950/30 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-900/40"
                >
                  <Trash2 size={14} /> Xóa dòng cuối
                </button>
              )}
              {colCount > 1 && (
                <button
                  type="button"
                  onClick={() => setGrid((g) => (g ? removeEditGridColumn(g, g.header.length - 1) : g))}
                  className="flex items-center gap-1.5 rounded-lg border border-rose-900/50 bg-rose-950/30 px-3 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-900/40"
                >
                  <Trash2 size={14} /> Xóa cột cuối
                </button>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 px-4 py-2 text-xs font-bold text-slate-400 hover:bg-slate-800"
              >
                Hủy
              </button>
              <button
                type="button"
                data-testid="entity-notes-table-edit-apply"
                onClick={handleApply}
                className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-bold text-white hover:bg-emerald-500"
              >
                Áp dụng
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );

  if (typeof document === 'undefined') return dialog;
  return createPortal(dialog, document.body);
}
