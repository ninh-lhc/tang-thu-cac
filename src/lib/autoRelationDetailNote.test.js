import { describe, expect, it } from 'vitest';
import {
  applyAutoRelationNotesForEntity,
  cleanupAutoRelationLegacyInfoForNovel,
  cleanupAutoRelationLegacyInfoText,
  isAutoRelationScopeLonId,
  parseRelationHierarchyFromStatus,
  upsertAutoRelationDetailNote,
} from './autoRelationDetailNote.js';

describe('autoRelationDetailNote', () => {
  it('parses rank + hierarchy chain from status line', () => {
    const out = parseRelationHierarchyFromStatus('Gia Tộc - Bất Cấp thế lực - Băng Thiên Đại Lục - Việt Long Tinh Cầu');
    expect(out).toEqual({
      categoryLabel: 'Gia Tộc',
      rankLabel: 'Bất Cấp thế lực',
      chain: ['Băng Thiên Đại Lục', 'Việt Long Tinh Cầu'],
    });
  });

  it('supports deeper hierarchy chains', () => {
    const out = parseRelationHierarchyFromStatus('Gia Tộc - Ngũ Cấp thế lực - Thánh Hoàng Vương Triều - Tây Bắc Châu - Nguyên giới');
    expect(out).toEqual({
      categoryLabel: 'Gia Tộc',
      rankLabel: 'Ngũ Cấp thế lực',
      chain: ['Thánh Hoàng Vương Triều', 'Tây Bắc Châu', 'Nguyên giới'],
    });
  });

  it('keeps hyphenated place names as one chain node', () => {
    const out = parseRelationHierarchyFromStatus('Gia Toc - Bat Cap the luc - Tay-Bac Chau');
    expect(out).toEqual({
      categoryLabel: 'Gia Toc',
      rankLabel: 'Bat Cap the luc',
      chain: ['Tay-Bac Chau'],
    });
  });

  it('upserts auto relation block without duplication', () => {
    const s1 = upsertAutoRelationDetailNote(
      'Nội dung tay.',
      'Gia Tộc - Bất Cấp thế lực - Băng Thiên Đại Lục - Việt Long Tinh Cầu'
    );
    const s2 = upsertAutoRelationDetailNote(
      s1,
      'Gia Tộc - Ngũ Cấp thế lực - Thánh Hoàng Vương Triều - Tây Bắc Châu - Nguyên giới'
    );
    expect((s2.match(/## Quan hệ bản đồ - thế lực \(tự động\)/g) || []).length).toBe(1);
    expect(s2).toContain('[[Thánh Hoàng Vương Triều]]');
    expect(s2).toContain('[[Tây Bắc Châu]]');
    expect(s2).toContain('[[Nguyên giới]]');
    expect(s2).toContain('- Loại hình: Gia Tộc');
    expect(s2).toContain('- Cấp bậc: Ngũ Cấp thế lực');
    expect(s2).not.toContain('[[Băng Thiên Đại Lục]]');
    expect(s2).not.toContain('<!--ttc:auto-rel:start-->');
  });

  it('collapses duplicated auto relation blocks from legacy data to one block', () => {
    const legacy = [
      'Nội dung tay.',
      '## Quan hệ bản đồ - thế lực (tự động)',
      '- Cấp bậc: Tam Cấp thế lực',
      '- Trực thuộc: [[Cũ A]]',
      '> (Khối tự động, không cần sửa tay)',
      '',
      '## Quan hệ bản đồ - thế lực (tự động)',
      '- Cấp bậc: Ngũ Cấp thế lực',
      '- Trực thuộc: [[Cũ B]]',
      '> (Khối tự động, không cần sửa tay)',
    ].join('\n');
    const out = upsertAutoRelationDetailNote(
      legacy,
      'Gia Tộc - Cửu Cấp thế lực - Thiên Hà Châu'
    );
    expect((out.match(/## Quan hệ bản đồ - thế lực \(tự động\)/g) || []).length).toBe(1);
    expect(out).toContain('Nội dung tay.');
    expect(out).toContain('[[Thiên Hà Châu]]');
    expect(out).not.toContain('[[Cũ A]]');
    expect(out).not.toContain('[[Cũ B]]');
  });

  it('normalizes mixed current/legacy related blocks to one canonical block', () => {
    const input = [
      'Mô tả tay.',
      '',
      '## Vị trí',
      '## Gia Tộc',
      '- [[Lạc Gia]] (Tam Cấp thế lực - Thiên Hà Châu)',
      '> (Tự động cập nhật từ các thẻ liên quan)',
      '',
      '## Liên kết liên quan (tự động)',
      '- [[Lạc Gia]] (Ngũ Cấp thế lực - Thiên Hà Châu)',
      '- [[Cũ]] (Bát Cấp thế lực - Thiên Hà Châu)',
      '> (Tự động cập nhật từ các thẻ liên quan)',
    ].join('\n');
    const out = cleanupAutoRelationLegacyInfoText(input);
    expect((out.match(/#{1,3}\s*Vị trí/g) || []).length).toBe(1);
    expect((out.match(/Liên kết liên quan \(tự động\)/g) || []).length).toBe(0);
    expect((out.match(/\[\[Lạc Gia\]\]/g) || []).length).toBe(1);
    expect(out).toContain('[[Lạc Gia]] (Ngũ Cấp thế lực - Thiên Hà Châu)');
    expect(out).toContain('[[Cũ]] (Bát Cấp thế lực - Thiên Hà Châu)');
    expect(out).toContain('Mô tả tay.');
  });

  it('enables only the-luc and ban-do scopes', () => {
    expect(isAutoRelationScopeLonId('the-luc')).toBe(true);
    expect(isAutoRelationScopeLonId('ban-do')).toBe(true);
    expect(isAutoRelationScopeLonId('nhan-vat')).toBe(false);
    expect(isAutoRelationScopeLonId('gia-toc', 'Thế Lực')).toBe(true);
    expect(isAutoRelationScopeLonId('ha-gioi-tinh-cau', 'Bản Đồ')).toBe(true);
  });

  it('propagates backlink notes to mapped entities', () => {
    const novel = {
      data: {
        a: {
          b: {
            entities: [
              { id: 'src1', name: 'Thiên Sơn Tiên Cảnh', info: '', dynamicData: {}, milestones: [] },
              { id: 'm1', name: 'Băng Thiên Đại Lục', info: '', dynamicData: {}, milestones: [] },
              { id: 'm2', name: 'Việt Long Tinh Cầu', info: '', dynamicData: {}, milestones: [] },
            ],
          },
        },
      },
    };
    const out = applyAutoRelationNotesForEntity(novel, {
      sourceEntity: novel.data.a.b.entities[0],
      sourceLonId: 'gia-toc',
      sourceParentLabel: 'Thế Lực',
      statusLine: 'Gia Tộc - Cửu Cấp thế lực - Băng Thiên Đại Lục - Việt Long Tinh Cầu',
    });
    expect(out.applied).toBe(true);
    expect(out.touchedTargets).toBe(2);
    expect(novel.data.a.b.entities[0].info).toContain('## Quan hệ bản đồ - thế lực (tự động)');
    expect(novel.data.a.b.entities[1].info).toContain('[[Thiên Sơn Tiên Cảnh]]');
    expect(novel.data.a.b.entities[2].info).toContain('[[Thiên Sơn Tiên Cảnh]]');
    expect(novel.data.a.b.entities[1].info).toContain('## Vị trí');
  });

  it('sorts related entries by rank then name', () => {
    const novel = {
      data: {
        x: {
          y: {
            entities: [
              { id: 'map', name: 'Băng Thiên Đại Lục', info: '', dynamicData: {}, milestones: [] },
              { id: 'a', name: 'Bảo Huyền Đế Quốc', info: '', dynamicData: {}, milestones: [] },
              { id: 'b', name: 'Thiên Sơn Tiên Cảnh', info: '', dynamicData: {}, milestones: [] },
              { id: 'c', name: 'Lạc Gia', info: '', dynamicData: {}, milestones: [] },
            ],
          },
        },
      },
    };
    const mapEntity = novel.data.x.y.entities[0];
    applyAutoRelationNotesForEntity(novel, {
      sourceEntity: novel.data.x.y.entities[1],
      sourceLonId: 'gia-toc',
      sourceParentLabel: 'Thế Lực',
      statusLine: 'Gia Tộc - Cửu Cấp thế lực - Băng Thiên Đại Lục',
    });
    applyAutoRelationNotesForEntity(novel, {
      sourceEntity: novel.data.x.y.entities[2],
      sourceLonId: 'gia-toc',
      sourceParentLabel: 'Thế Lực',
      statusLine: 'Gia Tộc - Cửu Cấp thế lực - Băng Thiên Đại Lục',
    });
    applyAutoRelationNotesForEntity(novel, {
      sourceEntity: novel.data.x.y.entities[3],
      sourceLonId: 'gia-toc',
      sourceParentLabel: 'Thế Lực',
      statusLine: 'Gia Tộc - Bất Cấp thế lực - Băng Thiên Đại Lục',
    });
    const text = mapEntity.info;
    const names = String(text)
      .split(/\r?\n/)
      .filter((line) => line.startsWith('- [['))
      .map((line) => (line.match(/\[\[([^\]]+)\]\]/)?.[1] || ''))
      .filter(Boolean);
    expect(names).toEqual(['Bảo Huyền Đế Quốc', 'Thiên Sơn Tiên Cảnh', 'Lạc Gia']);
    expect(text).toContain('## Gia Tộc');
  });

  it('sorts categories by category name', () => {
    const novel = {
      data: {
        z: {
          q: {
            entities: [
              { id: 'map', name: 'Nguyên Giới', info: '', dynamicData: {}, milestones: [] },
              { id: 'x1', name: 'Thánh Kiếm Viện', info: '', dynamicData: {}, milestones: [] },
              { id: 'x2', name: 'Lạc Gia', info: '', dynamicData: {}, milestones: [] },
            ],
          },
        },
      },
    };
    const mapEntity = novel.data.z.q.entities[0];
    applyAutoRelationNotesForEntity(novel, {
      sourceEntity: novel.data.z.q.entities[1],
      sourceLonId: 'tong-mon',
      sourceParentLabel: 'Thế Lực',
      statusLine: 'Tông Môn - Tam Cấp thế lực - Nguyên Giới',
    });
    applyAutoRelationNotesForEntity(novel, {
      sourceEntity: novel.data.z.q.entities[2],
      sourceLonId: 'gia-toc',
      sourceParentLabel: 'Thế Lực',
      statusLine: 'Gia Tộc - Tam Cấp thế lực - Nguyên Giới',
    });
    const text = mapEntity.info;
    const idxGiaToc = text.indexOf('## Gia Tộc');
    const idxTongMon = text.indexOf('## Tông Môn');
    expect(idxGiaToc).toBeGreaterThan(-1);
    expect(idxTongMon).toBeGreaterThan(-1);
    expect(idxGiaToc).toBeLessThan(idxTongMon);
    expect(text).toContain('## Tông Môn');
    expect(text).toContain('[[Thánh Kiếm Viện]] (Tam Cấp thế lực - Nguyên Giới)');
    expect(text).not.toContain('[[Thánh Kiếm Viện]] (Tông Môn - Tam Cấp thế lực - Nguyên Giới)');
  });

  it('normalizes manual "# Vị trí" heading to one auto block', () => {
    const novel = {
      data: {
        z: {
          q: {
            entities: [
              {
                id: 'map',
                name: 'Nguyên Giới',
                info: '# Vị trí\n- [[Cũ]] (dòng cũ)\n> (Tự động cập nhật từ các thẻ liên quan)',
                dynamicData: {},
                milestones: [],
              },
              { id: 'x2', name: 'Lạc Gia', info: '', dynamicData: {}, milestones: [] },
            ],
          },
        },
      },
    };
    applyAutoRelationNotesForEntity(novel, {
      sourceEntity: novel.data.z.q.entities[1],
      sourceLonId: 'gia-toc',
      sourceParentLabel: 'Thế Lực',
      statusLine: 'Gia Tộc - Tam Cấp thế lực - Nguyên Giới',
    });
    const text = novel.data.z.q.entities[0].info;
    expect((text.match(/#{1,3}\s*Vị trí/g) || []).length).toBe(1);
  });

  it('merges legacy "## Vị trí" block without duplicating title heading', () => {
    const novel = {
      data: {
        z: {
          q: {
            entities: [
              {
                id: 'map',
                name: 'Thiên Hà Châu',
                info: '## Vị trí\n- [[Cũ]] (Bát Cấp thế lực - Thiên Hà Châu)\n> (Tự động cập nhật từ các thẻ liên quan)',
                dynamicData: {},
                milestones: [],
              },
              { id: 'x2', name: 'Lạc Gia', info: '', dynamicData: {}, milestones: [] },
              { id: 'x3', name: 'Cũ', info: '', dynamicData: {}, milestones: [] },
            ],
          },
        },
      },
    };
    applyAutoRelationNotesForEntity(novel, {
      sourceEntity: novel.data.z.q.entities[1],
      sourceLonId: 'gia-toc',
      sourceParentLabel: 'Thế Lực',
      statusLine: 'Gia Tộc - Cửu Cấp thế lực - Thiên Hà Châu',
    });
    const text = novel.data.z.q.entities[0].info;
    expect((text.match(/#{1,3}\s*Vị trí/g) || []).length).toBe(1);
    expect(text).toContain('## Gia Tộc');
    expect(text).toContain('## Khác');
  });

  it('merges duplicated current+legacy related blocks into one clean block', () => {
    const novel = {
      data: {
        z: {
          q: {
            entities: [
              {
                id: 'map',
                name: 'Thiên Hà Châu',
                info: [
                  'Mô tả tay.',
                  '',
                  '## Vị trí',
                  '## Gia Tộc',
                  '- [[Lạc Gia]] (Tam Cấp thế lực - Thiên Hà Châu)',
                  '> (Tự động cập nhật từ các thẻ liên quan)',
                  '',
                  '## Liên kết liên quan (tự động)',
                  '- [[Lạc Gia]] (Ngũ Cấp thế lực - Thiên Hà Châu)',
                  '> (Tự động cập nhật từ các thẻ liên quan)',
                ].join('\n'),
                dynamicData: {},
                milestones: [],
              },
              { id: 'x2', name: 'Lạc Gia', info: '', dynamicData: {}, milestones: [] },
            ],
          },
        },
      },
    };
    applyAutoRelationNotesForEntity(novel, {
      sourceEntity: novel.data.z.q.entities[1],
      sourceLonId: 'gia-toc',
      sourceParentLabel: 'Thế Lực',
      statusLine: 'Gia Tộc - Cửu Cấp thế lực - Thiên Hà Châu',
    });
    const text = novel.data.z.q.entities[0].info;
    expect((text.match(/#{1,3}\s*Vị trí/g) || []).length).toBe(1);
    expect((text.match(/Liên kết liên quan \(tự động\)/g) || []).length).toBe(0);
    expect((text.match(/\[\[Lạc Gia\]\]/g) || []).length).toBe(1);
    expect(text).toContain('[[Lạc Gia]] (Cửu Cấp thế lực - Thiên Hà Châu)');
    expect(text).toContain('Mô tả tay.');
  });

  it('cleanup helper scans whole novel and returns touched count', () => {
    const novel = {
      data: {
        a: {
          b: {
            entities: [
              {
                id: 'e1',
                name: 'Lạc Gia',
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
              {
                id: 'e2',
                name: 'Thiên Hà Châu',
                info: '',
              },
            ],
          },
        },
      },
    };
    const touched = cleanupAutoRelationLegacyInfoForNovel(novel);
    expect(touched).toBe(1);
    expect((String(novel.data.a.b.entities[0].info).match(/## Quan hệ bản đồ - thế lực \(tự động\)/g) || []).length).toBe(1);
    expect(String(novel.data.a.b.entities[0].info)).toContain('[[Thiên Hà Châu]]');
  });

  it('stress: repeated auto relation updates do not duplicate backlink entries', () => {
    const location = { id: 'loc1', name: 'Thiên Hà Châu', info: '', dynamicData: {}, milestones: [] };
    const sources = Array.from({ length: 7 }, (_, i) => ({
      id: `src-${i}`,
      name: `Thế Lực ${i}`,
      info: '',
      dynamicData: {},
      milestones: [],
    }));
    const novel = {
      data: {
        scope: {
          main: {
            entities: [location, ...sources],
          },
        },
      },
    };

    const rankTokens = ['Bát Cấp thế lực', 'Cửu Cấp thế lực', 'Ngũ Cấp thế lực'];
    const categories = ['Gia Tộc', 'Tông Môn', 'Thương Minh'];
    for (let i = 0; i < 210; i += 1) {
      const src = sources[i % sources.length];
      const category = categories[i % categories.length];
      const rank = rankTokens[i % rankTokens.length];
      const out = applyAutoRelationNotesForEntity(novel, {
        sourceEntity: src,
        sourceLonId: 'the-luc',
        sourceParentLabel: 'Thế Lực',
        statusLine: `${category} - ${rank} - Thiên Hà Châu`,
      });
      expect(out.applied).toBe(true);
    }

    const text = location.info;
    expect((text.match(/#{1,3}\s*Vị trí/g) || []).length).toBe(1);

    const names = String(text)
      .split(/\r?\n/)
      .filter((line) => /^\s*-\s*\[\[[^\]]+\]\]\s*\(/.test(line))
      .map((line) => line.match(/\[\[([^\]]+)\]\]/)?.[1] || '')
      .filter(Boolean);

    const uniqueNames = new Set(names);
    expect(uniqueNames.size).toBe(sources.length);
    expect(names.length).toBe(uniqueNames.size);

    // Mỗi source cũng chỉ có đúng 1 khối AUTO relation trong info của chính nó.
    sources.forEach((src) => {
      expect((String(src.info).match(/## Quan hệ bản đồ - thế lực \(tự động\)/g) || []).length).toBe(1);
    });
  });
});
