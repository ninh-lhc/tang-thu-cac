// Build a starter note skeleton for newly created entities.
// Used by the create-save flow so the detail editor opens with a tab-aware template.
// Keep it simple and editable: users can delete empty lines and add new ones freely.

import { safeString } from '../MasterUtils.jsx';
import { normalizeAsciiText } from './statusHierarchyParser.js';

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

export function buildEntityNoteTemplate({
  entityName = '',
  tabLabel = '',
  parentLabel = '',
  fieldsTemplate = [],
  dynamicData = {},
}) {
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
    fields.forEach((field) => {
      const label = safeString(field?.label).trim();
      if (!label) return;
      const value = safeString(dynamicData?.[field.id]).trim();
      lines.push(`- ${label}: ${value}`);
    });
  }

  lines.push('');
  lines.push('# Ghi chú');
  lines.push('');
  lines.push('[[Lạc Nam]] (37) ?');
  lines.push('');
  lines.push('# AUTO');
  lines.push('> Phần này do khối AUTO tự sinh và tự cập nhật. Bạn chỉ cần nhìn, không cần gõ lại.');
  buildAutoHintLines(tabLabel, parentLabel).forEach((line) => {
    lines.push(line);
  });
  lines.push('');

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}
