// ==========================================
// Cấu hình ngữ nghĩa cho Ghi Chép Chi Tiết:
// callout roles, màu preset, mẫu nhanh và nhãn-giá-trị.
// ==========================================

export const ENTITY_NOTES_COLOR_PRESETS = [
  { id: 'emphasis', label: 'Nhấn mạnh', color: '#f59e0b' },
  { id: 'concept', label: 'Khái niệm', color: '#60a5fa' },
  { id: 'warning', label: 'Cảnh báo', color: '#f87171' },
  { id: 'relation', label: 'Quan hệ', color: '#818cf8' },
  { id: 'milestone', label: 'Mốc', color: '#34d399' },
];

export const ENTITY_NOTES_LABEL_VALUE_PRESETS = [
  { id: 'name', label: 'Tên gọi', text: '- **Tên gọi:** ' },
  { id: 'scope', label: 'Phạm vi', text: '- **Phạm vi:** ' },
  { id: 'traits', label: 'Đặc điểm', text: '- **Đặc điểm:** ' },
  { id: 'relation', label: 'Liên hệ', text: '- **Liên hệ:** ' },
];

export const ENTITY_NOTES_CALLOUTS = {
  NOTE: {
    role: 'NOTE',
    label: 'Ghi chú',
    title: 'Ghi chú',
    accent: 'violet',
  },
  WARNING: {
    role: 'WARNING',
    label: 'Cảnh báo',
    title: 'Cảnh báo',
    accent: 'amber',
  },
  KEY: {
    role: 'KEY',
    label: 'Điểm chính',
    title: 'Điểm chính',
    accent: 'cyan',
  },
  ABSTRACT: {
    role: 'ABSTRACT',
    label: 'Trích yếu',
    title: 'Trích yếu',
    accent: 'emerald',
  },
  SUMMARY: {
    role: 'SUMMARY',
    label: 'Tóm tắt',
    title: 'Tóm tắt',
    accent: 'violet',
  },
  DEFINITION: {
    role: 'DEFINITION',
    label: 'Định nghĩa',
    title: 'Định nghĩa',
    accent: 'sky',
  },
  LAYERS: {
    role: 'LAYERS',
    label: 'Phân tầng',
    title: 'Phân tầng',
    accent: 'amber',
  },
  RELATION: {
    role: 'RELATION',
    label: 'Liên hệ',
    title: 'Liên hệ',
    accent: 'indigo',
  },
  EXAMPLE: {
    role: 'EXAMPLE',
    label: 'Ví dụ',
    title: 'Ví dụ',
    accent: 'emerald',
  },
  CONCLUSION: {
    role: 'CONCLUSION',
    label: 'Kết luận',
    title: 'Kết luận',
    accent: 'rose',
  },
};

export function resolveEntityNotesCallout(role) {
  return ENTITY_NOTES_CALLOUTS[String(role || '').toUpperCase()] || null;
}

export function buildEntityNotesCalloutBlock(role, title = '', bodyLines = ['']) {
  const resolved = resolveEntityNotesCallout(role) || ENTITY_NOTES_CALLOUTS.NOTE;
  const safeTitle = String(title || '').trim() || resolved.title;
  const normalizedBodyLines = (Array.isArray(bodyLines) ? bodyLines : [String(bodyLines || '')]).map((line) =>
    String(line || '')
  );
  return [
    `> [!${resolved.role}] ${safeTitle}`,
    ...normalizedBodyLines.map((line) => `> ${line}`),
  ].join('\n');
}

export const ENTITY_NOTES_SEMANTIC_TEMPLATES = [
  {
    id: 'summary',
    label: 'Tóm tắt',
    title: 'Chèn khung tóm tắt ngắn, gói lại ý chính',
    text: buildEntityNotesCalloutBlock('SUMMARY', 'Tóm tắt', [
      '- **Ý chính:** ',
      '- **Ý nghĩa:** ',
    ]),
  },
  {
    id: 'definition',
    label: 'Định nghĩa',
    title: 'Chèn khung định nghĩa / phạm vi',
    text: buildEntityNotesCalloutBlock('DEFINITION', 'Định nghĩa', [
      '- **Khái niệm:** ',
      '- **Phạm vi:** ',
    ]),
  },
  {
    id: 'layers',
    label: 'Phân tầng',
    title: 'Chèn khung phân tầng / cấp bậc',
    text: buildEntityNotesCalloutBlock('LAYERS', 'Phân tầng', [
      '1. ',
      '2. ',
      '3. ',
    ]),
  },
  {
    id: 'relation',
    label: 'Liên hệ',
    title: 'Chèn khung liên hệ / tác động',
    text: buildEntityNotesCalloutBlock('RELATION', 'Liên hệ', [
      '- **Liên hệ chính:** ',
      '- **Tác động:** ',
    ]),
  },
  {
    id: 'example',
    label: 'Ví dụ',
    title: 'Chèn khung ví dụ / trường hợp tiêu biểu',
    text: buildEntityNotesCalloutBlock('EXAMPLE', 'Ví dụ', [
      '- **Trường hợp tiêu biểu:** ',
      '- **Điểm rút ra:** ',
    ]),
  },
  {
    id: 'note',
    label: 'Lưu ý',
    title: 'Chèn khung lưu ý nhanh',
    text: buildEntityNotesCalloutBlock('NOTE', 'Lưu ý', [
      '- ',
    ]),
  },
  {
    id: 'conclusion',
    label: 'Kết luận',
    title: 'Chèn khung kết luận / chốt ý',
    text: buildEntityNotesCalloutBlock('CONCLUSION', 'Kết luận', [
      'Tổng kết ngắn: ',
    ]),
  },
];

export const ENTITY_NOTES_CALLOUT_BUTTONS = [
  { id: 'note', label: 'Ghi chú', role: 'NOTE', title: 'Ghi chú' },
  { id: 'warning', label: 'Cảnh báo', role: 'WARNING', title: 'Cảnh báo' },
  { id: 'key', label: 'Điểm chính', role: 'KEY', title: 'Điểm chính' },
  { id: 'abstract', label: 'Trích yếu', role: 'ABSTRACT', title: 'Trích yếu' },
];

const buildProfileSection = (title, lines) =>
  [`**${title}**`, '', ...lines, ''].join('\n');

export const ENTITY_NOTES_TYPE_PROFILES = {
  generic: {
    id: 'generic',
    label: 'Hồ sơ chung',
    aliases: [],
    templates: [
      {
        id: 'generic-summary',
        label: 'Hồ sơ nhanh',
        title: 'Khung hồ sơ tổng quát cho mọi loại thẻ',
        text: [
          buildProfileSection('1. Khái quát', [
            '- **Bản chất:** ',
            '- **Vai trò / vị trí:** ',
          ]),
          buildProfileSection('2. Đặc điểm chính', [
            '- **Điểm nổi bật:** ',
            '- **Liên hệ đáng chú ý:** ',
          ]),
        ].join('\n'),
      },
    ],
  },
  character: {
    id: 'character',
    label: 'Nhân vật',
    aliases: ['nhan vat', 'nhân vật', 'char', 'character'],
    templates: [
      {
        id: 'character-role',
        label: 'Vai trò',
        title: 'Khung vai trò, thân phận và vị trí của nhân vật',
        text: [
          buildProfileSection('1. Thân phận và vai trò', [
            '- **Thân phận:** ',
            '- **Vai trò trong truyện:** ',
          ]),
          buildProfileSection('2. Quan hệ nổi bật', [
            '- **Đồng minh / phe:** ',
            '- **Xung đột chính:** ',
          ]),
        ].join('\n'),
      },
      {
        id: 'character-power',
        label: 'Năng lực',
        title: 'Khung ghi chép năng lực, giới hạn và biến chuyển',
        text: [
          buildProfileSection('1. Năng lực cốt lõi', [
            '- **Năng lực / kỹ năng:** ',
            '- **Điểm mạnh:** ',
          ]),
          buildProfileSection('2. Giới hạn và biến chuyển', [
            '- **Điểm yếu / ràng buộc:** ',
            '- **Bước ngoặt phát triển:** ',
          ]),
        ].join('\n'),
      },
    ],
  },
  realm: {
    id: 'realm',
    label: 'Cảnh giới',
    aliases: ['canh gioi', 'cảnh giới', 'realm', 'canh', 'cấp bậc'],
    templates: [
      {
        id: 'realm-layers',
        label: 'Phân tầng',
        title: 'Khung phân tầng và danh xưng theo cảnh giới',
        text: [
          buildProfileSection('1. Định vị cảnh giới', [
            '- **Thuộc tầng lớn nào:** ',
            '- **Danh xưng / cấp tương ứng:** ',
          ]),
          buildProfileSection('2. Điều kiện và khác biệt', [
            '- **Điều kiện bước vào:** ',
            '- **Khác biệt so với tầng trước:** ',
          ]),
        ].join('\n'),
      },
    ],
  },
  location: {
    id: 'location',
    label: 'Địa danh',
    aliases: ['dia danh', 'địa danh', 'dia diem', 'địa điểm', 'location', 'vung dat'],
    templates: [
      {
        id: 'location-layout',
        label: 'Không gian',
        title: 'Khung bố cục, phạm vi và tác dụng của địa danh',
        text: [
          buildProfileSection('1. Khái quát không gian', [
            '- **Vị trí / phạm vi:** ',
            '- **Điểm nhận diện:** ',
          ]),
          buildProfileSection('2. Giá trị và liên hệ', [
            '- **Vai trò / giá trị:** ',
            '- **Liên hệ với các thế lực / nhân vật:** ',
          ]),
        ].join('\n'),
      },
    ],
  },
  faction: {
    id: 'faction',
    label: 'Thế lực',
    aliases: ['the luc', 'thế lực', 'to chuc', 'tổ chức', 'mon phai', 'gia toc', 'faction'],
    templates: [
      {
        id: 'faction-structure',
        label: 'Cơ cấu',
        title: 'Khung cơ cấu, phạm vi ảnh hưởng và mục tiêu của thế lực',
        text: [
          buildProfileSection('1. Khái quát thế lực', [
            '- **Bản chất / mục tiêu:** ',
            '- **Phạm vi ảnh hưởng:** ',
          ]),
          buildProfileSection('2. Cơ cấu và quan hệ', [
            '- **Cơ cấu / tầng lớp:** ',
            '- **Đồng minh / đối địch:** ',
          ]),
        ].join('\n'),
      },
    ],
  },
  technique: {
    id: 'technique',
    label: 'Công pháp',
    aliases: ['cong phap', 'công pháp', 'vo ky', 'võ kỹ', 'bi phap', 'kỹ năng', 'technique', 'phap mon'],
    templates: [
      {
        id: 'technique-usage',
        label: 'Cách dùng',
        title: 'Khung công dụng, điều kiện và ví dụ sử dụng',
        text: [
          buildProfileSection('1. Khái quát công pháp', [
            '- **Công dụng chính:** ',
            '- **Loại / thuộc tính:** ',
          ]),
          buildProfileSection('2. Điều kiện và ứng dụng', [
            '- **Điều kiện tu luyện / sử dụng:** ',
            '- **Ví dụ / trường hợp nổi bật:** ',
          ]),
        ].join('\n'),
      },
    ],
  },
};

const normalizeProfileText = (value) =>
  String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase();

export function resolveEntityNotesTemplateProfile(context = {}) {
  const haystack = normalizeProfileText(
    [
      context.tabLabel,
      context.typeLabel,
      context.activeTabLon,
      context.entityName,
      context.dynamicType,
    ]
      .filter(Boolean)
      .join(' | ')
  );

  const matchedProfile = Object.values(ENTITY_NOTES_TYPE_PROFILES).find((profile) =>
    profile.aliases.some((alias) => haystack.includes(normalizeProfileText(alias)))
  );

  return matchedProfile || ENTITY_NOTES_TYPE_PROFILES.generic;
}
