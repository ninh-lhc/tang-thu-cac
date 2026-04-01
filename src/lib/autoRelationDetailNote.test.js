import { describe, expect, it } from 'vitest';
import {
  applyAutoRelationNotesForEntity,
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
});
