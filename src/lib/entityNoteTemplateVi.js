// Build a starter note skeleton for newly created entities.
// Used by the create-save flow so the detail editor opens with a tab-aware template.
// mergeEntityNoteDetailSectionFromDynamicData: lưu form sửa thẻ — đồng bộ lại khối «Thông tin chi tiết» theo dynamicData, giữ phần sau «# Ghi chú».
// Tránh hai bullet trùng chữ: `f_status` thường tự ghép từ ô Gợi ý nhanh — nếu trùng hệt một trường khác trong mẫu thì không lặp lại trong skeleton.

import { safeString } from '../MasterUtils.jsx';
import { normalizeAsciiText } from './statusHierarchyParser.js';

const STATUS_LINE_FIELD_ID = 'f_status';

/** true khi nên bỏ dòng «Chuỗi hiển thị» trong skeleton vì trùng một trường chi tiết (đã có bullet riêng). */
function shouldOmitRedundantStatusLine(fields, dynamicData) {
  const v = safeString(dynamicData?.[STATUS_LINE_FIELD_ID]).trim();
  if (!v) return false;
  for (const field of fields) {
    const fid = safeString(field?.id).trim();
    if (!fid || fid === STATUS_LINE_FIELD_ID) continue;
    if (safeString(dynamicData?.[fid]).trim() === v) return true;
  }
  return false;
}

function buildAutoHintLines(tabLabel, parentLabel) {
  const scope = normalizeAsciiText([parentLabel, tabLabel].filter(Boolean).join(' '));
  if (!scope) {
    return ['- Cách phân nhóm: theo tab hiện tại'];
  }

  if (scope.includes('di thuoc tinh')) {
    return [
      '- Cách phân nhóm: Băng / Hỏa / Phong / Lôi / Mộc / Thủy / Thổ / Âm / Dương',
      '- Thứ tự gợi ý: cùng thuộc tính chính sẽ nằm chung một nhóm',
    ];
  }

  if (scope.includes('cong phap') || scope.includes('vu ky') || scope.includes('bi thuat')) {
    return [
      '- Cách phân nhóm: Linh / Huyền / Địa / Thiên / Thần',
      '- Thứ tự gợi ý: xếp theo phẩm giai hoặc cấp bậc',
    ];
  }

  if (scope.includes('phap bao') || scope.includes('vu khi') || scope.includes('binh khi')) {
    return [
      '- Cách phân nhóm: Pháp bảo / Binh khí / Linh khí / Dị bảo',
      '- Thứ tự gợi ý: xếp theo phẩm cấp và mức độ hiếm',
    ];
  }

  if (scope.includes('he thong tu luyen') || scope.includes('canh gioi')) {
    return [
      '- Cách phân nhóm: Lộ trình tu luyện / Cảnh giới / Đột phá / Đặc quyền',
      '- Thứ tự gợi ý: xếp theo chuỗi phát triển tu luyện',
    ];
  }

  if (scope.includes('ban do') || scope.includes('dia danh') || scope.includes('bi canh')) {
    return [
      '- Cách phân nhóm: Đại lục / Tinh cầu / Giới / Khu vực / Địa danh',
      '- Thứ tự gợi ý: xếp từ phạm vi lớn đến phạm vi nhỏ',
    ];
  }

  if (scope.includes('nhan vat')) {
    return [
      '- Cách phân nhóm: Nhân vật chính / Đạo lữ / Thân nhân / Huynh đệ / Sư đồ',
      '- Thứ tự gợi ý: xếp theo vai trò trong hệ nhân vật',
    ];
  }

  if (scope.includes('the luc')) {
    return [
      '- Cách phân nhóm: Tông môn / Gia tộc / Quốc gia / Liên minh / Tổ chức',
      '- Thứ tự gợi ý: xếp theo quy mô hoặc cấp bậc thế lực',
    ];
  }

  return ['- Cách phân nhóm: tự phân loại theo tab hiện tại'];
}

/**
 * Khối «# Thông tin chi tiết» (đến dòng trống ngay trước `# Ghi chú` trong mẫu mặc định).
 * Dùng khi tạo thẻ mới và khi lưu form để đồng bộ bullet theo dynamicData.
 */
export function buildEntityNoteDetailSectionLines({ entityName = '', fieldsTemplate = [], dynamicData = {} }) {
  const canonicalName = safeString(entityName).trim();
  const fields = Array.isArray(fieldsTemplate) ? fieldsTemplate : [];
  const lines = [];

  lines.push('# Thông tin chi tiết');
  lines.push('');
  lines.push('> Xóa dòng không cần, thêm dòng cần bổ sung.');
  lines.push('');
  if (canonicalName) {
    lines.push(`- Danh xưng / Tên gọi: ${canonicalName}`);
  }

  if (fields.length === 0) {
    lines.push('- Nội dung:');
  } else {
    const omitStatusDuplicate = shouldOmitRedundantStatusLine(fields, dynamicData);
    fields.forEach((field) => {
      const fid = safeString(field?.id).trim();
      if (omitStatusDuplicate && fid === STATUS_LINE_FIELD_ID) return;
      const label = safeString(field?.label).trim();
      if (!label) return;
      const value = safeString(dynamicData?.[field.id]).trim();
      lines.push(`- ${label}: ${value}`);
    });
  }

  lines.push('');
  return lines;
}

const SECTION_DETAIL_RE = /^#\s*Thông tin chi tiết\s*$/i;
const SECTION_GHICHU_RE = /^#\s*Ghi chú\s*$/i;
const SECTION_AUTO_RE = /^#\s*AUTO\s*$/i;

/**
 * Khi user sửa form và lưu: cập nhật khối «Thông tin chi tiết» theo dynamicData + tên,
 * giữ nguyên phần từ `# Ghi chú` trở đi (ghi chép tay / AUTO gợi ý).
 * Không thấy tiêu đề mẫu → giữ nguyên info (tránh phá ghi chép tùy biến).
 */
export function mergeEntityNoteDetailSectionFromDynamicData(prevInfo, merge) {
  const src = safeString(prevInfo);
  if (!src.trim()) return src;
  const lines = src.split('\n');
  const iDetail = lines.findIndex((l) => SECTION_DETAIL_RE.test(l.trim()));
  if (iDetail === -1) return prevInfo;

  let iAfter = -1;
  for (let j = iDetail + 1; j < lines.length; j += 1) {
    const t = lines[j].trim();
    if (SECTION_GHICHU_RE.test(t)) {
      iAfter = j;
      break;
    }
  }
  if (iAfter === -1) {
    for (let j = iDetail + 1; j < lines.length; j += 1) {
      const t = lines[j].trim();
      if (SECTION_AUTO_RE.test(t)) {
        iAfter = j;
        break;
      }
    }
  }
  if (iAfter === -1) iAfter = lines.length;

  const nextDetail = buildEntityNoteDetailSectionLines(merge);
  const out = [...lines.slice(0, iDetail), ...nextDetail, ...lines.slice(iAfter)];
  return out.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}

export function buildEntityNoteTemplate({
  entityName = '',
  tabLabel = '',
  parentLabel = '',
  fieldsTemplate = [],
  dynamicData = {},
}) {
  const lines = buildEntityNoteDetailSectionLines({ entityName, fieldsTemplate, dynamicData });

  lines.push('# Ghi chú');
  lines.push('');
  lines.push('[[Tên nhân vật]] (37) ?');
  lines.push('');
  lines.push('# AUTO');
  lines.push('> Phần này do khối AUTO tự sinh và tự cập nhật. Bạn chỉ cần nhìn, không cần gõ lại.');
  buildAutoHintLines(tabLabel, parentLabel).forEach((line) => {
    lines.push(line);
  });
  lines.push('');

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}
