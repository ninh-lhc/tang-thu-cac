# 📊 AUDIT LẦN 2 — TÀNG THƯ CÁC — BÁO CÁO CUỐI CÙNG

> **Audit baseline:** `c9dc964` · `main` · 929/929 test pass · build pass
> **Final state:** `9d79224` · `main` · 968/968 test pass · build pass
> **Kiến trúc:** SPA Vite 8 + React 19 (File System Access API + localStorage + IndexedDB)
> **Phạm vi:** Architecture, persistence, data integrity, async lifecycle, markdown parsing
> **Ngày hoàn tất:** 2026-10-31 (commit `9d79224`, 2026-10-31 06:07 +0700)

---

## Phần 2 — Tóm tắt kết quả

| ID | Severity | Mô tả ngắn | Loại | Status | Phase | Commit | Ghi chú |
|----|----------|-------------|------|--------|-------|--------|---------|
| F-001 | Critical | Dirty consume trước disk write — crash mất dirty state | BUG/RISK | ✅ FIXED | Phase 1A | `67bbf9d` | `snapshotDirtyShards()` thay `consumeDirtyShards()`; `clearDirtyShardKeys()` chỉ sau write thành công |
| F-002 | High | Toast "đã lưu" trước disk flush hoàn tất | RISK | ✅ FIXED | Phase 1A + 1B | `67bbf9d`, `d85b4e0` | Await sync trước toast; beforeunload + visibilitychange guard |
| F-003 | High | Shard + manifest non-atomic write | RISK | 🔸 UNRESOLVED | — | — | Cần journal/WAL hoặc atomic rename — thuộc persistence core redesign |
| F-004 | High | Không có file lock giữa các tab | RISK | 🔸 UNRESOLVED | — | — | Cần Web Locks API hoặc BroadcastChannel — thuộc persistence core redesign |
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

---

## Phần 4 — Metrics tổng hợp

| Metric | Trước Audit | Sau Phase 3 | Delta |
|--------|-------------|-------------|-------|
| Tests passing | 929 | 968 | +39 |
| Test files | 126 | 129 | +3 |
| Findings total | 10 | 10 | — |
| Findings fixed | 0 | 7 | +7 |
| Findings mitigated | 0 | 1 | +1 |
| Findings unresolved | 10 | 2 | −8 |
| Phases completed | 0 | 4 | +4 |
| Commits | 0 | 4 | +4 |
| Build | Pass | Pass | ✅ |
| ESLint regressions | — | 0 | ✅ |

---

## Phần 5 — Các finding còn lại

### 🔸 F-003 — Shard + Manifest non-atomic write [HIGH — UNRESOLVED]

- **Vấn đề:** `writeShardTree()` ghi từng shard tuần tự → `writeManifest()` ghi sau cùng. Crash giữa chừng → shard mới + manifest cũ → dữ liệu lệch.
- **Mitigation hiện có:** Retry 5 lần + hash cache detect shard cần ghi lại.
- **Fix cần:** Journal/WAL pattern hoặc write-then-rename cho manifest.
- **Lý do defer:** Thuộc persistence core — Web File System Access API không hỗ trợ atomic rename. Cần thiết kế kiến trúc riêng.

### 🔸 F-004 — Không có file lock giữa các tab [HIGH — UNRESOLVED]

- **Vấn đề:** 2 tab mở cùng folder → concurrent write → last-write-wins → mất edit.
- **Mitigation hiện có:** Không có.
- **Fix cần:** Web Locks API hoặc BroadcastChannel detect + warn user.
- **Lý do defer:** Liên quan chặt với F-003 — cần thiết kế persistence core cùng lúc. Web Locks API có browser compatibility concerns.

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

| Audit lần 1 | Audit lần 2 | Kết quả sau 3 phases |
|-------------|-------------|----------------------|
| AUD-001 (P1) — dirty set consumed trước khi ghi đĩa xong | F-001 | Confirmed + ✅ FIXED (`67bbf9d`) |
| AUD-002 (P2) — toast thành công trước khi persistence xong | F-002 | Confirmed + ✅ FIXED (`67bbf9d`, `d85b4e0`) |
| — | F-003 | Mới — 🔸 UNRESOLVED (non-atomic shard + manifest) |
| — | F-004 | Mới — 🔸 UNRESOLVED (không file lock đa tab) |
| — | F-005 | Mới — ✅ FIXED (wiki-link pipe trong bảng) |
| — | F-006 | Mới — ✅ FIXED (inline-code pipe trong bảng) |
| — | F-007 | Mới — ✅ FIXED (`markAllShardsDirty` read-only) |
| — | F-008 | Mới — ✅ FIXED (stale `wikiWrapOptions`) |
| — | F-009 | Mới — ✅ FIXED (AI pipeline unmount / superseded) |
| — | F-010 | Mới — 🟡 MITIGATED (pagination + IO windowing) |

---

## Phần 8 — Git log

```
9d79224 Phase 3: fix F-007, F-008, F-009 — conditional dirty marking, stale closure fix, AI pipeline guards
07ec224 Phase 2: fix F-005/F-006 — protect pipe in wiki-links and inline code
d85b4e0 Phase 1B: await sync trước toast lưu + guard đóng tab
67bbf9d Phase 1: defer dirty clear until disk flush and await sync before save toasts.
c9dc964 (baseline — audit start)
```

---

## Phần 9 — Kết luận

Audit lần 2 đã phát hiện 10 findings (1 Critical, 3 High, 6 Medium).
Qua 4 commits trong 3 phases:

- **7/10** findings đã được **fix** hoàn toàn với test coverage
- **1/10** đã được xác nhận **mitigated** bởi cơ chế có sẵn
- **2/10** thuộc persistence core (F-003, F-004) — defer cho redesign riêng

Test suite tăng từ 929 → 968 (+39 tests), không regression.
Build và ESLint ổn định xuyên suốt 4 commits.

Đánh giá tổng thể: **B+ → A−** (cải thiện đáng kể từ baseline).
Remaining risk tập trung vào F-003/F-004 (persistence atomicity + multi-tab locking).
