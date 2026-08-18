/**
 * FilterChip
 *
 * Timeline / By type에서 시기·유형을 나누는 칩.
 * 라벨 + 개수, default / hover / selected.
 * PC는 가로 pill, 모바일은 세로 스택. Button과 목적이 달라 별도 컴포넌트로 둔다.
 *
 * 링크형(href 지정)과 버튼형(href 없음)을 모두 지원한다.
 */

import './FilterChip.css';

/**
 * @param {Object} options
 * @param {string} options.label - 칩 라벨
 * @param {string} [options.labelMobile] - 좁은 화면용 짧은 라벨 (지정 시 두 라벨을 함께 심고 CSS가 전환)
 * @param {number} [options.count] - 라벨 옆(PC) / 아래(모바일) 개수. 0 이하면 표시 안 함
 * @param {string} [options.href] - 지정하면 <a data-link>, 없으면 <button>
 * @param {boolean} [options.active=false] - 선택 상태
 * @param {'auto'|'pc'|'mobile'} [options.device='auto'] - auto는 뷰포트, pc/mobile은 레이아웃 고정 (Lab 프리뷰)
 * @param {string} [options.className]
 * @param {Record<string, string>} [options.dataset]
 * @returns {string} HTML 문자열
 */
export function render(options = {}) {
  const {
    label = '',
    labelMobile = '',
    count = 0,
    href = '',
    active = false,
    device = 'auto',
    className = '',
    dataset = null
  } = options;

  const classes = ['chip'];
  if (active) classes.push('is-active');
  if (className) classes.push(className);

  const labelHtml = labelMobile
    ? `<span class="chip__label chip__label--desktop">${label}</span>` +
      `<span class="chip__label chip__label--mobile">${labelMobile}</span>`
    : `<span class="chip__label">${label}</span>`;
  const countHtml = count > 0 ? `<span class="chip__count">${count}</span>` : '';
  const inner = `<span class="chip__content">${labelHtml}${countHtml}</span>`;
  /* 잘린 라벨용 네이티브 툴팁 — HTML 태그 제거한 평문 */
  const titleText = String(label || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/"/g, '&quot;');
  const titleAttr = titleText ? ` title="${titleText}"` : '';
  const deviceAttr = device === 'pc' || device === 'mobile' ? ` data-device="${device}"` : '';
  const dataAttrs = Object.entries(dataset || {})
    .map(([key, value]) => ` data-${key}="${value}"`)
    .join('');

  if (href) {
    return `<a href="${href}" class="${classes.join(' ')}" data-link${
      active ? ' aria-current="page"' : ''
    }${deviceAttr}${titleAttr}${dataAttrs}>${inner}</a>`;
  }

  return `<button type="button" class="${classes.join(
    ' '
  )}" aria-pressed="${active}"${deviceAttr}${titleAttr}${dataAttrs}>${inner}</button>`;
}
