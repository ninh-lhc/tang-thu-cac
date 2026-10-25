/**
 * Preview động «Danh mục thẻ (AUTO)» trong ghi chú thẻ Danh sách — cùng view-model collection.
 */
import React, { memo } from 'react';
import { safeString, processInline } from './MasterUtils.jsx';
import { getEntityAutoDisplayString, COLLECTION_AUTO_LIST_TITLE } from './lib/collectionListCardSync.js';
import { AppCollectionTableContent } from './AppCollectionTableContent.jsx';
import { EntityCollectionPagination } from './lib/EntityCollectionPagination.jsx';

function buildAutoListLineMarkdown(entity) {
  const name = safeString(entity?.name).trim();
  if (!name) return '';
  const display = getEntityAutoDisplayString(entity);
  if (display) return `[[${name}]] \u00b7 ${display}`;
  return `[[${name}]]`;
}

function AutoViewStatus({ viewModel }) {
  const { allCount, filteredCount, page, pageCount } = viewModel || {};
  return (
    <div className="auto-view-status text-[11px] text-slate-500 font-serif flex flex-wrap gap-x-4 gap-y-1">
      <span>Tổng số thẻ: {allCount ?? 0}</span>
      <span>Đang hiển thị: {filteredCount ?? 0}</span>
      {pageCount > 1 ? (
        <span className="tabular-nums">
          Trang: {page}/{pageCount}
        </span>
      ) : null}
    </div>
  );
}

export const EntityAutoListView = memo(function EntityAutoListView({ viewModel, wikiContext }) {
  const { dirHandle, lookup, linkRegex, onNavigate, selfEntityId } = wikiContext || {};
  const { rows, page, pageSize } = viewModel || {};
  const startIdx = ((page || 1) - 1) * (pageSize || 12);

  if (!rows?.length) {
    const { filteredCount, allCount } = viewModel || {};
    return (
      <p className="text-sm text-slate-500 font-serif italic py-2">
        {filteredCount === 0 && allCount > 0
          ? 'Không có thẻ nào khớp bộ lọc hiện tại.'
          : 'Chưa có thẻ nào trong tab này.'}
      </p>
    );
  }

  return (
    <ol className="mb-0 list-none space-y-2 border-l-2 border-slate-700/40 pl-3 text-[1.08rem] leading-[1.85] text-slate-200/95">
      {rows.map((row, i) => {
        const line = buildAutoListLineMarkdown(row.entity);
        const n = startIdx + i + 1;
        return (
          <li key={row.entityId} className="flex gap-2">
            <span className="min-w-[1.75rem] pt-0.5 text-right text-sm font-semibold text-slate-500 tabular-nums">
              {n}.
            </span>
            <span>
              {processInline(line, dirHandle, lookup, linkRegex, onNavigate, selfEntityId, {
                entityNotesPreview: true,
              })}
            </span>
          </li>
        );
      })}
    </ol>
  );
});

export const EntityAutoView = memo(function EntityAutoView({
  viewModel,
  listViewMode = 'list',
  wikiContext,
  onEntitySelect,
  showTitle = true,
  setEntityPage = null,
}) {
  if (!viewModel) return null;

  return (
    <section
      className="entity-auto-view my-6 flex flex-col gap-3 min-h-0 overflow-visible"
      data-ttc-auto-list="dynamic"
    >
      {showTitle ? (
        <h1 className="mt-8 mb-1 border-b border-violet-500/25 pb-3 text-[2.15rem] font-heading font-bold text-violet-200 flex-shrink-0">
          {COLLECTION_AUTO_LIST_TITLE.replace(/^#\s*/, '')}
        </h1>
      ) : null}
      <AutoViewStatus viewModel={viewModel} />
      <div className="auto-view-content min-h-0 overflow-x-auto overflow-y-visible">
        {listViewMode === 'table' ? (
          <AppCollectionTableContent
            viewModel={viewModel}
            wikiContext={wikiContext}
            onEntitySelect={onEntitySelect}
            showIndexColumn
            emptyCellFallback={'\u2014'}
            hideSummary
          />
        ) : (
          <EntityAutoListView viewModel={viewModel} wikiContext={wikiContext} />
        )}
      </div>
      <EntityCollectionPagination
        page={viewModel.page}
        pageCount={viewModel.pageCount}
        setPage={setEntityPage}
        className="flex-shrink-0 bg-slate-900/20 rounded-xl px-2 pb-1"
      />
    </section>
  );
});
