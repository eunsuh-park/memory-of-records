/**
 * 공유 미리보기용 Cloudinary 이미지 URL
 * 크롤러는 webp/avif보다 JPG를 잘 받고, 권장 크기는 1200×630이다.
 */

import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, siteOrigin } from '../../src/data/siteMeta.js';

/* g_auto는 AI 애드온이 없으면 400이 나 카톡 섬네일이 회색이 된다. 표지는 세로라 pad가 안전하다. */
export const OG_TRANSFORM = `c_pad,b_rgb:111111,w_${OG_IMAGE_WIDTH},h_${OG_IMAGE_HEIGHT},f_jpg,q_80`;

const NOTEBOOKS_ROOT = 'notebooks';
const COVER_FRONT = 'cover_front';

/** 카톡이 노트 섬네일을 다시 받도록 프록시 URL에 붙이는 쿼리 */
export const NOTE_OG_IMAGE_CACHE = '3';

function isTransformSegment(segment) {
  const seg = String(segment || '');
  if (!seg || /^v\d+$/i.test(seg)) return false;
  return /[,=]/.test(seg) || /^(c_|w_|h_|f_|q_|g_|dpr_|b_|e_)/i.test(seg);
}

/** upload/ 뒤의 변환 파라미터만 걷어 내고 원본 경로를 남긴다. */
export function stripCloudinaryTransforms(rest) {
  let path = String(rest || '').replace(/^\/+/, '');
  while (path) {
    const slash = path.indexOf('/');
    if (slash < 0) break;
    const head = path.slice(0, slash);
    if (!isTransformSegment(head)) break;
    path = path.slice(slash + 1);
  }
  return path;
}

/**
 * @param {string|null|undefined} url
 * @param {string} fallbackAbsolute
 * @returns {string}
 */
export function toOgImageUrl(url, fallbackAbsolute) {
  const fallback = String(fallbackAbsolute || '').trim();
  const raw = String(url || '').trim();
  if (!raw) return fallback;

  const match = raw.match(/^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i);
  if (!match) {
    return /^https?:\/\//i.test(raw) ? raw : fallback;
  }

  const [, prefix, rest] = match;
  let source = stripCloudinaryTransforms(rest);
  try {
    source = decodeURIComponent(source);
  } catch {
    /* 퍼센트 인코딩이 아니면 그대로 둔다 */
  }
  if (!source) return fallback;
  return `${prefix}${OG_TRANSFORM}/${source}`;
}

/** @param {string|null|undefined} url */
export function cloudNameFromUrl(url) {
  const match = String(url || '').match(/res\.cloudinary\.com\/([^/]+)\//i);
  return match ? match[1] : '';
}

/**
 * Notion public_id로 실제 표지 경로를 만든다.
 * cover_front_url은 예전 파일명이라 404가 나는 경우가 많다.
 * @param {string|null|undefined} publicId
 * @param {string|null|undefined} cloudName
 * @param {string} [fallbackAbsolute]
 */
export function toOgImageUrlFromPublicId(publicId, cloudName, fallbackAbsolute = '') {
  const id = String(publicId || '').trim();
  const name = String(cloudName || '').trim();
  const fallback = String(fallbackAbsolute || '').trim();
  if (!id || !name) return fallback;
  return `https://res.cloudinary.com/${name}/image/upload/${OG_TRANSFORM}/${NOTEBOOKS_ROOT}/${id}/${COVER_FRONT}`;
}

/**
 * 표지 JPG 후보. public_id 경로를 먼저 쓰고, 죽은 Notion 파일 URL은 뒤로 둔다.
 * @param {{ publicId?: string, coverFrontUrl?: string|null }|null|undefined} note
 * @param {string} [fallbackAbsolute]
 * @param {string} [cloudName]
 * @returns {string[]}
 */
export function coverOgCandidateUrls(note, fallbackAbsolute = '', cloudName = '') {
  const urls = [];
  const coverUrl = note?.coverFrontUrl || '';
  const name = String(cloudName || '').trim() || cloudNameFromUrl(coverUrl);
  const fromId = toOgImageUrlFromPublicId(note?.publicId, name);
  if (fromId) urls.push(fromId);
  const fromFile = toOgImageUrl(coverUrl, '');
  if (fromFile && !urls.includes(fromFile)) urls.push(fromFile);
  const fallback = String(fallbackAbsolute || '').trim();
  if (fallback && !urls.includes(fallback)) urls.push(fallback);
  return urls;
}

/**
 * 카톡은 우리 도메인의 이미지는 받고 Cloudinary 404는 회색으로 그린다.
 * 노트 og:image는 같은 출처 프록시를 가리킨다.
 * @param {string} origin
 * @param {string} slug
 */
export function noteOgImageProxyUrl(origin, slug) {
  const base = String(origin || siteOrigin()).replace(/\/$/, '');
  const safeSlug = String(slug || '').trim();
  if (!base || !safeSlug) return '';
  const query = new URLSearchParams({ slug: safeSlug, v: NOTE_OG_IMAGE_CACHE });
  return `${base}/api/ogImage?${query}`;
}
