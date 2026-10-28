/**
 * Modal lưới chỉnh sửa bảng GFM — nguồn vẫn là Markdown, không rich-text.
 * Ai dùng: AppEntityDetailNotes (edit/read), MasterComponents ModalMilestone.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Table2, Trash2, X } from 'lucide-react';
import { useFocusTrap } from './lib/useFocusTrap.js';
import {
  appendEditGridColumn,
  appendEditGridRow,
  editGridToMarkdown,
  removeEditGridColumn,
  removeEditGridRow,
  tableBlockToEditGrid,
} from './lib/markdownTableEditor.js';

/** Chiều rộng tối thiểu mỗi cột (rem) — bảng 5+ cột scroll ngang trong grid. */
const COL_MIN_WIDTH_REM = 14;

const CELL_TEXTAREA_CLASS =
  'block w-full min-h-[6.75rem] max-h-[18rem] min-w-0 resize-y overflow-x-hidden overflow-y-auto bg-transparent px-3 py-2.5 font-serif text-[0.9375rem] leading-relaxed outline-none focus:bg-slate-950/55';

const HEADER_TEXTAREA_CLASS = `${CELL_TEXTAREA_CLASS} font-bold text-amber-100/95 focus:bg-slate-950/70`;

export function EntityNotesMarkdownTableEditModal({ isOpen, tableBlock, onApply, onClose }) {
  const trapRef = useFocusTrap(isOpen);
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
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
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

  const handleApply = () => {
    if (!grid) return;
    onApply?.(editGridToMarkdown(grid));
    onClose?.();
  };

  const colCount = grid?.header?.length ?? 0;
  const tableMinWidthRem = useMemo(
    () => Math.max(colCount * COL_MIN_WIDTH_REM, 48),
    [colCount],
  );

  if (!isOpen || !grid) return null;

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/85 p-3 sm:p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Chỉnh sửa bảng Markdown"
    >
      <div
        ref={trapRef}
        data-testid="entity-notes-table-edit-modal-panel"
        className="flex h-[min(92vh,940px)] max-h-[92vh] w-[min(96vw,1880px)] max-w-[1880px] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl"
      >
        <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-slate-800 px-4 py-3 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2 text-slate-100">
            <Table2 size={18} className="text-amber-400" aria-hidden />
            <h2 className="text-lg font-heading font-bold">Chỉnh sửa bảng</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        <div
          data-testid="entity-notes-table-edit-grid-scroll"
          className="min-h-0 flex-1 overflow-auto overscroll-contain custom-scrollbar px-3 py-3 sm:px-5 sm:py-4"
        >
          <div className="w-full min-w-0 overflow-x-auto rounded-xl border border-slate-700/60 custom-scrollbar">
            <table
              data-testid="entity-notes-table-edit-grid-table"
              className="w-full border-collapse text-[0.9375rem]"
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
              <thead className="sticky top-0 z-[1]">
                <tr className="bg-slate-950/95 backdrop-blur-sm shadow-[0_1px_0_0_rgba(51,65,85,0.65)]">
                  {grid.header.map((cell, ci) => (
                    <th key={`th-${ci}`} className="border border-slate-700/50 p-0 align-top">
                      <textarea
                        value={cell}
                        onChange={(e) => patchHeader(ci, e.target.value)}
                        rows={2}
                        className={HEADER_TEXTAREA_CLASS}
                        aria-label={`Tiêu đề cột ${ci + 1}`}
                      />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {grid.rows.map((row, ri) => (
                  <tr key={`tr-${ri}`} className="bg-slate-900/40">
                    {row.map((cell, ci) => (
                      <td key={`td-${ri}-${ci}`} className="border border-slate-700/40 p-0 align-top">
                        <textarea
                          value={cell}
                          onChange={(e) => patchCell(ri, ci, e.target.value)}
                          rows={4}
                          className={`${CELL_TEXTAREA_CLASS} text-slate-200`}
                          aria-label={`Ô hàng ${ri + 1} cột ${ci + 1}`}
                          placeholder="Wiki [[Tên]], **bold**, xuống dòng…"
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
          className="flex flex-shrink-0 flex-col gap-3 border-t border-slate-800 bg-slate-900/95 px-4 py-3 backdrop-blur-sm sm:px-5 sm:py-4"
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
}
