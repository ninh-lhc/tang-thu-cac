# Release Note Template

> Dùng cho mỗi bản nội bộ trước khi bàn giao hoặc đóng mốc.

## 1) Thông tin bản

- Phiên bản: `vX.Y.Z` (hoặc build date)
- Ngày phát hành: `YYYY-MM-DD`
- Người phụ trách: `...`
- Mục tiêu bản phát hành: `...`

## 2) Thay đổi chính

### Tính năng mới

- ...
- ...

### Cải tiến

- ...
- ...

### Sửa lỗi

- ...
- ...

## 3) Ảnh hưởng dữ liệu / tương thích

- Có thay đổi schema dữ liệu: `Có/Không`
- Nếu có, mô tả:
  - ...
- Tương thích dữ liệu cũ: `Đảm bảo/Chưa đảm bảo`
- Ghi chú migration (nếu có):
  - ...

## 4) Kiểm thử trước phát hành

- Đã chạy: `REGRESSION_CHECKLIST_QUICK.md` (`Pass/Fail`)
- Nếu fail, mục lỗi:
  - ...
- Test thủ công bổ sung:
  - ...

## 5) Hiệu năng

- Trạng thái phản hồi UI với dữ liệu lớn: `Ổn/Cần theo dõi`
- Điểm cần theo dõi sau phát hành:
  - ...

## 6) Known Issues

- ...
- ...

## 7) Hướng dẫn rollback (nếu cần)

- Bước 1: ...
- Bước 2: ...
- Bước 3: ...

## 8) Checklist phê duyệt phát hành

- [ ] Đã cập nhật release note
- [ ] Regression quick pass
- [ ] Không có blocker mở
- [ ] Đã backup dữ liệu (nếu cần)
- [ ] Người phụ trách xác nhận phát hành
