/**
 * Lọc danh sách lệnh + truyện trong Command Palette theo chuỗi gõ.
 *
 * Thuần. Dùng: App.jsx (commandPaletteFiltered).
 */
export function buildCommandPaletteFiltered(commandPaletteQuery, novelsMetadata, activeNovelData, safeString) {
  const q = commandPaletteQuery.trim().toLowerCase();
  const m = (t) => !q || safeString(t).toLowerCase().includes(q);
  const actions = [
    { id: 'set', label: 'Cài đặt & API Key', sub: 'Gemini, wiki, backup' },
    { id: 'deep', label: 'Tìm toàn bộ thư viện', sub: 'Deep search' },
  ];
  if (activeNovelData) {
    actions.push(
      { id: 'innov', label: 'Tra trong truyện đang mở', sub: safeString(activeNovelData.title) },
      { id: 'hub', label: 'Một cửa cập nhật (Hub)', sub: 'Tạo thẻ / nhật ký AI' },
      { id: 'home', label: 'Về mệnh bàn', sub: 'Đóng truyện, xem dashboard' }
    );
  }
  const fa = actions.filter((a) => m(a.label) || m(a.sub));
  const fn = novelsMetadata.filter((n) => m(n.title) || m(n.author)).slice(0, 28);
  return { actions: fa, novels: fn };
}
