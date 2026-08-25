/**
 * 뷰어에 보여줄 페이지 목록.
 * PDF 첫/마지막 장이 표지가 아니면, 노트 생성 때 올린 표지 이미지를 양 끝에 넣는다.
 */

/**
 * @param {unknown} value
 * @returns {boolean|null}
 */
export function parseCoverPageFlag(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return null;
  if (['true', 'yes', '1', 'on'].includes(s)) return true;
  if (['false', 'no', '0', 'off'].includes(s)) return false;
  return null;
}

/**
 * @param {{
 *   pages?: Array<{ pageNumber?: number, url?: string }>,
 *   coverFrontUrl?: string,
 *   coverBackUrl?: string,
 *   firstPageIsCover?: boolean|null,
 *   lastPageIsCover?: boolean|null
 * }} options
 * @returns {Array<{
 *   kind: 'page'|'cover-front'|'cover-back',
 *   url: string,
 *   pageNumber?: number
 * }>}
 */
export function buildViewerPageList(options = {}) {
  const inner = (Array.isArray(options.pages) ? options.pages : [])
    .map((page, index) => ({
      kind: 'page',
      url: String(page?.url || '').trim(),
      pageNumber: Math.floor(Number(page?.pageNumber) || index + 1)
    }))
    .filter((page) => page.url && page.pageNumber > 0);

  const frontUrl = String(options.coverFrontUrl || '').trim();
  const backUrl = String(options.coverBackUrl || '').trim();
  const list = [];

  if (options.firstPageIsCover === false && frontUrl) {
    list.push({ kind: 'cover-front', url: frontUrl });
  }
  list.push(...inner);
  if (options.lastPageIsCover === false && backUrl) {
    list.push({ kind: 'cover-back', url: backUrl });
  }
  return list;
}
