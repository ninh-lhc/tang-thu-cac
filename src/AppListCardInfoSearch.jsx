// Ô tìm kiếm + lọc dòng nội dung thẻ «Danh sách» (AUTO) ở chế độ Hồ sơ.
import React, { useDeferredValue, useId, useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { safeString } from './MasterUtils.jsx';
import { renderEntityNotesMarkdown } from './lib/renderEntityNotesMarkdown.jsx';
import { filterListCardInfoBySearchQuery } from './lib/listCardInfoSearch.js';

export function AppListCardInfoSearch({
  info,
  dirHandle,
  entityMap,
  linkRegex,
  onNavigate,
  selfEntityId,
}) {
  const [query, setQuery] = useState('');
  const deferred = useDeferredValue(safeString(query).trim());
  const inputId = useId();

  const { text, matchCount, isFiltered } = useMemo(
    () => filterListCardInfoBySearchQuery(safeString(info), deferred),
    [info, deferred]
  );

  return (
    <div className="space-y-2 min-h-[200px]">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-700/80 bg-slate-900/60 px-2.5 py-2">
        <label htmlFor={inputId} className="flex items-center gap-1.5 text-slate-400 shrink-0">
          <Search size={16} className="opacity-80" aria-hidden />
          <span className="text-[11px] font-bold uppercase tracking-wider">Tìm trong danh mục</span>
        </label>
        <div className="flex flex-1 min-w-[10rem] items-center gap-1">
          <input
            id={inputId}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tên thẻ, chuỗi hiển thị, đường dẫn…"
            autoComplete="off"
            className="tt-kbd-focus flex-1 min-w-0 rounded-md border border-slate-600/80 bg-slate-950/90 px-2.5 py-1.5 text-sm text-slate-100 placeholder:text-slate-500 font-serif"
          />
          {query.trim() ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="shrink-0 rounded-md p-1.5 text-slate-500 hover:text-amber-200 hover:bg-amber-950/40"
              title="Xóa tìm kiếm"
              aria-label="Xóa tìm kiếm"
            >
              <X size={16} />
            </button>
          ) : null}
        </div>
        {isFiltered ? (
          <span className="text-[11px] text-slate-500 font-serif tabular-nums shrink-0" aria-live="polite">
            {matchCount === 0 ? 'Không có dòng khớp' : `${matchCount} dòng khớp`}
          </span>
        ) : null}
      </div>
      {isFiltered && matchCount === 0 ? (
        <p className="text-sm text-amber-200/90 font-serif border border-amber-900/50 rounded-md px-3 py-2 bg-amber-950/25">
          Thử từ khóa khác (không phân biệt dấu) hoặc xóa ô tìm để xem toàn bộ danh mục.
        </p>
      ) : null}
      <div className="font-serif max-w-none animate-fade-in">
        {renderEntityNotesMarkdown(
          text,
          dirHandle,
          entityMap,
          linkRegex,
          onNavigate,
          selfEntityId
        )}
      </div>
    </div>
  );
}
