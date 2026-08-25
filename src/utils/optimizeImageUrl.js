/**
 * Cloudinary delivery URL 최적화
 * 기존 Cloudinary URL에 f_auto (webp/avif 자동), q_auto (용량 자동 압축), 모바일용 크기 제한 추가
 * @see https://cloudinary.com/documentation/image_transformations
 * @see https://cloudinary.com/documentation/resizing_and_cropping
 */

/**
 * 모바일 기기 여부 감지 (화면 너비 768px 이하)
 * @returns {boolean}
 */
function isMobileDevice() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 768;
}

/**
 * 태블릿 기기 여부 감지 (화면 너비 1024px 이하)
 * @returns {boolean}
 */
function isTabletDevice() {
  if (typeof window === 'undefined') return false;
  return window.innerWidth <= 1024 && window.innerWidth > 768;
}

/**
 * Cloudinary delivery URL에 최적화 변환 파라미터 삽입
 * - f_auto: webp/avif 자동 선택
 * - q_auto: 용량 자동 압축
 * - w_xxx: 화면 크기에 맞는 너비 제한 (모바일 800, 태블릿 1200, 데스크톱 1600)
 * - c_limit: 원본보다 크게 확대하지 않음
 * - dpr_auto: 레티나 디스플레이 대응
 * 
 * @param {string|null|undefined} url - 원본 이미지 URL
 * @param {{ maxWidth?: number, quality?: 'auto'|'auto:low'|'auto:good'|'auto:best' }} [options] - 최적화 옵션
 * @returns {string|null} 최적화된 URL 또는 원본
 */
export function optimizeImageUrl(url, options = {}) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Cloudinary delivery URL (image/upload/...) 만 처리
  const cloudinaryUploadMatch = trimmed.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i
  );
  if (!cloudinaryUploadMatch) return trimmed;

  const [, prefix, rest] = cloudinaryUploadMatch;

  // 이미 변환 파라미터가 있으면 그대로 반환 (중복 적용 방지)
  if (/f_auto|q_auto|w_\d+|dpr_auto/i.test(rest)) return trimmed;

  // 화면 크기별 최적 너비 설정
  const maxWidth = options.maxWidth || (() => {
    if (isMobileDevice()) return 800;
    if (isTabletDevice()) return 1200;
    return 1600;
  })();

  const quality = options.quality || 'auto:good';

  // Cloudinary transformation 파라미터 조합
  // w_xxx: 최대 너비, c_limit: 원본보다 크게 안 함, f_auto: 포맷 자동, q_auto: 품질 자동, dpr_auto: 레티나 대응
  const transformations = [
    `w_${maxWidth}`,
    'c_limit',
    'f_auto',
    `q_${quality}`,
    'dpr_auto'
  ].join(',');

  return `${prefix}${transformations}/${rest}`;
}

/**
 * 썸네일용 최적화 (갤러리, 카드 등)
 * @param {string|null|undefined} url - 원본 이미지 URL
 * @param {number} [maxWidth=400] - 최대 너비
 * @returns {string|null}
 */
export function optimizeThumbnailUrl(url, maxWidth = 400) {
  return optimizeImageUrl(url, { 
    maxWidth, 
    quality: 'auto:good'
  });
}
