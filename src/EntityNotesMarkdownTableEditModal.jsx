/**
 * Modal lưới chỉnh sửa bảng GFM — nguồn vẫn là Markdown, không rich-text.
 * Ai dùng: AppEntityDetailNotes (edit/read), MasterComponents ModalMilestone.
 */

import React, { useCallback, useEffect, useState } from 'react';
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

  if (!isOpen || !grid) return null;

  const colCount = grid.header.length;

  return (
    <div
      className="fixed inset-0 z-[260] flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-sm animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-label="Chỉnh sửa bảng Markdown"
    >
      <div
        ref={trapRef}
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900 shadow-2xl"
      >
        <div className="flex items-center justify-between gap-3 border-b border-slate-800 px-5 py-4">
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

        <div className="min-h-0 flex-1 overflow-auto px-5 py-4 custom-scrollbar">
          <div className="overflow-x-auto rounded-xl border border-slate-700/60">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="bg-slate-950/80">
                  {grid.header.map((cell, ci) => (
                    <th key={`th-${ci}`} className="border border-slate-700/50 p-0 align-top">
                      <textarea
                        value={cell}
                        onChange={(e) => patchHeader(ci, e.target.value)}
                        rows={2}
                        className="w-full min-w-[7rem] resize-y bg-transparent px-2 py-2 font-bold text-amber-100/95 outline-none focus:bg-slate-950/60"
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
                          rows={3}
                          className="w-full min-w-[7rem] resize-y bg-transparent px-2 py-2 text-slate-200 outline-none focus:bg-slate-950/50 font-serif leading-relaxed"
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
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
            Xuống dòng trong ô sẽ lưu thành <code className="text-slate-400">&lt;br&gt;</code> trong Markdown. Giữ nguyên{' '}
            <code className="text-slate-400">[[wiki-link]]</code> và định dạng inline cơ bản.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 px-5 py-4">
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
      </div>
    </div>
  );
}
