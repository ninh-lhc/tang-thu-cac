import { describe, expect, it } from 'vitest';
import { syncEntityNotesDisplayNameLine } from './entityNotesDisplayNameSync.js';

describe('syncEntityNotesDisplayNameLine', () => {
  it('cập nhật dòng Danh xưng khi giá trị vẫn là tên cũ', () => {
    const info = `# Thông tin chi tiết\n\n- Danh xưng / Tên gọi: Denh\n- Khác: x`;
    expect(syncEntityNotesDisplayNameLine(info, 'Denh', 'Denh Mới')).toContain(
      '- Danh xưng / Tên gọi: Denh Mới'
    );
  });

  it('không đổi nếu tên cũ và mới giống nhau', () => {
    const info = '- Danh xưng / Tên gọi: A';
    expect(syncEntityNotesDisplayNameLine(info, 'A', 'A')).toBe(info);
  });

  it('không đổi dòng nếu user đã đổi giá trị sau nhãn', () => {
    const info = '- Danh xưng / Tên gọi: Biệt danh khác';
    expect(syncEntityNotesDisplayNameLine(info, 'Denh', 'Denh Mới')).toBe(info);
  });

  it('chấp nhận info rỗng', () => {
    expect(syncEntityNotesDisplayNameLine('', 'A', 'B')).toBe('');
  });
});
