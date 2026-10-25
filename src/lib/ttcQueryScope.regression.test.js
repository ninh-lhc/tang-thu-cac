import { describe, expect, it } from 'vitest';
import { runTtcQueryFromSource } from './ttcQueryEngine.js';
import {
  buildTtcFieldLabelMapForScope,
  inferTtcQueryLabelScopeFromWhere,
} from './ttcQueryScope.js';
import { inspectTtcScopeEntities } from './ttcQueryDiagnostics.js';
import { parseTtcQuery } from './ttcQueryParser.js';

const LON = 'tab-7px280og7';
const NHO = 'sub-kuwppbpxa1';
const FOLDER = `${LON}/${NHO}`;

const novel = {
  tabsConfig: [
    {
      id: LON,
      label: 'Nhân Vật Triệu Hoán',
      subTabs: [
        {
          id: NHO,
          label: 'Hệ Cổ Long',
          fieldsTemplate: [
            { id: 'f_status', label: 'Phẩm cấp' },
            { id: 'f_to_chuc', label: 'Thế lực' },
            { id: 'f_title', label: 'Loại vũ khí' },
          ],
        },
        {
          id: 'other-sub',
          label: 'Tab khác',
          fieldsTemplate: [{ id: 'f_status', label: 'Cảnh giới' }],
        },
      ],
    },
  ],
  data: {
    [LON]: {
      [NHO]: {
        entities: [
          {
            id: 'a-phi',
            name: 'A Phi',
            dynamicData: {
              f_status: 'Tiểu Lý Phi Đao - Đa Tình Kiếm Khách Vô Tình Kiếm',
              f_to_chuc: '',
              f_alias: 'Phi',
            },
          },
          {
            id: 'demo',
            name: 'Demo',
            dynamicData: { f_status: 'Giang Hồ Tam Tác Phẩm - Đại Kỳ Anh Hùng Truyện' },
          },
          {
            id: 'list',
            name: 'Danh Sách',
            dynamicData: {},
          },
          {
            id: 'tier-ok',
            name: 'Thẻ có phẩm cấp đúng',
            dynamicData: { f_status: 'Địa Phẩm', f_to_chuc: '[[Tông A]]' },
          },
        ],
      },
      'other-tab': {
        entities: [{ id: 'out', name: 'Ngoài scope', dynamicData: { f_status: 'x' } }],
      },
    },
  },
};

const QUERY = `VIEW TABLE
FROM entity
WHERE folderPath = "${FOLDER}"
SELECT entity, f_status, f_to_chuc
SORT entity ASC
LIMIT 50`;

describe('ttcQuery scope + raw field regression (Hệ Cổ Long fixture)', () => {
  it('infers label scope from folderPath WHERE', () => {
    const parsed = parseTtcQuery(QUERY);
    expect(parsed.ok).toBe(true);
    const scope = inferTtcQueryLabelScopeFromWhere(parsed.query.where, novel.tabsConfig);
    expect(scope).toEqual({ kind: 'nho', lonId: LON, nhoId: NHO });
  });

  it('column header uses Phẩm cấp not Cảnh giới from another subtab', () => {
    const mapAll = buildTtcFieldLabelMapForScope(novel.tabsConfig, { kind: 'all' });
    expect(mapAll.f_status).toBe('Cảnh giới');
    const mapScoped = buildTtcFieldLabelMapForScope(novel.tabsConfig, {
      kind: 'nho',
      lonId: LON,
      nhoId: NHO,
    });
    expect(mapScoped.f_status).toBe('Phẩm cấp');
  });

  it('returns raw dynamicData.f_status without remapping to another field', () => {
    const r = runTtcQueryFromSource(QUERY, novel);
    expect(r.ok).toBe(true);
    expect(r.rows.find((x) => x.entityId === 'a-phi')?.cells.find((c) => c.fieldId === 'f_status')?.display).toBe(
      'Tiểu Lý Phi Đao - Đa Tình Kiếm Khách Vô Tình Kiếm',
    );
    expect(r.rows.find((x) => x.entityId === 'out')).toBeUndefined();
    expect(r.rows.find((x) => x.entityId === 'list')?.cells.find((c) => c.fieldId === 'f_to_chuc')?.display).toBe('');
    expect(r.columns.find((c) => c.id === 'f_status')?.label).toBe('Phẩm cấp');
  });

  it('inspectTtcScopeEntities reports raw dynamicData (audit helper)', () => {
    const audit = inspectTtcScopeEntities(
      novel,
      { kind: 'nho', lonId: LON, nhoId: NHO },
      { entityNames: ['A Phi', 'Danh Sách', 'Demo'] },
    );
    const aPhi = audit.find((x) => x.entityName === 'A Phi');
    expect(aPhi.folderPath).toBe(FOLDER);
    expect(aPhi.dynamicData.f_status).toContain('Tiểu Lý Phi Đao');
    expect(aPhi.fieldValues.f_to_chuc).toBe('');
    expect(aPhi.resolvedFieldsTemplate.find((f) => f.id === 'f_status')?.label).toBe('Phẩm cấp');
    expect(audit.find((x) => x.entityName === 'Danh Sách').dynamicDataKeys).not.toContain('f_to_chuc');
  });

  it('flags semantic mismatch when label suggests tier but values look like titles', () => {
    const r = runTtcQueryFromSource(QUERY, novel);
    expect(r.fieldWarnings?.some((w) => w.fieldId === 'f_status')).toBe(true);
  });

  it('does not mutate dynamicData', () => {
    const before = JSON.stringify(novel.data[LON][NHO].entities[0].dynamicData);
    runTtcQueryFromSource(QUERY, novel);
    expect(JSON.stringify(novel.data[LON][NHO].entities[0].dynamicData)).toBe(before);
  });
});
