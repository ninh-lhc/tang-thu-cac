// Sync repeated inline formatting in entity notes.
// We infer wrapper templates from manual inline markup like **word**
// or [color=...]phrase[/color], then reapply the same wrapper to
// matching plain duplicates while skipping formatted or linked spans.

const safeString = (value) => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  return String(value);
};

const TERM_TOKEN_RE = /[\p{L}\p{M}\p{N}_]+(?:[-'’][\p{L}\p{M}\p{N}_]+)*/u;
const TERM_RE = new RegExp(`^${TERM_TOKEN_RE.source}(?:[ \\t]+${TERM_TOKEN_RE.source}){0,5}$`, 'u');
const BOUNDARY_CLASS = "\\p{L}\\p{M}\\p{N}_'’-";

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

const normalizeTermKey = (value) =>
  safeString(value)
    .normalize('NFC')
    .trim()
    .replace(/[ \t]+/g, ' ')
    .toLowerCase();

const escapeRegExp = (value) => safeString(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const unwrapInlineTerm = (value) => {
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

const buildTermFormatRule = (segment) => {
  const source = safeString(segment);
  const plainTerm = unwrapInlineTerm(source);
  if (!plainTerm || plainTerm !== plainTerm.trim()) return null;
  if (!TERM_RE.test(plainTerm)) return null;

  const termStart = source.indexOf(plainTerm);
  if (termStart === -1) return null;
  if (source.indexOf(plainTerm, termStart + plainTerm.length) !== -1) return null;

  const before = source.slice(0, termStart);
  const after = source.slice(termStart + plainTerm.length);
  if (!before && !after) return null;

  return {
    key: normalizeTermKey(plainTerm),
    term: plainTerm,
    before,
    after,
    tokenCount: plainTerm.split(/[ \t]+/).length,
  };
};

const buildRuleMatcher = (rules) => {
  if (!Array.isArray(rules) || rules.length === 0) return null;
  const alternatives = rules.map((rule) =>
    rule.term
      .split(/[ \t]+/)
      .map((part) => escapeRegExp(part))
      .join('[ \\t]+')
  );

  return new RegExp(
    `(^|[^${BOUNDARY_CLASS}])(${alternatives.join('|')})(?=$|[^${BOUNDARY_CLASS}])`,
    'giu'
  );
};

const applyRulesToPlainSegment = (segment, rules, ruleMap) => {
  const source = safeString(segment);
  const matcher = buildRuleMatcher(rules);
  if (!matcher) return { text: source, count: 0 };

  let rebuilt = '';
  let lastIndex = 0;
  let count = 0;

  for (const match of source.matchAll(matcher)) {
    const prefix = safeString(match[1]);
    const pickedTerm = safeString(match[2]);
    const matchStart = (Number(match.index) || 0) + prefix.length;
    const matchEnd = matchStart + pickedTerm.length;
    const rule = ruleMap.get(normalizeTermKey(pickedTerm));

    rebuilt += source.slice(lastIndex, match.index);
    rebuilt += prefix;
    if (rule) {
      rebuilt += `${rule.before}${pickedTerm}${rule.after}`;
      count += 1;
    } else {
      rebuilt += pickedTerm;
    }
    lastIndex = matchEnd;
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
    const candidate = buildTermFormatRule(match[0]);
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

  const rules = [...ruleMap.values()].sort((left, right) => {
    if (right.term.length !== left.term.length) return right.term.length - left.term.length;
    if (right.tokenCount !== left.tokenCount) return right.tokenCount - left.tokenCount;
    return right.before.length + right.after.length - (left.before.length + left.after.length);
  });

  const applyRegex = createProtectedSegmentRegex();
  let rebuilt = '';
  let lastIndex = 0;
  let propagatedCount = 0;

  while ((match = applyRegex.exec(source)) !== null) {
    const plainSegment = source.slice(lastIndex, match.index);
    const patchedSegment = applyRulesToPlainSegment(plainSegment, rules, ruleMap);
    rebuilt += patchedSegment.text;
    rebuilt += match[0];
    propagatedCount += patchedSegment.count;
    lastIndex = applyRegex.lastIndex;
  }

  const tailSegment = applyRulesToPlainSegment(source.slice(lastIndex), rules, ruleMap);
  rebuilt += tailSegment.text;
  propagatedCount += tailSegment.count;

  return {
    text: rebuilt,
    propagatedCount,
    ruleCount: ruleMap.size,
    conflictCount: conflicts.size,
  };
};
