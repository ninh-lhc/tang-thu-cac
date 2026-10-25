/**
 * Textarea ghi chép + lớp highlight [[wiki]] tô màu (đồng bộ scroll/font với textarea).
 * Chữ trong textarea trong suốt; màu wiki hiện từ lớp <pre> phía dưới (cả khi đang gõ)
 * để khi soạn thô vẫn phân biệt được từ có wiki link với chữ thường.
 *
 * Quan trọng — chống lệch caret/hiển thị: textarea (overflow) có thanh cuộn 5px chiếm
 * chiều rộng, còn <pre> thì không, nên trước đây hai lớp xuống dòng lệch nhau. Khắc phục:
 * textarea LUÔN chừa đúng 5px thanh cuộn (overflow-y: scroll) và <pre> chừa đúng 5px
 * padding-right ⇒ bề rộng wrap khớp tuyệt đối, chữ màu luôn nằm đúng vị trí chữ thật.
 * Cuộn trong textarea khi còn dòng; ở mép trên/dưới chuyển wheel sang khung cha.
 */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  buildEntityNotesEditorHighlightHtml,
  escapeEntityNotesEditorPlainHtml,
} from './lib/entityNotesEditorWikiHighlight.js';

const HIGHLIGHT_DEBOUNCE_MS = 250;

/** Chiều cao vùng soạn cố định để textarea luôn có scrollport (dùng chung detail notes + modal mốc). */
export const ENTITY_NOTES_EDITOR_SCROLL_MAX_CLASS =
  'h-[min(50vh,520px)] min-h-[260px] shrink-0';

const EDITOR_SURFACE_CLASS =
  'm-0 whitespace-pre-wrap break-words border-0 border-transparent p-0 font-normal leading-loose [overflow-wrap:anywhere]';

// Bề rộng thanh cuộn tuỳ biến (.custom-scrollbar::-webkit-scrollbar { width: 5px }).
const SCROLLBAR_GUTTER_PX = 5;

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
    onCompositionStart,
    onCompositionEnd,
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

  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), HIGHLIGHT_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [value]);

  const highlightHtml = useMemo(() => {
    if (debouncedValue !== value) {
      return escapeEntityNotesEditorPlainHtml(value);
    }
    return buildEntityNotesEditorHighlightHtml(value, { selfEntityId, entityMap });
  }, [value, debouncedValue, selfEntityId, entityMap]);

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

  // Đồng bộ vị trí cuộn của lớp màu sau mỗi lần nội dung đổi (gõ/xoá/undo).
  useEffect(() => {
    syncHighlightScroll();
  }, [value, syncHighlightScroll]);

  // Mọi thuộc tính ảnh hưởng layout chữ phải GIỐNG HỆT giữa <pre> và <textarea>.
  const surfaceStyle = {
    fontFamily: style.fontFamily,
    fontSize: style.fontSize,
    overflowWrap: 'anywhere',
    lineHeight: 1.625,
    letterSpacing: 'normal',
    wordSpacing: 'normal',
    tabSize: 4,
  };

  return (
    <div className={`relative flex h-full min-h-0 flex-col overflow-hidden ${className}`}>
      <pre
        ref={highlightRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 block size-full overflow-hidden ${EDITOR_SURFACE_CLASS} text-slate-200`}
        style={{ ...surfaceStyle, paddingRight: `${SCROLLBAR_GUTTER_PX}px` }}
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
        onCompositionStart={onCompositionStart}
        onCompositionEnd={onCompositionEnd}
        spellCheck={spellCheck}
        placeholder={placeholder}
        className={`relative z-10 block size-full min-h-0 flex-1 resize-none overflow-y-scroll overflow-x-hidden bg-transparent text-transparent caret-slate-100 outline-none placeholder:text-slate-500 custom-scrollbar selection:bg-violet-500/25 ${EDITOR_SURFACE_CLASS}`}
        style={{
          ...surfaceStyle,
          WebkitTextFillColor: 'transparent',
          caretColor: 'rgb(226 232 240)',
        }}
      />
    </div>
  );
});
