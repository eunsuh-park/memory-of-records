/**
 * ImageSkeleton
 * 이미지가 오기 전에 자리를 지키는 임시 면.
 * 버튼·칩과 목적이 달라 전용 컴포넌트로 둔다.
 */
import { classNames } from '../../utils/html.js';
import './ImageSkeleton.css';

/**
 * @param {Object} [options]
 * @param {number} [options.aspectRatio=0.72] - 가로/세로. 노트 size가 없으면 A5에 가깝게
 * @param {string} [options.className]
 * @returns {string} HTML
 */
export function render(options = {}) {
  const { aspectRatio = 0.72, className = '' } = options;
  const ratio = Number(aspectRatio);
  const safeRatio = Number.isFinite(ratio) && ratio > 0.15 && ratio < 4 ? ratio : 0.72;
  return `<span class="${classNames(
    'image-skeleton',
    className
  )}" style="aspect-ratio: ${safeRatio}" aria-hidden="true"></span>`;
}
