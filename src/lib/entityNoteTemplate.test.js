import { describe, expect, it } from 'vitest';
import { buildEntityNoteTemplate } from './entityNoteTemplateVi.js';

describe('entityNoteTemplate', () => {
  it('prefills a tab-aware editable skeleton with existing values', () => {
    const text = buildEntityNoteTemplate({
      entityName: 'Luyện Khí',
      tabLabel: 'Cảnh Giới Tu Vi',
      parentLabel: 'Tu Luyện',
      fieldsTemplate: [
        { id: 'f_status', label: 'Cảnh giới / Trạng thái' },
        { id: 'f_title', label: 'Danh hiệu / Phân loại' },
        { id: 'f_alias', label: 'Biệt danh / tên khác' },
      ],
      dynamicData: {
        f_status: 'Đệ Nhất - Linh Cảnh Bát Bộ',
        f_title: 'Tu luyện',
      },
    });

    expect(text).toContain('## Mẫu nhập nhanh - Tu Luyện › Cảnh Giới Tu Vi');
    expect(text).toContain('- Danh xưng / Tên gọi: Luyện Khí');
    expect(text).toContain('- Cảnh giới / Trạng thái: Đệ Nhất - Linh Cảnh Bát Bộ');
    expect(text).toContain('- Danh hiệu / Phân loại: Tu luyện');
    expect(text).toContain('- Biệt danh / tên khác:');
    expect(text).toContain('## Ghi chép chi tiết');
    expect(text).toContain('## AUTO');
    expect(text).toContain('Phần này do khối AUTO tự sinh và tự cập nhật');
    expect(text).not.toContain('Nhóm tự động: hệ thống');
  });

  it('falls back to a generic content line when no fields are provided', () => {
    const text = buildEntityNoteTemplate({
      entityName: 'Vô Danh',
      tabLabel: 'Cảnh Giới Tu Vi',
      fieldsTemplate: [],
      dynamicData: {},
    });

    expect(text).toContain('- Danh xưng / Tên gọi: Vô Danh');
    expect(text).toContain('- Nội dung:');
  });
});
