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
import {
  collectEntityNotesDiagnostics,
  fixEntityNotesStructureOnly,
} from './entityNotesDiagnostics.js';
import { cleanupEntityNotesText } from './entityNotesTextCleanup.js';

export const NOTES_AI_PIPELINE_STEPS = ['clean', 'link', 'format'];

const STEP_LABELS = {
  clean: 'làm sạch',
  link: 'bọc [[link]]',
  format: 'dàn khung AI',
};

function yieldToMain() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      setTimeout(resolve, 0);
    });
  });
}

function normalizeSteps(steps) {
  const requested = Array.isArray(steps) ? steps : NOTES_AI_PIPELINE_STEPS;
  return NOTES_AI_PIPELINE_STEPS.filter((step) => requested.includes(step));
}

function safeString(value) {
  if (value == null || value === 'null' || value === 'undefined') return '';
  return String(value);
}

/** Bước 1: chuẩn hoá khoảng trắng / định dạng nhẹ (local, không gọi AI). */
export function runNotesCleanStep(sourceText) {
  const before = safeString(sourceText);
  let text = cleanupEntityNotesText(before);
  text = fixEntityNotesStructureOnly(text);
  return { text, changed: text !== before };
}

export function getNotesAiPipelineStepLabel(step) {
  return STEP_LABELS[step] || safeString(step);
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
  const finalText = fixEntityNotesStructureOnly(formatted);
  if (finalText === normalized) {
    return { text: normalized, applied: false, reason: 'unchanged' };
  }
  return { text: finalText, applied: true, skippedAi: false };
}

/**
 * Chạy cả 3 bước; trả text cuối và tóm tắt cho toast.
 */
export async function runNotesAiPipeline(sourceText, options = {}) {
  const {
    steps: requestedSteps = NOTES_AI_PIPELINE_STEPS,
    onProgress = null,
  } = options;
  const stepsRun = [];
  const stepIds = normalizeSteps(requestedSteps);
  let text = safeString(sourceText);
  if (!text.trim()) {
    return { text, steps: stepsRun, ok: false, reason: 'empty' };
  }

  let linkSkippedAi = false;
  let formatSkippedAi = false;

  const notify = async (step, phase) => {
    if (typeof onProgress === 'function') {
      onProgress({ step, phase, text });
    }
    if (phase === 'done') {
      await yieldToMain();
    }
  };

  try {
    if (stepIds.includes('clean')) {
      await notify('clean', 'start');
      const clean = runNotesCleanStep(text);
      text = clean.text;
      if (clean.changed) stepsRun.push('làm sạch');
      await notify('clean', 'done');
    }

    if (stepIds.includes('link')) {
      await notify('link', 'start');
      const link = await runNotesLinkStep(text, options);
      text = link.text;
      linkSkippedAi = Boolean(link.skippedAi);
      if (link.changed) {
        if (link.aiApplied) stepsRun.push('AI link');
        else if (link.localCount > 0) stepsRun.push('link');
      }
      await notify('link', 'done');
    }

    if (stepIds.includes('format')) {
      await notify('format', 'start');
      const format = await runNotesFormatStep(text, options);
      text = format.text;
      formatSkippedAi = Boolean(format.skippedAi);
      if (format.applied) stepsRun.push('dàn khung');
      await notify('format', 'done');
    }

    const remainingWarnings = collectEntityNotesDiagnostics(text);

    return {
      text,
      steps: stepsRun,
      ok: true,
      linkSkippedAi,
      formatSkippedAi,
      remainingWarningCount: remainingWarnings.length,
      ranSteps: stepIds,
    };
  } catch (error) {
    return {
      text,
      steps: stepsRun,
      ok: false,
      error: mapGeminiErrorToUserMessage(error),
      rawError: error,
      ranSteps: stepIds,
    };
  }
}

