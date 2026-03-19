# Tàng Thư Các

Ứng dụng web quản lý **thư viện truyện** (metadata + trạng thái đọc), **neo chương**, **thẻ nhân vật / địa danh / vật phẩm**, **mốc câu chuyện**, **wiki nội bộ** và **tra cứu nối (cross-ref)**. Chạy hoàn toàn trên trình duyệt; dữ liệu lưu trong `localStorage` (và có thể xuất / nhập backup).

## Cài đặt & chạy

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
npm run preview
```

## Cấu trúc thư mục (chính)

| Thư mục / file | Mô tả |
|----------------|--------|
| `src/App.jsx` | Luồng chính: thư viện, tab truyện, hub, wiki, xref, tìm kiếm, phím tắt |
| `src/MasterComponents.jsx` | UI tái sử dụng: header, sidebar, modals, bảng |
| `src/MasterUtils.jsx` | Tiện ích: markdown, parse, AI helpers, catalog xref |
| `public/index.json` | **Chỉ mục thư viện** (danh sách truyện + URL nguồn). App fetch file này khi mở |
| `dist/` | Kết quả `npm run build` — deploy static hosting |

## `index.json` (thư viện)

- File mẫu: `public/index.json`.
- Mỗi mục: `id`, `title`, `url` (trang chủ / nguồn), tùy chọn `cover`, `author`, `description`, `tags`, `readingAnchorChapter`, `chaptersRead`, `rating`, `notes`, `lastOpenedAt`, `customFields`, …
- App gộp với dữ liệu đã lưu cục bộ (`tangthu_novels_v1`) và thống kê (`tangthu_novel_stats_v1`).

## Backup & nhập lại

Trong **Cài đặt**:

- **Xuất backup đầy đủ** — toàn bộ truyện + metadata + thống kê (`backupVersion: 2`).
- **Chỉ xuất index** — nhẹ: metadata + cấu hình + thống kê (không nội dung chi tiết từng truyện).
- **Nhập backup** — ghi đè / hợp nhất theo logic trong app; nên xuất backup trước khi thử.

## API keys (tùy chọn)

Một số tính năng (AI gợi ý, phân tích tra cứu nối) dùng API bên ngoài. Cấu hình trong **Cài đặt** (lưu cục bộ). Không commit key vào git.

## Phím tắt & UX

| Phím | Hành động |
|------|-----------|
| `Ctrl+K` / `⌘K` | Mở bảng lệnh (tìm truyện, mở cài đặt, hub, …) |
| `/` | Focus ô tìm kiếm thư viện (khi không đang gõ trong input) |
| `Esc` | Đóng palette / modal / hub / cài đặt (theo thứ tự) |
| **Hoàn tác** (toast) | Sau một số thao tác rủi ro (xóa thẻ/mốc, áp hub, gộp snapshot) |

Lịch sử tìm kiếm thư viện lưu cục bộ; tùy chọn **Wiki: chỉ khớp tên chính xác** giảm liên kết mơ hồ giữa các thẻ.

## Công nghệ

- [React](https://react.dev/) + [Vite](https://vitejs.dev/)
- UI: Tailwind CSS, Lucide icons, vài component shadcn-style

## License

Theo `package.json` / tác giả dự án.
