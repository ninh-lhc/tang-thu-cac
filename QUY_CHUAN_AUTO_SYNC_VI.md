# Quy chuẩn Auto Sync & Ghi chép chi tiết

Tài liệu này là “bản quy tắc vận hành” cho luồng:

`Tạo mới thẻ -> mở giao diện ghi chép chi tiết -> hiện mẫu nhập sẵn theo tab -> cập nhật auto đồng bộ`

Mục tiêu:

- Không bắt người dùng viết từ đầu.
- Không để auto đè lên phần ghi chú tay.
- Mỗi tab có mẫu nhập phù hợp với cách phân loại của nó.
- Khi sửa, xóa hoặc đổi tên, hệ thống chỉ đồng bộ phần AUTO có liên quan.

## 1. Luồng dùng chuẩn

### 1.1 Khi tạo mới thẻ

1. Mở modal `Khởi tạo / Tạo thẻ`.
2. Nhập nhanh các trường cơ bản:
   - `Danh xưng / Tên gọi`
   - `Phẩm cấp` hoặc `Trạng thái` nếu tab cần
   - `Biệt danh / Tên khác`
   - `Hình ảnh` nếu có
3. Bấm `Lưu`.
4. Hệ thống tự động:
   - tạo thẻ mới,
   - chuyển sang giao diện `Ghi chép chi tiết`,
   - nạp sẵn mẫu nhập theo tab/subtab hiện tại.

### 1.2 Trong giao diện ghi chép chi tiết

Mẫu được chia làm 2 khối:

- `Phần thủ công`:
  - nội dung bạn tự viết, tự điều chỉnh.
  - có thể xóa dòng không cần, thêm dòng mới nếu thiếu.
- `Phần AUTO`:
  - nội dung hệ thống sinh ra và cập nhật.
  - không sửa tay nếu không cần thiết.

Nguyên tắc:

- Phần thủ công là nguồn ghép nội dung chính.
- Phần AUTO chỉ chứa dữ liệu đã quy tắc hóa.
- Nếu auto và tay trùng nhau, phần tay ưu tiên được giữ nguyên.

## 2. Cách AUTO làm việc

### 2.1 Khi tạo thẻ mới

- Tự động sinh template ghi chép theo tab hiện tại.
- Nếu thẻ có field có sẵn, template sẽ điền sẵn giá trị.
- Nếu field chưa có, template để trống để bạn điền sau.

### 2.2 Khi sửa thẻ

- Đổi tên thẻ:
  - cập nhật các liên kết auto có liên quan.
  - không xóa ghi chép tay.
- Đổi field:
  - field nào nằm trong AUTO block thì cập nhật field đó.
  - phần thủ công giữ nguyên.

### 2.3 Khi xóa thẻ

- Xóa thẻ gốc.
- Xóa các dòng AUTO đã sinh ra từ thẻ đó.
- Không xóa khung ghi chép tay nếu trong bối cảnh chung vẫn còn thẻ/chương này.

### 2.4 Khi gặp dữ liệu mơ hồ hoặc trùng tên

- Không auto gán bừa.
- Đưa vào nhóm `Chưa phân loại` hoặc giữ trạng thái cần xác nhận.
- Ưu tiên đúng hơn là đoán sai.

## 3. Cấu trúc mẫu nhập

Mẫu nên có dạng:

```text
## Mẫu nhập nhanh
> Xóa dòng không cần, thêm dòng nếu thiếu.

- Trường 1: ...
- Trường 2: ...
- Trường 3: ...

## Ghi chép chi tiết

Nội dung mô tả dài, tự do viết tay.

## AUTO

... không sửa tay nếu không cần ...
```

Nguyên tắc:

- Mỗi dòng chỉ nên chứa 1 ý chính.
- Trường nào không dùng thì xóa dòng đó.
- Trường nào thiếu thì thêm dòng mới.
- Không nhất thiết phải giữ đúng số dòng cố định.

## 4. Quy tắc nhập để AUTO chính xác

### 4.1 Quy tắc chung

- `Tên chính` phải là tên ổn định, có dấu, đúng ngữ pháp.
- `Biệt danh` tách bằng `,` hoặc `/` hoặc `|`.
- `Trạng thái / Phẩm cấp` chỉ nên là nhãn kỹ thuật ngắn gọn.
- Không nhét một đoạn văn dài vào field dành cho máy đọc.
- Field nào là field đó, dùng đúng vai trò field đó.

### 4.2 Trình tự ưu tiên khi nhập

1. Tên chính.
2. Phẩm cấp / trạng thái ngắn gọn.
3. Danh sách phân loại / thuộc tính.
4. Mô tả dài ở phần ghi chép.

### 4.3 Khi nhập trong chuỗi liên kết tự động

Dùng format ngắn gọn, rõ ràng:

- `Tên nhân vật (số chương) ?`
- `Tên nhân vật (số chương) !`
- `Tên nhân vật (số chương) !!`

Ý nghĩa:

- `?` = chưa chắc / mức độ nhẹ
- `!` = quan trọng
- `!!` = rất quan trọng
- `...` = còn tiếp diễn
- `x` = bỏ qua

## 5. Quy tắc theo từng nhóm tab

### 5.1 Nhân vật

Nên ưu tiên các trường:

- `f_status`: cảnh giới / trạng thái.
- `f_title`: danh hiệu / vai trò.
- `f_linh_can`: linh căn / thiên phú.
- `f_the_chat`: thể chất.
- `f_cong_phap`: công pháp chính.
- `f_vu_khi`: pháp bảo / vũ khí.
- `f_to_chuc`: thế lực / tông môn.
- `f_quan_he`: quan hệ với nhân vật khác.
- `f_desc`: mô tả tính cách / ghi chú.

### 5.2 Nhân vật liên quan

Nên nhập:

- `f_quan_he`: `Đạo lữ`, `Thân nhân`, `Huynh đệ`, `Đệ tử`, `Sư đồ`, `Bạn bè`.

Chú ý:

- Nếu tab có quan hệ rõ, nên ghi ngắn gọn.
- Không viết thành đoạn văn.

### 5.3 Thế lực

Nên ưu tiên các trường:

- `f_status`: cấp bậc / hạng.
- `f_title`: chính / tà / thể chế.
- `f_cap`: quy mô.
- `f_dia_ban`: địa bàn chính.
- `f_desc`: đặc trưng.

Quy tắc:

- Người dùng chỉ cần nhập ngắn gọn trong `f_status`.
- Địa bàn nên ghi thành chuỗi rõ ràng, theo thứ tự `gần -> xa`.

### 5.4 Bản đồ / Địa danh

Nên ưu tiên các trường:

- `f_status`: mức nguy hiểm / cấp.
- `f_title`: loại địa danh.
- `f_vi_tri`: chuỗi vị trí / chuỗi cha con.
- `f_co_duyen`: kho báu / cơ duyên.
- `f_desc`: mô tả.

Quy tắc:

- Vị trí nên viết theo chain rõ ràng.
- Nếu có nhiều tầng, viết từ trong ra ngoài hoặc theo quy tắc đã dùng chung của tab đó.

### 5.5 Công pháp / Vũ kỹ

Nên ưu tiên các trường:

- `f_status`: cảnh giới yêu cầu / phẩm cấp.
- `f_title`: phân loại.
- `f_loai`: thuộc tính / hệ.
- `f_cap`: phẩm giai.
- `f_desc`: công năng.

Quy tắc:

- Giữ một bảng cấp bậc ổn định.
- Ví dụ: `Linh -> Huyền -> Địa -> Thiên` hoặc thứ tự ngược lại, nhưng phải thống nhất toàn hệ thống.

### 5.6 Dị thuộc tính

Nên ưu tiên các trường:

- `f_title`: tên thuộc tính chính.
- `f_status`: độ hiếm / cấp.
- `f_desc`: đặc điểm / công dụng.

Quy tắc sắp xếp:

- Nên có một thứ tự cố định, ví dụ:
  - `Băng`
  - `Hỏa`
  - `Phong`
  - `Lôi`
  - `Mộc`
  - `Thủy`
  - `Thổ`
  - `Âm`
  - `Dương`

### 5.7 Hệ thống tu luyện / Cảnh giới

Nên ưu tiên các trường:

- `f_status`: chuỗi cảnh giới ngắn gọn.
- `f_title`: tên hệ / tên cấp.
- `f_dieu_kien`: điều kiện đột phá.
- `f_dac_quyen`: đặc quyền / năng lực.
- `f_desc`: đặc điểm nhận dạng.

Quy tắc nhập:

- Viết `f_status` ngắn gọn, ít chú thích.
- Nhanh nhất là dùng một format cố định.

### 5.8 Pháp bảo / Binh khí

Nên ưu tiên các trường:

- `f_status`: phẩm cấp.
- `f_title`: loại vật phẩm.
- `f_chu`: chủ nhân / người sở hữu.
- `f_linh_the`: linh thể / tinh linh.
- `f_desc`: công năng.

### 5.9 Các tab hệ thống khác

Nên ưu tiên các trường theo nghĩa chung:

- `f_status`: trạng thái / cấp / độ khó.
- `f_title`: loại / nhãn.
- `f_dieu_kien`: điều kiện.
- `f_desc`: mô tả.

## 6. Mẫu thực hành nhanh

### 6.1 Khi tạo một công pháp

```text
Tên: Huyền Thủy Quyết
f_status: Thiên giai
f_title: Công pháp
f_loai: Thủy hệ
f_cap: Trung phẩm
f_desc: ...
```

### 6.2 Khi tạo một địa danh

```text
Tên: Huyết Hoàng Địa
f_status: Tiểu thế giới
f_title: Địa danh
f_vi_tri: Huyết Giới - Huyết Hoàng Địa
f_desc: ...
```

### 6.3 Khi tạo một thế lực

```text
Tên: Huyết Linh Tông
f_status: Bát cấp thế lực
f_title: Tông môn
f_cap: Quy mô lớn
f_dia_ban: Huyết Giới - Huyết Hoàng Địa
f_desc: ...
```

## 7. Nguyên tắc quan trọng nhất

1. Phần tay luôn được ưu tiên giữ nguyên.
2. AUTO chỉ cập nhật phần mà nó quản lý.
3. Chuỗi nhập càng ngắn gọn và ổn định thì AUTO càng chính xác.
4. Khi không chắc thì để `Chưa phân loại` hơn là đoán sai.
5. Mỗi tab có thể có một quy tắc riêng, nhưng cách nhập phải đồng bộ.

---

Tài liệu này có thể được coi là “spec” cho hệ thống auto sync hiện tại. Nếu cần, có thể bổ sung thêm một bảng:

- tab nào
- field nào là chính
- field nào AUTO sẽ sinh
- field nào là manual

để dùng như checklist khi thêm tab mới.
