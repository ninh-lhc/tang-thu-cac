// ==========================================
// TRỤ 2: HÀM TIỆN ÍCH & RENDER
// File: MasterUtils.jsx
// ==========================================

import React, { useState, useEffect, memo } from 'react';
import {
  BookOpen, Swords, User, Map, Hexagon, Flame, Globe, ScrollText, Link2, Plus
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

export const callGeminiAPI = async (payload, key) => {
  const delays = [1000, 2000, 4000, 8000, 16000];
  for (let i = 0; i < 5; i++) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      let jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) return null;
      jsonText = jsonText.replace(/```json/g, '').replace(/```/g, '').trim();
      return JSON.parse(jsonText);
    } catch (e) {
      if (i === 4) throw e;
      await new Promise(r => setTimeout(r, delays[i]));
    }
  }
};

export const analyzeTextWithAI = async (text, fieldsTemplate, key) => {
  const properties = {
    name: { type: "STRING", description: "Tên/Danh xưng (nếu là tạo mới thực thể)" },
    avatar: { type: "STRING", description: "URL ảnh đại diện (nếu có)" },
    processedText: { type: "STRING", description: "Giữ nguyên ý nghĩa văn bản gốc, nhưng TỰ ĐỘNG BỌC TẤT CẢ các danh từ riêng (Tên người, thế lực, công pháp, pháp bảo, địa danh...) vào trong ngoặc vuông kép để tạo Link. Ví dụ: 'Hàn Lập đánh Nam Cung Uyển' -> '[[Hàn Lập]] đánh [[Nam Cung Uyển]]'." }
  };
  fieldsTemplate.forEach(f => { properties[f.id] = { type: "STRING", description: f.label }; });

  const payload = {
    contents: [{ parts: [{ text: text }] }],
    systemInstruction: { parts: [{ text: "Trích xuất thông tin chính xác. Trả về JSON. Đặc biệt chú trọng việc tạo Link [[...]] trong processedText." }] },
    generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties } }
  };
  return callGeminiAPI(payload, key);
};

export const extractEntityAttributesWithAI = async (text, currentFieldsTemplate, key) => {
  const properties = {
    existingData: { type: "OBJECT", description: "Trích xuất thông tin khớp với các trường đã có. Nếu không có thông tin, bỏ qua trường đó.", properties: {} },
    newFields: { type: "ARRAY", description: "Các thông tin quan trọng khác CÓ TRONG VĂN BẢN nhưng chưa có trường tương ứng.", items: { type: "OBJECT", properties: { label: { type: "STRING" }, value: { type: "STRING" } } } }
  };
  currentFieldsTemplate.forEach(f => { properties.existingData.properties[f.id] = { type: "STRING", description: f.label }; });

  const payload = {
    contents: [{ parts: [{ text: text }] }],
    systemInstruction: { parts: [{ text: "Phân tích đoạn văn bản, trích xuất các thuộc tính. Điền vào existingData nếu khớp, tạo newFields nếu phát hiện thông tin mới. Chỉ trả về JSON." }] },
    generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties } }
  };
  return callGeminiAPI(payload, key);
};

export const generateReviewWithAI = async (novelInfo, key) => {
  const payload = {
    contents: [{ parts: [{ text: `Truyện: ${novelInfo.title}, Tác giả: ${novelInfo.author}, Thể loại: ${novelInfo.genre}, Tags: ${(novelInfo.tags || []).join(', ')}. Hãy viết một bài Review cảm ngộ mang đậm phong cách đọc truyện tiên hiệp/huyền huyễn, tóm tắt điểm sáng, bối cảnh và tại sao nên đọc truyện này. Viết một đoạn văn dài khoảng 150-200 chữ.` }] }],
    systemInstruction: { parts: [{ text: "Bạn là một đạo hữu uyên bác đang review ngọc giản. Hành văn có khí chất." }] }
  };
  try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("API Error");
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text;
  } catch(e) { return null; }
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

export const AsyncLocalImage = memo(({ filename, alt, dirHandle, className }) => {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let isMounted = true;
    if (dirHandle && dirHandle !== 'LOCAL_STORAGE') {
      const fetchImage = async () => {
        try {
          const dir = await dirHandle.getDirectoryHandle('images');
          const fileH = await dir.getFileHandle(filename);
          const file = await fileH.getFile();
          if(isMounted) { objectUrl = URL.createObjectURL(file); setSrc(objectUrl); }
        } catch(e) { if(isMounted) setErr(true); }
      };
      fetchImage();
    } else { setErr(true); }
    return () => { isMounted = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [filename, dirHandle]);

  const imgClass = className || "max-w-full rounded-xl my-4 shadow-lg border border-slate-700 object-cover";
  if (err) return <img src={FALLBACK_IMG} alt="Lỗi truy xuất ảnh" className={imgClass} />;
  if (!src) return <div className={`p-4 bg-slate-900 animate-pulse flex items-center justify-center text-slate-500 text-sm shadow-inner ${imgClass}`}>Đang tải...</div>;
  return <img src={src} alt={alt} className={imgClass} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />;
});

export const processPlainTextWithLinks = (text, entityMap, linkRegex, onNavigate) => {
    if (!text || !entityMap || entityMap.length === 0 || !linkRegex) return text;
    const parts = text.split(linkRegex);
    if (parts.length === 1) return text;

    return parts.map((part, i) => {
        if (i % 2 === 0) return part; 
        const match = entityMap.find(e => e.name.toLowerCase() === part.toLowerCase());
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

export const processInline = (text, dirHandle, entityMap, linkRegex, onNavigate) => {
  if (!text) return null;
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
            const match = entityMap.find(e => e.name.toLowerCase() === innerText.toLowerCase());
            if (match) {
                return <span key={i} onClick={(e) => { e.stopPropagation(); onNavigate(match.dest); }} className="text-amber-400 bg-amber-900/20 px-1.5 py-0.5 rounded-md hover:bg-amber-600 hover:text-white hover:shadow-[0_0_15px_rgba(217,119,6,0.6)] transition-all font-bold cursor-pointer inline-flex items-center gap-1" title={`Mở hồ sơ: ${innerText}`}><Link2 size={12}/>{innerText}</span>;
            }
            return <span key={i} onClick={(e) => { e.stopPropagation(); onNavigate({ type: 'QUICK_CREATE', name: innerText }); }} className="text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded-md hover:text-emerald-400 hover:bg-emerald-900/30 border border-dashed border-slate-600 hover:border-emerald-500/50 transition-all cursor-pointer inline-flex items-center gap-1" title="Thực thể chưa có hồ sơ. Nhấp để ngưng tụ (tạo mới)!"><Plus size={12}/>{innerText}</span>;
        }
        if (part.startsWith('**') && part.endsWith('**')) return <strong key={i} className="text-amber-400">{processPlainTextWithLinks(safeString(part.slice(2, -2)), entityMap, linkRegex, onNavigate)}</strong>;
        if (part.startsWith('*') && part.endsWith('*')) return <em key={i} className="text-amber-200/70 italic">{processPlainTextWithLinks(safeString(part.slice(1, -1)), entityMap, linkRegex, onNavigate)}</em>;
    }
    return <span key={i}>{processPlainTextWithLinks(safeString(part), entityMap, linkRegex, onNavigate)}</span>;
  });
};

export const renderMarkdown = (text, dirHandle, entityMap, linkRegex, onNavigate) => {
  if (!text || typeof text !== 'string') return <div className="text-slate-600 italic mt-10 font-serif flex flex-col items-center gap-4"><ScrollText size={48} className="opacity-30"/><span>Chưa có ghi chép nào...</span></div>;
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('# ')) return <h1 key={`h1-${i}`} className="text-3xl font-heading font-bold text-amber-500 mb-4 border-b border-slate-800 pb-2 mt-6">{processInline(line.slice(2), dirHandle, entityMap, linkRegex, onNavigate)}</h1>;
    if (line.startsWith('## ')) return <h2 key={`h2-${i}`} className="text-2xl font-heading font-bold text-amber-600 mb-3 mt-4">{processInline(line.slice(3), dirHandle, entityMap, linkRegex, onNavigate)}</h2>;
    if (line.startsWith('- ')) return <li key={`li-${i}`} className="ml-6 list-disc mb-2 text-slate-300 font-serif">{processInline(line.slice(2), dirHandle, entityMap, linkRegex, onNavigate)}</li>;
    if (line.trim() === '') return <div key={`empty-${i}`} className="h-4"></div>;
    return <p key={`p-${i}`} className="mb-3 text-slate-300 font-serif leading-relaxed text-lg">{processInline(line, dirHandle, entityMap, linkRegex, onNavigate)}</p>;
  });
};

export const getIconComponent = (iconName) => {
  const props = { size: 18 };
  switch(iconName) {
    case 'BookOpen': return <BookOpen {...props} />;
    case 'Flame': return <Flame {...props} />;
    case 'User': return <User {...props} />;
    case 'Hexagon': return <Hexagon {...props} />;
    case 'Map': return <Map {...props} />;
    case 'Swords': return <Swords {...props} />;
    case 'Globe': return <Globe {...props} />;
    default: return <ScrollText {...props} />;
  }
};

export const handleToolbarClick = (before, after = '', editorId) => {
  const textarea = document.getElementById(editorId);
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const selectedText = text.substring(start, end);
  textarea.value = text.substring(0, start) + before + selectedText + after + text.substring(end);
  textarea.focus();
  textarea.setSelectionRange(start + before.length, end + before.length);
};