/**
 * Parser cú pháp block ```ttc-query — chỉ đọc, không eval.
 * Import bởi: ttcQueryEngine.js, ttcQueryRenderer.jsx
 */

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function normalizeLines(source) {
  return String(source || '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('//'));
}

function parseQuotedValue(raw) {
  const s = String(raw || '').trim();
  if (
    (s.startsWith('"') && s.endsWith('"') && s.length >= 2) ||
    (s.startsWith("'") && s.endsWith("'") && s.length >= 2)
  ) {
    return { ok: true, value: s.slice(1, -1) };
  }
  if (/^(true|false)$/i.test(s)) {
    return { ok: true, value: s.toLowerCase() === 'true' };
  }
  if (/^-?\d+(?:\.\d+)?$/.test(s)) {
    return { ok: true, value: Number(s) };
  }
  if (s.length > 0) return { ok: true, value: s };
  return { ok: false, error: `Giá trị không hợp lệ: ${raw}` };
}

function splitAndClauses(whereBody) {
  const clauses = [];
  let buf = '';
  let quote = null;
  for (let i = 0; i < whereBody.length; i += 1) {
    const ch = whereBody[i];
    if (quote) {
      buf += ch;
      if (ch === quote && whereBody[i - 1] !== '\\') quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (whereBody.slice(i, i + 4).toUpperCase() === ' AND') {
      const rest = whereBody.slice(i + 4);
      if (!rest || rest.startsWith(' ') || rest.startsWith('\t')) {
        const piece = buf.trim();
        if (piece) clauses.push(piece);
        buf = '';
        i += 3;
        continue;
      }
    }
    buf += ch;
  }
  const tail = buf.trim();
  if (tail) clauses.push(tail);
  return clauses;
}

function parseWhereClause(clause) {
  const text = String(clause || '').trim();
  if (!text) return { ok: false, error: 'Điều kiện WHERE rỗng.' };

  const isNotEmpty = text.match(/^(.+?)\s+IS\s+NOT\s+EMPTY$/i);
  if (isNotEmpty) {
    return { ok: true, cond: { field: isNotEmpty[1].trim(), op: 'isNotEmpty' } };
  }
  const isEmpty = text.match(/^(.+?)\s+IS\s+EMPTY$/i);
  if (isEmpty) {
    return { ok: true, cond: { field: isEmpty[1].trim(), op: 'isEmpty' } };
  }
  const contains = text.match(/^(.+?)\s+CONTAINS\s+(.+)$/i);
  if (contains) {
    const val = parseQuotedValue(contains[2]);
    if (!val.ok) return val;
    return { ok: true, cond: { field: contains[1].trim(), op: 'contains', value: val.value } };
  }

  const ops = [
    ['>=', 'gte'],
    ['<=', 'lte'],
    ['!=', 'neq'],
    ['=', 'eq'],
    ['>', 'gt'],
    ['<', 'lt'],
  ];
  for (const [sym, op] of ops) {
    const idx = text.indexOf(sym);
    if (idx > 0) {
      const field = text.slice(0, idx).trim();
      const valRaw = text.slice(idx + sym.length).trim();
      const val = parseQuotedValue(valRaw);
      if (!val.ok) return val;
      if (!field) return { ok: false, error: `Thiếu tên field trong: ${text}` };
      return { ok: true, cond: { field, op, value: val.value } };
    }
  }
  return { ok: false, error: `Không hiểu điều kiện WHERE: ${text}` };
}

function parseSelectList(body) {
  const raw = String(body || '').trim();
  if (!raw) return { ok: false, error: 'SELECT cần ít nhất một field.' };
  const fields = raw
    .split(',')
    .map((f) => f.trim())
    .filter(Boolean);
  if (!fields.length) return { ok: false, error: 'SELECT cần ít nhất một field.' };
  return { ok: true, fields };
}

function parseSortLine(body) {
  const m = String(body || '')
    .trim()
    .match(/^(\S+)\s+(ASC|DESC)$/i);
  if (!m) return { ok: false, error: 'SORT cần dạng: SORT field ASC|DESC' };
  return { ok: true, sort: { field: m[1], direction: m[2].toUpperCase() === 'DESC' ? 'desc' : 'asc' } };
}

function parseLimitLine(body) {
  const n = Number(String(body || '').trim());
  if (!Number.isFinite(n) || !Number.isInteger(n)) {
    return { ok: false, error: 'LIMIT phải là số nguyên.' };
  }
  if (n <= 0) return { ok: false, error: 'LIMIT phải lớn hơn 0.' };
  if (n > MAX_LIMIT) {
    return { ok: false, error: `LIMIT tối đa là ${MAX_LIMIT}.` };
  }
  return { ok: true, limit: n };
}

/**
 * @returns {{ ok: true, query: object } | { ok: false, errors: string[] }}
 */
export function parseTtcQuery(source) {
  const lines = normalizeLines(source);
  const errors = [];
  if (!lines.length) {
    return { ok: false, errors: ['Query trống.'] };
  }

  const query = {
    view: null,
    from: null,
    where: [],
    select: [],
    sort: null,
    limit: DEFAULT_LIMIT,
  };

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper.startsWith('VIEW ')) {
      const mode = line.slice(5).trim().toUpperCase();
      if (mode === 'TABLE') query.view = 'table';
      else if (mode === 'LIST') query.view = 'list';
      else errors.push(`VIEW không hỗ trợ: ${line.slice(5).trim()}`);
      continue;
    }
    if (upper.startsWith('FROM ')) {
      const src = line.slice(5).trim().toLowerCase();
      if (src !== 'entity') errors.push('FROM chỉ hỗ trợ: entity');
      else query.from = 'entity';
      continue;
    }
    if (upper.startsWith('WHERE ')) {
      const body = line.slice(6).trim();
      const clauses = splitAndClauses(body);
      for (const clause of clauses) {
        const parsed = parseWhereClause(clause);
        if (!parsed.ok) errors.push(parsed.error);
        else query.where.push(parsed.cond);
      }
      continue;
    }
    if (upper.startsWith('SELECT ')) {
      const parsed = parseSelectList(line.slice(7));
      if (!parsed.ok) errors.push(parsed.error);
      else query.select = parsed.fields;
      continue;
    }
    if (upper.startsWith('SORT ')) {
      const parsed = parseSortLine(line.slice(5));
      if (!parsed.ok) errors.push(parsed.error);
      else query.sort = parsed.sort;
      continue;
    }
    if (upper.startsWith('LIMIT ')) {
      const parsed = parseLimitLine(line.slice(6));
      if (!parsed.ok) errors.push(parsed.error);
      else query.limit = parsed.limit;
      continue;
    }
    errors.push(`Dòng không hỗ trợ: ${line}`);
  }

  if (!query.view) errors.push('Thiếu VIEW TABLE hoặc VIEW LIST.');
  if (!query.from) errors.push('Thiếu FROM entity.');
  if (!query.select.length) {
    if (query.view === 'list') query.select = ['entity'];
    else errors.push('Thiếu SELECT (bắt buộc với VIEW TABLE).');
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, query };
}

export function validateTtcQuery(query) {
  return parseTtcQuery(
    [
      query?.view === 'list' ? 'VIEW LIST' : 'VIEW TABLE',
      'FROM entity',
      ...(query?.where || []).map(() => ''),
      query?.select?.length ? `SELECT ${query.select.join(', ')}` : '',
      query?.sort ? `SORT ${query.sort.field} ${query.sort.direction === 'desc' ? 'DESC' : 'ASC'}` : '',
      query?.limit != null ? `LIMIT ${query.limit}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
}

export { DEFAULT_LIMIT, MAX_LIMIT };
