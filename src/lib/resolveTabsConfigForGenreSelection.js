/**
 * Gợi ý mục lục khi chọn thể loại / tạo truyện mới.
 * Cùng thứ tự ưu tiên với ModalAddNovel (nút "Dùng mẫu đã lưu" / "Tạo cấu trúc theo thể loại"):
 * tabsConfig đã gán trên form → mẫu đã lưu theo tổ hợp thể loại → gộp mục lục mặc định theo thể loại.
 */
import { mergeTabsByGenres } from '../genreTabsMap.js';
import { getGenreTabsTemplate } from './genreTabsTemplateStore.js';

/**
 * @param {string[]} genres
 * @param {unknown} explicitTabsConfig - `novelForm.tabsConfig` sau khi người dùng bấm áp mẫu
 * @returns {object[]|null}
 */
export function resolveTabsConfigForGenreSelection(genres, explicitTabsConfig) {
  if (Array.isArray(explicitTabsConfig) && explicitTabsConfig.length > 0) {
    return explicitTabsConfig;
  }
  const g = Array.isArray(genres) ? genres : [];
  if (g.length === 0) return null;
  const saved = getGenreTabsTemplate(g);
  if (saved?.tabsConfig?.length) return saved.tabsConfig;
  const merged = mergeTabsByGenres(g);
  return merged && merged.length > 0 ? merged : null;
}
