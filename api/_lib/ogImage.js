/**
 * 공유 미리보기용 Cloudinary 이미지 URL
 * 크롤러는 webp/avif보다 JPG를 잘 받고, 권장 크기는 1200×630이다.
 */

import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '../../src/data/siteMeta.js';

/* g_auto는 AI 애드온이 없으면 400이 나 카톡 섬네일이 회색이 된다. 표지는 세로라 pad가 안전하다. */
const OG_TRANSFORM = `c_pad,b_rgb:111111,w_${OG_IMAGE_WIDTH},h_${OG_IMAGE_HEIGHT},f_jpg,q_80`;

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
  const source = stripCloudinaryTransforms(rest);
  if (!source) return fallback;
  return `${prefix}${OG_TRANSFORM}/${source}`;
}
