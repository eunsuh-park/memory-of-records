/**
 * Notion 노트북 public_id 배정.
 * 형식: {PREFIX}-{YEAR}-{SEQ}  (예: DIRY-2024-0001)
 * 규칙: docs/PUBLIC-ID.md
 */
import { NOTEBOOK_DB_ID, findSchemaProperty, notionFetch } from './notionDb.js';

export const PUBLIC_ID_PATTERN = /^([A-Z]+)-(\d{4})-(\d+)$/;

const TYPE_PREFIX = [
  { test: /다이어리|일기|diary|journal/i, prefix: 'DIRY' },
  { test: /스케줄러|scheduler|planner/i, prefix: 'PLNR' },
  { test: /수첩|메모|handy|memo/i, prefix: 'MEMO' },
  { test: /스케치|sketch/i, prefix: 'SKTC' }
];

const LINED_TYPE = /줄공책|lined/i;
const WORK_HINT = /업무/;
const STUDY_HINT = /학습|독서|독후감|받아쓰기|jlpt|공부|study|reading/i;

export function isPublicIdFormat(value) {
  return PUBLIC_ID_PATTERN.test(String(value || '').trim());
}

export function parsePublicId(value) {
  const match = String(value || '')
    .trim()
    .toUpperCase()
    .match(PUBLIC_ID_PATTERN);
  if (!match) return null;
  return {
    prefix: match[1],
    year: Number(match[2]),
    seq: Number(match[3]),
    value: `${match[1]}-${match[2]}-${String(Number(match[3])).padStart(4, '0')}`
  };
}

export function formatPublicId(prefix, year, seq) {
  const safePrefix = String(prefix || '')
    .trim()
    .toUpperCase();
  const safeYear = String(Number(year) || 0).padStart(4, '0');
  const safeSeq = String(Math.max(1, Math.floor(Number(seq) || 1))).padStart(4, '0');
  return `${safePrefix}-${safeYear}-${safeSeq}`;
}

export function findPublicIdProperty(schema) {
  return findSchemaProperty(
    schema,
    'public_id',
    'Public_ID',
    'Public ID',
    'publicId',
    'Public id'
  );
}

export function parsePublicIdFromProperty(prop) {
  if (!prop) return '';
  if (prop.type === 'rich_text' || prop.type === 'text') {
    return (prop.rich_text || [])
      .map((part) => part?.plain_text || '')
      .join('')
      .trim();
  }
  if (prop.type === 'title') {
    return (prop.title || [])
      .map((part) => part?.plain_text || '')
      .join('')
      .trim();
  }
  return '';
}

export function buildPublicIdPropertyPayload(prop, publicId) {
  const value = String(publicId || '').trim();
  if (!prop || !value) return null;
  if (prop.type === 'rich_text' || prop.type === 'text') {
    return { rich_text: [{ type: 'text', text: { content: value.slice(0, 2000) } }] };
  }
  if (prop.type === 'title') {
    return { title: [{ type: 'text', text: { content: value.slice(0, 2000) } }] };
  }
  return null;
}

function parseIsoDate(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

function inclusiveDays(start, end) {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor((end.getTime() - start.getTime()) / ms) + 1;
}

function overlapDaysInYear(start, end, year) {
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));
  const from = start > yearStart ? start : yearStart;
  const to = end < yearEnd ? end : yearEnd;
  if (to < from) return 0;
  return inclusiveDays(from, to);
}

/**
 * docs/PUBLIC-ID.md YEAR 규칙
 * 1. 시작·종료 둘 다 없음 → 9999
 * 2. 종료일 없음 → 시작연도
 * 3. 포함 일수 730일+ → 시작연도
 * 4. 두 해 겹친 일수가 같음 → 시작연도
 * 5. 그 외 → 겹친 일수가 가장 많은 연도
 * 종료 < 시작이면 시작연도
 */
export function publicIdYear(periodStart, periodEnd) {
  const start = parseIsoDate(periodStart);
  const end = parseIsoDate(periodEnd);
  if (!start && !end) return 9999;
  if (!end) return start.getUTCFullYear();
  if (!start) return end.getUTCFullYear();
  if (end < start) return start.getUTCFullYear();
  if (inclusiveDays(start, end) >= 730) return start.getUTCFullYear();

  let bestYear = start.getUTCFullYear();
  let bestDays = -1;
  for (let year = start.getUTCFullYear(); year <= end.getUTCFullYear(); year += 1) {
    const days = overlapDaysInYear(start, end, year);
    if (days > bestDays) {
      bestDays = days;
      bestYear = year;
    }
  }
  return bestYear;
}

/**
 * 종류 선택값 + (줄공책이면) 이름·메모 힌트로 PREFIX를 고른다.
 * 줄공책: 업무 → WORK, 학습/독서 등 → STDY, 그 외 → NOTE
 */
export function publicIdPrefix({ notebookType, name, notes } = {}) {
  const type = String(notebookType || '').trim();
  for (const row of TYPE_PREFIX) {
    if (row.test.test(type)) return row.prefix;
  }

  const blob = `${name || ''}\n${notes || ''}`;
  if (LINED_TYPE.test(type) || !type) {
    if (WORK_HINT.test(blob)) return 'WORK';
    if (STUDY_HINT.test(blob)) return 'STDY';
    if (LINED_TYPE.test(type)) return 'NOTE';
  }

  for (const row of TYPE_PREFIX) {
    if (row.test.test(blob)) return row.prefix;
  }
  if (WORK_HINT.test(blob)) return 'WORK';
  if (STUDY_HINT.test(blob)) return 'STDY';
  return 'NOTE';
}

export function nextPublicIdSeq(existingIds, prefix, year) {
  const yearStr = String(Number(year)).padStart(4, '0');
  const groupPrefix = String(prefix || '')
    .trim()
    .toUpperCase();
  let max = 0;
  for (const id of existingIds || []) {
    const parsed = parsePublicId(id);
    if (!parsed) continue;
    if (parsed.prefix !== groupPrefix) continue;
    if (String(parsed.year).padStart(4, '0') !== yearStr) continue;
    if (parsed.seq > max) max = parsed.seq;
  }
  return max + 1;
}

function richTextFilter(property, condition) {
  return { property, rich_text: condition };
}

function titleFilter(property, condition) {
  return { property, title: condition };
}

function publicIdFilter(publicIdProp, condition) {
  if (!publicIdProp?.key) return null;
  if (publicIdProp.type === 'rich_text' || publicIdProp.type === 'text') {
    return richTextFilter(publicIdProp.key, condition);
  }
  if (publicIdProp.type === 'title') {
    return titleFilter(publicIdProp.key, condition);
  }
  return null;
}

async function queryPublicIds(publicIdProp, filter) {
  const ids = [];
  let cursor;
  do {
    const body = { page_size: 100 };
    if (cursor) body.start_cursor = cursor;
    if (filter) body.filter = filter;
    const data = await notionFetch(`/databases/${NOTEBOOK_DB_ID}/query`, {
      method: 'POST',
      body
    });
    for (const page of data.results || []) {
      const value = parsePublicIdFromProperty(page.properties?.[publicIdProp.key]);
      if (value) ids.push(value);
    }
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return ids;
}

export async function listPublicIdsForGroup(publicIdProp, prefix, year) {
  const prefixYear = `${prefix}-${String(Number(year)).padStart(4, '0')}-`;
  const filter = publicIdFilter(publicIdProp, { starts_with: prefixYear });
  return queryPublicIds(publicIdProp, filter);
}

export async function publicIdAlreadyUsed(publicIdProp, publicId) {
  const value = String(publicId || '').trim();
  if (!value) return false;
  const filter = publicIdFilter(publicIdProp, { equals: value });
  if (!filter) {
    const ids = await queryPublicIds(publicIdProp, null);
    return ids.some((id) => id === value);
  }
  const ids = await queryPublicIds(publicIdProp, filter);
  return ids.includes(value);
}

export async function allocatePublicId({
  schema,
  notebookType,
  name,
  notes,
  periodStart,
  periodEnd
} = {}) {
  const publicIdProp = findPublicIdProperty(schema);
  if (!publicIdProp) {
    const err = new Error('Notion DB에 public_id 속성이 없습니다');
    err.status = 500;
    throw err;
  }
  if (!buildPublicIdPropertyPayload(publicIdProp, 'DIRY-2024-0001')) {
    const err = new Error(
      `public_id 속성(${publicIdProp.key}) 타입이 ${publicIdProp.type}입니다. rich_text여야 합니다`
    );
    err.status = 500;
    throw err;
  }

  const prefix = publicIdPrefix({ notebookType, name, notes });
  const year = publicIdYear(periodStart, periodEnd);
  const existing = await listPublicIdsForGroup(publicIdProp, prefix, year);
  const seq = nextPublicIdSeq(existing, prefix, year);
  const publicId = formatPublicId(prefix, year, seq);

  return { publicId, prefix, year, seq, publicIdProp };
}
