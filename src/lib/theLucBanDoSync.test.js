import { describe, expect, it } from 'vitest';
import {
  buildForceRowsForLocation,
  isForceCollectionScope,
  syncAllTheLucMapAutoBlocks,
  syncAllTheLucMapAutoBlocksDetailed,
  syncTheLucMapAutoBlocks,
} from './theLucBanDoSync.js';
import { AUTO_SYNC_ENGINE_FORCE_MAP } from './autoSyncEntityPrefs.js';
import { AUTO_SYNC_ROLE_OFF } from './tabAutoSyncRole.js';

describe('theLucBanDoSync', () => {
  it('sorts force rows by type > name > rank > path', () => {
    const rows = buildForceRowsForLocation([
      { name: 'B', meta: { orgType: 'Gia Tộc', rankText: 'Bát cấp', rankNum: 8, tailPath: 'A' } },
      { name: 'A', meta: { orgType: 'Gia Tộc', rankText: 'Bát cấp', rankNum: 8, tailPath: 'B' } },
      { name: 'C', meta: { orgType: 'Tông Môn', rankText: 'Tam cấp', rankNum: 3, tailPath: 'A' } },
      { name: 'D', meta: { orgType: 'Gia Tộc', rankText: 'Cửu cấp', rankNum: 9, tailPath: 'A' } },
    ]);
    expect(rows.map((x) => x.name)).toEqual(['A', 'B', 'D', 'C']);
  });

  it('keeps hyphenated location token as one map entity', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'The Luc', subTabs: [{ id: 'to-chuc', label: 'To Chuc', viewType: 'collection-track' }] },
        { id: 'tai-nguyen', label: 'Tai Nguyen', subTabs: [{ id: 'dia-danh', label: 'Ban do / Bi canh', viewType: 'collection-track' }] },
      ],
      data: {
        'the-luc': {
          'to-chuc': {
            overview: '',
            entities: [
              {
                id: 'tl1',
                name: 'Lac Gia',
                dynamicData: { f_status: 'Gia Toc - Bat Cap the luc - Tay-Bac Chau' },
                info: '',
              },
            ],
          },
        },
      },
    };

    const ok = syncTheLucMapAutoBlocks(nov, {
      sourceLonId: 'the-luc',
      sourceNhoId: 'to-chuc',
      entityId: 'tl1',
    });
    expect(ok).toBe(true);
    const mapEntities = nov.data['tai-nguyen']['dia-danh'].entities;
    expect(mapEntities.length).toBe(1);
    expect(mapEntities[0].name).toBe('Tay-Bac Chau');
  });

  it('writes force AUTO only into the explicit map target tab when configured', () => {
    const nov = {
      tabsConfig: [
        {
          id: 'the-luc',
          label: 'The Luc',
          subTabs: [
            {
              id: 'to-chuc',
              label: 'To Chuc',
              viewType: 'collection-track',
              autoSyncRole: 'the-luc',
              autoSyncTargetPaths: ['tai-nguyen::bi-canh'],
            },
          ],
        },
        {
          id: 'tai-nguyen',
          label: 'Tai Nguyen',
          subTabs: [
            { id: 'dia-danh', label: 'Ban do', viewType: 'collection-track', autoSyncRole: 'ban-do' },
            { id: 'bi-canh', label: 'Bi Canh', viewType: 'collection-track', autoSyncRole: 'ban-do' },
          ],
        },
      ],
      data: {
        'the-luc': {
          'to-chuc': {
            overview: '',
            entities: [
              {
                id: 'tl1',
                name: 'Lac Gia',
                dynamicData: { f_status: 'Gia Toc - Bat Cap the luc - Huyen Thien Gioi' },
                info: '',
              },
            ],
          },
        },
        'tai-nguyen': {
          'dia-danh': { overview: '', entities: [] },
          'bi-canh': { overview: '', entities: [] },
        },
      },
    };

    const ok = syncAllTheLucMapAutoBlocksDetailed(nov, { sourceLonId: 'the-luc' });
    expect(ok.changed).toBe(true);
    expect(nov.data['tai-nguyen']['dia-danh'].entities).toHaveLength(0);
    expect(nov.data['tai-nguyen']['bi-canh'].entities.map((entity) => entity.name)).toContain('Huyen Thien Gioi');
  });

  it('parses accented "Tám" rank higher than "Tam" rank', () => {
    const rankEight = 'T\u00E1m C\u1EA5p th\u1EBF l\u1EF1c';
    const rankThree = 'Tam C\u1EA5p th\u1EBF l\u1EF1c';
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'The Luc', subTabs: [{ id: 'to-chuc', label: 'To Chuc', viewType: 'collection-track' }] },
        { id: 'tai-nguyen', label: 'Tai Nguyen', subTabs: [{ id: 'dia-danh', label: 'Ban do', viewType: 'collection-track' }] },
      ],
      data: {
        'the-luc': {
          'to-chuc': {
            overview: '',
            entities: [
              { id: 'e8', name: 'ZZZ', dynamicData: { f_status: `Tong Mon - ${rankEight} - Thien Ha Chau` }, info: '' },
              { id: 'e3', name: 'AAA', dynamicData: { f_status: `Tong Mon - ${rankThree} - Thien Ha Chau` }, info: '' },
            ],
          },
        },
        'tai-nguyen': {
          'dia-danh': {
            overview: '',
            entities: [{ id: 'm1', name: 'Thien Ha Chau', info: '' }],
          },
        },
      },
    };

    const ok = syncAllTheLucMapAutoBlocks(nov, { sourceLonId: 'the-luc' });
    expect(ok).toBe(true);
    const mapInfo = nov.data['tai-nguyen']['dia-danh'].entities[0].info;
    const bulletLine = String(mapInfo)
      .split(/\r?\n/)
      .find((line) => line.startsWith('- [['));
    expect(bulletLine).toBeTruthy();
    expect(bulletLine).toContain('[[AAA]]');
  });

  it('orders advanced Vuong Ton De force ranks by strength inside map auto blocks', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'The Luc', subTabs: [{ id: 'tong-mon', label: 'Tong Mon', viewType: 'collection-track' }] },
        { id: 'tai-nguyen', label: 'Tai Nguyen', subTabs: [{ id: 'dia-danh', label: 'Ban do', viewType: 'collection-track' }] },
      ],
      data: {
        'the-luc': {
          'tong-mon': {
            overview: '',
            entities: [
              {
                id: 'f-1',
                name: 'A Lang Dien',
                dynamicData: { f_status: 'Địa Tôn cấp thế lực', f_dia_ban: 'Hoang Thu gioi' },
                info: '',
              },
              {
                id: 'f-2',
                name: 'Z Bach Cung',
                dynamicData: { f_status: 'Thiên Tôn cấp thế lực', f_dia_ban: 'Hoang Thu gioi' },
                info: '',
              },
            ],
          },
        },
        'tai-nguyen': {
          'dia-danh': {
            overview: '',
            entities: [{ id: 'm1', name: 'Hoang Thu gioi', info: '' }],
          },
        },
      },
    };

    const ok = syncAllTheLucMapAutoBlocks(nov, { sourceLonId: 'the-luc' });
    expect(ok).toBe(true);
    const mapInfo = String(nov.data['tai-nguyen']['dia-danh'].entities[0].info || '');
    const idxThienTon = mapInfo.indexOf('[[Z Bach Cung]] - Thiên Tôn cấp thế lực');
    const idxDiaTon = mapInfo.indexOf('[[A Lang Dien]] - Địa Tôn cấp thế lực');
    expect(idxThienTon).toBeGreaterThan(-1);
    expect(idxDiaTon).toBeGreaterThan(idxThienTon);
  });

  it('syncs force info and map location entities', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'Thế Lực', subTabs: [{ id: 'gia-toc', label: 'Gia tộc', viewType: 'collection-track' }] },
        { id: 'tai-nguyen', label: 'Tài Nguyên', subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }] },
      ],
      data: {
        'the-luc': {
          'gia-toc': {
            overview: '',
            entities: [
              {
                id: 'tl1',
                name: 'Lạc Gia',
                dynamicData: { f_status: 'Gia Tộc - Bát Cấp Thế Lực - Băng Thiên Đại Lục - Việt Long Tinh Cầu' },
                info: '',
              },
            ],
          },
        },
      },
    };
    const ok = syncTheLucMapAutoBlocks(nov, {
      sourceLonId: 'the-luc',
      sourceNhoId: 'gia-toc',
      entityId: 'tl1',
    });
    expect(ok).toBe(true);
    const ent = nov.data['the-luc']['gia-toc'].entities[0];
    expect(ent.info).toContain('## Đồng bộ Thế Lực (AUTO)');
    expect(ent.info).toContain('Vị Trí:');
    expect(ent.info).toContain('Đại Lục');
    expect(ent.info).toContain('Tinh Cầu');
    const mapEntities = nov.data['tai-nguyen']['dia-danh'].entities;
    expect(mapEntities.length).toBe(2);
    const continent = mapEntities.find((m) => m.name === 'Băng Thiên Đại Lục');
    const planet = mapEntities.find((m) => m.name === 'Việt Long Tinh Cầu');
    const continentInfo = String(continent?.info || '');
    const planetInfo = String(planet?.info || '');
    expect(continent).toBeTruthy();
    expect(continentInfo).toContain('# Vị trí');
    expect(continentInfo).toContain('# [[Băng Thiên Đại Lục]]');
    expect(continentInfo).toContain('## Gia Tộc');
    expect(continentInfo).toContain('- [[Lạc Gia]] - Bát Cấp Thế Lực');
    expect(continentInfo).not.toContain('1. [[Lạc Gia]] - Bát Cấp Thế Lực - Băng Thiên Đại Lục - Việt Long Tinh Cầu');
    expect(planet).toBeTruthy();
    expect(planetInfo).toContain('## Vị trí');
    expect(planetInfo).toContain('### Gia Tộc');
    expect(planetInfo).toContain('1. [[Lạc Gia]] - Bát Cấp Thế Lực - Băng Thiên Đại Lục > Việt Long Tinh Cầu');
  });

  it('includes explicit rank-system field in force AUTO block and map list lines', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'Thế Lực', subTabs: [{ id: 'tong-mon', label: 'Tông Môn', viewType: 'collection-track' }] },
        { id: 'tai-nguyen', label: 'Tài Nguyên', subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }] },
      ],
      data: {
        'the-luc': {
          'tong-mon': {
            overview: '',
            entities: [
              {
                id: 'tl1',
                name: 'Bá Việt Tông',
                dynamicData: {
                  f_loai_to_chuc: 'Tông Môn',
                  f_he_cap_the_luc: 'Nguyên giới',
                  f_status: 'Thiên Đế cấp thế lực',
                  f_dia_ban: 'Tây Châu - Nguyên Giới',
                },
                info: '',
              },
            ],
          },
        },
      },
    };

    expect(syncAllTheLucMapAutoBlocks(nov, { sourceLonId: 'the-luc' })).toBe(true);
    const forceInfo = String(nov.data['the-luc']['tong-mon'].entities[0].info || '');
    expect(forceInfo).toContain('Hệ Cấp Bậc: Nguyên giới');
    const mapEntity = nov.data['tai-nguyen']['dia-danh'].entities.find((item) => item.name === 'Tây Châu');
    expect(String(mapEntity?.info || '')).toContain('[[Bá Việt Tông]] - Thiên Đế cấp thế lực (Nguyên giới)');
  });

  it('rebuilds map auto blocks when location changes or force deleted', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'Thế Lực', subTabs: [{ id: 'gia-toc', label: 'Gia tộc', viewType: 'collection-track' }] },
        { id: 'tai-nguyen', label: 'Tài Nguyên', subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }] },
      ],
      data: {
        'the-luc': {
          'gia-toc': {
            overview: '',
            entities: [
              {
                id: 'tl1',
                name: 'Lạc Gia',
                dynamicData: { f_status: 'Gia Tộc - Bát Cấp Thế Lực - Băng Thiên Đại Lục - Việt Long Tinh Cầu' },
                info: '',
              },
            ],
          },
        },
      },
    };

    syncTheLucMapAutoBlocks(nov, { sourceLonId: 'the-luc', sourceNhoId: 'gia-toc', entityId: 'tl1' });
    let mapEntities = nov.data['tai-nguyen']['dia-danh'].entities;
    const oldLoc = mapEntities.find((x) => x.name === 'Việt Long Tinh Cầu');
    expect(oldLoc?.info || '').toContain('[[Lạc Gia]]');

    nov.data['the-luc']['gia-toc'].entities[0].dynamicData.f_status = 'Gia Tộc - Bát Cấp Thế Lực - Băng Thiên Đại Lục - Huyền Minh Đại Lục';
    syncAllTheLucMapAutoBlocks(nov, { sourceLonId: 'the-luc' });
    mapEntities = nov.data['tai-nguyen']['dia-danh'].entities;
    const staleLoc = mapEntities.find((x) => x.name === 'Việt Long Tinh Cầu');
    const newLoc = mapEntities.find((x) => x.name === 'Huyền Minh Đại Lục');
    expect(staleLoc?.info || '').not.toContain('[[Lạc Gia]]');
    expect(newLoc?.info || '').toContain('[[Lạc Gia]]');

    nov.data['the-luc']['gia-toc'].entities = [];
    syncAllTheLucMapAutoBlocks(nov, { sourceLonId: 'the-luc' });
    mapEntities.forEach((m) => {
      expect(String(m.info || '')).not.toContain('## Thế lực theo vị trí (AUTO)');
    });
  });

  it('uses contextual wiki labels for duplicate force names inside map auto blocks', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'Thế Lực', subTabs: [{ id: 'gia-toc', label: 'Gia tộc', viewType: 'collection-track' }] },
        { id: 'tai-nguyen', label: 'Tài Nguyên', subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }] },
      ],
      data: {
        'the-luc': {
          'gia-toc': {
            overview: '',
            entities: [
              {
                id: 'tl-man-hoang',
                name: 'Lạc Gia',
                dynamicData: { f_status: 'Gia Tộc - Bát Cấp Thế Lực - Man Hoang Đại Lục - Việt Long Tinh Cầu' },
                info: '',
              },
              {
                id: 'tl-bang-thien',
                name: 'Lạc Gia',
                dynamicData: { f_status: 'Gia Tộc - Bát Cấp Thế Lực - Băng Thiên Đại Lục - Việt Long Tinh Cầu' },
                info: '',
              },
            ],
          },
        },
      },
    };

    const ok = syncAllTheLucMapAutoBlocks(nov, { sourceLonId: 'the-luc' });
    expect(ok).toBe(true);

    const mapEntities = nov.data['tai-nguyen']['dia-danh'].entities;
    const manHoang = mapEntities.find((m) => m.name === 'Man Hoang Đại Lục');
    const bangThien = mapEntities.find((m) => m.name === 'Băng Thiên Đại Lục');

    expect(String(manHoang?.info || '')).toContain('[[Lạc Gia - Man Hoang Đại Lục]]');
    expect(String(bangThien?.info || '')).toContain('[[Lạc Gia - Băng Thiên Đại Lục]]');
  });

  it('preserves manual info while replacing AUTO blocks on resync', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'Thế Lực', subTabs: [{ id: 'gia-toc', label: 'Gia tộc', viewType: 'collection-track' }] },
        { id: 'tai-nguyen', label: 'Tài Nguyên', subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }] },
      ],
      data: {
        'the-luc': {
          'gia-toc': {
            overview: '',
            entities: [
              {
                id: 'tl1',
                name: 'Lạc Gia',
                dynamicData: { f_status: 'Gia Tộc - Bát Cấp Thế Lực - Băng Thiên Đại Lục - Việt Long Tinh Cầu' },
                info: 'Ghi chú tay đầu',
              },
            ],
          },
        },
        'tai-nguyen': {
          'dia-danh': {
            overview: '',
            entities: [
              {
                id: 'm1',
                name: 'Băng Thiên Đại Lục',
                info: 'Mô tả tay địa danh\n\n<!-- AUTO_MAP_THE_LUC_LIST:START -->\nold auto\n<!-- AUTO_MAP_THE_LUC_LIST:END -->',
              },
            ],
          },
        },
      },
    };

    const ok = syncTheLucMapAutoBlocks(nov, { sourceLonId: 'the-luc', sourceNhoId: 'gia-toc', entityId: 'tl1' });
    expect(ok).toBe(true);

    const forceInfo = nov.data['the-luc']['gia-toc'].entities[0].info;
    expect(forceInfo).toContain('Ghi chú tay đầu');
    expect(forceInfo).toContain('## Đồng bộ Thế Lực (AUTO)');

    const mapEnt = nov.data['tai-nguyen']['dia-danh'].entities.find((x) => x.name === 'Băng Thiên Đại Lục');
    expect(mapEnt.info).toContain('Mô tả tay địa danh');
    expect(mapEnt.info).toContain('## Thế lực theo vị trí (AUTO)');
    expect(mapEnt.info).not.toContain('old auto');
  });

  it('syncs and creates location cards across all map subtabs under Ban Do', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'The Luc', subTabs: [{ id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track' }] },
        {
          id: 'ban-do',
          label: 'Ban Do',
          subTabs: [
            { id: 'ha-gioi-tinh-cau', label: 'Ha Gioi Tinh Cau / Tieu The Gioi', viewType: 'collection-track' },
            { id: 'tien-ma-gioi', label: 'Tien Ma Gioi / Tieu Vu Tru', viewType: 'collection-track' },
          ],
        },
      ],
      data: {
        'the-luc': {
          'gia-toc': {
            overview: '',
            entities: [
              {
                id: 'tl-huyet',
                name: 'Huyet Linh Tong',
                dynamicData: { f_status: 'Tong Mon - Bat Cap the luc - Huyet Gioi - Huyet Hoang Dia' },
                info: '',
              },
            ],
          },
        },
        'ban-do': {
          'ha-gioi-tinh-cau': {
            overview: '',
            entities: [{ id: 'm-1', name: 'Da Lang Tien Tinh', info: '' }],
          },
          'tien-ma-gioi': {
            overview: '',
            entities: [{ id: 'm-2', name: 'Huyet Gioi', info: 'manual map note' }],
          },
        },
      },
    };

    const ok = syncAllTheLucMapAutoBlocks(nov, { sourceLonId: 'the-luc' });
    expect(ok).toBe(true);

    const tienMaMap = nov.data['ban-do']['tien-ma-gioi'].entities;
    const haGioiMap = nov.data['ban-do']['ha-gioi-tinh-cau'].entities;
    const huyetGioi = tienMaMap.find((x) => x.name === 'Huyet Gioi');
    const huyetHoangDia = tienMaMap.find((x) => x.name === 'Huyet Hoang Dia');
    const wrongTabCard = haGioiMap.find((x) => x.name === 'Huyet Hoang Dia');

    expect(String(huyetGioi?.info || '')).toContain('manual map note');
    expect(String(huyetGioi?.info || '')).toContain('## Thế lực theo vị trí (AUTO)');
    expect(String(huyetGioi?.info || '')).toContain('[[Huyet Linh Tong]]');
    expect(huyetHoangDia).toBeTruthy();
    expect(String(huyetHoangDia?.info || '')).toContain('## Thế lực theo vị trí (AUTO)');
    expect(String(huyetHoangDia?.info || '')).toContain('[[Huyet Linh Tong]]');
    expect(wrongTabCard).toBeFalsy();
  });

  it('supports split force inputs (rank + location fields) for auto sync', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'The Luc', subTabs: [{ id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track' }] },
        {
          id: 'ban-do',
          label: 'Ban Do',
          subTabs: [{ id: 'ha-gioi', label: 'Ha Gioi', viewType: 'collection-track' }],
        },
      ],
      data: {
        'the-luc': {
          'gia-toc': {
            overview: '',
            entities: [
              {
                id: 'tl-01',
                name: 'Huyet Linh Tong',
                dynamicData: {
                  f_status: 'Bat Cap the luc',
                  f_dia_ban: 'Huyet Gioi - Huyet Hoang Dia',
                },
                info: '',
              },
            ],
          },
        },
      },
    };

    const ok = syncAllTheLucMapAutoBlocks(nov, { sourceLonId: 'the-luc' });
    expect(ok).toBe(true);
    const mapEntities = nov.data['ban-do']['ha-gioi'].entities;
    const huyetGioi = mapEntities.find((x) => x.name === 'Huyet Gioi');
    const huyetHoangDia = mapEntities.find((x) => x.name === 'Huyet Hoang Dia');
    expect(huyetGioi).toBeTruthy();
    expect(huyetHoangDia).toBeTruthy();
    expect(String(huyetGioi?.info || '')).toContain('## Thế lực theo vị trí (AUTO)');
    expect(String(huyetGioi?.info || '')).toContain('[[Huyet Linh Tong]]');
    expect(String(huyetHoangDia?.info || '')).toContain('## Thế lực theo vị trí (AUTO)');
  });

  it('detects force scope by parent label even when tab id is custom', () => {
    expect(
      isForceCollectionScope({
        activeTabLon: 'luc-luong-custom',
        activeTabNho: 'gia-toc',
        currentTabConfig: { id: 'gia-toc', viewType: 'collection-track' },
        parentLabel: 'The Luc',
      })
    ).toBe(true);

    const nov = {
      tabsConfig: [
        { id: 'luc-luong-custom', label: 'The Luc', subTabs: [{ id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track' }] },
        { id: 'ban-do', label: 'Ban Do', subTabs: [{ id: 'ha-gioi', label: 'Ha Gioi', viewType: 'collection-track' }] },
      ],
      data: {
        'luc-luong-custom': {
          'gia-toc': {
            overview: '',
            entities: [{ id: 'tl1', name: 'Huyet Linh Tong', dynamicData: { f_status: 'Tong Mon - Bat Cap the luc - Huyet Gioi' }, info: '' }],
          },
        },
      },
    };

    const result = syncAllTheLucMapAutoBlocksDetailed(nov);
    expect(result.applied).toBe(true);
    expect(nov.data['ban-do']['ha-gioi'].entities.some((entity) => entity.name === 'Huyet Gioi')).toBe(true);
    expect(String(nov.data['luc-luong-custom']['gia-toc'].entities[0].info || '')).toContain('## Đồng bộ Thế Lực (AUTO)');
  });

  it('warns and skips when a map location exists in multiple tabs', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'The Luc', subTabs: [{ id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track' }] },
        {
          id: 'ban-do',
          label: 'Ban Do',
          subTabs: [
            { id: 'ha-gioi', label: 'Ha Gioi', viewType: 'collection-track' },
            { id: 'tien-gioi', label: 'Tien Gioi', viewType: 'collection-track' },
          ],
        },
      ],
      data: {
        'the-luc': {
          'gia-toc': {
            overview: '',
            entities: [{ id: 'tl1', name: 'Huyet Linh Tong', dynamicData: { f_status: 'Tong Mon - Bat Cap the luc - Huyet Gioi' }, info: '' }],
          },
        },
        'ban-do': {
          'ha-gioi': { overview: '', entities: [{ id: 'm1', name: 'Huyet Gioi', info: 'manual a' }] },
          'tien-gioi': { overview: '', entities: [{ id: 'm2', name: 'Huyet Gioi', info: 'manual b' }] },
        },
      },
    };

    const result = syncAllTheLucMapAutoBlocksDetailed(nov, { sourceLonId: 'the-luc' });
    expect(result.warnings.some((warning) => warning.type === 'ambiguous_existing_location')).toBe(true);
    expect(String(nov.data['ban-do']['ha-gioi'].entities[0].info || '')).not.toContain('## Thế lực theo vị trí (AUTO)');
    expect(String(nov.data['ban-do']['tien-gioi'].entities[0].info || '')).not.toContain('## Thế lực theo vị trí (AUTO)');
  });

  it('warns and skips auto-create when multiple map tabs could receive the new location', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'The Luc', subTabs: [{ id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track' }] },
        {
          id: 'ban-do',
          label: 'Ban Do',
          subTabs: [
            { id: 'ha-gioi', label: 'Ha Gioi', viewType: 'collection-track' },
            { id: 'tien-gioi', label: 'Tien Gioi', viewType: 'collection-track' },
          ],
        },
      ],
      data: {
        'the-luc': {
          'gia-toc': {
            overview: '',
            entities: [{ id: 'tl1', name: 'Huyet Linh Tong', dynamicData: { f_status: 'Tong Mon - Bat Cap the luc - Huyet Hoang Dia' }, info: '' }],
          },
        },
      },
    };

    const result = syncAllTheLucMapAutoBlocksDetailed(nov, { sourceLonId: 'the-luc' });
    expect(result.warnings.some((warning) => warning.type === 'ambiguous_target_tab')).toBe(true);
    expect((nov.data['ban-do']['ha-gioi']?.entities || []).some((entity) => entity.name === 'Huyet Hoang Dia')).toBe(false);
    expect((nov.data['ban-do']['tien-gioi']?.entities || []).some((entity) => entity.name === 'Huyet Hoang Dia')).toBe(false);
  });

  it('returns false and does not mutate when force status format is invalid', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'Thế Lực', subTabs: [{ id: 'gia-toc', label: 'Gia tộc', viewType: 'collection-track' }] },
        { id: 'tai-nguyen', label: 'Tài Nguyên', subTabs: [{ id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track' }] },
      ],
      data: {
        'the-luc': {
          'gia-toc': {
            overview: '',
            entities: [{ id: 'tl1', name: 'Lạc Gia', dynamicData: { f_status: 'thiếu cấu trúc' }, info: 'manual force' }],
          },
        },
        'tai-nguyen': {
          'dia-danh': { overview: '', entities: [{ id: 'm1', name: 'Băng Thiên Đại Lục', info: 'manual map' }] },
        },
      },
    };

    const before = JSON.stringify(nov);
    const ok = syncTheLucMapAutoBlocks(nov, { sourceLonId: 'the-luc', sourceNhoId: 'gia-toc', entityId: 'tl1' });
    const after = JSON.stringify(nov);

    expect(ok).toBe(false);
    expect(after).toBe(before);
  });
  it('cleans stale force-map AUTO blocks when both roles are turned off', () => {
    const nov = {
      tabsConfig: [
        {
          id: 'the-luc',
          label: 'The Luc',
          subTabs: [{ id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track' }],
        },
        {
          id: 'ban-do',
          label: 'Ban Do',
          subTabs: [{ id: 'ha-gioi', label: 'Ha Gioi', viewType: 'collection-track' }],
        },
      ],
      data: {
        'the-luc': {
          'gia-toc': {
            overview: '',
            entities: [{ id: 'tl1', name: 'Huyet Linh Tong', dynamicData: { f_status: 'Tong Mon - Bat Cap the luc - Huyet Gioi' }, info: '' }],
          },
        },
        'ban-do': {
          'ha-gioi': { overview: '', entities: [{ id: 'm1', name: 'Huyet Gioi', info: 'Mo ta tay dia danh' }] },
        },
      },
    };

    expect(syncAllTheLucMapAutoBlocksDetailed(nov).applied).toBe(true);
    nov.tabsConfig[0].subTabs[0].autoSyncRole = AUTO_SYNC_ROLE_OFF;
    nov.tabsConfig[1].subTabs[0].autoSyncRole = AUTO_SYNC_ROLE_OFF;

    const result = syncAllTheLucMapAutoBlocksDetailed(nov);
    expect(result.changed).toBe(true);
    expect(result.applied).toBe(false);
    expect(String(nov.data['the-luc']['gia-toc'].entities[0].info || '')).not.toContain('## Đồng bộ Thế Lực (AUTO)');
    expect(String(nov.data['ban-do']['ha-gioi'].entities[0].info || '')).toContain('Mo ta tay dia danh');
    expect(String(nov.data['ban-do']['ha-gioi'].entities[0].info || '')).not.toContain('## Thế lực theo vị trí (AUTO)');
  });

  it('preserves locked map targets while new force rows are added', () => {
    const nov = {
      tabsConfig: [
        { id: 'the-luc', label: 'The Luc', subTabs: [{ id: 'gia-toc', label: 'Gia Toc', viewType: 'collection-track' }] },
        { id: 'ban-do', label: 'Ban Do', subTabs: [{ id: 'ha-gioi', label: 'Ha Gioi', viewType: 'collection-track' }] },
      ],
      data: {
        'the-luc': {
          'gia-toc': {
            overview: '',
            entities: [
              { id: 'tl1', name: 'Huyet Linh Tong', dynamicData: { f_status: 'Tong Mon - Bat Cap the luc - Huyet Gioi' }, info: '' },
            ],
          },
        },
        'ban-do': {
          'ha-gioi': { overview: '', entities: [{ id: 'm1', name: 'Huyet Gioi', info: 'manual map' }] },
        },
      },
    };

    expect(syncAllTheLucMapAutoBlocksDetailed(nov).applied).toBe(true);
    const lockedTarget = nov.data['ban-do']['ha-gioi'].entities[0];
    const lockedSnapshot = String(lockedTarget.info || '');
    lockedTarget.autoSyncPrefs = { lockedEngines: [AUTO_SYNC_ENGINE_FORCE_MAP] };
    nov.data['the-luc']['gia-toc'].entities.push({
      id: 'tl2',
      name: 'Huyet Ma Cung',
      dynamicData: { f_status: 'Tong Mon - Cuu Cap the luc - Huyet Gioi' },
      info: '',
    });

    const result = syncAllTheLucMapAutoBlocksDetailed(nov);
    expect(result.changed).toBe(true);
    expect(String(lockedTarget.info || '')).toBe(lockedSnapshot);
    expect(String(nov.data['the-luc']['gia-toc'].entities[1].info || '')).toContain('## Đồng bộ Thế Lực (AUTO)');
  });
});

