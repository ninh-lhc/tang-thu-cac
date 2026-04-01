// ==========================================
// autoRiskFuzz.test.js
// Fuzz/property tests cho cụm AUTO (wiki-link, owner-milestone, relation-note).
// Mục tiêu: bắt lỗi no-throw + regression dữ liệu sau chuỗi thao tác dài.
// ==========================================

import { describe, expect, it } from 'vitest';
import { autoWrapWikiLinksByEntityMapWithCount } from './autoWrapWikiLinks.js';
import {
  appendOwnerAcquisitionMilestone,
  removeOwnerAcquisitionMilestonesByItem,
  syncAutoOwnerMilestonesItemRename,
} from './autoOwnerMilestone.js';
import { applyAutoRelationNotesForEntity } from './autoRelationDetailNote.js';

function createRng(seed = 0xdecafbad) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng, min, max) {
  return min + Math.floor(rng() * (max - min + 1));
}

function countSubstr(text, needle) {
  let count = 0;
  let idx = 0;
  while (idx < text.length) {
    const found = text.indexOf(needle, idx);
    if (found === -1) break;
    count += 1;
    idx = found + needle.length;
  }
  return count;
}

describe('auto fuzz risk checks', () => {
  it('fuzzes autoWrapWikiLinks invariants: reversible + idempotent + count match', () => {
    const rng = createRng(0x20260401);
    const wordBank = [
      'Lạc',
      'Nam',
      'Thiên',
      'Địa',
      'Huyền',
      'Minh',
      'Long',
      'Tinh',
      'Gia',
      'Tộc',
      'Kiếm',
      'Tông',
      'Vực',
      'Châu',
      'Cảnh',
      'Giới',
      'Băng',
      'Việt',
      'Hoang',
      'Cổ',
    ];
    const fillerWords = ['đã', 'gặp', 'và', 'nhận', 'ở', 'trong', 'chiến', 'dịch', 'này', 'hôm', 'qua'];
    const separators = [' ', ', ', '. ', ' - ', '\n'];

    for (let i = 0; i < 180; i += 1) {
      const names = [];
      const nameCount = randInt(rng, 4, 9);
      for (let n = 0; n < nameCount; n += 1) {
        const partCount = randInt(rng, 2, 4);
        const parts = [];
        for (let p = 0; p < partCount; p += 1) {
          parts.push(pick(rng, wordBank));
        }
        names.push(parts.join(' '));
      }

      let text = '';
      const chunkCount = randInt(rng, 10, 28);
      for (let c = 0; c < chunkCount; c += 1) {
        const chunk = rng() < 0.4 ? pick(rng, names) : pick(rng, fillerWords);
        text += chunk;
        if (c < chunkCount - 1) text += pick(rng, separators);
      }

      const entityMap = [
        ...names.map((name) => ({ name })),
        ...names.slice(0, 2).map((name) => ({ name })), // duplicate to test dedupe
      ];
      const out = autoWrapWikiLinksByEntityMapWithCount(text, entityMap);
      const insertedCount = countSubstr(out.text, '[[') - countSubstr(text, '[[');
      const stripped = out.text.replace(/\[\[|\]\]/g, '');
      const second = autoWrapWikiLinksByEntityMapWithCount(out.text, entityMap);

      expect(stripped).toBe(text);
      expect(out.count).toBe(insertedCount);
      expect(second.text).toBe(out.text);
      expect(second.count).toBe(0);
    }
  });

  it('fuzzes autoOwner lifecycle: append/rename/remove keeps manual milestones safe', () => {
    const rng = createRng(0x77aa5533);
    const owners = ['Lạc Nam', 'Vân Y', 'Mặc Trần', 'Khương Dao'];
    const novel = {
      data: {
        'nhan-vat': {
          chinh: {
            entities: owners.map((name, idx) => ({
              id: `owner-${idx}`,
              name,
              dynamicData: {},
              milestones: [{ id: `manual-owner-${idx}`, chapter: idx + 1, event: `[?] Mốc tay ${name}` }],
            })),
          },
        },
      },
    };

    const items = Array.from({ length: 12 }, (_, i) => ({ id: `item-${i}`, name: `Vật phẩm ${i}` }));
    const labels = ['uncertain', 'important', 'critical', 'ongoing'];
    const entityList = novel.data['nhan-vat'].chinh.entities;

    const assertOwnerInvariants = () => {
      entityList.forEach((ent, idx) => {
        const manual = ent.milestones.find((m) => m.id === `manual-owner-${idx}`);
        expect(manual?.event).toBe(`[?] Mốc tay ${ent.name}`);

        const auto = ent.milestones.filter((m) => m?.meta?.source === 'auto-owner');
        const seenByItem = new Set();
        auto.forEach((m) => {
          const itemId = String(m?.meta?.itemEntityId || '').trim();
          expect(itemId).not.toBe('');
          expect(seenByItem.has(itemId)).toBe(false);
          seenByItem.add(itemId);
          expect(String(m.event || '')).toContain('[[');
        });
      });
    };

    for (let i = 0; i < 320; i += 1) {
      const opRoll = rng();
      const item = pick(rng, items);
      if (opRoll < 0.64) {
        const owner = pick(rng, owners);
        const ok = appendOwnerAcquisitionMilestone(
          novel,
          { ownerName: owner, chapter: randInt(rng, 1, 600), labelId: pick(rng, labels) },
          { name: item.name, entityId: item.id }
        );
        expect(ok).toBe(true);
      } else if (opRoll < 0.86) {
        const renamed = `${item.name}-v${randInt(rng, 1, 9)}`;
        const changed = syncAutoOwnerMilestonesItemRename(novel, {
          entityId: item.id,
          oldName: item.name,
          newName: renamed,
        });
        expect(changed).toBeGreaterThanOrEqual(0);
        item.name = renamed;
      } else {
        const removed = removeOwnerAcquisitionMilestonesByItem(novel, {
          name: item.name,
          entityId: item.id,
        });
        expect(removed).toBeGreaterThanOrEqual(0);
      }

      if (i % 32 === 0) assertOwnerInvariants();
    }

    const target = items[0];
    removeOwnerAcquisitionMilestonesByItem(novel, { name: target.name, entityId: target.id });
    entityList.forEach((ent) => {
      const auto = ent.milestones.filter((m) => m?.meta?.source === 'auto-owner');
      expect(auto.some((m) => String(m?.meta?.itemEntityId || '') === target.id)).toBe(false);
    });

    assertOwnerInvariants();
  });

  it('fuzzes autoRelation updates: no duplicate auto blocks and no duplicate backlinks', () => {
    const rng = createRng(0x913579bd);
    const sourceNames = ['Lạc Gia', 'Thánh Kiếm Viện', 'Vân Thiên Các', 'Mặc Tông', 'Huyền Phù Môn', 'Tiên Đỉnh Phái'];
    const locationNames = ['Băng Thiên Đại Lục', 'Việt Long Tinh Cầu', 'Huyền Minh Đại Lục', 'Thiên Hà Châu', 'Thanh Vân Vực'];
    const categories = ['Gia Tộc', 'Tông Môn', 'Thương Minh', 'Đế Quốc'];
    const ranks = ['Cửu Cấp thế lực', 'Bát Cấp thế lực', 'Ngũ Cấp thế lực', 'Tam Cấp thế lực'];

    const sources = sourceNames.map((name, idx) => ({
      id: `src-${idx}`,
      name,
      info: '',
      dynamicData: {},
      milestones: [],
    }));
    const locations = locationNames.map((name, idx) => ({
      id: `loc-${idx}`,
      name,
      info: '',
      dynamicData: {},
      milestones: [],
    }));
    const novel = {
      data: {
        scope: {
          main: {
            entities: [...sources, ...locations],
          },
        },
      },
    };

    for (let i = 0; i < 260; i += 1) {
      const src = pick(rng, sources);
      const chainCount = rng() < 0.7 ? 1 : 2;
      const chain = [];
      while (chain.length < chainCount) {
        const loc = pick(rng, locationNames);
        if (!chain.includes(loc)) chain.push(loc);
      }
      const statusLine =
        rng() < 0.9
          ? `${pick(rng, categories)} - ${pick(rng, ranks)} - ${chain.join(' - ')}`
          : 'status loi format';
      const validScope = rng() < 0.88;
      const out = applyAutoRelationNotesForEntity(novel, {
        sourceEntity: src,
        sourceLonId: validScope ? 'the-luc' : 'nhan-vat',
        sourceParentLabel: validScope ? 'Thế Lực' : 'Nhân Vật',
        statusLine,
      });

      expect(typeof out?.applied).toBe('boolean');
      expect(typeof out?.touchedTargets).toBe('number');
      expect(out.touchedTargets).toBeGreaterThanOrEqual(0);
    }

    sources.forEach((src) => {
      const autoBlocks = countSubstr(String(src.info || ''), '## Quan hệ bản đồ - thế lực (tự động)');
      expect(autoBlocks).toBeLessThanOrEqual(1);
    });

    locations.forEach((loc) => {
      const relatedBlocks = (String(loc.info || '').match(/#{1,3}\s*Vị trí/g) || []).length;
      expect(relatedBlocks).toBeLessThanOrEqual(1);

      const lines = String(loc.info || '')
        .split(/\r?\n/)
        .filter((line) => /^\s*-\s*\[\[[^\]]+\]\]\s*\(/.test(line));
      const names = lines
        .map((line) => line.match(/\[\[([^\]]+)\]\]/)?.[1] || '')
        .filter(Boolean);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });
  });
});
