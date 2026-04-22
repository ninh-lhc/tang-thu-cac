# Kế hoạch — Khởi tạo thẻ & cấu hình tab (đối chiếu tiến độ)

Tài liệu này dùng để **đánh dấu đã làm tới đâu** khi bạn hoặc AI đối chiếu. Chi tiết từng pha, file và tiêu chí nghiệm thu nằm ở **`docs/PLAN-khoi-tao-tab-config.md`**.

**Cập nhật lần cuối:** 2026-04-21 (Pha 5 hoàn tất)

---

## Trạng thái tổng quan

| # | Hạng mục | Trạng thái | Ghi chú ngắn |
|---|-----------|------------|--------------|
| 1 | Gọn UI modal Khởi tạo thẻ (padding, `details`, footer…) | **Xong** | `MasterComponents.jsx` — `ModalEntity` |
| 2 | Tách khối «Trường & list gợi ý» khỏi modal Khởi tạo thẻ | **Xong** | Chỉnh mẫu tab chuyển sang **Quản lý tab** (`AppModalQuanLyTab` + `AppEntityTemplateFieldEditor`) |
| 3 | Modal Khởi tạo thẻ = một luồng «Gợi ý nhanh» + form chính, không trùng editor mẫu tab | **Xong** | Giảm cảm giác hai luồng dữ liệu trên cùng một màn |
| 4 | Mỗi lần mở Khởi tạo thẻ (mọi tab): **thêm/sửa/xóa trường + list gợi ý** trong cùng modal | **Xong (Pha 1.1–1.3)** | Nhúng lại trong `ModalEntity`, nối props, và thêm `contextHint` phân biệt điểm vào (Khởi tạo thẻ vs Quản lý tab) |
| 5 | **Nguồn dữ liệu trường** (tên tab nhỏ, danh sách thẻ, preset bản đồ…) — cấu hình **chỉ qua UI**, không sửa code | **Xong (Pha 2)** | `src/lib/fieldValueSources.js` + `handleSetTabFieldSource`; UI chọn nguồn trong `AppEntityTemplateFieldEditor`; `ModalEntity` render «Trường bổ sung» cho các `f_*` chưa có ô nhập và áp dụng datalist/placeholder từ nguồn |
| 6 | Đồng bộ nhãn: ô Gợi ý nhanh (vd. Bản đồ / Thế lực) ↔ tên hiển thị trong `fieldsTemplate` | **Xong (Pha 3)** | `src/lib/modalEntityQuickLabels.js` — mỗi slot map 1-1 sang `fieldId`; đổi nhãn trong mẫu tab → đổi nhãn trên modal. Có `baselineLabels` để tránh regress khi template đang dùng nhãn engine mặc định |
| 7 | Dọn code chết + lint sạch toàn repo | **Xong (Pha 4)** | `npm run lint` = 0 lỗi/0 cảnh báo; `npm test` = 418/418. Gỡ `buildLocationHierarchyLines`, `handleMapParentTier3Change`, 3 pass-through props không dùng ở `AppModalLayer`; siết deps `useMemo`/`useCallback` cho `MasterComponents` & `useAppEntityMilestoneActions`; thêm `argsIgnorePattern: ^_` trong `eslint.config.js` |
| 8 | Nhãn ô «Biệt danh» / «Chuỗi hiển thị / trạng thái» ở main-form đọc từ `fieldsTemplate` (không còn hardcode) | **Xong (Pha 5)** | `MAIN_FORM_SLOTS` + `resolveMainFormLabels` trong `modalEntityQuickLabels.js`; main-form của `ModalEntity` bỏ hardcode `WIKI_ALIAS_FIELD.label` + `"Chuỗi hiển thị / dữ liệu auto"`; giữ baseline cho map/force để user chưa đổi template vẫn thấy nhãn "auto" |

**Chú thích trạng thái:** `Xong` | `Đang` | `Chưa` | `Tạm hoãn`

---

## Cách dùng khi kiểm tra tiến độ

1. Mở bảng **Trạng thái tổng quan** ở trên — cập nhật cột **Trạng thái** và **Ghi chú** sau mỗi nhóm thay đổi đáng kể.
2. Phần chi tiết theo pha (Pha 0–4) và checklist file: xem **`docs/PLAN-khoi-tao-tab-config.md`**.
3. Khi nhờ AI đối chiếu, gửi: *«Đối chiếu tiến độ với PLAN.md và docs/PLAN-khoi-tao-tab-config.md»*.

---

## Liên kết

- Chi tiết kỹ thuật & checklist: [`docs/PLAN-khoi-tao-tab-config.md`](docs/PLAN-khoi-tao-tab-config.md)
- Lộ trình hiệu năng (chủ đề khác): [`PERFORMANCE_ROADMAP.md`](PERFORMANCE_ROADMAP.md)

---

## Kế hoạch triển khai AUTO Danh Sách (v2)

Mục tiêu: tái xây dựng logic AUTO cho thẻ Danh sách theo hướng data-driven, áp dụng đồng nhất cho mọi tab `collection-track`, có checklist kiểm thử rõ ràng để đối chiếu.

### Trạng thái theo bước

| Bước | Hạng mục | Trạng thái | Tiêu chí hoàn tất |
|---|---|---|---|
| 0 | Chốt phạm vi và contract v2 | **Xong** | Đã thống nhất bỏ logic group/sort cũ, giữ AUTO dạng phẳng + detail suffix |
| 1 | Dọn sạch mã/test legacy còn sót | **Xong** | Đã gỡ khối test legacy comment ở `collectionListCardSync.test.js`; giữ bộ test flat-mode gọn |
| 2 | Chuẩn hóa pipeline build dòng AUTO (entry -> detail -> render) | **Xong** | Đã tách payload dòng AUTO, lọc trùng detail theo tên/owner, fallback owner rõ ràng |
| 3 | Chuẩn hóa cấu hình theo tab (field/template/suggestion) | **Xong** | Pipeline AUTO đã đọc `fieldsTemplate` theo tab để suy ra field owner/detail, giảm hardcode |
| 4 | Đồng bộ trải nghiệm giữa tab Bản đồ và tab khác | **Xong** | Cùng pipeline detail suffix cho mọi tab; khác nhau bởi `fieldsTemplate`/field data của từng tab |
| 5 | Bổ sung test bao phủ behavior v2 | **Xong** | Đã thêm test cho fieldsTemplate-order, owner fallback plain text, format đồng nhất map/non-map |
| 6 | Chạy kiểm thử + chốt nghiệm thu | **Xong** | `npm run test` pass tại checkpoint hiện tại (68 files / 422 tests) |

### Checklist kiểm tra đối chiếu

- [ ] Mỗi tab `collection-track` luôn có đúng 1 thẻ `Danh Sách ...` canonical.
- [ ] Khối AUTO luôn được replace an toàn, không đè ghi chú tay của user.
- [ ] Danh sách AUTO hiển thị dạng phẳng (`## Danh sách (N)` + `1..N`), không còn heading nhóm cũ.
- [ ] Mỗi item có hậu tố detail ưu tiên từ field dữ liệu của entity; nếu trống thì fallback owner hợp lệ.
- [ ] Detail suffix không lặp dữ liệu đã có trong tên/chuỗi chính.
- [ ] Áp dụng đồng nhất cho tất cả tab con thuộc nhóm Bản đồ và các tab collection khác.
- [x] File test không còn legacy block comment dài gây nhiễu.
- [x] `npm run test` pass toàn bộ.

### Cách thực thi từng bước

1. Hoàn tất bước 1 (cleanup legacy) rồi commit logical checkpoint.
2. Triển khai bước 2-4 theo từng patch nhỏ, mỗi patch có test đi kèm.
3. Hoàn tất bước 5, chạy test cuối bước 6.
4. Cập nhật lại bảng trạng thái để đối chiếu nhanh trước khi chốt.
