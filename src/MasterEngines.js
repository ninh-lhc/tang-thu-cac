// ==========================================
// TRỤ 1: CỘI NGUỒN DỮ LIỆU & CẤU HÌNH (ENGINES)
// File: MasterEngines.js
// Vai trò: Chứa dữ liệu mẫu, cấu hình mặc định, danh mục cố định
// ==========================================

export const apiKey = ""; // API Key (Sẽ được ghi đè bằng LocalStorage qua Giao diện)

export const FALLBACK_IMG = "https://images.unsplash.com/photo-1618331835717-801e976710b2?q=80&w=250&auto=format&fit=crop";

// DANH SÁCH 7 ĐẠI LỘ TU LUYỆN
export const GENRES = [
  "Tiên Hiệp",
  "Huyền Huyễn",
  "Ngôn Tình",
  "Hệ Thống",
  "Trọng Sinh & Xuyên Không",
  "Đô Thị",
  "Vô Hạn Lưu"
];

// DANH SÁCH 7 KHÍ CHẤT GIAO DIỆN (THEMES)
export const THEMES = [
  { id: 'theme-tien-hiep', label: 'Tiên Hiệp (Vàng Hổ Phách)' },
  { id: 'theme-huyen-huyen', label: 'Huyền Huyễn (Tím Tinh Tú)' },
  { id: 'theme-ngon-tinh', label: 'Ngôn Tình (Đỏ Hồng)' },
  { id: 'theme-he-thong', label: 'Hệ Thống (Xanh Neon)' },
  { id: 'theme-trong-sinh', label: 'Trọng Sinh (Xanh Ngọc Bích)' },
  { id: 'theme-do-thi', label: 'Đô Thị (Xanh Lam)' },
  { id: 'theme-vo-han-luu', label: 'Vô Hạn Lưu (Cam Đỏ Lửa)' }
];

// KHUÔN ĐÚC THUỘC TÍNH MẶC ĐỊNH CHO THỰC THỂ
export const DEFAULT_ENTITY_FIELDS = [
  { id: 'f_status', label: 'Cảnh giới / Trạng thái' },
  { id: 'f_title', label: 'Danh hiệu / Phân loại' },
  { id: 'f_desc', label: 'Mô tả đặc trưng' }
];

// CẤU TRÚC PHÁP TRẬN (MỤC LỤC) MẶC ĐỊNH KHI TẠO TRUYỆN MỚI
export const INITIAL_TABS_CONFIG = [
  { id: 'tong-quan', label: 'Tổng Quan', iconName: 'Globe', isFixed: true },
  { id: 'nhan-vat', label: 'Nhân Vật', iconName: 'User', subTabs: [
      { id: 'chinh', label: 'Nhân vật chính', viewType: 'collection-track', tabCon: [] },
      { id: 'phu', label: 'Nhân vật phụ', viewType: 'collection-track', tabCon: [] }
  ]},
  { id: 'the-luc', label: 'Thế Lực', iconName: 'Hexagon', subTabs: [
      { id: 'tong-mon', label: 'Tông môn / Gia tộc', viewType: 'collection-track', tabCon: [] },
      { id: 'quoc-gia', label: 'Quốc gia / Triều đại', viewType: 'collection-track', tabCon: [] }
  ]},
  { id: 'vu-khi', label: 'Công Pháp & Pháp Bảo', iconName: 'Swords', subTabs: [
      { id: 'cong-phap', label: 'Công pháp / Bí thuật', viewType: 'collection-track', tabCon: [] },
      { id: 'phap-bao', label: 'Pháp bảo / Vũ khí', viewType: 'collection-track', tabCon: [] }
  ]},
  { id: 'tai-nguyen', label: 'Tài Nguyên & Địa Danh', iconName: 'Map', subTabs: [
      { id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track', tabCon: [] },
      { id: 'linh-thao', label: 'Linh thảo / Đan dược', viewType: 'collection-track', tabCon: [] }
  ]}
];

// KHO LƯU TRỮ TRỐNG (Khởi tạo ban đầu)
export const MOCK_METADATA = [];
export const MOCK_NOVEL_DATA = {};