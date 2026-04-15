/**
 * Helper thuần cho AppModalQuanLyTab.
 *
 * Tách khỏi component chính để giảm độ dài file UI, giúp phần render dễ đọc hơn.
 */
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { safeString } from '../MasterUtils.jsx';

const AUTO_ROLE_UI_COPY = Object.freeze({
  '': {
    selectLabel: 'Để hệ thống tự đoán',
    helper:
      'Nếu tên mục đã rõ như Gia Tộc, Địa Danh, Nhân Vật Chính... thì thường không cần chỉnh tay.',
    example: 'Ví dụ: Gia Tộc, Địa Danh, Cảnh Giới, Nhân Vật Chính...',
  },
  'khong-tu-dong': {
    selectLabel: 'Không dùng AUTO ở mục này',
    helper: 'Mục này chỉ lưu dữ liệu thủ công, AUTO sẽ bỏ qua hoàn toàn.',
    example: 'Dùng khi đây chỉ là nơi ghi chép tay, không cần tự liên kết.',
  },
  'the-luc': {
    selectLabel: 'Thế lực / tổ chức',
    helper: 'Dùng cho các mục chứa gia tộc, tông môn, đế quốc, liên minh, phe phái...',
    example: 'Ví dụ: Gia Tộc, Tông Môn, Đế Quốc, Chính Tà...',
  },
  'ban-do': {
    selectLabel: 'Địa danh / bản đồ',
    helper: 'Dùng cho đại lục, thành trì, bí cảnh, khu vực, thế giới, tinh cầu...',
    example: 'Ví dụ: Đại Lục, Thành Trì, Bí Cảnh, Tinh Cầu...',
  },
  'he-thong-tu-luyen': {
    selectLabel: 'Hệ thống tu luyện',
    helper: 'Dùng cho tab ghi các hệ như Luyện Khí, Trúc Cơ, Kim Đan...',
    example: 'Ví dụ: Hệ Thống Tu Luyện, Hệ Cảnh Giới...',
  },
  'canh-gioi-tu-vi': {
    selectLabel: 'Cảnh giới tu vi',
    helper: 'Dùng cho tab ghi các cấp hoặc bậc cảnh giới thuộc một hệ thống tu luyện.',
    example: 'Ví dụ: Cảnh Giới, Đại Cảnh Giới, Tiểu Cảnh Giới...',
  },
  'nhan-vat-chinh': {
    selectLabel: 'Nhân vật chính',
    helper: 'Dùng cho tab chứa hồ sơ nhân vật trung tâm của truyện.',
    example: 'Ví dụ: Nhân Vật Chính, Main Character, Chủ Nhân...',
  },
  'nhan-vat-lien-quan': {
    selectLabel: 'Nhân vật liên quan',
    helper: 'Dùng cho tab đạo lữ, thân nhân, bằng hữu, sư phụ, đệ tử...',
    example: 'Ví dụ: Đạo Lữ, Thân Nhân, Huynh Đệ, Bằng Hữu...',
  },
});

const AUTO_ROLE_CARD_VALUES = Object.freeze([
  '',
  'the-luc',
  'ban-do',
  'he-thong-tu-luyen',
  'canh-gioi-tu-vi',
  'nhan-vat-chinh',
  'nhan-vat-lien-quan',
  'khong-tu-dong',
]);

const AUTO_ROLE_DEFAULT_VISIBLE_COUNT = 4;

export const TAB_ICON_OPTIONS = Object.freeze([
  { value: 'ScrollText', label: 'Cuộn thư' },
  { value: 'BookOpen', label: 'Sách mở' },
  { value: 'Flame', label: 'Ngọn lửa' },
  { value: 'User', label: 'Nhân vật' },
  { value: 'Hexagon', label: 'Lục giác' },
  { value: 'Swords', label: 'Song kiếm' },
  { value: 'Map', label: 'Bản đồ' },
  { value: 'Globe', label: 'Địa cầu' },
]);

const AUTO_ROLE_KEYWORDS = Object.freeze({
  'the-luc': ['gia toc', 'tong mon', 'de quoc', 'the luc', 'to chuc', 'phe phai', 'lien minh', 'mon phai'],
  'ban-do': ['dia danh', 'ban do', 'thanh tri', 'dai luc', 'bi canh', 'tinh cau', 'the gioi', 'khu vuc', 'dia ban'],
  'he-thong-tu-luyen': ['he thong tu luyen', 'he canh gioi', 'he thong', 'tu luyen'],
  'canh-gioi-tu-vi': ['canh gioi', 'tu vi', 'cap bac', 'dai canh', 'tieu canh'],
  'nhan-vat-chinh': ['nhan vat chinh', 'main character', 'chu nhan', 'vai chinh', 'protagonist'],
  'nhan-vat-lien-quan': ['nhan vat lien quan', 'dao lu', 'than nhan', 'huynh de', 'de tu', 'su phu', 'bang huu', 'ban be'],
});

const AUTO_ROLE_GENRE_BONUSES = Object.freeze({
  'tien hiep': { 'the-luc': 120, 'ban-do': 105, 'he-thong-tu-luyen': 160, 'canh-gioi-tu-vi': 170, 'nhan-vat-chinh': 75, 'nhan-vat-lien-quan': 95 },
  'huyen huyen': { 'the-luc': 115, 'ban-do': 120, 'he-thong-tu-luyen': 100, 'canh-gioi-tu-vi': 85, 'nhan-vat-chinh': 70, 'nhan-vat-lien-quan': 85 },
  'ngon tinh': { 'the-luc': 35, 'ban-do': 45, 'he-thong-tu-luyen': 10, 'canh-gioi-tu-vi': 5, 'nhan-vat-chinh': 180, 'nhan-vat-lien-quan': 205 },
  'he thong': { 'the-luc': 30, 'ban-do': 35, 'he-thong-tu-luyen': 210, 'canh-gioi-tu-vi': 95, 'nhan-vat-chinh': 95, 'nhan-vat-lien-quan': 70 },
  'trong sinh xuyen khong': { 'the-luc': 55, 'ban-do': 45, 'he-thong-tu-luyen': 85, 'canh-gioi-tu-vi': 65, 'nhan-vat-chinh': 165, 'nhan-vat-lien-quan': 165 },
  'do thi': { 'the-luc': 170, 'ban-do': 75, 'he-thong-tu-luyen': 25, 'canh-gioi-tu-vi': 20, 'nhan-vat-chinh': 120, 'nhan-vat-lien-quan': 125 },
  'vo han luu': { 'the-luc': 70, 'ban-do': 125, 'he-thong-tu-luyen': 70, 'canh-gioi-tu-vi': 55, 'nhan-vat-chinh': 125, 'nhan-vat-lien-quan': 130 },
  'vong du': { 'the-luc': 70, 'ban-do': 85, 'he-thong-tu-luyen': 145, 'canh-gioi-tu-vi': 120, 'nhan-vat-chinh': 125, 'nhan-vat-lien-quan': 105 },
  'khoa huyen': { 'the-luc': 135, 'ban-do': 125, 'he-thong-tu-luyen': 55, 'canh-gioi-tu-vi': 35, 'nhan-vat-chinh': 120, 'nhan-vat-lien-quan': 95 },
  'mat the': { 'the-luc': 130, 'ban-do': 135, 'he-thong-tu-luyen': 60, 'canh-gioi-tu-vi': 45, 'nhan-vat-chinh': 120, 'nhan-vat-lien-quan': 110 },
  'dong nhan': { 'the-luc': 45, 'ban-do': 50, 'he-thong-tu-luyen': 35, 'canh-gioi-tu-vi': 30, 'nhan-vat-chinh': 175, 'nhan-vat-lien-quan': 190 },
  'lich su': { 'the-luc': 185, 'ban-do': 115, 'he-thong-tu-luyen': 20, 'canh-gioi-tu-vi': 10, 'nhan-vat-chinh': 115, 'nhan-vat-lien-quan': 95 },
  'linh di': { 'the-luc': 55, 'ban-do': 155, 'he-thong-tu-luyen': 30, 'canh-gioi-tu-vi': 15, 'nhan-vat-chinh': 125, 'nhan-vat-lien-quan': 135 },
});

function normalizeAutoRoleSearchText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\[\[|\]\]/g, ' ')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function extractNovelGenres(novelData) {
  if (!novelData || typeof novelData !== 'object') return [];
  if (Array.isArray(novelData.genres)) return novelData.genres.filter(Boolean);
  if (typeof novelData.genres === 'string' && novelData.genres.trim()) return [novelData.genres.trim()];
  if (typeof novelData.genre === 'string' && novelData.genre.trim()) return [novelData.genre.trim()];
  return [];
}

function getGenreRoleBonus(roleValue, novelGenres = []) {
  return (novelGenres || []).reduce((sum, genre) => {
    const key = normalizeAutoRoleSearchText(genre).replace(/&/g, ' ');
    return sum + (AUTO_ROLE_GENRE_BONUSES[key]?.[roleValue] || 0);
  }, 0);
}

function scoreAutoRoleMatch(roleValue, haystack = '', { explicitRole = '', effectiveRole = '', novelGenres = [] } = {}) {
  if (roleValue === '') return 1000;
  let score = 0;
  if (roleValue === explicitRole) score += 800;
  if (roleValue === effectiveRole && effectiveRole) score += 500;
  if (roleValue === 'khong-tu-dong') score -= 200;
  score += getGenreRoleBonus(roleValue, novelGenres);
  const keywords = AUTO_ROLE_KEYWORDS[roleValue] || [];
  keywords.forEach((keyword) => {
    if (!keyword) return;
    if (haystack === keyword) {
      score += 240;
      return;
    }
    if (haystack.includes(keyword)) score += 110 + Math.min(keyword.length, 18);
  });
  if (roleValue === 'nhan-vat-chinh' && haystack.includes('nhan vat')) score += 40;
  if (roleValue === 'nhan-vat-lien-quan' && haystack.includes('nhan vat')) score += 25;
  if (roleValue === 'canh-gioi-tu-vi' && haystack.includes('gioi')) score += 20;
  if (roleValue === 'ban-do' && haystack.includes('dia')) score += 20;
  return score;
}

export function getAutoRoleCardGroups({
  tabLon = null,
  tabNho = null,
  explicitRole = '',
  effectiveRole = '',
  novelGenres = [],
} = {}) {
  const haystack = normalizeAutoRoleSearchText(
    [safeString(tabLon?.id), safeString(tabLon?.label), safeString(tabNho?.id), safeString(tabNho?.label)].join(' ')
  );
  const sortedRoles = AUTO_ROLE_CARD_VALUES
    .filter((roleValue) => roleValue)
    .map((roleValue, index) => ({
      roleValue,
      score: scoreAutoRoleMatch(roleValue, haystack, { explicitRole, effectiveRole, novelGenres }),
      index,
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .map((item) => item.roleValue);
  const visibleSet = new Set(['']);
  sortedRoles.forEach((roleValue) => {
    if (visibleSet.size < AUTO_ROLE_DEFAULT_VISIBLE_COUNT) visibleSet.add(roleValue);
  });
  if (explicitRole) visibleSet.add(explicitRole);
  if (effectiveRole) visibleSet.add(effectiveRole);
  const orderedRoles = ['', ...sortedRoles];
  return {
    visibleRoles: orderedRoles.filter((roleValue) => visibleSet.has(roleValue)),
    hiddenRoles: orderedRoles.filter((roleValue) => !visibleSet.has(roleValue)),
  };
}

export function getAutoRoleUiCopy(role = '') {
  return AUTO_ROLE_UI_COPY[role] || AUTO_ROLE_UI_COPY[''];
}

export function getAutoRoleSelectLabel(role = '') {
  return getAutoRoleUiCopy(role).selectLabel;
}

export function isAutoRoleEnabled(role = '') {
  return Boolean(role && role !== 'khong-tu-dong');
}

function getAutoRoleSummary({ explicitRole = '', effectiveRole = '' } = {}) {
  if (explicitRole) return `AUTO đang dùng: ${getAutoRoleSelectLabel(explicitRole)}`;
  if (effectiveRole) return `AUTO đang tự đoán: ${getAutoRoleSelectLabel(effectiveRole)}`;
  return 'AUTO chưa đoán ra mục này dùng để quản lý gì';
}

function getAutoRoleHint({ explicitRole = '', effectiveRole = '' } = {}) {
  if (explicitRole) return getAutoRoleUiCopy(explicitRole).helper;
  if (effectiveRole) return `Hiện hệ thống đang tự đoán mục này là "${getAutoRoleSelectLabel(effectiveRole)}".`;
  return getAutoRoleUiCopy('').helper;
}

function getAutoRoleExample({ explicitRole = '', effectiveRole = '' } = {}) {
  if (explicitRole) return getAutoRoleUiCopy(explicitRole).example;
  if (effectiveRole) return getAutoRoleUiCopy(effectiveRole).example;
  return getAutoRoleUiCopy('').example;
}

export function getAutoModeSummary({ explicitRole = '', effectiveRole = '', linkTargetCount = 0 } = {}) {
  const fallbackSummary = getAutoRoleSummary({ explicitRole, effectiveRole });
  if (explicitRole === 'khong-tu-dong') return 'AUTO đang tắt cho mục này';
  if (effectiveRole) {
    return linkTargetCount > 0
      ? `AUTO nội bộ + liên tab (${linkTargetCount}) · ${getAutoRoleSelectLabel(effectiveRole)}`
      : `AUTO nội bộ · ${getAutoRoleSelectLabel(effectiveRole)}`;
  }
  return fallbackSummary || 'AUTO nội bộ cho thẻ và Danh Sách trong cùng tab';
}

export function getAutoModeHint({ explicitRole = '', effectiveRole = '', supportsLink = false, linkTargetCount = 0 } = {}) {
  const fallbackHint = getAutoRoleHint({ explicitRole, effectiveRole });
  if (explicitRole === 'khong-tu-dong') return fallbackHint;
  if (!effectiveRole) {
    return supportsLink
      ? 'Tab này đang AUTO nội bộ. Muốn đẩy dữ liệu sang tab khác thì chọn vai trò phù hợp rồi bật liên tab.'
      : 'Tab này đang AUTO nội bộ cho thẻ và Danh Sách. Không cần cấu hình liên tab nếu chỉ dùng trong cùng mục.';
  }
  if (supportsLink && linkTargetCount === 0) {
    return `Mục này đã được nhận là "${getAutoRoleSelectLabel(effectiveRole)}". Hiện AUTO mới chạy trong nội bộ tab; cần chọn tab nhận nếu muốn bật mức 3.`;
  }
  return fallbackHint;
}

export function getAutoModeExample({ explicitRole = '', effectiveRole = '', supportsLink = false } = {}) {
  const fallbackExample = getAutoRoleExample({ explicitRole, effectiveRole });
  if (explicitRole === 'khong-tu-dong') return fallbackExample;
  if (effectiveRole) return fallbackExample;
  if (supportsLink) return 'Vi du: chon vai tro The luc, sau do chon tab Ban do nhan du lieu.';
  return 'Ví dụ: tab vật phẩm, thế lực, địa danh... có thể chỉ cần AUTO nội bộ trong cùng tab.';
}

export function getFriendlyWarningText(warning = '') {
  const text = safeString(warning).trim();
  const missingMatch = text.match(/^Thiếu ánh xạ cho "(.+)"\.$/i);
  if (missingMatch) return `AUTO chưa biết phải đọc "${missingMatch[1]}" ở trường nào.`;
  const missingFieldMatch = text.match(/^Trường "(.+)" cho "(.+)" không còn trong mẫu\.$/i);
  if (missingFieldMatch) return `Trường đang gắn cho "${missingFieldMatch[2]}" không còn tồn tại trong mẫu hiện tại.`;
  return text;
}

export function getTabHealthCopy(tabReport) {
  if (!tabReport) {
    return {
      title: 'Chưa có dữ liệu kiểm tra',
      message: 'Mục này chưa có đủ dữ liệu để AUTO tự đánh giá.',
      toneClass: 'text-slate-300',
      boxClass: 'border-slate-800 bg-slate-950/55',
      icon: null,
    };
  }
  if (tabReport.status === 'off') {
    return {
      title: 'AUTO đang tắt ở mục này',
      message: 'Dữ liệu trong mục này sẽ không tham gia đồng bộ tự động.',
      toneClass: 'text-slate-300',
      boxClass: 'border-slate-800 bg-slate-950/55',
      icon: null,
    };
  }
  if (Array.isArray(tabReport.warnings) && tabReport.warnings.length > 0) {
    return {
      title: 'Cần xem lại trước khi quét AUTO',
      message: `Còn ${tabReport.warnings.length} chỗ cần chọn đúng trường dữ liệu để AUTO đọc chính xác.`,
      toneClass: 'text-amber-100',
      boxClass: 'border-amber-700/35 bg-amber-950/20',
      icon: AlertTriangle,
    };
  }
  if (tabReport.status === 'ready') {
    return {
      title: 'Mục này đã sẵn sàng',
      message: 'AUTO đã có thể chạy ổn cho mục này với cấu hình hiện tại.',
      toneClass: 'text-emerald-200',
      boxClass: 'border-emerald-700/25 bg-emerald-950/15',
      icon: CheckCircle2,
    };
  }
  return {
    title: 'Nên chọn rõ mục này quản lý gì',
    message: 'Nếu AUTO chưa đoán đúng, hãy chọn tay để kết quả ổn định hơn.',
    toneClass: 'text-slate-300',
    boxClass: 'border-slate-800 bg-slate-950/55',
    icon: null,
  };
}

export function buildSimpleSetupSteps(diagnostics) {
  const warningCount = diagnostics?.summary?.warningCount || 0;
  const touchedCount = diagnostics?.preview?.touchedEntityCount || 0;
  return [
    'Chọn ở từng mục: mục này đang quản lý loại dữ liệu nào.',
    warningCount > 0
      ? `Mở phần "Chỉnh trường nâng cao" ở ${warningCount} chỗ đang có cảnh báo để AUTO đọc đúng dữ liệu.`
      : 'Không cần mở phần nâng cao nếu mục đã hiện trạng thái sẵn sàng.',
    touchedCount > 0
      ? `Sau cùng bấm "Quét Lại AUTO"; lần quét tiếp theo sẽ cập nhật khoảng ${touchedCount} thực thể.`
      : 'Sau cùng bấm "Quét Lại AUTO" để đồng bộ lại toàn bộ cây.',
  ];
}
