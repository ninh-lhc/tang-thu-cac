/**
 * Bảng Danh sách AUTO — cùng view-model với chế độ card.
 */
import React, { memo } from 'react';
import { safeString, processInline } from './MasterUtils.jsx';

function CollectionEntityCell({ name, wikiContext }) {
  const { dirHandle, lookup, linkRegex, onNavigate, selfEntityId } = wikiContext || {};
  const wiki = `[[${safeString(name)}]]`;
  return (
    <span className="inline font-semibold text-slate-100">
      {processInline(wiki, dirHandle, lookup, linkRegex, onNavigate, selfEntityId, {
        entityNotesPreview: true,
      })}
    </span>
  );
}

function CollectionTableCell({ cell, row, wikiContext, emptyCellFallback = '' }) {
  if (cell.isEntityLink) {
    return <CollectionEntityCell name={row.entityName} wikiContext={wikiContext} />;
  }
  const text = safeString(cell.display);
  if (!text) {
    return emptyCellFallback ? (
      <span className="text-slate-500">{emptyCellFallback}</span>
    ) : null;
  }
  if (text.includes('[[') && wikiContext?.lookup) {
    return (
      <span className="whitespace-pre-wrap break-words text-slate-200/95">
        {processInline(
          text,
          wikiContext.dirHandle,
          wikiContext.lookup,
          wikiContext.linkRegex,
          wikiContext.onNavigate,
          wikiContext.selfEntityId,
          { entityNotesPreview: true },
        )}
      </span>
    );
  }
  return <span className="whitespace-pre-wrap break-words text-slate-200/95">{text}</span>;
}

export const AppCollectionTableContent = memo(function AppCollectionTableContent({
  viewModel,
  wikiContext,
  onEntitySelect,
  showIndexColumn = false,
  emptyCellFallback = '',
  hideSummary = false,
}) {
  if (!viewModel?.columns?.length) {
    return (
      <p className="text-sm text-slate-500 font-serif italic py-8 text-center">
        Chưa chọn cột — mở «Thiết lập bảng».
      </p>
    );
  }

  const { columns, rows, allCount, filteredCount, page, pageSize, pageCount } = viewModel;
  const rowOffset = ((page || 1) - 1) * (pageSize || 12);

  return (
    <div className="space-y-3">
      {!hideSummary ? (
        <div className="text-[11px] text-slate-500 font-serif flex flex-wrap gap-x-4 gap-y-1">
          <span>Tổng số thẻ: {allCount}</span>
          <span>Đang hiển thị: {filteredCount}</span>
          {pageCount > 1 ? <span>Trang: {page}/{pageCount}</span> : null}
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-slate-700/60 bg-slate-950/50">
        <table className="w-full min-w-[480px] border-collapse text-[0.92rem] text-left">
          <thead>
            <tr className="border-b border-slate-700/70 bg-slate-900/70">
              {showIndexColumn ? (
                <th className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 align-top w-12">
                  STT
                </th>
              ) : null}
              {columns.map((col) => (
                <th
                  key={col.id}
                  className="px-3 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 align-top"
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr
                key={row.entityId}
                className={`border-b border-slate-800/80 last:border-0 transition-colors hover:bg-slate-900/40 ${
                  rowIndex % 2 === 1 ? 'bg-slate-950/30' : ''
                }`}
              >
                {showIndexColumn ? (
                  <td className="px-3 py-2 align-top text-slate-500 tabular-nums text-sm">
                    {rowOffset + rowIndex + 1}
                  </td>
                ) : null}
                {row.cells.map((cell) => (
                  <td
                    key={`${row.entityId}-${cell.fieldId}`}
                    className="px-3 py-2 align-top text-slate-200/95 cursor-default"
                    onClick={() => {
                      if (cell.isEntityLink && onEntitySelect) onEntitySelect(row.entity);
                    }}
                    onKeyDown={(e) => {
                      if (cell.isEntityLink && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        onEntitySelect?.(row.entity);
                      }
                    }}
                    role={cell.isEntityLink ? 'button' : undefined}
                    tabIndex={cell.isEntityLink ? 0 : undefined}
                  >
                    <CollectionTableCell
                      cell={cell}
                      row={row}
                      wikiContext={wikiContext}
                      emptyCellFallback={emptyCellFallback}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
});
