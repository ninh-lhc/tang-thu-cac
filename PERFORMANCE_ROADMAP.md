# Lộ trình hiệu năng — truyện cực lớn

Thứ tự ưu tiên đã thống nhất; cập nhật trạng thái khi hoàn thành từng mục.

| Ưu tiên | Hạng mục | Trạng thái | Ghi chú ngắn |
|--------|-----------|------------|----------------|
| **P0** | Timeline: virtual list / phân trang mốc (`AppEntityTimelinePanel`) | **Xong** | `@tanstack/react-virtual` — cột trái, `estimateSize` + `measureElement` |
| **P1** | Wiki / `globalLinkRegex`: tránh một regex khổng lồ | Chưa | Trie / chunk / lazy theo viewport |
| **P1** | Cache hoặc incremental `computeRelatedEntities` | Chưa | Giảm quét full novel mỗi lần đổi thẻ |
| **P2** | Lazy load `data` theo tab (RAM) | Chưa | Ghép với shard đĩa |
| **P2** | Ghi shard chỉ phần dirty | Chưa | Giảm I/O khi Lưu |
| **P2** | Index tìm kiếm + Worker | Chưa | Khi tìm toàn truyện chậm đo được |

Chi tiết giải pháp từng mục: xem lịch sử trao đổi / backlog issue nội bộ.
