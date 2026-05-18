import React, { memo, useMemo, useRef } from 'react';
import { renderMarkdown } from './MasterUtils.jsx';
import { buildEntityNotesPreviewModel, renderEntityNotesMarkdown } from './lib/renderEntityNotesMarkdown.jsx';

/** Giảm re-render khi state khác của App đổi nhưng nội dung preview giữ nguyên */
export const MarkdownPreviewPane = memo(function MarkdownPreviewPane({
  text,
  dirHandle,
  entityMap,
  linkRegex,
  onNavigate,
  selfEntityId = null,
  wikiLinkOptOuts = null,
  variant = 'standard',
  className = '',
  containerRef = null,
  onScroll = null,
  onJumpToAnchor = null,
  onJumpToLine = null,
}) {
  const previewRef = useRef(null);
  const entityNotesModel = useMemo(
    () =>
      variant === 'entityNotes'
        ? buildEntityNotesPreviewModel(text || '', dirHandle, entityMap, linkRegex, onNavigate, selfEntityId, {
            onJumpToLine,
            wikiLinkOptOuts: Array.isArray(wikiLinkOptOuts) ? wikiLinkOptOuts : [],
          })
        : null,
    [dirHandle, entityMap, linkRegex, onJumpToLine, onNavigate, selfEntityId, text, variant, wikiLinkOptOuts]
  );
  const renderer = variant === 'entityNotes' ? renderEntityNotesMarkdown : renderMarkdown;

  if (variant === 'entityNotes' && entityNotesModel) {
    const toc = entityNotesModel.toc || [];
    const scrollToAnchor = (anchorId) => {
      const target = previewRef.current?.querySelector?.(`[data-entity-anchor="${anchorId}"]`);
      if (target && typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };

    return (
      <div ref={containerRef} onScroll={onScroll} className={className}>
        <div className={toc.length > 1 ? 'xl:grid xl:grid-cols-[180px_minmax(0,1fr)] xl:gap-6' : ''}>
          {toc.length > 1 && (
            <aside className="mb-4 hidden xl:block">
              <div className="sticky top-3 rounded-2xl border border-slate-800/80 bg-slate-950/70 px-3 py-3">
                <div className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">
                  Mục lục
                </div>
                <div className="space-y-1">
                  {toc.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        scrollToAnchor(item.id);
                        onJumpToAnchor?.(item);
                      }}
                      className="block w-full rounded-lg px-2 py-1.5 text-left text-[11px] text-slate-400 transition-colors hover:bg-slate-900 hover:text-violet-200"
                      style={{ paddingInlineStart: `${0.5 + Math.max(0, item.level - 1) * 0.65}rem` }}
                    >
                      {item.title}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          )}
          <div ref={previewRef} className="min-w-0">
            {entityNotesModel.blocks}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} onScroll={onScroll} className={className}>
      {renderer(text || '', dirHandle, entityMap, linkRegex, onNavigate, selfEntityId)}
    </div>
  );
});
