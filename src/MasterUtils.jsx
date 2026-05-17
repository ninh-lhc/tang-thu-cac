// ==========================================
// TRỤ 2: HÀM TIỆN ÍCH & RENDER
// File: MasterUtils.jsx
// ==========================================
/* eslint-disable react-refresh/only-export-components */

import React, { useState, useEffect, memo } from 'react';
import {
  BookOpen, Swords, User, Map as MapIcon, Hexagon, Flame, Globe, ScrollText, Link2, Plus
} from 'lucide-react';
import { FALLBACK_IMG } from './MasterEngines.js';
import { splitTextByWikiMatcher } from './lib/wikiLinkMatcher.js';
import { buildEntityNameLookup, resolveEntityLookup } from './lib/entityWikiLookup.js';

export const generateId = (prefix) => `${prefix}-${Math.random().toString(36).substring(2, 11)}`;

export const TERMINOLOGY = {
  'nhan-vat': { entity: 'Nhân Vật', createNew: 'Ngưng Tụ Mới', image: 'Linh Ảnh / Avatar', historyTab: 'Mệnh Số Biến Thiên', infoTab: 'Thần Vận & Bối Cảnh', infoDesc: 'Tiểu sử, ngoại hình, tính cách...', msTitle: 'Cảm ngộ / Đột phá', msEvent: 'Sự kiện / Cảm ngộ *', snapshotHint: 'Thay đổi Avatar, Tu vi... (Bỏ trống nếu không đổi)', profileSubtitleEmpty: 'Chưa có trạng thái / cảnh giới' },
  'the-luc': { entity: 'Thế Lực', createNew: 'Lập Trận Mới', image: 'Biểu Tượng / Cờ Hiệu', historyTab: 'Lịch Sử Thăng Trầm', infoTab: 'Quy Mô & Bối Cảnh', infoDesc: 'Lịch sử hình thành, quy mô, địa bàn...', msTitle: 'Sự kiện / Biến cố lớn', msEvent: 'Biến cố / Chuyển biến *', snapshotHint: 'Thay đổi Biểu tượng, Trạng thái tông môn... (Bỏ trống nếu không đổi)', profileSubtitleEmpty: 'Chưa ghi quy mô hoặc trạng thái' },
  'vu-khi': { entity: 'Pháp Bảo', createNew: 'Luyện Khí Mới', image: 'Hình Dáng Pháp Bảo', historyTab: 'Quá Trình Thăng Cấp', infoTab: 'Nguồn Gốc & Khí Linh', infoDesc: 'Vật liệu, công dụng, nguồn gốc...', msTitle: 'Thăng cấp / Hư hỏng', msEvent: 'Sự kiện thăng cấp / Sửa chữa *', snapshotHint: 'Thay đổi Hình dáng, Phẩm cấp... (Bỏ trống nếu không đổi)', profileSubtitleEmpty: 'Chưa ghi phẩm cấp hoặc trạng thái' },
  'tai-nguyen': { entity: 'Tài Nguyên', createNew: 'Khai Thác Mới', image: 'Hình Ảnh Dược Liệu', historyTab: 'Diễn Biến Phát Triển', infoTab: 'Đặc Tính & Dược Hiệu', infoDesc: 'Nơi sinh trưởng, công dụng, dược tính...', msTitle: 'Trạng thái sinh trưởng', msEvent: 'Quá trình sinh trưởng / Biến dị *', snapshotHint: 'Thay đổi Hình dáng, Dược tính... (Bỏ trống nếu không đổi)', profileSubtitleEmpty: 'Chưa ghi đặc tính hoặc trạng thái' },
  'default': { entity: 'Thực Thể', createNew: 'Khởi Tạo Mới', image: 'Hình Ảnh', historyTab: 'Lịch Sử Biến Thiên', infoTab: 'Thông Tin Chi Tiết', infoDesc: 'Ghi chép chi tiết các đặc điểm...', msTitle: 'Sự kiện quan trọng', msEvent: 'Nội dung sự kiện *', snapshotHint: 'Thay đổi Hình ảnh, Trạng thái... (Bỏ trống nếu không đổi)', profileSubtitleEmpty: 'Chưa có dòng tóm tắt — bổ sung trong dữ liệu thẻ hoặc ghi chép chi tiết' }
};
export const getTerms = (tabId) => TERMINOLOGY[tabId] || TERMINOLOGY['default'];

// CẢI TIẾN: Bóp nát chữ "null" hoặc "undefined"
export const safeString = (val) => {
  if (val == null || val === 'null' || val === 'undefined') return '';
  if (typeof val === 'object') { try { return JSON.stringify(val); } catch { return '[Object]'; } }
  return String(val);
};

/**
 * Chuẩn hóa tên hiển thị theo dạng viết hoa chữ cái đầu mỗi từ.
 * Dùng cho tên truyện/thẻ/mục do người dùng nhập ở các màn hình khởi tạo.
 */
export const toDisplayTitleCase = (value) => {
  const input = safeString(value).trim();
  if (!input) return '';
  return input
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => {
      // Giữ nguyên các token dạng viết hoa toàn bộ (vd: AUTO, RPG, H2O).
      if (token === token.toLocaleUpperCase('vi-VN') && token !== token.toLocaleLowerCase('vi-VN')) {
        return token;
      }
      const first = token.slice(0, 1).toLocaleUpperCase('vi-VN');
      const rest = token.slice(1).toLocaleLowerCase('vi-VN');
      return `${first}${rest}`;
    })
    .join(' ');
};

const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

/** Giới hạn ký tự gửi Gemini (tránh quota / payload lớn). */
export const AI_MAX_INPUT_CHARS = 12000;
const AI_REQUEST_TIMEOUT_MS = 15000;
const AI_CACHE_TTL_MS = 5 * 60 * 1000;

export const truncateForAI = (raw, max = AI_MAX_INPUT_CHARS) => {
  const s = safeString(raw);
  if (s.length <= max) return { text: s, wasTruncated: false };
  return { text: s.slice(0, max) + '\n\n[... ứng dụng đã cắt bớt phần sau]', wasTruncated: true };
};

export const mapGeminiErrorToUserMessage = (err) => {
  const m = safeString(err?.message);
  if (m.startsWith('rate_limit:')) return 'AI dang qua tai (429/503). Day la loi quota/dich vu, khong phai do doan van qua dai. Thu lai sau hoac them API Key trong Cai dat.';
  if (m.startsWith('timeout:')) return 'AI phản hồi quá chậm. Vui lòng thử lại sau.';
  if (/API key not valid|API_KEY_INVALID|invalid api key/i.test(m)) return 'API Key không hợp lệ. Kiểm tra lại trong Cài đặt.';
  if (/quota|RESOURCE_EXHAUSTED|exceeded/i.test(m)) return 'Hết quota / giới hạn key. Thử key khác hoặc đợi reset.';
  if (m.startsWith('HTTP 401') || m.startsWith('HTTP 403')) return 'Key bị từ chối (401/403). Kiểm tra quyền API.';
  if (m.length > 5 && m.length < 180) return m;
  return 'AI lỗi — kiểm tra mạng và API Key.';
};

const normalizeKeys = (keysInput) =>
  Array.from(
    new Set(
      (Array.isArray(keysInput) ? keysInput : [keysInput]).map(k => (k || '').trim()).filter(Boolean)
    )
  );

const geminiResponseCache = new Map();
const geminiKeyCooldownUntil = new Map();
const GEMINI_KEY_RATE_LIMIT_COOLDOWN_MS = 30 * 1000;
const GEMINI_KEY_QUOTA_COOLDOWN_MS = 10 * 60 * 1000;
let geminiKeyCursor = 0;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const parseRetryAfterMs = (res) => {
  const raw = res?.headers?.get?.('retry-after');
  if (!raw) return 0;
  const sec = Number(raw);
  if (Number.isFinite(sec) && sec > 0) return Math.min(sec * 1000, 10000);
  const ts = Date.parse(raw);
  if (!Number.isNaN(ts)) return Math.max(0, Math.min(ts - Date.now(), 10000));
  return 0;
};

async function readGeminiErrorDetail(res) {
  let detail = `HTTP ${res.status}`;
  try {
    const j = await res.json();
    const g = j?.error?.message;
    if (g) detail = String(g).slice(0, 220);
  } catch { void 0; }
  return detail;
}

function isGeminiQuotaLikeDetail(detail) {
  return /RESOURCE_EXHAUSTED|quota|exceeded/i.test(String(detail || ''));
}

function isGeminiRateLimitLikeDetail(detail) {
  return /rate.?limit|too many requests|unavailable|overloaded|429|503/i.test(String(detail || ''));
}

function rememberGeminiKeyCooldown(key, ms) {
  if (!key || !Number.isFinite(ms) || ms <= 0) return;
  const prev = geminiKeyCooldownUntil.get(key) || 0;
  geminiKeyCooldownUntil.set(key, Math.max(prev, Date.now() + ms));
}

function clearGeminiKeyCooldown(key) {
  if (!key) return;
  geminiKeyCooldownUntil.delete(key);
}

function getGeminiKeyAttemptOrder(keys) {
  if (keys.length <= 1) return [...keys];
  const start = geminiKeyCursor % keys.length;
  geminiKeyCursor = (geminiKeyCursor + 1) % keys.length;
  const rotated = keys.map((_, idx) => keys[(start + idx) % keys.length]);
  const now = Date.now();
  const ready = [];
  const cooling = [];
  rotated.forEach((key) => {
    const cooldownUntil = geminiKeyCooldownUntil.get(key) || 0;
    if (cooldownUntil <= now) ready.push(key);
    else cooling.push({ key, cooldownUntil });
  });
  cooling.sort((a, b) => a.cooldownUntil - b.cooldownUntil);
  return [...ready, ...cooling.map((item) => item.key)];
}

function extractGeminiTextResponse(data) {
  const candidate = data?.candidates?.[0];
  const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
  const text = parts
    .map((part) => (typeof part?.text === 'string' ? part.text : ''))
    .join('')
    .trim();
  const blockReason = data?.promptFeedback?.blockReason || '';
  const finishReason = candidate?.finishReason || '';
  return { text, blockReason, finishReason };
}

// Gọi Gemini và trả về text thô (không parse JSON)
// options.timeoutMs: timeout tùy chọn (mặc định AI_REQUEST_TIMEOUT_MS)
export const callGeminiAPIText = async (payload, keysInput, options = {}) => {
  const keys = normalizeKeys(keysInput);
  if (keys.length === 0) throw new Error('Chưa thiết lập API Key');
  const timeoutMs = options.timeoutMs ?? AI_REQUEST_TIMEOUT_MS;
  const payloadKey = JSON.stringify(payload);
  const cacheKey = `${keys.join('|')}::${payloadKey}`;
  const cached = geminiResponseCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < AI_CACHE_TTL_MS) {
    return cached.text;
  }

  // Retry nhiều vòng qua toàn bộ key để chịu lỗi nghẽn tạm thời (429/503) tốt hơn.
  const maxRounds = Math.min(5, Math.max(3, keys.length));
  let lastError = null;
  for (let round = 0; round < maxRounds; round++) {
    const orderedKeys = getGeminiKeyAttemptOrder(keys);
    let attemptedThisRound = 0;
    let earliestCooldownMs = Number.POSITIVE_INFINITY;
    for (const key of orderedKeys) {
      const remainingCooldownMs = (geminiKeyCooldownUntil.get(key) || 0) - Date.now();
      if (remainingCooldownMs > 0) {
        earliestCooldownMs = Math.min(earliestCooldownMs, remainingCooldownMs);
        continue;
      }
      attemptedThisRound += 1;
    try {
      const ac = new AbortController();
      const timeoutId = setTimeout(() => ac.abort(), timeoutMs);
      let res;
      try {
        res = await fetch(`${GEMINI_BASE_URL}?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payloadKey,
          signal: ac.signal,
        });
      } finally {
        clearTimeout(timeoutId);
      }
      if (res.status === 429 || res.status === 503) {
        const retryAfterMs = parseRetryAfterMs(res);
        const cooldownMs = Math.max(
          retryAfterMs,
          res.status === 429 ? GEMINI_KEY_RATE_LIMIT_COOLDOWN_MS : Math.min(GEMINI_KEY_RATE_LIMIT_COOLDOWN_MS, 10000)
        );
        rememberGeminiKeyCooldown(key, cooldownMs);
        earliestCooldownMs = Math.min(earliestCooldownMs, cooldownMs);
        lastError = new Error(`rate_limit:${res.status}`);
        continue;
      }
      if (!res.ok) {
        const detail = await readGeminiErrorDetail(res);
        if (isGeminiQuotaLikeDetail(detail)) {
          rememberGeminiKeyCooldown(key, GEMINI_KEY_QUOTA_COOLDOWN_MS);
          earliestCooldownMs = Math.min(earliestCooldownMs, GEMINI_KEY_QUOTA_COOLDOWN_MS);
        } else if (isGeminiRateLimitLikeDetail(detail)) {
          rememberGeminiKeyCooldown(key, GEMINI_KEY_RATE_LIMIT_COOLDOWN_MS);
          earliestCooldownMs = Math.min(earliestCooldownMs, GEMINI_KEY_RATE_LIMIT_COOLDOWN_MS);
        }
        throw new Error(detail);
      }
      const data = await res.json();
      const { text, blockReason, finishReason } = extractGeminiTextResponse(data);
      if (!text) {
        if (blockReason) throw new Error(`Gemini bị chặn nội dung (${blockReason}).`);
        if (finishReason && finishReason !== 'STOP') {
          throw new Error(`Gemini kết thúc bất thường (${finishReason}).`);
        }
        throw new Error('Gemini không trả nội dung hợp lệ. Thử lại với đoạn ngắn hơn.');
      }
      clearGeminiKeyCooldown(key);
      geminiResponseCache.set(cacheKey, { text, ts: Date.now() });
      return text;
    } catch (e) {
      if (e?.name === 'AbortError') {
        lastError = new Error(`timeout:${timeoutMs}`);
      } else {
        lastError = e;
        if (isGeminiQuotaLikeDetail(e?.message)) {
          rememberGeminiKeyCooldown(key, GEMINI_KEY_QUOTA_COOLDOWN_MS);
          earliestCooldownMs = Math.min(earliestCooldownMs, GEMINI_KEY_QUOTA_COOLDOWN_MS);
        } else if (isGeminiRateLimitLikeDetail(e?.message)) {
          rememberGeminiKeyCooldown(key, GEMINI_KEY_RATE_LIMIT_COOLDOWN_MS);
          earliestCooldownMs = Math.min(earliestCooldownMs, GEMINI_KEY_RATE_LIMIT_COOLDOWN_MS);
        }
      }
      if (
        !lastError?.message?.startsWith('rate_limit') &&
        !lastError?.message?.startsWith('timeout:')
      ) {
        await sleep(Math.min(250 * (round + 1), 750));
      }
    }
    }
    if (round >= maxRounds - 1) break;

    if (attemptedThisRound === 0) {
      lastError = lastError || new Error('rate_limit:cooldown');
    }

    const shouldWait =
      attemptedThisRound === 0 ||
      lastError?.message?.startsWith('rate_limit:') ||
      lastError?.message?.startsWith('timeout:');

    if (!shouldWait) continue;

    const baseBackoffMs = Math.min(700 * (round + 1), 1800);
    const cooldownWaitMs = Number.isFinite(earliestCooldownMs)
      ? Math.min(Math.max(earliestCooldownMs, 0), 2500)
      : 0;
    const waitMs = Math.max(baseBackoffMs, cooldownWaitMs);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
  }
  throw lastError || new Error('Tất cả API Key đều thất bại');
};

// Gọi Gemini và trả về JSON đã parse (dùng cho structured output)
// options.timeoutMs: timeout tùy chọn
export const callGeminiAPI = async (payload, keysInput, options = {}) => {
  const rawText = await callGeminiAPIText(payload, keysInput, options);
  if (!rawText) return null;
  const cleaned = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error('AI trả về không phải JSON hợp lệ. Thử lại với đoạn văn ngắn hơn.');
  }
};

export const analyzeTextWithAI = async (text, fieldsTemplate, key, mode = 'standard') => {
  const isQuick = mode === 'quick';
  const { text: t } = truncateForAI(text, isQuick ? 7000 : AI_MAX_INPUT_CHARS);
  const properties = {
    name: { type: "STRING", description: "Tên/Danh xưng (nếu là tạo mới thực thể)" },
    avatar: { type: "STRING", description: "URL ảnh đại diện (nếu có)" },
  };
  if (!isQuick) {
    properties.processedText = {
      type: "STRING",
      description: "Giữ nguyên ý nghĩa văn bản gốc, nhưng TỰ ĐỘNG BỌC TẤT CẢ các danh từ riêng vào [[...]] để tạo Link; giữ đúng hoa/thường của tên riêng, không suy diễn từ cụm chữ thường sang tên riêng viết hoa."
    };
  }
  const fields = isQuick ? fieldsTemplate.slice(0, 8) : fieldsTemplate;
  fields.forEach(f => { properties[f.id] = { type: "STRING", description: f.label }; });

  const payload = {
    contents: [{ parts: [{ text: t }] }],
    systemInstruction: {
      parts: [{
        text: isQuick
          ? "Trích xuất nhanh thông tin cốt lõi, ưu tiên chính xác tên và các trường quan trọng. Trả về JSON ngắn gọn."
          : "Trích xuất thông tin chính xác. Trả về JSON. Đặc biệt chú trọng việc tạo Link [[...]] trong processedText, và phải giữ phân biệt hoa/thường của tên riêng."
      }]
    },
    generationConfig: { responseMimeType: "application/json", responseSchema: { type: "OBJECT", properties } }
  };
  return callGeminiAPI(payload, key);
};

const WIKI_LINK_SPOTS_SCHEMA = {
  type: 'OBJECT',
  properties: {
    linkSpots: {
      type: 'ARRAY',
      description:
        'Danh sách vị trí cần bọc [[...]]. Mỗi mục phải sao chép nguyên văn từ bài gửi lên.',
      items: {
        type: 'OBJECT',
        properties: {
          before: {
            type: 'STRING',
            description: '10–80 ký tự (hoặc ít hơn nếu sát đầu dòng) ngay TRƯỚC target — copy y hệt từ văn bản.',
          },
          target: {
            type: 'STRING',
            description: 'Cụm chữ cần bọc [[...]] — copy y hệt (không sửa hoa thường, dấu, khoảng trắng).',
          },
          after: {
            type: 'STRING',
            description: '10–80 ký tự (hoặc ít hơn) ngay SAU target — copy y hệt từ văn bản.',
          },
        },
        required: ['before', 'target', 'after'],
      },
    },
  },
  required: ['linkSpots'],
};

/**
 * Gợi ý chỗ bọc wiki link — chỉ trả linkSpots (before+target+after), không trả full bài viết lại.
 * Client ghép bằng applyWikiLinkSpots để giữ nguyên định dạng gốc.
 */
export const suggestWikiLinkSpotsWithAI = async (text, keysInput, mode = 'standard') => {
  const isQuick = mode === 'quick';
  const { text: t } = truncateForAI(text, isQuick ? 7000 : AI_MAX_INPUT_CHARS);
  const payload = {
    contents: [{ parts: [{ text: t }] }],
    systemInstruction: {
      parts: [
        {
          text: `Bạn đọc văn bản và chỉ đề xuất chỗ bọc liên kết wiki dạng [[tên]].

QUY TẮC BẮT BUỘC (vi phạm là sai):
1) Không viết lại hay tóm tắt bài. Không được trả về toàn bộ văn bản đã sửa — chỉ mảng linkSpots.
2) Mỗi phần before, target, after phải là SAO CHÉP NGUYÊN VĂN từ đúng văn bản người dùng (kể cả xuống dòng, dấu câu, khoảng trắng, markdown # * \` nếu có).
3) target là cụm ngắn cần liên kết (tên riêng, địa danh, công pháp…). Không bọc cả câu dài; không bọc phần đã nằm trong [[...]].
4) before + target + after phải xuất hiện ĐÚNG MỘT LẦN liên tiếp trong văn bản (chuỗi con khớp tuyệt đối). Chọn before/after đủ dài để vị trí không nhầm (thường 15–60 ký tự mỗi phía nếu có).
5) Nếu không chắc vị trí hoặc không có tên mới cần link, trả linkSpots rỗng [].
6) Với cụm có thể vừa là danh từ thường vừa là tên riêng, chỉ bọc link khi target giữ đúng kiểu viết hoa của tên riêng trong chính văn bản; không suy diễn từ dạng thường như "độ kiếp" sang tên riêng viết hoa như "Độ Kiếp".`,
        },
      ],
    },
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: WIKI_LINK_SPOTS_SCHEMA,
    },
  };
  return callGeminiAPI(payload, keysInput, { timeoutMs: 45000 });
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

/** Icons hợp lệ cho tab (getIconComponent hỗ trợ). */
const VALID_TAB_ICONS = ['BookOpen', 'Flame', 'User', 'Hexagon', 'Swords', 'Map', 'Globe', 'ScrollText'];

/** Kiểm tra và chuẩn hóa tabsConfig từ AI. */
const sanitizeTabsConfig = (raw) => {
  if (!Array.isArray(raw) || raw.length < 2) return null;
  const out = [];
  for (const tab of raw) {
    if (!tab || typeof tab.id !== 'string' || typeof tab.label !== 'string') continue;
    const icon = VALID_TAB_ICONS.includes(tab.iconName) ? tab.iconName : 'ScrollText';
    const subTabs = Array.isArray(tab.subTabs) ? tab.subTabs : [];
    const sanitizedSub = [];
    for (const st of subTabs) {
      if (!st || typeof st.id !== 'string' || typeof st.label !== 'string') continue;
      if (st.viewType === 'collection-track') {
        const ft = Array.isArray(st.fieldsTemplate) ? st.fieldsTemplate : [];
        const fields = ft.map(f => (f && f.id && f.label) ? { id: String(f.id).replace(/[^a-zA-Z0-9_-]/g, '_'), label: String(f.label) } : null).filter(Boolean);
        if (fields.length < 2) fields.push({ id: 'f_title', label: 'Tên / Danh xưng' }, { id: 'f_desc', label: 'Mô tả' });
        sanitizedSub.push({ id: st.id, label: st.label, viewType: 'collection-track', tabCon: [], fieldsTemplate: fields });
      } else if (Array.isArray(st.tabCon) && st.tabCon.length > 0) {
        sanitizedSub.push({ id: st.id, label: st.label, tabCon: st.tabCon.filter(t => t && t.id && t.label).map(t => ({ id: t.id, label: t.label })) });
      } else {
        sanitizedSub.push({ id: st.id, label: st.label, viewType: 'collection-track', tabCon: [], fieldsTemplate: [{ id: 'f_title', label: 'Tên' }, { id: 'f_desc', label: 'Mô tả' }] });
      }
    }
    out.push({
      id: tab.id,
      label: tab.label,
      iconName: icon,
      subTabs: sanitizedSub,
      isFixed: tab.id === 'tong-quan' ? true : (tab.isFixed === true)
    });
  }
  const hasTongQuan = out.some(t => t.id === 'tong-quan');
  if (!hasTongQuan) out.unshift({ id: 'tong-quan', label: 'Tổng Quan', iconName: 'BookOpen', subTabs: [], isFixed: true });
  return out;
};

/**
 * AI sinh cấu trúc mục lục (tabsConfig) phù hợp với thể loại truyện.
 * @param {string[]} genres - Mảng thể loại (vd: ['Tiên Hiệp', 'Hệ Thống'])
 * @param {string[]} keysInput - API keys Gemini
 * @returns {Promise<Array>} tabsConfig đã chuẩn hóa
 */
export const generateTabsConfigByGenres = async (genres, keysInput) => {
  const g = Array.isArray(genres) ? genres : [genres];
  const genreStr = g.length > 0 ? g.join(', ') : 'Tiên Hiệp';

  const schema = {
    type: 'OBJECT',
    properties: {
      tabs: {
        type: 'ARRAY',
        description: 'Danh sách tab chính (mục lớn)',
        items: {
          type: 'OBJECT',
          properties: {
            id: { type: 'STRING', description: 'Id tab, dạng kebab-case (vd: nhan-vat, the-luc)' },
            label: { type: 'STRING', description: 'Tên hiển thị' },
            iconName: { type: 'STRING', description: 'Một trong: BookOpen, Flame, User, Hexagon, Swords, Map, Globe, ScrollText' },
            subTabs: {
              type: 'ARRAY',
              description: 'Các tab con',
              items: {
                type: 'OBJECT',
                properties: {
                  id: { type: 'STRING', description: 'Id tab con, kebab-case' },
                  label: { type: 'STRING', description: 'Tên hiển thị' },
                  viewType: { type: 'STRING', description: 'collection-track cho danh sách thẻ' },
                  fieldsTemplate: {
                    type: 'ARRAY',
                    description: 'Các trường thuộc tính cho thẻ',
                    items: {
                      type: 'OBJECT',
                      properties: { id: { type: 'STRING' }, label: { type: 'STRING' } },
                      required: ['id', 'label']
                    }
                  }
                },
                required: ['id', 'label']
              }
            }
          },
          required: ['id', 'label']
        }
      }
    },
    required: ['tabs']
  };

  const prompt = [
    `Thể loại truyện: ${genreStr}.`,
    'Sinh cấu trúc mục lục (tabs) phù hợp để người đọc ghi chép nhân vật, thế lực, pháp bảo, địa danh, v.v.',
    'Luôn có tab đầu tiên "Tổng Quan" (id: tong-quan, iconName: BookOpen, subTabs: []).',
    'Các tab khác phải có subTabs với viewType: "collection-track" và fieldsTemplate (các trường như f_status, f_title, f_desc,...).',
    'Phù hợp với thể loại: Tiên Hiệp có Tu Luyện/Cảnh Giới; Ngôn Tình có Nhân Vật/Quan Hệ; Đô Thị có Công Ty/Nhân Vật; Võng Du có Kỹ năng/Trang bị; v.v.'
  ].join('\n');

  const payload = {
    contents: [{ parts: [{ text: prompt }] }],
    systemInstruction: { parts: [{ text: 'Bạn sinh JSON cấu trúc mục lục. Chỉ trả về JSON, không chú thích. Id dùng kebab-case. fieldsTemplate mỗi subTab có 3-6 trường.' }] },
    generationConfig: { responseMimeType: 'application/json', responseSchema: schema }
  };

  const out = await callGeminiAPI(payload, keysInput, { timeoutMs: 45000 });
  const arr = Array.isArray(out?.tabs) ? out.tabs : (Array.isArray(out) ? out : null);
  const sanitized = sanitizeTabsConfig(arr);
  if (!sanitized) throw new Error('AI trả về cấu trúc không hợp lệ');
  return sanitized;
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
          fieldId: { type: 'STRING', description: 'Ưu tiên: id trường từ danh mục (vd. f_status)' },
          fieldLabel: { type: 'STRING', description: 'Nếu không có fieldId thì nhãn trường khớp danh mục' },
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
    'Đề xuất tối đa 10 hành động. new_entity: thẻ chưa có. milestone: sự kiện timeline cho thẻ ĐÃ CÓ (entityHint khớp tên). update_profile: đổi hồ sơ thẻ có sẵn — fieldPatches: ưu tiên fieldId đúng id trong danh mục; không có id thì fieldLabel khớp nhãn.',
    'tabLonId/tabNhoId chỉ từ danh mục. Ưu tiên gợi ý cụ thể, tránh trùng lặp vô ích.',
    '',
    'QUAN TRỌNG: Mọi chuỗi (draftRawText, eventText, profileNote, fieldPatches.value) chỉ là văn bản thường. TUYỆT ĐỐI KHÔNG dùng cú pháp [[...]] (wiki link). Không điền URL ảnh hay hướng dẫn gắn ảnh — người dùng sẽ vào thẻ để làm link/ảnh.'
  ].join('\n');

  const payload = {
    contents: [{ parts: [{ text: userText }] }],
    systemInstruction: {
      parts: [{
        text: 'Trả về JSON đúng schema. Tiếng Việt. Ngắn gọn. fieldPatches: ưu tiên fieldId từ danh mục. Không bao giờ dùng [[...]] trong bất kỳ trường chuỗi nào; không URL ảnh trong fieldPatches.'
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
const localImageLookupCache = new WeakMap();

const getLocalImageLookupMap = (handle) => {
  if (!handle || typeof handle !== 'object') return null;
  let byName = localImageLookupCache.get(handle);
  if (!byName) {
    byName = new Map();
    localImageLookupCache.set(handle, byName);
  }
  return byName;
};

async function resolveImageFileHandle(dirHandle, filename) {
  if (!dirHandle || dirHandle === 'LOCAL_STORAGE') return null;
  const key = safeString(filename).trim();
  if (!key) return null;

  const lookupMap = getLocalImageLookupMap(dirHandle);
  if (lookupMap && lookupMap.has(key)) {
    const cached = lookupMap.get(key);
    return cached || null;
  }

  const cacheResolved = (handle) => {
    if (lookupMap) lookupMap.set(key, handle || false);
    return handle || null;
  };

  try {
    const imagesDir = await dirHandle.getDirectoryHandle('images');
    const fileHandle = await imagesDir.getFileHandle(key);
    return cacheResolved(fileHandle);
  } catch {
    // fallback below
  }

  if (typeof dirHandle.entries !== 'function') {
    return cacheResolved(null);
  }

  try {
    for await (const [, childHandle] of dirHandle.entries()) {
      if (!childHandle || childHandle.kind !== 'directory') continue;
      try {
        const childImagesDir = await childHandle.getDirectoryHandle('images');
        const fileHandle = await childImagesDir.getFileHandle(key);
        return cacheResolved(fileHandle);
      } catch {
        // no image in this child dir
      }
    }
  } catch {
    // ignore scan errors and mark as not found
  }

  return cacheResolved(null);
}

export const AsyncLocalImage = memo(({ filename, alt, dirHandle, className, style }) => {
  const [src, setSrc] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let isMounted = true;
    const queueState = (fn) => {
      Promise.resolve().then(() => {
        if (isMounted) fn();
      });
    };
    if (dirHandle && dirHandle !== 'LOCAL_STORAGE') {
      let byName = localImageUrlCache.get(dirHandle);
      if (!byName) {
        byName = new Map();
        localImageUrlCache.set(dirHandle, byName);
      }
      const cached = byName.get(filename);
      if (cached) {
        queueState(() => {
          setSrc(cached);
          setErr(false);
        });
        return;
      }
      const fetchImage = async () => {
        try {
          const fileH = await resolveImageFileHandle(dirHandle, filename);
          if (!fileH) throw new Error('File not found');
          const file = await fileH.getFile();
          objectUrl = URL.createObjectURL(file);
          byName.set(filename, objectUrl);
          if (isMounted) { setSrc(objectUrl); setErr(false); }
        } catch { if (isMounted) setErr(true); }
      };
      fetchImage();
    } else {
      queueState(() => setErr(true));
    }
    return () => { isMounted = false; };
  }, [filename, dirHandle]);

  const imgClass = className || "max-w-full rounded-xl my-4 shadow-lg border border-slate-700 object-cover";
  if (err) return <img src={FALLBACK_IMG} alt="Lỗi truy xuất ảnh" className={imgClass} style={style} />;
  if (!src) return <div className={`p-4 bg-slate-900 animate-pulse flex items-center justify-center text-slate-500 text-sm shadow-inner ${imgClass}`}>Đang tải...</div>;
  return <img src={src} alt={alt} className={imgClass} style={style} onError={(e) => { e.target.onerror = null; e.target.src = FALLBACK_IMG; }} />;
});

const WIKI_CHIP_SHELL =
  'transition-colors cursor-pointer inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md';

/** Chip wiki trong preview ghi chép — chữ + icon in đậm, màu riêng (xanh cùng thẻ / tím khác thẻ). */
function getEntityNotesWikiLinkChip(isSelfLink, pending = false) {
  if (pending) {
    return {
      className: `${WIKI_CHIP_SHELL} bg-violet-950/40 hover:bg-violet-900/55 border border-dashed border-violet-500/45`,
      textClass: 'font-bold text-violet-300',
      iconClass: 'text-violet-400',
      'data-entity-wiki-link': 'pending',
      title: 'Chưa có hồ sơ — nhấp để tạo thẻ mới',
    };
  }
  if (isSelfLink) {
    return {
      className: `${WIKI_CHIP_SHELL} bg-emerald-950/65 hover:bg-emerald-900/75 border-2 border-emerald-400/65 shadow-[inset_0_0_0_1px_rgba(52,211,153,0.12)]`,
      textClass: 'font-bold text-emerald-300',
      iconClass: 'text-emerald-400',
      'data-entity-wiki-link': 'self',
      title: 'Liên kết trỏ lại chính thẻ đang xem (xanh lục)',
    };
  }
  return {
    className: `${WIKI_CHIP_SHELL} bg-violet-800/45 hover:bg-violet-700/60 border-2 border-violet-400/70 shadow-[inset_0_0_0_1px_rgba(167,139,250,0.15)]`,
    textClass: 'font-bold text-violet-300',
    iconClass: 'text-violet-400',
    'data-entity-wiki-link': 'external',
    title: 'Mở thẻ / tab khác (tím)',
  };
}

const getWikiLinkClassName = (isSelfLink, variant = 'inline') => {
  if (variant === 'entityNotes') {
    return getEntityNotesWikiLinkChip(isSelfLink).className;
  }
  const colorClasses = isSelfLink
    ? 'text-cyan-300 bg-cyan-900/25 hover:bg-cyan-600 hover:text-white hover:shadow-[0_0_15px_rgba(34,211,238,0.6)]'
    : 'text-amber-400 bg-amber-900/20 hover:bg-amber-600 hover:text-white hover:shadow-[0_0_15px_rgba(217,119,6,0.6)]';
  const sizeClasses = variant === 'plain'
    ? 'gap-0.5 px-1 rounded'
    : 'gap-1 px-1.5 py-0.5 rounded-md';
  return `transition-all font-bold cursor-pointer inline-flex items-center ${sizeClasses} ${colorClasses}`;
};

const resolveWikiTargetEntityId = (match) =>
  safeString(match?.dest?.entityId || match?.entityId).trim() || null;

export const processPlainTextWithLinks = (text, lookup, linkRegex, onNavigate, selfEntityId = null) => {
    if (!text || !lookup || lookup.totalItems === 0 || !linkRegex) return text;
    const usingRegex = linkRegex instanceof RegExp;
    const parts = usingRegex ? text.split(linkRegex) : splitTextByWikiMatcher(text, linkRegex);
    if (parts.length === 1) return text;

    return parts.map((part, i) => {
        const rawText = usingRegex ? part : part.text;
        const isMatch = usingRegex ? (i % 2 !== 0) : part.isMatch;
        if (!isMatch) return rawText;
        const match = resolveEntityLookup(lookup, rawText, { selfEntityId });
        if (match) {
            const isSelfLink = !!selfEntityId && match.dest?.entityId === selfEntityId;
            return (
               <span key={i} onClick={(e) => { e.stopPropagation(); onNavigate(match.dest); }} className={getWikiLinkClassName(isSelfLink, 'plain')}>
                  <Link2 size={12}/>{rawText}
               </span>
            );
        }
        return rawText;
    });
};

const INLINE_COLOR_RE = /^\[color=(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\]([\s\S]*?)\[\/color\]$/;
/** Thứ tự: màu → wiki [[…]] (trước in đậm/italic) → các mark khác. */
const INLINE_MARK_SPLIT =
  /(\[color=(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\][\s\S]*?\[\/color\]|\[\[.*?\]\]|\*\*[\s\S]*?\*\*|`[^`\n]+`|~~[\s\S]*?~~|==[\s\S]*?==|<u>[\s\S]*?<\/u>|\*[^*\n]+?\*|!\[.*?\]\(.*?\))/g;

const sanitizeInlineColor = (rawColor) => {
  const value = safeString(rawColor).trim();
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  if (/^[a-zA-Z]+$/.test(value)) return value;
  return null;
};

/** Giá trị sau «: » (địa chỉ / meta bản đồ); nội dung trong () — wiki [[…]] giữ style chip. */
const GEO_COLON_VALUE_CLASS = 'font-semibold text-sky-200/95';
const GEO_PAREN_INLINE_CLASS = 'font-semibold text-violet-200/90';
/** Ký tự vùng Private Use — không trùng văn bản thường; bọc id để tách ngoặc trước khi INLINE_MARK_SPLIT. */
const WIKI_PH_START = '\uE140';
const WIKI_PH_END = '\uE141';
/** Giữ nguyên khối [color=…]…[/color] khi addressMeta tách ngoặc — tránh vỡ thẻ khi giá trị có (…). */
const COLOR_PH_START = '\uE142';
const COLOR_PH_END = '\uE143';

/** Thay [[wiki]] bằng placeholder để tách ngoặc / sau dấu : không bị vỡ bởi INLINE_MARK_SPLIT. */
function protectInlineWikiMarkers(raw, store) {
  return safeString(raw).replace(/\[\[[\s\S]*?\]\]/g, (m) => {
    const id = store.length;
    store.push(m);
    return `${WIKI_PH_START}${id}${WIKI_PH_END}`;
  });
}

function unprotectInlineWikiMarkers(text, store) {
  return safeString(text).replace(new RegExp(`${WIKI_PH_START}(\\d+)${WIKI_PH_END}`, 'g'), (_, id) => store[Number(id)] ?? '');
}

function protectInlineColorMarkers(raw, colorStore) {
  return safeString(raw).replace(
    /\[color=(#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\]([\s\S]*?)\[\/color\]/gi,
    (full) => {
      const id = colorStore.length;
      colorStore.push(full);
      return `${COLOR_PH_START}${id}${COLOR_PH_END}`;
    },
  );
}

function unprotectInlineColorMarkers(text, colorStore) {
  return safeString(text).replace(new RegExp(`${COLOR_PH_START}(\\d+)${COLOR_PH_END}`, 'g'), (_, id) => {
    return colorStore[Number(id)] ?? '';
  });
}

/** Mở color trước wiki: nội dung trong color có thể chứa placeholder wiki. */
function unprotectAddressMetaInlinePlaceholders(text, wikiStore, colorStore) {
  let s = safeString(text);
  s = unprotectInlineColorMarkers(s, colorStore);
  s = unprotectInlineWikiMarkers(s, wikiStore);
  return s;
}

function splitOuterParensPreservingWiki(text) {
  const s = safeString(text);
  if (!s) return [{ type: 'text', text: '' }];
  const out = [];
  let i = 0;
  while (i < s.length) {
    if (s[i] === WIKI_PH_START) {
      const end = s.indexOf(WIKI_PH_END, i + 1);
      if (end === -1) {
        out.push({ type: 'text', text: s.slice(i) });
        break;
      }
      out.push({ type: 'text', text: s.slice(i, end + 1) });
      i = end + 1;
      continue;
    }
    if (s[i] === COLOR_PH_START) {
      const end = s.indexOf(COLOR_PH_END, i + 1);
      if (end === -1) {
        out.push({ type: 'text', text: s.slice(i) });
        break;
      }
      out.push({ type: 'text', text: s.slice(i, end + 1) });
      i = end + 1;
      continue;
    }
    if (s.startsWith('[[', i)) {
      const end = s.indexOf(']]', i + 2);
      if (end === -1) {
        out.push({ type: 'text', text: s.slice(i) });
        break;
      }
      out.push({ type: 'text', text: s.slice(i, end + 2) });
      i = end + 2;
      continue;
    }
    if (s[i] === '(') {
      let depth = 1;
      let j = i + 1;
      while (j < s.length && depth > 0) {
        if (s[j] === WIKI_PH_START) {
          const endPh = s.indexOf(WIKI_PH_END, j + 1);
          if (endPh === -1) {
            j = s.length;
            break;
          }
          j = endPh + 1;
          continue;
        }
        if (s[j] === COLOR_PH_START) {
          const endC = s.indexOf(COLOR_PH_END, j + 1);
          if (endC === -1) {
            j = s.length;
            break;
          }
          j = endC + 1;
          continue;
        }
        if (s.startsWith('[[', j)) {
          const endw = s.indexOf(']]', j + 2);
          if (endw === -1) {
            j = s.length;
            break;
          }
          j = endw + 2;
          continue;
        }
        if (s[j] === '(') depth += 1;
        else if (s[j] === ')') depth -= 1;
        j += 1;
      }
      if (depth === 0) {
        out.push({ type: 'paren', inner: s.slice(i + 1, j - 1) });
        i = j;
      } else {
        out.push({ type: 'text', text: s.slice(i) });
        break;
      }
      continue;
    }
    let j = i;
    while (
      j < s.length &&
      s[j] !== '(' &&
      !s.startsWith('[[', j) &&
      s[j] !== WIKI_PH_START &&
      s[j] !== COLOR_PH_START
    )
      j += 1;
    if (j > i) out.push({ type: 'text', text: s.slice(i, j) });
    i = j;
  }
  if (out.length === 0) out.push({ type: 'text', text: s });
  return out;
}

function renderParenAwareAddressFragments(text, ctx) {
  const { wikiStore, colorStore } = ctx;
  const segs = splitOuterParensPreservingWiki(text);
  const baseOpts = { ...ctx.inlineOptions, addressMeta: false };
  const pi = (t) =>
    processInline(
      unprotectAddressMetaInlinePlaceholders(t, wikiStore, colorStore),
      ctx.dirHandle,
      ctx.lookup,
      ctx.linkRegex,
      ctx.onNavigate,
      ctx.selfEntityId,
      baseOpts,
    );
  return segs.map((seg, idx) => {
    if (seg.type === 'paren') {
      return (
        <span key={`geo-paren-${idx}`} className={GEO_PAREN_INLINE_CLASS}>
          ({pi(seg.inner)})
        </span>
      );
    }
    return (
      <span key={`geo-txt-${idx}`} className="min-w-0">
        {pi(seg.text)}
      </span>
    );
  });
}

/** Chạy trước INLINE_MARK_SPLIT để () chứa [[wiki]] không bị tách mất ngoặc. */
function renderAddressMetaPlainSegmentFromProtected(
  prot,
  wikiStore,
  colorStore,
  dirHandle,
  lookup,
  linkRegex,
  onNavigate,
  selfEntityId,
  inlineOptions,
) {
  const ctx = { dirHandle, lookup, linkRegex, onNavigate, selfEntityId, inlineOptions, wikiStore, colorStore };
  const colonIdx = prot.indexOf(': ');
  const baseOpts = { ...inlineOptions, addressMeta: false };
  const pi = (t) =>
    processInline(
      unprotectAddressMetaInlinePlaceholders(t, wikiStore, colorStore),
      dirHandle,
      lookup,
      linkRegex,
      onNavigate,
      selfEntityId,
      baseOpts,
    );

  if (colonIdx !== -1) {
    const head = prot.slice(0, colonIdx + 1);
    const tail = prot.slice(colonIdx + 2);
    return (
      <>
        {pi(head)}
        {' '}
        <span className={GEO_COLON_VALUE_CLASS}>{renderParenAwareAddressFragments(tail, ctx)}</span>
      </>
    );
  }
  return renderParenAwareAddressFragments(prot, ctx);
}

export const processInline = (
  text,
  dirHandle,
  entityLookup,
  linkRegex,
  onNavigate,
  selfEntityId = null,
  inlineOptions = {},
) => {
  if (!text) return null;
  const { addressMeta = false } = inlineOptions || {};

  if (addressMeta) {
    const wikiStore = [];
    const colorStore = [];
    let prot = protectInlineWikiMarkers(safeString(text), wikiStore);
    prot = protectInlineColorMarkers(prot, colorStore);
    const hasColonValue = prot.includes(': ');
    const hasParenPair = prot.includes('(') && prot.includes(')');
    if (hasColonValue || hasParenPair) {
      const lookupEarly = entityLookup?.__isEntityLookup ? entityLookup : buildEntityNameLookup(entityLookup);
      return renderAddressMetaPlainSegmentFromProtected(
        prot,
        wikiStore,
        colorStore,
        dirHandle,
        lookupEarly,
        linkRegex,
        onNavigate,
        selfEntityId,
        inlineOptions,
      );
    }
  }

  const lookup = entityLookup?.__isEntityLookup ? entityLookup : buildEntityNameLookup(entityLookup);
  const parts = text.split(INLINE_MARK_SPLIT);

  return parts.map((part, i) => {
    if (i % 2 !== 0) {
      if (part.startsWith('![') && part.endsWith(')')) {
        const match = part.match(/^!\[(.*?)\]\((.*?)\)$/);
        if (match) {
          const alt = safeString(match[1]);
          const url = safeString(match[2]);
          if (url.startsWith('local_image:')) {
            return (
              <AsyncLocalImage key={i} filename={url.replace('local_image:', '')} alt={alt} dirHandle={dirHandle} />
            );
          }
          return (
            <img
              key={i}
              src={url}
              alt={alt}
              className="max-w-full rounded-xl my-4 shadow-lg border border-slate-700"
            />
          );
        }
      }
      if (part.startsWith('[[') && part.endsWith(']]')) {
        const innerText = safeString(part.slice(2, -2)).trim();
        const match = resolveEntityLookup(lookup, innerText, { selfEntityId });
        if (match) {
          const targetId = resolveWikiTargetEntityId(match);
          const isSelfLink = !!selfEntityId && targetId === selfEntityId;
          const notesPreview = !!inlineOptions?.entityNotesPreview;
          const chip = notesPreview
            ? getEntityNotesWikiLinkChip(isSelfLink)
            : {
                className: getWikiLinkClassName(isSelfLink, 'inline'),
                title: `Mở hồ sơ: ${innerText}`,
              };
          const textClass = chip.textClass || '';
          const iconClass = chip.iconClass || textClass;
          return (
            <span
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                onNavigate(match.dest);
              }}
              className={chip.className}
              data-entity-wiki-link={chip['data-entity-wiki-link']}
              title={chip.title || `Mở hồ sơ: ${innerText}`}
            >
              <Link2 size={12} className={`shrink-0 ${iconClass}`} />
              <span className={textClass || 'font-bold'}>{innerText}</span>
            </span>
          );
        }
        const pendingChip = inlineOptions?.entityNotesPreview
          ? getEntityNotesWikiLinkChip(false, true)
          : {
              className:
                'text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded-md hover:text-emerald-400 hover:bg-emerald-900/30 border border-dashed border-slate-600 hover:border-emerald-500/50 transition-all cursor-pointer inline-flex items-center gap-1',
              title: 'Thực thể chưa có hồ sơ. Nhấp để ngưng tụ (tạo mới)!',
            };
        const pendingTextClass = pendingChip.textClass || 'font-bold text-violet-300';
        const pendingIconClass = pendingChip.iconClass || pendingTextClass;
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onNavigate({ type: 'QUICK_CREATE', name: innerText });
            }}
            className={pendingChip.className}
            data-entity-wiki-link={pendingChip['data-entity-wiki-link']}
            title={pendingChip.title}
          >
            <Plus size={12} className={`shrink-0 ${pendingIconClass}`} />
            <span className={pendingTextClass}>{innerText}</span>
          </span>
        );
      }
      const colorMatch = part.match(INLINE_COLOR_RE);
      if (colorMatch) {
        const colorValue = sanitizeInlineColor(colorMatch[1]) || '#c084fc';
        return (
          <span key={i} style={{ color: colorValue }}>
            {processInline(colorMatch[2], dirHandle, lookup, linkRegex, onNavigate, selfEntityId, {
              ...inlineOptions,
              addressMeta: false,
            })}
          </span>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={i} className="font-black tracking-[0.01em] text-inherit">
            {processInline(safeString(part.slice(2, -2)), dirHandle, lookup, linkRegex, onNavigate, selfEntityId, {
              ...inlineOptions,
              addressMeta: false,
            })}
          </strong>
        );
      }
      if (part.startsWith('~~') && part.endsWith('~~')) {
        return (
          <del key={i} className="text-slate-400 line-through">
            {processInline(safeString(part.slice(2, -2)), dirHandle, lookup, linkRegex, onNavigate, selfEntityId, {
              ...inlineOptions,
              addressMeta: false,
            })}
          </del>
        );
      }
      if (part.startsWith('==') && part.endsWith('==')) {
        return (
          <mark key={i} className="bg-amber-500/35 text-amber-100 px-0.5 rounded">
            {processInline(safeString(part.slice(2, -2)), dirHandle, lookup, linkRegex, onNavigate, selfEntityId, {
              ...inlineOptions,
              addressMeta: false,
            })}
          </mark>
        );
      }
      if (part.startsWith('<u>') && part.endsWith('</u>')) {
        return (
          <u key={i} className="underline decoration-slate-300/75 underline-offset-[0.18em]">
            {processInline(safeString(part.slice(3, -4)), dirHandle, lookup, linkRegex, onNavigate, selfEntityId, {
              ...inlineOptions,
              addressMeta: false,
            })}
          </u>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length >= 2) {
        return (
          <code key={i} className="text-emerald-300/90 bg-slate-800 px-1 rounded text-[0.9em] font-mono">
            {safeString(part.slice(1, -1))}
          </code>
        );
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return (
          <em key={i} className="italic text-slate-200/85">
            {processInline(safeString(part.slice(1, -1)), dirHandle, lookup, linkRegex, onNavigate, selfEntityId, {
              ...inlineOptions,
              addressMeta: false,
            })}
          </em>
        );
      }
    }
    return <span key={i}>{processPlainTextWithLinks(safeString(part), lookup, linkRegex, onNavigate, selfEntityId)}</span>;
  });
};

export const renderMarkdown = (text, dirHandle, entityMap, linkRegex, onNavigate, selfEntityId = null) => {
  if (!text || typeof text !== 'string') return <div className="text-slate-600 italic mt-10 font-serif flex flex-col items-center gap-4"><ScrollText size={48} className="opacity-30"/><span>Chưa có ghi chép nào...</span></div>;
  const lookup = buildEntityNameLookup(entityMap);
  const lines = text.split('\n');
  return lines.map((line, i) => {
    if (line.startsWith('# ')) return <h1 key={`h1-${i}`} className="text-3xl font-heading font-bold text-slate-100 mb-4 border-b border-slate-700 pb-2 mt-6">{processInline(line.slice(2), dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}</h1>;
    if (line.startsWith('## ')) return <h2 key={`h2-${i}`} className="text-2xl font-heading font-bold text-cyan-200 mb-3 mt-4">{processInline(line.slice(3), dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}</h2>;
    if (line.startsWith('- '))
      return (
        <li key={`li-${i}`} className="ml-6 list-disc mb-2 text-slate-300 font-serif">
          {processInline(line.slice(2), dirHandle, lookup, linkRegex, onNavigate, selfEntityId, { addressMeta: true })}
        </li>
      );
    if (/^\d+\.\s/.test(line)) {
      const m = line.match(/^(\d+)\.\s(.*)$/);
      const orderNo = m?.[1] || '';
      const body = m?.[2] || line.replace(/^\d+\.\s/, '');
      return (
        <p key={`oli-${i}`} className="mb-2 text-slate-300 font-serif leading-relaxed text-lg">
          <span className="inline-block min-w-7 text-slate-500">{orderNo}.</span>{' '}
          {processInline(body, dirHandle, lookup, linkRegex, onNavigate, selfEntityId, { addressMeta: true })}
        </p>
      );
    }
    if (line.startsWith('> ')) {
      return (
        <blockquote
          key={`bq-${i}`}
          className="border-l-4 border-amber-700/50 pl-4 my-2 text-slate-400 italic font-serif"
        >
          {processInline(line.slice(2), dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}
        </blockquote>
      );
    }
    if (line.trim() === '') return <div key={`empty-${i}`} className="h-4"></div>;
    return <p key={`p-${i}`} className="mb-3 text-slate-300 font-serif leading-relaxed text-lg">{processInline(line, dirHandle, lookup, linkRegex, onNavigate, selfEntityId)}</p>;
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

const resolveSmartWrapTarget = (text, selStart, selEnd, marker) => {
  if (selStart < selEnd) {
    const inner = text.slice(selStart, selEnd);
    const newText = text.slice(0, selStart) + marker + inner + marker + text.slice(selEnd);
    return { newText, selStart: selStart + marker.length, selEnd: selStart + marker.length + inner.length };
  }

  const pos = selStart;
  const lineStart = text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  let l = lineStart;
  let r = pos;
  while (r > l && /\s/.test(text[r - 1])) r--;
  while (l < r && /\s/.test(text[l])) l++;
  if (r <= l) {
    const newText = text.slice(0, pos) + marker + marker + text.slice(pos);
    const caret = pos + marker.length;
    return { newText, selStart: caret, selEnd: caret };
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
  const newText = text.slice(0, wrapL) + marker + inner + marker + text.slice(wrapR);
  const caret = wrapL + marker.length + inner.length + marker.length;
  return { newText, selStart: caret, selEnd: caret };
};

const resolveNextOrderedPrefix = (text, lineStart) => {
  const beforeText = text.slice(0, lineStart);
  const normalizedBefore = beforeText.endsWith('\n') ? beforeText.slice(0, -1) : beforeText;
  if (!normalizedBefore) return '1. ';
  const prevLineStart = normalizedBefore.lastIndexOf('\n') + 1;
  const prevLine = normalizedBefore.slice(prevLineStart);
  const match = prevLine.trimStart().match(/^(\d+)\.\s+/);
  if (!match) return '1. ';
  return `${Number(match[1]) + 1}. `;
};

const ENTITY_NOTES_BULLET_LINE_RE = /^(\s*)([-*]\s)(.*)$/;
const ENTITY_NOTES_ORDERED_LINE_RE = /^(\s*)(\d+\.\s)(.*)$/;
const ENTITY_NOTES_QUOTE_LINE_RE = /^(\s*)(>\s)(.*)$/;
const ENTITY_NOTES_LIST_LINE_RE = /^(\s*)([-*]|\d+\.)\s+(.*)$/;

const getLineSliceBounds = (text, pos) => {
  const lineStart = text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  const lineEndIdx = text.indexOf('\n', pos);
  const lineEnd = lineEndIdx === -1 ? text.length : lineEndIdx;
  return {
    lineStart,
    lineEnd,
    line: text.slice(lineStart, lineEnd),
  };
};

const hasWrappedSelection = (text, selStart, selEnd, leftMarker, rightMarker = leftMarker) => {
  const left = safeString(leftMarker);
  const right = safeString(rightMarker);
  if (!left || !right) return false;
  const picked = text.slice(selStart, selEnd);
  if (picked.startsWith(left) && picked.endsWith(right) && picked.length >= left.length + right.length) return true;
  return (
    text.slice(Math.max(0, selStart - left.length), selStart) === left &&
    text.slice(selEnd, selEnd + right.length) === right
  );
};

const hasCaretInsideWrappedRegion = (text, caretPos, leftMarker, rightMarker = leftMarker) => {
  const { lineStart, lineEnd } = getLineSliceBounds(text, caretPos);
  const lineText = text.slice(lineStart, lineEnd);
  const localPos = caretPos - lineStart;
  const openIdx = lineText.lastIndexOf(leftMarker, localPos);
  if (openIdx === -1) return false;
  const closeIdx = lineText.indexOf(rightMarker, openIdx + leftMarker.length);
  if (closeIdx === -1) return false;
  return openIdx + leftMarker.length <= localPos && closeIdx >= localPos;
};

const hasUnclosedRegionAroundSelection = (text, selStart, selEnd, openMarker, closeMarker) => {
  const before = text.slice(0, selStart);
  const lastOpen = before.lastIndexOf(openMarker);
  if (lastOpen === -1) return false;
  const lastClose = before.lastIndexOf(closeMarker);
  if (lastClose > lastOpen) return false;
  const nextClose = text.indexOf(closeMarker, selEnd);
  return nextClose !== -1;
};

export const getEntityNotesToolbarState = (text, selStart = 0, selEnd = selStart) => {
  const source = safeString(text);
  const start = Math.max(0, Math.min(Number(selStart) || 0, source.length));
  const end = Math.max(start, Math.min(Number(selEnd) || start, source.length));
  const { line } = getLineSliceBounds(source, start);
  const selected = start < end;
  const orderedMatch = line.match(/^(\s*)(\d+)\.\s+/);

  const hasInlineMarker = (leftMarker, rightMarker = leftMarker) =>
    selected
      ? hasWrappedSelection(source, start, end, leftMarker, rightMarker)
      : hasCaretInsideWrappedRegion(source, start, leftMarker, rightMarker);

  return {
    bold: hasInlineMarker('**'),
    italic: hasInlineMarker('*'),
    underline: hasInlineMarker('<u>', '</u>'),
    strikethrough: hasInlineMarker('~~'),
    code: hasInlineMarker('`'),
    highlight: hasInlineMarker('=='),
    wikiLink: selected
      ? hasWrappedSelection(source, start, end, '[[', ']]')
      : hasUnclosedRegionAroundSelection(source, start, end, '[[', ']]'),
    color: hasUnclosedRegionAroundSelection(source, start, end, '[color=', '[/color]'),
    heading1: line.trimStart().startsWith('# '),
    heading2: line.trimStart().startsWith('## '),
    heading3: line.trimStart().startsWith('### '),
    bullet: /^(\s*)[-*]\s+/.test(line),
    ordered: Boolean(orderedMatch),
    orderedNext: orderedMatch?.[2] ?? null,
    quote: /^(\s*)>\s+/.test(line),
    divider: /^(?:-{3,}|\*{3,}|_{3,})$/.test(line.trim()),
  };
};

const resolveEntityNotesPrefixMatch = (line) =>
  line.match(ENTITY_NOTES_ORDERED_LINE_RE) ||
  line.match(ENTITY_NOTES_BULLET_LINE_RE) ||
  line.match(ENTITY_NOTES_QUOTE_LINE_RE);

export const resolveEntityNotesLineBreak = (text, selStart, selEnd) => {
  if (selStart !== selEnd) return null;
  const { lineStart, lineEnd, line } = getLineSliceBounds(text, selStart);
  const match = resolveEntityNotesPrefixMatch(line);
  if (!match) return null;

  const indent = match[1] || '';
  const prefix = match[2] || '';
  const body = match[3] || '';
  const prefixEnd = lineStart + indent.length + prefix.length;

  if (selStart < prefixEnd) return null;

  if (!body.trim()) {
    const newText = text.slice(0, lineStart) + indent + text.slice(lineEnd);
    const caret = lineStart + indent.length;
    return { newText, selStart: caret, selEnd: caret };
  }

  const nextPrefix = ENTITY_NOTES_ORDERED_LINE_RE.test(line)
    ? `${indent}${Number(prefix.trim().replace(/\.$/, '')) + 1}. `
    : `${indent}${prefix}`;
  const newText = text.slice(0, selStart) + '\n' + nextPrefix + text.slice(selStart);
  const caret = selStart + 1 + nextPrefix.length;
  return { newText, selStart: caret, selEnd: caret };
};

export const resolveEntityNotesBackspace = (text, selStart, selEnd) => {
  if (selStart !== selEnd) return null;
  const { lineStart, lineEnd, line } = getLineSliceBounds(text, selStart);
  const match = resolveEntityNotesPrefixMatch(line);
  if (!match) return null;

  const indent = match[1] || '';
  const prefix = match[2] || '';
  const body = match[3] || '';
  const prefixEnd = lineStart + indent.length + prefix.length;

  if (body.trim() || selStart < prefixEnd || selStart > lineEnd) return null;

  const newText = text.slice(0, lineStart) + indent + text.slice(lineEnd);
  const caret = lineStart + indent.length;
  return { newText, selStart: caret, selEnd: caret };
};

export const resolveEntityNotesTabIndent = (text, selStart, selEnd, { outdent = false } = {}) => {
  const source = safeString(text);
  const segmentStart = source.lastIndexOf('\n', Math.max(0, selStart - 1)) + 1;
  let normalizedEnd = selEnd;
  if (normalizedEnd > segmentStart && source[normalizedEnd - 1] === '\n') {
    normalizedEnd -= 1;
  }
  const segmentEndLineBreak = source.indexOf('\n', Math.max(segmentStart, normalizedEnd));
  const segmentEnd = segmentEndLineBreak === -1 ? source.length : segmentEndLineBreak;
  const segment = source.slice(segmentStart, segmentEnd);
  const lines = segment.split('\n');
  const lineMeta = [];
  let rebuilt = [];
  let cursor = segmentStart;
  let changed = false;

  for (const line of lines) {
    const match = line.match(ENTITY_NOTES_LIST_LINE_RE);
    let nextLine = line;
    if (match) {
      const currentIndent = match[1].length;
      const trimmedBody = line.slice(currentIndent);
      const nextIndent = outdent ? Math.max(0, currentIndent - 2) : currentIndent + 2;
      nextLine = `${' '.repeat(nextIndent)}${trimmedBody}`;
      if (nextLine !== line) changed = true;
    }
    lineMeta.push({
      start: cursor,
      delta: nextLine.length - line.length,
    });
    rebuilt.push(nextLine);
    cursor += line.length + 1;
  }

  if (!changed) return null;

  const deltaBeforePos = (pos) =>
    lineMeta.reduce((sum, line) => (line.start <= pos ? sum + line.delta : sum), 0);

  const newText = source.slice(0, segmentStart) + rebuilt.join('\n') + source.slice(segmentEnd);
  if (selStart === selEnd) {
    const caret = Math.max(segmentStart, selStart + deltaBeforePos(selStart));
    return { newText, selStart: caret, selEnd: caret };
  }

  return {
    newText,
    selStart: Math.max(segmentStart, selStart + deltaBeforePos(selStart)),
    selEnd: Math.max(segmentStart, selEnd + deltaBeforePos(selEnd)),
  };
};

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

/** Gỡ wiki [[...]]: ưu tiên vùng chọn; nếu không chọn thì gỡ cặp [[ ]] bao quanh con trỏ. */
export const applyWikiLinkUnwrap = (text, selStart, selEnd) => {
  if (selStart < selEnd) {
    const picked = text.slice(selStart, selEnd);
    if (picked.startsWith('[[') && picked.endsWith(']]') && picked.length >= 4) {
      const inner = picked.slice(2, -2);
      const nv = text.slice(0, selStart) + inner + text.slice(selEnd);
      return { newText: nv, selStart, selEnd: selStart + inner.length };
    }
    const cleaned = picked.replace(/\[\[/g, '').replace(/\]\]/g, '');
    if (cleaned === picked) return { newText: text, selStart, selEnd };
    const nv = text.slice(0, selStart) + cleaned + text.slice(selEnd);
    return { newText: nv, selStart, selEnd: selStart + cleaned.length };
  }

  const pos = selStart;
  const left = text.lastIndexOf('[[', pos);
  const right = text.indexOf(']]', pos);
  if (left === -1 || right === -1 || left >= right) return { newText: text, selStart, selEnd };
  if (left + 2 > pos || right < pos) return { newText: text, selStart, selEnd };

  const inner = text.slice(left + 2, right);
  const nv = text.slice(0, left) + inner + text.slice(right + 2);
  const caret = Math.max(left, pos - 2);
  return { newText: nv, selStart: caret, selEnd: caret };
};

export const handleToolbarClick = (before, after = '', editorId, onAfterApply) => {
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
    onAfterApply?.(textarea.value);
  };

  if (before === '[[' && after === ']]') {
    const { newText, selStart, selEnd } = applyWikiLinkWrap(text, start, end);
    apply(newText, selStart, selEnd);
    return;
  }
  if (before === '__WIKI_UNWRAP__') {
    const { newText, selStart, selEnd } = applyWikiLinkUnwrap(text, start, end);
    apply(newText, selStart, selEnd);
    return;
  }

  const selectedText = text.substring(start, end);
  const newValue = text.substring(0, start) + before + selectedText + after + text.substring(end);
  apply(newValue, start + before.length, end + before.length);
};

export const handleToolbarSmartWrap = (marker, editorId, onAfterApply) => {
  const textarea = document.getElementById(editorId);
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const normalizedMarker = safeString(marker);
  if (!normalizedMarker) return;
  const { newText, selStart, selEnd } = resolveSmartWrapTarget(text, start, end, normalizedMarker);
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(textarea, newText);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    textarea.value = newText;
  }
  textarea.focus();
  textarea.setSelectionRange(selStart, selEnd);
  onAfterApply?.(textarea.value);
};

export const handleToolbarInsertText = (insertedText, editorId, onAfterApply, caretOffset = null) => {
  const textarea = document.getElementById(editorId);
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const safeInsertedText = safeString(insertedText);
  const newValue = text.substring(0, start) + safeInsertedText + text.substring(end);
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(textarea, newValue);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    textarea.value = newValue;
  }
  const nextPos = start + (Number.isFinite(caretOffset) ? caretOffset : safeInsertedText.length);
  textarea.focus();
  textarea.setSelectionRange(nextPos, nextPos);
  onAfterApply?.(textarea.value);
};

export const handleToolbarApplyColor = (
  colorValue,
  editorId,
  onAfterApply,
  fallbackText = '\u0111o\u1ea1n c\u1ea7n t\u00f4 m\u00e0u'
) => {
  const textarea = document.getElementById(editorId);
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const text = textarea.value;
  const normalizedColor = sanitizeInlineColor(colorValue) || '#c084fc';
  const picked = text.substring(start, end);
  const pickedMatch = picked.match(INLINE_COLOR_RE);
  const innerText = pickedMatch ? pickedMatch[2] : (picked || fallbackText);
  const before = `[color=${normalizedColor}]`;
  const after = '[/color]';
  const newValue = text.substring(0, start) + before + innerText + after + text.substring(end);
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(textarea, newValue);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    textarea.value = newValue;
  }
  const selStart = start + before.length;
  const selEnd = selStart + innerText.length;
  textarea.focus();
  textarea.setSelectionRange(selStart, selEnd);
  onAfterApply?.(textarea.value);
};

/** Bật/tắt tiền tố đầu dòng (trích dẫn `> `, danh sách số `1. `). */
export const handleToolbarToggleLinePrefix = (editorId, prefix, onAfterApply) => {
  const textarea = document.getElementById(editorId);
  if (!textarea) return;
  const start = textarea.selectionStart;
  const text = textarea.value;
  const lineStart = text.lastIndexOf('\n', Math.max(0, start - 1)) + 1;
  const lineEndIdx = text.indexOf('\n', start);
  const lineEndPos = lineEndIdx === -1 ? text.length : lineEndIdx;
  const line = text.slice(lineStart, lineEndPos);
  let newLine;
  if (prefix === '1. ') {
    if (/^\d+\.\s/.test(line)) newLine = line.replace(/^\d+\.\s/, '');
    else newLine = resolveNextOrderedPrefix(text, lineStart) + line;
  } else if (line.startsWith(prefix)) {
    newLine = line.slice(prefix.length);
  } else {
    newLine = prefix + line;
  }
  const newText = text.slice(0, lineStart) + newLine + text.slice(lineEndPos);
  const nativeSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
  if (nativeSetter) {
    nativeSetter.call(textarea, newText);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  } else {
    textarea.value = newText;
  }
  const delta = newLine.length - line.length;
  const newPos = Math.max(0, Math.min(start + delta, newText.length));
  textarea.focus();
  textarea.setSelectionRange(newPos, newPos);
  onAfterApply?.(textarea.value);
};
