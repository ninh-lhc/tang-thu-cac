// ==========================================
// TRỤ 1: DỮ LIỆU TĨNH & CẤU HÌNH GỐC
// File: MasterEngines.js
// ==========================================

export const APP_VERSION = "5.4.0 (Neo chương · Tra trong truyện · Thư viện ảnh)";
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
/** Id cố định — buildEntityLinkMap / App.jsx gộp vào wiki & auto-link (tách tên bằng , / | hoặc ngoặc). */
export const WIKI_ALIAS_FIELD = {
  id: 'f_alias',
  label: 'Biệt danh / tên khác (phẩy, / hoặc | — cùng liên kết wiki với tên chính)',
};

/** Thứ tự trong thẻ «Danh sách (AUTO)»: La Mã (I…) = mục lớn; 1, 1.1 = mục con — gợi ý list theo tab. */
export const OUTLINE_LIST_FIELD = {
  id: 'f_muc_luc_danh_sach',
  label: 'Mục lục danh sách (AUTO)',
};

export const DEFAULT_ENTITY_FIELDS = [
  { id: 'f_status', label: 'Cảnh giới / Trạng thái' },
  { id: 'f_title', label: 'Danh hiệu / Phân loại' },
  { id: 'f_desc', label: 'Mô tả đặc trưng' },
  WIKI_ALIAS_FIELD,
];

/** Gộp target vào cur: thêm trường mới từ target, giữ nhãn tùy chỉnh của cur, giữ trường custom. */
export const mergeFieldsTemplate = (cur, target) => {
  if (!target || target.length === 0) return cur && cur.length > 0 ? structuredClone(cur) : [];
  if (!cur || cur.length === 0) return structuredClone(target);
  const targetIds = new Set(target.map((f) => f.id));
  const curById = new Map(cur.map((f) => [f.id, f]));
  const merged = target.map((tf) => {
    const existing = curById.get(tf.id);
    return existing ? { ...existing } : { ...tf };
  });
  cur.forEach((cf) => {
    if (!targetIds.has(cf.id)) merged.push({ ...cf });
  });
  return merged;
};

// ==========================================
// BẢN ĐỒ TRƯỜNG MẶC ĐỊNH THEO LOẠI TAB
// Dùng để tự động gán fieldsTemplate phù hợp
// cho từng sub-tab khi chưa có template
// ==========================================
export const DEFAULT_FIELDS_MAP = {
  // ---- Nhân Vật ----
  'nhan-vat-chinh': [
    { id: 'f_status', label: 'Cảnh giới' },
    { id: 'f_title', label: 'Danh hiệu' },
    { id: 'f_linh_can', label: 'Linh Căn / Thiên Phú' },
    { id: 'f_the_chat', label: 'Thể Chất' },
    { id: 'f_cong_phap', label: 'Công Pháp chính' },
    { id: 'f_vu_khi', label: 'Pháp Bảo' },
    { id: 'f_to_chuc', label: 'Thế Lực / Tông Môn' },
    { id: 'f_desc', label: 'Tính cách' }
  ],
  'dao-lu': [
    { id: 'f_status', label: 'Cảnh giới' },
    { id: 'f_title', label: 'Danh hiệu' },
    { id: 'f_linh_can', label: 'Linh Căn / Thiên Phú' },
    { id: 'f_the_chat', label: 'Thể Chất' },
    { id: 'f_cong_phap', label: 'Công Pháp chính' },
    { id: 'f_quan_he', label: 'Quan hệ với chủ nhân' },
    { id: 'f_desc', label: 'Tính cách' }
  ],
  'phu': [
    { id: 'f_status', label: 'Cảnh giới' },
    { id: 'f_title', label: 'Danh hiệu' },
    { id: 'f_to_chuc', label: 'Thế lực' },
    { id: 'f_vai_tro', label: 'Vai trò trong cốt truyện' },
    { id: 'f_desc', label: 'Đặc điểm' }
  ],
  'ke-thu': [
    { id: 'f_status', label: 'Cảnh giới' },
    { id: 'f_title', label: 'Danh hiệu' },
    { id: 'f_to_chuc', label: 'Thế lực' },
    { id: 'f_dong_luc', label: 'Động lực / Mục tiêu' },
    { id: 'f_vu_khi', label: 'Pháp Bảo' },
    { id: 'f_desc', label: 'Tính cách' }
  ],
  // ---- Thế Lực ----
  'tong-mon': [
    { id: 'f_status', label: 'Cấp bậc' },
    { id: 'f_title', label: 'Chính / Tà' },
    { id: 'f_cap', label: 'Quy mô' },
    { id: 'f_dia_ban', label: 'Địa bàn' },
    { id: 'f_desc', label: 'Đặc trưng' }
  ],
  'gia-toc': [
    { id: 'f_status', label: 'Cấp bậc' },
    { id: 'f_title', label: 'Chính / Tà' },
    { id: 'f_cap', label: 'Quy mô' },
    { id: 'f_dia_ban', label: 'Địa bàn' },
    { id: 'f_desc', label: 'Đặc trưng' }
  ],
  'quoc-gia': [
    { id: 'f_status', label: 'Cấp bậc' },
    { id: 'f_title', label: 'Thể chế' },
    { id: 'f_dia_ban', label: 'Địa bàn' },
    { id: 'f_lanh_dao', label: 'Lực lượng cầm đầu' },
    { id: 'f_desc', label: 'Đặc điểm' }
  ],
  // ---- Vũ Khí & Pháp Bảo ----
  'phap-bao': [
    { id: 'f_status', label: 'Phẩm cấp' },
    { id: 'f_title', label: 'Loại pháp bảo' },
    { id: 'f_chu', label: 'Chủ nhân' },
    { id: 'f_linh_the', label: 'Linh thể / Tinh linh' },
    { id: 'f_desc', label: 'Công năng & Hiệu quả' }
  ],
  'binh-khi': [
    { id: 'f_status', label: 'Phẩm cấp' },
    { id: 'f_title', label: 'Loại vũ khí' },
    { id: 'f_chu', label: 'Chủ nhân' },
    { id: 'f_linh_the', label: 'Linh thể / Tinh linh' },
    { id: 'f_desc', label: 'Công năng' }
  ],
  // ---- Tài Nguyên & Địa Danh ----
  'dia-danh': [
    { id: 'f_status', label: 'Mức nguy hiểm' },
    { id: 'f_title', label: 'Loại địa danh' },
    { id: 'f_vi_tri', label: 'Vị trí' },
    { id: 'f_co_duyen', label: 'Kho báu / Cơ duyên' },
    { id: 'f_desc', label: 'Mô tả' }
  ],
  'dan-duoc': [
    { id: 'f_status', label: 'Phẩm cấp' },
    { id: 'f_title', label: 'Loại' },
    { id: 'f_cong_dung', label: 'Công dụng' },
    { id: 'f_nguyen_lieu', label: 'Nguyên liệu' },
    { id: 'f_desc', label: 'Điều kiện sử dụng' }
  ],
  'tran-phap': [
    { id: 'f_status', label: 'Phẩm cấp' },
    { id: 'f_title', label: 'Loại' },
    { id: 'f_tac_dung', label: 'Tác dụng' },
    { id: 'f_dieu_kien', label: 'Điều kiện triển khai' },
    { id: 'f_desc', label: 'Hạn chế' }
  ],
  // ---- Hệ Thống (System Novel) ----
  'cua-hang': [
    { id: 'f_status', label: 'Giá / Điểm đổi' },
    { id: 'f_title', label: 'Loại vật phẩm' },
    { id: 'f_cap', label: 'Phẩm cấp' },
    { id: 'f_hieu_qua', label: 'Hiệu quả / Công năng' },
    { id: 'f_dieu_kien', label: 'Điều kiện mở khóa' },
    { id: 'f_desc', label: 'Mô tả' }
  ],
  'nhiem-vu': [
    { id: 'f_status', label: 'Độ khó' },
    { id: 'f_title', label: 'Loại nhiệm vụ' },
    { id: 'f_phan_thuong', label: 'Phần thưởng' },
    { id: 'f_dieu_kien', label: 'Điều kiện hoàn thành' },
    { id: 'f_thoi_han', label: 'Thời hạn' },
    { id: 'f_desc', label: 'Mô tả' }
  ],
  'goi-qua': [
    { id: 'f_status', label: 'Phẩm cấp' },
    { id: 'f_title', label: 'Loại gói' },
    { id: 'f_noi_dung', label: 'Nội dung bên trong' },
    { id: 'f_dieu_kien', label: 'Điều kiện nhận' },
    { id: 'f_nguon', label: 'Nguồn gốc' },
    { id: 'f_desc', label: 'Ghi chú' }
  ],
  'loai-nhiem-vu': [
    { id: 'f_status', label: 'Độ khó cơ bản' },
    { id: 'f_title', label: 'Phân loại' },
    { id: 'f_phan_thuong', label: 'Phần thưởng tiêu chuẩn' },
    { id: 'f_dieu_kien', label: 'Điều kiện kích hoạt' },
    { id: 'f_desc', label: 'Đặc trưng' }
  ],
  'chuc-nang-he-thong': [
    { id: 'f_status', label: 'Loại chức năng' },
    { id: 'f_title', label: 'Cấp độ / Tier' },
    { id: 'f_nguon_goc', label: 'Nguồn gốc hệ thống' },
    { id: 'f_dieu_kien', label: 'Điều kiện mở khóa' },
    { id: 'f_desc', label: 'Mô tả chi tiết' }
  ],
  // ---- Tu Luyện ----
  'he-thong-tu-luyen': [
    { id: 'f_status', label: 'Số cấp bậc' },
    { id: 'f_title', label: 'Loại hệ thống' },
    { id: 'f_nguon_goc', label: 'Nguồn gốc' },
    { id: 'f_dac_trung', label: 'Đặc trưng nổi bật' },
    { id: 'f_desc', label: 'Điều kiện tu luyện' }
  ],
  'canh-gioi': [
    { id: 'f_status', label: 'Thuộc hệ thống' },
    { id: 'f_title', label: 'Thứ tự / Cấp số' },
    { id: 'f_dieu_kien', label: 'Điều kiện đột phá' },
    { id: 'f_dac_quyen', label: 'Đặc quyền / Năng lực' },
    { id: 'f_desc', label: 'Đặc điểm nhận dạng' }
  ],
  'cong-phap': [
    { id: 'f_status', label: 'Cảnh giới yêu cầu' },
    { id: 'f_title', label: 'Phân loại' },
    { id: 'f_loai', label: 'Thuộc tính' },
    { id: 'f_cap', label: 'Phẩm giai' },
    { id: 'f_desc', label: 'Công năng' }
  ],
  'the-chat': [
    { id: 'f_status', label: 'Cấp độ' },
    { id: 'f_title', label: 'Phân loại' },
    { id: 'f_loai', label: 'Nguồn gốc' },
    { id: 'f_desc', label: 'Đặc điểm' }
  ]
};

// Template mặc định theo TAB CHA — dùng khi tạo sub-tab mới
export const DEFAULT_FIELDS_BY_PARENT = {
  'nhan-vat': DEFAULT_FIELDS_MAP['phu'],
  'the-luc':  DEFAULT_FIELDS_MAP['gia-toc'],
  'vu-khi':   DEFAULT_FIELDS_MAP['binh-khi'],
  'tai-nguyen': DEFAULT_FIELDS_MAP['dan-duoc'],
  'tu-luyen': DEFAULT_FIELDS_MAP['canh-gioi']
};

// Keyword aliases cho từng category — dùng để map tên tab cha về DEFAULT_FIELDS_BY_PARENT
// Các tab cha tự tạo sẽ dùng bảng này để tra cứu
export const PARENT_LABEL_FIELDS_MAP = [
  { pattern: /nhan vat|npc|character/, fields: DEFAULT_FIELDS_MAP['phu'] },
  { pattern: /the luc|to chuc|lien minh|bang|mon phai|phe/, fields: DEFAULT_FIELDS_MAP['tong-mon'] },
  { pattern: /vu khi|phap bao|binh khi|bao vat|kho vu/, fields: DEFAULT_FIELDS_MAP['binh-khi'] },
  { pattern: /tai nguyen|dia danh|ban do|bi canh/, fields: DEFAULT_FIELDS_MAP['dia-danh'] },
  { pattern: /tu luyen|canh gioi|cong phap/, fields: DEFAULT_FIELDS_MAP['canh-gioi'] },
  { pattern: /he thong|system|cua hang|nhiem vu|shop|quest/, fields: DEFAULT_FIELDS_MAP['nhiem-vu'] },
];

// ==========================================
// ĐOÁN FIELDS DỰA THEO TÊN TAB
// Dùng khi người dùng đặt tên / đổi tên tab
// ==========================================

// Chuẩn hóa tiếng Việt để so sánh keyword
const _normalize = (s) => s.toLowerCase()
  .replace(/[àáảãạăắằẳẵặâấầẩẫậ]/g, 'a')
  .replace(/[đ]/g, 'd')
  .replace(/[èéẻẽẹêếềểễệ]/g, 'e')
  .replace(/[ìíỉĩị]/g, 'i')
  .replace(/[òóỏõọôốồổỗộơớờởỡợ]/g, 'o')
  .replace(/[ùúủũụưứừửữự]/g, 'u')
  .replace(/[ỳýỷỹỵ]/g, 'y');

export const guessFieldsByLabel = (label) => {
  const l = _normalize(label);

  // ── Nhân vật ──────────────────────────────────────────────────
  if (/nhan vat chinh|chu nhan|protagonist|main char/.test(l)) return DEFAULT_FIELDS_MAP['nhan-vat-chinh'];
  if (/dao lu|ban dong hanh|dong doi|bang huu|ba vo|tinh lang/.test(l)) return DEFAULT_FIELDS_MAP['dao-lu'];
  if (/ke thu|phan dien|ac nhan|dich thu|dich nhan|boss/.test(l)) return DEFAULT_FIELDS_MAP['ke-thu'];
  if (/nhan vat|npc|phu|de tu|su phu|nguoi|character/.test(l)) return DEFAULT_FIELDS_MAP['phu'];

  // ── Thế lực ───────────────────────────────────────────────────
  if (/tong mon|thanh dia|mon phai|tong phai|bang hoi|giao/.test(l)) return DEFAULT_FIELDS_MAP['tong-mon'];
  if (/gia toc|dong ho|gia dinh|toc/.test(l)) return DEFAULT_FIELDS_MAP['gia-toc'];
  if (/quoc gia|trieu dai|de quoc|vuong quoc|thanh pho|vuong trieu/.test(l)) return DEFAULT_FIELDS_MAP['quoc-gia'];
  if (/the luc|to chuc|lien minh|phe/.test(l)) return DEFAULT_FIELDS_MAP['tong-mon'];

  // ── Vũ khí & Pháp bảo ─────────────────────────────────────────
  if (/phap bao|linh khi|bao khi|than khi|than binh|linh vu|buu vat/.test(l)) return DEFAULT_FIELDS_MAP['phap-bao'];
  if (/vu khi|binh khi|kiem|dao|thuong|cung|kho vu|kho binh/.test(l)) return DEFAULT_FIELDS_MAP['binh-khi'];

  // ── Địa danh & Bản đồ ─────────────────────────────────────────
  if (/ban do|bi canh|dia danh|dia diem|canh|dong|nui|song|rung|bien|dao|thanh|toa|cung/.test(l)) return DEFAULT_FIELDS_MAP['dia-danh'];

  // ── Đan dược & Tài nguyên ──────────────────────────────────────
  if (/dan duoc|linh thao|duoc lieu|thuoc|nguyen lieu|linh tuoc/.test(l)) return DEFAULT_FIELDS_MAP['dan-duoc'];
  if (/tran phap|phu luc|phu tran|ket gioi|troc tran/.test(l)) return DEFAULT_FIELDS_MAP['tran-phap'];

  // ── Tu luyện ──────────────────────────────────────────────────
  if (/he thong tu|con duong tu|dao tu/.test(l)) return DEFAULT_FIELDS_MAP['he-thong-tu-luyen'];
  if (/canh gioi|cap bac|tang|realm|level/.test(l)) return DEFAULT_FIELDS_MAP['canh-gioi'];
  if (/cong phap|bi thuat|ky nang|tuyet chieu|chieu thuc|bi kip/.test(l)) return DEFAULT_FIELDS_MAP['cong-phap'];
  if (/the chat|huyet mach|linh can|thien phu|hoa mach/.test(l)) return DEFAULT_FIELDS_MAP['the-chat'];

  // ── Hệ Thống (System Novel) ───────────────────────────────────
  if (/cua hang|shop|vat pham|item|hang hoa/.test(l)) return DEFAULT_FIELDS_MAP['cua-hang'];
  if (/nhiem vu|quest|mission|task|su vu|dai ly|danh sach nhiem/.test(l)) return DEFAULT_FIELDS_MAP['nhiem-vu'];
  if (/goi qua|phan thuong|reward|qua tang|bao|gift|kho bau he/.test(l)) return DEFAULT_FIELDS_MAP['goi-qua'];
  if (/loai nhiem|loai nhiem vu|kieu nhiem|phan loai nhiem/.test(l)) return DEFAULT_FIELDS_MAP['loai-nhiem-vu'];
  if (/he thong|thong tin he|chuc nang|system|skill|ky nang he|panel|giao dien he/.test(l)) return DEFAULT_FIELDS_MAP['chuc-nang-he-thong'];

  return null; // Không đoán được — giữ nguyên
};

// Kiểm tra template có phải chưa được tùy chỉnh bởi người dùng không
// (ID người dùng/AI tạo ra dùng dấu gạch ngang: f-xxx; stock dùng dấu gạch dưới: f_xxx)
export const isStockTemplate = (template) => {
  if (!template || template.length === 0) return true;
  return template.every(f => /^f_/.test(f.id));
};

/** Lấy fieldsTemplate cho tab — ưu tiên template đã lưu, fallback theo ID rồi label; luôn đảm bảo có f_alias (cuối). */
export const resolveFieldsTemplate = (tabConfig, parentTabId, parentLabel = '') => {
  const t = tabConfig?.fieldsTemplate;
  const target =
    DEFAULT_FIELDS_MAP[tabConfig?.id] ||
    DEFAULT_FIELDS_BY_PARENT[parentTabId] ||
    guessFieldsByLabel(tabConfig?.label || '') ||
    guessFieldsByLabel(parentLabel);
  const base = (!t || t.length === 0) ? (target || DEFAULT_ENTITY_FIELDS) : t;
  const merged = mergeFieldsTemplate([WIKI_ALIAS_FIELD], base);
  const hasOutline = merged.some((f) => f && f.id === OUTLINE_LIST_FIELD.id);
  if (hasOutline) return merged;
  const aliasIdx = merged.findIndex((f) => f && f.id === WIKI_ALIAS_FIELD.id);
  if (aliasIdx >= 0) {
    const next = [...merged];
    next.splice(aliasIdx, 0, { ...OUTLINE_LIST_FIELD });
    return next;
  }
  return [...merged, { ...OUTLINE_LIST_FIELD }];
};

/** Lần đầu có đúng 1 thẻ trong mục: ghi fieldsTemplate vào tabsConfig (thẻ chuẩn cho mục đó). */
export function lockFieldsTemplateIfFirstEntity(nov, lonId, nhoDataKey) {
  const tabData = nov.data?.[lonId]?.[nhoDataKey];
  if (!tabData?.entities || tabData.entities.length !== 1) return;
  if (!nov.tabsConfig) nov.tabsConfig = [];
  const lon = nov.tabsConfig.find((t) => t.id === lonId);
  let nho = lon?.subTabs?.find((s) => s.id === nhoDataKey);
  if (!nho && nhoDataKey === 'default' && lon?.subTabs?.length) {
    nho = lon.subTabs.find((s) => s.viewType === 'collection-track') || lon.subTabs[0];
  }
  if (!nho) return;
  const parentLabel = lon?.label || '';
  nho.fieldsTemplate = structuredClone(resolveFieldsTemplate(nho, lonId, parentLabel));
}

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
      { 
        id: 'he-thong-tu-luyen', 
        label: 'Hệ thống tu luyện', 
        viewType: 'collection-track',
        tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Số cấp bậc' },
          { id: 'f_title', label: 'Loại hệ thống' },
          { id: 'f_nguon_goc', label: 'Nguồn gốc' },
          { id: 'f_dac_trung', label: 'Đặc trưng nổi bật' },
          { id: 'f_desc', label: 'Điều kiện tu luyện' }
        ]
      },
      { 
        id: 'canh-gioi', 
        label: 'Cảnh Giới', 
        viewType: 'collection-track',
        tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Thuộc hệ thống' },
          { id: 'f_title', label: 'Thứ tự / Cấp số' },
          { id: 'f_dieu_kien', label: 'Điều kiện đột phá' },
          { id: 'f_dac_quyen', label: 'Đặc quyền / Năng lực' },
          { id: 'f_desc', label: 'Đặc điểm nhận dạng' }
        ]
      },
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
      {
        id: 'dao-lu', label: 'Đạo lữ', viewType: 'collection-track', tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Cảnh giới' },
          { id: 'f_title', label: 'Danh hiệu' },
          { id: 'f_linh_can', label: 'Linh Căn / Thiên Phú' },
          { id: 'f_the_chat', label: 'Thể Chất' },
          { id: 'f_cong_phap', label: 'Công Pháp chính' },
          { id: 'f_quan_he', label: 'Quan hệ với chủ nhân' },
          { id: 'f_desc', label: 'Tính cách' }
        ]
      },
      {
        id: 'phu', label: 'Nhân vật phụ', viewType: 'collection-track', tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Cảnh giới' },
          { id: 'f_title', label: 'Danh hiệu' },
          { id: 'f_to_chuc', label: 'Thế lực' },
          { id: 'f_vai_tro', label: 'Vai trò trong cốt truyện' },
          { id: 'f_desc', label: 'Đặc điểm' }
        ]
      },
      {
        id: 'ke-thu', label: 'Kẻ thù / Phản diện', viewType: 'collection-track', tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Cảnh giới' },
          { id: 'f_title', label: 'Danh hiệu' },
          { id: 'f_to_chuc', label: 'Thế lực' },
          { id: 'f_dong_luc', label: 'Động lực / Mục tiêu' },
          { id: 'f_vu_khi', label: 'Pháp Bảo' },
          { id: 'f_desc', label: 'Tính cách' }
        ]
      }
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
          { id: 'f_dia_ban', label: 'Địa bàn' },
          { id: 'f_desc', label: 'Đặc trưng' }
        ]
      },
      {
        id: 'gia-toc', label: 'Gia tộc', viewType: 'collection-track', tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Cấp bậc' },
          { id: 'f_title', label: 'Chính / Tà' },
          { id: 'f_cap', label: 'Quy mô' },
          { id: 'f_dia_ban', label: 'Địa bàn' },
          { id: 'f_desc', label: 'Đặc trưng' }
        ]
      },
      {
        id: 'quoc-gia', label: 'Quốc gia / Triều đại', viewType: 'collection-track', tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Cấp bậc' },
          { id: 'f_title', label: 'Thể chế' },
          { id: 'f_dia_ban', label: 'Địa bàn' },
          { id: 'f_lanh_dao', label: 'Lực lượng cầm đầu' },
          { id: 'f_desc', label: 'Đặc điểm' }
        ]
      }
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
      {
        id: 'binh-khi', label: 'Kho Binh Khí', viewType: 'collection-track', tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Phẩm cấp' },
          { id: 'f_title', label: 'Loại vũ khí' },
          { id: 'f_chu', label: 'Chủ nhân' },
          { id: 'f_linh_the', label: 'Linh thể / Tinh linh' },
          { id: 'f_desc', label: 'Công năng' }
        ]
      }
    ]
  },
  { 
    id: 'tai-nguyen', 
    label: 'Tài Nguyên & Địa Danh', 
    iconName: 'Map', 
    subTabs: [
      {
        id: 'dia-danh', label: 'Bản đồ / Bí cảnh', viewType: 'collection-track', tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Mức nguy hiểm' },
          { id: 'f_title', label: 'Loại địa danh' },
          { id: 'f_vi_tri', label: 'Vị trí' },
          { id: 'f_co_duyen', label: 'Kho báu / Cơ duyên' },
          { id: 'f_desc', label: 'Mô tả' }
        ]
      },
      {
        id: 'dan-duoc', label: 'Đan dược / Linh thảo', viewType: 'collection-track', tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Phẩm cấp' },
          { id: 'f_title', label: 'Loại' },
          { id: 'f_cong_dung', label: 'Công dụng' },
          { id: 'f_nguyen_lieu', label: 'Nguyên liệu' },
          { id: 'f_desc', label: 'Điều kiện sử dụng' }
        ]
      },
      {
        id: 'tran-phap', label: 'Trận pháp / Phù lục', viewType: 'collection-track', tabCon: [],
        fieldsTemplate: [
          { id: 'f_status', label: 'Phẩm cấp' },
          { id: 'f_title', label: 'Loại' },
          { id: 'f_tac_dung', label: 'Tác dụng' },
          { id: 'f_dieu_kien', label: 'Điều kiện triển khai' },
          { id: 'f_desc', label: 'Hạn chế' }
        ]
      }
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
