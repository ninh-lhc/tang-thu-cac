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
