/**
 * Phân trang chung cho lưới collection và Dynamic AUTO (thẻ Danh sách).
 */
import React, { memo, useCallback } from 'react';
import { buildPageNumbers } from './entityCollectionPagination.js';

export const EntityCollectionPagination = memo(function EntityCollectionPagination({
  page = 1,
  pageCount = 1,
  setPage,
  className = '',
}) {
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), Math.max(1, pageCount));
  const totalPages = Math.max(1, Math.trunc(pageCount) || 1);

  const go = useCallback(
    (next) => {
      if (typeof setPage !== 'function') return;
      const p = Math.min(Math.max(1, Math.trunc(next) || 1), totalPages);
      setPage(p);
    },
    [setPage, totalPages],
  );

  if (totalPages <= 1) return null;

  const pageNums = buildPageNumbers(safePage, totalPages);

  return (
    <nav
      className={`auto-view-pagination flex flex-wrap items-center justify-center gap-2 pt-4 mt-2 border-t border-slate-800/80 ${className}`.trim()}
      aria-label="Phân trang danh sách thẻ"
    >
      <button
        type="button"
        onClick={() => go(safePage - 1)}
        disabled={safePage <= 1}
        aria-label="Trang trước"
        className="tt-kbd-focus px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        ‹ Trang trước
      </button>
      <span className="text-xs text-slate-500 font-serif tabular-nums px-1" aria-live="polite">
        Trang {safePage}/{totalPages}
      </span>
      <div className="flex flex-wrap gap-1 justify-center">
        {pageNums.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => go(p)}
            aria-label={`Trang ${p}`}
            aria-current={p === safePage ? 'page' : undefined}
            className={`tt-kbd-focus w-8 h-8 rounded-lg text-xs font-bold transition-colors ${
              p === safePage
                ? 'bg-amber-700 text-white border border-amber-600/50'
                : 'bg-slate-900 border border-slate-800 text-slate-500 hover:text-slate-200'
            }`}
          >
            {p}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={() => go(safePage + 1)}
        disabled={safePage >= totalPages}
        aria-label="Trang sau"
        className="tt-kbd-focus px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs text-slate-400 hover:text-slate-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
      >
        Trang sau ›
      </button>
    </nav>
  );
});
