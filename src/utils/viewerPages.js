/**
 * 뷰어에 보여줄 페이지 목록.
 *
 * - firstPageIsCover === true  → 저장된 첫 장을 앞표지로 쓰고 본문 번호에서 뺀다.
 * - firstPageIsCover === false → 노트 생성 때 올린 cover_front 이미지를 맨 앞에 넣는다.
 * - lastPageIsCover 도 뒷표지에 동일.
 * - 플래그가 null 이면 끼워 넣지도, 승격하지도 않는다.
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
 *   pageNumber?: number,
 *   storedPageNumber?: number
 * }>}
 */
export function buildViewerPageList(options = {}) {
  const inner = (Array.isArray(options.pages) ? options.pages : [])
    .map((page, index) => ({
      url: String(page?.url || '').trim(),
      pageNumber: Math.floor(Number(page?.pageNumber) || index + 1)
    }))
    .filter((page) => page.url && page.pageNumber > 0);

  const frontUrl = String(options.coverFrontUrl || '').trim();
  const backUrl = String(options.coverBackUrl || '').trim();
  const usePdfFront = options.firstPageIsCover === true;
  const usePdfBack = options.lastPageIsCover === true;
  const insertFront = options.firstPageIsCover === false && Boolean(frontUrl);
  const insertBack = options.lastPageIsCover === false && Boolean(backUrl);

  const list = [];
  let start = 0;
  let end = inner.length;

  if (usePdfFront && inner.length) {
    const first = inner[0];
    list.push({
      kind: 'cover-front',
      url: first.url,
      storedPageNumber: first.pageNumber
    });
    start = 1;
  } else if (insertFront) {
    list.push({ kind: 'cover-front', url: frontUrl });
  }

  if (usePdfBack && end > start) {
    end -= 1;
  }

  let contentNumber = 1;
  for (let i = start; i < end; i += 1) {
    const page = inner[i];
    list.push({
      kind: 'page',
      url: page.url,
      pageNumber: contentNumber,
      storedPageNumber: page.pageNumber
    });
    contentNumber += 1;
  }

  if (usePdfBack && inner.length > start) {
    const last = inner[inner.length - 1];
    list.push({
      kind: 'cover-back',
      url: last.url,
      storedPageNumber: last.pageNumber
    });
  } else if (insertBack) {
    list.push({ kind: 'cover-back', url: backUrl });
  }

  return list;
}
