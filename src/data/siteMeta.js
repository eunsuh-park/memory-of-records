/**
 * 사이트·공유 미리보기(OG)에 쓰는 이름·소개 문구
 * 클라이언트(탭 제목)와 서버(shareHtml)가 같이 읽는다.
 */

export const SITE_NAME = 'Memory of Records';

/** 짧은 한 줄. 노트 메모가 없을 때 미리보기 설명으로 쓴다. */
export const SITE_TAGLINE = '창작의 씨앗인 아날로그 기록들을 아카이브하는 공간';

/** 홈·검색용 조금 더 긴 설명 */
export const SITE_DESCRIPTION =
  '2005년부터 사용해 온 아날로그 노트를 시기별·유형별로 정리한 개인 아카이브입니다.';

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
