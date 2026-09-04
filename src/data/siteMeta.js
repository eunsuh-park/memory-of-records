/**
 * 사이트·공유 미리보기(OG)에 쓰는 이름·소개 문구
 * 클라이언트(탭 제목)와 서버(shareHtml)가 같이 읽는다.
 */

export const SITE_NAME = 'Memory of Records';

/** 공유 미리보기·검색용 한 줄 소개 */
export const SITE_TAGLINE = '아날로그 기록의 아카이브 공간.';

/** 홈·검색 meta description. 미리보기와 같은 문구를 쓴다. */
export const SITE_DESCRIPTION = SITE_TAGLINE;

/** public/ 아래 기본 OG 이미지 (1200×630) */
export const DEFAULT_OG_IMAGE_PATH = '/og-default.jpg';

export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/**
 * @param {string} [noteTitle]
 * @param {unknown} [page]
 * @returns {string}
 */
export function formatNoteShareTitle(noteTitle, page) {
  const name = String(noteTitle || '').trim() || '노트';
  const pageNum = Math.floor(Number(page));
  if (Number.isFinite(pageNum) && pageNum >= 1) {
    return `${name} · ${pageNum}페이지 · ${SITE_NAME}`;
  }
  return `${name} · ${SITE_NAME}`;
}

/**
 * @param {string|null|undefined} description
 * @returns {string}
 */
export function formatNoteShareDescription(description) {
  const text = String(description || '').trim();
  return text || SITE_TAGLINE;
}
