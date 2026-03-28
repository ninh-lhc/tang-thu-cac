/**
 * Logic nhật ký / gợi ý AI áp vào novel (thuần JS, không React).
 * Tên file: nhật ký + gợi ý thẻ.
 *
 * Ai dùng: App.jsx (hub batch, xref, mutate journal).
 * Phụ thuộc: MasterUtils (generateId, safeString), lib/stripWikiBrackets.
 * Sau khi sửa: chạy `npm run test` (có appNhatKyVaGoiThe.test.js).
 */
import { generateId, safeString } from './MasterUtils.jsx';
import { stripWikiBracketSyntax } from './lib/stripWikiBrackets.js';
import { lockFieldsTemplateIfFirstEntity, resolveFieldsTemplate } from './MasterEngines.js';

/** Tìm thẻ trong toàn bộ novel (dùng khi áp nhật ký batch). */
export function findEntitiesByHintInNovel(novelData, hint) {
  const h = safeString(hint).toLowerCase().trim();
  if (!h || !novelData?.tabsConfig) return [];
  const scored = [];
  (novelData.tabsConfig || []).forEach((lon) => {
    if (lon.id === 'tong-quan') return;
    (lon.subTabs || []).forEach((sub) => {
      if (sub.viewType !== 'collection-track') return;
      const ents = novelData.data?.[lon.id]?.[sub.id]?.entities || [];
      ents.forEach((ent) => {
        const n = safeString(ent.name).toLowerCase();
        if (!n) return;
        let score = 0;
        if (n === h) score = 100;
        else if (n.includes(h) || h.includes(n)) score = 60;
        else {
          const ws = h.split(/\s+/).filter((w) => w.length > 1);
          if (ws.some((w) => n.includes(w))) score = 30;
        }
        if (score) scored.push({ score, lonId: lon.id, nhoId: sub.id, ent });
      });
    });
  });
  return scored.sort((a, b) => b.score - a.score);
}

/** Áp các gợi ý nhật ký đã chọn vào novel (mutate nov). */
export function mutateNovelJournalSelections(nov, panel) {
  const fails = [];
  let ok = 0;
  const chapterCtx = Math.max(0, parseInt(panel.chapter, 10) || 0);
  const sk = panel.selectedKeys;
  const suggestions = panel.suggestions || [];
  const indices = suggestions.map((_, i) => i).filter((i) => sk && sk.has(`j-${i}`));
  if (!indices.length) return { ok: 0, fails, chapterCtx, didWork: false };

  const resolvePath = (tabLonId, tabNhoId) => {
    const cfg = nov.tabsConfig || [];
    const lon = cfg.find((t) => t.id === tabLonId);
    const nho = lon?.subTabs?.find((s) => s.id === tabNhoId && s.viewType === 'collection-track');
    if (lon && nho) return { lonId: lon.id, nhoId: nho.id };
    const nv = cfg.find((t) => t.id === 'nhan-vat');
    const nvSub = nv?.subTabs?.find((s) => s.viewType === 'collection-track');
    if (nv && nvSub) return { lonId: nv.id, nhoId: nvSub.id };
    for (const L of cfg) {
      if (L.id === 'tong-quan') continue;
      const st = L.subTabs?.find((s) => s.viewType === 'collection-track');
      if (st) return { lonId: L.id, nhoId: st.id };
    }
    return null;
  };
  const ensureTab = (lonId, nhoId) => {
    if (!nov.data) nov.data = {};
    if (!nov.data[lonId]) nov.data[lonId] = {};
    let td = nov.data[lonId][nhoId];
    if (!td || typeof td === 'string') td = { overview: typeof td === 'string' ? td : '', entities: [] };
    if (!td.entities) td.entities = [];
    nov.data[lonId][nhoId] = td;
    return td;
  };

  indices.forEach((idx) => {
    const s = suggestions[idx];
    const kind = safeString(s.kind).toLowerCase().replace(/\s/g, '_');
    const tag = `#${idx + 1}`;

    if (kind === 'new_entity') {
      const path = resolvePath(s.tabLonId, s.tabNhoId);
      if (!path) {
        fails.push(`${tag} thẻ mới: mục không hợp lệ`);
        return;
      }
      const name = safeString(s.suggestedName).trim();
      if (!name) {
        fails.push(`${tag} thiếu tên thẻ`);
        return;
      }
      const tabData = ensureTab(path.lonId, path.nhoId);
      if (tabData.entities.some((e) => safeString(e.name).trim().toLowerCase() === name.toLowerCase())) {
        fails.push(`«${name}» đã có`);
        return;
      }
      tabData.entities.push({
        id: generateId('ent'),
        name,
        avatar: '',
        rawText: stripWikiBracketSyntax(safeString(s.draftRawText)),
        dynamicData: {},
        info: '',
        milestones: [],
      });
      lockFieldsTemplateIfFirstEntity(nov, path.lonId, path.nhoId);
      ok++;
      return;
    }

    if (kind === 'milestone') {
      const hint = safeString(s.entityHint).trim();
      if (!hint) {
        fails.push(`${tag} mốc: thiếu tên thẻ`);
        return;
      }
      const matches = findEntitiesByHintInNovel(nov, hint);
      if (!matches.length) {
        fails.push(`${tag} không tìm «${hint}»`);
        return;
      }
      const m = matches[0];
      const tabData = ensureTab(m.lonId, m.nhoId);
      const ent = tabData.entities.find((e) => e.id === m.ent.id);
      if (!ent) {
        fails.push(`${tag} lỗi dữ liệu thẻ`);
        return;
      }
      if (!ent.milestones) ent.milestones = [];
      const ch = parseInt(s.chapter, 10);
      const chFinal = !isNaN(ch) && ch >= 0 ? ch : chapterCtx;
      const ev = stripWikiBracketSyntax(safeString(s.eventText).trim() || safeString(s.why));
      if (!ev) {
        fails.push(`${tag} thiếu mô tả sự kiện`);
        return;
      }
      ent.milestones.push({ id: generateId('ms'), chapter: chFinal, event: ev, snapshot: {} });
      ent.milestones.sort((a, b) => (a.chapter || 0) - (b.chapter || 0));
      ok++;
      return;
    }

    if (kind === 'update_profile') {
      const hint = safeString(s.entityHint).trim();
      if (!hint) {
        fails.push(`${tag} hồ sơ: thiếu tên thẻ`);
        return;
      }
      const matches = findEntitiesByHintInNovel(nov, hint);
      if (!matches.length) {
        fails.push(`${tag} không tìm «${hint}»`);
        return;
      }
      const m = matches[0];
      const lon = (nov.tabsConfig || []).find((t) => t.id === m.lonId);
      const nho = lon?.subTabs?.find((st) => st.id === m.nhoId);
      const template = nho
        ? resolveFieldsTemplate(nho, m.lonId, lon?.label || '')
        : [];
      const tabData = ensureTab(m.lonId, m.nhoId);
      const ent = tabData.entities.find((e) => e.id === m.ent.id);
      if (!ent) {
        fails.push(`${tag} lỗi thẻ`);
        return;
      }
      if (!ent.dynamicData) ent.dynamicData = {};
      const patches = Array.isArray(s.fieldPatches) ? s.fieldPatches : [];
      let patched = 0;
      patches.forEach((patch) => {
        const val = stripWikiBracketSyntax(safeString(patch.value));
        if (!val) return;
        const byId = safeString(patch.fieldId).trim();
        if (byId) {
          const f = template.find((t) => t.id === byId);
          if (f) {
            ent.dynamicData[f.id] = val;
            if (f.id === 'f_status') ent.status = safeString(val).trim();
            patched++;
          }
          return;
        }
        const label = safeString(patch.fieldLabel).trim();
        if (!label) return;
        const low = label.toLowerCase();
        const f =
          template.find((t) => safeString(t.label).toLowerCase().trim() === low) ||
          template.find(
            (t) =>
              low.includes(safeString(t.label).toLowerCase()) ||
              safeString(t.label).toLowerCase().includes(low)
          );
        if (f) {
          ent.dynamicData[f.id] = val;
          if (f.id === 'f_status') ent.status = safeString(val).trim();
          patched++;
        }
      });
      const note = stripWikiBracketSyntax(safeString(s.profileNote).trim());
      if (note) {
        ent.rawText =
          safeString(ent.rawText) + (ent.rawText ? '\n\n' : '') + `[ch.${chapterCtx}] ${note}`;
      }
      if (!patched && !note) {
        fails.push(`${tag} hồ sơ: không có trường/ghi chú`);
        return;
      }
      ok++;
      return;
    }
    fails.push(`${tag} loại «${kind}» không xử lý`);
  });

  return { ok, fails, chapterCtx, didWork: true };
}
