/**
 * Cloudinary delivery URL 최적화
 * 기존 URL에 f_auto(webp/avif), q_auto, 용도별 너비 제한을 넣는다.
 * @see https://cloudinary.com/documentation/image_transformations
 */

const OWN_TRANSFORM_PART =
  /^(w_\d+|c_limit|f_auto|q_auto(?::[a-z]+)?|dpr_auto|e_blur:\d+)$/i;

/**
 * 우리가 붙인 최적화 세그먼트만 걷어 낸다.
 * 예: w_1000,c_limit,f_auto,q_auto:good,dpr_auto/v1/cover.png → v1/cover.png
 * @param {string} rest
 * @returns {string}
 */
export function stripOwnImageTransforms(rest) {
  const parts = String(rest || '')
    .split('/')
    .filter((part) => part !== '');
  while (parts.length) {
    const segment = parts[0];
    const tokens = segment.split(',');
    const ours = tokens.length > 0 && tokens.every((token) => OWN_TRANSFORM_PART.test(token));
    if (!ours) break;
    parts.shift();
  }
  return parts.join('/');
}

function viewportWidth() {
  if (typeof window === 'undefined') return 1024;
  return Number(window.innerWidth) || 1024;
}

/**
 * @param {'full'|'thumb'|'placeholder'} role
 * @returns {number}
 */
function defaultMaxWidth(role) {
  if (role === 'placeholder') return 32;
  const width = viewportWidth();
  if (role === 'thumb') {
    return width <= 768 ? 480 : 640;
  }
  return width <= 1024 ? 900 : 1600;
}

/**
 * Cloudinary delivery URL에 최적화 변환을 넣는다.
 * - f_auto: 브라우저가 되면 webp/avif
 * - q_auto: 용량 자동
 * - w_xxx,c_limit: 화면·용도에 맞는 너비. 원본보다 키우지 않음
 * 이미 최적화 세그먼트가 있으면 걷어 내고 이번 옵션으로 다시 붙인다.
 *
 * @param {string|null|undefined} url
 * @param {{
 *   maxWidth?: number,
 *   quality?: 'auto'|'auto:low'|'auto:good'|'auto:best',
 *   role?: 'full'|'thumb'|'placeholder'
 * }} [options]
 * @returns {string|null}
 */
export function optimizeImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  const cloudinaryUploadMatch = trimmed.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i
  );
  if (!cloudinaryUploadMatch) return trimmed;

  const [, prefix, rest] = cloudinaryUploadMatch;
  const path = stripOwnImageTransforms(rest);
  if (!path) return trimmed;

  const role = options.role === 'thumb' || options.role === 'placeholder' ? options.role : 'full';
  const parsedWidth = Number(options.maxWidth);
  const maxWidth = parsedWidth > 0 ? Math.floor(parsedWidth) : defaultMaxWidth(role);
  const quality =
    options.quality || (role === 'placeholder' ? 'auto:low' : 'auto:good');

  const segments = [`w_${maxWidth},c_limit`];
  if (role === 'placeholder') segments.push('e_blur:400');
  segments.push('f_auto', `q_${quality}`);

  return `${prefix}${segments.join('/')}/${path}`;
}

/**
 * 갤러리·카드용 작은 이미지
 * @param {string|null|undefined} url
 * @param {number} [maxWidth]
 * @returns {string|null}
 */
export function optimizeThumbnailUrl(url, maxWidth) {
  return optimizeImageUrl(url, {
    role: 'thumb',
    ...(Number(maxWidth) > 0 ? { maxWidth } : {})
  });
}

/**
 * 스켈레톤 자리에 깔 아주 작은 흐린 미리보기
 * @param {string|null|undefined} url
 * @returns {string|null}
 */
export function optimizePlaceholderUrl(url) {
  return optimizeImageUrl(url, { role: 'placeholder' });
}
