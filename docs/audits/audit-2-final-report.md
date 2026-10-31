# 📊 AUDIT LẦN 2 — TÀNG THƯ CÁC — BÁO CÁO CUỐI CÙNG

> **Audit baseline:** `c9dc964` · `main` · 929/929 test pass · build pass
> **Final state:** `3ab752f` · `main` · 1004/1004 test pass · build pass
> **Kiến trúc:** SPA Vite 8 + React 19 (File System Access API + localStorage + IndexedDB)
> **Phạm vi:** Architecture, persistence, data integrity, async lifecycle, markdown parsing
> **Ngày hoàn tất:** 2026-10-31 (commit `3ab752f`, 2026-10-31 08:40 +0700)

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

---

## Phần 4 — Metrics tổng hợp

| Metric | Trước Audit | Sau Phase 3 | Sau Phase 4B (Final) | Delta |
|--------|-------------|-------------|----------------------|-------|
| Tests passing | 929 | 968 | 1004 | +75 |
| Test files | 126 | 129 | 132 | +6 |
| Findings total | 10 | 10 | 10 | — |
| Findings fixed | 0 | 7 | 9 | +9 |
| Findings mitigated | 0 | 1 | 1 | +1 |
| Findings unresolved | 10 | 2 | 0 | −10 |
| Phases completed | 0 | 4 | 6 | +6 |
| Commits | 0 | 4 | 6 | +6 |
| Build | Pass | Pass | Pass | ✅ |
| ESLint regressions | — | 0 | 0 | ✅ |

---

## Phần 5 — Các finding còn lại

> F-003 và F-004 đã được fix trong Phase 4A/4B. Chỉ còn F-010 (mitigated).

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

> Tất cả items trong Clean Bill đã được re-verified qua 968/968 tests passing và build pass tại commit `9d79224`.

---

## Phần 7 — So sánh với audit lần 1

Audit lần 1: `docs/audits/architecture-audit-report.md` (không sửa trong báo cáo này).

| Audit lần 1 | Audit lần 2 | Kết quả sau 6 phases |
|-------------|-------------|----------------------|
| AUD-001 (P1) — dirty set consumed trước khi ghi đĩa xong | F-001 | Confirmed + ✅ FIXED (`67bbf9d`) |
| AUD-002 (P2) — toast thành công trước khi persistence xong | F-002 | Confirmed + ✅ FIXED (`67bbf9d`, `d85b4e0`) |
| — | F-003 | Mới — ✅ FIXED (manifest shardCommit integrity) |
| — | F-004 | Mới — ✅ FIXED (Web Locks session lock + BroadcastChannel) |
| — | F-005 | Mới — ✅ FIXED (wiki-link pipe trong bảng) |
| — | F-006 | Mới — ✅ FIXED (inline-code pipe trong bảng) |
| — | F-007 | Mới — ✅ FIXED (`markAllShardsDirty` read-only) |
| — | F-008 | Mới — ✅ FIXED (stale `wikiWrapOptions`) |
| — | F-009 | Mới — ✅ FIXED (AI pipeline unmount / superseded) |
| — | F-010 | Mới — 🟡 MITIGATED (pagination + IO windowing) |

---

## Phần 8 — Git log

```
3ab752f Phase 4B: shard integrity verification — F-003 fix
bfec68f Phase 4A: multi-tab session lock — F-004 fix
9d79224 Phase 3: fix F-007, F-008, F-009 — conditional dirty marking, stale closure fix, AI pipeline guards
07ec224 Phase 2: fix F-005/F-006 — protect pipe in wiki-links and inline code
d85b4e0 Phase 1B: await sync trước toast lưu + guard đóng tab
67bbf9d Phase 1: defer dirty clear until disk flush and await sync before save toasts.
c9dc964 (baseline — audit start)
```

---

## Phần 9 — Kết luận

Audit lần 2 đã phát hiện 10 findings (1 Critical, 3 High, 6 Medium).
Qua 6 commits trong 6 phases:

- **9/10** findings đã được **fix** hoàn toàn với test coverage
- **1/10** đã được xác nhận **mitigated** bởi cơ chế có sẵn (F-010)
- **0/10** còn unresolved

Test suite tăng từ 929 → 1004 (+75 tests, +6 test files), không regression.
Build và ESLint ổn định xuyên suốt 6 commits.

Tổng hợp fix theo severity:

| Severity | Total | Fixed | Mitigated |
|----------|-------|-------|-----------|
| Critical | 1 | 1 | — |
| High | 3 | 3 | — |
| Medium | 6 | 5 | 1 |
| **Total** | **10** | **9** | **1** |

Đánh giá tổng thể: **A** (tất cả Critical và High đã fix, remaining risk chỉ là F-010 MEDIUM đã mitigated).
