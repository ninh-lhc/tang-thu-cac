/**
 * Pipeline: làm sạch → AI/local [[link]] → AI dàn khung (chạy trên chuỗi text, không phụ thuộc React state).
 */
import {
  callGeminiAPIText,
  mapGeminiErrorToUserMessage,
  suggestWikiLinkSpotsWithAI,
  truncateForAI,
} from '../MasterUtils.jsx';
import { applyWikiLinkSpots } from './applyWikiLinkSpots.js';
import { autoWrapWikiLinksByEntityMapWithCount } from './autoWrapWikiLinks.js';
import { ENTITY_NOTES_AI_STRUCTURE_SYSTEM_PROMPT } from './entityNotesAiStructurePrompt.js';
import { fixAllEntityNotesDiagnostics } from './entityNotesDiagnostics.js';

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

/** Bước 1: chuẩn hoá khoảng trắng / định dạng nhẹ. */
export function runNotesCleanStep(sourceText) {
  const before = safeString(sourceText);
  const text = fixAllEntityNotesDiagnostics(before);
  return { text, changed: text !== before };
}

/** Bước 2: bọc [[link]] (local rồi AI nếu có key). */
export async function runNotesLinkStep(
  sourceText,
  { entityMap, geminiApiKeys, aiMode = 'standard', wikiLinkOptOuts = null } = {}
) {
  let text = safeString(sourceText);
  let localCount = 0;
  const localWrap = autoWrapWikiLinksByEntityMapWithCount(text, entityMap, {
    optOuts: Array.isArray(wikiLinkOptOuts) ? wikiLinkOptOuts : [],
  });
  if (localWrap.text !== text) {
    text = localWrap.text;
    localCount = localWrap.count;
  }

  const keys = Array.isArray(geminiApiKeys) ? geminiApiKeys : [];
  if (!keys.length) {
    return {
      text,
      changed: text !== sourceText,
      localCount,
      aiApplied: false,
      skippedAi: true,
      reason: 'no_api_key',
    };
  }

  const { wasTruncated } = truncateForAI(text);
  const res = await suggestWikiLinkSpotsWithAI(text, keys, aiMode);
  const spots = Array.isArray(res?.linkSpots) ? res.linkSpots : [];
  const aiNext = applyWikiLinkSpots(text, spots);
  const fallbackWrap = autoWrapWikiLinksByEntityMapWithCount(text, entityMap, {
    optOuts: Array.isArray(wikiLinkOptOuts) ? wikiLinkOptOuts : [],
  });
  const nextText = aiNext !== text ? aiNext : fallbackWrap.text;
  return {
    text: nextText,
    changed: nextText !== sourceText,
    localCount,
    aiApplied: aiNext !== text,
    fallbackOnly: aiNext === text && fallbackWrap.text !== text,
    spotsCount: spots.length,
    wasTruncated,
    skippedAi: false,
  };
}

/** Bước 3: AI dàn khung markdown. */
export async function runNotesFormatStep(
  sourceText,
  { geminiApiKeys, aiMode = 'standard', subject = 'đối tượng' } = {}
) {
  const normalized = safeString(sourceText);
  if (!normalized.trim()) {
    return { text: normalized, applied: false, reason: 'empty' };
  }
  const keys = Array.isArray(geminiApiKeys) ? geminiApiKeys : [];
  if (!keys.length) {
    return { text: normalized, applied: false, skippedAi: true, reason: 'no_api_key' };
  }

  const { text: truncated } = truncateForAI(normalized, aiMode === 'quick' ? 7000 : undefined);
  const payload = {
    contents: [{
      parts: [{
        text: `Chủ thể ghi chú: ${safeString(subject).trim() || 'đối tượng'}\n\nVăn bản gốc:\n${truncated}`,
      }],
    }],
    systemInstruction: {
      parts: [{ text: ENTITY_NOTES_AI_STRUCTURE_SYSTEM_PROMPT }],
    },
  };

  const raw = await callGeminiAPIText(payload, keys, { timeoutMs: 45000 });
  const formatted = safeString(raw)
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim();
  if (!formatted) {
    return { text: normalized, applied: false, reason: 'empty_ai_response' };
  }
  if (formatted.length < normalized.length * 0.45) {
    return { text: normalized, applied: false, reason: 'too_short' };
  }
  const finalText = fixAllEntityNotesDiagnostics(formatted);
  if (finalText === normalized) {
    return { text: normalized, applied: false, reason: 'unchanged' };
  }
  return { text: finalText, applied: true, skippedAi: false };
}

/**
 * Chạy cả 3 bước; trả text cuối và tóm tắt cho toast.
 */
export async function runNotesAiPipeline(sourceText, options = {}) {
  const steps = [];
  let text = safeString(sourceText);
  if (!text.trim()) {
    return { text, steps, ok: false, reason: 'empty' };
  }

  const clean = runNotesCleanStep(text);
  text = clean.text;
  if (clean.changed) steps.push('làm sạch');

  try {
    const link = await runNotesLinkStep(text, options);
    text = link.text;
    if (link.changed) {
      if (link.aiApplied) steps.push('AI link');
      else if (link.localCount > 0) steps.push('link');
    }

    const format = await runNotesFormatStep(text, options);
    text = format.text;
    if (format.applied) steps.push('dàn khung');

    return {
      text,
      steps,
      ok: true,
      linkSkippedAi: Boolean(link.skippedAi),
      formatSkippedAi: Boolean(format.skippedAi),
    };
  } catch (error) {
    return {
      text,
      steps,
      ok: false,
      error: mapGeminiErrorToUserMessage(error),
      rawError: error,
    };
  }
}
