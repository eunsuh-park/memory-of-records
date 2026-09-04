/**
 * 사이트·공유 미리보기(OG)에 쓰는 이름·소개 문구
 * 클라이언트(탭 제목)와 서버(shareHtml)가 같이 읽는다.
 */

export const SITE_NAME = 'Memory of Records';

/** 공유 미리보기·검색용 한 줄 소개 */
export const SITE_TAGLINE = '아날로그 기록의 아카이브 공간.';

/** 홈·검색 meta description. 미리보기와 같은 문구를 쓴다. */
export const SITE_DESCRIPTION = SITE_TAGLINE;

/**
 * 공개 사이트 origin. 카톡 등 크롤러는 상대경로 og:image를 못 받아 회색 섬네일을 그린다.
 * 빌드/런타임 환경 변수가 있으면 그걸 쓰고, 없으면 프로덕션 도메인을 쓴다.
 */
export const SITE_ORIGIN_FALLBACK = 'https://memory-of-records.vercel.app';

/** 카톡 캐시를 깨기 위한 기본 이미지 쿼리 */
export const DEFAULT_OG_IMAGE_CACHE = 'v=2';

/** public/ 아래 기본 OG 이미지 경로 (1200×630) */
export const DEFAULT_OG_IMAGE_PATH = '/og-default.jpg';

function envSiteOrigin() {
  const candidates = [];
  if (typeof process !== 'undefined' && process.env) {
    candidates.push(process.env.VITE_SITE_ORIGIN, process.env.VERCEL_PROJECT_PRODUCTION_URL);
  }
  try {
    candidates.push(import.meta.env?.VITE_SITE_ORIGIN, import.meta.env?.VERCEL_PROJECT_PRODUCTION_URL);
  } catch {
    /* Node API 번들에서 import.meta.env가 없을 수 있다 */
  }
  for (const raw of candidates) {
    const host = String(raw || '')
      .trim()
      .replace(/^https?:\/\//i, '')
      .replace(/\/$/, '');
    if (host) return `https://${host}`;
  }
  return '';
}

/** @returns {string} https://… 사이트 origin */
export function siteOrigin() {
  return envSiteOrigin() || SITE_ORIGIN_FALLBACK;
}

/** @returns {string} 크롤러가 받을 절대경로 JPG */
export function defaultOgImageUrl() {
  return `${siteOrigin()}${DEFAULT_OG_IMAGE_PATH}?${DEFAULT_OG_IMAGE_CACHE}`;
}

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
