/**
 * 페이지 텍스트에서 일기 날짜를 뽑고, 날짜 없는 장은 직전 날짜로 채운다.
 * OCR(Tesseract) · PDF 추출 텍스트 · 이미 저장된 entry_date 모두 같은 규칙을 쓴다.
 */

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * @param {number|string} year
 * @param {number|string} month
 * @param {number|string} day
 * @returns {string} YYYY-MM-DD 또는 ''
 */
export function toIsoDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return '';
  }
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

export function expandTwoDigitYear(yy) {
  const n = Number(yy);
  if (!Number.isFinite(n) || n < 0 || n > 99) return null;
  /* 일기/노트 맥락: 50 이상 → 19xx, 미만 → 20xx */
  return n >= 50 ? 1900 + n : 2000 + n;
}

/**
 * Cloudinary 메타·폼 값용. YYYY-MM-DD만 통과한다.
 * @param {unknown} value
 * @returns {string}
 */
export function normalizeIsoDate(value) {
  if (value == null || value === '') return '';
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return '';
}

/**
 * @param {string} iso
 * @returns {number|null}
 */
export function yearFromIsoDate(iso) {
  const normalized = normalizeIsoDate(iso);
  if (!normalized) return null;
  return Number(normalized.slice(0, 4));
}

/**
 * OCR/추출 텍스트에서 첫 번째 유효 날짜를 YYYY-MM-DD로 뽑는다.
 * 연 없는 `7월 14일`은 options.fallbackYear가 있을 때만 쓴다.
 * @param {string} text
 * @param {{ fallbackYear?: number|null }} [options]
 * @returns {string}
 */
export function extractEntryDateFromOcr(text, options = {}) {
  const raw = String(text || '');
  if (!raw.trim()) return '';
  const fallbackYear = Number(options.fallbackYear);
  const hasFallbackYear = Number.isFinite(fallbackYear) && fallbackYear >= 1900 && fallbackYear <= 2100;

  for (const m of raw.matchAll(/(19|20)\d{2}\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)) {
    const year = m[0].match(/(19|20)\d{2}/)?.[0];
    const iso = toIsoDate(year, m[2], m[3]);
    if (iso) return iso;
  }

  for (const m of raw.matchAll(/(19|20)\d{2}\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/g)) {
    const year = m[0].match(/(19|20)\d{2}/)?.[0];
    const iso = toIsoDate(year, m[2], m[3]);
    if (iso) return iso;
  }

  for (const m of raw.matchAll(/(?<!\d)(\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})(?!\d)/g)) {
    const y = expandTwoDigitYear(m[1]);
    if (y == null) continue;
    const iso = toIsoDate(y, m[2], m[3]);
    if (iso) return iso;
  }

  if (hasFallbackYear) {
    for (const m of raw.matchAll(/(?<!\d)(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)) {
      const iso = toIsoDate(fallbackYear, m[1], m[2]);
      if (iso) return iso;
    }
  }

  return '';
}

/**
 * 페이지 배열을 번호순으로 돌며 날짜를 채운다.
 * 새 날짜가 나오면 last_valid를 갱신하고, 없으면 직전 날짜를 복사한다(Forward Fill).
 *
 * @param {Array<{ pageNumber?: number, entry_date?: string, ocr_text?: string }>} pages
 * @param {{ overwrite?: boolean }} [options] overwrite면 기존 entry_date를 무시하고 텍스트에서 다시 뽑는다
 * @returns {Array<{ pageNumber: number, entry_date: string, fill_status: 'extracted'|'forward_filled'|'null', ocr_text?: string }>}
 */
export function forwardFillEntryDates(pages, options = {}) {
  const overwrite = Boolean(options.overwrite);
  const sorted = [...(pages || [])].sort(
    (a, b) => Number(a?.pageNumber || 0) - Number(b?.pageNumber || 0)
  );
  let lastValid = '';

  return sorted.map((page) => {
    const pageNumber = Math.max(1, Math.floor(Number(page?.pageNumber) || 0)) || 1;
    const ocrText = page?.ocr_text;
    const storedRaw = String(page?.entry_date || '').trim();
    const storedIso = overwrite ? '' : normalizeIsoDate(storedRaw);
    const fallbackYear = yearFromIsoDate(lastValid);
    const fromStoredText =
      storedIso ||
      (!overwrite && storedRaw ? extractEntryDateFromOcr(storedRaw, { fallbackYear }) : '');
    const fromOcr = extractEntryDateFromOcr(ocrText || '', { fallbackYear });
    const extracted = fromStoredText || fromOcr;

    if (extracted) {
      lastValid = extracted;
      return {
        ...page,
        pageNumber,
        entry_date: extracted,
        fill_status: 'extracted'
      };
    }

    if (lastValid) {
      return {
        ...page,
        pageNumber,
        entry_date: lastValid,
        fill_status: 'forward_filled'
      };
    }

    return {
      ...page,
      pageNumber,
      entry_date: '',
      fill_status: 'null'
    };
  });
}
