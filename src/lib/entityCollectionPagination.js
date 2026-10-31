/**
 * Số trang hiển thị trên thanh phân trang collection.
 * Tách khỏi component để file JSX chỉ export component (react-refresh).
 */

export function buildPageNumbers(page, pageCount, maxButtons = 12) {
  const total = Math.max(1, Math.trunc(pageCount) || 1);
  const safePage = Math.min(Math.max(1, Math.trunc(page) || 1), total);
  if (total <= maxButtons) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const start = Math.max(
    1,
    Math.min(safePage - Math.floor(maxButtons / 2), total - maxButtons + 1),
  );
  return Array.from({ length: maxButtons }, (_, i) => start + i);
}
