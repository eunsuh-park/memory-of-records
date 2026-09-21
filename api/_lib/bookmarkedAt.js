/**
 * 북마크 추가 일시 (Cloudinary context.bookmarked_at)
 *
 * 값은 ISO 8601 또는 unix 초/밀리초. 정렬은 문자열이 아니라 정규화한 ISO로 한다.
 * 일시가 없는 기존 북마크는 앞쪽에 두고, 새로 추가한 페이지가 뒤에 붙게 한다.
 */

/**
 * @param {unknown} value
 * @returns {string|null} ISO 8601 또는 null
 */
export function normalizeBookmarkedAt(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{13}$/.test(s)) {
    const d = new Date(Number(s));
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (/^\d{10}$/.test(s)) {
    const d = new Date(Number(s) * 1000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d.toISOString();
  return null;
}

/**
 * 북마크 노트 페이지 순서: 추가 일시 오름차순(뒤에 붙임).
 * 일시가 같거나 없으면 entryDate → noteFolder → pageNumber.
 * @param {{ bookmarkedAt?: string|null, entryDate?: string|null, noteFolder?: string, pageNumber?: number }} a
 * @param {{ bookmarkedAt?: string|null, entryDate?: string|null, noteFolder?: string, pageNumber?: number }} b
 */
export function compareBookmarkedPages(a, b) {
  const ka = a?.bookmarkedAt || '';
  const kb = b?.bookmarkedAt || '';
  if (ka !== kb) return ka < kb ? -1 : 1;
  const da = a?.entryDate || '';
  const db = b?.entryDate || '';
  if (da && db && da !== db) return da < db ? -1 : 1;
  const fa = String(a?.noteFolder || '');
  const fb = String(b?.noteFolder || '');
  if (fa !== fb) return fa.localeCompare(fb, 'ko');
  return (Number(a?.pageNumber) || 0) - (Number(b?.pageNumber) || 0);
}
