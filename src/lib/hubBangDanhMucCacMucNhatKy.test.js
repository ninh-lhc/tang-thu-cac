import { describe, it, expect } from 'vitest';
import { buildHubExtendedCatalogLines } from './hubBangDanhMucCacMucNhatKy.js';
import { resolveFieldsTemplate } from '../MasterEngines.js';

const safeString = (v) => (v == null ? '' : String(v));

describe('buildHubExtendedCatalogLines', () => {
  it('trả về mảng dòng khi có collection', () => {
    const novel = {
      tabsConfig: [
        {
          id: 'x',
          label: 'Lớn',
          subTabs: [{ id: 'y', viewType: 'collection-track', label: 'Nhỏ', fieldsTemplate: [] }],
        },
      ],
      data: { x: { y: { entities: [{ name: 'A' }] } } },
    };
    const lines = buildHubExtendedCatalogLines(novel, safeString, resolveFieldsTemplate);
    expect(lines.length).toBe(1);
    expect(lines[0]).toContain('x|y');
    expect(lines[0]).toContain('A');
  });
});
