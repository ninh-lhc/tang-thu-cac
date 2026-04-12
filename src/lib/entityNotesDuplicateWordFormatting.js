// Sync repeated single-word inline formatting in entity notes.
// We infer wrapper templates from manual inline markup like **word**
// or [color=...]word[/color], then reapply the same wrapper to plain
// duplicates while skipping spans that are already formatted or linked.

const safeString = (value) => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
};

const SINGLE_WORD_RE = /^[\p{L}\p{M}\p{N}_]+(?:[-'’][\p{L}\p{M}\p{N}_]+)*$/u;

const createProtectedSegmentRegex = () =>
  /(\[color=(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\][\s\S]*?\[\/color\]|\*\*[\s\S]*?\*\*|==[\s\S]*?==|~~[\s\S]*?~~|<u>[\s\S]*?<\/u>|`[^`\n]+`|\*[^*\n]+?\*|!\[.*?\]\(.*?\)|\[[^\]\n]+\]\([^)]+\)|https?:\/\/\S+|\[\[.*?\]\])/gu;

const INLINE_WRAP_PATTERNS = [
  /^\[color=(?:#[0-9a-fA-F]{3,8}|[a-zA-Z]+)\]([\s\S]*?)\[\/color\]$/u,
  /^\*\*([\s\S]*?)\*\*$/u,
  /^==([\s\S]*?)==$/u,
  /^~~([\s\S]*?)~~$/u,
  /^<u>([\s\S]*?)<\/u>$/iu,
  /^`([^`\n]+)`$/u,
  /^\*([^*\n]+?)\*$/u,
];

const normalizeWordKey = (value) => safeString(value).normalize('NFC').toLowerCase();

const unwrapInlineWord = (value) => {
  let current = safeString(value);
  let guard = 0;

  while (guard < 12) {
    let next = current;
    for (const pattern of INLINE_WRAP_PATTERNS) {
      const match = current.match(pattern);
      if (match) {
        next = safeString(match[1]);
        break;
      }
    }
    if (next === current) break;
    current = next;
    guard += 1;
  }

  return current;
};

const buildWordFormatRule = (segment) => {
  const source = safeString(segment);
  const plainWord = unwrapInlineWord(source);
  if (!SINGLE_WORD_RE.test(plainWord)) return null;

  const wordStart = source.indexOf(plainWord);
  if (wordStart === -1) return null;
  if (source.indexOf(plainWord, wordStart + plainWord.length) !== -1) return null;

  const before = source.slice(0, wordStart);
  const after = source.slice(wordStart + plainWord.length);
  if (!before && !after) return null;

  return {
    key: normalizeWordKey(plainWord),
    word: plainWord,
    before,
    after,
  };
};

const applyRulesToPlainSegment = (segment, ruleMap) => {
  const source = safeString(segment);
  const wordTokenRegex = /[\p{L}\p{M}\p{N}_]+(?:[-'’][\p{L}\p{M}\p{N}_]+)*/gu;
  let rebuilt = '';
  let lastIndex = 0;
  let count = 0;

  for (const match of source.matchAll(wordTokenRegex)) {
    const word = safeString(match[0]);
    const start = Number(match.index) || 0;
    rebuilt += source.slice(lastIndex, start);

    const rule = ruleMap.get(normalizeWordKey(word));
    if (rule) {
      rebuilt += `${rule.before}${word}${rule.after}`;
      count += 1;
    } else {
      rebuilt += word;
    }

    lastIndex = start + word.length;
  }

  rebuilt += source.slice(lastIndex);
  return { text: rebuilt, count };
};

export const syncEntityNotesDuplicateWordFormatting = (sourceText) => {
  const source = safeString(sourceText);
  const collectRegex = createProtectedSegmentRegex();
  const ruleMap = new Map();
  const conflicts = new Set();

  let match;
  while ((match = collectRegex.exec(source)) !== null) {
    const candidate = buildWordFormatRule(match[0]);
    if (!candidate || conflicts.has(candidate.key)) continue;

    const previous = ruleMap.get(candidate.key);
    if (!previous) {
      ruleMap.set(candidate.key, candidate);
      continue;
    }

    if (previous.before !== candidate.before || previous.after !== candidate.after) {
      ruleMap.delete(candidate.key);
      conflicts.add(candidate.key);
    }
  }

  if (ruleMap.size === 0) {
    return {
      text: source,
      propagatedCount: 0,
      ruleCount: 0,
      conflictCount: conflicts.size,
    };
  }

  const applyRegex = createProtectedSegmentRegex();
  let rebuilt = '';
  let lastIndex = 0;
  let propagatedCount = 0;

  while ((match = applyRegex.exec(source)) !== null) {
    const plainSegment = source.slice(lastIndex, match.index);
    const patchedSegment = applyRulesToPlainSegment(plainSegment, ruleMap);
    rebuilt += patchedSegment.text;
    rebuilt += match[0];
    propagatedCount += patchedSegment.count;
    lastIndex = applyRegex.lastIndex;
  }

  const tailSegment = applyRulesToPlainSegment(source.slice(lastIndex), ruleMap);
  rebuilt += tailSegment.text;
  propagatedCount += tailSegment.count;

  return {
    text: rebuilt,
    propagatedCount,
    ruleCount: ruleMap.size,
    conflictCount: conflicts.size,
  };
};
