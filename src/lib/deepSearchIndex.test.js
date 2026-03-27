import { describe, it, expect } from 'vitest';
import { buildNovelSearchIndex, searchNovelIndex } from '../deepSearchCore.js';

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
});
