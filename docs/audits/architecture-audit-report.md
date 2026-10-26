# Architecture & Code Quality Audit — Tàng Thư Các

**Date:** 2026-10-26  
**Branch:** `main`  
**Scope:** Read-only audit (no source/test/config changes).  
**Working tree:** Uncommitted changes in wiki auto-wrap worker split, `novelDiskLayout`, `wikiLinkOptOut`, `AppEntityDetailNotes`, `entityNotesAiPipeline` (see `git status` at audit time).

---

## 1. Executive summary

Tàng Thư Các is a **browser-only** React 19 + Vite 8 SPA for novel/entity/wiki management. Persistence is **localStorage** and/or **File System Access API** with **sharded on-disk layout**, **IndexedDB shadow drafts**, debounced writes, and a serialized write chain. Domain logic is largely extracted into `src/lib/**` (~150+ modules) and `useApp*.js` hooks, but **`App.jsx` (~4.4k lines)** and **`MasterComponents.jsx` (~5.4k lines)** remain central coordination and UI “god” surfaces.

**Stability:** **848/848 Vitest tests pass** (118 files). **Production build succeeds**; main chunk ~961 kB gzip ~257 kB (Vite warns >500 kB). Workers (`autoWrapWikiLinks`, `deepSearch`) bundle correctly in `dist/assets/`.

**Top risks (evidence-backed):**

| Rank | ID | Severity | Issue |
|------|-----|----------|--------|
| 1 | AUD-001 | P1 | Dirty shard set **consumed before disk write completes**; failed sync can skip re-write until next explicit dirty mark |
| 2 | AUD-002 | P2 | **Success toasts before persistence finishes** (`updateActiveNovelData` → debounced `syncNovel`, not awaited) |
| 3 | AUD-003 | P2 | **Lazy shard load marks shard dirty** without user edit → extra disk work / confusing dirty semantics |
| 4 | AUD-004 | P2 | **Dual mutation APIs**: `commitNovelUpdate` patch path vs callback `structuredClone` + in-place mutate in handlers |
| 5 | AUD-005 | P2 | **Monolithic files** (`App.jsx`, `MasterComponents.jsx`, `useAppEntityMilestoneActions.js`) increase regression cost |
| 6 | AUD-006 | P3 | **Global module-level dirty tracker** not scoped per novel |
| 7 | AUD-007 | P3 | **Worker error** rejects all pending auto-wrap requests (acceptable with fallback on save path) |
| 8 | AUD-008 | P2 | **No automated test** for persistence failure + dirty restoration / failed `syncNovel` retry invariants |

**Recommendation:** **Conclusion B** — continue feature work only after addressing **AUD-001** (and adding tests for persistence failure paths). Other items can proceed in parallel as phased hardening (Phase 0–2 below). **Not** a full architectural rewrite.

---

## 2. Current architecture map

### 2.1 Layers (as implemented)

```text
Browser UI (React)
  App.jsx, AppMainPane, AppModal*, MasterComponents.jsx, AppEntityDetailNotes.jsx
        ↓ props / callbacks
Session & orchestration hooks (src/useApp*.js — 26 files, co-located with App)
  useAppPersistence, useAppEntityMilestoneActions, useAppNovelSelectionAndHydration, …
        ↓
Domain / transforms (src/lib/*.js — pure-ish, Vitest-heavy)
  patchNovelData, autoSyncManager, wikiLinkOptOut, entityCollectionQuery, ttcQuery*, …
        ↓
Persistence & I/O adapters
  useAppPersistence → novelDiskLayout, novelShadowStore, storageSafe, directoryHandleStore
        ↓
Browser APIs
  localStorage, IndexedDB, FileSystemDirectoryHandle, Worker, fetch (Gemini via MasterUtils)
```

**Config / constants:** `MasterEngines.js` (27 importers), `MasterUtils.jsx` (51 importers).

**Not present:** Electron (only `package-lock` mentions electron transitively), React Router (in-app tab state), Redux/Zustand (React `useState` + refs in `App.jsx`).

### 2.2 Repository survey (Part 1)

| Item | Value |
|------|--------|
| Framework | React 19, Tailwind 4 |
| Entry | `src/main.jsx` → `App.jsx` |
| Build | Vite 8 (`vite.config.js`) |
| Test | Vitest 3 + jsdom (`vitest.config.js`, `src/**/*.test.*`) |
| Deploy target | Static web (`README.md`, optional `VITE_BASE`) |
| Global state | `App.jsx`: `activeNovelData`, `novelsMetadata`, refs (`activeNovelDataRef`, …) |
| Persistence | `useAppPersistence.js` |
| Data model | In-memory novel object + `dataMigration.js`; disk manifest in `novelDiskLayout.js` |
| Workers | `src/workers/autoWrapWikiLinks.worker.js`, `deepSearch.worker.js` (via `deepSearchCore.js`) |

**Top-level dirs (depth ≤2):** `src/` (313 `.js/.jsx` files), `public/`, `docs/`, `scripts/`, `dist/` (build output).

### 2.3 Main data flows

#### Startup

1. `main.jsx` mounts `App` in `StrictMode`.
2. `useAppShellState` / `useAppDirectoryBackup` restore folder handle + index (`useAppPersistence.loadNovelData` paths).
3. Genre templates: `genreTabsTemplateStore`, bundled JSON.

#### Hydrate / select novel

- **Entry:** `useAppNovelSelectionAndHydration.js`, `useAppPersistence.loadNovelData` (~668+).
- **Sharded:** manifest + `loadShardsFromNovelDir` / subset load; `__partialData` flag.
- **Migration:** `migrateNovel` strips `storageLayout`; `restoreShardedLayoutIfNeeded` in persistence (~41–46).
- **Race guards:** lazy load in-flight sets (`lazyTabLoadInFlightRef`); partial merge before write in `syncNovel` (~395–420).

#### Edit entity notes → Save

| Step | Location | State touched | Async | Persistence |
|------|----------|---------------|-------|-------------|
| Click Save | `AppEntityDetailNotes.jsx` ~665–771 | `isAiPipelineRunning`, draft | `await` pipeline | — |
| Clean/format (save) | `runNotesAiPipeline` `skipAi: true` | draft text | yes | — |
| Wiki wrap | `applyWikiLinkOptOutsForSaveAsync` + `autoWrapWikiLinksForSave` | text, opt-outs | Worker → fallback | — |
| Commit entity | `handleUpdateEntityInfo` | `activeNovelData` | sync | `syncNovel` debounced |
| Patch novel | `updateActiveNovelData` → `commitNovelUpdate` | ref + state | sync | marks dirty shard |
| Disk | `useAppPersistence.syncNovel` | shadow IDB | 1s debounce, chain | FS API |

**Loading coverage:** Save button disabled while `isAiPipelineRunning` (~664, ~767–771). **Does not** cover debounced disk flush after `handleUpdateEntityInfo`.

#### Auto-wrap wiki (non-save)

- Sync: `autoWrapWikiLinksCore.js` / facade `autoWrapWikiLinks.js`.
- Async save path: `autoWrapWikiLinksAsync.js` + worker.
- Opt-out: `wikiLinkOptOut.js` (`isWikiWrapOptedOut` in core).

#### Dirty shard → write

1. `markShardDirty` / `markAllShardsDirty` (`dirtyShardTracker.js`).
2. `syncNovel` → `consumeDirtyShards()` (**clears global set**) (~460).
3. `buildShardWritePlan` + `writeShardTree` (`novelDiskLayout.js` ~81–116, ~302+).
4. Manifest write + optional `.backup.json` (60s throttle).

#### Undo / delete entity

- `useAppEntityMilestoneActions.js`: `markAllShardsDirty` + `setActiveNovelData` + `syncNovelRef.current` (immediate debounce bypass only if caller passes `immediate` — delete uses default debounced sync ~1227).

#### Multi-tab / AUTO sync

- **No** `BroadcastChannel` / `storage` sync for cross-tab novel editing (grep: none).
- **Tab AUTO sync** = in-novel automation (`autoSyncManager.js`, `tabAutoSync*` libs), not browser tabs.

#### Worker fallback

- `autoWrapWikiLinksForSave`: try Worker, catch → sync core (~74–79 `autoWrapWikiLinksAsync.js`).
- Vitest: `import.meta.env.VITEST` disables Worker (~17–19).

### 2.4 Dependency hotspots

| Module | Role | Imported by (approx.) | Risk |
|--------|------|------------------------|------|
| `MasterUtils.jsx` | Markdown, AI, shared UI helpers | 51 files | God utility, hard to tree-shake |
| `MasterEngines.js` | Constants, field templates | 27 files | Central config |
| `App.jsx` | Global state, wiring | `main.jsx`, integration test only | Change blast radius |
| `useAppPersistence.js` | All disk/index I/O | `App.jsx` only | Single persistence funnel (good) but complex |
| `statusHierarchyParser.js` | Parsing | 30 lib consumers | Wide coupling |
| `collectionListCardSync.js` | AUTO list cards | 17 | Side effects on novel mutate |
| `wikiLinkOptOut.js` | Opt-out merge | 11 | Save + wrap must stay aligned |

**Layer violations (Confirmed):**

- `MasterComponents.jsx` imports **32** `./lib/*` modules — UI bundle pulls domain logic (acceptable for this app size but blurs boundaries).
- **`App.jsx` is not imported by lib** (good).

---

## 3. Findings summary

| ID | Severity | Confidence | Nhóm | Vấn đề | File chính | Tác động |
|----|----------|------------|------|--------|------------|----------|
| AUD-001 | P1 | Confirmed | Persistence | Dirty set consumed pre-write; no restore on failure | `useAppPersistence.js:460`, `dirtyShardTracker.js:12-15`, `novelDiskLayout.js:87-104` | Disk stale until re-edit |
| AUD-002 | P2 | Confirmed | UX / data | Toast “Ghi chép thành công” before disk idle | `useAppEntityMilestoneActions.js:724-728`, `App.jsx:1622` | User trust / support burden |
| AUD-003 | P2 | Confirmed | Persistence | Lazy load calls `markShardDirty` | `useAppNovelSelectionAndHydration.js:223-224` | Redundant writes |
| AUD-004 | P2 | Confirmed | State | Callback updates mutate in clone; patch path preferred but not universal | `patchNovelData.js:55-59`, `useAppEntityMilestoneActions.js:691-710` | Full-novel clone cost, dirty=all |
| AUD-005 | P2 | Confirmed | Structure | 4k–5k line components | `App.jsx`, `MasterComponents.jsx` | Maintainability |
| AUD-006 | P3 | Confirmed | Persistence | Global dirty `Set` | `dirtyShardTracker.js:5-9` | Cross-novel edge cases |
| AUD-007 | P3 | Confirmed | Worker | Worker `error` clears all pending | `autoWrapWikiLinksAsync.js:39-44` | Parallel ops fail together |
| AUD-008 | P2 | Confirmed | Tests | No test for failed sync + dirty recovery | test suite grep | Regression gap |
| AUD-009 | P2 | Likely | Concurrency | Stale auto-wrap if `entityMap` changes mid-flight | save path async | Wrong links rare |
| AUD-010 | P3 | Confirmed | Performance | `structuredClone` whole novel on many handlers | `commitNovelUpdate` callback mode | Large novel latency |
| AUD-011 | P2 | Confirmed | Integrity | Good: abort merge on partial read failure | `useAppPersistence.js:411-419` | Prevents wipe |
| AUD-012 | P2 | Confirmed | Integrity | Good: empty memory + disk shards merge | `useAppPersistence.js:422-437` | Prevents wipe |
| AUD-013 | P3 | Confirmed | Docs | README emphasizes localStorage; sharded FS is primary advanced path | `README.md` vs `useAppPersistence.js` | Onboarding gap |
| AUD-014 | P3 | Confirmed | Build | Main chunk >500 kB | build output | Load time |
| AUD-015 | P3 | Confirmed | WIP | Uncommitted worker/core split | git status | Audit snapshot ≠ remote |

---

## 4. Critical correctness / data risks

### AUD-001 — Dirty shards lost on failed write (P1, Confirmed)

**Evidence:**

- `consumeDirtyShards()` swaps in a new empty `Set` (`dirtyShardTracker.js:12-15`).
- Called at start of folder sync before `writeInPlace` (`useAppPersistence.js:460-496`).
- On write failure, function returns `{ ok: false }` (~539-579) **without** re-inserting dirty keys.
- Next sync with empty dirty set and **warm hash cache** skips shards not in dirty set (`novelDiskLayout.js:93-98`), even if in-memory data changed.

**Impact:** After a failed OneDrive/permission write, **disk may stay old** while IDB shadow + memory hold new data. User may believe data is saved (AUD-002). Recovery: another edit on that shard, `markAllShardsDirty`, or manual “flush” / F5 shadow restore — not automatic.

**Verify:** Simulate `writeInPlace` throw after edit; inspect disk shard JSON vs memory; second sync without new edits.

**Direction:** Consume dirty keys only after successful write, or restore snapshot to tracker on failure. Add test.

**Effort:** Small–medium. **Risk if changed:** Low with tests.

---

### AUD-011 / AUD-012 — Mitigations already present (Positive)

Partial merge failure **aborts** write (`useAppPersistence.js:411-419`). Empty in-memory `data` with disk shards triggers merge (`422-437`). Backup not loaded during partial shard preload (`novelDiskLayout.js:249-250` comment) — prevents overwriting new shards.

---

## 5. Structural conflicts

| Conflict | Evidence | Severity |
|----------|----------|----------|
| sync / async auto-wrap | `autoWrapWikiLinks.js` (sync) vs `autoWrapWikiLinksAsync.js` (Worker) vs `entityNotesAiPipeline` sync wrap | P2 — save path uses async + fallback; AI menu uses sync |
| core / facade | `autoWrapWikiLinks.js` re-exports core only | Intentional |
| update / patch / clone | `commitNovelUpdate` function → `dirty: 'all'` vs patch → single shard (`patchNovelData.js:55-67`) | P2 |
| save / persist / sync | UI “save” = memory commit + debounced `syncNovel`; shadow immediate | Naming confusion P3 |
| legacy AUTO blocks | `collectionListCardSync.js` LEGACY HTML markers | Intentional migration |
| Hooks path | User audit listed `src/hooks/` — **not used**; hooks live as `src/useApp*.js` | Doc mismatch |

**API naming table (selected):**

| API | File | Behavior | Similar | Risk |
|-----|------|----------|---------|------|
| `updateActiveNovelData(fn)` | `App.jsx:1604` | `structuredClone` + dirty all | `updateActiveNovelData({ lonId, updater })` | Performance + dirty scope |
| `setActiveNovelData` direct | milestone/hydration hooks | Bypasses `commitNovelUpdate` | `updateActiveNovelData` | Must pair with `markAllShardsDirty` |
| `syncNovel(..., { immediate })` | `useAppPersistence.js:595` | Flush debounce | default debounced | Callers rarely await |
| `applyWikiLinkOptOutsForSave` vs `...Async` | `wikiLinkOptOut.js` | injectable wrap fn | sync vs Worker | Must keep parity (tests exist) |

---

## 6. Duplicate / dead code

| Item | Classification | Evidence |
|------|----------------|----------|
| `autoWrapWikiLinksCore` + facade + async | **Intentional compatibility** | WIP split in working tree |
| `collectDefaultEntityDetailBitsLegacy` | **Intentional compatibility** | `collectionListCardSync.js:888+` |
| `autoRelationLegacy` cleanup | **Active migration** | hydration hook ~260 |
| Duplicate path listings in glob (`src\` vs `src/`) | **Windows same file** | No duplicate modules |
| TODO/FIXME in `src` | **None found** | grep 0 |
| `console.log/warn` | **Some retained** | persistence, disk layout (~8 files) — mostly diagnostics |

**Likely dead / needs runtime check:** None confirmed without call-site graph; large export surface from `MasterComponents` — **Suspected** unused exports not exhaustively traced.

---

## 7. Async / concurrency findings

| Finding | Confidence | Notes |
|---------|------------|-------|
| Serialized novel disk writes | Confirmed | `novelDiskWriteChainRef` ~583-587 |
| Debounced coalescing per novel id | Confirmed | ~612-637, 1000ms policy |
| Dirty consume race with rapid edits | Likely | Edits during `runFolderSync` rely on new marks after consume |
| Worker stale results | Likely | No request generation guard on novel version |
| Save double-click | Mitigated | `isAiPipelineRunning` on save button |
| Unmount during save | Suspected | No explicit abort flag on `AppEntityDetailNotes` async save |
| `autoWrap` worker error nukes pending | Confirmed | `autoWrapWikiLinksAsync.js:39-44` |
| Gemini AI calls | Async | `entityNotesAiPipeline.js`; errors surfaced via toast on save pipeline |

**Boundary summary:**

```text
React click → async IIFE (save)     [no cancel token]
  → Worker postMessage               [requestId only]
  → handleUpdateEntityInfo (sync)    [memory commit]
  → syncNovel (debounced Promise)    [chain serialized, dirty consumed early]
  → FS createWritable                [retry policy in novelDiskWritePolicy]
```

---

## 8. React / state findings

- **`activeNovelDataRef` synced in `updateActiveNovelData`** before `setState` (`App.jsx:1619-1620`) — reduces stale closure for sync entry.
- **Owner-timeline save path** mutates entity inside callback (`useAppEntityMilestoneActions.js:691-710`) forcing **full novel clone** (`commitNovelUpdate` function branch).
- **Lazy hydrate** replaces entire novel (`useAppNovelSelectionAndHydration.js:273-276`) with `markAllShardsDirty` — wide write plan.
- **Error boundaries:** `AppSectionErrorBoundary.jsx` exists (split file in working tree).
- **Deferred search:** `useDeferredValue` imported in `App.jsx` for heavy UI paths.

---

## 9. Persistence findings

| Topic | Assessment |
|-------|------------|
| Shard layout | `data/<encoded lon>/<encoded nho>.json` + manifest |
| Dirty filtering | Only when `dirtyKeys.size > 0`; else hash diff all keys |
| Hash cache | Per `dirHandle` WeakMap — new handle = cold cache |
| Backup | Full novel JSON max once per 60s; best-effort catch empty |
| Shadow | IDB on every sync enqueue; cleared on success |
| localStorage mode | Full JSON + backup keys via `storageSafe.js` |
| Schema version | `dataMigration.js` + tests |
| Import/export | `useAppDirectoryBackup.js` |

**AUD-003 detail:** Loading a missing shard from disk marks it dirty (`useAppNovelSelectionAndHydration.js:223`) though content matches disk — may force rewrite on next sync.

---

## 10. Test findings

**Run:** `npm run test` — **118 files, 848 tests, all pass** (~21s).

**Strengths:**

- Broad `src/lib/*.test.js` coverage (wiki, TTC-Query, disk layout, dirty tracker, opt-out, auto-wrap core).
- Component tests for `AppEntityDetailNotes` save/wrap/clean flows.
- Integration: `AppRiskFlows.integration.test.jsx` (keyboard/modals).
- Regression suites for TTC-Query parser/engine.

**Gaps (high value):**

- Failed `syncNovel` → dirty restoration (AUD-001).
- End-to-end: memory vs disk after debounced write + `awaitNovelDiskIdle`.
- Worker failure during save (partially covered by `wikiLinkOptOut.saveAsync.test.js` + component tests).
- Direct `setActiveNovelData` paths without dirty marks (static audit: delete/undo **do** mark all dirty).
- Multi-tab / concurrent writers (N/A product feature today).

**Coverage command:** Not configured in `package.json` scripts; `--coverage` not run.

---

## 11. Security findings

| ID | Severity | Finding | Evidence |
|----|----------|---------|----------|
| SEC-001 | P3 (local app) | Editor highlight uses `dangerouslySetInnerHTML` with escaping | `EntityNotesHighlightedEditor.jsx:166`, `entityNotesEditorWikiHighlight.js:13-17,45` |
| SEC-002 | P3 | Modal message HTML with limited tag restore | `MasterComponents.jsx:5051` |
| SEC-003 | P3 | Global CSS via innerHTML | `AppPhongChuVaTheme.jsx:228` static string |
| SEC-004 | P2 Likely | Long-note regex / wrap CPU (ReDoS-style **Likely** low in local trusted data) | auto-wrap scans — needs profiling for megabyte notes |
| SEC-005 | P3 | FS API permission prompts — user-granted paths only | `useAppPersistence.js` permission helpers |
| SEC-006 | P3 | Gemini API keys in client state | `MasterUtils` / notes AI — expected for local tool |

**No `dangerouslySetInnerHTML` on raw user markdown preview without pipeline review** — markdown path uses dedicated renderer tests (`renderEntityNotesMarkdown.test.jsx`).

---

## 12. Performance risks

| Risk | Level | Evidence |
|------|-------|----------|
| Full novel `structuredClone` | Scales with novel size | `patchNovelData.js:57` |
| Main bundle ~961 kB | Confirmed | build output |
| CSS post 48% build time | Confirmed | PLUGIN_TIMINGS warning |
| Deep search / entity index rebuild | Idle scheduled | `App.jsx:1594-1601` |
| Virtual lists | Partial | `@tanstack/react-virtual` in deps; collection views use lib pagination |
| Per-keystroke highlight debounce 250ms | Mitigated | `EntityNotesHighlightedEditor.jsx:106-110` |
| Worker payload size | Scales with note + entityMap | save path |

---

## 13. Recommended roadmap

### Phase 0 — No logic change (immediate)

- Document **save vs persist** semantics for contributors (`AGENTS.md` / README FS path).
- Add **manual test checklist** for OneDrive lock + “Cho phép ghi lại” toast.
- Track **AUD-001** test spec (fail write → disk unchanged → fix → write succeeds).

### Phase 1 — Correctness / data (before major features)

1. **AUD-001:** Restore dirty keys or defer `consumeDirtyShards` until successful write.
2. **AUD-002:** Optional “Đang ghi đĩa…” or await `syncNovel` / `awaitNovelDiskIdle` on explicit Save (product decision).
3. **AUD-003:** Remove or narrow `markShardDirty` on read-only lazy load.

### Phase 2 — Module boundaries (low risk refactors)

- Migrate remaining **callback** `updateActiveNovelData` hot paths to **patch** descriptors (notes owner path).
- Continue splitting modals / `App.jsx` (pattern already established in file header comment).

### Phase 3 — Dead code cleanup

- After call-site proof, trim `MasterComponents` / unused exports.

### Phase 4 — Performance

- Code-split `index` chunk (dynamic import modals already partial in build output).
- Measure clone + wrap on large novels before optimizing.

---

## 14. What NOT to do yet

- **Full rewrite** of persistence or state management — current funnel works; fix AUD-001 first.
- **Remove legacy AUTO migration** paths without migration tests.
- **Merge sync/async wrap** into one implementation without Worker parity tests.
- **Global state library** migration without bounded scope.
- **Aggressive chunk splitting** without measuring LCP on target laptops.

---

## 15. Audit limitations

- **Manual UX flows** (folder permission, OneDrive lock, real 10k-entity novels) not exercised end-to-end in this audit.
- **Production build** was run once (updates `dist/`); chunk analysis from that snapshot only.
- **No coverage report** generated.
- **Uncommitted WIP** (worker/core split) may diverge from last commit `f731419`.
- **Dead export analysis** not exhaustive (would need bundler trace or knip).
- **Electron / backend** not in scope (not part of product).

---

## Detailed finding records (selected)

### AUD-001

- **Severity:** P1  
- **Confidence:** Confirmed  
- **Category:** Persistence  
- **File/line:** `useAppPersistence.js:460`; `dirtyShardTracker.js:12-15`; `novelDiskLayout.js:93-98`  
- **Impact:** Stale disk after failed write  
- **Reproduction:** Force FS write error after editing one shard; observe second sync skips shard when cache warm  
- **Direction:** Defer consume or restore on failure  
- **Effort:** S  
- **Dependencies:** Vitest unit + mocked FS  
- **Risk if changed:** Low with tests  

### AUD-002

- **Severity:** P2  
- **Confidence:** Confirmed  
- **Category:** UX  
- **File/line:** `useAppEntityMilestoneActions.js:724-728`; `App.jsx:1620-1622`  
- **Impact:** False “saved” perception  
- **Verification:** Network/throttle disk; toast timing  
- **Direction:** Await disk or secondary status indicator  
- **Effort:** S–M  

### AUD-005

- **Severity:** P2  
- **Confidence:** Confirmed  
- **Category:** Maintainability  
- **File/line:** `App.jsx` (~4373 lines); `MasterComponents.jsx` (~5435 lines)  
- **Impact:** Feature cost, review fatigue  
- **Direction:** Continue modal/hook extraction per `App.jsx` header map  
- **Effort:** Ongoing  

---

## Appendix A — Scripts & dependencies

**package.json scripts:** `dev`, `build`, `lint`, `test`, `gen:genre-templates`, `preview`.

**Runtime deps:** react, react-dom, tailwind, lucide-react, @tanstack/react-virtual.

**Dev:** vite 8, vitest 3, eslint 9, testing-library, jsdom.

---

## Appendix B — Test run artifact

```
Test Files  118 passed (118)
Tests       848 passed (848)
Duration    ~21s
```

---

## Appendix C — Build artifact (2026-10-26)

- Workers: `autoWrapWikiLinks.worker-*.js` (~9.36 kB), `deepSearch.worker-*.js` (~4.66 kB)
- Warning: chunk >500 kB (`index-*.js` ~961 kB)
- Build time ~16s

---

## Kết luận bắt buộc

### **B. Nên xử lý một số vấn đề nền tảng trước**

**Ưu tiên:**

1. **AUD-001** — dirty shard consumption vs failed disk write (kèm test).  
2. **AUD-002** — làm rõ trạng thái lưu đĩa sau Save (UX hoặc await có kiểm soát).  
3. **AUD-008** — bổ sung test persistence failure / retry.  

Sau đó có thể tiếp tục phát triển feature; **không** cần refactor kiến trúc toàn phần (không chọn **C**). Không có P0 đủ bằng chứng để **cấm** mọi feature work, nhưng AUD-001 là rủi ro mất đồng bộ đĩa đáng xử lý trước khi mở rộng luồng persistence phức tạp hơn.
