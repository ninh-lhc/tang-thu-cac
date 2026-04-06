import { describe, it, expect } from 'vitest';
import {
  migrateIndex,
  migrateNovel,
  migrateBackup,
  INDEX_DATA_VERSION,
  NOVEL_DATA_VERSION,
} from './dataMigration.js';

describe('dataMigration', () => {
  describe('migrateIndex', () => {
    it('sanitizes empty input', () => {
      const out = migrateIndex({});
      expect(out.metadata).toEqual([]);
      expect(out.config).toEqual([]);
      expect(out.novelStats).toEqual({});
      expect(out.dataVersion).toBe(INDEX_DATA_VERSION);
    });

    it('sanitizes metadata items with defaults', () => {
      const out = migrateIndex({
        metadata: [{ id: 'n1', title: 'Truyện A' }],
        config: [],
        novelStats: {},
      });
      expect(out.metadata.length).toBe(1);
      expect(out.metadata[0].author).toBe('');
      expect(out.metadata[0].status).toBe('Đang đọc');
      expect(out.metadata[0].genres).toEqual([]);
    });

    it('preserves valid data', () => {
      const in_ = {
        metadata: [{ id: 'n1', title: 'A', author: 'X', genres: ['TH'] }],
        config: [{ id: 'lon1', subTabs: [] }],
        novelStats: { n1: { entities: 5 } },
      };
      const out = migrateIndex(in_);
      expect(out.metadata[0].title).toBe('A');
      expect(out.config.length).toBe(1);
      expect(out.novelStats.n1.entities).toBe(5);
    });
  });

  describe('migrateNovel', () => {
    it('sanitizes empty novel', () => {
      const out = migrateNovel({});
      expect(out.id).toBe('');
      expect(out.data).toEqual({});
      expect(out.tabsConfig).toEqual([]);
      expect(out.dataVersion).toBe(NOVEL_DATA_VERSION);
    });

    it('sanitizes tabData and entities', () => {
      const out = migrateNovel({
        id: 'n1',
        title: 'Test',
        data: {
          lon1: {
            sub1: { overview: 'x', entities: [{ id: 'e1', name: 'Nhân vật' }] },
          },
        },
      });
      expect(out.data.lon1.sub1.entities[0].name).toBe('Nhân vật');
      expect(out.data.lon1.sub1.overview).toBe('x');
      expect(out.data.lon1.sub1.entities[0].images).toEqual([]);
    });

    it('normalizes images list in legacy entities', () => {
      const out = migrateNovel({
        id: 'n1',
        data: {
          lon1: {
            sub1: {
              entities: [
                {
                  id: 'e1',
                  name: 'A',
                  images: [' local_image:a.png ', '', null, 'https://x/y.jpg'],
                },
              ],
            },
          },
        },
      });
      expect(out.data.lon1.sub1.entities[0].images).toEqual(['local_image:a.png', 'https://x/y.jpg']);
    });

    it('handles string tabData (legacy)', () => {
      const out = migrateNovel({
        id: 'n1',
        data: { lon1: { sub1: 'chỉ overview' } },
      });
      expect(out.data.lon1.sub1.overview).toBe('chỉ overview');
      expect(out.data.lon1.sub1.entities).toEqual([]);
    });

    it('strips storageLayout (chỉ dùng trên file manifest đĩa)', () => {
      const out = migrateNovel({
        id: 'n1',
        storageLayout: 'sharded',
        data: {},
      });
      expect(out.storageLayout).toBeUndefined();
    });

    it('backfills auto-owner itemEntityId when name resolves uniquely', () => {
      const out = migrateNovel({
        id: 'n1',
        data: {
          nhanVat: {
            chinh: {
              entities: [{ id: 'nv1', name: 'Lạc Nam', milestones: [] }],
            },
          },
          congPhap: {
            cp: {
              entities: [
                { id: 'cp1', name: 'Thiên Địa Công', milestones: [] },
                {
                  id: 'item-holder',
                  name: 'ItemHolder',
                  milestones: [
                    { id: 'ms-auto-1', chapter: 9, event: '[?] Nhận được [[Thiên Địa Công]]', meta: { source: 'auto-owner' } },
                  ],
                },
              ],
            },
          },
        },
      });
      const ms = out.data.congPhap.cp.entities[1].milestones[0];
      expect(ms.meta?.itemEntityId).toBe('cp1');
      expect(ms.meta?.source).toBe('auto-owner');
    });

    it('does not backfill itemEntityId when item name is ambiguous', () => {
      const out = migrateNovel({
        id: 'n1',
        data: {
          a: { x: { entities: [{ id: 'i1', name: 'demo', milestones: [] }] } },
          b: { y: { entities: [{ id: 'i2', name: 'demo', milestones: [] }] } },
          c: {
            z: {
              entities: [
                {
                  id: 'h1',
                  name: 'holder',
                  milestones: [{ id: 'ms-auto-1', chapter: 1, event: '[?] Nhận được [[demo]]', meta: { source: 'auto-owner' } }],
                },
              ],
            },
          },
        },
      });
      const ms = out.data.c.z.entities[0].milestones[0];
      expect(ms.meta?.itemEntityId).toBeUndefined();
    });

    it('refreshes collection list cards (strip legacy markers, rebuild AUTO list)', () => {
      const out = migrateNovel({
        id: 'n1',
        tabsConfig: [
          {
            id: 'he-thong',
            label: 'He thong',
            subTabs: [{ id: 'goi-qua', label: 'Goi', viewType: 'collection-track' }],
          },
        ],
        data: {
          'he-thong': {
            'goi-qua': {
              entities: [
                {
                  id: 'list-1',
                  name: 'Danh sach goi qua',
                  info: 'note\n\n<!-- AUTO_COLLECTION_LIST:START -->\n# Danh mục thẻ (AUTO)\n\n- Tổng số thẻ: 0\n<!-- AUTO_COLLECTION_LIST:END -->',
                  dynamicData: {},
                  milestones: [],
                },
                { id: 'a', name: 'Item A', info: '', dynamicData: { f_cap: 'Huyen cap' }, milestones: [] },
              ],
            },
          },
        },
      });
      const info = String(out.data['he-thong']['goi-qua'].entities[0].info || '');
      expect(info).not.toMatch(/<!--\s*AUTO_COLLECTION_LIST/i);
      expect(info).toContain('note');
      expect(info).toContain('# Danh mục thẻ (AUTO)');
      expect(info).toContain('Item A');
      expect(info).toContain('- Tổng số thẻ: 1');
    });

    it('normalizes duplicated AUTO relation blocks during novel migration', () => {
      const out = migrateNovel({
        id: 'n1',
        data: {
          theLuc: {
            giaToc: {
              entities: [
                {
                  id: 'e1',
                  name: 'Lac Gia',
                  info: [
                    '## Quan hệ bản đồ - thế lực (tự động)',
                    '- Cấp bậc: Tam Cấp thế lực',
                    '- Trực thuộc: [[Cũ A]]',
                    '> (Khối tự động, không cần sửa tay)',
                    '',
                    '## Quan hệ bản đồ - thế lực (tự động)',
                    '- Cấp bậc: Cửu Cấp thế lực',
                    '- Trực thuộc: [[Thiên Hà Châu]]',
                    '> (Khối tự động, không cần sửa tay)',
                  ].join('\n'),
                },
              ],
            },
          },
        },
      });
      const info = String(out.data.theLuc.giaToc.entities[0].info || '');
      expect((info.match(/## Quan hệ bản đồ - thế lực \(tự động\)/g) || []).length).toBe(1);
      expect(info).toContain('[[Thiên Hà Châu]]');
    });
  });

  describe('migrateBackup', () => {
    it('migrates full backup', () => {
      const backup = migrateBackup({
        metadata: [{ id: 'n1', title: 'A' }],
        config: [],
        novelStats: {},
        novels: { n1: { id: 'n1', title: 'A', data: {} } },
      });
      expect(backup.metadata.length).toBe(1);
      expect(backup.novels.n1.dataVersion).toBe(NOVEL_DATA_VERSION);
    });

    it('handles index-only backup', () => {
      const backup = migrateBackup({
        indexOnly: true,
        metadata: [],
        config: [],
        novelStats: {},
      });
      expect(backup.novels).toEqual({});
      expect(backup.indexOnly).toBe(true);
    });
  });
});
