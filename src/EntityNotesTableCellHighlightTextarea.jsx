/**
 * Textarea ô bảng modal + highlight [[wiki]] (overlay, textarea trong suốt).
 * Ai dùng: EntityNotesMarkdownTableEditModal — tái dùng entityNotesEditorWikiHighlight.
 * Khi focus: hiện chữ thật trên textarea (caret đúng); khi blur: overlay highlight.
 */

import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { buildEntityNotesEditorHighlightHtml } from './lib/entityNotesEditorWikiHighlight.js';

const SCROLLBAR_GUTTER_PX = 5;

const SURFACE_CLASS =
  'm-0 block w-full whitespace-pre-wrap break-words border-0 border-transparent font-serif text-[0.9375rem] font-normal [overflow-wrap:anywhere]';

function buildSurfaceStyle() {
  return {
    paddingTop: '0.625rem',
    paddingBottom: '0.625rem',
    paddingLeft: '0.75rem',
    paddingRight: `calc(0.75rem + ${SCROLLBAR_GUTTER_PX}px)`,
    lineHeight: 1.625,
    letterSpacing: 'normal',
    wordSpacing: 'normal',
    tabSize: 4,
    overflowWrap: 'anywhere',
  };
}

export function EntityNotesTableCellHighlightTextarea({
  value,
  onChange,
  onKeyDown,
  ariaLabel,
  placeholder,
  rows = 4,
  minHeightClass = 'min-h-[5.75rem]',
  maxHeightClass = 'max-h-[20rem]',
  toneClass = 'text-slate-200',
  entityMap = null,
  selfEntityId = null,
  headerCell = false,
  tableEditCellId = null,
}) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);

  const surfaceStyle = useMemo(() => buildSurfaceStyle(), []);

  const highlightHtml = useMemo(
    () =>
      buildEntityNotesEditorHighlightHtml(value, {
        selfEntityId,
        entityMap,
        variant: 'tableCell',
      }),
    [value, selfEntityId, entityMap],
  );

  const syncHighlightScroll = useCallback(() => {
    const ta = textareaRef.current;
    const pre = highlightRef.current;
    if (!ta || !pre) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
  }, []);

  useLayoutEffect(() => {
    syncHighlightScroll();
  }, [value, highlightHtml, isFocused, syncHighlightScroll]);

  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => syncHighlightScroll());
    ro.observe(ta);
    return () => ro.disconnect();
  }, [syncHighlightScroll]);

  const headerMin = headerCell ? 'min-h-[3.25rem]' : minHeightClass;
  const focusGrow = isFocused && !headerCell ? 'min-h-[7rem]' : '';
  const fontWeight = headerCell ? 'font-bold text-amber-100/95' : toneClass;
  const showOverlay = !isFocused;

  return (
    <div
      data-testid="markdown-table-cell-highlight"
      className={`markdown-table-cell-highlight relative box-border min-w-0 max-w-full ${headerMin} ${focusGrow} ${maxHeightClass} w-full overflow-hidden transition-[min-height] duration-150`}
      data-has-wiki={/\[\[[^\]]+\]\]/.test(value || '') ? 'true' : 'false'}
      data-cell-focused={isFocused ? 'true' : 'false'}
    >
      <pre
        ref={highlightRef}
        data-testid="markdown-table-wiki-overlay"
        aria-hidden="true"
        className={`markdown-table-wiki-overlay pointer-events-none absolute inset-0 overflow-hidden ${SURFACE_CLASS} ${fontWeight} ${
          showOverlay ? 'opacity-100' : 'opacity-0'
        }`}
        style={surfaceStyle}
        dangerouslySetInnerHTML={{ __html: highlightHtml }}
      />
      <textarea
        ref={textareaRef}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        data-table-edit-cell={tableEditCellId || undefined}
        onScroll={syncHighlightScroll}
        onFocus={() => {
          setIsFocused(true);
          syncHighlightScroll();
        }}
        onBlur={() => setIsFocused(false)}
        rows={rows}
        aria-label={ariaLabel}
        placeholder={placeholder}
        spellCheck={false}
        className={`relative z-10 ${SURFACE_CLASS} ${headerMin} ${focusGrow} ${maxHeightClass} resize-y overflow-x-hidden overflow-y-scroll bg-transparent outline-none placeholder:text-slate-500 custom-scrollbar selection:bg-violet-500/25 ${fontWeight} ${
          isFocused
            ? 'text-slate-200 caret-slate-100 focus-visible:bg-slate-950/55'
            : 'text-transparent caret-slate-100'
        } ${headerCell && isFocused ? 'focus-visible:bg-slate-950/70' : ''}`}
        style={{
          ...surfaceStyle,
          ...(isFocused ? {} : { WebkitTextFillColor: 'transparent' }),
          caretColor: 'rgb(226 232 240)',
        }}
      />
    </div>
  );
}

