/**
 * 통일된 버튼 컴포넌트
 * variant: back | backInline | navPrev | navNext | icon | toolbar
 */

import './Button.css';

export const BACK_ARROW_SVG = `
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>
`;

/**
 * @param {Object} options
 * @param {'back'|'backInline'|'navPrev'|'navNext'|'icon'|'toolbar'} options.variant
 * @param {string} options.ariaLabel
 * @param {string} [options.id]
 * @param {string} [options.content] - inner HTML (아이콘/텍스트). back/backInline은 미지정 시 BACK_ARROW_SVG 사용
 * @param {'button'|'submit'} [options.type='button']
 * @param {string} [options.className] - 추가 클래스 (예: pdf-modal-close)
 * @param {boolean} [options.dataLink] - data-link 속성 (뒤로가기 등)
 * @returns {string} HTML 문자열
 */
export function render(options) {
  const {
    variant,
    ariaLabel,
    id = '',
    content = '',
    type = 'button',
    className = '',
    dataLink = false
  } = options;

  const baseClass = 'btn';
  let variantClass = `btn--${variant}`;
  // navPrev/navNext → btn--nav + btn--nav-prev / btn--nav-next (CSS와 일치)
  if (variant === 'navPrev') variantClass = 'btn--nav btn--nav-prev';
  else if (variant === 'navNext') variantClass = 'btn--nav btn--nav-next';
  const extra = [className].filter(Boolean).join(' ');
  const classAttr = [baseClass, variantClass, extra].filter(Boolean).join(' ');
  const idAttr = id ? ` id="${id}"` : '';
  const dataLinkAttr = dataLink ? ' data-link' : '';

  let inner = content;
  if ((variant === 'back' || variant === 'backInline') && !inner) {
    inner = BACK_ARROW_SVG;
  }

  if (variant === 'navPrev' || variant === 'navNext') {
    const iconMod = variant === 'navNext' ? ' btn__nav-icon--next' : '';
    inner = `<span class="btn__nav-icon${iconMod}">${inner}</span>`;
  }

  return `<button type="${type}" class="${classAttr}"${idAttr} aria-label="${ariaLabel}"${dataLinkAttr}>${inner}</button>`;
}
