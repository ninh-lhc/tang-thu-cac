import { describe, expect, it } from 'vitest';
import {
  FIELD_SOURCE_KIND,
  FIELD_SOURCE_OPTIONS,
  NOVEL_METADATA_KEYS,
  filterFieldSourceOptions,
  genreTemplateHasMapList,
  getFieldSourceDescriptor,
  normalizeFieldSource,
  resolveFieldValueSource,
  sanitizeTabFieldSourceMap,
  tabHasMapEntrySuggestions,
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

  it('GENRE_MAP_TYPES gom types từ mọi tab Bản đồ trong mẫu thể loại', () => {
    const tab = { ...manualTab, fieldSource: { f_sect: { kind: FIELD_SOURCE_KIND.GENRE_MAP_TYPES } } };
    const genreTemplate = {
      tabsConfig: [
        {
          id: 'ban-do',
          subTabs: [
            { id: 'hz', mapEntrySuggestions: { types: ['Thế Giới', 'Đại Lục'] } },
            { id: 'th', mapEntrySuggestions: { types: ['Thành Thị'] } },
          ],
        },
        { id: 'nhan-vat', subTabs: [{ id: 'chinh-phai' }] },
      ],
    };
    const r = resolveFieldValueSource({ fieldId: 'f_sect', tabConfig: tab, genreTemplate });
    expect(r.suggestions).toEqual(expect.arrayContaining(['Thế Giới', 'Đại Lục', 'Thành Thị']));
    expect(r.sourceLabel).toBe('List «Giới Diện» theo mẫu thể loại');
  });

  it('GENRE_MAP_HIERARCHY không có genreTemplate thì chỉ trả về manualList (không có map list bổ sung)', () => {
    const tab = {
      id: 'nho-1',
      label: 'Hạ Giới',
      fieldSource: { f_other: { kind: FIELD_SOURCE_KIND.GENRE_MAP_HIERARCHY } },
    };
    const r = resolveFieldValueSource({ fieldId: 'f_other', tabConfig: tab, genreTemplate: null });
    expect(r.suggestions).toEqual([]);
    expect(r.sourceLabel).toBe('List «Đặc Tính» theo mẫu thể loại');
  });
});

describe('tabHasMapEntrySuggestions', () => {
  it('true cho tab có mapEntrySuggestions', () => {
    expect(tabHasMapEntrySuggestions({ mapEntrySuggestions: { types: [] } })).toBe(true);
  });
  it('false cho tab không có / không phải object', () => {
    expect(tabHasMapEntrySuggestions({})).toBe(false);
    expect(tabHasMapEntrySuggestions({ mapEntrySuggestions: [] })).toBe(false);
    expect(tabHasMapEntrySuggestions(null)).toBe(false);
  });
});

describe('genreTemplateHasMapList', () => {
  it('true khi ít nhất 1 tab con có types', () => {
    const tpl = {
      tabsConfig: [
        { subTabs: [{ mapEntrySuggestions: { types: ['Đại Lục'] } }] },
      ],
    };
    expect(genreTemplateHasMapList(tpl, 'types')).toBe(true);
    expect(genreTemplateHasMapList(tpl, 'hierarchy')).toBe(false);
  });
  it('false khi mẫu rỗng', () => {
    expect(genreTemplateHasMapList(null, 'types')).toBe(false);
    expect(genreTemplateHasMapList({ tabsConfig: [] }, 'types')).toBe(false);
  });
});

describe('filterFieldSourceOptions', () => {
  it('ẩn MAP_TYPES / MAP_HIERARCHY khi tab không có mapEntrySuggestions', () => {
    const out = filterFieldSourceOptions({ tabConfig: { id: 'a' } });
    const kinds = out.map((o) => o.kind);
    expect(kinds).not.toContain(FIELD_SOURCE_KIND.MAP_TYPES);
    expect(kinds).not.toContain(FIELD_SOURCE_KIND.MAP_HIERARCHY);
  });
  it('hiện MAP_TYPES / MAP_HIERARCHY khi tab có mapEntrySuggestions', () => {
    const out = filterFieldSourceOptions({ tabConfig: { mapEntrySuggestions: {} } });
    const kinds = out.map((o) => o.kind);
    expect(kinds).toContain(FIELD_SOURCE_KIND.MAP_TYPES);
    expect(kinds).toContain(FIELD_SOURCE_KIND.MAP_HIERARCHY);
  });
  it('ẩn GENRE_MAP_* khi mẫu thể loại rỗng', () => {
    const out = filterFieldSourceOptions({ tabConfig: {}, genreTemplate: null });
    const kinds = out.map((o) => o.kind);
    expect(kinds).not.toContain(FIELD_SOURCE_KIND.GENRE_MAP_TYPES);
    expect(kinds).not.toContain(FIELD_SOURCE_KIND.GENRE_MAP_HIERARCHY);
  });
  it('hiện GENRE_MAP_TYPES khi mẫu có types, nhưng ẩn GENRE_MAP_HIERARCHY nếu không có hierarchy', () => {
    const tpl = {
      tabsConfig: [{ subTabs: [{ mapEntrySuggestions: { types: ['A'] } }] }],
    };
    const out = filterFieldSourceOptions({ tabConfig: {}, genreTemplate: tpl });
    const kinds = out.map((o) => o.kind);
    expect(kinds).toContain(FIELD_SOURCE_KIND.GENRE_MAP_TYPES);
    expect(kinds).not.toContain(FIELD_SOURCE_KIND.GENRE_MAP_HIERARCHY);
  });
  it('luôn giữ các option MANUAL / SUB_TAB_LABEL / SIBLING_TABS / ENTITY_NAMES / NOVEL_METADATA', () => {
    const out = filterFieldSourceOptions({ tabConfig: {} });
    const kinds = out.map((o) => o.kind);
    expect(kinds).toContain(FIELD_SOURCE_KIND.MANUAL);
    expect(kinds).toContain(FIELD_SOURCE_KIND.SUB_TAB_LABEL);
    expect(kinds).toContain(FIELD_SOURCE_KIND.SIBLING_TABS);
    expect(kinds).toContain(FIELD_SOURCE_KIND.ENTITY_NAMES);
    expect(kinds).toContain(FIELD_SOURCE_KIND.NOVEL_METADATA);
  });
  it('đảm bảo tổng option (sau khi bật đủ điều kiện) khớp FIELD_SOURCE_OPTIONS gốc', () => {
    const tpl = {
      tabsConfig: [{ subTabs: [{ mapEntrySuggestions: { types: ['A'], hierarchy: ['B'] } }] }],
    };
    const out = filterFieldSourceOptions({
      tabConfig: { mapEntrySuggestions: { types: ['X'] } },
      genreTemplate: tpl,
    });
    expect(out).toHaveLength(FIELD_SOURCE_OPTIONS.length);
  });
});
