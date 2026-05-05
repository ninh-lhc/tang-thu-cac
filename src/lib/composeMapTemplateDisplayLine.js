/**
 * Chuỗi «Chuỗi hiển thị / dữ liệu auto» (f_status) trên tab Bản đồ: nối các trường theo thứ tự
 * `fieldsTemplate`, chèn «Đặc tính địa vực» (state mapQuickSystem) ngay trước f_vi_tri.
 * `App.jsx` / `MasterComponents` import; không phụ thuộc React.
 */
import { safeString } from '../MasterUtils.jsx';
import { normalizeAsciiText, splitMapHierarchyTokens } from './statusHierarchyParser.js';

function splitDisplayTokens(value) {
  return safeString(value)
    .split(/[·•|/]+/)
    .map((s) => safeString(s).trim())
    .filter(Boolean);
}

/**
 * Token vừa bóc từ f_status có phải thực chất là «Trực thuộc» (đã lưu ở f_vi_tri) hay không —
 * tránh khi không chọn Đặc tính mà vẫn lấy nhầm đoạn đường dẫn cha làm đặc tính.
 */
export function mapQuickInferredTokenMatchesParentPath(candidate, parentPath) {
  const c = safeString(candidate).trim();
  const p = safeString(parentPath).trim();
  if (!c || !p) return false;
  if (normalizeAsciiText(c) === normalizeAsciiText(p)) return true;
  const pl = p.toLowerCase();
  const cl = c.toLowerCase();
  if (!pl.startsWith(cl) || p.length <= c.length) return false;
  const rest = p.slice(c.length).trimStart();
  if (!rest.length) return true;
  if (/^[>·•|\\/\u2192\u00BB\u2014\u2013-]/.test(rest)) return true;
  if (c.includes('>')) return true;
  const firstSeg = splitMapHierarchyTokens(p)[0];
  if (firstSeg && normalizeAsciiText(firstSeg) === normalizeAsciiText(c)) return true;
  return false;
}

/**
 * Ghép giá trị theo thứ tự trường trong mẫu tab (bỏ f_alias, f_status); dedupe theo normalize ASCII.
 * @param {unknown} fieldsTemplate
 * @param {Record<string, unknown>} dynamicData
 * @param {string} mapQuickDacTinh — «Đặc tính địa vực» (không có fieldId riêng trong MAP_QUICK_SLOTS)
 */
export function composeMapTemplateDisplayLine(fieldsTemplate, dynamicData, mapQuickDacTinh = '') {
  const dyn = dynamicData && typeof dynamicData === 'object' ? dynamicData : {};
  const tpl = Array.isArray(fieldsTemplate) ? fieldsTemplate : [];
  const parts = [];
  const seenNorm = new Set();
  const pushPart = (raw) => {
    const t = safeString(raw).trim();
    if (!t) return;
    const nk = normalizeAsciiText(t);
    if (!nk || seenNorm.has(nk)) return;
    seenNorm.add(nk);
    parts.push(t);
  };
  const dac = safeString(mapQuickDacTinh).trim();
  let sawViTri = false;
  for (const f of tpl) {
    const id = safeString(f?.id).trim();
    if (!id || id === 'f_alias' || id === 'f_status') continue;
    if (id === 'f_vi_tri') {
      sawViTri = true;
      pushPart(dac);
      pushPart(dyn.f_vi_tri);
      continue;
    }
    pushPart(dyn[id]);
  }
  if (dac && !sawViTri) pushPart(dac);
  const out = parts.join(' · ');
  if (out) return out;
  const t = safeString(dyn.f_title).trim();
  const d = safeString(mapQuickDacTinh).trim();
  return [t, d].filter(Boolean).join(' · ');
}

/**
 * Đọc lại «Đặc tính» từ f_status đã lưu (sau khi f_status là chuỗi dài nhiều đoạn).
 * Bỏ các token đầu trùng f_title / f_he_gioi_ban_do; phần còn lại lấy token đầu tiên (một đoạn đặc tính).
 * @param {string} [parentPathOpt] — chuỗi «Trực thuộc» đã lưu (f_vi_tri hoặc field map); truyền rõ để không nhầm với đặc tính.
 */
export function inferMapQuickSystemFromStoredStatus(dynamicData, parentPathOpt = '') {
  const title = safeString(dynamicData?.f_title).trim();
  const realm = safeString(dynamicData?.f_he_gioi_ban_do || dynamicData?.f_he_phan_cap).trim();
  const parentPath = safeString(parentPathOpt).trim() || safeString(dynamicData?.f_vi_tri).trim();
  const tokens = splitDisplayTokens(dynamicData?.f_status);
  if (tokens.length === 0) return '';
  if (!title && !realm) {
    if (tokens.length >= 2) return tokens.slice(1).join(' · ');
    return '';
  }
  let i = 0;
  if (title && tokens[i] && normalizeAsciiText(tokens[i]) === normalizeAsciiText(title)) i += 1;
  if (realm && tokens[i] && normalizeAsciiText(tokens[i]) === normalizeAsciiText(realm)) i += 1;
  if (i < tokens.length && mapQuickInferredTokenMatchesParentPath(tokens[i], parentPath)) {
    return '';
  }
  if (i < tokens.length) return tokens[i];
  return '';
}
