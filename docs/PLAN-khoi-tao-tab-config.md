# Lộ trình chi tiết — Khởi tạo thẻ & cấu hình tab (UI + nguồn dữ liệu)

Tài liệu đi kèm **`PLAN.md`** (ở thư mục gốc repo). Bản này mô tả **pha**, **file/trục chính**, **tiêu chí xong** để khi đối chiếu tiến độ không chỉ nhìn checkbox tổng mà còn biết còn việc gì ở tầng mã.

**Mục tiêu dài hạn (đã thống nhất với product):**

1. Mở **Khởi tạo thẻ** từ **bất kỳ tab** nào vẫn có thể **thêm / sửa / xóa** các trường và **danh sách gợi ý** gắn trường (cùng phạm vi **Cục bộ tab con** / **Khu vực tab lớn** như hiện có).
2. Các trường lấy giá trị từ **nguồn động** (tên tab nhỏ, danh sách thẻ, list bản đồ, …) được khai báo qua **thiết lập UI**, không cần sửa mã ứng dụng cho từng kiểu tab.

---

## Pha 0 — Trạng thái đã có (baseline)

Các mục sau coi như **đã giao** trước khi làm Pha 1–4 (để khỏi lặp công việc):

| Việc | File / khu vực | Ghi chú |
|------|----------------|---------|
| Handler tab: thêm/xóa/đổi tên trường, merge list gợi ý | `App.jsx` (handlers `handleAddTabTemplateField`, …) | Nguồn sự thật dữ liệu vẫn là `tabsConfig` trong novel |
| UI editor trường + list | `AppEntityTemplateFieldEditor.jsx` | Chế độ lưu Cục bộ / Khu vực |
| Editor gắn **Quản lý tab** | `AppModalQuanLyTab.jsx` | Hiển thị dưới hàng tiêu đề tab con (collection-track) |
| Modal Khởi tạo thẻ: form thực thể + khối Gợi ý nhanh (map/force/generic) | `MasterComponents.jsx` — `ModalEntity` | Map: 3 ô + Trực thuộc; logic gán `f_*` trong component |
| Truyền modal | `AppModalLayer.jsx` | `ModalEntity` không còn nhận props template field (đã tách) |

---

## Pha 1 — Khởi tạo thẻ lại có đủ «quản lý trường & list»

**Mục đích:** Một cửa khi tạo thẻ: vừa nhập vừa chỉnh mẫu tab, khỏi bắt buộc mở Trận Pháp chỉ để sửa trường.

| Bước | Việc | Trạng thái | Tiêu chí xong |
|------|------|-----------|----------------|
| 1.1 | Nhúng lại `AppEntityTemplateFieldEditor` (hoặc wrapper) trong `ModalEntity`, dưới/ trên khối Gợi ý nhanh — **mặc định thu gọn** như trước | **Xong** | Mở Khởi tạo thẻ → Mở khối → thêm trường / sửa list → lưu novel đúng scope |
| 1.2 | Truyền đủ props từ `AppModalLayer` → `ModalEntity`: các handler + `setConfirmDialog` + `showToast` | **Xong** | Không lỗi runtime; toast/confirm như ở Quản lý tab |
| 1.3 | Tránh trùng lặp UX: nếu giữ editor ở **cả** Quản lý tab **và** Khởi tạo thẻ, thống nhất copy (cùng component) | **Xong** | Một component, hai điểm vào; thêm prop `contextHint` để mỗi nơi ghi rõ ngữ cảnh (hàng loạt vs nhanh khi tạo thẻ) |

**File chạm:** `MasterComponents.jsx`, `AppModalLayer.jsx`, có thể tinh chỉnh `AppEntityTemplateFieldEditor.jsx` (prop `defaultOpen` nếu cần).

---

## Pha 2 — Chuẩn hoá «nguồn giá trị» (data source) theo field / slot

**Mục đích:** Giảm `if (map) …` trong `ModalEntity`; chuyển dần sang đọc cấu hình.

| Bước | Việc | Trạng thái | Tiêu chí xong |
|------|------|-----------|----------------|
| 2.1 | Thiết kế **schema** (trong `tabsConfig`, map `fieldSource[fid] = { kind, metadataKey? }`): `manual`, `subTabLabel`, `siblingTabs`, `entityNames`, `mapTypes`, `mapHierarchy`, `novelMetadata` | **Xong** | `src/lib/fieldValueSources.js` + 15 unit test. Tab cũ không có field → fallback `MANUAL` (giữ hành vi cũ) |
| 2.2 | UI tối thiểu trong editor trường để chọn nguồn (+ handler `handleSetTabFieldSource` có `propagateWithinLon`) | **Xong** | `App.jsx` wire handler; UI `FieldSourceRow` trong `AppEntityTemplateFieldEditor`; dọn `fieldSource` khi xóa field |
| 2.3 | `ModalEntity` đọc schema để set **giá trị mặc định** và **datalist** (khối «Trường bổ sung» cho mọi `f_*` chưa có ô nhập) | **Xong** | Datalist + placeholder theo nguồn; không regress test map/force hiện có (410/410 test pass) |

**File chạm:** `src/lib/fieldValueSources.js` (mới), `src/lib/fieldValueSources.test.js` (mới), `App.jsx`, `AppModalLayer.jsx`, `AppModalQuanLyTab.jsx`, `AppEntityTemplateFieldEditor.jsx`, `MasterComponents.jsx`.

---

## Pha 3 — Bản đồ (và các mode đặc thù): binding thay cho nhãn cứng

**Mục đích:** Ba ô «Giới diện / Quy mô / Đặc tính» (và tương tự) lấy nhãn từ `fieldsTemplate`, thay vì chỉ text cố định trong JSX.

| Bước | Việc | Trạng thái | Tiêu chí xong |
|------|------|-----------|----------------|
| 3.1 | Ánh xạ 1-1: mỗi ô map/force quick → `fieldId` đích (đã có trong template) | **Xong** | `src/lib/modalEntityQuickLabels.js` (MAP_QUICK_SLOTS, FORCE_QUICK_SLOTS) + 8 unit test |
| 3.2 | Áp dụng nhãn động trong `ModalEntity` (label, aria-label, các chú thích «Quy mô» / «Giới diện» / «Trực thuộc» + hint của `showMapQuickSection`, `showForceQuickSection`) | **Xong** | Đổi nhãn trong mẫu tab → modal hiện nhãn mới; nhãn baseline (mẫu engine) giữ nguyên UI cũ |
| 3.3 | `composeMapStatusLine` / patch `f_status` vẫn đúng với dữ liệu cũ | **Xong** | Entity cũ mở lại không vỡ hiển thị (test `saveShortcutScope` pass 9/9) |

**File chạm:** `src/lib/modalEntityQuickLabels.js` (mới), `src/lib/modalEntityQuickLabels.test.js` (mới), `src/MasterComponents.jsx`, `src/MasterComponents.saveShortcutScope.test.jsx` (cập nhật aria-label).

---

## Pha 4 — Dọn dẹp & một nguồn sự thật

| Bước | Việc | Trạng thái | Tiêu chí xong |
|------|------|-----------|----------------|
| 4.1 | Gỡ code chết / nhánh duplicate sau khi schema ổn định | **Xong** | Gỡ `buildLocationHierarchyLines` (`src/lib/theLucBanDoSync.js`), `handleMapParentTier3Change` (`MasterComponents.jsx`), 3 pass-through props `handleSetTabListGroupStrategy` / `handleSaveTabListGroupOrderToGenreTemplate` / `handleSetTabTemplateFieldListMergeOrder` không dùng ở `AppModalLayer.jsx`, và `getByText` thừa trong `MasterComponents.saveShortcutScope.test.jsx` |
| 4.2 | Lint sạch toàn repo | **Xong** | `npm run lint` = **0 lỗi / 0 cảnh báo**. Ép deps `useMemo` của `mapParentTier*Datalist` để đọc thẳng từ `mapEntityHints` (không `\|\| []` ngoài memo); chỉnh deps `useCallback` của `handleOpenCreateEntity` (dùng `currentTabConfig` thay vì `currentTabConfig?.subTabs`); bỏ `setActiveTabNho` thừa khỏi deps của `handleSaveEntity`; tắt có chủ đích `react-hooks/set-state-in-effect` cho effect đồng bộ tầng Trực thuộc khi đổi quy mô bản đồ; thêm `argsIgnorePattern: '^_'` (+ `caughtErrorsIgnorePattern`, `destructuredArrayIgnorePattern`) trong `eslint.config.js` |
| 4.3 | Test sạch | **Xong** | `npm test` = **66 file / 418 test pass** |
| 4.4 | Cập nhật `PLAN.md` bảng tổng quan | **Xong** | Cột trạng thái phản ánh đủ Pha 1–4 |

**File chạm:** `eslint.config.js`, `src/AppModalLayer.jsx`, `src/MasterComponents.jsx`, `src/MasterComponents.saveShortcutScope.test.jsx`, `src/useAppEntityMilestoneActions.js`, `src/lib/theLucBanDoSync.js`, `PLAN.md`, `docs/PLAN-khoi-tao-tab-config.md`.

---

## Pha 5 — Đồng bộ nhãn main-form theo `fieldsTemplate`

**Mục đích:** Xử lý nốt các label hardcode trên form chính của modal Khởi tạo thẻ mà Pha 3 chưa chạm tới (ô «Biệt danh / tên khác», ô «Chuỗi hiển thị / dữ liệu auto»). Sau pha này, đổi nhãn trường trong Mẫu tab sẽ cập nhật tương ứng trên modal.

| Bước | Việc | Trạng thái | Tiêu chí xong |
|------|------|-----------|----------------|
| 5.1 | Mở rộng `src/lib/modalEntityQuickLabels.js`: thêm `MAIN_FORM_SLOTS` (alias, statusLine) + `resolveMainFormLabels({ isMapScope, isForceScope })` + `MAIN_STATUS_BASELINE_LABELS` | **Xong** | 8 unit test mới trong `modalEntityQuickLabels.test.js` bao quát alias/status, baseline fallback, custom override, map/force vs generic scope |
| 5.2 | Áp dụng trong `ModalEntity` (`MasterComponents.jsx`): bỏ hardcode `WIKI_ALIAS_FIELD.label` + `"Chuỗi hiển thị / dữ liệu auto"`, dùng `mainFormLabels.alias.label` / `mainFormLabels.statusLine.label` | **Xong** | Đổi nhãn `f_alias` hoặc `f_status` trong editor mẫu tab → modal cập nhật; nhãn baseline (engine mặc định) ở map/force giữ nguyên "Chuỗi hiển thị / dữ liệu auto" để không làm mất ngữ cảnh "auto-compose" |
| 5.3 | `entity.name` (ô «Danh xưng / Tên gọi *» ở đầu modal) giữ nguyên hardcode vì là trường định danh, không phải field động | **Xong** | Thiết kế có chủ đích — không trộn `entity.name` vào `fieldsTemplate` |

**File chạm:** `src/lib/modalEntityQuickLabels.js`, `src/lib/modalEntityQuickLabels.test.js`, `src/MasterComponents.jsx`.

**Kiểm tra:** `npm test` = **66 file / 426 test pass** (+8 test Pha 5). `npm run lint` = **0 lỗi / 0 cảnh báo**.

---

## Checklist đối chiếu nhanh (copy khi báo cáo tiến độ)

```
[x] Pha 1: Editor trường/list có trong modal Khởi tạo thẻ
[x] Pha 2: Schema nguồn dữ liệu + UI chọn nguồn (tối thiểu) + «Trường bổ sung» trong Khởi tạo thẻ
[x] Pha 3: Map/Force quick dùng nhãn/mapping từ cấu hình (baseline fallback)
[x] Pha 4: Test + lint + PLAN.md cập nhật (0 lỗi/0 cảnh báo, 418/418 test)
[x] Pha 5: Main-form (f_alias, f_status) đọc nhãn từ fieldsTemplate (426/426 test)
```

---

## Ghi chú

- Mọi thay đổi **đụng `tabsConfig` / novel JSON** nên có **migration nhẹ** hoặc **default an toàn** để truyện cũ mở được.
- Ưu tiên **pha nhỏ, merge dễ review** hơn một PR khổng lồ.
