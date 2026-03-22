import { describe, it, expect } from 'vitest';
import { findEntitiesByHintInNovel, mutateNovelJournalSelections } from './appNhatKyVaGoiThe.js';

describe('appNhatKyVaGoiThe', () => {
  it('findEntitiesByHintInNovel returns scored matches', () => {
    const novelData = {
      tabsConfig: [
        {
          id: 'nhan-vat',
          subTabs: [{ id: 'sub1', viewType: 'collection-track' }],
        },
      ],
      data: {
        'nhan-vat': {
          sub1: {
            entities: [
              { id: 'e1', name: 'Tiểu Minh' },
              { id: 'e2', name: 'Khác' },
            ],
          },
        },
      },
    };
    const r = findEntitiesByHintInNovel(novelData, 'Tiểu Minh');
    expect(r.length).toBe(1);
    expect(r[0].ent.id).toBe('e1');
    expect(r[0].score).toBe(100);
  });

  it('mutateNovelJournalSelections applies new_entity', () => {
    const nov = {
      tabsConfig: [
        {
          id: 'nv',
          subTabs: [{ id: 's1', viewType: 'collection-track' }],
        },
      ],
      data: {},
    };
    const panel = {
      chapter: '1',
      selectedKeys: new Set(['j-0']),
      suggestions: [
        {
          kind: 'new_entity',
          tabLonId: 'nv',
          tabNhoId: 's1',
          suggestedName: 'Thẻ Mới',
          draftRawText: 'hello',
        },
      ],
    };
    const { ok, fails } = mutateNovelJournalSelections(nov, panel);
    expect(ok).toBe(1);
    expect(fails.length).toBe(0);
    expect(nov.data.nv.s1.entities[0].name).toBe('Thẻ Mới');
  });

  it('mutateNovelJournalSelections applies update_profile by fieldId', () => {
    const nov = {
      tabsConfig: [
        {
          id: 'nv',
          subTabs: [
            {
              id: 's1',
              viewType: 'collection-track',
              fieldsTemplate: [{ id: 'f_status', label: 'Cảnh giới' }],
            },
          ],
        },
      ],
      data: {
        nv: {
          s1: {
            entities: [{ id: 'e1', name: 'A', dynamicData: {} }],
          },
        },
      },
    };
    const panel = {
      chapter: '5',
      selectedKeys: new Set(['j-0']),
      suggestions: [
        {
          kind: 'update_profile',
          entityHint: 'A',
          fieldPatches: [{ fieldId: 'f_status', value: 'Kim Đan' }],
        },
      ],
    };
    const { ok, fails } = mutateNovelJournalSelections(nov, panel);
    expect(ok).toBe(1);
    expect(fails.length).toBe(0);
    expect(nov.data.nv.s1.entities[0].dynamicData.f_status).toBe('Kim Đan');
  });
});
