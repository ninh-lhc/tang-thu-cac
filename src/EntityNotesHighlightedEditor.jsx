/**
 * Textarea ghi chép + lớp highlight [[wiki]] (đồng bộ scroll/font với textarea).
 * Dùng: AppEntityDetailNotes, modal mốc timeline (MasterComponents).
 */
import React, { forwardRef, useImperativeHandle, useMemo, useRef } from 'react';
import { buildEntityNotesEditorHighlightHtml } from './lib/entityNotesEditorWikiHighlight.js';

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
    spellCheck = true,
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

  const syncScroll = (event) => {
    if (highlightRef.current && textareaRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    onScroll?.(event);
  };

  const fontFamily = style.fontFamily;
  const fontSize = style.fontSize;

  return (
    <div className={`relative min-h-0 ${className}`}>
      <pre
        ref={highlightRef}
        aria-hidden
        className="absolute inset-0 m-0 overflow-auto pointer-events-none custom-scrollbar whitespace-pre-wrap break-words text-slate-200 leading-loose border border-transparent"
        style={{ fontFamily, fontSize }}
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
        onScroll={syncScroll}
        spellCheck={spellCheck}
        placeholder={placeholder}
        className="relative z-10 block h-full min-h-inherit w-full resize-none overflow-auto bg-transparent text-transparent caret-slate-100 outline-none custom-scrollbar leading-loose selection:bg-violet-500/35"
        style={{ fontFamily, fontSize, WebkitTextFillColor: 'transparent' }}
      />
    </div>
  );
});
