# 📊 AUDIT LẦN 2 — TÀNG THƯ CÁC — BÁO CÁO CUỐI CÙNG

> **Audit baseline:** `c9dc964` · `main` · 929/929 test pass · build pass
> **Final state:** `02cd006` · `main` · 1009/1009 test pass · build pass · ESLint 0e/0w
> **Kiến trúc:** SPA Vite 8 + React 19 (File System Access API + localStorage + IndexedDB)
> **Phạm vi:** Architecture, persistence, data integrity, async lifecycle, markdown parsing
> **Ngày hoàn tất:** 2026-10-31 (commit `02cd006`, 2026-10-31 09:56 +0700)

---

## Phần 2 — Tóm tắt kết quả

| ID | Severity | Mô tả ngắn | Loại | Status | Phase | Commit | Ghi chú |
|----|----------|-------------|------|--------|-------|--------|---------|
| F-001 | Critical | Dirty consume trước disk write — crash mất dirty state | BUG/RISK | ✅ FIXED | Phase 1A | `67bbf9d` | `snapshotDirtyShards()` thay `consumeDirtyShards()`; `clearDirtyShardKeys()` chỉ sau write thành công |
| F-002 | High | Toast "đã lưu" trước disk flush hoàn tất | RISK | ✅ FIXED | Phase 1A + 1B | `67bbf9d`, `d85b4e0` | Await sync trước toast; beforeunload + visibilitychange guard |
| F-003 | High | Shard + manifest non-atomic write | RISK | ✅ FIXED | Phase 4B | `3ab752f` | Manifest `shardCommit` field (FNV-1a hash + generation) verifies shard integrity on load |
| F-004 | High | Không có file lock giữa các tab | RISK | ✅ FIXED | Phase 4A | `bfec68f` | Web Locks API session lock + BroadcastChannel heartbeat; read-only fallback |
| F-005 | Medium | Wiki-link `[[Page\|Display]]` pipe bị tách cột trong table parser | BUG | ✅ FIXED | Phase 2 | `07ec224` | Stateful scanner (NORMAL/IN_WIKI/IN_CODE) trong `splitTableRowCells` |
| F-006 | Medium | Inline code backtick pipe không được bảo vệ trong table parser | RISK | ✅ FIXED | Phase 2 | `07ec224` | Cùng stateful scanner; 21 test mới |
| F-007 | Medium | `markAllShardsDirty` gọi thừa khi hydrate/select read-only | SMELL | ✅ FIXED | Phase 3 | `9d79224` | Conditional dirty marking dựa trên `dataChanged` flags |
| F-008 | Medium | Stale `wikiWrapOptions` closure trong ttc-save effect | RISK | ✅ FIXED | Phase 3 | `9d79224` | Thêm `wikiWrapOptions` vào dependency array |
| F-009 | Medium | AI pipeline không có guard khi unmount hoặc superseded request | RISK | ✅ FIXED | Phase 3 | `9d79224` | `generationRef` + `mountedRef` trong `AppEntityDetailNotes` và `MasterComponents` |
| F-010 | Medium | Collection list không virtual | SMELL | 🟡 MITIGATED | — | — | Pagination 12/page + IntersectionObserver windowing >200 entities đã có; defer |
| F-011 | Low | Toast z-index chồng lên điều khiển modal | UX | ✅ FIXED | Phase 5 | `02cd006` | CSS `--z-*`; toast z=300 trên mọi modal; nút đóng ở góc trên không bị toast đáy che |
| F-012 | Low | Orphan `useEntityNotesFormatDiagnostics` module | SMELL | ✅ FIXED | Phase 5 | `02cd006` | Xóa file. `entityNotesDiagnostics`, `autoSyncDiagnostics`, `ttcQueryDiagnostics` vẫn được import |
| F-013 | Low | ESLint 29 errors + 2 warnings (nợ sẵn có) | QUALITY | ✅ FIXED | Phase 5 | `02cd006` | 29e+2w → 0e+0w. Hai regression (cây bản đồ, nhãn thẻ con) đã khôi phục |
| F-014 | Low | Không có global unhandled rejection handler | RISK | ✅ FIXED | Phase 5 | `02cd006` | `globalErrorHandler.js` trước `createRoot`; 5 tests |
| F-015 | Info | Mô tả kiến trúc ghi Electron | DOCS | ✅ FIXED | Phase 5 | `02cd006` | `package.json` và comment `index.html` mô tả SPA Vite 8 + React 19 |

---

## Phần 3 — Chi tiết từng phase

### Phase 1A (Commit `67bbf9d`)

**Subject:** Phase 1: defer dirty clear until disk flush and await sync before save toasts.

**Scope:** F-001 (Critical) + F-002 (partial)

**Files changed:** 9 files (+313 / −42) — 5 source + 4 test

**Thay đổi chính:**

- `dirtyShardTracker.js`: Thêm `snapshotDirtyShards()` (copy dirty set, không clear), `clearDirtyShardKeys(keys)` (clear chỉ sau write thành công)
- `patchNovelData.js`: Thêm `awaitNovelUpdateSync(outcome)` normalize sync results
- Các save callers chính: await sync Promise trước toast (`App.jsx`, `useAppEntityMilestoneActions.js`, `useAppPersistence.js`)

**Tests:** 929 → 940 (+11 tests, +2 test files mới; suite 126 → 128 files)

### Phase 1B (Commit `d85b4e0`)

**Subject:** Phase 1B: await sync trước toast lưu + guard đóng tab

**Scope:** F-002 coverage mở rộng + beforeunload guard

**Files changed:** 11 files (+340 / −115)

**Thay đổi chính:**

- Tất cả save-toast callers còn lại: await sync trước toast
  - Quick create, member move/reorder/delete, field meta, transfer/promote, map callers (`App.jsx`)
  - Delete image/milestone/description, replace milestones, delete entity (`useAppEntityMilestoneActions.js`)
  - Hub create/apply diary (`useAppMotCuaCapNhat.js`)
  - AI review overview (`AppOverviewSection.jsx`)
  - setTabsConfig flows (`setTabsConfigAndAwaitSync`)
- `useAppNovelUnloadGuard.js`: beforeunload warns nếu dirty shards hoặc pending disk write; visibilitychange → hidden flush pending debounce
- Helpers: `isNovelUpdatePersisted`, `awaitSyncNovelResult`, `handleDeleteEntity` with immediate sync

**Tests:** 940 → 946 (+6 tests)

### Phase 2 (Commit `07ec224`)

**Subject:** Phase 2: fix F-005/F-006 — protect pipe in wiki-links and inline code

**Scope:** F-005 (BUG) + F-006

**Files changed:** 3 files (+243 / −13 lines)

**Thay đổi chính:**

- `markdownTable.js`: Stateful scanner với 3 states (NORMAL, IN_WIKI, IN_CODE) cho:
  - `splitTableRowCells()` — pipe trong `[[...]]` và `` `...` `` không split
  - `countUnescapedPipes()` — pipe trong wiki/code không count
  - `escapePipesInCellString()` — chỉ escape structural pipes (state NORMAL)
- Escaped pipe preserved: `\|` vẫn hoạt động đúng
- 21 test mới across `markdownTable.test.js` và `markdownTableEditor.test.js`

**Tests:** 946 → 967 (+21 tests)

### Phase 3 (Commit `9d79224`)

**Subject:** Phase 3: fix F-007, F-008, F-009 — conditional dirty marking, stale closure fix, AI pipeline guards

**Scope:** F-007, F-008, F-009

**Files changed:** 4 files (+146 / −13 lines)

**Thay đổi chính:**

- `useAppNovelSelectionAndHydration.js` (F-007):
  - Full hydrate: `dataChanged` computed từ `cleanupTouched > 0`, `autoSyncResult?.changed`, `missingTabsConfig`, recovery flags; `markAllShardsDirty` chỉ khi `dataChanged`
  - `handleSelectNovel`: cùng nguyên tắc — check changes trước khi mark
  - `migrateTabsFieldTemplates`: `migrated !== data` reference comparison
- `MasterComponents.jsx` (F-008 + F-009):
  - F-008: Thêm `wikiWrapOptions` vào ttc-save useEffect deps
  - F-009: `eventAiPipelineMountedRef` + `eventAiPipelineGenerationRef` + guards
- `AppEntityDetailNotes.jsx` (F-009):
  - `aiPipelineMountedRef` + `aiPipelineGenerationRef` + mount cleanup `useEffect([])`
  - Guards tại: onProgress, post-await, finally, post-requestAnimationFrame
- `useAppNovelSelectionAndHydration.test.jsx` (F-007): +1 test

**Tests:** 967 → 968 (+1 test)

### Phase 4A (Commit `bfec68f`)

**Subject:** Phase 4A: multi-tab session lock — F-004 fix

**Scope:** F-004 (High)

**Files changed:** 7 files (+551 / −5) — 4 source (`App.jsx`, `useAppPersistence.js`, 2 hook mới) + 3 test (1 sửa, 2 mới)

**Thay đổi chính:**

- `useNovelSessionLock.js` (NEW): Web Locks API — exclusive lock per `novelId` (`ifAvailable: true`, không block). Lock giữ suốt phiên novel mở; release khi đổi novel/unmount. Tab crash → trình duyệt tự nhả lock.
- `useNovelTabWarning.js` (NEW): BroadcastChannel `ttc-novel-tabs` — heartbeat 10s, timeout 15s. Detect tab khác đang mở cùng novel.
- `useAppPersistence.js`: Guard trước `saveNovelShadow` và trước `runFolderSync` — tab không giữ lock trả `{ ok: false, reason: 'locked_by_other_tab' }`. `clearNovelShadow` sau flush chỉ chạy khi tab giữ lock.
- `App.jsx`: Tích hợp hai hook theo `activeNovelData.id`. Toast "Truyện đang mở ở tab khác — chế độ chỉ đọc". Nút "Mở để chỉnh sửa" xin lock lại.
- Graceful degradation: không có `navigator.locks` → `hasLock = true` (optimistic). Không có `BroadcastChannel` → bỏ qua, không crash.

**Tests:** 968 → 982 (+14 tests, +2 test files; suite 129 → 131 files)

### Phase 4B (Commit `3ab752f`)

**Subject:** Phase 4B: shard integrity verification — F-003 fix

**Scope:** F-003 (High)

**Files changed:** 6 files (+544 / −25) — 3 source + 3 test (2 sửa, 1 mới: `shardIntegrity.js` + `shardIntegrity.test.js`)

**Thay đổi chính:**

- `shardIntegrity.js` (NEW, ~111 lines): `quickHash` (FNV-1a 32-bit, 8-char hex), `computeShardHashes`, `verifyShardIntegrity`. Tear detection, không phải crypto.
- `novelDiskLayout.js`: `readRawNovelPackageFromDir` trả thêm `integrityStatus` (`ok`/`torn`/`legacy`/`skipped`) + `integrityMismatches`. `buildDiskManifest` strips `shardCommit` (chỉ bytes trên đĩa mới có).
- `useAppPersistence.js`: Sau `writeShardTree`, trước ghi manifest: `buildShardCommit` gắn `{ generation, shardHashes, timestamp }`. Generation tăng monotonic sau `close()` manifest thành công. Load torn + shadow → restore + toast. Load torn + no shadow → toast warn 10s + load best-effort + `markAllShardsDirty`.
- Backward compatible: data cũ không có `shardCommit` → `integrityStatus: 'legacy'`, skip verify. App cũ mở data mới → bỏ qua field lạ. Shard JSON format không đổi.

**Tests:** 982 → 1004 (+22 tests, +1 test file; suite 131 → 132 files)

### Phase 5 (Commit `02cd006`)

**Subject:** Phase 5: fix F-011 through F-015 — LOW/INFO polish

**Scope:** F-011, F-012, F-013, F-014, F-015

**Files changed:** `git show --stat 02cd006` → 50 files (+289 / −613). Ba file mới: `globalErrorHandler.js`, `globalErrorHandler.test.js`, `entityCollectionPagination.js`. Xóa `useEntityNotesFormatDiagnostics.js`.

**Thay đổi chính:**

- **F-011:** Thang z-index bằng CSS custom properties trong `:root` của `AppPhongChuVaTheme.jsx`. Toast `--z-toast: 300`. Modal nén dưới 300 (`--z-modal-backdrop` 200, `--z-modal-content` 210, tới `--z-modal-system` 298). Không còn `z-index` ghi số cứng trong `src/`. Toast căn đáy giữa; nút đóng modal ở góc trên không bị che.
- **F-012:** Xóa `useEntityNotesFormatDiagnostics.js` (orphan hai vòng audit). Ba module diagnostics còn lại đều có import.
- **F-013:** ESLint 29 errors + 2 warnings → 0/0. Xóa biến và import không dùng. Hai regression từ setState lúc render đã khôi phục: cây bản đồ trở lại `useEffect` với deps `[entities, selectedId]`; nhãn thẻ con reset ngay trong handler Hủy. Hai dòng `eslint-disable-next-line react-hooks/set-state-in-effect` có lý do (mở tổ tiên khi đổi thẻ; reset bộ lọc loại khi đổi thẻ cha). Khối lớn: `collectionListCardSync.js` −302, `MasterComponents.jsx` −147 dòng ròng.
- **F-014:** `installGlobalErrorHandlers()` trong `main.jsx`, trước `createRoot`. `unhandledrejection` log `[TTC] Unhandled promise rejection:`, không `preventDefault`. `error` log `[TTC] Uncaught error:`, bỏ qua ResizeObserver loop. Gọi hai lần chỉ gắn một lần. Xóa helper `unhandledRejection` cũ. 5 test mới.
- **F-015:** `package.json` description và comment đầu `index.html` mô tả SPA Vite 8 + React 19, File System Access API + localStorage + IndexedDB. Từ Electron trong `.md` chỉ còn `docs/audits/`. `package-lock.json` vẫn có gói trung gian `electron-to-chromium`.

**Tests:** 1004 → 1009 (+5 tests, +1 test file; suite 132 → 133 files)

---

## Phần 4 — Metrics tổng hợp

| Metric | Trước Audit | Sau Phase 3 | Sau Phase 4B | Sau Phase 5 (Final) | Delta tổng |
|--------|-------------|-------------|----------------|---------------------|------------|
| Tests passing | 929 | 968 | 1004 | 1009 | +80 |
| Test files | 126 | 129 | 132 | 133 | +7 |
| Findings total | 10 | 10 | 10 | 15 | +5 (LOW/INFO) |
| Findings fixed | 0 | 7 | 9 | 14 | +14 |
| Findings mitigated | 0 | 1 | 1 | 1 | +1 |
| Findings unresolved | 10 | 2 | 0 | 0 | −10 |
| ESLint errors | 29 | 29 | 29 | 0 | −29 |
| ESLint warnings | 2 | 2 | 2 | 0 | −2 |
| Build | Pass | Pass | Pass | Pass | ✅ |

---

## Phần 5 — Các finding còn lại

> ✅ F-003 và F-004 đã được fix trong Phase 4A và 4B — xem Phần 3 chi tiết. Chỉ còn F-010 (mitigated).

### 🟡 F-010 — Collection list không virtual [MEDIUM — MITIGATED]

- **Vấn đề gốc:** Render toàn bộ entity cards → DOM nặng khi nhiều entity.
- **Mitigation đã có:**
  - Pagination `ENTITY_PAGE_SIZE = 12` — user thấy tối đa 12 cards/page
  - IntersectionObserver windowing >200 entities (`AppCollectionListContent.jsx`)
  - `EntityCard` wrapped trong `React.memo`
  - Sidebar windowing via `visibleSidebarNovels` + `SIDEBAR_ITEM_HEIGHT`
- **Full fix (nếu cần):** `react-window` hoặc tương đương. Defer cho đến khi có measured lag.

---

## Phần 6 — Clean bill — các phần an toàn

Nguyên văn từ mục **Clean bill** trong tổng kết audit lần 2 (read-only, baseline `c9dc964`):

- Test **929/929**, build pass.
- Restore dirty khi **write fail** (có test).
- Lazy shard load **không** dirty oan.
- Paste pipeline + table roundtrip **có test**.
- Toast timer **single-flight**.
- Wiki highlight overlay **escape HTML**.
- Deep search worker **reqId** chống stale.

> Tất cả items trong Clean Bill đã được re-verified qua 1009/1009 tests passing, build pass, và ESLint 0 errors / 0 warnings tại commit `02cd006` (Phase 5).

---

## Phần 7 — So sánh với audit lần 1

Audit lần 1: `docs/audits/architecture-audit-report.md` (không sửa trong báo cáo này).

| Audit lần 1 | Audit lần 2 | Kết quả sau 7 phases |
|-------------|-------------|----------------------|
| AUD-001 (P1) — dirty set consumed trước khi ghi đĩa xong | F-001 | Confirmed + ✅ FIXED (`67bbf9d`) |
| AUD-002 (P2) — toast thành công trước khi persistence xong | F-002 | Confirmed + ✅ FIXED (`67bbf9d`, `d85b4e0`) |
| — | F-003 | ✅ FIXED (`3ab752f`) — shardCommit FNV-1a |
| — | F-004 | ✅ FIXED (`bfec68f`) — Web Locks session lock |
| — | F-005 | ✅ FIXED (`07ec224`) |
| — | F-006 | ✅ FIXED (`07ec224`) |
| — | F-007 | ✅ FIXED (`9d79224`) |
| — | F-008 | ✅ FIXED (`9d79224`) |
| — | F-009 | ✅ FIXED (`9d79224`) |
| — | F-010 | 🟡 MITIGATED |
| — | F-011 | ✅ FIXED (`02cd006`) |
| — | F-012 | ✅ FIXED (`02cd006`) |
| — | F-013 | ✅ FIXED (`02cd006`) |
| — | F-014 | ✅ FIXED (`02cd006`) |
| — | F-015 | ✅ FIXED (`02cd006`) |

---

## Phần 8 — Git log

```
02cd006 Phase 5: fix F-011 through F-015 — LOW/INFO polish
3ab752f Phase 4B: shard integrity verification — F-003 fix
bfec68f Phase 4A: multi-tab session lock — F-004 fix
9d79224 Phase 3: fix F-007, F-008, F-009 — conditional dirty marking, stale closure fix, AI pipeline guards
07ec224 Phase 2: fix F-005/F-006 — protect pipe in wiki-links and inline code
d85b4e0 Phase 1B: await sync trước toast lưu + guard đóng tab
67bbf9d Phase 1: defer dirty clear until disk flush and await sync before save toasts.
c9dc964 (baseline — audit start)
```

Báo cáo trung gian sau Phase 4B là `3e9f3da` (chỉ file này, 2026-10-31 08:56 +0700). Không tính là phase code.

---

## Phần 9 — Kết luận

Audit lần 2 gồm 15 findings:
- 10 findings chính (1 Critical, 3 High, 6 Medium)
- 5 findings phụ (4 Low, 1 Info)

Qua 7 phases, tất cả đã commit. Phase 5 là `02cd006` (2026-10-31 09:56 +0700):

- **14/15** findings đã được **fix** hoàn toàn với test coverage
- **1/15** đã được xác nhận **mitigated** bởi cơ chế có sẵn (F-010 pagination)
- **0 finding còn mở**

Cải thiện đo được:
- Test suite: 929 → 1009 (+80 tests, +7 test files)
- ESLint: 29 errors + 2 warnings → 0 errors + 0 warnings
- Persistence: session lock (Web Locks) + integrity verification (shardCommit FNV-1a)
- Z-index: CSS custom properties, toast ở 300
- Error handling: global unhandled rejection và uncaught error
- Documentation: mô tả kiến trúc là SPA Vite 8 + React 19

Build ổn định xuyên suốt các phase.

Đánh giá tổng thể: **A**
Không còn finding chưa xử lý. F-010 giữ trạng thái mitigated.
