import { describe, it, expect } from 'vitest';
import { buildNovelSearchIndex, searchNovelData, searchNovelIndex } from '../deepSearchCore.js';

describe('deepSearch index cache', () => {
  it('builds searchable rows and finds entity hits', () => {
    const novel = {
      id: 'n1',
      title: 'T1',
      data: {
        lon1: {
          nho1: {
            overview: 'Một vùng đất cổ',
            entities: [
              {
                id: 'e1',
                name: 'Tiểu Minh',
                info: 'Đệ tử mới',
                dynamicData: { f_desc: 'Đến từ Linh Sơn' },
                milestones: [{ chapter: 2, event: 'Gặp sư tôn' }],
              },
            ],
          },
        },
      },
    };
    const rows = buildNovelSearchIndex(novel);
    const res = [];
    searchNovelIndex(rows, 'linh sơn', res);
    expect(res.length).toBeGreaterThan(0);
    expect(res[0].entityId).toBe('e1');
  });

  it('matches Vietnamese d/đ and accents in direct and indexed search', () => {
    const novel = {
      id: 'n-vn',
      title: 'T2',
      data: {
        lon1: {
          nho1: {
            entities: [
              {
                id: 'e-vn',
                name: 'Dao Tu',
                info: '\u0110\u1EC7 t\u1EED canh gi\u1EEF \u0110an \u0110i\u1EC1n',
                dynamicData: {},
                milestones: [],
              },
            ],
          },
        },
      },
    };

    const directResults = [];
    searchNovelData(novel, 'de tu', directResults);

    const indexedResults = [];
    searchNovelIndex(buildNovelSearchIndex(novel), 'de tu', indexedResults);

    expect(directResults.map((item) => item.entityId)).toEqual(['e-vn']);
    expect(indexedResults.map((item) => item.entityId)).toEqual(['e-vn']);
  });

  it('keeps direct search and indexed search in sync for the same novel data', () => {
    const novel = {
      id: 'n-sync',
      title: 'Dong Bo',
      data: {
        lon1: {
          nho1: {
            overview: 'Khong trung',
            entities: [
              {
                id: 'e-sync',
                name: 'Nhan vat',
                info: 'Mo ta ngan',
                dynamicData: { lore: 'Tu khoa Ky Mon' },
                milestones: [{ chapter: 8, event: 'Ky Mon khai tran' }],
              },
            ],
            ghiChu: 'Ky Mon an trong ghi chu',
          },
          nho2: 'Ky Mon xuat hien trong noi dung',
        },
      },
    };

    const directResults = [];
    searchNovelData(novel, '  ky mon  ', directResults);

    const indexedResults = [];
    searchNovelIndex(buildNovelSearchIndex(novel), 'KY MON', indexedResults);

    const normalize = (items) =>
      items.map((item) => `${item.location}|${item.snippet}|${item.entityId || ''}|${item.tabConId || ''}`);

    expect(normalize(directResults)).toEqual(normalize(indexedResults));
    expect(indexedResults).toHaveLength(4);
  });
});
