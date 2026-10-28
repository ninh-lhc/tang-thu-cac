/**
 * Thứ tự focus ô lưới modal bảng (header → body, trái → phải).
 * Ai dùng: EntityNotesMarkdownTableEditModal — Tab/Shift+Tab giữa textarea.
 */

/** @typedef {{ kind: 'header' | 'body' | 'footer', col?: number, row?: number }} TableEditFocusTarget */

/**
 * @param {{ colCount: number, rowCount: number, kind: 'header' | 'body', col: number, row?: number, direction: 'next' | 'prev' }} args
 * @returns {TableEditFocusTarget | null}
 */
export function stepTableEditGridFocus({ colCount, rowCount, kind, col, row = 0, direction }) {
  const cols = Math.max(colCount, 0);
  const rows = Math.max(rowCount, 0);
  if (cols === 0) return direction === 'next' ? { kind: 'footer' } : null;

  if (direction === 'next') {
    if (kind === 'header') {
      if (col + 1 < cols) return { kind: 'header', col: col + 1 };
      if (rows > 0) return { kind: 'body', row: 0, col: 0 };
      return { kind: 'footer' };
    }
    if (col + 1 < cols) return { kind: 'body', row, col: col + 1 };
    if (row + 1 < rows) return { kind: 'body', row: row + 1, col: 0 };
    return { kind: 'footer' };
  }

  if (kind === 'body' && row === 0 && col === 0) {
    return { kind: 'header', col: cols - 1 };
  }
  if (kind === 'body') {
    if (col > 0) return { kind: 'body', row, col: col - 1 };
    return { kind: 'body', row: row - 1, col: cols - 1 };
  }
  if (col > 0) return { kind: 'header', col: col - 1 };
  return null;
}

/** @param {TableEditFocusTarget | null} target */
export function tableEditFocusTargetToSelector(target) {
  if (!target) return null;
  if (target.kind === 'footer') return '[data-testid="entity-notes-table-edit-apply"]';
  if (target.kind === 'header') return `[data-table-edit-cell="header-${target.col}"]`;
  return `[data-table-edit-cell="body-${target.row}-${target.col}"]`;
}
