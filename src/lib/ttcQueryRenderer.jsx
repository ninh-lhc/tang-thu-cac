/**
 * Render kết quả block ```ttc-query trong preview ghi chép.
 */
import React, { memo, useMemo } from 'react';
import { safeString, processInline } from '../MasterUtils.jsx';
import { runTtcQueryFromSource } from './ttcQueryEngine.js';

const TABLE_ALIGN_CLASS = {
  left: 'text-left',
};

function TtcQueryEntityCell({ name, context }) {
  const { dirHandle, lookup, linkRegex, onNavigate, selfEntityId } = context;
  const wiki = `[[${safeString(name)}]]`;
  return (
    <span className="inline">
      {processInline(
        wiki,
        dirHandle,
        lookup,
        linkRegex,
        onNavigate,
        selfEntityId,
        { entityNotesPreview: true },
      )}
    </span>
  );
}

function TtcQueryTable({ result, context, baseKey }) {
  const { columns, rows, fieldWarnings } = result;
  return (
    <div className="my-5 overflow-x-auto rounded-2xl border border-slate-700/60 bg-slate-950/50">
      {fieldWarnings?.length > 0 && (
        <div className="border-b border-amber-800/40 bg-amber-950/30 px-3 py-2 text-[11px] text-amber-100/95">
          {fieldWarnings.map((w) => (
            <p key={w.fieldId}>
              <span className="font-mono text-amber-200/80">{w.fieldId}</span>: {w.message}
            </p>
          ))}
        </div>
      )}
      <table className={`entity-notes-md-table w-full border-collapse text-[0.92rem] ${TABLE_ALIGN_CLASS.left}`}>
        <thead>
          <tr className="border-b border-slate-700/70 bg-slate-900/60">
            {columns.map((col) => (
              <th
                key={`${baseKey}-th-${col.id}`}
                className="entity-notes-md-table-th px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-400"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${baseKey}-tr-${row.entityId}`} className="border-b border-slate-800/80 last:border-0">
              {row.cells.map((cell) => (
                <td key={`${baseKey}-td-${row.entityId}-${cell.fieldId}`} className="entity-notes-md-table-td px-3 py-2 align-top text-slate-200/95">
                  <div className="entity-notes-md-table-cell-inner leading-relaxed">
                    {cell.isEntityLink ? (
                      <TtcQueryEntityCell name={row.entityName} context={context} />
                    ) : (
                      safeString(cell.display)
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TtcQueryList({ result, context, baseKey }) {
  return (
    <ul className="my-4 space-y-2 pl-1">
      {result.rows.map((row) => {
        const cell = row.cells[0];
        return (
          <li key={`${baseKey}-li-${row.entityId}`} className="flex gap-2 text-slate-200/95 leading-relaxed">
            <span className="text-slate-500 select-none">•</span>
            <span>
              {cell?.isEntityLink ? (
                <TtcQueryEntityCell name={row.entityName} context={context} />
              ) : (
                safeString(cell?.display)
              )}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

export const TtcQueryPreviewBlock = memo(function TtcQueryPreviewBlock({
  source,
  activeNovelData,
  tabsConfig = null,
  renderContext,
  baseKey = 'ttc-query',
}) {
  const result = useMemo(
    () =>
      runTtcQueryFromSource(source, activeNovelData, {
        tabsConfig: tabsConfig ?? activeNovelData?.tabsConfig ?? null,
      }),
    [source, activeNovelData, tabsConfig],
  );

  if (!result.ok) {
    return (
      <div
        className="my-5 rounded-2xl border border-rose-500/35 bg-rose-950/25 px-4 py-3 text-sm text-rose-100/95"
        data-ttc-query-error="true"
      >
        <div className="mb-1 text-[11px] font-bold uppercase tracking-wide text-rose-300/90">TTC-Query</div>
        <ul className="list-disc pl-5 space-y-1 font-mono text-[0.85rem]">
          {(result.errors || []).map((err, i) => (
            <li key={`${baseKey}-err-${i}`}>{err}</li>
          ))}
        </ul>
      </div>
    );
  }

  if (!result.rows.length) {
    return (
      <div
        className="my-5 rounded-2xl border border-slate-700/60 bg-slate-950/40 px-4 py-3 text-sm text-slate-400 font-serif italic"
        data-ttc-query-status="no_match"
      >
        Không có kết quả phù hợp.
      </div>
    );
  }

  return (
    <div className="ttc-query-block" data-ttc-query-view={result.view}>
      {result.view === 'list' ? (
        <TtcQueryList result={result} context={renderContext} baseKey={baseKey} />
      ) : (
        <TtcQueryTable result={result} context={renderContext} baseKey={baseKey} />
      )}
      {result.notice && (
        <p className="mb-4 text-[11px] text-slate-500 font-serif">{result.notice}</p>
      )}
    </div>
  );
});
