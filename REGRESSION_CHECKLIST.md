# Regression Checklist (Pre-Release)

Checklist nhanh trước khi chốt bản build. Mục tiêu: bắt lỗi vỡ luồng chính sau các thay đổi UI/logic/perf.

Phiên bản rút gọn 5 phút: `REGRESSION_CHECKLIST_QUICK.md`.

## 0) Setup

- Dùng dữ liệu có đủ:
  - >= 30 thẻ trong 1 tab collection
  - >= 15 ảnh trong BST của 1 thẻ
  - >= 20 mốc timeline cho 1 thẻ
- Mở app ở màn hình desktop (> 768px).
- Xác nhận đã kết nối thư mục truyện (không chỉ localStorage), để test đường dẫn ảnh local.

## 1) Danh Sách Thẻ

- Vào tab collection -> `Danh Sách`.
- Kiểm tra phân trang hiển thị đúng `12` thẻ/trang.
- Sang trang 2, quay lại trang 1: không mất thẻ, không nhảy sai trang.
- Chọn 1 thẻ ở trang bất kỳ: mở đúng hồ sơ thẻ đó.
- Xóa 1 thẻ:
  - danh sách cập nhật ngay
  - không còn thẻ ma ở trang hiện tại
  - không lỗi UI khi trang vừa xóa hết item.

## 2) Hồ Sơ

- Vào `Hồ Sơ` của 1 thẻ:
  - tên, avatar, info hiển thị đúng
  - markdown/wiki link bấm điều hướng đúng.
- Sửa nội dung hồ sơ và lưu:
  - reload app vẫn còn dữ liệu
  - không mất dynamic field.
- Test đổi qua lại nhiều thẻ liên tục:
  - không render lệch data thẻ trước
  - không bị giữ state editor sai thẻ.

## 3) Dòng Thời Gian

- Vào `Dòng Thời Gian`:
  - danh sách mốc hiển thị mới nhất trước
  - phân trang `10` mốc/trang hoạt động.
- Chọn 1 mốc:
  - cột sự kiện thu gọn
  - hover vào cột sự kiện bung lại mượt (không nhấp nháy).
- Thêm/sửa/xóa mốc:
  - danh sách cập nhật ngay
  - dữ liệu snapshot hiển thị đúng ở phần hồ sơ thời kỳ này.

## 4) Mạng Lưới Nhân Quả

- Từ `Hồ Sơ`, mở section mạng nhân quả:
  - có dữ liệu thì render nhóm + màu tab đúng
  - không dữ liệu thì trạng thái trống đúng.
- Đổi bộ lọc tab và search:
  - số lượng hiển thị khớp
  - không treo UI khi gõ nhanh.
- Chuyển nhanh giữa các thẻ:
  - mạng cập nhật theo thẻ mới, không bị data cũ lưu lại.

## 5) Ảnh (BST theo thẻ)

- Vào `Ảnh` khi chưa chọn thẻ: hiện empty-state + nút về danh sách.
- Chọn 1 thẻ rồi vào `Ảnh`:
  - chỉ hiện ảnh của thẻ đang chọn
  - badge số ảnh đúng.
- Kiểm tra phân trang ảnh `12` ảnh/trang:
  - ảnh #13 nằm trang 2.
- Thêm ảnh:
  - ảnh mới xuất hiện đúng BST thẻ
  - reload app vẫn còn.
- Xóa ảnh:
  - xóa đúng ảnh theo index
  - không xóa nhầm ảnh khác.

## 6) Lightbox Ảnh

- Click ảnh trong BST:
  - ảnh mở ở giữa
  - có zoom `+ / - / reset`.
- Zoom bằng con lăn chuột:
  - tăng giảm mượt
  - không vỡ layout.
- Ảnh lớn hơn màn hình:
  - có thể cuộn để xem toàn bộ ảnh.

## 7) Mục Lục / Điều Hướng

- Hover vào mục lục: bung ra.
- Rê chuột ra: co lại mượt (có độ trễ), icon không bị cắt/mất.
- Khi co lại: chỉ còn icon tab, không hiện nửa chữ.
- Điều hướng tab lớn/tab nhỏ/tab con:
  - không mất trạng thái thẻ đã chọn sai ngữ cảnh.

## 8) Lưu Trữ & Phục Hồi

- Tạo/sửa/xóa dữ liệu (thẻ, mốc, ảnh), đóng mở app:
  - dữ liệu còn nguyên.
- Nếu dùng thư mục thật:
  - kiểm tra file JSON và thư mục `images` có cập nhật đúng.
- Backup/restore:
  - import lại không lỗi schema cơ bản.

## 9) Smoke Perf

- Với dữ liệu lớn (30+ thẻ, 20+ mốc, 15+ ảnh):
  - chuyển tab chính không lag nặng
  - mở `Hồ Sơ` và `Dòng Thời Gian` không khựng bất thường
  - thao tác phân trang phản hồi trong mức chấp nhận được.

## 10) Exit Criteria (Đạt để chốt)

- Không có bug chặn luồng chính (blocker).
- Không có lỗi mất dữ liệu sau reload.
- Không có lỗi điều hướng sai entity/tab.
- Không có lỗi UI nghiêm trọng (icon mất, cột kẹt, layout vỡ).
- Lint file mới sửa không phát sinh lỗi mới.
