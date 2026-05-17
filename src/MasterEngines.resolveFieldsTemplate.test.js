import { describe, expect, it } from 'vitest';
import {
  OUTLINE_LIST_FIELD,
  WIKI_ALIAS_FIELD,
  resolveFieldsTemplate,
} from './MasterEngines.js';

describe('resolveFieldsTemplate builtin fields', () => {
  const baseTab = {
    id: 'phu',
    viewType: 'collection-track',
    fieldsTemplate: [
      { id: 'f_status', label: 'Phẩm chất' },
      { id: 'f_title', label: 'Nguồn gốc' },
    ],
  };

  it('mặc định thêm f_muc_luc_danh_sach và f_alias', () => {
    const ids = resolveFieldsTemplate(baseTab, 'nhan-vat', 'Nhân vật').map((f) => f.id);
    expect(ids).toContain(OUTLINE_LIST_FIELD.id);
    expect(ids).toContain(WIKI_ALIAS_FIELD.id);
  });

  it('wikiAliasInTemplate: false bỏ f_alias', () => {
    const ids = resolveFieldsTemplate(
      { ...baseTab, wikiAliasInTemplate: false },
      'nhan-vat',
      'Nhân vật'
    ).map((f) => f.id);
    expect(ids).not.toContain(WIKI_ALIAS_FIELD.id);
    expect(ids).toContain(OUTLINE_LIST_FIELD.id);
  });

  it('autoListOutlineFieldId __off__ bỏ f_muc_luc_danh_sach', () => {
    const ids = resolveFieldsTemplate(
      { ...baseTab, autoListOutlineFieldId: '__off__' },
      'nhan-vat',
      'Nhân vật'
    ).map((f) => f.id);
    expect(ids).not.toContain(OUTLINE_LIST_FIELD.id);
    expect(ids).toContain(WIKI_ALIAS_FIELD.id);
  });

  it('giữ nhãn tuỳ chỉnh khi trường đã lưu trên tab', () => {
    const tab = {
      ...baseTab,
      fieldsTemplate: [
        ...baseTab.fieldsTemplate,
        { id: OUTLINE_LIST_FIELD.id, label: 'Ứng dụng' },
      ],
    };
    const outline = resolveFieldsTemplate(tab, 'nhan-vat', 'Nhân vật').find(
      (f) => f.id === OUTLINE_LIST_FIELD.id
    );
    expect(outline?.label).toBe('Ứng dụng');
  });
});
