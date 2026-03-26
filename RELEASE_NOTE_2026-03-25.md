# Release Note — 2026-03-25

## 1) Thông tin bản

- Phiên bản: `internal-2026-03-25`
- Ngày phát hành: `2026-03-25`
- Người phụ trách: `AI + ninh-lhc`
- Mục tiêu bản phát hành:
  - Ổn định UX timeline/menu mục lục.
  - Hoàn thiện BST ảnh theo thẻ + lightbox zoom.
  - Giới hạn hiển thị danh sách/ảnh để giảm tải.
  - Tối ưu phạm vi tính toán mạng nhân quả + wiki-link map.

## 2) Thay đổi chính

### Tính năng mới

- Mục `Ảnh` bám theo thẻ đang chọn (BST riêng cho từng thẻ).
- Cho phép thêm/xóa ảnh trong BST của thẻ.
- Lightbox ảnh hỗ trợ zoom `+ / - / 100%` + lăn chuột.

### Cải tiến

- Danh sách thẻ phân trang `12` thẻ/trang.
- BST ảnh phân trang `12` ảnh/trang.
- Menu mục lục co/giãn theo hover mượt hơn (có hysteresis).
- Timeline co/giãn cột sự kiện theo hover bằng state.

### Sửa lỗi

- Sửa tình trạng cột sự kiện không bung lại ổn định.
- Sửa icon mục lục bị cắt/mất khi sidebar co.
- Cải thiện hiển thị ảnh full khi mở xem.

## 3) Ảnh hưởng dữ liệu / tương thích

- Có thay đổi schema dữ liệu: `Có`
- Mô tả:
  - Entity hỗ trợ thêm trường `images: string[]`.
- Tương thích dữ liệu cũ: `Cơ bản đảm bảo`
- Ghi chú migration:
  - Luồng tạo/sửa thẻ mới đã đảm bảo có `images`.
  - Cần xác nhận thêm trên các file backup cũ khi import thủ công.

## 4) Kiểm thử trước phát hành

### CLI checks

- `npm run build`: **PASS**
- `npm run lint`: **FAIL** (tồn tại lỗi/warning cũ ở các file khác, không phát sinh blocker build)
- `npm run test`: **FAIL** (thiếu dependency `jsdom`)

### Manual checks

- Trạng thái: **CHƯA CHẠY ĐỦ**
- Cần chạy:
  - `REGRESSION_CHECKLIST_QUICK.md`
  - ưu tiên các luồng: Danh sách / Ảnh / Timeline / Mục lục / Lightbox.

## 5) Hiệu năng

- Build hiện tại vẫn có cảnh báo bundle lớn (`index-*.js` > 500kB).
- Các điểm đã giảm tải:
  - giới hạn 12 item/trang cho danh sách và ảnh,
  - giới hạn phạm vi tính mạng nhân quả theo tab hiện tại,
  - giới hạn kết quả mạng nhân quả (`maxResults`),
  - hạn mức cho near-chapter list.

## 6) Known Issues

- Lint toàn repo chưa sạch (lỗi cũ trong `AppEntitySummaryBlocks`, `MasterComponents`, `useEntityCollectionQueryState`).
- Test chưa chạy được do thiếu `jsdom`.
- Cần chạy manual quick checklist trước khi đóng bản cuối.

## 7) Hướng dẫn rollback

- Nếu phát hiện bug blocker:
  - quay về commit ổn định gần nhất trước đợt chỉnh UI/perf này.
  - restore backup dữ liệu gần nhất nếu cần.

## 8) Checklist phê duyệt phát hành

- [x] Đã cập nhật release note
- [ ] Regression quick pass
- [ ] Không có blocker mở
- [ ] Đã backup dữ liệu (nếu cần)
- [ ] Người phụ trách xác nhận phát hành
