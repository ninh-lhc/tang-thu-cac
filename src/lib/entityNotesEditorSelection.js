// Đặt lại caret sau khi React cập nhật value (textarea controlled — không ghi DOM value tay).

export function focusEntityNotesTextarea(textarea, selStart, selEnd, textLength) {
  if (!textarea || typeof textarea.setSelectionRange !== 'function') return;
  const apply = () => {
    const len = Number.isFinite(textLength) ? textLength : textarea.value.length;
    const start = Math.max(0, Math.min(Number(selStart) || 0, len));
    const end = Math.max(start, Math.min(Number(selEnd) ?? start, len));
    textarea.focus();
    try {
      textarea.setSelectionRange(start, end);
    } catch {
      /* element chưa gắn DOM */
    }
  };
  requestAnimationFrame(() => requestAnimationFrame(apply));
}
