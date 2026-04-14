/**
 * Preset gợi ý form Bản Đồ (Loại địa bàn / Hệ phân cấp) theo `genres` của truyện.
 * `MasterComponents` / `collectMapEntityHints` import để hạt giống datalist + placeholder.
 * Ưu tiên Đô Thị trước Tiên Hiệp khi cả hai có trong danh sách thể loại.
 */
import { normalizeAsciiText } from './statusHierarchyParser.js';

export const MAP_FIELD_PRESET_FLAVOR = Object.freeze({
  CULTIVATION: 'cultivation',
  URBAN: 'urban',
  SCIFI: 'scifi',
  SURVIVAL: 'survival',
});

const MAP_TYPE_BY_FLAVOR = Object.freeze({
  [MAP_FIELD_PRESET_FLAVOR.CULTIVATION]: Object.freeze([
    'Vị diện',
    'Giới',
    'Tiên tinh',
    'Tinh cầu',
    'Đại lục',
    'Châu',
    'Đế quốc',
    'Khu vực',
    'Thành/Trấn',
    'Địa danh',
  ]),
  [MAP_FIELD_PRESET_FLAVOR.URBAN]: Object.freeze([
    'Quốc gia / Liên bang',
    'Vùng / Miền',
    'Thành phố',
    'Quận / Huyện',
    'Khu phố',
    'Tòa nhà / Công trình',
    'Khu thương mại / Trung tâm',
    'Sân bay / Bến cảng / Ga',
    'Online / Nền tảng / App',
    'Địa danh / Landmark',
  ]),
  [MAP_FIELD_PRESET_FLAVOR.SCIFI]: Object.freeze([
    'Thiên hà',
    'Tinh vực',
    'Hành tinh',
    'Mặt trăng / Vệ tinh',
    'Trạm không gian',
    'Thành phố nổi',
    'Khu thuộc địa',
    'Hành lang không gian',
    'Khu đặc quyền',
    'Địa danh',
  ]),
  [MAP_FIELD_PRESET_FLAVOR.SURVIVAL]: Object.freeze([
    'Khu an toàn',
    'Căn cứ',
    'Tiền đồn',
    'Khu phế tích',
    'Vùng nhiễm / Đỏ',
    'Hang / Hầm',
    'Khu buôn lậu / Chợ đen',
    'Đường tiếp tế',
    'Địa danh',
  ]),
});

/** Nhãn "Hệ phân cấp" trong form bản đồ (không dùng chung ladder thế lực tu tiên). */
const MAP_HIERARCHY_BY_FLAVOR = Object.freeze({
  [MAP_FIELD_PRESET_FLAVOR.CULTIVATION]: Object.freeze(['Cửu cấp', 'Vương giới', 'Tôn giới', 'Đế giới']),
  [MAP_FIELD_PRESET_FLAVOR.URBAN]: Object.freeze([
    'Cấp quốc gia / liên bang',
    'Cấp bang / châu',
    'Cấp thành phố',
    'Cấp quận',
    'Cấp phường / khu',
    'Cấp tổ chức / hiệp hội',
    'Cấp tòa nhà / trụ sở',
    'Cấp VIP / siêu cấp',
  ]),
  [MAP_FIELD_PRESET_FLAVOR.SCIFI]: Object.freeze([
    'Cấp Tinh vực',
    'Cấp Hành tinh',
    'Cấp Quỹ đạo / Vành đai',
    'Cấp Trạm',
    'Cấp Khu dân cư',
    'Cấp Hạ tầng',
    'Cấp Đặc quyền',
  ]),
  [MAP_FIELD_PRESET_FLAVOR.SURVIVAL]: Object.freeze([
    'Lõi an toàn',
    'Vành đai',
    'Vùng ngoài',
    'Vùng xám',
    'Vùng chết',
    'Khu săn bắn',
  ]),
});

const PLACEHOLDER_BY_FLAVOR = Object.freeze({
  [MAP_FIELD_PRESET_FLAVOR.CULTIVATION]: Object.freeze({
    mapType: 'Ví dụ: Giới / Tiên tinh / Đại lục',
    mapHierarchy: 'Ví dụ: Vương giới / Tôn giới / Đế giới',
    quickLine: 'Giới · Tôn giới / Tiên tinh · Vương giới',
    mapProfileHint:
      'Ở thẻ bản đồ, ghi Loại địa bàn · Hệ phân cấp. Ví dụ: Hoang Thú giới = Giới · Tôn giới.',
    exampleA: 'Hoang Thú giới = Giới · Tôn giới',
    exampleB: 'Dạ Lang Tiên Tinh = Tiên tinh · Vương giới',
  }),
  [MAP_FIELD_PRESET_FLAVOR.URBAN]: Object.freeze({
    mapType: 'Ví dụ: Thành phố / Khu phố / Tòa nhà',
    mapHierarchy: 'Ví dụ: Cấp thành phố / Cấp quận / VIP',
    quickLine: 'Thành phố · Cấp thành phố / Khu phố · Cấp phường',
    mapProfileHint:
      'Ở thẻ bản đồ, ghi Loại địa bàn · Hệ phân cấp. Ví dụ: Quận 1 = Thành phố · Cấp thành phố.',
    exampleA: 'Quận 1 = Thành phố · Cấp thành phố',
    exampleB: 'Tòa Landmark = Tòa nhà / Công trình · Cấp tòa nhà / trụ sở',
  }),
  [MAP_FIELD_PRESET_FLAVOR.SCIFI]: Object.freeze({
    mapType: 'Ví dụ: Hành tinh / Trạm / Tinh vực',
    mapHierarchy: 'Ví dụ: Cấp Hành tinh / Cấp Trạm',
    quickLine: 'Hành tinh · Cấp Hành tinh / Trạm không gian · Cấp Trạm',
    mapProfileHint:
      'Ở thẻ bản đồ, ghi Loại địa bàn · Hệ phân cấp. Ví dụ: Colony-7 = Hành tinh · Cấp Hành tinh.',
    exampleA: 'Trạm Orion = Trạm không gian · Cấp Trạm',
    exampleB: 'Colony-7 = Hành tinh · Cấp Hành tinh',
  }),
  [MAP_FIELD_PRESET_FLAVOR.SURVIVAL]: Object.freeze({
    mapType: 'Ví dụ: Căn cứ / Khu an toàn / Phế tích',
    mapHierarchy: 'Ví dụ: Lõi an toàn / Vành đai / Vùng ngoài',
    quickLine: 'Căn cứ · Lõi an toàn / Khu phế tích · Vùng ngoài',
    mapProfileHint:
      'Ở thẻ bản đồ, ghi Loại địa bàn · Hệ phân cấp. Ví dụ: Căn cứ Bắc = Căn cứ · Lõi an toàn.',
    exampleA: 'Căn cứ Bắc = Căn cứ · Lõi an toàn',
    exampleB: 'Khu Xám-3 = Khu phế tích · Vùng ngoài',
  }),
});

function normalizeGenreList(genres) {
  const raw = Array.isArray(genres) ? genres : genres ? [genres] : [];
  return raw.map((g) => normalizeAsciiText(String(g || '').trim())).filter(Boolean);
}

/**
 * @param {unknown} genres — `novel.genres` hoặc một chuỗi `novel.genre`
 * @returns {keyof typeof MAP_FIELD_PRESET_FLAVOR}
 */
export function resolveMapFieldPresetFlavor(genres) {
  const norm = normalizeGenreList(genres);
  const has = (slug) => norm.some((g) => g === slug || g.includes(slug));

  if (has('do thi')) return MAP_FIELD_PRESET_FLAVOR.URBAN;
  if (has('tien hiep') || has('huyen huyen')) return MAP_FIELD_PRESET_FLAVOR.CULTIVATION;
  if (has('khoa huyen')) return MAP_FIELD_PRESET_FLAVOR.SCIFI;
  if (has('mat the')) return MAP_FIELD_PRESET_FLAVOR.SURVIVAL;
  if (has('ngon tinh') || has('linh di')) return MAP_FIELD_PRESET_FLAVOR.URBAN;
  if (has('vo han luu') || has('vong du')) return MAP_FIELD_PRESET_FLAVOR.URBAN;
  if (has('lich su') || has('dong nhan')) return MAP_FIELD_PRESET_FLAVOR.URBAN;
  if (has('he thong')) return MAP_FIELD_PRESET_FLAVOR.URBAN;
  return MAP_FIELD_PRESET_FLAVOR.CULTIVATION;
}

export function getMapTypeSeedPresets(flavor) {
  const key = MAP_TYPE_BY_FLAVOR[flavor] ? flavor : MAP_FIELD_PRESET_FLAVOR.CULTIVATION;
  return [...MAP_TYPE_BY_FLAVOR[key]];
}

export function getMapHierarchySeedLabels(flavor) {
  const key = MAP_HIERARCHY_BY_FLAVOR[flavor] ? flavor : MAP_FIELD_PRESET_FLAVOR.CULTIVATION;
  return [...MAP_HIERARCHY_BY_FLAVOR[key]];
}

export function getMapFieldPlaceholders(flavor) {
  const key = PLACEHOLDER_BY_FLAVOR[flavor] ? flavor : MAP_FIELD_PRESET_FLAVOR.CULTIVATION;
  return { ...PLACEHOLDER_BY_FLAVOR[key] };
}
