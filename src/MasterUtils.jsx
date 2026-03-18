// ==========================================
// TRỤ 2: HÀM TIỆN ÍCH & RENDER
// File: MasterUtils.jsx
// ==========================================

import React, { useState, useEffect, memo } from 'react';
import {
  BookOpen, Swords, User, Map as MapIcon, Hexagon, Flame, Globe, ScrollText, Link2, Plus
} from 'lucide-react';
import { FALLBACK_IMG } from './MasterEngines.js';

export const generateId = (prefix) => `${prefix}-${Math.random().toString(36).substring(2, 11)}`;

export const TERMINOLOGY = {
  'nhan-vat': { entity: 'Nhân Vật', createNew: 'Ngưng Tụ Mới', image: 'Linh Ảnh / Avatar', historyTab: 'Mệnh Số Biến Thiên', infoTab: 'Thần Vận & Bối Cảnh', infoDesc: 'Tiểu sử, ngoại hình, tính cách...', msTitle: 'Cảm ngộ / Đột phá', msEvent: 'Sự kiện / Cảm ngộ *', snapshotHint: 'Thay đổi Avatar, Tu vi... (Bỏ trống nếu không đổi)' },
  'the-luc': { entity: 'Thế Lực', createNew: 'Lập Trận Mới', image: 'Biểu Tượng / Cờ Hiệu', historyTab: 'Lịch Sử Thăng Trầm', infoTab: 'Quy Mô & Bối Cảnh', infoDesc: 'Lịch sử hình thành, quy mô, địa bàn...', msTitle: 'Sự kiện / Biến cố lớn', msEvent: 'Biến cố / Chuyển biến *', snapshotHint: 'Thay đổi Biểu tượng, Trạng thái tông môn... (Bỏ trống nếu không đổi)' },
  'vu-khi': { entity: 'Pháp Bảo', createNew: 'Luyện Khí Mới', image: 'Hình Dáng Pháp Bảo', historyTab: 'Quá Trình Thăng Cấp', infoTab: 'Nguồn Gốc & Khí Linh', infoDesc: 'Vật liệu, công dụng, nguồn gốc...', msTitle: 'Thăng cấp / Hư hỏng', msEvent: 'Sự kiện thăng cấp / Sửa chữa *', snapshotHint: 'Thay đổi Hình dáng, Phẩm cấp... (Bỏ trống nếu không đổi)' },
  'tai-nguyen': { entity: 'Tài Nguyên', createNew: 'Khai Thác Mới', image: 'Hình Ảnh Dược Liệu', historyTab: 'Diễn Biến Phát Triển', infoTab: 'Đặc Tính & Dược Hiệu', infoDesc: 'Nơi sinh trưởng, công dụng, dược tính...', msTitle: 'Trạng thái sinh trưởng', msEvent: 'Quá trình sinh trưởng / Biến dị *', snapshotHint: 'Thay đổi Hình dáng, Dược tính... (Bỏ trống nếu không đổi)' },
  'default': { entity: 'Thực Thể', createNew: 'Khởi Tạo Mới', image: 'Hình Ảnh', historyTab: 'Lịch Sử Biến Thiên', infoTab: 'Thông Tin Chi Tiết', infoDesc: 'Ghi chép chi tiết các đặc điểm...', msTitle: 'Sự kiện quan trọng', msEvent: 'Nội dung sự kiện *', snapshotHint: 'Thay đổi Hình ảnh, Trạng thái... (Bỏ trống nếu không đổi)' }
};
export const getTerms = (tabId) => TERMINOLOGY[tabId] || TERMINOLOGY['default'];

// CẢI TIẾN: Bóp nát chữ "null" hoặc "undefined"
export const safeString = (val) => {
  if (val == null || val === 'null' || val === 'undefined') return '';
  if (typeof val === 'object') { try { return JSON.stringify(val); } catch(e) { return '[Object]'; } }
  return String(val);
};

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/** Giới hạn ký tự gửi Gemini (tránh quota / payload lớn). */
export const AI_MAX_INPUT_CHARS = 28000;

export const truncateForAI = (raw, max = AI_MAX_INPUT_CHARS) => {
  const s = safeString(raw);
  if (s.length <= max) return { text: s, wasTruncated: false };
  return { text: s.slice(0, max) + '\n\n[... ứng dụng đã cắt bớt phần sau]', wasTruncated: true };
};

export const mapGeminiErrorToUserMessage = (err) => {
  const m = safeString(err?.message);
  if (m.startsWith('rate_limit:')) return 'Quá tải API (429/503). Thử lại sau hoặc thêm API Key trong Cài đặt.';
  if (/API key not valid|API_KEY_INVALID|invalid api key/i.test(m)) return 'API Key không hợp lệ. Kiểm tra lại trong Cài đặt.';
  if (/quota|RESOURCE_EXHAUSTED|exceeded/i.test(m)) return 'Hết quota / giới hạn key. Thử key khác hoặc đợi reset.';
  if (m.startsWith('HTTP 401') || m.startsWith('HTTP 403')) return 'Key bị từ chối (401/403). Kiểm tra quyền API.';
  if (m.length > 5 && m.length < 180) return m;
  return 'AI lỗi — kiểm tra mạng và API Key.';
};

const normalizeKeys = (keysInput) =>
  (Array.isArray(keysInput) ? keysInput : [keysInput]).map(k => (k || '').trim()).filter(Boolean);

async function readGeminiErrorDetail(res) {
  let detail = `HTTP ${res.status}`;
  try {
    const j = await res.json();
    const g = j?.error?.message;
    if (g) detail = String(g).slice(0, 220);
  } catch (_) {}
  return detail;
}

// Gọi Gemini và trả về text thô (không parse JSON)
export const callGeminiAPIText = async (payload, keysInput) => {
  const keys = normalizeKeys(keysInput);
  if (keys.length === 0) throw new Error('Chưa thiết lập API Key');
  const maxAttempts = Math.max(6, keys.length * 2);
  let lastError = null;
  for (let i = 0; i < maxAttempts; i++) {
    const key = keys[i % keys.length];
    try {
      const res = await fetch(`${GEMINI_BASE_URL}?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (res.status === 429 || res.status === 503) {
        lastError = new Error(`rate_limit:${res.status}`);
        if (i % keys.length < keys.length - 1) continue;
        if (i < maxAttempts - 1) await new Promise(r => setTimeout(r, Math.min(3000 * (Math.floor(i / keys.length) + 1), 20000)));
        continue;
      }
      if (!res.ok) {
        const detail = await readGeminiErrorDetail(res);
        throw new Error(detail);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
    } catch (e) {
      lastError = e;
      if (i >= maxAttempts - 1) break;
      if (!e.message?.startsWith('rate_limit')) await new Promise(r => setTimeout(r, Math.min(1500 * (i + 1), 10000)));
    }
  }
  throw lastError || new Error('Tất cả API Key đều thất bại');
};

// Gọi Gemini và trả về JSON đã parse (dùng cho structured output)
export const callGeminiAPI = async (payload, keysInput) => {
  const rawText = await callGeminiAPIText(payload, keysInput);
  if (!rawText) return null;
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('AI trả về không phải JSON hợp lệ. Thử lại với đoạn văn ngắn hơn.');
  }
};

export const analyzeTextWithAI = async (text, fieldsTemplate, key) => {
  const { text: t } = truncateForAI(text);
  const properties = {
    name: { type: "STRING", description: "Tên/Danh xưng (nếu là tạo mới thực thể)" },
    avatar: { type: "STRING", description: "URL ảnh đại diện (nếu có)" },
    processedText: { type: "STRING", description: "Giữ nguyên ý nghĩa văn bản gốc, nhưng TỰ ĐỘNG BỌC TẤT CẢ các danh từ riêng (Tên người, thế lực, công pháp, pháp bảo, địa danh...) vào trong ngoặc vuông kép để tạo Link. Ví dụ: 'Hàn Lập đánh Nam Cung Uyển' -> '[[Hàn Lập]] đánh [[Nam Cung Uyển]]'." }
  };
  fieldsTemplate.forEach(f => { properties[f.id] = { type: "STRING", description: f.label }; });

  const payload = {
    contents: [{ parts: [{ text: t }] }],
    systemInstruction: { parts: [{ text: "Trích xuất thông tin chính xác. Trả về JSON. Đặc biệt chú trọng việc tạo Link [[...]] trong processedText." }] },
    generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties } }
  };
  return callGeminiAPI(payload, key);
};

export const extractEntityAttributesWithAI = async (text, currentFieldsTemplate, key) => {
  const { text: t } = truncateForAI(text);
  const properties = {
    existingData: { type: "OBJECT", description: "Trích xuất thông tin khớp với các trường đã có. Nếu không có thông tin, bỏ qua trường đó.", properties: {} },
    newFields: { type: "ARRAY", description: "Các thông tin quan trọng khác CÓ TRONG VĂN BẢN nhưng chưa có trường tương ứng.", items: { type: "OBJECT", properties: { label: { type: "STRING" }, value: { type: "STRING" } } } }
  };
  currentFieldsTemplate.forEach(f => { properties.existingData.properties[f.id] = { type: "STRING", description: f.label }; });

  const payload = {
    contents: [{ parts: [{ text: t }] }],
    systemInstruction: { parts: [{ text: "Phân tích đoạn văn bản, trích xuất các thuộc tính. Điền vào existingData nếu khớp, tạo newFields nếu phát hiện thông tin mới. Chỉ trả về JSON." }] },
    generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties } }
  };
  return callGeminiAPI(payload, key);
};

export const generateReviewWithAI = async (novelInfo, keysInput) => {
  const payload = {
    contents: [{ parts: [{ text: `Truyện: ${novelInfo.title}, Tác giả: ${novelInfo.author}, Thể loại: ${novelInfo.genre}, Tags: ${(novelInfo.tags || []).join(', ')}. Hãy viết một bài Review cảm ngộ mang đậm phong cách đọc truyện tiên hiệp/huyền huyễn, tóm tắt điểm sáng, bối cảnh và tại sao nên đọc truyện này. Viết một đoạn văn dài khoảng 150-200 chữ.` }] }],
    systemInstruction: { parts: [{ text: "Bạn là một đạo hữu uyên bác đang review ngọc giản. Hành văn có khí chất." }] }
  };
  return callGeminiAPIText(payload, keysInput);
};

/** Phân tích ghi chú nối tra cứu → gợi ý tạo thẻ / mốc timeline / cập nhật hồ sơ (người dùng xác nhận sau). */
export const analyzeCrossRefNoteWithAI = async (keysInput, ctx) => {
  const { text: cat } = truncateForAI(ctx.entityCatalog || '', 14000);
  const note = truncateForAI(safeString(ctx.note), 4000).text;
  const userText = [
    `Truyện: ${safeString(ctx.novelTitle)}`,
    `Người đọc đang ở chương ${ctx.fromCh} (ghi chú liên quan chương ${ctx.toCh}).`,
    `Ghi chú nối tra cứu: ${note}`,
    '',
    'DANH MỤC MỤC SƯU TẬM (mỗi dòng: tabLonId|tabNhoId | Nhãn mục | các thẻ đã có):',
    cat || '(trống)',
    '',
    'Nhiệm vụ: Đề xuất tối đa 5 hành động cụ thể. new_entity = cần thẻ mới (nhân vật mới, cảnh giới mới…). milestone = tại chương đang đọc có biến đổi đáng ghi vào timeline của thẻ ĐÃ CÓ (entityHint khớp tên trong danh sách). update_profile = nên mở thẻ có sẵn để bổ sung hồ sơ (không chỉ mốc).',
    'tabLonId/tabNhoId chỉ lấy từ danh mục. chapter cho milestone = số chương đang đọc (fromCh) trừ khi ghi chú nói rõ chương khác.'
  ].join('\n');

  const suggestionItem = {
    type: 'OBJECT',
    properties: {
      kind: { type: 'STRING', description: 'new_entity | milestone | update_profile' },
      tabLonId: { type: 'STRING', description: 'Bắt buộc với new_entity' },
      tabNhoId: { type: 'STRING', description: 'Bắt buộc với new_entity' },
      suggestedName: { type: 'STRING', description: 'Tên thẻ mới' },
      draftRawText: { type: 'STRING', description: 'Bản thảo mô tả cho thẻ mới' },
      entityHint: { type: 'STRING', description: 'Tên thẻ có sẵn (milestone/update)' },
      chapter: { type: 'NUMBER', description: 'Chương gắn mốc' },
      eventText: { type: 'STRING', description: 'Nội dung sự kiện mốc' },
      profileNote: { type: 'STRING', description: 'Gợi ý cập nhật hồ sơ' },
      why: { type: 'STRING', description: 'Một câu giải thích' }
    }
  };
  const payload = {
    contents: [{ parts: [{ text: userText }] }],
    systemInstruction: {
      parts: [{
        text: 'Trả về JSON theo schema. Ngắn gọn, thực tế. Không tự động hóa nguy hiểm: chỉ gợi ý, không khẳng định chắc chắn. Nếu ghi chú chỉ là tra cứu chéo đơn giản, trả suggestions rỗng hoặc 1 gợi ý milestone nhẹ.'
      }]
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          suggestions: { type: 'ARRAY', items: suggestionItem, description: '0-5 phần tử' }
        }
      }
    }
  };
  const out = await callGeminiAPI(payload, keysInput);
  const list = Array.isArray(out?.suggestions) ? out.suggestions : [];
  return { suggestions: list };
};

const journalSuggestionItem = {
  type: 'OBJECT',
  properties: {
    kind: { type: 'STRING', description: 'new_entity | milestone | update_profile' },
    tabLonId: { type: 'STRING' },
    tabNhoId: { type: 'STRING' },
    suggestedName: { type: 'STRING' },
    draftRawText: { type: 'STRING', description: 'Mô tả thẻ mới, văn thuần — CẤM [[wiki]]' },
    entityHint: { type: 'STRING' },
    chapter: { type: 'NUMBER' },
    eventText: { type: 'STRING', description: 'Sự kiện mốc, văn thuần — CẤM [[wiki]]' },
    profileNote: { type: 'STRING', description: 'Ghi chú hồ sơ, văn thuần — CẤM [[wiki]]' },
    fieldPatches: {
      type: 'ARRAY',
      description: 'Chỉ chữ mô tả; CẤM [[wiki]], CẤM URL ảnh — ảnh/link người dùng tự thêm trên thẻ',
      items: {
        type: 'OBJECT',
        properties: {
          fieldLabel: { type: 'STRING' },
          value: { type: 'STRING' }
        }
      }
    },
    why: { type: 'STRING' }
  }
};

/** Nhật ký đọc tự do theo chương → gợi ý cập nhật nhiều thẻ / mốc (áp dụng sau khi người dùng chọn). */
export const analyzeReadingJournalWithAI = async (keysInput, ctx) => {
  const { text: cat } = truncateForAI(ctx.extendedCatalog || '', 15000);
  const note = truncateForAI(safeString(ctx.journalText), 8000).text;
  const ch = parseInt(ctx.chapter, 10);
  const chSafe = !isNaN(ch) && ch >= 0 ? ch : 0;
  const userText = [
    `Truyện: ${safeString(ctx.novelTitle)}`,
    `Ngữ cảnh chương tham chiếu: ${chSafe} (dùng làm mặc định cho mốc nếu văn bản không nêu rõ chương khác).`,
    'NHẬT KÝ / GHI CHÚ NGƯỜI ĐỌC:',
    note,
    '',
    'DANH MỤC (tabLonId|tabNhoId | mục | thẻ hiện có | tên các trường template):',
    cat || '(trống)',
    '',
    'Đề xuất tối đa 10 hành động. new_entity: thẻ chưa có. milestone: sự kiện timeline cho thẻ ĐÃ CÓ (entityHint khớp tên). update_profile: đổi thông tin hồ sơ thẻ có sẵn — dùng fieldPatches với fieldLabel khớp một trong các trường liệt kê, kèm profileNote ngắn nếu cần.',
    'tabLonId/tabNhoId chỉ từ danh mục. Ưu tiên gợi ý cụ thể, tránh trùng lặp vô ích.',
    '',
    'QUAN TRỌNG: Mọi chuỗi (draftRawText, eventText, profileNote, fieldPatches.value) chỉ là văn bản thường. TUYỆT ĐỐI KHÔNG dùng cú pháp [[...]] (wiki link). Không điền URL ảnh hay hướng dẫn gắn ảnh — người dùng sẽ vào thẻ để làm link/ảnh.'
  ].join('\n');

  const payload = {
    contents: [{ parts: [{ text: userText }] }],
    systemInstruction: {
      parts: [{
        text: 'Trả về JSON đúng schema. Tiếng Việt. Ngắn gọn. fieldPatches chỉ khi chắc nhãn trường khớp danh mục. Không bao giờ dùng [[...]] trong bất kỳ trường chuỗi nào; không URL ảnh trong fieldPatches.'
      }]
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: 'OBJECT',
        properties: {
          suggestions: { type: 'ARRAY', items: journalSuggestionItem, description: '0-10' }
        }
      }
    }
  };
  const out = await callGeminiAPI(payload, keysInput);
  const list = Array.isArray(out?.suggestions) ? out.suggestions : [];
  return { suggestions: list };
};

export const sortTabsAlphabetically = (tabs) => {
  if (!tabs || !Array.isArray(tabs)) return [];
  let clonedConfig = structuredClone(tabs); 
  const fixedTabs = clonedConfig.filter(t => t.isFixed);
  const otherTabs = clonedConfig.filter(t => !t.isFixed).sort((a, b) => a.label.localeCompare(b.label, 'vi'));
  
  return [...fixedTabs, ...otherTabs.map(tabLon => {
    let sortedSubTabs = tabLon.subTabs ? [...tabLon.subTabs] : [];
    sortedSubTabs.sort((a, b) => a.label.localeCompare(b.label, 'vi'));
    sortedSubTabs = sortedSubTabs.map(tabNho => {
      let sortedTabCon = tabNho.tabCon ? [...tabNho.tabCon] : [];
      sortedTabCon.sort((a, b) => a.label.localeCompare(b.label, 'vi'));
      return { ...tabNho, tabCon: sortedTabCon };
    });
    return { ...tabLon, subTabs: sortedSubTabs };
  })];
};

const localImageUrlCache = new WeakMap();

export const AsyncLocalImage = memo(({ filename, alt, dirHandle, className }) => {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let isMounted = true;
    if (dirHandle && dirHandle !== 'LOCAL_STORAGE') {
      let byName = localImageUrlCache.get(dirHandle);
      if (!byName) {
        byName = new Map();
        localImageUrlCache.set(dirHandle, byName);
      }
      const cached = byName.get(filename);
      if (cached) {
        setSrc(cached);
        setErr(false);
        return;
      }
      const fetchImage = async () => {
        try {
          const dir = await dirHandle.getDirectoryHandle('images');
          const fileH = await dir.getFileHandle(filename);
          const file = await fileH.getFile();
          objectUrl = URL.createObjectURL(file);
          byName.set(filename, objectUrl);
          if (isMounted) { setSrc(objectUrl); setErr(false); }
        } catch(e) { if(isMounted) setErr(true); }
      };
      fetchImage();
    } else { setErr(true); }
    return () => { isMounted = false; };
  }, [filename, dirHandle]);

  const imgClass = className || "max-w-full rounded-xl my-4 shadow-lg border border-slate-700 object-cover";
  if (err) return <img src={FALLBACK_IMG} alt="Lỗi truy xuất ảnh" className={imgClass} />;
  if (!src) return <div className={`p-4 bg-slate-900 animate-pulse flex items-center justify-center text-slate-500 text-sm shadow-inner ${imgClass}`}>Đang tải...</div>;
  return <img src={src} alt={alt} className={imgClass} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />;
});

export const buildEntityNameLookup = (entityMap) => {
  const m = new Map();
  if (!entityMap) return m;
  const arr = Array.isArray(entityMap) ? entityMap : [];
  for (const e of arr) {
    if (e?.name) m.set(String(e.name).toLowerCase(), e);
  }
  return m;
};

export const processPlainTextWithLinks = (text, lookup, linkRegex, onNavigate) => {
    if (!text || !lookup || lookup.size === 0 || !linkRegex) return text;
    const parts = text.split(linkRegex);
    if (parts.length === 1) return text;

    return parts.map((part, i) => {
        if (i % 2 === 0) return part; 
        const match = lookup.get(String(part).toLowerCase());
        if (match) {
            return (
               <span key={i} onClick={(e) => { e.stopPropagation(); onNavigate(match.dest); }} className="text-amber-400 bg-amber-900/20 px-1 rounded hover:bg-amber-600 hover:text-white hover:shadow-[0_0_10px_rgba(217,119,6,0.5)] transition-all font-bold cursor-pointer inline-flex items-center gap-0.5">
                  <Link2 size={12}/>{part}
               </span>
            );
        }
        return part;
    });
};

export const processInline = (text, dirHandle, entityLookup, linkRegex, onNavigate) => {
  if (!text) return null;
  const lookup = entityLookup instanceof Map ? entityLookup : buildEntityNameLookup(entityLookup);
  const parts = text.split(/(\*\*.*?\*\*|\*.*?\*|!\[.*?\]\(.*?\)|\[\[.*?\]\])/g);
  
  return parts.map((part, i) => {
    if (i % 2 !== 0) { 
        if (part.startsWith('![') && part.endsWith(')')) {
          const match = part.match(/^!\[(.*?)\]\((.*?)\)$/);
          if (match) {
             const alt = safeString(match[1]);
             const url = safeString(match[2]);
             if (url.startsWith('local_image:')) {
                return <AsyncLocalImage key={i} filename={url.replace('local_image:', '')} alt={alt} dirHandle={dirHandle} />;
             }
             return <img key={i} src={url} alt={alt} className="max-w-full rounded-xl my-4 shadow-lg border border-slate-700" />;
          }
        }
        if (part.startsWith('[[') && part.endsWith(']]')) {
            const innerText = safeString(part.slice(2, -2)).trim();
            const match = lookup.get(innerText.toLowerCase());
            if (match) {
                return <span key={i} onClick={(e) => { e.stopPropagation(); onNavigate(match.dest); }} className="text-amber-400 bg-amber-900/20 px-1.5 py-0.5 rounded-md hover:bg-amber-600 hover:text-white hover:shadow-[0_0_15px_rgba(217,119,6,0.6)] transition-all font-bold cursor-pointer inline-flex items-center gap-1" title={`Mở hồ sơ: ${innerText}`}><Link2 size={12}/>{innerText}</span>;
            }
            return <span key={i} onClick={(e) => { e.stopPropagation(); onNavigate({ type: 'QUICK_CREATE', name: innerText }); }} className="text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded-md hover:text-emerald-400 hover:bg-emerald-900/30 border border-dashed border-slate-600 hover:border-emerald-500/50 transition-all cursor-pointer inline-flex items-center gap-1" title="Thực thể chưa có hồ sơ. Nhấp để ngưng tụ (tạo mới)!"><Plus size={12}/>{innerText}</span>;
        }
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-amber-400">{processPlainTextWithLinks(safeString(part.slice(2, -2)), lookup, linkRegex, onNavigate)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="text-amber-200/70 italic">{processPlainTextWithLinks(safeString(part.slice(1, -1)), lookup, linkRegex, onNavigate)}</em>;
    }
    return <span key={i}>{processPlainTextWithLinks(safeString(part), lookup, linkRegex, onNavigate)}</span>;
  });
};

export const renderMarkdown = (text, dirHandle, entityMap, linkRegex, onNavigate) => {
  if (!text || typeof text !== 'string') return <div className="text-slate-600 italic mt-10 font-serif flex flex-col items-center gap-4"><ScrollText size={48} className="opacity-30"/><span>Chưa có ghi chép nào...</span></div>;
  const lookup = buildEntityNameLookup(entityMap);
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('# ')) return <h1 key={`h1-${i}`} className="text-3xl font-heading font-bold text-amber-500 mb-4 border-b border-slate-800 pb-2 mt-6">{processInline(line.slice(2), dirHandle, lookup, linkRegex, onNavigate)}</h1>;
    if (line.startsWith('## ')) return <h2 key={`h2-${i}`} className="text-2xl font-heading font-bold text-amber-600 mb-3 mt-4">{processInline(line.slice(3), dirHandle, lookup, linkRegex, onNavigate)}</h2>;
    if (line.startsWith('- ')) return <li key={`li-${i}`} className="ml-6 list-disc mb-2 text-slate-300 font-serif">{processInline(line.slice(2), dirHandle, lookup, linkRegex, onNavigate)}</li>;
    if (line.trim() === '') return <div key={`empty-${i}`} className="h-4"></div>;
    return <p key={`p-${i}`} className="mb-3 text-slate-300 font-serif leading-relaxed text-lg">{processInline(line, dirHandle, lookup, linkRegex, onNavigate)}</p>;
  });
};

export const getIconComponent = (iconName) => {
  const props = { size: 18 };
  switch(iconName) {
    case 'BookOpen': return <BookOpen {...props} />;
    case 'Flame': return <Flame {...props} />;
    case 'User': return <User {...props} />;
    case 'Hexagon': return <Hexagon {...props} />;
    case 'Map': return <MapIcon {...props} />;
    case 'Swords': return <Swords {...props} />;
    case 'Globe': return <Globe {...props} />;
    default: return <ScrollText {...props} />;
  }
};

const WIKI_WRAP_MAX_PREFIX = 56;

/** Bọc wiki [[...]]: có bôi đen → bọc vùng chọn; không bôi đen → bọc đoạn đã gõ trên dòng (trước con trỏ). */
export const applyWikiLinkWrap = (text, selStart, selEnd) => {
  if (selStart < selEnd) {
    const inner = text.slice(selStart, selEnd);
    const nv = text.slice(0, selStart) + '[[' + inner + ']]' + text.slice(selEnd);
    return { newText: nv, selStart: selStart + 2, selEnd: selStart + 2 + inner.length };
  }
  const pos = selStart;
  const lineStart = text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  let l = lineStart;
  let r = pos;
  while (r > l && /\s/.test(text[r - 1])) r--;
  while (l < r && /\s/.test(text[l])) l++;
  if (r <= l) {
    const nv = text.slice(0, pos) + '[[]]' + text.slice(pos);
    return { newText: nv, selStart: pos + 2, selEnd: pos + 2 };
  }
  let wrapL = l;
  let wrapR = r;
  if (r - l > WIKI_WRAP_MAX_PREFIX) {
    let l2 = r;
    while (l2 > lineStart && !/\s/.test(text[l2 - 1])) l2--;
    while (l2 < r && /\s/.test(text[l2])) l2++;
    if (l2 < r) {
      wrapL = l2;
      wrapR = r;
    }
  }
  const inner = text.slice(wrapL, wrapR);
  const nv = text.slice(0, wrapL) + '[[' + inner + ']]' + text.slice(wrapR);
  const caret = wrapL + 2 + inner.length + 2;
  return { newText: nv, selStart: caret, selEnd: caret };
};

export const handleToolbarClick = (before, after = '', editorId) => {
  const textarea = document.getElementById(editorId);
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;

  const apply = (newValue, selStart, selEnd) => {
    const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
    if (nativeSetter) {
      nativeSetter.call(textarea, newValue);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    } else {
      textarea.value = newValue;
    }
    textarea.focus();
    textarea.setSelectionRange(selStart, selEnd);
  };

  if (before === '[[' && after === ']]') {
    const { newText, selStart, selEnd } = applyWikiLinkWrap(text, start, end);
    apply(newText, selStart, selEnd);
    return;
  }

  const selectedText = text.substring(start, end);
  const newValue = text.substring(0, start) + before + selectedText + after + text.substring(end);
  apply(newValue, start + before.length, end + before.length);
};