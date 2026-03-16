// ==========================================
// TRỤ 1: DỮ LIỆU TĨNH & CẤU HÌNH GỐC
// File: MasterEngines.js
// ==========================================

export const APP_VERSION = "5.1.0 (Hợp Nhất Toàn Diện)";
export const apiKey = ""; // Được ghi đè bằng LocalStorage qua Giao diện

export const FALLBACK_IMG = "data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100%25' height='100%25' fill='%230f172a'/%3E%3Cpath d='M50 35a15 15 0 100-30 15 15 0 000 30zm0 10c-20 0-35 15-35 35h70c0-20-15-35-35-35z' fill='%23334155'/%3E%3C/svg%3E";

// ==========================================
// DANH SÁCH THỂ LOẠI
// ==========================================
export const GENRES = [
  "Tiên Hiệp",
  "Huyền Huyễn",
  "Ngôn Tình",
  "Hệ Thống",
  "Trọng Sinh & Xuyên Không",
  "Đô Thị",
  "Vô Hạn Lưu",
  "Võng Du",
  "Khoa Huyễn",
  "Mạt Thế",
  "Đồng Nhân",
  "Lịch Sử",
  "Linh Dị"
];

// ==========================================
// DANH SÁCH THEMES GIAO DIỆN
// ==========================================
export const THEMES = [
  { id: 'theme-tien-hiep', label: 'Tiên Hiệp (Vàng Hổ Phách)' },
  { id: 'theme-huyen-huyen', label: 'Huyền Huyễn (Tím Tinh Tú)' },
  { id: 'theme-ngon-tinh', label: 'Ngôn Tình (Đỏ Hồng)' },
  { id: 'theme-he-thong', label: 'Hệ Thống (Xanh Neon)' },
  { id: 'theme-trong-sinh', label: 'Trọng Sinh (Xanh Ngọc Bích)' },
  { id: 'theme-do-thi', label: 'Đô Thị (Xanh Lam)' },
  { id: 'theme-vo-han-luu', label: 'Vô Hạn Lưu (Cam Đỏ Lửa)' }
];

// ==========================================
// KHUÔN ĐÚC THUỘC TÍNH MẶC ĐỊNH
// ==========================================
export const DEFAULT_ENTITY_FIELDS = [
  { id: 'f_status', label: 'Cảnh giới / Trạng thái' },
  { id: 'f_title', label: 'Danh hiệu / Phân loại' },
  { id: 'f_desc', label: 'Mô tả đặc trưng' }
];

// ==========================================
// CẤU TRÚC MỤC LỤC MẶC ĐỊNH KHI TẠO TRUYỆN MỚI
// ==========================================
export const INITIAL_TABS_CONFIG = [
  { 
    id: 'tong-quan', 
    label: 'Tổng Quan', 
    iconName: 'BookOpen', 
    subTabs: [], 
    isFixed: true 
  },
  { 
    id: 'tu-luyen', 
    label: 'Tu Luyện', 
    iconName: 'Flame', 
    subTabs: [
      { id: 'he-thong-tu-luyen', label: 'Hệ thống tu luyện' },
      { 
        id: 'cong-phap', 
        label: 'Công pháp / Bí thuật', 
        viewType: 'collection-track', 
        tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Cảnh giới yêu cầu' },
          { id: 'f_title', label: 'Phân loại' },
          { id: 'f_loai', label: 'Thuộc tính' },
          { id: 'f_cap', label: 'Phẩm giai' },
          { id: 'f_desc', label: 'Công năng' }
        ]
      },
      { 
        id: 'the-chat', 
        label: 'Thể chất / Huyết mạch', 
        viewType: 'collection-track', 
        tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Cấp độ' },
          { id: 'f_title', label: 'Phân loại' },
          { id: 'f_loai', label: 'Nguồn gốc' },
          { id: 'f_desc', label: 'Đặc điểm' }
        ]
      }
    ]
  },
  { 
    id: 'nhan-vat', 
    label: 'Nhân Vật', 
    iconName: 'User', 
    subTabs: [
      { 
        id: 'nhan-vat-chinh', 
        label: 'Nhân vật chính', 
        viewType: 'collection-track', 
        tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Cảnh giới' },
          { id: 'f_title', label: 'Danh hiệu' },
          { id: 'f_linh_can', label: 'Linh Căn / Thiên Phú' },
          { id: 'f_the_chat', label: 'Thể Chất' },
          { id: 'f_cong_phap', label: 'Công Pháp' },
          { id: 'f_vu_khi', label: 'Pháp Bảo' },
          { id: 'f_to_chuc', label: 'Thế Lực / Tông Môn' },
          { id: 'f_desc', label: 'Tính cách' }
        ]
      },
      { id: 'dao-lu', label: 'Đạo lữ', viewType: 'collection-track', tabCon: [] },
      { id: 'phu', label: 'Nhân vật phụ', viewType: 'collection-track', tabCon: [] },
      { id: 'ke-thu', label: 'Kẻ thù / Phản diện', viewType: 'collection-track', tabCon: [] }
    ]
  },
  { 
    id: 'the-luc', 
    label: 'Thế Lực', 
    iconName: 'Hexagon', 
    subTabs: [
      { 
        id: 'tong-mon', 
        label: 'Tông môn / Thánh địa', 
        viewType: 'collection-track', 
        tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Cấp bậc' },
          { id: 'f_title', label: 'Chính / Tà' },
          { id: 'f_cap', label: 'Quy mô' },
          { id: 'f_desc', label: 'Đặc trưng' }
        ]
      },
      { id: 'gia-toc', label: 'Gia tộc', viewType: 'collection-track', tabCon: [] },
      { id: 'quoc-gia', label: 'Quốc gia / Triều đại', viewType: 'collection-track', tabCon: [] }
    ]
  },
  { 
    id: 'vu-khi', 
    label: 'Vũ Khí & Pháp Bảo', 
    iconName: 'Swords', 
    subTabs: [
      { 
        id: 'phap-bao', 
        label: 'Pháp bảo / Vũ khí', 
        viewType: 'collection-track', 
        tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Phẩm cấp' },
          { id: 'f_title', label: 'Loại pháp bảo' },
          { id: 'f_chu', label: 'Chủ nhân' },
          { id: 'f_desc', label: 'Công năng & Hiệu quả' }
        ]
      },
      { id: 'binh-khi', label: 'Kho Binh Khí', viewType: 'collection-track', tabCon: [] }
    ]
  },
  { 
    id: 'tai-nguyen', 
    label: 'Tài Nguyên & Địa Danh', 
    iconName: 'Map', 
    subTabs: [
      { id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track', tabCon: [] },
      { id: 'dan-duoc', label: 'Đan dược / Linh thảo', viewType: 'collection-track', tabCon: [] },
      { id: 'tran-phap', label: 'Trận pháp / Phù lục', viewType: 'collection-track', tabCon: [] }
    ]
  },
  { 
    id: 'the-gioi', 
    label: 'Thế Giới Quan', 
    iconName: 'Globe', 
    subTabs: [
      { 
        id: 'cau-truc', 
        label: 'Cấu trúc đa tầng', 
        tabCon: [
          { id: 'pham-gioi', label: 'Phàm giới' }, 
          { id: 'linh-gioi', label: 'Linh giới' }
        ] 
      },
      { id: 'quy-luat', label: 'Quy luật thiên đạo' }
    ]
  }
];

// ==========================================
// DỮ LIỆU MẪU
// ==========================================
export const MOCK_METADATA = [];
export const MOCK_NOVEL_DATA = {};
