/**
 * Cloudinary delivery URL 최적화
 * 기존 Cloudinary URL에 f_auto (webp/avif 자동), q_auto (용량 자동 압축) 추가
 * @see https://cloudinary.com/documentation/image_transformations#automatic_format_selection_f_auto
 */

/**
 * Cloudinary delivery URL에 f_auto,q_auto 변환 파라미터 삽입
 * @param {string|null|undefined} url - 원본 이미지 URL
 * @returns {string|null} 최적화된 URL 또는 원본
 */
export function optimizeImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  // Cloudinary delivery URL (image/upload/...) 만 처리
  const cloudinaryUploadMatch = trimmed.match(
    /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/i
  );
  if (!cloudinaryUploadMatch) return trimmed;

  const [, prefix, rest] = cloudinaryUploadMatch;

  // 이미 f_auto 또는 q_auto 가 있으면 그대로 반환
  if (/f_auto|q_auto/i.test(rest)) return trimmed;

  return `${prefix}f_auto,q_auto/${rest}`;
}
