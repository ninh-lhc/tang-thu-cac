/**
 * Textarea ghi chép + lớp highlight [[wiki]] (đồng bộ scroll/font với textarea).
 * Chữ trong textarea trong suốt; màu wiki hiện từ lớp <pre> phía dưới (cả khi đang gõ).
 * Cuộn trong textarea khi còn dòng; ở mép trên/dưới chuyển wheel sang khung cha.
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { buildEntityNotesEditorHighlightHtml } from './lib/entityNotesEditorWikiHighlight.js';

/** Chiều cao vùng soạn cố định để textarea luôn có scrollport (dùng chung detail notes + modal mốc). */
export const ENTITY_NOTES_EDITOR_SCROLL_MAX_CLASS =
  'h-[min(50vh,520px)] min-h-[260px] shrink-0';

// Không đặt overflow-* ở đây: pre cần overflow-hidden (clip highlight), textarea
// cần overflow-auto để cuộn — nếu gộp chung, Tailwind sort khiến overflow-hidden
// đè overflow-auto trên textarea ⇒ không cuộn được.
const EDITOR_SURFACE_CLASS =
  'm-0 whitespace-pre-wrap break-words border-0 border-transparent p-0 font-normal leading-loose [overflow-wrap:anywhere]';

function findScrollableAncestor(el) {
  let node = el.parentElement;
  while (node && node !== document.body && node !== document.documentElement) {
    const { overflowY } = getComputedStyle(node);
    if (
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') &&
      node.scrollHeight > node.clientHeight + 1
    ) {
      return node;
    }
    node = node.parentElement;
  }
  // Fallback: cuộn cả trang (HTML/body) — đảm bảo wheel không "ngậm" tại textarea
  // khi không có khung cha overflow-auto nào đang tràn nội dung.
  const root = document.scrollingElement || document.documentElement;
  if (root && root.scrollHeight > root.clientHeight + 1) {
    return root;
  }
  return null;
}

/** Cuộn trong textarea khi còn dòng; ở mép (hoặc khi ô không cuộn được) chuyển wheel sang khung cha. */
function handleEditorWheel(event) {
  const el = event.currentTarget;
  const dy = event.deltaY;
  const maxScroll = el.scrollHeight - el.clientHeight;

  if (maxScroll > 1) {
    const atTop = el.scrollTop <= 0;
    const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 1;
    if ((dy < 0 && !atTop) || (dy > 0 && !atBottom)) return;
  }

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

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return undefined;
    ta.addEventListener('wheel', handleEditorWheel, { passive: false });
    return () => ta.removeEventListener('wheel', handleEditorWheel);
  }, []);

  const fontFamily = style.fontFamily;
  const fontSize = style.fontSize;
  const surfaceStyle = {
    fontFamily,
    fontSize,
    overflowWrap: 'anywhere',
    lineHeight: 1.625,
    letterSpacing: 'normal',
    wordSpacing: 'normal',
  };

  return (
    <div className={`relative flex h-full min-h-0 flex-col overflow-hidden ${className}`}>
      <pre
        ref={highlightRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 block size-full overflow-hidden ${EDITOR_SURFACE_CLASS} text-slate-200`}
        style={surfaceStyle}
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
        onFocus={(event) => {
          syncHighlightScroll();
          onFocus?.(event);
        }}
        onBlur={onBlur}
        spellCheck={spellCheck}
        placeholder={placeholder}
        className={`relative z-10 block size-full min-h-0 flex-1 resize-none overflow-auto bg-transparent text-transparent caret-slate-100 outline-none placeholder:text-slate-500 custom-scrollbar selection:bg-violet-500/25 ${EDITOR_SURFACE_CLASS}`}
        style={{
          ...surfaceStyle,
          WebkitTextFillColor: 'transparent',
          caretColor: 'rgb(226 232 240)',
        }}
      />
    </div>
  );
});