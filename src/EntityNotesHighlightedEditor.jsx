/**
 * Textarea ghi chép + lớp highlight [[wiki]] (đồng bộ scroll/font với textarea).
 * Scrollport cố định: cuộn trong khung, không kéo cuộn cả trang khi còn nội dung trong editor.
 * Dùng: AppEntityDetailNotes, modal mốc timeline (MasterComponents).
 */
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef } from 'react';
import { buildEntityNotesEditorHighlightHtml } from './lib/entityNotesEditorWikiHighlight.js';

/** Chiều cao tối đa vùng soạn (dùng chung detail notes + modal mốc). */
export const ENTITY_NOTES_EDITOR_SCROLL_MAX_CLASS = 'max-h-[min(65vh,720px)]';

function handleEditorWheelCapture(event) {
  const el = event.currentTarget;
  const maxScroll = el.scrollHeight - el.clientHeight;
  if (maxScroll <= 1) return;
  const { scrollTop } = el;
  const atTop = scrollTop <= 0;
  const atBottom = scrollTop + el.clientHeight >= el.scrollHeight - 1;
  const dy = event.deltaY;
  if ((dy < 0 && !atTop) || (dy > 0 && !atBottom)) {
    event.preventDefault();
    event.stopPropagation();
  }
}

export const EntityNotesHighlightedEditor = forwardRef(function EntityNotesHighlightedEditor(
  {
    value,
    onChange,
    onKeyDown,
    onKeyUp,
    onClick,
    onSelect,
    onPaste,
    onScroll,
    id,
    className = '',
    style = {},
    placeholder,
    spellCheck = false,
    selfEntityId = null,
    entityMap = null,
  },
  ref
) {
  const textareaRef = useRef(null);
  const highlightRef = useRef(null);

  useImperativeHandle(ref, () => textareaRef.current, []);

  const highlightHtml = useMemo(
    () => buildEntityNotesEditorHighlightHtml(value, { selfEntityId, entityMap }),
    [value, selfEntityId, entityMap]
  );

  const syncHighlightScroll = useCallback(() => {
    const ta = textareaRef.current;
    const pre = highlightRef.current;
    if (!ta || !pre) return;
    pre.scrollTop = ta.scrollTop;
    pre.scrollLeft = ta.scrollLeft;
  }, []);

  const handleScroll = useCallback(
    (event) => {
      syncHighlightScroll();
      onScroll?.(event);
    },
    [onScroll, syncHighlightScroll]
  );

  const fontFamily = style.fontFamily;
  const fontSize = style.fontSize;

  return (
    <div className={`relative flex h-full min-h-0 flex-col overflow-hidden overscroll-contain ${className}`}>
      <pre
        ref={highlightRef}
        aria-hidden
        className="pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words border border-transparent p-0 font-normal text-slate-200 leading-loose [overflow-wrap:anywhere]"
        style={{ fontFamily, fontSize, overflowWrap: 'anywhere' }}
        dangerouslySetInnerHTML={{ __html: highlightHtml }}
      />
      <textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={onChange}
        onKeyDown={onKeyDown}
        onKeyUp={onKeyUp}
        onClick={onClick}
        onSelect={onSelect}
        onPaste={onPaste}
        onScroll={handleScroll}
        onWheel={handleEditorWheelCapture}
        spellCheck={spellCheck}
        placeholder={placeholder}
        className="relative z-10 m-0 block size-full min-h-0 flex-1 resize-none overflow-auto overscroll-contain bg-transparent p-0 leading-loose text-transparent caret-slate-100 outline-none placeholder:text-slate-500 custom-scrollbar selection:bg-violet-500/35 [overflow-wrap:anywhere]"
        style={{ fontFamily, fontSize, WebkitTextFillColor: 'transparent', overflowWrap: 'anywhere' }}
      />
    </div>
  );
});
