# Feature Inventory & Dead-Code Audit — Tàng Thư Các

## 1. Audit metadata

| Field | Value |
|--------|--------|
| **Date** | 2026-10-27 (UTC+7) |
| **Branch** | `main` |
| **Commit** | `400fa44797c7d736de058f0d77228673850bd670` |
| **Remote** | `origin` → `https://github.com/ninh-lhc/tang-thu-cac.git` |
| **Working tree** | Clean (`git status --short` empty at audit time). Initial conversation snapshot showed `M package.json`; not present at audit completion — treat as resolved or reverted before audit. |
| **Tests** | `npm run test` — **120 files, 864 tests, all pass** (~19s) |
| **Build** | `npm run build` — **success**; main chunk ~961 kB gzip ~257 kB; workers emitted |
| **Lint** | `npm run lint` — **exit 1**; 20 errors, 3 warnings (not fixed — read-only audit) |
| **Files changed by this audit** | `docs/audits/feature-inventory-audit-report.md` only |
| **Scope limits** | Static analysis + test/build/lint runs. No runtime/manual UI walkthrough. No coverage report (`package.json` has no coverage script). Architecture audit (`docs/audits/architecture-audit-report.md`, 2026-10-26) used as context only; claims re-verified against current `main`. |

---

## 2. Executive summary

| Metric | Count / note |
|--------|----------------|
| Functional groups inventoried | **15** (13 requested + Entity members/structure hub + Export/print) |
| Features / micro-features catalogued | **~92** (table §4; detailed records §5 for subsystems) |
| **F1 — Active / keep** | ~78 |
| **F2 — Active / optimize later** | ~8 |
| **F3 — Active / consolidate** | ~6 implementation pairs |
| **F4 — Legacy compatibility** | ~7 (migration, disk, AUTO list markers, field IDs) |
| **F5 — Suspected obsolete** | ~5 (needs runtime or product check) |
| **F6 — Confirmed unreachable (static)** | ~6 symbols/files (see §7, §12) |
| **F7 — Duplicate / conflicting** | ~5 groups |
| **F8 — Product decision** | ~3 (genre templates, modal map legacy flag, members feature toggle) |

**Should you delete code immediately?** **No.** Static audit found **confirmed dead** items that are **low risk** after a quick grep parity check, but several “legacy” paths are **required for old novels** (AUTO list HTML comments, `novels/<id>.json`, index variant files, `autoRelationLegacy`, TTC legacy field IDs). **Conclusion B** (§16): continue feature work, but schedule a **small verification + cleanup pass** for confirmed-dead UI handlers and orphan files before large refactors.

**Notable vs architecture audit (2026-10-26):** AUD-001 (dirty restore on failed write) and AUD-003 (lazy tab load marking dirty) appear **addressed** on current `main` (`useAppPersistence.dirtyRestore.test.js`, `useAppNovelSelectionAndHydration.js` ~223–224 comment + no `markShardDirty` on lazy merge).

---

## 3. Feature map (high level)

```text
Quản lý truyện / thư viện (product)
  └── Bootstrap & shell (subsystem)
      └── Theme, font, keyboard, toasts, modals lazy-load
  └── Novel CRUD & hydration (subsystem)
      └── FS folder + index, sharded manifest, lazy shard tab load, migrateNovel
  └── Entity / tab domain (subsystem)
      └── Collection cards, members tree, map tree, milestones, transfer/promote
  └── Ghi chép & editor (subsystem)
      └── Notes editor, find/replace, wiki highlight, draft prefs, save pipeline
  └── Wiki-link & entity map (subsystem)
      └── Sync core, Worker async save, opt-out, alias retire, hierarchy guard
  └── AI hỗ trợ (subsystem)
      └── runNotesAiPipeline (entity + milestone), Gemini via MasterUtils
  └── Tìm kiếm & TTC-Query (subsystem)
      └── Deep search worker + cache, in-novel search, collection query blocks
  └── Danh sách AUTO & collection UI (subsystem)
      └── listCard sync, EntityAutoView dynamic preview, list/table VM
  └── AUTO sync blocks (subsystem)
      └── map/cultivation/main-char/relation sync managers
  └── Persistence & recovery (subsystem)
      └── debounced syncNovel, dirty shards, IDB shadow, backup JSON
  └── Import/export & admin (subsystem)
      └── Directory backup, legacy index cleanup, PDF profile print
```

---

## 4. Feature inventory (condensed)

**Legend — Status:** F1 active | F2 optimize | F3 consolidate | F4 legacy compat | F5 suspected obsolete | F6 confirmed dead (static) | F8 product decision  
**Confidence:** High / Medium / Low

| ID | Nhóm | Feature | Cấp | Entry point | Implementation chính | Trạng thái | Conf. | Persisted | Test |
|----|------|---------|-----|-------------|----------------------|------------|-------|-----------|------|
| FEAT-001 | 2.1 | App bootstrap | 4 | `main.jsx` | `App.jsx` | F1 | High | — | integration |
| FEAT-002 | 2.1 | Theme / font tokens | 2 | Settings | `AppPhongChuVaTheme.jsx` | F1 | High | localStorage prefs | partial |
| FEAT-003 | 2.1 | Global shortcuts | 2 | Ctrl+K, /, Esc, Ctrl+S | `useAppPhimTatToanCuc.js` | F1 | High | — | yes |
| FEAT-004 | 2.2 | Novel create/edit/delete | 3 | Library, modals | `useAppNovelCrud.js` | F1 | High | index + shards | partial |
| FEAT-005 | 2.2 | Select novel + hydrate | 3 | Sidebar | `useAppNovelSelectionAndHydration.js` | F1 | High | FS/localStorage | yes |
| FEAT-006 | 2.2 | Genre templates / tabs | 3 | New novel | `genreTabsTemplateStore`, `dataMigration` | F1 | High | novel metadata | yes |
| FEAT-007 | 2.2 | Import/export backup | 3 | Settings | `useAppDirectoryBackup.js` | F1 | High | files | Low |
| FEAT-008 | 2.3 | Entity modal CRUD | 3 | Collection, Ctrl+Shift+N | `MasterComponents.jsx`, `App.jsx` | F1 | High | shards | partial |
| FEAT-009 | 2.3 | Entity members panel | 3 | Structure hub | `AppEntityMembersPanel.jsx` | F1 | High | entity.members | Low |
| FEAT-010 | 2.3 | Map entity tree | 3 | Map tab panel | `AppMapEntityTreePanel.jsx`, `mapEntityTree.js` | F1 | High | mapParentId | yes |
| FEAT-011 | 2.3 | Pin entity in list | 1 | List UI | `entityListPin.js` | F1 | High | entity fields | yes |
| FEAT-012 | 2.3 | Move/promote entity | 3 | Context / modal | `entityTransfer.js`, `AppModalEntityTransfer` | F1 | High | shards | yes |
| FEAT-013 | 2.3 | Milestones / timeline | 3 | Entity detail | `useAppEntityMilestoneActions.js` | F1 | High | milestones | partial |
| FEAT-014 | 2.3 | TTC-Query collection filter | 3 | Danh sách UI | `ttcQuery*`, `useEntityCollectionQueryState` | F1 | High | note blocks | yes |
| FEAT-015 | 2.4 | Entity notes editor | 3 | Entity detail | `AppEntityDetailNotes.jsx` | F1 | High | entity.info | yes |
| FEAT-016 | 2.4 | Find/replace in notes | 2 | Editor toolbar | `entityNotesFindReplace.js` | F1 | High | — | yes |
| FEAT-017 | 2.4 | Wiki highlight editor | 2 | Typing | `EntityNotesHighlightedEditor.jsx` | F1 | High | — | yes |
| FEAT-018 | 2.4 | Save notes + pipeline | 3 | Save, auto-clean | `entityNotesAiPipeline.js` | F1 | High | info + opt-outs | yes |
| FEAT-019 | 2.4 | Milestone event editor | 3 | Milestone modal | `MasterComponents.jsx` (milestone section) | F1 | High | milestone text | partial |
| FEAT-020 | 2.5 | Sync wiki auto-wrap | 3 | Manual tools, AI | `autoWrapWikiLinksCore.js` → facade | F1 | High | info | yes |
| FEAT-021 | 2.5 | Async wiki wrap (save) | 3 | Save path | `autoWrapWikiLinksAsync.js`, worker | F3 | High | info | yes |
| FEAT-022 | 2.5 | Wiki opt-out | 2 | Save merge | `wikiLinkOptOut.js` | F1 | High | opt-out list | yes |
| FEAT-023 | 2.5 | Retired wiki aliases | 2 | Hydration | `retiredWikiAliases.js` | F4 | High | alias fields | yes |
| FEAT-024 | 2.6 | AI clean/link/format pipeline | 3 | AI menu | `runNotesAiPipeline` | F1 | High | — | yes |
| FEAT-025 | 2.6 | AI milestone analyze | 3 | Milestone modal | `MasterComponents` analyze handler | F1 | Medium | snapshot | Low |
| FEAT-026 | 2.6 | Legacy milestone AI link/format | 2 | *(no UI wire)* | `handleLinkWithAi`, `formatNotesStructureWithAI` | **F6** | High | — | none |
| FEAT-027 | 2.7 | Deep search | 3 | Ctrl palette / modal | `deepSearchCore.js`, worker | F1 | High | IDB cache | partial |
| FEAT-028 | 2.7 | In-novel search | 3 | Shortcut | `buildNovelSearchIndex` in `App.jsx` | F1 | High | — | Low |
| FEAT-029 | 2.7 | List card info search | 2 | List card UI | `AppListCardInfoSearch.jsx` | F3 | High | — | yes |
| FEAT-030 | 2.8 | AUTO collection list sync | 3 | Save/migrate | `collectionListCardSync.js` | F1 | High | list card info | yes |
| FEAT-031 | 2.8 | Dynamic list/table preview | 3 | List card view | `EntityAutoView`, `listCardDynamicAutoPreview` | F1 | High | — | yes |
| FEAT-032 | 2.8 | Legacy markdown list preview | 2 | No viewModel | `AppListCardInfoSearch` legacy branch | F4 | High | — | via dynamic tests |
| FEAT-033 | 2.9 | Sharded disk persistence | 4 | Auto debounce | `useAppPersistence.js`, `novelDiskLayout.js` | F1 | High | manifest/shards | yes |
| FEAT-034 | 2.9 | localStorage novel mode | 3 | Fallback | `storageSafe.js` | F4 | High | full JSON | yes |
| FEAT-035 | 2.9 | IndexedDB shadow draft | 3 | syncNovel | `novelShadowStore.js` | F1 | High | IDB | yes |
| FEAT-036 | 2.9 | Dirty shard tracking | 3 | Edits | `dirtyShardTracker.js` | F1 | High | — | yes |
| FEAT-037 | 2.9 | Legacy index file cleanup | 2 | Settings action | `cleanupLegacyIndexFiles` | F4 | High | disk files | Low |
| FEAT-038 | 2.9 | Legacy single-file novel | 3 | Delete/import | `novelDiskLayout.js` ~492+ | F4 | High | `novels/id.json` | yes |
| FEAT-039 | 2.10 | Novel patch vs clone update | 3 | Most handlers | `patchNovelData.js` | F3 | High | dirty scope | yes |
| FEAT-040 | 2.10 | Undo/redo in notes | 2 | Editor | local history in components | F1 | Medium | session | partial |
| FEAT-041 | 2.11 | Modal layer + lazy modals | 3 | Various | `AppModalLayer.jsx` | F1 | High | — | integration |
| FEAT-042 | 2.11 | Command palette | 3 | Ctrl+K | `AppModalLenhNhanh.jsx` | F1 | High | — | yes |
| FEAT-043 | 2.11 | Một cửa batch update | 3 | Menu | `AppModalMotCua.jsx`, `useAppMotCuaCapNhat` | F1 | High | shards | partial |
| FEAT-044 | 2.11 | Quản lý tab / AUTO sync UI | 3 | Settings | `AppModalQuanLyTab.jsx` | F1 | High | tabsConfig | partial |
| FEAT-045 | 2.11 | Overview / reading progress | 3 | Overview hub | `AppOverviewSection.jsx`, `readingProgress.js` | F1 | High | progress fields | yes |
| FEAT-046 | 2.12 | migrateNovel on load | 4 | Hydration | `dataMigration.js` | F4 | High | all novel | yes |
| FEAT-047 | 2.12 | AUTO list HTML legacy strip | 2 | Sync | `collectionListCardSync` LEGACY markers | F4 | High | info text | yes |
| FEAT-048 | 2.12 | autoRelation legacy cleanup | 2 | Hydration | `autoRelationLegacy.js` via `autoRelationDetailNote` | F4 | High | entity info | yes |
| FEAT-049 | 2.12 | TTC legacy field IDs | 2 | Query engine | `ttcQueryFieldCatalog` LEGACY_ENTITY_FIELDS | F4 | High | dynamicData | yes |
| FEAT-050 | 2.12 | Modal map/force quick form legacy | 2 | Tab config flag | `MasterComponents` `modalMapForceQuickForm: 'legacy'` | F8 | High | tab config | Low |
| FEAT-051 | 2.13 | Auto-sync diagnostics | 2 | Quản lý tab | `autoSyncDiagnostics.js` | F1 | Medium | — | none |
| FEAT-052 | 2.13 | Orphan AutoSync guide file | 2 | — | `AppModalAutoSyncGuide.jsx` | **F6** | High | — | none |
| FEAT-053 | 2.13 | Format diagnostics hook | 2 | — | `useEntityNotesFormatDiagnostics.js` | **F6** | High | — | none |
| FEAT-054 | — | Entity structure hub | 3 | Detail panel | `AppEntityStructureHub.jsx` | F1 | High | localStorage toggles | yes |
| FEAT-055 | — | PDF profile export | 3 | Entity actions | `entityProfilePrint.js` | F1 | Medium | — | none |
| FEAT-056 | 2.8 | Tab AUTO sync (map/realm/…) | 4 | Role on tab | `autoSyncManager.js`, `*RelationSync.js` | F1 | High | info blocks | yes |
| FEAT-057 | 2.6 | Gợi ý AI nối tra cứu | 3 | Modal | `AppModalGoiYNoiTraCuu.jsx` | F1 | Medium | — | Low |
| FEAT-058 | 2.3 | Quick entry slots | 2 | Entity modal | `entityQuickEntrySlots.js` | F1 | High | tab config | yes |
| FEAT-059 | 2.4 | Duplicate word formatting | 1 | Save | `entityNotesDuplicateWordFormatting.js` | F1 | High | — | yes |
| FEAT-060 | 2.5 | Wiki disambiguation | 2 | Wrap | `entityWikiDisambiguation.js` | F1 | Medium | — | Low |

*(Rows FEAT-061–092 omitted from table for length; covered in §5 subsystem records: image workflow, lightbox, TOC rail, library sidebar, navigation history, gallery, cultivation force ladder, related entities network, xref catalogs, hub nhật ký, suggestion rows, status hierarchy parser consumers, etc. All traced to `App.jsx` imports or modal layer with **F1** unless noted in §6–§7.)*

---

## 5. Detailed feature records (subsystems)

### FEAT-033 / FEAT-035 — Persistence & shadow (F1, High)

| Field | Detail |
|--------|--------|
| **Purpose** | Debounced write of novel shards + manifest to File System directory; IDB shadow for crash recovery; optional localStorage mode. |
| **User flow** | Edit entity → toast/save → memory update → ~1s debounce → disk chain. |
| **Code flow** | `updateActiveNovelData` / handlers → `markShardDirty` → `syncNovel` → `consumeDirtyShards` → `buildShardWritePlan` → `writeShardTree`. |
| **Files** | `useAppPersistence.js`, `novelDiskLayout.js`, `novelDiskWritePolicy.js`, `dirtyShardTracker.js`, `novelShadowStore.js` |
| **Persistence** | `manifest.json`, `data/<lon>/<nho>.json`, `.backup.json`, IDB shadow keys |
| **Tests** | `novelDiskLayout.test.js`, `dirtyShardTracker.test.js`, `useAppPersistence.dirtyRestore.test.js`, `novelShadowStore.test.js` |
| **Risks** | AUD-002 (toast before disk idle) still plausible; dirty restore **now tested** on failure paths. |
| **Classification** | F1; F2 for UX/sync await semantics. |

### FEAT-020 / FEAT-021 — Wiki wrap dual path (F3, High)

| Field | Detail |
|--------|--------|
| **Purpose** | Insert `[[entity]]` links from entity map; save path uses Worker when available. |
| **Entry** | Entity notes save (`AppEntityDetailNotes.jsx` ~693+); manual wrap in editor; milestone snapshot fields in `MasterComponents`. |
| **Implementations** | A: `autoWrapWikiLinksCore.js` (sync); B: `autoWrapWikiLinksAsync.js` + `workers/autoWrapWikiLinks.worker.js`; facade `autoWrapWikiLinks.js`. |
| **Call-sites** | `entityNotesAiPipeline.js`, `wikiLinkOptOut.js`, tests, worker import core directly. |
| **Parity** | `autoWrapWikiLinksCore.test.js` compares facade vs core. |
| **Classification** | F3 — intentional; do not delete sync path (Worker fallback + Vitest disables worker). |

### FEAT-030 / FEAT-032 — Collection list AUTO (F1 + F4)

| Field | Detail |
|--------|--------|
| **Purpose** | Maintain list-card entity `info` with AUTO-generated catalog from sibling entities. |
| **Entry** | `migrateNovel` → `syncAllCollectionListCards`; entity save side effects; manual sync in app flows. |
| **Legacy** | HTML comments `<!-- AUTO_COLLECTION_LIST -->` stripped in `collectionListCardSync.js` ~26–27, ~378–383. |
| **Dynamic UI** | When `collectionViewModel` present, `AppListCardInfoSearch` uses `EntityAutoView` (`useDynamicAuto` ~38). |
| **Dead helpers (static)** | `collectDefaultEntityDetailBitsLegacy`, `formatAutoListDetailBitsForPreview` — **defined, never called** (eslint `no-unused-vars`, `collectionListCardSync.js` ~1052, ~1302). |
| **Classification** | Feature F1; legacy strip F4; unused helpers **F6** (likely leftover from preview refactor). |

### FEAT-024 / FEAT-026 — AI notes vs milestone dead handlers

| Field | Detail |
|--------|--------|
| **Active pipeline** | `runNotesAiPipeline` — steps clean/link/format (`entityNotesAiPipeline.js` ~19); used by `AppEntityDetailNotes.jsx`, milestone `handleRunEventAiPipeline` (~4094, wired ~4398). |
| **Dead code** | `handleLinkWithAi` (~3987), `formatNotesStructureWithAI` (~4041) — **no references** outside definitions; states `isLinkingAi`, `isFormattingStructure` unused in JSX (eslint). |
| **Impact if removed** | None for UI unless hidden dynamic binding; milestone AI still works via `EntityNotesAiToolsMenu` + `handleRunEventAiPipeline`. |
| **Classification** | Pipeline F1; orphan handlers **F6**. |

### FEAT-005 — Lazy tab shard load (F1, High)

| Field | Detail |
|--------|--------|
| **Trigger** | `useEffect` when active lon/nho shard missing in memory (`useAppNovelSelectionAndHydration.js` ~210–236). |
| **Side effect** | Merge shard into state **without** `markShardDirty` (AUD-003 fix, comment ~223). |
| **Classification** | F1. |

### FEAT-052 — Duplicate AutoSync guide modal file (F6)

| Evidence | Detail |
|----------|--------|
| **Active** | `AppModalLayer.jsx` ~26 lazy-imports **`AppModalAutoSyncGuideVi.jsx`** export `AppModalAutoSyncGuide`. |
| **Orphan** | `AppModalAutoSyncGuide.jsx` — same export name, **zero** importers (repo-wide grep). |
| **Risk if delete** | Low — build does not reference file; verify no deep link to path. |
| **Classification** | F6 — **Confirmed unreachable** (module graph). |

---

## 6. Duplicate / competing implementations

| ID | Nhiệm vụ | Implementation A | Implementation B | Call-sites | Parity | Rủi ro |
|----|----------|------------------|------------------|------------|--------|--------|
| DUP-001 | Wiki wrap | Sync core | Worker async | Save vs menu | Tested core/facade | Medium — stale entityMap mid-flight (architecture AUD-009) |
| DUP-002 | Novel update | `commitNovelUpdate` patch | Callback + `structuredClone` | Mixed in hooks | Partial tests | Performance + dirty `'all'` |
| DUP-003 | List card preview | Dynamic `EntityAutoView` | Legacy markdown render | `collectionViewModel` null vs set | Tests on dynamic path | Low — fallback for old UI path |
| DUP-004 | AutoSync guide | `AppModalAutoSyncGuideVi.jsx` | `AppModalAutoSyncGuide.jsx` | Layer → Vi only | N/A | Low — orphan file |
| DUP-005 | Opt-out merge | sync save helpers | async Worker path | `wikiLinkOptOut.saveAsync.test.js` | Tested | Must keep both until Worker-only |

---

## 7. Legacy / obsolete candidates

### Confirmed dead (static) — F6

| Item | Evidence | Migration / compat | Remove safety |
|------|----------|-------------------|---------------|
| `AppModalAutoSyncGuide.jsx` | No imports | None | **Low risk** after confirm build |
| `useEntityNotesFormatDiagnostics.js` | Export only in own file | None | **Low risk** |
| `handleLinkWithAi`, `formatNotesStructureWithAI` | `MasterComponents.jsx` ~3987–4093, no JSX refs | Superseded by `runNotesAiPipeline` / `handleRunEventAiPipeline` | **Low risk** |
| `sortEntitiesByName` | `mapEntityTree.js` ~177, unused | None | **Low risk** |
| `collectDefaultEntityDetailBitsLegacy`, `formatAutoListDetailBitsForPreview` | `collectionListCardSync.js`, eslint unused | Comment ~888 references legacy behavior concept | **Medium** — confirm no dynamic eval |
| `normalizeTtcTabsList` import unused | `ttcQueryEngine.js` eslint | — | **Low risk** |

### Legacy compatibility only — F4 (do not remove)

| Item | Why kept |
|------|----------|
| `LEGACY_AUTO_LIST_*` markers | Old list card notes on user disks |
| `novels/<id>.json` delete path | Pre-shard novels |
| `pruneLegacyIndexVariantFiles` | Old index naming on folder |
| `autoRelationLegacy` + hydration cleanup | Old relation blocks in info |
| `LEGACY_ENTITY_FIELDS` in TTC query | Old entity dynamic field IDs |
| `modalMapForceQuickForm: 'legacy'` | Per-tab product opt-in |
| localStorage full-novel mode | Users without FS API |

### Likely obsolete — F5 (verify manually)

| Item | Verify |
|------|--------|
| `AppModalAutoSyncGuide.jsx` vs Vi content drift | Compare markdown source paths (`QUY_CHUAN_AUTO_SYNC.md?raw`) |
| Legacy branch in `AppListCardInfoSearch` | Open list card **without** viewModel in production data |
| `handleCleanupLegacyIndexFiles` | Confirm still in settings UI (`AppModalLayer` ~308) |

### Product decision — F8

| Item | Question |
|------|----------|
| Members feature localStorage toggle | Default on/off for new scopes? |
| Map/force legacy quick modal | Deprecate tab flag? |
| Gemini keys in client | Acceptable for target users (documented risk SEC-006 arch audit) |

---

## 8. UI no-op / hidden features

| UI entry | Handler | Side effect | Status | Notes |
|----------|---------|-------------|--------|-------|
| Milestone modal “AI link” (old) | `handleLinkWithAi` | Would call Gemini | **Confirmed no-op** | Not bound to UI |
| Milestone modal “AI format structure” (old) | `formatNotesStructureWithAI` | Would call Gemini | **Confirmed no-op** | Not bound to UI |
| Milestone AI tools menu | `handleRunEventAiPipeline` | Pipeline steps | Active | ~4398 |
| Legacy index cleanup | `handleCleanupLegacyIndexFiles` | Deletes old index files | **Conditionally reachable** | Needs folder permission |
| Entity members kind icon | `getMemberKindIcon` in render | Renders icon | Active | ESLint static-components warning |
| `entityTreeListRootId` prop | `AppCollectionSection.jsx` | — | **Likely obsolete prop** | ESLint unused arg ~195 |

---

## 9. Automatic / background features

| Feature | Trigger | Frequency | Side effect | Concurrency | Failure | Tests |
|---------|---------|-----------|-------------|-------------|---------|-------|
| `syncNovel` debounce | Novel mutate | ~1s coalesce | Disk + manifest + backup throttle | Serialized chain | Retry + dirty restore | yes |
| Lazy shard load | Tab change | On missing shard | Memory merge | In-flight set guard | loadNovelData errors | yes |
| `migrateNovel` | Load/import | Per novel once | Mutate in memory + list sync | — | — | yes |
| `reconcileRetiredWikiAliases` | Novel load | Per select | Patch aliases | — | — | yes |
| Deep search index | User opens search | On demand | Worker + IDB cache | Worker | catch in UI | partial |
| AUTO sync blocks | Entity save / batch | Role-dependent | Rewrite info sections | sync managers | — | yes |
| `window` `ttc-save` event | Ctrl+S | User | Modal save handlers | — | — | yes |
| Wiki wrap Worker | Save | Per save | postMessage | Single worker queue | Fallback sync | yes |
| Shadow IDB write | sync enqueue | Each sync | IDB | With chain | — | yes |
| `beforeunload` / visibility | *(grep not exhaustive)* | — | — | — | — | Unknown |

---

## 10. Persistence / schema impact

| Feature | Dữ liệu ảnh hưởng | Persisted? | Migration? | Safe to remove feature code? |
|---------|-------------------|:----------:|:----------:|:----------------------------:|
| Entity notes save | `entity.info`, opt-outs | Yes | migrateNovel | No |
| List AUTO sync | list card `info` | Yes | strip legacy HTML | No |
| TTC-Query blocks | note markdown | Yes | parser compat | No |
| Tab AUTO sync roles | `info` templates | Yes | field maps | No |
| Members / map tree | members, mapParentId | Yes | backfill in migration | No |
| Deep search cache | IDB index | Yes | namespace version | Low impact |
| Reading progress | overview fields | Yes | — | No |
| Legacy index files | disk only | Yes | cleanup action | N/A (admin) |
| `storageLayout` strip | manifest | Was legacy | `dataMigration` | Keep reader |

---

## 11. Test / documentation mismatch

| Classification | Examples |
|----------------|----------|
| **Documented and active** | `docs/TTC_QUERY.md` ↔ `ttcQuery*` tests |
| **Active but undocumented** | Entity structure hub, members feature flag, many AUTO sync roles |
| **Documented but inactive** | `AppModalAutoSyncGuide.jsx` header says imported by Layer — **false** (Vi file used) |
| **Tested but unreachable** | None fully confirmed except orphan modules not in bundle graph |
| **Reachable but untested** | `useAppDirectoryBackup` flows, PDF export, image workflow, `autoSyncDiagnostics` UI |
| **Legacy compatibility only** | `dataMigration.test.js`, legacy list markers |
| **Unknown** | Full settings matrix, all Quản lý tab toggles |

**Lint vs tests:** ESLint reports 20 errors (unused vars, react-hooks rules); tests still pass — indicates **dead assignments** and **rule strictness**, not necessarily runtime bugs.

**Architecture audit doc drift:** Test count 848 → **864**; AUD-001/003 status improved on `main`.

---

## 12. Removal candidates

### RC-001 — `AppModalAutoSyncGuide.jsx`

```text
Remove candidate ID: RC-001
Tên: AppModalAutoSyncGuide.jsx (non-Vi duplicate)
Lý do: Zero import graph entry
Static call-sites: none
Dynamic: lazy import points to Vi file only (AppModalLayer.jsx:26)
Migration: none
Risk: Low — duplicate of Vi module
Verify: npm run build; grep repo for filename
Rollback: git restore file
Khuyến nghị: Safe candidate after build verify
```

### RC-002 — `useEntityNotesFormatDiagnostics.js`

```text
Remove candidate ID: RC-002
Lý do: Exported hook never imported
Risk: Low
Verify: grep + build
Khuyến nghị: Safe candidate
```

### RC-003 — Milestone dead AI handlers in MasterComponents

```text
Remove candidate ID: RC-003
Tên: handleLinkWithAi, formatNotesStructureWithAI, isLinkingAi, isFormattingStructure
Lý do: Superseded by runNotesAiPipeline / handleRunEventAiPipeline; eslint unused
Risk: Low — ~110 LOC
Verify: Milestone modal AI menu still works manually
Khuyến nghị: Low risk cleanup batch
```

### RC-004 — Unused helpers in collectionListCardSync

```text
Remove candidate ID: RC-004
Tên: collectDefaultEntityDetailBitsLegacy, formatAutoListDetailBitsForPreview
Risk: Medium — may have been intended for preview parity
Verify: Compare git history / product intent for list preview
Khuyến nghị: Do not remove until confirm; or wire to tests if still needed
```

### RC-005 — Legacy AUTO list UI path

```text
Remove candidate ID: RC-005
Tên: AppListCardInfoSearch legacy markdown branch
Risk: High for users without collectionViewModel
Verify: Trace all call sites passing collectionViewModel=null
Khuyến nghị: Do not remove — F4 fallback
```

---

## 13. Recommended roadmap

### Keep (A)

Core novel editing, sharded persistence, wiki wrap + opt-out, TTC-Query, deep search, AUTO sync subsystem, migration on load.

### Optimize (B)

- Await or surface disk idle after save (AUD-002).
- Reduce full-novel `structuredClone` on hot paths (patch API adoption).
- Main bundle size / lazy split beyond modals (build warning).

### Consolidate (C)

- Document single wiki-wrap entry for contributors (sync vs async).
- Unify novel update on `commitNovelUpdate` patch API.
- Merge or delete duplicate AutoSync guide file after diff review.

### Verify manually (D)

- List card without `collectionViewModel`.
- Settings → legacy index cleanup on real folder.
- Tab `modalMapForceQuickForm: 'legacy'` in user projects.

### Deprecate (E)

- Milestone standalone link/format handlers (already effectively deprecated).

### Remove only after approval (F)

- RC-001, RC-002, RC-003 (low risk batch).
- RC-004 only after product confirm.

**Suggested order:** (1) persistence UX/tests already improved — monitor; (2) RC-001/002/003 cleanup; (3) consolidate update API; (4) legacy list path decision; (5) monolith file splits (out of scope for deletion audit).

---

## 14. What not to do yet

- Do not remove `autoRelationLegacy`, LEGACY AUTO HTML handling, or TTC legacy field IDs.
- Do not remove sync wiki wrap while Worker fallback exists.
- Do not delete `AppModalAutoSyncGuide.jsx` without confirming Vi file is canonical (content parity).
- Do not remove legacy list preview branch without proving all list cards expose `collectionViewModel`.
- Do not strip migration steps from `dataMigration.js` based on static audit alone.

---

## 15. Audit limitations

- No manual click-through of all modals, context menus, or genre-specific tab configs.
- No measurement of which features users actually use.
- No `eslint --max-warnings 0` gate; lint failures not triaged to runtime impact.
- Worker behavior not exercised in build-only audit (Vitest mocks/disables).
- Duplicate Windows path listings in search (`src\` vs `src/`) are same inode — not duplicate modules.
- Export-level dead code in `MasterComponents.jsx` (5000+ lines) **not exhaustively** traced; only high-confidence orphans reported.

---

## 16. Conclusion

### **B. Nên xử lý một số tính năng/nợ kỹ thuật trước**

Priority IDs:

1. **RC-003 / RC-001 / RC-002** — low-risk dead code cleanup (milestone AI orphans, duplicate modal file, unused hook).
2. **DUP-002** — standardize on patch updates where still using callback clone (maintainability, not deletion).
3. **RC-004** — confirm intent for unused list-card legacy helpers before removal.
4. **F8** — product call on map/force legacy modal flag and members default.
5. **AUD-002** (from architecture audit) — save/persist UX alignment; not a deletion item.

**Not C** — no evidence that legacy/duplicate volume blocks development enough to require a dedicated deprecation program beyond targeted cleanup.

---

## Appendix A — Baseline repository (Part 1)

| Item | Value |
|------|--------|
| Framework | React 19, Tailwind 4 |
| Build | Vite 8 (`vite build --configLoader native`) |
| Test | Vitest 3, jsdom, single-thread pool |
| Entry | `src/main.jsx` → `App.jsx` |
| Source | `src/` (~313 JS/JSX per architecture audit; 501 paths in glob including tests) |
| Workers | `src/workers/autoWrapWikiLinks.worker.js`, `src/deepSearch.worker.js` |
| Persistence | `useAppPersistence.js`, `storageSafe.js`, `directoryHandleStore.js` |
| Migration | `src/dataMigration.js` |
| Docs | `docs/TTC_QUERY.md`, `docs/PLAN-khoi-tao-tab-config.md`, audits |
| Scripts | `scripts/genBundledGenreTabsTemplates.mjs` |
| Sample / bundled data | `public/`, genre templates via store |
| Feature flags | Tab config (`modalMapForceQuickForm`), `tabAutoSyncRole` FEATURE_BY_ROLE, members toggle localStorage (`AppEntityStructureHub.jsx` ~16) |
| Dev-only | Vitest disables wiki Worker (`autoWrapWikiLinksAsync.js` env check) |

**Recent commits (context):** AUD-003 lazy load fix, dirty restore on sync fail, TTC-Query/AUTO list, wiki alias retire, entity transfer.

---

## Appendix B — Baseline grep markers (Part 6)

- `TODO|FIXME|deprecated|legacy` — many **intentional** legacy labels; not equivalent to dead code.
- `@deprecated` exports: `ttcQueryEngine.js`, `ttcQueryVirtualFields.js` — **still referenced** by tests/API.
- `console.warn` in persistence tests/diagnostics — operational logging, not feature flags.

---

*End of feature inventory audit report.*
