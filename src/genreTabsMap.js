// ==========================================
// CẤU TRÚC MỤC LỤC THEO THỂ LOẠI (từ cau-truc.txt)
// Dùng khi chọn thể loại + bấm "Tạo cấu trúc theo thể loại"
// ==========================================
import { DEFAULT_FIELDS_MAP } from './MasterEngines.js';
import { normalizeGenreSubTabId } from './lib/genreSubTabIdNormalize.js';
import { hydrateTabsAutoSyncConfigs } from './lib/tabAutoSyncFieldMap.js';
import { hydrateTabsAutoSyncLinkTargets } from './lib/tabAutoSyncLinks.js';
import {
  AUTO_SYNC_ROLE_CHARACTER_RELATED,
  AUTO_SYNC_ROLE_FORCE,
  AUTO_SYNC_ROLE_MAP,
  AUTO_SYNC_ROLE_MAIN_CHARACTER,
} from './lib/tabAutoSyncRole.js';

export { normalizeGenreSubTabId };

const DEFAULT_FIELDS = [
  { id: 'f_status', label: 'Trạng thái / Cấp' },
  { id: 'f_title', label: 'Tên / Danh xưng' },
  { id: 'f_desc', label: 'Mô tả' }
];

function cloneValue(value) {
  try {
    return typeof structuredClone === 'function' ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  } catch {
    return value;
  }
}

const cloneFields = (fields = DEFAULT_FIELDS) => cloneValue(fields);
const fromDefault = (key) => DEFAULT_FIELDS_MAP[key] || DEFAULT_FIELDS;
const buildFields = (entries) => entries.map(([id, label]) => ({ id, label }));

const FIELD_PRESETS = Object.freeze({
  default: DEFAULT_FIELDS,
  protagonistCultivation: fromDefault('nhan-vat-chinh'),
  companionCultivation: fromDefault('dao-lu'),
  characterCultivation: fromDefault('phu'),
  rivalCultivation: fromDefault('ke-thu'),
  factionSect: fromDefault('tong-mon'),
  factionFamily: fromDefault('gia-toc'),
  factionNation: fromDefault('quoc-gia'),
  mapLocation: fromDefault('dia-danh'),
  artifact: fromDefault('phap-bao'),
  weapon: fromDefault('binh-khi'),
  shop: fromDefault('cua-hang'),
  pill: fromDefault('dan-duoc'),
  formation: fromDefault('tran-phap'),
  systemFeature: fromDefault('chuc-nang-he-thong'),
  quest: fromDefault('nhiem-vu'),
  rewardPack: fromDefault('goi-qua'),
  questType: fromDefault('loai-nhiem-vu'),
  cultivationSystem: fromDefault('he-thong-tu-luyen'),
  realm: fromDefault('canh-gioi'),
  skill: fromDefault('cong-phap'),
  constitution: fromDefault('the-chat'),
  romanceLead: buildFields([
    ['f_status', 'Thân phận / vai vế'],
    ['f_title', 'Vai trò tình cảm'],
    ['f_quan_he', 'Mối quan hệ chính'],
    ['f_dong_luc', 'Nút thắt / động cơ'],
    ['f_desc', 'Ấn tượng / tính cách']
  ]),
  romanceRival: buildFields([
    ['f_status', 'Thân phận / vai vế'],
    ['f_title', 'Vị trí trong drama'],
    ['f_quan_he', 'Liên kết với cặp chính'],
    ['f_dong_luc', 'Mưu tính / tổn thương'],
    ['f_desc', 'Ấn tượng / thủ đoạn']
  ]),
  romanceSetting: buildFields([
    ['f_status', 'Bối cảnh / niên đại'],
    ['f_title', 'Loại tuyến'],
    ['f_dia_ban', 'Không gian trọng tâm'],
    ['f_quy_tac', 'Quy tắc / áp lực xã hội'],
    ['f_desc', 'Chất cảm / tông truyện']
  ]),
  romanceArc: buildFields([
    ['f_status', 'Giai đoạn cảm xúc'],
    ['f_title', 'Loại tuyến tình cảm'],
    ['f_quan_he', 'Nhân vật liên quan'],
    ['f_dieu_kien', 'Chướng ngại / bước ngoặt'],
    ['f_desc', 'Nhịp cảm xúc']
  ]),
  romancePlot: buildFields([
    ['f_status', 'Mức độ drama'],
    ['f_title', 'Loại kịch bản'],
    ['f_quan_he', 'Phe liên quan'],
    ['f_dieu_kien', 'Điểm bùng nổ'],
    ['f_desc', 'Hậu quả / sức nặng']
  ]),
  modernLead: buildFields([
    ['f_status', 'Thân phận / nghề nghiệp'],
    ['f_title', 'Danh xưng / archetype'],
    ['f_to_chuc', 'Gia thế / vòng tròn'],
    ['f_nang_luc', 'Năng lực / sở trường'],
    ['f_desc', 'Tính cách / ấn tượng']
  ]),
  modernFaction: buildFields([
    ['f_status', 'Quy mô / đẳng cấp'],
    ['f_title', 'Lĩnh vực / loại thế lực'],
    ['f_lanh_dao', 'Người đứng đầu'],
    ['f_dia_ban', 'Địa bàn / phạm vi'],
    ['f_desc', 'Ảnh hưởng / đặc trưng']
  ]),
  modernDomain: buildFields([
    ['f_status', 'Độ hiếm / cấp độ'],
    ['f_title', 'Lĩnh vực / chuyên môn'],
    ['f_hieu_qua', 'Giá trị / công dụng'],
    ['f_dieu_kien', 'Điều kiện triển khai'],
    ['f_desc', 'Phong cách / ghi chú']
  ]),
  fantasyRace: buildFields([
    ['f_status', 'Huyết mạch / cấp bậc'],
    ['f_title', 'Chủng tộc / phân nhánh'],
    ['f_dia_ban', 'Lãnh địa / nơi cư trú'],
    ['f_nang_luc', 'Thiên phú / đặc quyền'],
    ['f_desc', 'Đặc trưng văn hóa']
  ]),
  fantasyPower: buildFields([
    ['f_status', 'Cấp / vòng'],
    ['f_title', 'Hệ / trường phái'],
    ['f_dieu_kien', 'Điều kiện thức tỉnh'],
    ['f_hieu_qua', 'Hiệu quả / chiêu bài'],
    ['f_desc', 'Giới hạn / ghi chú']
  ]),
  fantasySetting: buildFields([
    ['f_status', 'Cấp tầng / mức nguy hiểm'],
    ['f_title', 'Loại khu vực'],
    ['f_dia_ban', 'Thuộc giới / liên hệ'],
    ['f_co_duyen', 'Di sản / tài nguyên'],
    ['f_desc', 'Không khí / quy tắc']
  ]),
  fantasyCreature: buildFields([
    ['f_status', 'Huyết mạch / cấp bậc'],
    ['f_title', 'Loài / hệ'],
    ['f_chu', 'Ràng buộc / chủ nhân'],
    ['f_hieu_qua', 'Năng lực / thiên phú'],
    ['f_desc', 'Điểm yếu / tập tính']
  ]),
  systemCore: buildFields([
    ['f_status', 'Phân hệ / phiên bản'],
    ['f_title', 'Nguồn gốc / loại hệ thống'],
    ['f_quyen_han', 'Quyền hạn / cấp truy cập'],
    ['f_rang_buoc', 'Ràng buộc / giới hạn'],
    ['f_desc', 'Ghi chú vận hành']
  ]),
  systemStat: buildFields([
    ['f_status', 'Giá trị / cấp'],
    ['f_title', 'Loại thuộc tính'],
    ['f_nguon', 'Nguồn tăng trưởng'],
    ['f_dieu_kien', 'Điều kiện hiển thị'],
    ['f_desc', 'Ý nghĩa / ghi chú']
  ]),
  systemReward: buildFields([
    ['f_status', 'Tỷ lệ / độ hiếm'],
    ['f_title', 'Loại thưởng'],
    ['f_noi_dung', 'Phần thưởng / pool'],
    ['f_dieu_kien', 'Điều kiện kích hoạt'],
    ['f_desc', 'Ghi chú vận hành']
  ]),
  rebirthNode: buildFields([
    ['f_status', 'Mốc thời gian'],
    ['f_title', 'Loại bước ngoặt'],
    ['f_quan_he', 'Nhân quả liên quan'],
    ['f_loi_the', 'Lợi thế / bí mật'],
    ['f_desc', 'Dấu vết để lại']
  ]),
  rebirthKarma: buildFields([
    ['f_status', 'Thân phận hiện tại'],
    ['f_title', 'Loại nhân quả'],
    ['f_quan_he', 'Liên hệ tiền thế'],
    ['f_dong_luc', 'Ân oán / chấp niệm'],
    ['f_desc', 'Mức độ ảnh hưởng']
  ]),
  rebirthCheat: buildFields([
    ['f_status', 'Cấp / độ hiếm'],
    ['f_title', 'Loại cơ duyên'],
    ['f_dieu_kien', 'Điều kiện kích hoạt'],
    ['f_hieu_qua', 'Lợi ích / sức mạnh'],
    ['f_desc', 'Giới hạn / cái giá']
  ]),
  infiniteSpace: buildFields([
    ['f_status', 'Cấp / quyền hạn'],
    ['f_title', 'Loại không gian'],
    ['f_quy_tac', 'Quy tắc / luật chơi'],
    ['f_phan_thuong', 'Phần thưởng / trừng phạt'],
    ['f_desc', 'Ghi chú vận hành']
  ]),
  infiniteMember: buildFields([
    ['f_status', 'Cấp sinh tồn'],
    ['f_title', 'Vai trò trong đội'],
    ['f_nang_luc', 'Năng lực chủ lực'],
    ['f_dao_cu', 'Đạo cụ / huyết thống'],
    ['f_desc', 'Thói quen / điểm yếu']
  ]),
  infiniteScenario: buildFields([
    ['f_status', 'Độ khó / rank'],
    ['f_title', 'Loại phó bản'],
    ['f_chan_tuong', 'Chân tướng / quy tắc'],
    ['f_dieu_kien', 'Điều kiện sống sót'],
    ['f_phan_thuong', 'Thưởng / mở khóa']
  ]),
  infiniteUpgrade: buildFields([
    ['f_status', 'Cấp / lượng điểm'],
    ['f_title', 'Loại cường hóa'],
    ['f_dieu_kien', 'Điều kiện đổi'],
    ['f_hieu_qua', 'Hiệu quả / buff'],
    ['f_desc', 'Tác dụng phụ / ghi chú']
  ]),
  gameProfile: buildFields([
    ['f_status', 'Level / cấp'],
    ['f_title', 'Class / nghề'],
    ['f_chi_so', 'Chỉ số nổi bật'],
    ['f_to_chuc', 'Guild / phe'],
    ['f_desc', 'Phong cách build']
  ]),
  gameGear: buildFields([
    ['f_status', 'Phẩm chất / rarity'],
    ['f_title', 'Loại trang bị'],
    ['f_chu', 'Người dùng / class phù hợp'],
    ['f_hieu_qua', 'Hiệu ứng / set bonus'],
    ['f_nguon', 'Nguồn rơi / cách kiếm']
  ]),
  gameFaction: buildFields([
    ['f_status', 'Xếp hạng / cấp hội'],
    ['f_title', 'Loại tổ chức'],
    ['f_lanh_dao', 'Người cầm đầu'],
    ['f_dia_ban', 'Máy chủ / lãnh địa'],
    ['f_desc', 'Phong cách / văn hóa']
  ]),
  gameQuest: buildFields([
    ['f_status', 'Độ khó'],
    ['f_title', 'Loại gameplay'],
    ['f_muc_tieu', 'Mục tiêu / thử thách'],
    ['f_phan_thuong', 'Phần thưởng'],
    ['f_desc', 'Ghi chú chiến thuật']
  ]),
  scifiWorld: buildFields([
    ['f_status', 'Cấp văn minh / mức độ'],
    ['f_title', 'Loại khu vực'],
    ['f_to_chuc', 'Thế lực kiểm soát'],
    ['f_tai_nguyen', 'Tài nguyên / đặc sản'],
    ['f_desc', 'Môi trường / nguy cơ']
  ]),
  scifiTech: buildFields([
    ['f_status', 'Tier / cấp công nghệ'],
    ['f_title', 'Loại công nghệ'],
    ['f_chu', 'Nhà phát triển / chủ sở hữu'],
    ['f_hieu_qua', 'Thông số nổi bật'],
    ['f_desc', 'Ứng dụng / giới hạn']
  ]),
  scifiEvolution: buildFields([
    ['f_status', 'Cấp tiến hóa'],
    ['f_title', 'Nhánh biến đổi'],
    ['f_dieu_kien', 'Điều kiện thức tỉnh'],
    ['f_hieu_qua', 'Năng lực / hiệu quả'],
    ['f_desc', 'Tác dụng phụ / di chứng']
  ]),
  apocalypseBackdrop: buildFields([
    ['f_status', 'Giai đoạn / mức nguy cơ'],
    ['f_title', 'Loại biến cố'],
    ['f_dia_ban', 'Khu vực chịu ảnh hưởng'],
    ['f_tac_nhan', 'Tác nhân / nguồn cơn'],
    ['f_desc', 'Tàn phá / bối cảnh']
  ]),
  apocalypseThreat: buildFields([
    ['f_status', 'Cấp đe dọa'],
    ['f_title', 'Loại mối nguy'],
    ['f_dia_ban', 'Khu vực hoạt động'],
    ['f_hieu_qua', 'Năng lực / đặc tính'],
    ['f_desc', 'Điểm yếu / dấu hiệu']
  ]),
  apocalypseFaction: buildFields([
    ['f_status', 'Cấp phòng thủ / quy mô'],
    ['f_title', 'Loại căn cứ / phe'],
    ['f_lanh_dao', 'Người đứng đầu'],
    ['f_tai_nguyen', 'Nguồn lực / hậu cần'],
    ['f_desc', 'Quy tắc sinh tồn']
  ]),
  apocalypseResource: buildFields([
    ['f_status', 'Độ khan hiếm / cấp'],
    ['f_title', 'Loại tài nguyên'],
    ['f_nguon', 'Nguồn cung / cách kiếm'],
    ['f_hieu_qua', 'Công dụng'],
    ['f_desc', 'Rủi ro / ghi chú']
  ]),
  awakenedCharacter: buildFields([
    ['f_status', 'Cấp thức tỉnh'],
    ['f_title', 'Hệ dị năng'],
    ['f_vai_tro', 'Vai trò sinh tồn'],
    ['f_vu_khi', 'Vũ khí / trang bị'],
    ['f_desc', 'Ưu thế / khuyết điểm']
  ]),
  fanficWorld: buildFields([
    ['f_status', 'Mốc canon / phần truyện'],
    ['f_title', 'Loại thiết lập'],
    ['f_quy_tac', 'Quy tắc cốt lõi'],
    ['f_phan_nhanh', 'Nhánh thay đổi'],
    ['f_desc', 'Ghi chú đối chiếu']
  ]),
  fanficCharacter: buildFields([
    ['f_status', 'Thân phận / tuyến'],
    ['f_title', 'Vai trò canon / AU'],
    ['f_quan_he', 'Liên hệ với nguyên tác'],
    ['f_khac_biet', 'Khác biệt / OOC'],
    ['f_desc', 'Dấu ấn / ghi chú']
  ]),
  fanficPlot: buildFields([
    ['f_status', 'Mức lệch canon'],
    ['f_title', 'Loại nhánh truyện'],
    ['f_quan_he', 'Nhân vật bị ảnh hưởng'],
    ['f_dieu_kien', 'Điểm kích hoạt'],
    ['f_desc', 'Hướng kết cục']
  ]),
  historyBackdrop: buildFields([
    ['f_status', 'Giai đoạn / niên hiệu'],
    ['f_title', 'Loại cục diện'],
    ['f_dia_ban', 'Phạm vi ảnh hưởng'],
    ['f_to_chuc', 'Phe thống trị'],
    ['f_desc', 'Xu thế chính']
  ]),
  historyCharacter: buildFields([
    ['f_status', 'Chức vị / thân phận'],
    ['f_title', 'Phe phái / vị trí'],
    ['f_dia_ban', 'Địa bàn / căn cơ'],
    ['f_nang_luc', 'Mưu lược / sở trường'],
    ['f_desc', 'Dã tâm / dấu ấn']
  ]),
  historyEvent: buildFields([
    ['f_status', 'Giai đoạn / quy mô'],
    ['f_title', 'Loại sự kiện'],
    ['f_quan_he', 'Phe liên quan'],
    ['f_ket_qua', 'Kết quả trực tiếp'],
    ['f_desc', 'Ảnh hưởng lịch sử']
  ]),
  historyDevelopment: buildFields([
    ['f_status', 'Mức phát triển / quy mô'],
    ['f_title', 'Loại hạng mục'],
    ['f_nguon_luc', 'Nguồn lực / hậu cần'],
    ['f_dia_ban', 'Phạm vi triển khai'],
    ['f_desc', 'Tác động / hiệu quả']
  ]),
  horrorHuman: buildFields([
    ['f_status', 'Tình trạng / độ nhiễm'],
    ['f_title', 'Vai trò trong vụ việc'],
    ['f_quan_he', 'Ràng buộc / nhân quả'],
    ['f_dia_ban', 'Khu vực hoạt động'],
    ['f_desc', 'Nỗi sợ / bí mật']
  ]),
  horrorEntity: buildFields([
    ['f_status', 'Mức nguy hiểm'],
    ['f_title', 'Loại linh thể'],
    ['f_rang_buoc', 'Chấp niệm / vật neo'],
    ['f_dia_ban', 'Vùng ám ảnh'],
    ['f_desc', 'Dấu hiệu / cách đối phó']
  ]),
  horrorPlace: buildFields([
    ['f_status', 'Mức độ ma ám'],
    ['f_title', 'Loại địa điểm'],
    ['f_quy_tac', 'Quy tắc / cấm kỵ'],
    ['f_dia_ban', 'Vị trí / vùng liên quan'],
    ['f_desc', 'Bí mật / dị thường']
  ]),
  horrorEvent: buildFields([
    ['f_status', 'Mức dị thường'],
    ['f_title', 'Loại hiện tượng'],
    ['f_nguon', 'Nguồn cơn / truyền thuyết'],
    ['f_dieu_kien', 'Điều kiện kích hoạt'],
    ['f_desc', 'Ảnh hưởng / ghi nhận']
  ]),
});

const buildGenrePathKey = (tabId = '', subId = '') => `${tabId}::${normalizeGenreSubTabId(subId)}`;

const FIELD_PRESET_BY_PATH_KEY = {};
const assignPreset = (presetName, tabId, ids = []) => {
  const preset = FIELD_PRESETS[presetName] || FIELD_PRESETS.default;
  ids.forEach((subId) => {
    FIELD_PRESET_BY_PATH_KEY[buildGenrePathKey(tabId, subId)] = preset;
  });
};

assignPreset('protagonistCultivation', 'tu-si', ['thien-menh-chi-tu']);
assignPreset('companionCultivation', 'tu-si', ['dao-lu', 'hong-nhan-tri-ky', 'sinh-tu-giao', 'dong-mon-su-de']);
assignPreset('rivalCultivation', 'tu-si', ['tu-dich', 'phan-dien']);
assignPreset('realm', 'dai-dao', ['canh-gioi-tu-vi']);
assignPreset('skill', 'dai-dao', ['cong-phap', 'vo-ky', 'cam-thuat', 'bi-phap']);
assignPreset('constitution', 'dai-dao', ['dac-thu-the-chat', 'thai-co-huyet-mach', 'linh-can', 'ngo-tinh-thien-phu', 'thien-phu']);
assignPreset('mapLocation', 'chu-thien-van-gioi', ['tu-tien-gioi', 'vi-dien-tinh-vuc', 'thuong-gioi-tien-gioi', 'cam-dia', 'thuong-co-di-tich']);
assignPreset('factionSect', 'dinh-cap-the-luc', ['tong-mon-thanh-dia', 'an-the-tong-mon']);
assignPreset('factionFamily', 'dinh-cap-the-luc', ['truong-ton-the-gia']);
assignPreset('artifact', 'ky-tran-di-bao', ['phap-bao-tien-khi', 'than-binh-loi-khi', 'thien-tai-dia-bao', 'linh-phu-bua-chu']);
assignPreset('pill', 'ky-tran-di-bao', ['dan-duoc', 'tien-thao-linh-duoc']);
assignPreset('formation', 'ky-tran-di-bao', ['tran-phap']);

assignPreset('protagonistCultivation', 'sinh-linh', ['khi-van-chi-tu']);
assignPreset('companionCultivation', 'sinh-linh', ['dong-bon-khe-uoc-gia', 'su-ma-tinh-linh']);
assignPreset('rivalCultivation', 'sinh-linh', ['hac-am-cu-dau', 'ma-vuong-ta-than']);
assignPreset('fantasyPower', 'the-he-luc-luong', ['ma-phap-chu-ngu', 'dau-khi-nguyen-luc', 'chuc-nghiep', 'than-cach-than-hoa']);
assignPreset('fantasySetting', 'vi-dien-dai-luc', ['dai-luc', 'vuc-sau', 'than-quoc-tinh-gioi']);
assignPreset('fantasyRace', 'van-toc-quan-dao', ['chung-toc']);
assignPreset('factionNation', 'van-toc-quan-dao', ['de-quoc-vuong-quoc']);
assignPreset('factionSect', 'van-toc-quan-dao', ['than-dien-giao-hoi', 'cong-hoi-linh-danh-thue']);
assignPreset('artifact', 'than-vat-ma-vat', ['than-khi-thanh-khi', 'than-vat-truyen-thua']);
assignPreset('fantasyCreature', 'than-vat-ma-vat', ['ma-thu-cu-long', 'ma-hach-tinh-mach', 'yeu-dan']);

assignPreset('romanceLead', 'quan-chung-tuyen', ['nu-chu-nam-chu']);
assignPreset('romanceRival', 'quan-chung-tuyen', ['bach-nguyet-quang', 'tra-xanh-bach-lien-hoa', 'co-chap-cuong-benh-kieu', 'tra-nam-tien-nu', 'hao-mon-the-gia']);
assignPreset('romanceSetting', 'boi-canh-thiet-lap', ['co-dai-gia-khong', 'cung-dinh-hau-tuoc', 'do-thi-hao-mon-tong-tai', 'thanh-xuan-vuon-truong']);
assignPreset('romanceArc', 'ai-tinh-tuyen', ['ngot-sung-chua-lanh', 'nguoc-tam-nguoc-than', 'cuoi-truoc-yeu-sau', 'guong-vo-lai-lanh', 'tu-la-trang']);
assignPreset('romancePlot', 'kich-ban-kich-tinh', ['trach-dau-gia-dau', 'cung-dau-doat-dich', 'va-mat-sang-van', 'gioi-giai-tri-showbiz', 'hac-dao-giao-phong']);

assignPreset('systemCore', 'ban-the-he-thong', ['nguon-goc-he-thong', 'ma-dinh-danh-phien-ban', 'tri-nao-he-thong-tinh-linh', 'quyen-han-cap-do']);
assignPreset('systemStat', 'giao-dien-thuoc-tinh', ['ca-nhan-mieu-ta', 'diem-kinh-nghiem', 'diem-tich-luy-tien-te', 'dan-hieu', 'do-thuan-thuc']);
assignPreset('shop', 'chuc-nang-cot-loi', ['he-thong-thuong-thanh']);
assignPreset('quest', 'chuc-nang-cot-loi', ['nhiem-vu-chu-tuyen', 'nhiem-vu-chi-nhanh', 'che-tai-trung-phat']);
assignPreset('systemReward', 'chuc-nang-cot-loi', ['gacha-vong-quay-may-man']);

assignPreset('rebirthNode', 'dong-chay-luan-hoi', ['nguyen-nhan-trung-sinh', 'tien-the-ky-uc', 'bat-diem', 'hieu-ung-canh-buom']);
assignPreset('rebirthKarma', 'nhan-qua-nghiet-duyen', ['tu-dich-tien-the', 'an-nhan-kim-sinh', 'tiec-nuoi-tien-the', 'va-mat-phan-dien']);
assignPreset('rebirthCheat', 'kim-chi-nam', ['tien-tri', 'tien-co-cuop-co-duyen', 'tuy-than-khong-gian', 'di-nang-thuc-tinh-som']);

assignPreset('modernLead', 'do-thi-nhan-vat', ['long-ngao-thien', 'o-re-cao-thu-xuong-nui', 'ba-dao-tong-tai', 'bang-son-my-nu-hoa-khoi', 'phu-nhi-dai-hoan-kho-di-tu', 'the-gia-lao-hu']);
assignPreset('modernFaction', 'dinh-cap-vong-tron', ['tu-dai-co-toc', 'dinh-cap-tai-phiet', 'hac-dao-cu-phach', 'the-gioi-ngam-linh-danh-thue', 'cuc-di-nang-long-to', 'co-vo-gia-an-mon']);
assignPreset('modernDomain', 'ban-do-su-nghiep', ['thuong-vi-khong-che-kinh-te', 'y-thuat-tien-thien', 'phong-thuy-tuong-thuat', 'giam-bao-do-thach', 'dau-gia-hoi-cap-cao']);

assignPreset('infiniteSpace', 'chu-than-khong-gian', ['chu-than-he-thong-mau', 'luan-hoi-dien-quang-truong', 'khu-vuc-nghi-ngoi', 'chu-than-quy-tac']);
assignPreset('infiniteMember', 'luan-hoi-tieu-doi', ['luan-hoi-gia', 'doi-truong', 'tri-gia', 'hoa-luc-thu', 'nai-ma', 'tu-chien-tieu-doi']);
assignPreset('infiniteScenario', 'the-gioi-nhiem-vu', ['kich-ban-the-gioi', 'chan-tuong-nhiem-vu', 'nhiem-vu-sinh-ton', 'cap-do-ac-mong']);
assignPreset('infiniteUpgrade', 'hoi-doai-cuong-hoa', ['diem-sinh-ton-khen-thuong', 'tien-hoa-huyet-thong', 'cuong-hoa-the-chat', 'ky-nang-cay', 'di-nang-thuc-tinh', 'dao-cu-bao-menh']);

assignPreset('gameProfile', 'so-lieu-nhan-vat', ['id-tro-choi', 'bang-trang-thai', 'chuc-nghiep', 'thien-phu-ky-nang']);
assignPreset('gameGear', 'trang-bi-than-vat', ['than-khi-truyen-thuyet-vu-khi', 'sao-trang', 'sung-vat-toa-ky', 'do-te-luyen']);
assignPreset('gameFaction', 'tran-doanh-the-luc', ['dai-cong-hoi', 'cau-lac-bo-esport', 'lien-minh-tran-doanh', 'npc-the-luc']);
assignPreset('gameQuest', 'cot-truyen-gameplay', ['main-quests', 'chuoi-nhiem-vu-an', 'phu-ban-bi-canh', 'da-ngoai-boss', 'lich-su-pk-hong-danh', 'thi-dau-chuyen-nghiep']);

assignPreset('scifiWorld', 'tinh-te-cuong-vuc', ['ngan-ha-vi-tinh-he', 'trai-dat-co-mau-tinh', 'tinh-te-lien-bang', 'vuc-ngoai-chung-toc', 'co-so-hac-am']);
assignPreset('scifiTech', 'hac-khoa-ky', ['co-giap', 'tinh-ham-phi-thuyen', 'quang-nao-sieu-ai', 'vu-khi-phan-vat-chat', 'buoc-nhay-khong-gian']);
assignPreset('scifiEvolution', 'tien-hoa-lo-tuyen', ['tinh-than-luc', 'the-thuat-khai-giap-thuat', 'gien-dot-bien', 'dung-hop-duoc-te', 'co-the-sinh-hoa']);

assignPreset('apocalypseBackdrop', 'ky-nguyen-hac-am', ['bao-phat-nguy-co', 'tien-mat-the-hau-mat-the', 'bien-doi-khi-hau', 'phe-tich-van-minh']);
assignPreset('apocalypseThreat', 'nguy-co-tu-phia', ['thi-toc-tang-thi-vi-quan', 'di-thu-lanh-chua', 'ma-hoa-thuc-vat', 'ta-ac-nguoi-sinh-ton']);
assignPreset('apocalypseFaction', 'doanh-trai-sinh-ton', ['khu-an-toan-can-cu-dia', 'liep-sat-gia', 'quan-bo-chinh-phu-tan-du', 'the-luc-ton-giao-moi']);
assignPreset('awakenedCharacter', 'tinh-hach-vat-tu', ['giac-tinh-gia']);
assignPreset('fantasyPower', 'tinh-hach-vat-tu', ['di-nang-phan-he']);
assignPreset('apocalypseResource', 'tinh-hach-vat-tu', ['tinh-hach-tinh-nguyen', 'vat-tu-cuu-sinh', 'hoa-khi-khi-gioi-lanh']);

assignPreset('fanficWorld', 'nguyen-tac-vi-dien', ['canon-world', 'nguyen-tac-thiet-lap', 'quy-tac-the-gioi']);
assignPreset('fanficCharacter', 'nhom-nhan-vat-dong-nhan', ['canon-character', 'original-character', 'bang-hoai-kich-tinh', 'ke-xuyen-thu-trong-sinh']);
assignPreset('fanficPlot', 'tuyen-truyen-ma-cai', ['diem-re-nhanh', 'hieu-ung-canh-buom', 'cuu-roi-tuyen', 'hac-hoa-tuyen', 'ket-cuc-moi']);

assignPreset('historyBackdrop', 'thien-ha-dai-the', ['trieu-dai-ky-nguyen', 'de-vuong-thong-tri', 'loan-the-tranh-hung', 'phien-tran-cat-cu', 'quan-hung-truc-loc']);
assignPreset('historyCharacter', 'vuong-hau-tuong-linh', ['chan-long-thien-tu', 'hau-cung-phi-tan', 'muu-si-mon-khach', 'van-than-vo-tuong', 'man-di-phien-bang', 'thao-menh-anh-hung']);
assignPreset('historyEvent', 'lich-su-quy-tich', ['sa-ban-tranh-ba', 'cung-bien-doat-dich', 'bien-phap-cai-cach', 'khoa-cu-ky']);
assignPreset('historyDevelopment', 'chung-dien-co-so', ['luyen-binh-tri-quan', 'cong-trinh-binh-phap', 'hac-khoa-ky-lich-su', 'nong-thuong-chi-dao', 'kien-thiet-tri-sanh']);

assignPreset('horrorHuman', 'linh-di-nhan-vat', ['nguoi-song', 'phu-tro']);
assignPreset('horrorEntity', 'linh-di-nhan-vat', ['linh-the-ma-quy', 'phan-dien']);
assignPreset('horrorPlace', 'boi-canh-kinh-di', ['dia-diem-ma-am', 'quy-tac-sinh-ton', 'bi-mat-the-gioi']);
assignPreset('horrorEvent', 'su-kien-truyen-thuyet', ['su-kien-bat-thuong', 'truyen-thuyet-urban', 'loi-nguyen-linh-hon']);

const AUTO_ROLE_BY_PATH_KEY = {};
const assignAutoRole = (role, tabId, ids = []) => {
  ids.forEach((subId) => {
    AUTO_ROLE_BY_PATH_KEY[buildGenrePathKey(tabId, subId)] = role;
  });
};

const AUTO_TARGET_PATHS_BY_PATH_KEY = {};
const assignAutoTargets = (tabId, subId, targetPaths = []) => {
  const key = buildGenrePathKey(tabId, subId);
  AUTO_TARGET_PATHS_BY_PATH_KEY[key] = (Array.isArray(targetPaths) ? targetPaths : [])
    .map((pathKey) => String(pathKey || '').trim())
    .filter(Boolean);
};

assignAutoRole(AUTO_SYNC_ROLE_MAIN_CHARACTER, 'tu-si', ['thien-menh-chi-tu']);
assignAutoRole(AUTO_SYNC_ROLE_CHARACTER_RELATED, 'tu-si', ['dao-lu', 'hong-nhan-tri-ky', 'sinh-tu-giao', 'dong-mon-su-de']);
assignAutoRole(AUTO_SYNC_ROLE_MAP, 'chu-thien-van-gioi', ['tu-tien-gioi']);
assignAutoRole(AUTO_SYNC_ROLE_FORCE, 'dinh-cap-the-luc', ['tong-mon-thanh-dia']);
assignAutoRole(AUTO_SYNC_ROLE_MAIN_CHARACTER, 'sinh-linh', ['khi-van-chi-tu']);
assignAutoRole(AUTO_SYNC_ROLE_CHARACTER_RELATED, 'sinh-linh', ['dong-bon-khe-uoc-gia', 'su-ma-tinh-linh']);
assignAutoRole(AUTO_SYNC_ROLE_MAP, 'vi-dien-dai-luc', ['dai-luc']);
assignAutoRole(AUTO_SYNC_ROLE_FORCE, 'van-toc-quan-dao', ['de-quoc-vuong-quoc']);
assignAutoRole(AUTO_SYNC_ROLE_MAIN_CHARACTER, 'quan-chung-tuyen', ['nu-chu-nam-chu']);
assignAutoRole(AUTO_SYNC_ROLE_CHARACTER_RELATED, 'quan-chung-tuyen', ['bach-nguyet-quang', 'tra-xanh-bach-lien-hoa', 'co-chap-cuong-benh-kieu', 'tra-nam-tien-nu', 'hao-mon-the-gia']);
assignAutoRole(AUTO_SYNC_ROLE_MAIN_CHARACTER, 'do-thi-nhan-vat', ['long-ngao-thien']);
assignAutoRole(AUTO_SYNC_ROLE_CHARACTER_RELATED, 'do-thi-nhan-vat', ['o-re-cao-thu-xuong-nui', 'ba-dao-tong-tai', 'bang-son-my-nu-hoa-khoi', 'phu-nhi-dai-hoan-kho-di-tu', 'the-gia-lao-hu']);
assignAutoRole(AUTO_SYNC_ROLE_MAP, 'ban-do-su-nghiep', ['thuong-vi-khong-che-kinh-te']);
assignAutoRole(AUTO_SYNC_ROLE_FORCE, 'dinh-cap-vong-tron', ['tu-dai-co-toc']);
assignAutoRole(AUTO_SYNC_ROLE_MAIN_CHARACTER, 'luan-hoi-tieu-doi', ['luan-hoi-gia']);
assignAutoRole(AUTO_SYNC_ROLE_CHARACTER_RELATED, 'luan-hoi-tieu-doi', ['doi-truong', 'tri-gia', 'hoa-luc-thu', 'nai-ma']);
assignAutoRole(AUTO_SYNC_ROLE_MAP, 'the-gioi-nhiem-vu', ['kich-ban-the-gioi']);
assignAutoRole(AUTO_SYNC_ROLE_FORCE, 'chu-than-khong-gian', ['chu-than-he-thong-mau']);
assignAutoRole(AUTO_SYNC_ROLE_MAIN_CHARACTER, 'nhom-nhan-vat-dong-nhan', ['canon-character']);
assignAutoRole(AUTO_SYNC_ROLE_CHARACTER_RELATED, 'nhom-nhan-vat-dong-nhan', ['original-character', 'bang-hoai-kich-tinh', 'ke-xuyen-thu-trong-sinh']);
assignAutoRole(AUTO_SYNC_ROLE_MAP, 'nguyen-tac-vi-dien', ['canon-world']);
assignAutoRole(AUTO_SYNC_ROLE_MAIN_CHARACTER, 'vuong-hau-tuong-linh', ['chan-long-thien-tu']);
assignAutoRole(AUTO_SYNC_ROLE_CHARACTER_RELATED, 'vuong-hau-tuong-linh', ['hau-cung-phi-tan', 'muu-si-mon-khach', 'van-than-vo-tuong']);
assignAutoRole(AUTO_SYNC_ROLE_MAP, 'thien-ha-dai-the', ['trieu-dai-ky-nguyen']);
assignAutoRole(AUTO_SYNC_ROLE_FORCE, 'chung-dien-co-so', ['luyen-binh-tri-quan']);
assignAutoRole(AUTO_SYNC_ROLE_MAIN_CHARACTER, 'linh-di-nhan-vat', ['nguoi-song']);
assignAutoRole(AUTO_SYNC_ROLE_CHARACTER_RELATED, 'linh-di-nhan-vat', ['phan-dien', 'phu-tro']);
assignAutoRole(AUTO_SYNC_ROLE_MAP, 'boi-canh-kinh-di', ['dia-diem-ma-am']);
assignAutoRole(AUTO_SYNC_ROLE_MAP, 'ky-nguyen-hac-am', ['bao-phat-nguy-co']);
assignAutoRole(AUTO_SYNC_ROLE_FORCE, 'doanh-trai-sinh-ton', ['khu-an-toan-can-cu-dia']);

assignAutoTargets('tu-si', 'thien-menh-chi-tu', [
  'tu-si::dao-lu',
  'tu-si::hong-nhan-tri-ky',
  'tu-si::sinh-tu-giao',
  'tu-si::dong-mon-su-de',
]);
assignAutoTargets('sinh-linh', 'khi-van-chi-tu', [
  'sinh-linh::dong-bon-khe-uoc-gia',
  'sinh-linh::su-ma-tinh-linh',
]);
assignAutoTargets('dinh-cap-the-luc', 'tong-mon-thanh-dia', [
  'chu-thien-van-gioi::tu-tien-gioi',
]);
assignAutoTargets('van-toc-quan-dao', 'de-quoc-vuong-quoc', [
  'vi-dien-dai-luc::dai-luc',
]);
assignAutoTargets('quan-chung-tuyen', 'nu-chu-nam-chu', [
  'quan-chung-tuyen::bach-nguyet-quang',
  'quan-chung-tuyen::tra-xanh-bach-lien-hoa',
  'quan-chung-tuyen::co-chap-cuong-benh-kieu',
  'quan-chung-tuyen::tra-nam-tien-nu',
  'quan-chung-tuyen::hao-mon-the-gia',
]);
assignAutoTargets('do-thi-nhan-vat', 'long-ngao-thien', [
  'do-thi-nhan-vat::o-re-cao-thu-xuong-nui',
  'do-thi-nhan-vat::ba-dao-tong-tai',
  'do-thi-nhan-vat::bang-son-my-nu-hoa-khoi',
  'do-thi-nhan-vat::phu-nhi-dai-hoan-kho-di-tu',
  'do-thi-nhan-vat::the-gia-lao-hu',
]);
assignAutoTargets('dinh-cap-vong-tron', 'tu-dai-co-toc', [
  'ban-do-su-nghiep::thuong-vi-khong-che-kinh-te',
]);
assignAutoTargets('luan-hoi-tieu-doi', 'luan-hoi-gia', [
  'luan-hoi-tieu-doi::doi-truong',
  'luan-hoi-tieu-doi::tri-gia',
  'luan-hoi-tieu-doi::hoa-luc-thu',
  'luan-hoi-tieu-doi::nai-ma',
]);
assignAutoTargets('chu-than-khong-gian', 'chu-than-he-thong-mau', [
  'the-gioi-nhiem-vu::kich-ban-the-gioi',
]);
assignAutoTargets('nhom-nhan-vat-dong-nhan', 'canon-character', [
  'nhom-nhan-vat-dong-nhan::original-character',
  'nhom-nhan-vat-dong-nhan::bang-hoai-kich-tinh',
  'nhom-nhan-vat-dong-nhan::ke-xuyen-thu-trong-sinh',
]);
assignAutoTargets('vuong-hau-tuong-linh', 'chan-long-thien-tu', [
  'vuong-hau-tuong-linh::hau-cung-phi-tan',
  'vuong-hau-tuong-linh::muu-si-mon-khach',
  'vuong-hau-tuong-linh::van-than-vo-tuong',
]);
assignAutoTargets('chung-dien-co-so', 'luyen-binh-tri-quan', [
  'thien-ha-dai-the::trieu-dai-ky-nguyen',
]);
assignAutoTargets('linh-di-nhan-vat', 'nguoi-song', [
  'linh-di-nhan-vat::phan-dien',
  'linh-di-nhan-vat::phu-tro',
]);
assignAutoTargets('doanh-trai-sinh-ton', 'khu-an-toan-can-cu-dia', [
  'ky-nguyen-hac-am::bao-phat-nguy-co',
]);

const sub = (id, label, fields = DEFAULT_FIELDS) => ({
  id: normalizeGenreSubTabId(id),
  label,
  viewType: 'collection-track',
  tabCon: [],
  fieldsTemplate: cloneFields(fields),
});

function applySubGenreConfig(parentId, subTab) {
  const normalizedSubId = normalizeGenreSubTabId(subTab?.id || '');
  const pathKey = buildGenrePathKey(parentId, normalizedSubId);
  const preset = FIELD_PRESET_BY_PATH_KEY[pathKey];
  const autoSyncRole = AUTO_ROLE_BY_PATH_KEY[pathKey] || subTab?.autoSyncRole || '';
  const autoSyncTargetPaths = AUTO_TARGET_PATHS_BY_PATH_KEY[pathKey] || subTab?.autoSyncTargetPaths || [];
  return {
    ...subTab,
    id: normalizedSubId || subTab?.id || '',
    fieldsTemplate: cloneFields(preset || subTab?.fieldsTemplate || DEFAULT_FIELDS),
    ...(autoSyncRole ? { autoSyncRole } : {}),
    ...(autoSyncTargetPaths.length > 0 ? { autoSyncTargetPaths: cloneValue(autoSyncTargetPaths) } : {}),
  };
}

const tab = (id, label, iconName, subTabs) => ({
  id,
  label,
  iconName,
  subTabs: (subTabs || []).map((subTab) => applySubGenreConfig(id, subTab)),
});

// Map thể loại GENRES -> cấu trúc tabs (không gồm Tổng Quan)
export const GENRE_TABS_MAP = {
  "Tiên Hiệp": [
    tab('tu-si', 'Tu Sĩ (Nhân Vật)', 'User', [
      sub('thien-menh-chi-tu', 'Thiên Mệnh Chi Tử (NVC)'),
      sub('dao-lu', 'Đạo Lữ'),
      sub('hong-nhan-tri-ky', 'Hồng Nhan Tri Kỷ'),
      sub('sinh-tu-giao', 'Sinh Tử Giao (Huynh đệ)'),
      sub('dong-mon-su-de', 'Đồng Môn Sư Đệ/Sư Muội'),
      sub('tu-dich', 'Tử Địch (Kẻ thù)'),
      sub('phan-dien', 'Phản Diện / Pháo Khôi')
    ]),
    tab('dai-dao', 'Đại Đạo (Tu Luyện)', 'Flame', [
      sub('canh-gioi-tu-vi', 'Cảnh Giới Tu Vi'),
      sub('cong-phap', 'Công Pháp'),
      sub('vo-ky', 'Võ Kỹ'),
      sub('cam-thuat', 'Cấm Thuật'),
      sub('bi-phap', 'Bí Pháp'),
      sub('dac-thu-the-chat', 'Đặc Thù Thể Chất'),
      sub('thai-co-huyet-mach', 'Thái Cổ Huyết Mạch'),
      sub('linh-can', 'Linh Căn'),
      sub('ngo-tinh-thien-phu', 'Ngộ Tính Thiên Phú'),
      sub('thien-phu', 'Thiên Phú')
    ]),
    tab('chu-thien-van-gioi', 'Chư Thiên Vạn Giới (Thế Giới)', 'Globe', [
      sub('tu-tien-gioi', 'Tu Tiên Giới / Phàm Nhân Giới'),
      sub('vi-dien-tinh-vuc', 'Vị Diện / Tinh Vực'),
      sub('thuong-gioi-tien-gioi', 'Thượng Giới / Tiên Giới'),
      sub('cam-dia', 'Cấm Địa'),
      sub('thuong-co-di-tich', 'Thượng Cổ Di Tích')
    ]),
    tab('dinh-cap-the-luc', 'Đỉnh Cấp Thế Lực', 'Hexagon', [
      sub('tong-mon-thanh-dia', 'Tông Môn / Thánh Địa'),
      sub('truong-ton-the-gia', 'Trường Tồn Thế Gia'),
      sub('an-the-tong-mon', 'Ẩn Thế Tông Môn')
    ]),
    tab('ky-tran-di-bao', 'Kỳ Trân Dị Bảo (Vật Phẩm)', 'Swords', [
      sub('phap-bao-tien-khi', 'Pháp Bảo / Tiên Khí'),
      sub('than-binh-loi-khi', 'Thần Binh Lợi Khí'),
      sub('dan-duoc', 'Đan Dược'),
      sub('tien-thao-linh-duoc', 'Tiên Thảo / Linh Dược'),
      sub('thien-tai-dia-bao', 'Thiên Tài Địa Bảo'),
      sub('tran-phap', 'Trận Pháp'),
      sub('linh-phu-bua-chu', 'Linh Phù / Bùa Chú')
    ])
  ],
  "Huyền Huyễn": [
    tab('sinh-linh', 'Sinh Linh (Nhân Vật)', 'User', [
      sub('khi-van-chi-tu', 'Khí Vận Chi Tử (NVC)'),
      sub('dong-bon-khe-uoc-gia', 'Đồng Bọn / Khế Ước Giả'),
      sub('su-ma-tinh-linh', 'Sứ Ma / Tinh Linh'),
      sub('hac-am-cu-dau', 'Hắc Ám Cự Đầu (Phản diện)'),
      sub('ma-vuong-ta-than', 'Ma Vương / Tà Thần')
    ]),
    tab('the-he-luc-luong', 'Thể Hệ Lực Lượng (Sức Mạnh)', 'Flame', [
      sub('ma-phap-chu-ngu', 'Ma Pháp / Chú Ngữ'),
      sub('dau-khi-nguyen-luc', 'Đấu Khí / Nguyên Lực'),
      sub('chuc-nghiep', 'Chức Nghiệp (Pháp sư, Kỵ sĩ...)'),
      sub('than-cach-than-hoa', 'Thần Cách / Thần Hỏa')
    ]),
    tab('vi-dien-dai-luc', 'Vị Diện Đại Lục (Thế Giới)', 'Globe', [
      sub('dai-luc', 'Đại Lục'),
      sub('vuc-sau', 'Vực Sâu (Abyss)'),
      sub('than-quoc-tinh-gioi', 'Thần Quốc / Tinh Giới')
    ]),
    tab('van-toc-quan-dao', 'Vạn Tộc Quần Đảo (Thế Lực)', 'Hexagon', [
      sub('chung-toc', 'Chủng Tộc (Elf, Orc, Dragon...)'),
      sub('de-quoc-vuong-quoc', 'Đế Quốc / Vương Quốc'),
      sub('than-dien-giao-hoi', 'Thần Điện / Giáo Hội'),
      sub('cong-hoi-linh-danh-thue', 'Công Hội Lính Đánh Thuê')
    ]),
    tab('than-vat-ma-vat', 'Thần Vật & Ma Vật', 'Swords', [
      sub('than-khi-thanh-khi', 'Thần Khí / Thánh Khí'),
      sub('than-vat-truyen-thua', 'Thánh Vật Truyền Thừa'),
      sub('ma-thu-cu-long', 'Ma Thú / Cự Long'),
      sub('ma-hach-tinh-mach', 'Ma Hạch / Tinh Mạch'),
      sub('yeu-dan', 'Yêu Đan')
    ])
  ],
  "Ngôn Tình": [
    tab('quan-chung-tuyen', 'Quần Chúng Tuyến (Nhân Vật)', 'User', [
      sub('nu-chu-nam-chu', 'Nữ Chủ / Nam Chủ'),
      sub('bach-nguyet-quang', 'Bạch Nguyệt Quang (Tình đầu)'),
      sub('tra-xanh-bach-lien-hoa', 'Trà Xanh / Bạch Liên Hoa'),
      sub('co-chap-cuong-benh-kieu', 'Cố Chấp Cuồng / Bệnh Kiều'),
      sub('tra-nam-tien-nu', 'Tra Nam / Tiện Nữ'),
      sub('hao-mon-the-gia', 'Hào Môn Thế Gia')
    ]),
    tab('boi-canh-thiet-lap', 'Bối Cảnh Thiết Lập', 'Globe', [
      sub('co-dai-gia-khong', 'Cổ Đại / Giá Không'),
      sub('cung-dinh-hau-tuoc', 'Cung Đình Hầu Tước'),
      sub('do-thi-hao-mon-tong-tai', 'Đô Thị / Hào Môn Tổng Tài'),
      sub('thanh-xuan-vuon-truong', 'Thanh Xuân Vườn Trường')
    ]),
    tab('ai-tinh-tuyen', 'Ái Tình Tuyến (Tình Cảm)', 'BookOpen', [
      sub('ngot-sung-chua-lanh', 'Ngọt Sủng / Chữa Lành'),
      sub('nguoc-tam-nguoc-than', 'Ngược Tâm / Ngược Thân'),
      sub('cuoi-truoc-yeu-sau', 'Cưới Trước Yêu Sau'),
      sub('guong-vo-lai-lanh', 'Gương Vỡ Lại Lành'),
      sub('tu-la-trang', 'Tu La Tràng (Ghen tuông)')
    ]),
    tab('kich-ban-kich-tinh', 'Kịch Bản Kịch Tình (Sự Kiện)', 'ScrollText', [
      sub('trach-dau-gia-dau', 'Trạch Đấu / Gia Đấu'),
      sub('cung-dau-doat-dich', 'Cung Đấu / Đoạt Đích'),
      sub('va-mat-sang-van', 'Vả Mặt / Sảng Văn (Báo thù)'),
      sub('gioi-giai-tri-showbiz', 'Giới Giải Trí / Showbiz'),
      sub('hac-dao-giao-phong', 'Hắc Đạo Giao Phong')
    ])
  ],
  "Hệ Thống": [
    tab('ban-the-he-thong', 'Bản Thể Hệ Thống', 'Hexagon', [
      sub('nguon-goc-he-thong', 'Nguồn Gốc Hệ Thống'),
      sub('ma-dinh-danh-phien-ban', 'Mã Định Danh / Phiên Bản'),
      sub('tri-nao-he-thong-tinh-linh', 'Trí Não / Hệ Thống Tinh Linh'),
      sub('quyen-han-cap-do', 'Quyền Hạn Cấp Độ')
    ]),
    tab('giao-dien-thuoc-tinh', 'Giao Diện Thuộc Tính', 'BookOpen', [
      sub('ca-nhan-mieu-ta', 'Cá Nhân Miêu Tả (Bảng Stats)'),
      sub('diem-kinh-nghiem', 'Điểm Kinh Nghiệm (EXP)'),
      sub('diem-tich-luy-tien-te', 'Điểm Tích Lũy / Tiền Tệ'),
      sub('dan-hieu', 'Danh Hiệu'),
      sub('do-thuan-thuc', 'Độ Thuần Thục (Kỹ năng)')
    ]),
    tab('chuc-nang-cot-loi', 'Chức Năng Cốt Lõi', 'Flame', [
      sub('he-thong-thuong-thanh', 'Hệ Thống Thương Thành'),
      sub('nhiem-vu-chu-tuyen', 'Nhiệm Vụ Chủ Tuyến'),
      sub('nhiem-vu-chi-nhanh', 'Nhiệm Vụ Chi Nhánh / Ẩn'),
      sub('che-tai-trung-phat', 'Chế Tài Trừng Phạt'),
      sub('gacha-vong-quay-may-man', 'Gacha / Vòng Quay May Mắn')
    ])
  ],
  "Trọng Sinh & Xuyên Không": [
    tab('dong-chay-luan-hoi', 'Dòng Chảy Luân Hồi', 'ScrollText', [
      sub('nguyen-nhan-trung-sinh', 'Nguyên Nhân Trùng Sinh'),
      sub('tien-the-ky-uc', 'Tiền Thế Ký Ức'),
      sub('bat-diem', 'Bát Điểm (Cột mốc trọng sinh)'),
      sub('hieu-ung-canh-buom', 'Hiệu Ứng Cánh Bướm')
    ]),
    tab('nhan-qua-nghiet-duyen', 'Nhân Quả Nghiệt Duyên', 'User', [
      sub('tu-dich-tien-the', 'Tử Địch Tiền Thế'),
      sub('an-nhan-kim-sinh', 'Ân Nhân Kim Sinh'),
      sub('tiec-nuoi-tien-the', 'Tiếc Nuối Tiền Thế'),
      sub('va-mat-phan-dien', 'Vả Mặt Phản Diện')
    ]),
    tab('kim-chi-nam', 'Kim Chỉ Nam (Bàn Tay Vàng)', 'Flame', [
      sub('tien-tri', 'Tiên Tri (Biết trước tương lai)'),
      sub('tien-co-cuop-co-duyen', 'Tiên Cơ / Cướp Cơ Duyên'),
      sub('tuy-than-khong-gian', 'Tùy Thân Không Gian'),
      sub('di-nang-thuc-tinh-som', 'Dị Năng Thức Tỉnh Sớm')
    ])
  ],
  "Đô Thị": [
    tab('do-thi-nhan-vat', 'Đô Thị Nhân Vật', 'User', [
      sub('long-ngao-thien', 'Long Ngạo Thiên (NVC bá đạo)'),
      sub('o-re-cao-thu-xuong-nui', 'Ở Rể / Cao Thủ Xuống Núi'),
      sub('ba-dao-tong-tai', 'Bá Đạo Tổng Tài'),
      sub('bang-son-my-nu-hoa-khoi', 'Băng Sơn Mỹ Nữ / Hoa Khôi'),
      sub('phu-nhi-dai-hoan-kho-di-tu', 'Phú Nhị Đại / Hoàn Khố Di Tử'),
      sub('the-gia-lao-hu', 'Thế Gia Lão Hủ')
    ]),
    tab('dinh-cap-vong-tron', 'Đỉnh Cấp Vòng Tròn (Thế Lực)', 'Hexagon', [
      sub('tu-dai-co-toc', 'Tứ Đại Cổ Tộc / Thế Gia'),
      sub('dinh-cap-tai-phiet', 'Đỉnh Cấp Tài Phiệt'),
      sub('hac-dao-cu-phach', 'Hắc Đạo Cự Phách'),
      sub('the-gioi-ngam-linh-danh-thue', 'Thế Giới Ngầm / Lính Đánh Thuê'),
      sub('cuc-di-nang-long-to', 'Cục Dị Năng / Long Tổ'),
      sub('co-vo-gia-an-mon', 'Cổ Võ Giả / Ẩn Môn')
    ]),
    tab('ban-do-su-nghiep', 'Bản Đồ Sự Nghiệp', 'Globe', [
      sub('thuong-vi-khong-che-kinh-te', 'Thương Vị / Khống Chế Kinh Tế'),
      sub('y-thuat-tien-thien', 'Y Thuật Tiên Thiên'),
      sub('phong-thuy-tuong-thuat', 'Phong Thủy / Tướng Thuật'),
      sub('giam-bao-do-thach', 'Giám Bảo / Đổ Thạch'),
      sub('dau-gia-hoi-cap-cao', 'Đấu Giá Hội Cấp Cao')
    ])
  ],
  "Vô Hạn Lưu": [
    tab('chu-than-khong-gian', 'Chủ Thần Không Gian', 'Hexagon', [
      sub('chu-than-he-thong-mau', 'Chủ Thần / Hệ Thống Mẫu'),
      sub('luan-hoi-dien-quang-truong', 'Luân Hồi Điện / Quảng Trường'),
      sub('khu-vuc-nghi-ngoi', 'Khu Vực Nghỉ Ngơi cá nhân'),
      sub('chu-than-quy-tac', 'Chủ Thần Quy Tắc')
    ]),
    tab('luan-hoi-tieu-doi', 'Luân Hồi Tiểu Đội', 'User', [
      sub('luan-hoi-gia', 'Luân Hồi Giả (Người chơi)'),
      sub('doi-truong', 'Đội Trưởng'),
      sub('tri-gia', 'Trí Giả (Đầu não phân tích)'),
      sub('hoa-luc-thu', 'Hỏa Lực Thủ (Chiến đấu)'),
      sub('nai-ma', 'Nãi Ma (Healer/Hỗ trợ)'),
      sub('tu-chien-tieu-doi', 'Tử Chiến Tiểu Đội (Kẻ thù)')
    ]),
    tab('the-gioi-nhiem-vu', 'Thế Giới Nhiệm Vụ (Phó Bản)', 'Globe', [
      sub('kich-ban-the-gioi', 'Kịch Bản Thế Giới'),
      sub('chan-tuong-nhiem-vu', 'Chân Tướng Nhiệm Vụ'),
      sub('nhiem-vu-sinh-ton', 'Nhiệm Vụ Sinh Tồn'),
      sub('cap-do-ac-mong', 'Cấp Độ Ác Mộng (S, A, B...)')
    ]),
    tab('hoi-doai-cuong-hoa', 'Hối Đoái & Cường Hóa (Đổi Điểm)', 'Flame', [
      sub('diem-sinh-ton-khen-thuong', 'Điểm Sinh Tồn / Khen Thưởng'),
      sub('tien-hoa-huyet-thong', 'Tiến Hóa Huyết Thống'),
      sub('cuong-hoa-the-chat', 'Cường Hóa Thể Chất'),
      sub('ky-nang-cay', 'Kỹ Năng Cây (Skill tree)'),
      sub('di-nang-thuc-tinh', 'Dị Năng Thức Tỉnh'),
      sub('dao-cu-bao-menh', 'Đạo Cụ Bảo Mệnh')
    ])
  ],
  "Võng Du": [
    tab('so-lieu-nhan-vat', 'Số Liệu Nhân Vật', 'User', [
      sub('id-tro-choi', 'ID Trò Chơi'),
      sub('bang-trang-thai', 'Bảng Trạng Thái (Stats)'),
      sub('chuc-nghiep', 'Chức Nghiệp / Chức Nghiệp Ẩn'),
      sub('thien-phu-ky-nang', 'Thiên Phú Kỹ Năng')
    ]),
    tab('trang-bi-than-vat', 'Trang Bị & Thần Vật', 'Swords', [
      sub('than-khi-truyen-thuyet-vu-khi', 'Thần Khí / Truyền Thuyết Vũ Khí'),
      sub('sao-trang', 'Sáo Trang (Set trang bị)'),
      sub('sung-vat-toa-ky', 'Sủng Vật / Tọa Kỵ'),
      sub('do-te-luyen', 'Đồ Tể Luyện (Nguyên liệu)')
    ]),
    tab('tran-doanh-the-luc', 'Trận Doanh Thế Lực', 'Hexagon', [
      sub('dai-cong-hoi', 'Đại Công Hội (Guild)'),
      sub('cau-lac-bo-esport', 'Câu Lạc Bộ Esport'),
      sub('lien-minh-tran-doanh', 'Liên Minh Trận Doanh'),
      sub('npc-the-luc', 'NPC Thế Lực')
    ]),
    tab('cot-truyen-gameplay', 'Cốt Truyện & Gameplay', 'ScrollText', [
      sub('main-quests', 'Main Quests (Nhiệm vụ chính)'),
      sub('chuoi-nhiem-vu-an', 'Chuỗi Nhiệm Vụ Ẩn'),
      sub('phu-ban-bi-canh', 'Phụ Bản (Dungeon) / Bí Cảnh'),
      sub('da-ngoai-boss', 'Dã Ngoại Boss / Thế Giới Boss'),
      sub('lich-su-pk-hong-danh', 'Lịch Sử PK / Hồng Danh'),
      sub('thi-dau-chuyen-nghiep', 'Thi Đấu Chuyên Nghiệp')
    ])
  ],
  "Khoa Huyễn": [
    tab('tinh-te-cuong-vuc', 'Tinh Tế Cương Vực (Thế Giới)', 'Globe', [
      sub('ngan-ha-vi-tinh-he', 'Ngân Hà / Vị Tinh Hệ'),
      sub('trai-dat-co-mau-tinh', 'Trái Đất Cổ / Mẫu Tinh'),
      sub('tinh-te-lien-bang', 'Tinh Tế Liên Bang / Đế Quốc'),
      sub('vuc-ngoai-chung-toc', 'Vực Ngoại Chủng Tộc (Trùng tộc)'),
      sub('co-so-hac-am', 'Cơ Sở Hắc Ám')
    ]),
    tab('hac-khoa-ky', 'Hắc Khoa Kỹ (Công Nghệ)', 'Swords', [
      sub('co-giap', 'Cơ Giáp (Mecha)'),
      sub('tinh-ham-phi-thuyen', 'Tinh Hạm / Phi Thuyền'),
      sub('quang-nao-sieu-ai', 'Quang Não / Siêu AI'),
      sub('vu-khi-phan-vat-chat', 'Vũ Khí Phản Vật Chất'),
      sub('buoc-nhay-khong-gian', 'Bước Nhảy Không Gian / Lỗ Giun')
    ]),
    tab('tien-hoa-lo-tuyen', 'Tiến Hóa Lộ Tuyến', 'Flame', [
      sub('tinh-than-luc', 'Tinh Thần Lực (S, A, B...)'),
      sub('the-thuat-khai-giap-thuat', 'Thể Thuật / Khải Giáp Thuật'),
      sub('gien-dot-bien', 'Gien Đột Biến'),
      sub('dung-hop-duoc-te', 'Dung Hợp Dược Tề'),
      sub('co-the-sinh-hoa', 'Cơ Thế Sinh Hóa (Cyborg)')
    ])
  ],
  "Mạt Thế": [
    tab('ky-nguyen-hac-am', 'Kỷ Nguyên Hắc Ám (Bối Cảnh)', 'Globe', [
      sub('bao-phat-nguy-co', 'Bạo Phát Nguy Cơ'),
      sub('tien-mat-the-hau-mat-the', 'Tiền Mạt Thế / Hậu Mạt Thế'),
      sub('bien-doi-khi-hau', 'Biến Đổi Khí Hậu'),
      sub('phe-tich-van-minh', 'Phế Tích Văn Minh')
    ]),
    tab('nguy-co-tu-phia', 'Nguy Cơ Tứ Phía (Kẻ Địch)', 'Swords', [
      sub('thi-toc-tang-thi-vi-quan', 'Thi Tộc / Tang Thi Vi Quân'),
      sub('di-thu-lanh-chua', 'Dị Thú Lãnh Chúa'),
      sub('ma-hoa-thuc-vat', 'Ma Hóa Thực Vật'),
      sub('ta-ac-nguoi-sinh-ton', 'Tà Ác Người Sinh Tồn')
    ]),
    tab('doanh-trai-sinh-ton', 'Doanh Trại Sinh Tồn (Thế Lực)', 'Hexagon', [
      sub('khu-an-toan-can-cu-dia', 'Khu An Toàn / Căn Cứ Địa'),
      sub('liep-sat-gia', 'Liệp Sát Giả / Lính Đánh Thuê'),
      sub('quan-bo-chinh-phu-tan-du', 'Quân Bộ / Chính Phủ Tàn Dư'),
      sub('the-luc-ton-giao-moi', 'Thế Lực Tôn Giáo Mới')
    ]),
    tab('tinh-hach-vat-tu', 'Tinh Hạch & Vật Tư (Tài Nguyên)', 'Flame', [
      sub('giac-tinh-gia', 'Giác Tỉnh Giả (Người dị năng)'),
      sub('di-nang-phan-he', 'Dị Năng Phân Hệ'),
      sub('tinh-hach-tinh-nguyen', 'Tinh Hạch / Tinh Nguyên'),
      sub('vat-tu-cuu-sinh', 'Vật Tư Cứu Sinh (Thức ăn, nước)'),
      sub('hoa-khi-khi-gioi-lanh', 'Hỏa Khí / Khí Giới Lạnh')
    ])
  ],
  "Đồng Nhân": [
    tab('nguyen-tac-vi-dien', 'Nguyên Tác Vị Diện', 'Globe', [
      sub('canon-world', 'Canon World (Thế giới gốc)'),
      sub('nguyen-tac-thiet-lap', 'Nguyên Tác Thiết Lập'),
      sub('quy-tac-the-gioi', 'Quy Tắc Thế Giới')
    ]),
    tab('nhom-nhan-vat-dong-nhan', 'Nhóm Nhân Vật Đồng Nhân', 'User', [
      sub('canon-character', 'Canon Character (Nhân vật gốc)'),
      sub('original-character', 'Original Character (OC)'),
      sub('bang-hoai-kich-tinh', 'Băng Hoại Kịch Tình (OOC)'),
      sub('ke-xuyen-thu-trong-sinh', 'Kẻ Xuyên Thư / Trọng Sinh')
    ]),
    tab('tuyen-truyen-ma-cai', 'Tuyến Truyện Ma Cải', 'ScrollText', [
      sub('diem-re-nhanh', 'Điểm Rẽ Nhánh'),
      sub('hieu-ung-canh-buom', 'Hiệu Ứng Cánh Bướm'),
      sub('cuu-roi-tuyen', 'Cứu Rỗi Tuyến'),
      sub('hac-hoa-tuyen', 'Hắc Hóa Tuyến'),
      sub('ket-cuc-moi', 'Kết Cục Mới (Alternative Universe)')
    ])
  ],
  "Lịch Sử": [
    tab('thien-ha-dai-the', 'Thiên Hạ Đại Thế (Bối Cảnh)', 'Globe', [
      sub('trieu-dai-ky-nguyen', 'Triều Đại Kỷ Nguyên'),
      sub('de-vuong-thong-tri', 'Đế Vương Thống Trị'),
      sub('loan-the-tranh-hung', 'Loạn Thế Tranh Hùng'),
      sub('phien-tran-cat-cu', 'Phiên Trấn Cát Cứ'),
      sub('quan-hung-truc-loc', 'Quần Hùng Trục Lộc')
    ]),
    tab('vuong-hau-tuong-linh', 'Vương Hầu Tướng Lĩnh (Nhân Vật)', 'User', [
      sub('chan-long-thien-tu', 'Chân Long Thiên Tử'),
      sub('hau-cung-phi-tan', 'Hậu Cung Phi Tần'),
      sub('muu-si-mon-khach', 'Mưu Sĩ / Môn Khách'),
      sub('van-than-vo-tuong', 'Văn Thần / Võ Tướng'),
      sub('man-di-phien-bang', 'Man Di / Phiên Bang'),
      sub('thao-menh-anh-hung', 'Thảo Mãnh Anh Hùng')
    ]),
    tab('lich-su-quy-tich', 'Lịch Sử Quỹ Tích (Sự Kiện)', 'ScrollText', [
      sub('sa-ban-tranh-ba', 'Sa Bàn Tranh Bá (Chiến dịch)'),
      sub('cung-bien-doat-dich', 'Cung Biến / Đoạt Đích'),
      sub('bien-phap-cai-cach', 'Biến Pháp Cải Cách'),
      sub('khoa-cu-ky', 'Khoa Cử Ký')
    ]),
    tab('chung-dien-co-so', 'Chủng Điền Cơ Sở (Phát Triển)', 'Hexagon', [
      sub('luyen-binh-tri-quan', 'Luyện Binh Trị Quân'),
      sub('cong-trinh-binh-phap', 'Công Trình Binh Pháp'),
      sub('hac-khoa-ky-lich-su', 'Hắc Khoa Kỹ Lịch Sử'),
      sub('nong-thuong-chi-dao', 'Nông Thương Chi Đạo'),
      sub('kien-thiet-tri-sanh', 'Kiến Thiết Trì Sảnh')
    ])
  ],
  "Linh Dị": [
    tab('linh-di-nhan-vat', 'Nhân Vật Linh Dị', 'User', [
      sub('nguoi-song', 'Người Sống'),
      sub('linh-the-ma-quy', 'Linh Thể / Ma Quỷ'),
      sub('phan-dien', 'Phản Diện'),
      sub('phu-tro', 'Nhân Vật Phụ')
    ]),
    tab('boi-canh-kinh-di', 'Bối Cảnh Kinh Dị', 'Globe', [
      sub('dia-diem-ma-am', 'Địa Điểm Ma Ám'),
      sub('quy-tac-sinh-ton', 'Quy Tắc Sinh Tồn'),
      sub('bi-mat-the-gioi', 'Bí Mật Thế Giới')
    ]),
    tab('su-kien-truyen-thuyet', 'Sự Kiện & Truyền Thuyết', 'ScrollText', [
      sub('su-kien-bat-thuong', 'Sự Kiện Bất Thường'),
      sub('truyen-thuyet-urban', 'Truyền Thuyết Urban'),
      sub('loi-nguyen-linh-hon', 'Lời Nguyền / Linh Hồn')
    ])
  ]
};

const TONG_QUAN = { id: 'tong-quan', label: 'Tổng Quan', iconName: 'BookOpen', subTabs: [], isFixed: true };

/** Thứ tự hiển thị nhóm chức năng. */
export const TAB_GROUP_ORDER = ['Nhân Vật', 'Tu Luyện / Sức mạnh', 'Thế Giới', 'Thế Lực', 'Vật Phẩm / Kỹ thuật', 'Sự Kiện / Cốt truyện', 'Khác'];

/** Map tab id -> nhóm chức năng (để gộp Tu Sĩ + Sinh Linh vào "Nhân Vật", v.v.). */
export const TAB_GROUP_MAP = {
  'tu-si': 'Nhân Vật', 'sinh-linh': 'Nhân Vật', 'quan-chung-tuyen': 'Nhân Vật', 'nhan-qua-nghiet-duyen': 'Nhân Vật',
  'do-thi-nhan-vat': 'Nhân Vật', 'luan-hoi-tieu-doi': 'Nhân Vật', 'so-lieu-nhan-vat': 'Nhân Vật',
  'vuong-hau-tuong-linh': 'Nhân Vật', 'linh-di-nhan-vat': 'Nhân Vật', 'nhom-nhan-vat-dong-nhan': 'Nhân Vật',
  'dai-dao': 'Tu Luyện / Sức mạnh', 'the-he-luc-luong': 'Tu Luyện / Sức mạnh', 'chuc-nang-cot-loi': 'Tu Luyện / Sức mạnh',
  'kim-chi-nam': 'Tu Luyện / Sức mạnh', 'hoi-doai-cuong-hoa': 'Tu Luyện / Sức mạnh', 'tien-hoa-lo-tuyen': 'Tu Luyện / Sức mạnh',
  'tinh-hach-vat-tu': 'Tu Luyện / Sức mạnh',
  'chu-thien-van-gioi': 'Thế Giới', 'vi-dien-dai-luc': 'Thế Giới', 'boi-canh-thiet-lap': 'Thế Giới',
  'ban-do-su-nghiep': 'Thế Giới', 'the-gioi-nhiem-vu': 'Thế Giới', 'tinh-te-cuong-vuc': 'Thế Giới',
  'ky-nguyen-hac-am': 'Thế Giới', 'nguyen-tac-vi-dien': 'Thế Giới', 'thien-ha-dai-the': 'Thế Giới', 'boi-canh-kinh-di': 'Thế Giới',
  'dinh-cap-the-luc': 'Thế Lực', 'van-toc-quan-dao': 'Thế Lực', 'ban-the-he-thong': 'Thế Lực',
  'dinh-cap-vong-tron': 'Thế Lực', 'chu-than-khong-gian': 'Thế Lực', 'tran-doanh-the-luc': 'Thế Lực',
  'doanh-trai-sinh-ton': 'Thế Lực', 'chung-dien-co-so': 'Thế Lực',
  'ky-tran-di-bao': 'Vật Phẩm / Kỹ thuật', 'than-vat-ma-vat': 'Vật Phẩm / Kỹ thuật', 'trang-bi-than-vat': 'Vật Phẩm / Kỹ thuật',
  'hac-khoa-ky': 'Vật Phẩm / Kỹ thuật', 'nguy-co-tu-phia': 'Vật Phẩm / Kỹ thuật',
  'ai-tinh-tuyen': 'Sự Kiện / Cốt truyện', 'kich-ban-kich-tinh': 'Sự Kiện / Cốt truyện', 'dong-chay-luan-hoi': 'Sự Kiện / Cốt truyện',
  'cot-truyen-gameplay': 'Sự Kiện / Cốt truyện', 'lich-su-quy-tich': 'Sự Kiện / Cốt truyện', 'su-kien-truyen-thuyet': 'Sự Kiện / Cốt truyện',
  'tuyen-truyen-ma-cai': 'Sự Kiện / Cốt truyện',
  'giao-dien-thuoc-tinh': 'Khác',
  'nhan-vat': 'Nhân Vật', 'tu-luyen': 'Tu Luyện / Sức mạnh', 'the-gioi': 'Thế Giới',
  'the-luc': 'Thế Lực', 'vu-khi': 'Vật Phẩm / Kỹ thuật', 'tai-nguyen': 'Vật Phẩm / Kỹ thuật'
};

function mergeSubTabs(a, b) {
  const byId = new Map();
  for (const s of a) byId.set(s.id, { ...s });
  for (const s of b) {
    if (!byId.has(s.id)) byId.set(s.id, { ...s });
  }
  return Array.from(byId.values());
}

/** Gộp cấu trúc mục lục theo danh sách thể loại đã chọn. Thêm _group, _genre cho UI gom nhóm. */
export function mergeTabsByGenres(genres) {
  if (!Array.isArray(genres) || genres.length === 0) return null;
  const merged = new Map(); // id -> tab
  for (const genre of genres) {
    const tabs = GENRE_TABS_MAP[genre];
    if (!tabs) continue;
    for (const t of tabs) {
      const group = TAB_GROUP_MAP[t.id] || 'Khác';
      const existing = merged.get(t.id);
      if (existing) {
        existing.subTabs = mergeSubTabs(existing.subTabs, t.subTabs);
      } else {
        merged.set(t.id, { ...t, subTabs: t.subTabs.map(s => ({ ...s })), _group: group, _genre: genre });
      }
    }
  }
  const hydrated = hydrateTabsAutoSyncConfigs([TONG_QUAN, ...Array.from(merged.values())]);
  const linked = hydrateTabsAutoSyncLinkTargets(hydrated.tabsConfig);
  const result = linked.tabsConfig;
  return result.length > 1 ? result : null;
}
