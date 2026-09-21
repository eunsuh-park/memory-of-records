/**
 * 북마크 추가 일시 표시용
 */

/**
 * @param {unknown} value ISO 또는 unix
 * @returns {string} YYYY-MM-DD, 없으면 ''
 */
export function formatBookmarkedDate(value) {
  const s = String(value ?? '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  let d = null;
  if (/^\d{13}$/.test(s)) d = new Date(Number(s));
  else if (/^\d{10}$/.test(s)) d = new Date(Number(s) * 1000);
  else d = new Date(s);
  if (!d || Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}
