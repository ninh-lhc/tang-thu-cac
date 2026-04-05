// Build a starter note skeleton for newly created entities.
// Used by the create-save flow so the detail editor opens with a tab-aware template.
// Keep it simple and editable: users can delete empty lines and add new ones freely.

import { safeString } from '../MasterUtils.jsx';

export function buildEntityNoteTemplate({
  tabLabel = '',
  parentLabel = '',
  fieldsTemplate = [],
  dynamicData = {},
}) {
  const scopeLabel = [parentLabel, tabLabel].map((part) => safeString(part).trim()).filter(Boolean).join(' › ');
  const fields = Array.isArray(fieldsTemplate) ? fieldsTemplate : [];
  const lines = [];

  lines.push(scopeLabel ? `## Mẫu nhập nhanh — ${scopeLabel}` : '## Mẫu nhập nhanh');
  lines.push('> Xoá dòng không có, thêm dòng cần bổ sung.');
  lines.push('');

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
  lines.push('## Ghi chép chi tiết');
  lines.push('');

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd();
}
