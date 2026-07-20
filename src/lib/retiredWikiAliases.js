// Theo dõi biệt danh đã bị xóa/đổi để [[alias cũ]] không khớp mờ về thẻ ban đầu.
// Dùng cho cả thẻ thật và thẻ con; dữ liệu lưu tại wikiRetiredAliases của hồ sơ.
// Nếu alias được thêm lại, nó tự rời danh sách nghỉ và hoạt động như liên kết chính xác.

const ALIAS_SPLIT_RE = /[,/|()]/;

export function splitWikiAliasNames(value) {
  return String(value || '')
    .split(ALIAS_SPLIT_RE)
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && item.length <= 80);
}

export function reconcileRetiredWikiAliases(previousAlias, nextAlias, existing = []) {
  const previous = splitWikiAliasNames(previousAlias);
  const next = splitWikiAliasNames(nextAlias);
  const activeKeys = new Set(next.map((item) => item.toLocaleLowerCase('vi-VN')));
  const retired = new Map();
  [...(Array.isArray(existing) ? existing : []), ...previous].forEach((item) => {
    const clean = String(item || '').trim();
    const key = clean.toLocaleLowerCase('vi-VN');
    if (!clean || clean.length < 2 || activeKeys.has(key) || retired.has(key)) return;
    retired.set(key, clean);
  });
  return [...retired.values()];
}
