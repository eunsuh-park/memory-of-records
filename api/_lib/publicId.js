/**
 * Notion 노트북 public_id 규칙
 *
 * 형식: {PREFIX}-{YEAR}-{SEQ}
 *   예) DIRY-2024-0001, SKTC-9999-0002
 *
 * YEAR
 * - 시작·종료가 모두 없으면 9999
 * - 종료일 없음(아직 쓰는 중)이면 시작연도
 * - 사용 기간이 2년 이상(포함 일수 730일+)이면 시작연도
 * - 연도별 겹친 일수가 동점이면 시작연도
 * - 그 외에는 겹친 일수가 가장 많은 연도
 *
 * PREFIX
 * - DIRY 다이어리(일기장)
 * - PLNR 스케줄러
 * - MEMO 수첩/메모지
 * - SKTC 스케치북
 * - 줄공책: STDY 학습·독서 / WORK 업무일지 / NOTE 그 외
 */

export const UNKNOWN_YEAR = 9999;
export const PUBLIC_ID_PATTERN = /^(DIRY|MEMO|NOTE|PLNR|SKTC|STDY|WORK)-(\d{4})-(\d{4})$/;

/** 포함 일수 기준 2년 (365 * 2). 윤년이 끼면 실제 2년은 731일 */
const TWO_YEAR_INCLUSIVE_DAYS = 365 * 2;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const TYPE_PREFIX = [
  { prefix: 'DIRY', keys: ['다이어리(일기장)', '다이어리', '일기장', 'diary', 'journal'] },
  { prefix: 'PLNR', keys: ['스케줄러', 'scheduler', 'planner'] },
  { prefix: 'MEMO', keys: ['수첩/메모지', '수첩', '메모지', 'handy notebook', 'memo'] },
  { prefix: 'SKTC', keys: ['스케치북', 'sketchbook'] }
];

const LINED_TYPE_KEYS = ['줄공책', 'lined-notebook', 'lined notebook'];

function normalizeTypeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function parseIsoDate(value) {
  const match = String(value || '')
    .trim()
    .match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const utc = Date.UTC(year, month - 1, day);
  if (Number.isNaN(utc)) return null;
  return { year, month, day, utc };
}

function inclusiveDays(startUtc, endUtc) {
  return Math.floor((endUtc - startUtc) / MS_PER_DAY) + 1;
}

function daysByYear(start, end) {
  const counts = new Map();
  for (let year = start.year; year <= end.year; year += 1) {
    const rangeStart = Math.max(start.utc, Date.UTC(year, 0, 1));
    const rangeEnd = Math.min(end.utc, Date.UTC(year, 11, 31));
    if (rangeEnd < rangeStart) continue;
    counts.set(year, inclusiveDays(rangeStart, rangeEnd));
  }
  return counts;
}

/**
 * @param {string|null|undefined} periodStart
 * @param {string|null|undefined} periodEnd
 * @returns {number}
 */
export function selectPublicIdYear(periodStart, periodEnd) {
  const start = parseIsoDate(periodStart);
  const end = parseIsoDate(periodEnd);

  if (!start && !end) return UNKNOWN_YEAR;
  if (start && !end) return start.year;
  if (!start && end) return end.year;

  if (end.utc < start.utc) return start.year;

  if (inclusiveDays(start.utc, end.utc) >= TWO_YEAR_INCLUSIVE_DAYS) {
    return start.year;
  }

  const counts = daysByYear(start, end);
  let maxDays = -1;
  const tiedYears = [];
  for (const [year, days] of counts) {
    if (days > maxDays) {
      maxDays = days;
      tiedYears.length = 0;
      tiedYears.push(year);
    } else if (days === maxDays) {
      tiedYears.push(year);
    }
  }

  if (tiedYears.length === 0) return start.year;
  if (tiedYears.length > 1) return start.year;
  return tiedYears[0];
}

function isLinedNotebookType(notebookType) {
  const key = normalizeTypeKey(notebookType);
  return LINED_TYPE_KEYS.some((label) => normalizeTypeKey(label) === key);
}

/**
 * 줄공책 세부분류: 학습·독서 → STDY, 업무 → WORK, 그 외 → NOTE
 * @param {string} name
 * @returns {'STDY'|'WORK'|'NOTE'}
 */
export function linedNotebookPrefix(name) {
  const text = String(name || '');
  if (/업무/.test(text)) return 'WORK';
  if (/학습|독서|독후감|받아쓰기|JLPT|구글\s*PM|\bPM\b|노마드/i.test(text)) {
    return 'STDY';
  }
  return 'NOTE';
}

/**
 * @param {string} notebookType
 * @param {string} [name]
 * @returns {string}
 */
export function prefixFromNotebook(notebookType, name = '') {
  if (isLinedNotebookType(notebookType)) return linedNotebookPrefix(name);

  const key = normalizeTypeKey(notebookType);
  for (const row of TYPE_PREFIX) {
    if (row.keys.some((label) => normalizeTypeKey(label) === key)) {
      return row.prefix;
    }
  }
  return 'NOTE';
}

/**
 * @param {string} prefix
 * @param {number|string} year
 * @param {number|string} sequence
 * @returns {string}
 */
export function formatPublicId(prefix, year, sequence) {
  const seq = String(Math.max(1, Number(sequence) || 1)).padStart(4, '0');
  const yearPart = String(year).padStart(4, '0');
  return `${prefix}-${yearPart}-${seq}`;
}

/**
 * @param {string} value
 * @returns {{ prefix: string, year: number, sequence: number }|null}
 */
export function parsePublicId(value) {
  const match = String(value || '').trim().match(PUBLIC_ID_PATTERN);
  if (!match) return null;
  return {
    prefix: match[1],
    year: Number(match[2]),
    sequence: Number(match[3])
  };
}

/**
 * @param {string[]} existingIds
 * @param {string} prefix
 * @param {number} year
 * @returns {number}
 */
export function nextSequence(existingIds, prefix, year) {
  let max = 0;
  for (const id of existingIds || []) {
    const parsed = parsePublicId(id);
    if (!parsed) continue;
    if (parsed.prefix !== prefix || parsed.year !== Number(year)) continue;
    if (parsed.sequence > max) max = parsed.sequence;
  }
  return max + 1;
}

/**
 * @param {{
 *   notebookType: string,
 *   name?: string,
 *   periodStart?: string,
 *   periodEnd?: string,
 *   existingIds?: string[]
 * }} input
 * @returns {string}
 */
export function publicIdForNote(input) {
  const prefix = prefixFromNotebook(input.notebookType, input.name);
  const year = selectPublicIdYear(input.periodStart, input.periodEnd);
  const sequence = nextSequence(input.existingIds || [], prefix, year);
  return formatPublicId(prefix, year, sequence);
}

function compareNotesForSequence(a, b) {
  const aStart = String(a.periodStart || '');
  const bStart = String(b.periodStart || '');
  if (aStart && bStart && aStart !== bStart) return aStart < bStart ? 1 : -1;
  if (aStart && !bStart) return -1;
  if (!aStart && bStart) return 1;
  const aName = String(a.name || '');
  const bName = String(b.name || '');
  if (aName < bName) return -1;
  if (aName > bName) return 1;
  return 0;
}

/**
 * 기존 노트 전체에 public_id를 다시 매긴다. (prefix+year 안에서 시작일 내림차순)
 * @param {Array<{ id?: string, name: string, notebookType: string, periodStart?: string, periodEnd?: string }>} notes
 * @returns {Array<{ id?: string, name: string, prefix: string, year: number, publicId: string }>}
 */
export function assignPublicIdsToNotes(notes) {
  const prepared = (notes || []).map((note, index) => ({
    ...note,
    index,
    prefix: prefixFromNotebook(note.notebookType, note.name),
    year: selectPublicIdYear(note.periodStart, note.periodEnd)
  }));

  const groups = new Map();
  for (const note of prepared) {
    const key = `${note.prefix}-${note.year}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(note);
  }

  const assigned = new Array(prepared.length);
  for (const group of groups.values()) {
    group.sort(compareNotesForSequence);
    group.forEach((note, seqIndex) => {
      assigned[note.index] = {
        id: note.id,
        name: note.name,
        notebookType: note.notebookType,
        periodStart: note.periodStart,
        periodEnd: note.periodEnd,
        prefix: note.prefix,
        year: note.year,
        publicId: formatPublicId(note.prefix, note.year, seqIndex + 1)
      };
    });
  }
  return assigned;
}
