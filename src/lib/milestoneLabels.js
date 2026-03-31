/**
 * Nhãn mốc timeline theo ký tự đầu dòng.
 * Pha 1: áp dụng trước cho tab Nhân Vật.
 */

export const MILESTONE_LABELS = [
  { id: 'uncertain', token: '?', bracketToken: '[?]', title: 'Chưa rõ' },
  { id: 'important', token: '!', bracketToken: '[!]', title: 'Quan trọng' },
  { id: 'critical', token: '!!', bracketToken: '[!!]', title: 'Bước ngoặt' },
  { id: 'ongoing', token: '...', bracketToken: '[...]', title: 'Xuyên suốt' },
  { id: 'drop', token: 'x', bracketToken: '[x]', title: 'Tạm bỏ' },
];

const LABEL_BY_TOKEN = new Map(
  MILESTONE_LABELS.flatMap((l) => [
    [l.token.toLowerCase(), l],
    [l.bracketToken.toLowerCase(), l],
  ])
);

export function parseMilestoneLabel(eventText) {
  const raw = String(eventText || '').trimStart();
  if (!raw) return { labelId: null, token: '', body: '' };

  const bracket = raw.match(/^\[(\?\?|!!|!|\?|\.\.\.|x)\]\s*/i);
  if (bracket) {
    const tokenRaw = `[${bracket[1]}]`.toLowerCase();
    const label = LABEL_BY_TOKEN.get(tokenRaw);
    const token = bracket[0];
    return { labelId: label?.id || null, token, body: raw.slice(token.length) };
  }

  const plain = raw.match(/^(\?\?|!!|!|\?|\.\.\.|x)\s+/i);
  if (plain) {
    const tokenRaw = plain[1].toLowerCase();
    const label = LABEL_BY_TOKEN.get(tokenRaw);
    const token = plain[0];
    return { labelId: label?.id || null, token, body: raw.slice(token.length) };
  }
  return { labelId: null, token: '', body: raw };
}

export function applyMilestoneLabel(eventText, labelId) {
  const parsed = parseMilestoneLabel(eventText);
  const cleanBody = String(parsed.body || '').trimStart();
  const label = MILESTONE_LABELS.find((x) => x.id === labelId);
  if (!label) return cleanBody;
  if (!cleanBody) return label.bracketToken;
  return `${label.bracketToken} ${cleanBody}`;
}

