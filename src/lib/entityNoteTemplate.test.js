import { describe, expect, it } from 'vitest';
import { buildEntityNoteTemplate } from './entityNoteTemplateVi.js';

describe('entityNoteTemplate', () => {
  it('prefills an editable skeleton with values', () => {
    const text = buildEntityNoteTemplate({
      entityName: 'Luyen Khi',
      tabLabel: 'Canh Gioi Tu Vi',
      parentLabel: 'Tu Luyen',
      fieldsTemplate: [
        { id: 'f_status', label: 'Canh gioi / Trang thai' },
        { id: 'f_title', label: 'Danh hieu / Phan loai' },
        { id: 'f_alias', label: 'Biet danh / ten khac' },
      ],
      dynamicData: {
        f_status: 'De Nhat - Linh Canh Bat Bo',
        f_title: 'Tu luyen',
      },
    });

    expect(text).toContain('# ');
    expect(text).toContain('Luyen Khi');
    expect(text).toContain('Canh gioi / Trang thai: De Nhat - Linh Canh Bat Bo');
    expect(text).toContain('Danh hieu / Phan loai: Tu luyen');
    expect(text).toContain('Biet danh / ten khac:');
    expect(text).toContain('(37) ?');
    expect(text).toContain('[[');
    expect(text).toContain(']]');
    expect(text).toContain('# AUTO');
  });

  it('falls back to generic line when no fields are provided', () => {
    const text = buildEntityNoteTemplate({
      entityName: 'Vo Danh',
      tabLabel: 'Canh Gioi Tu Vi',
      fieldsTemplate: [],
      dynamicData: {},
    });

    expect(text).toContain('Vo Danh');
    expect(text).toContain('- ');
  });

  it('omits f_status line when it only duplicates another field (auto-compose / renamed label)', () => {
    const text = buildEntityNoteTemplate({
      entityName: 'Demi',
      tabLabel: 'Dao Quan',
      parentLabel: 'Suu Tap',
      fieldsTemplate: [
        { id: 'f_status', label: 'Cấu tạo' },
        { id: 'f_binh_chuyen', label: 'Binh chủng chuyên dụng' },
      ],
      dynamicData: {
        f_status: 'Đại Tần Duệ Sĩ',
        f_binh_chuyen: 'Đại Tần Duệ Sĩ',
      },
    });

    expect(text).not.toContain('- Cấu tạo:');
    expect(text).toContain('- Binh chủng chuyên dụng: Đại Tần Duệ Sĩ');
  });

  it('keeps f_status when its value differs from other fields', () => {
    const text = buildEntityNoteTemplate({
      entityName: 'A',
      tabLabel: 'T',
      fieldsTemplate: [
        { id: 'f_status', label: 'Chuỗi hiển thị' },
        { id: 'f_x', label: 'Khác' },
      ],
      dynamicData: {
        f_status: 'Một · Hai',
        f_x: 'Một',
      },
    });

    expect(text).toContain('- Chuỗi hiển thị: Một · Hai');
    expect(text).toContain('- Khác: Một');
  });
});
