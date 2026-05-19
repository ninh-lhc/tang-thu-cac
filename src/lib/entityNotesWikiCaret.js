/** Vị trí con trỏ có nằm trong wiki link `[[...]]` đang mở (trên cùng dòng) hay không. */

export function isCaretInsideWikiLink(text, caretIndex) {
  if (!Number.isFinite(caretIndex)) return false;
  const src = String(text || '');
  const pos = Math.max(0, Math.min(caretIndex, src.length));
  const lineStart = src.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  const nextBreak = src.indexOf('\n', pos);
  const lineEnd = nextBreak === -1 ? src.length : nextBreak;
  const line = src.slice(lineStart, lineEnd);

  let cursor = 0;
  while (cursor < line.length) {
    const open = line.indexOf('[[', cursor);
    if (open === -1) return false;
    const close = line.indexOf(']]', open + 2);
    const absOpen = lineStart + open;
    const absClose = close === -1 ? -1 : lineStart + close + 2;
    if (close === -1) {
      return pos >= absOpen;
    }
    if (pos >= absOpen && pos <= absClose) return true;
    cursor = close + 2;
  }
  return false;
}
