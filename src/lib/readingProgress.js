// Mục đích: Phần trăm tiến độ đọc, clamp chương — dùng Tổng quan + test.
// Import bởi: AppOverviewSection.jsx
// Lưu ý: chaptersTotal có thể là '???' hoặc chuỗi số.

export function parseTotalChapters(raw) {
  if (raw == null || raw === '') return 0;
  const s = String(raw).trim();
  if (s === '???') return 0;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function computeProgressPercent(readChapters, totalChapters) {
  const read = Math.max(0, parseInt(readChapters, 10) || 0);
  const total = Math.max(0, totalChapters);
  if (total <= 0) return 0;
  if (read >= total) return 100;
  return Math.max(0, Math.floor((read / total) * 100));
}

export function isReadingDone(readChapters, totalChapters) {
  const total = Math.max(0, totalChapters);
  if (total <= 0) return false;
  const read = Math.max(0, parseInt(readChapters, 10) || 0);
  return read === total;
}

/** Tăng/giảm chương đã đọc; khi có tổng chương hợp lệ thì không vượt quá. */
export function bumpReadChapters(read, delta, totalChapters) {
  const readN = Math.max(0, parseInt(read, 10) || 0);
  const total = Math.max(0, totalChapters);
  let next = readN + delta;
  if (delta < 0) return Math.max(0, next);
  if (total > 0) next = Math.min(next, total);
  return next;
}

/** Giá trị «đã xong» khi biết tổng chương (>0). */
export function chaptersWhenMarkedDone(totalChapters) {
  const total = Math.max(0, totalChapters);
  return total > 0 ? total : null;
}
