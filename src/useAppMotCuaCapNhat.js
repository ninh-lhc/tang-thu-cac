/**
 * Hub "Một cửa cập nhật": mở modal, tạo thẻ bằng AI, nhật ký batch → áp gợi ý.
 *
 * State hub (overviewHub*, hubCreate*, hubUpdate*) vẫn ở App.jsx — hook chỉ gói handler.
 * Phải gọi sau khi App đã có hàm updateActiveNovelData (mutate novel + sync).
 *
 * Phụ thuộc: MasterEngines (resolveFieldsTemplate), MasterUtils (AI), appNhatKyVaGoiThe (mutate).
 */
import { useCallback } from 'react';
import { DEFAULT_ENTITY_FIELDS, lockFieldsTemplateIfFirstEntity, resolveFieldsTemplate } from './MasterEngines.js';
import {
  analyzeTextWithAI,
  analyzeReadingJournalWithAI,
  mapGeminiErrorToUserMessage,
  generateId,
  safeString,
} from './MasterUtils.jsx';
import { stripWikiBracketSyntax } from './lib/stripWikiBrackets.js';
import { mutateNovelJournalSelections } from './appNhatKyVaGoiThe.js';
import { isAutoRelationScopeLonId, syncAllAutoRelationNotesForNovel } from './lib/autoRelationDetailNote.js';
import { isCultivationRelationScope, syncAllCultivationRelationBlocks } from './lib/cultivationRelationSync.js';
import { isMainCharacterRelationScope, syncAllMainCharacterRelationBlocks } from './lib/mainCharacterRelationSync.js';
import { buildHubExtendedCatalogLines } from './lib/hubBangDanhMucCacMucNhatKy.js';
import { findEquivalentEntityByName, mergeAliasText } from './lib/entityNameIdentity.js';
import { isMapCollectionScope, syncAllMapHierarchyAutoBlocks } from './lib/mapHierarchySync.js';
import {
  isForceCollectionScope,
  summarizeTheLucMapSyncWarnings,
  syncAllTheLucMapAutoBlocksDetailed,
} from './lib/theLucBanDoSync.js';

export function useAppMotCuaCapNhat({
  activeNovelData,
  activeTabs,
  geminiApiKeys,
  aiMode,
  showToast,
  updateActiveNovelData,
  hubCreatePath,
  hubCreateInput,
  hubCreatePreview,
  hubUpdateChapter,
  hubUpdateText,
  hubUpdatePanel,
  setOverviewHubOpen,
  setOverviewHubTab,
  setHubCreatePreview,
  setHubUpdatePanel,
  setHubCreateInput,
  setHubUpdateChapter,
  setHubCreatePath,
  setHubCreateBusy,
  setHubUpdateText,
  setActiveNovelData,
  syncNovelRef,
  dirHandleRef,
}) {
  const openOverviewHub = useCallback(() => {
    if (!activeNovelData) return;
    const forceMapAutoApplied = false;
    const forceMapWarning = '';
    setOverviewHubOpen(true);
    setOverviewHubTab('create');
    if (forceMapWarning === '__never__') {
      showToast('ÄÃ£ Ä‘á»“ng bá»™ quan há»‡ Tháº¿ Lá»±c â†” Báº£n Ä‘á»“ (AUTO).', 'success');
    }
    if (forceMapWarning === '__never__') {
      showToast(forceMapWarning, 'warning');
    }
    if (forceMapAutoApplied) {
      showToast('ÄÃ£ Ä‘á»“ng bá»™ quan há»‡ Tháº¿ Lá»±c â†” Báº£n Ä‘á»“ (AUTO).', 'success');
    }
    if (forceMapWarning) {
      showToast(forceMapWarning, 'warning');
    }
    setHubCreatePreview(null);
    setHubUpdatePanel(null);
    setHubCreateInput('');
    const a = Math.max(0, parseInt(activeNovelData.readingAnchorChapter ?? activeNovelData.chaptersRead ?? 0, 10) || 0);
    setHubUpdateChapter(String(a));
    let firstPath = '';
    (activeTabs || []).forEach((lon) => {
      if (lon.id === 'tong-quan') return;
      (lon.subTabs || []).forEach((nho) => {
        if (nho.viewType === 'collection-track' && !firstPath) firstPath = `${lon.id}|${nho.id}`;
      });
    });
    setHubCreatePath(firstPath);
  }, [activeNovelData, activeTabs, showToast, setOverviewHubOpen, setOverviewHubTab, setHubCreatePreview, setHubUpdatePanel, setHubCreateInput, setHubUpdateChapter, setHubCreatePath]);

  const hubRunCreateAi = useCallback(async () => {
    if (!hubCreatePath) {
      showToast('Chọn mục sưu tập.', 'warning');
      return;
    }
    const raw = hubCreateInput.trim();
    if (!raw) {
      showToast('Nhập mô tả hoặc dán văn bản.', 'warning');
      return;
    }
    if (!activeNovelData || geminiApiKeys.length === 0) {
      showToast('Cần API Key (Cài đặt).', 'warning');
      return;
    }
    const [lonId, nhoId] = hubCreatePath.split('|');
    const lon = activeTabs.find((t) => t.id === lonId);
    const nho = lon?.subTabs?.find((s) => s.id === nhoId);
    const fieldsTemplate = nho ? resolveFieldsTemplate(nho, lonId, lon?.label || '') : DEFAULT_ENTITY_FIELDS;
    setHubCreateBusy(true);
    try {
      const result = await analyzeTextWithAI(raw, fieldsTemplate, geminiApiKeys, aiMode);
      const dynamicData = {};
      (fieldsTemplate || []).forEach((f) => {
        if (result && result[f.id]) dynamicData[f.id] = safeString(result[f.id]);
      });
      const name = safeString(result?.name).trim() || 'Chưa đặt tên';
      const proc = safeString(result?.processedText);
      const rawText = stripWikiBracketSyntax(proc || raw);
      const ents = activeNovelData.data?.[lonId]?.[nhoId]?.entities || [];
      const matched = findEquivalentEntityByName(ents, name, {
        allowExactNameMatch: false,
      });
      if (matched?.entity) {
        showToast(`«${name}» đã trùng thẻ «${safeString(matched.entity.name)}» — chuyển sang tab Cập nhật.`, 'warning');
        setOverviewHubTab('update');
        setHubUpdateText(`Cập nhật về «${safeString(matched.entity.name)}»: ${raw.slice(0, 3500)}`);
        return;
      }
      setHubCreatePreview({ name, rawText, dynamicData });
    } catch (e) {
      showToast(mapGeminiErrorToUserMessage(e), 'error');
    } finally {
      setHubCreateBusy(false);
    }
  }, [
    hubCreatePath,
    hubCreateInput,
    activeNovelData,
    activeTabs,
    geminiApiKeys,
    aiMode,
    showToast,
    setHubCreateBusy,
    setOverviewHubTab,
    setHubUpdateText,
    setHubCreatePreview,
  ]);

  const hubSaveCreateEntity = useCallback(() => {
    if (!hubCreatePreview || !hubCreatePath.includes('|')) return;
    const [lonId, nhoId] = hubCreatePath.split('|');
    const lon = activeTabs.find((tab) => tab.id === lonId);
    const nho = lon?.subTabs?.find((sub) => sub.id === nhoId);
    const name = safeString(hubCreatePreview.name).trim();
    if (!name || name === 'Chưa đặt tên') {
      showToast('Điền tên thẻ trước khi lưu.', 'warning');
      return;
    }
    const ents = activeNovelData?.data?.[lonId]?.[nhoId]?.entities || [];
    const matched = findEquivalentEntityByName(ents, name, {
      allowExactNameMatch: false,
    });
    if (matched?.entity) {
      updateActiveNovelData((nov) => {
        const tab = nov.data?.[lonId]?.[nhoId];
        const list = tab?.entities || [];
        const target = list.find((e) => e.id === matched.entity.id);
        if (!target) return;
        const prevAlias = safeString(target.dynamicData?.f_alias);
        const mergedAlias = mergeAliasText(prevAlias, name);
        if (mergedAlias !== prevAlias) {
          if (!target.dynamicData) target.dynamicData = {};
          target.dynamicData.f_alias = mergedAlias;
        }
      });
      showToast('Tên vừa nhập trùng thẻ có sẵn — đã nối vào bí danh, chuyển sang tab Cập nhật.', 'warning');
      setOverviewHubTab('update');
      setHubUpdateText((t) => (safeString(t).trim() ? t : `Cập nhật về «${safeString(matched.entity.name)}»: `));
      return;
    }
    let forceMapAutoApplied = false;
    let forceMapWarning = '';
    updateActiveNovelData((nov) => {
      if (!nov.data) nov.data = {};
      if (!nov.data[lonId]) nov.data[lonId] = {};
      let td = nov.data[lonId][nhoId];
      if (!td || typeof td === 'string') td = { overview: typeof td === 'string' ? td : '', entities: [] };
      if (!td.entities) td.entities = [];
      const dyn = { ...hubCreatePreview.dynamicData };
      const statusLine = safeString(dyn.f_status).trim();
      td.entities.push({
        id: generateId('ent'),
        name,
        avatar: '',
        rawText: stripWikiBracketSyntax(safeString(hubCreatePreview.rawText)),
        status: statusLine,
        dynamicData: dyn,
        info: '',
        milestones: [],
      });
      nov.data[lonId][nhoId] = td;
      lockFieldsTemplateIfFirstEntity(nov, lonId, nhoId);
      if (
        isForceCollectionScope({
          activeTabLon: lonId,
          activeTabNho: nhoId,
          currentTabConfig: nho,
          parentLabel: lon?.label || '',
        })
      ) {
        const forceSyncResult = syncAllTheLucMapAutoBlocksDetailed(nov, { sourceLonId: lonId });
        forceMapAutoApplied = forceSyncResult.changed || forceMapAutoApplied;
        forceMapWarning =
          summarizeTheLucMapSyncWarnings(forceSyncResult.warnings) || forceMapWarning;
      }
      if (isAutoRelationScopeLonId(lonId, lon?.label || '')) {
        syncAllAutoRelationNotesForNovel(nov);
      }
      if (isCultivationRelationScope({ activeTabLon: lonId, activeTabNho: nhoId, currentTabConfig: nho })) {
        syncAllCultivationRelationBlocks(nov);
      }
      if (
        isMainCharacterRelationScope({
          activeTabLon: lonId,
          activeTabNho: nhoId,
          currentTabConfig: nho,
          parentLabel: lon?.label || '',
        })
      ) {
        syncAllMainCharacterRelationBlocks(nov);
      }
      if (isMapCollectionScope({ activeTabLon: lonId, activeTabNho: nhoId, currentTabConfig: nho, parentLabel: lon?.label || '' })) {
        syncAllMapHierarchyAutoBlocks(nov);
      }
    });
    showToast(`Đã tạo «${name}». Ảnh avatar: mở đúng mục → thẻ để thêm.`, 'success');
    if (forceMapAutoApplied) {
      showToast('ÄÃ£ Ä‘á»“ng bá»™ quan há»‡ Tháº¿ Lá»±c â†” Báº£n Ä‘á»“ (AUTO).', 'success');
    }
    if (forceMapWarning) {
      showToast(forceMapWarning, 'warning');
    }
    setHubCreatePreview(null);
    setHubCreateInput('');
  }, [
    hubCreatePreview,
    hubCreatePath,
    activeNovelData,
    activeTabs,
    showToast,
    updateActiveNovelData,
    setOverviewHubTab,
    setHubUpdateText,
    setHubCreatePreview,
    setHubCreateInput,
  ]);

  const runHubUpdateAi = useCallback(async () => {
    const text = hubUpdateText.trim();
    if (!text) {
      showToast('Nhập nội dung cập nhật.', 'warning');
      return;
    }
    if (!activeNovelData || geminiApiKeys.length === 0) {
      showToast('Cần API Key (Cài đặt).', 'warning');
      return;
    }
    const ch = Math.max(
      0,
      parseInt(hubUpdateChapter, 10) ||
        parseInt(activeNovelData.readingAnchorChapter ?? activeNovelData.chaptersRead ?? 0, 10) ||
        0
    );
    setHubUpdatePanel({
      chapter: String(ch),
      sourceText: text,
      suggestions: [],
      selectedKeys: new Set(),
      loading: true,
      error: '',
    });
    try {
      const lines = buildHubExtendedCatalogLines(activeNovelData, safeString, resolveFieldsTemplate);
      const { suggestions } = await analyzeReadingJournalWithAI(geminiApiKeys, {
        novelTitle: activeNovelData.title,
        chapter: ch,
        journalText: text,
        extendedCatalog: lines.join('\n'),
      });
      const list = Array.isArray(suggestions) ? suggestions : [];
      const normalized = list.map((sug) => ({
        ...sug,
        draftRawText: stripWikiBracketSyntax(safeString(sug.draftRawText)),
        eventText: stripWikiBracketSyntax(safeString(sug.eventText)),
        profileNote: stripWikiBracketSyntax(safeString(sug.profileNote)),
        why: stripWikiBracketSyntax(safeString(sug.why)),
        fieldPatches: Array.isArray(sug.fieldPatches)
          ? sug.fieldPatches.map((p) => ({
              ...p,
              fieldId: safeString(p.fieldId).trim(),
              value: stripWikiBracketSyntax(safeString(p.value)),
            }))
          : sug.fieldPatches,
      }));
      setHubUpdatePanel({
        chapter: String(ch),
        sourceText: text,
        suggestions: normalized,
        selectedKeys: new Set(list.map((_, i) => `j-${i}`)),
        loading: false,
        error: '',
      });
    } catch (e) {
      setHubUpdatePanel((p) => (p ? { ...p, loading: false, error: mapGeminiErrorToUserMessage(e) } : p));
    } finally {
      setHubUpdatePanel((p) => (p?.loading ? { ...p, loading: false } : p));
    }
  }, [hubUpdateText, hubUpdateChapter, activeNovelData, geminiApiKeys, showToast, setHubUpdatePanel]);

  const applyHubUpdateSelected = useCallback(() => {
    if (!hubUpdatePanel?.suggestions?.length) return;
    if (!hubUpdatePanel.selectedKeys?.size) {
      showToast('Chọn ít nhất một dòng gợi ý.', 'warning');
      return;
    }
    const panel = hubUpdatePanel;
    const prevNovel = activeNovelData ? structuredClone(activeNovelData) : null;
    let ok = 0;
    let fails = [];
    let relationAutoApplied = false;
    let mainCharacterRelationApplied = false;
    let cultivationRelationAutoApplied = false;
    let forceMapAutoApplied = false;
    let forceMapWarning = '';
    let mapHierarchyAutoApplied = false;
    updateActiveNovelData((nov) => {
      const r = mutateNovelJournalSelections(nov, panel);
      ok = r.ok;
      fails = r.fails;
      if (r.ok > 0 && panel.sourceText) {
        if (!nov.readingJournal) nov.readingJournal = [];
        nov.readingJournal.unshift({
          id: generateId('jr'),
          chapter: r.chapterCtx,
          text: `[Hub] ${panel.sourceText.slice(0, 7800)}`,
          at: Date.now(),
          appliedCount: ok,
        });
        if (nov.readingJournal.length > 50) nov.readingJournal.length = 50;
      }
      if (r.ok > 0) {
        relationAutoApplied = syncAllAutoRelationNotesForNovel(nov) || relationAutoApplied;
        mainCharacterRelationApplied =
          syncAllMainCharacterRelationBlocks(nov) || mainCharacterRelationApplied;
        cultivationRelationAutoApplied =
          syncAllCultivationRelationBlocks(nov) || cultivationRelationAutoApplied;
        const forceSyncResult = syncAllTheLucMapAutoBlocksDetailed(nov);
        forceMapAutoApplied = forceSyncResult.changed || forceMapAutoApplied;
        forceMapWarning =
          summarizeTheLucMapSyncWarnings(forceSyncResult.warnings) || forceMapWarning;
        mapHierarchyAutoApplied = syncAllMapHierarchyAutoBlocks(nov) || mapHierarchyAutoApplied;
      }
    });
    setHubUpdatePanel(null);
    setHubUpdateText('');
    if (ok > 0) {
      showToast(`Đã áp dụng ${ok} thao tác (cập nhật).${fails.length ? ` (${fails.length} bỏ qua)` : ''}`, 'success', {
        onUndo:
          prevNovel
            ? () => {
                setActiveNovelData(structuredClone(prevNovel));
                void (syncNovelRef.current && syncNovelRef.current(prevNovel, dirHandleRef.current));
              }
            : undefined,
      });
      if (mapHierarchyAutoApplied) {
        showToast('Đã đồng bộ cây Bản đồ (AUTO).', 'success');
      }
      if (forceMapAutoApplied) {
        showToast('Đã đồng bộ quan hệ Thế Lực ↔ Bản đồ (AUTO).', 'success');
      }
      if (forceMapWarning) {
        showToast(forceMapWarning, 'warning');
      }
      if (relationAutoApplied) {
        showToast('Đã đồng bộ lại liên kết AUTO trên các thẻ liên quan.', 'success');
      }
      if (mainCharacterRelationApplied) {
        showToast('Đã đồng bộ quan hệ Nhân Vật Chính ↔ các tab nhân vật liên quan (AUTO).', 'success');
      }
      if (cultivationRelationAutoApplied) {
        showToast('Đã đồng bộ lại liên kết Hệ Thống Tu Luyện ↔ Cảnh Giới Tu Vi (AUTO).', 'success');
      }
    } else {
      showToast(fails.length ? fails.slice(0, 4).join('; ') : 'Không áp dụng được.', 'warning');
    }
    if (ok > 0 && fails.length) {
      setTimeout(() => showToast(`Một số dòng lỗi: ${fails.slice(0, 3).join('; ')}`, 'warning'), 400);
    }
  }, [hubUpdatePanel, showToast, activeNovelData, updateActiveNovelData, setHubUpdatePanel, setHubUpdateText, setActiveNovelData, syncNovelRef, dirHandleRef]);

  return {
    openOverviewHub,
    hubRunCreateAi,
    hubSaveCreateEntity,
    runHubUpdateAi,
    applyHubUpdateSelected,
  };
}
