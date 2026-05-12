// Đồng bộ dòng tên trong «Ghi chép chi tiết» khi đổi danh xưng thẻ.
// Khớp mẫu do `buildEntityNoteTemplate` sinh; không đụng dòng user đã sửa khác giá trị tên cũ.
// `useAppEntityMilestoneActions` gọi khi lưu form / đổi tên qua timeline.

import { safeString } from '../MasterUtils.jsx';

const VI_DISPLAY_NAME_LINE_PREFIX = '- Danh xưng / Tên gọi:';

export function syncEntityNotesDisplayNameLine(info, oldDisplayName, newDisplayName) {
  const text = safeString(info);
  const oldTrim = safeString(oldDisplayName).trim();
  const newTrim = safeString(newDisplayName).trim();
  if (!text || !oldTrim || oldTrim === newTrim) return text;

  let changed = false;
  const nextLines = text.split('\n').map((line) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith(VI_DISPLAY_NAME_LINE_PREFIX)) return line;
    const after = trimmed.slice(VI_DISPLAY_NAME_LINE_PREFIX.length).trim();
    if (after !== oldTrim) return line;
    changed = true;
    const lead = line.match(/^\s*/)?.[0] || '';
    return `${lead}${VI_DISPLAY_NAME_LINE_PREFIX} ${newTrim}`;
  });

  return changed ? nextLines.join('\n') : text;
}
