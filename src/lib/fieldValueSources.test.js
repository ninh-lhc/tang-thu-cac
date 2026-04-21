import { describe, expect, it } from 'vitest';
import {
  FIELD_SOURCE_KIND,
  NOVEL_METADATA_KEYS,
  getFieldSourceDescriptor,
  normalizeFieldSource,
  resolveFieldValueSource,
  sanitizeTabFieldSourceMap,
} from './fieldValueSources.js';

describe('normalizeFieldSource', () => {
  it('loại bỏ object không hợp lệ hoặc kind không biết', () => {
    expect(normalizeFieldSource(null)).toBe(null);
    expect(normalizeFieldSource({})).toBe(null);
    expect(normalizeFieldSource({ kind: 'bogus' })).toBe(null);
  });

  it('xem MANUAL là mặc định, không lưu', () => {
    expect(normalizeFieldSource({ kind: FIELD_SOURCE_KIND.MANUAL })).toBe(null);
  });

  it('giữ kind hợp lệ', () => {
    expect(normalizeFieldSource({ kind: FIELD_SOURCE_KIND.SUB_TAB_LABEL })).toEqual({ kind: FIELD_SOURCE_KIND.SUB_TAB_LABEL });
  });

  it('giữ metadataKey cho NOVEL_METADATA', () => {
    expect(normalizeFieldSource({ kind: FIELD_SOURCE_KIND.NOVEL_METADATA, metadataKey: NOVEL_METADATA_KEYS.AUTHOR })).toEqual({
      kind: FIELD_SOURCE_KIND.NOVEL_METADATA,
      metadataKey: NOVEL_METADATA_KEYS.AUTHOR,
    });
  });
});

describe('sanitizeTabFieldSourceMap', () => {
  it('bỏ field không còn trong template', () => {
    const raw = {
      f_keep: { kind: FIELD_SOURCE_KIND.SUB_TAB_LABEL },
      f_drop: { kind: FIELD_SOURCE_KIND.SUB_TAB_LABEL },
    };
    expect(sanitizeTabFieldSourceMap(raw, ['f_keep'])).toEqual({
      f_keep: { kind: FIELD_SOURCE_KIND.SUB_TAB_LABEL },
    });
  });

  it('bỏ entry MANUAL vì đó là mặc định', () => {
    const raw = { f_a: { kind: FIELD_SOURCE_KIND.MANUAL } };
    expect(sanitizeTabFieldSourceMap(raw, ['f_a'])).toEqual({});
  });
});

describe('getFieldSourceDescriptor', () => {
  it('trả về MANUAL nếu không có cấu hình', () => {
    expect(getFieldSourceDescriptor({}, 'f_x')).toEqual({ kind: FIELD_SOURCE_KIND.MANUAL });
  });

  it('đọc descriptor đã lưu', () => {
    const tab = { fieldSource: { f_x: { kind: FIELD_SOURCE_KIND.ENTITY_NAMES } } };
    expect(getFieldSourceDescriptor(tab, 'f_x')).toEqual({ kind: FIELD_SOURCE_KIND.ENTITY_NAMES });
  });
});

describe('resolveFieldValueSource', () => {
  const manualTab = {
    id: 'nho-1',
    label: 'Hạ Giới',
    fieldSuggestionLists: { f_sect: ['Thiên Môn', 'Địa Môn'] },
  };

  it('MANUAL trả về đúng list người dùng, defaultValue rỗng', () => {
    const r = resolveFieldValueSource({ fieldId: 'f_sect', tabConfig: manualTab });
    expect(r.suggestions).toEqual(['Thiên Môn', 'Địa Môn']);
    expect(r.defaultValue).toBe('');
    expect(r.sourceLabel).toBe('Thủ công');
  });

  it('SUB_TAB_LABEL dùng tên tab nhỏ làm default và ưu tiên đưa lên đầu list', () => {
    const tab = {
      ...manualTab,
      fieldSource: { f_sect: { kind: FIELD_SOURCE_KIND.SUB_TAB_LABEL } },
    };
    const r = resolveFieldValueSource({ fieldId: 'f_sect', tabConfig: tab });
    expect(r.defaultValue).toBe('Hạ Giới');
    expect(r.suggestions[0]).toBe('Hạ Giới');
    expect(r.suggestions).toContain('Thiên Môn');
  });

  it('SIBLING_TABS lấy tên các tab con khác trong cùng tab lớn', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'lon-1',
          subTabs: [
            { id: 'nho-1', label: 'Hạ Giới', viewType: 'collection-track' },
            { id: 'nho-2', label: 'Thượng Giới', viewType: 'collection-track' },
            { id: 'nho-3', label: 'Không tính', viewType: 'map' },
          ],
        },
      ],
    };
    const tab = { ...manualTab, fieldSource: { f_sect: { kind: FIELD_SOURCE_KIND.SIBLING_TABS } } };
    const r = resolveFieldValueSource({ fieldId: 'f_sect', tabConfig: tab, parentTabId: 'lon-1', activeNovelData: novel });
    expect(r.suggestions).toContain('Thượng Giới');
    expect(r.suggestions).not.toContain('Hạ Giới');
  });

  it('ENTITY_NAMES lấy tên thẻ đã tạo', () => {
    const novel = {
      data: {
        'lon-1': {
          'nho-1': { items: [{ name: 'Lý Thất Dạ' }, { name: 'Hàn Lập' }] },
        },
      },
    };
    const tab = { ...manualTab, fieldSource: { f_sect: { kind: FIELD_SOURCE_KIND.ENTITY_NAMES } } };
    const r = resolveFieldValueSource({ fieldId: 'f_sect', tabConfig: tab, parentTabId: 'lon-1', activeNovelData: novel });
    expect(r.suggestions).toContain('Lý Thất Dạ');
    expect(r.suggestions).toContain('Hàn Lập');
  });

  it('MAP_TYPES dùng mapEntrySuggestions.types', () => {
    const tab = {
      ...manualTab,
      mapEntrySuggestions: { types: ['Thế Giới', 'Đại Lục'] },
      fieldSource: { f_sect: { kind: FIELD_SOURCE_KIND.MAP_TYPES } },
    };
    const r = resolveFieldValueSource({ fieldId: 'f_sect', tabConfig: tab });
    expect(r.suggestions).toEqual(expect.arrayContaining(['Thế Giới', 'Đại Lục']));
  });

  it('NOVEL_METADATA genres', () => {
    const tab = { ...manualTab, fieldSource: { f_sect: { kind: FIELD_SOURCE_KIND.NOVEL_METADATA, metadataKey: NOVEL_METADATA_KEYS.GENRES } } };
    const novel = { genres: ['Tiên Hiệp', 'Huyền Huyễn'] };
    const r = resolveFieldValueSource({ fieldId: 'f_sect', tabConfig: tab, activeNovelData: novel });
    expect(r.defaultValue).toBe('Tiên Hiệp');
    expect(r.suggestions).toEqual(expect.arrayContaining(['Tiên Hiệp', 'Huyền Huyễn']));
  });

  it('NOVEL_METADATA author', () => {
    const tab = { ...manualTab, fieldSource: { f_sect: { kind: FIELD_SOURCE_KIND.NOVEL_METADATA, metadataKey: NOVEL_METADATA_KEYS.AUTHOR } } };
    const novel = { author: 'Nhĩ Căn' };
    const r = resolveFieldValueSource({ fieldId: 'f_sect', tabConfig: tab, activeNovelData: novel });
    expect(r.defaultValue).toBe('Nhĩ Căn');
    expect(r.suggestions).toEqual(expect.arrayContaining(['Nhĩ Căn']));
  });
});
