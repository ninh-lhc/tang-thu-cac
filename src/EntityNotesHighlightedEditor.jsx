/**
 * Textarea ghi chép + lớp highlight [[wiki]] (đồng bộ scroll/font với textarea).
 * Cuộn trong textarea khi còn dòng; ở mép trên/dưới chuyển wheel sang khung scroll cha (modal/trang).
 * Dùng: AppEntityDetailNotes, modal mốc timeline (MasterComponents).
 */
import React, { forwardRef, useCallback, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { buildEntityNotesEditorHighlightHtml } from './lib/entityNotesEditorWikiHighlight.js';

/** Chiều cao tối đa vùng soạn (dùng chung detail notes + modal mốc). */
export const ENTITY_NOTES_EDITOR_SCROLL_MAX_CLASS = 'max-h-[min(65vh,720px)]';

function findScrollableAncestor(el) {
  let node = el.parentElement;
  while (node && node !== document.body) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}

/** Cuộn trong textarea khi còn nội dung; ở mép trên/dưới chuyển wheel sang khung cha (modal/trang). */
function handleEditorWheelCapture(event) {
  const el = event.currentTarget;
  const maxScroll = el.scrollHeight - el.clientHeight;
  const dy = event.deltaY;
  if (maxScroll <= 1) return;

  const atTop = el.scrollTop <= 0;
  const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
  if ((dy < 0 && !atTop) || (dy > 0 && !atBottom)) return;

  const parent = findScrollableAncestor(el);
  if (!parent) return;
  event.preventDefault();
  parent.scrollTop += dy;
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
    onFocus,
    onBlur,
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
  const [isFocused, setIsFocused] = useState(false);

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
    <div className={`relative flex h-full min-h-0 flex-col overflow-hidden ${className}`}>
      <pre
        ref={highlightRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 m-0 overflow-hidden whitespace-pre-wrap break-words border border-transparent p-0 font-normal text-slate-200 leading-loose transition-opacity duration-75 [overflow-wrap:anywhere] ${
          isFocused ? 'opacity-0' : 'opacity-100'
        }`}
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
        onFocus={(event) => {
          setIsFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setIsFocused(false);
          onBlur?.(event);
        }}
        spellCheck={spellCheck}
        placeholder={placeholder}
        className={`relative z-10 m-0 block size-full min-h-0 flex-1 resize-none overflow-auto bg-transparent p-0 leading-loose caret-slate-100 outline-none placeholder:text-slate-500 custom-scrollbar selection:bg-violet-500/35 [overflow-wrap:anywhere] ${
          isFocused ? 'text-slate-200' : 'text-transparent'
        }`}
        style={{
          fontFamily,
          fontSize,
          overflowWrap: 'anywhere',
          ...(isFocused ? {} : { WebkitTextFillColor: 'transparent' }),
        }}
      />
    </div>
  );
});
