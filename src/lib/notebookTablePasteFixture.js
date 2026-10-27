/**
 * Fixture paste bảng NotebookLM (5 cột, 6 hàng) — dùng trong test preview/save/reload.
 */

export function buildFullSixRowNotebookTablePaste() {
  return [
    '# Bảng kỹ năng 🛡️',
    '',
    '- Nguồn: [[Bách Khoa Tu Tiên]]',
    '',
    '| Giai Đoạn | Cấp Độ & Kỹ Năng | Ngoại Hình | Thuộc Tính | Kỹ Năng Đơn Vị |',
    '| :--- | :--- | :--- | :--- | :--- |',
    '| **1. Hắc Thiết** | Cấp 1–9:',
    '[[Triệu Hồi Khô Lâu Chiến Sĩ]] | Khung xương xám | • 15 điểm [[Toàn Diện Cường Hóa]] | • ~500m<br>• sát thương | |',
    '| **2. Thanh Đồng** | Cấp 10–19: [[Triệu Hồi Khô Lâu Chiến Sĩ]] | Khung xanh | • Unicode: 中文 | • [[Cuồng Bạo Nhất Kích]] |',
    '| **3. Bạch Ngân** | **bold trong ô** | | | |',
    '| **4. Vàng** | | ô trống giữa | | |',
    '| **5. Tím** | dòng một',
    'dòng hai trong cùng ô | | | |',
    '| **6. Cuối** | hàng cuối | | | ghi chú kết |',
  ].join('\n');
}
