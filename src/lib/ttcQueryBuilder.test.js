import { describe, expect, it } from 'vitest';
import {
  builderFieldGroup,
  compileTtcQueryMarkdown,
  listTtcQueryFieldOptions,
  listTtcQueryScopes,
} from './ttcQueryBuilder.js';
import { parseTtcQuery } from './ttcQueryParser.js';
import { executeTtcQuery } from './ttcQueryEngine.js';

const novel = {
  tabsConfig: [
    {
      id: 'nhan-vat',
      label: 'Nhân vật',
      subTabs: [
        {
          id: 'chinh',
          label: 'Chính',
          fieldsTemplate: [{ id: 'f_level', label: 'Cấp' }],
        },
      ],
    },
  ],
  data: {
    'nhan-vat': {
      chinh: {
        entities: [{ id: 'e1', name: 'A', dynamicData: { f_level: '3', f_extra: 'x' } }],
      },
    },
  },
};

describe('ttcQueryBuilder', () => {
  it('lists scopes from tabs without hard-coded ids', () => {
    const scopes = listTtcQueryScopes(novel);
    expect(scopes.map((s) => s.id)).toEqual(['all', 'lon:nhan-vat', 'nho:nhan-vat|chinh']);
  });

  it('lists template and dynamic fields for the open novel', () => {
    const fields = listTtcQueryFieldOptions(novel, { kind: 'all' });
    expect(fields.some((f) => f.id === 'entity')).toBe(true);
    expect(fields.some((f) => f.id === 'f_level' && f.label === 'Cấp')).toBe(true);
    expect(fields.some((f) => f.id === 'f_extra')).toBe(true);
  });

  it('compiles a dynamic table block, not HTML', () => {
    const compiled = compileTtcQueryMarkdown({
      scope: { kind: 'nho', lonId: 'nhan-vat', nhoId: 'chinh' },
      columns: ['entity', 'f_level'],
      filters: [{ field: 'f_level', op: 'gte', value: '2' }],
      sortField: 'entity',
      sortDir: 'asc',
      limit: 20,
    });
    expect(compiled.ok).toBe(true);
    expect(compiled.markdown.startsWith('```ttc-query')).toBe(true);
    expect(compiled.markdown.includes('<table')).toBe(false);
    expect(compiled.source).toContain('folderPath = "nhan-vat/chinh"');
    expect(compiled.source).toContain('SELECT entity, f_level');
    expect(parseTtcQuery(compiled.source).ok).toBe(true);
  });

  it('rejects empty columns and limit over 500', () => {
    expect(compileTtcQueryMarkdown({ columns: [], limit: 50 }).ok).toBe(false);
    expect(compileTtcQueryMarkdown({ columns: ['entity'], limit: 900 }).ok).toBe(false);
  });

  it('labels f_alias and keeps template, parent, and later-entity fields', () => {
    const scoped = {
      tabsConfig: [
        {
          id: 'nhan-vat-trieu-hoan',
          label: 'Nhân Vật Triệu Hoán',
          fieldsTemplate: [{ id: 'f_parent_only', label: 'Thuộc tab lớn' }],
          subTabs: [
            {
              id: 'he-co-long',
              label: 'Hệ Cổ Long',
              fieldsTemplate: [
                { id: 'f_level', label: 'Cảnh giới' },
                { id: 'f_empty', label: 'Chưa có giá trị' },
                { id: 'f_same', label: 'Trùng nhãn' },
              ],
            },
            {
              id: 'khac',
              label: 'Nhóm khác',
              fieldsTemplate: [{ id: 'f_other', label: 'Trùng nhãn' }],
            },
          ],
        },
      ],
      data: {
        'nhan-vat-trieu-hoan': {
          'he-co-long': {
            entities: [
              { id: 'e1', name: 'A', dynamicData: { f_level: '' } },
              { id: 'e2', name: 'B', dynamicData: { f_late: '9' } },
            ],
          },
        },
      },
    };
    const scope = { kind: 'nho', lonId: 'nhan-vat-trieu-hoan', nhoId: 'he-co-long', tabLabel: 'Hệ Cổ Long' };
    const before = JSON.stringify(scoped);
    const fields = listTtcQueryFieldOptions(scoped, scope);
    expect(JSON.stringify(scoped)).toBe(before);
    expect(fields.find((f) => f.id === 'entity')?.label).toBe('Thực thể');
    expect(fields.find((f) => f.id === 'f_alias')?.label).toBe('Tên gọi khác');
    expect(fields.find((f) => f.id === 'f_level')?.label).toBe('Cảnh giới');
    expect(fields.find((f) => f.id === 'f_empty')).toBeTruthy();
    expect(fields.find((f) => f.id === 'f_parent_only')?.label).toBe('Thuộc tab lớn');
    expect(fields.find((f) => f.id === 'f_late')?.label).not.toBe('f_late');
    expect(fields.filter((f) => f.id === 'f_alias')).toHaveLength(1);
    expect(fields.some((f) => f.id === 'f_other')).toBe(false);

    const all = listTtcQueryFieldOptions(scoped, { kind: 'all' });
    const dupes = all.filter((f) => f.label === 'Trùng nhãn');
    expect(dupes.length).toBe(2);
    expect(dupes.every((f) => f.ambiguous)).toBe(true);

    const wrapped = listTtcQueryFieldOptions(
      { ...scoped, tabsConfig: { tabs: scoped.tabsConfig } },
      scope,
    );
    expect(wrapped.find((f) => f.id === 'f_alias')?.label).toBe('Tên gọi khác');
  });

  it('compiles parent folder for a large tab and no scope clause for the whole novel', () => {
    const all = compileTtcQueryMarkdown({
      scope: { kind: 'all' },
      columns: ['entity', 'f_alias'],
      filters: [],
      limit: 50,
    });
    expect(all.source.includes('WHERE')).toBe(false);
    expect(all.source).toContain('SELECT entity, f_alias');
    const lon = compileTtcQueryMarkdown({
      scope: { kind: 'lon', lonId: 'nhan-vat-trieu-hoan' },
      columns: ['entity'],
      filters: [],
      limit: 50,
    });
    expect(lon.source).toContain('parentFolder = "nhan-vat-trieu-hoan"');
    expect(lon.source.includes('Hệ Cổ Long')).toBe(false);
  });

  it('uses scope-specific labels for stock field ids (e.g. f_status → Phẩm cấp)', () => {
    const scoped = {
      tabsConfig: [
        {
          id: 'nhan-vat-trieu-hoan',
          label: 'Nhân Vật Triệu Hoán',
          subTabs: [
            {
              id: 'he-co-long',
              label: 'Hệ Cổ Long',
              fieldsTemplate: [
                { id: 'f_status', label: 'Phẩm cấp' },
                { id: 'f_title', label: 'Loại vũ khí' },
                { id: 'f_desc', label: 'Công năng' },
                { id: 'f_to_chuc', label: 'Thế lực' },
                { id: 'f_vai_tro', label: 'Vai trò trong cốt truyện' },
                { id: 'f_chu', label: 'Chủ nhân' },
                { id: 'f_linh_the', label: 'Linh thể / Tinh linh' },
                { id: 'f_alias', label: 'Tên gọi khác' },
              ],
            },
          ],
        },
      ],
      data: {
        'nhan-vat-trieu-hoan': {
          'he-co-long': {
            entities: [
              { id: 'e1', name: 'A', dynamicData: {} },
              { id: 'e2', name: 'B', dynamicData: { f_only_second: 'x' } },
            ],
          },
        },
      },
    };
    const scope = {
      kind: 'nho',
      lonId: 'nhan-vat-trieu-hoan',
      nhoId: 'he-co-long',
      tabLabel: 'Hệ Cổ Long',
    };
    const fields = listTtcQueryFieldOptions(scoped, scope);
    expect(fields.find((f) => f.id === 'f_status')?.label).toBe('Phẩm cấp');
    expect(fields.find((f) => f.id === 'f_status')?.label).not.toBe('Trạng thái');
    expect(fields.find((f) => f.id === 'f_title')?.label).toBe('Loại vũ khí');
    expect(fields.find((f) => f.id === 'f_alias')?.label).toBe('Tên gọi khác');
    expect(fields.find((f) => f.id === 'f_only_second')?.label).not.toBe('f_only_second');
    expect(fields.find((f) => f.id === 'folder')).toBeUndefined();
    expect(fields.find((f) => f.id === 'folderPath')?.group).toBe('advanced');
    expect(fields.find((f) => f.id === 'entity')?.group).toBe('content');

    const compiled = compileTtcQueryMarkdown({
      scope,
      columns: ['entity', 'f_status', 'f_to_chuc', 'f_alias'],
      filters: [],
      sortField: '',
      limit: 50,
    });
    expect(compiled.source).toContain('folderPath = "nhan-vat-trieu-hoan/he-co-long"');
    expect(compiled.source).toContain('SELECT entity, f_status, f_to_chuc, f_alias');
    expect(compiled.source.includes('Phẩm cấp')).toBe(false);

    const parsed = parseTtcQuery(compiled.source);
    const preview = executeTtcQuery(scoped, parsed.query);
    expect(preview.ok).toBe(true);
    expect(preview.columns.find((c) => c.id === 'f_status')?.label).toBe('Phẩm cấp');
  });

  it('dedupes field ids and groups advanced virtual fields', () => {
    expect(builderFieldGroup('folderPath', 'virtual')).toBe('advanced');
    expect(builderFieldGroup('entity', 'virtual')).toBe('content');
    expect(builderFieldGroup('folder', 'virtual')).toBe(null);
  });
});
