/**
 * FilterChip
 *
 * 필터링 UI(시기·타입 탭 등)에서 쓰는 pill 형태 인터랙션 요소.
 * Button과 목적이 달라(선택 상태를 가진 필터 토글) 별도 컴포넌트로 둔다.
 *
 * 링크형(href 지정)과 버튼형(href 없음)을 모두 지원한다.
 */

import './FilterChip.css';

/**
 * @param {Object} options
 * @param {string} options.label - 칩 라벨
 * @param {string} [options.labelMobile] - 좁은 화면용 짧은 라벨 (지정 시 두 라벨을 함께 심고 CSS가 전환)
 * @param {number} [options.count] - 라벨 아래 표시할 개수 (0 이하면 표시 안 함)
 * @param {string} [options.href] - 지정하면 <a data-link>, 없으면 <button>
 * @param {boolean} [options.active=false] - 선택 상태
 * @param {'m'|'s'} [options.size='m']
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
    size = 'm',
    className = '',
    dataset = null
  } = options;

  const classes = ['chip', `chip--${size}`];
  if (active) classes.push('is-active');
  if (className) classes.push(className);

  const labelHtml = labelMobile
    ? `<span class="chip__label chip__label--desktop">${label}</span>` +
      `<span class="chip__label chip__label--mobile">${labelMobile}</span>`
    : `<span class="chip__label">${label}</span>`;
  const countHtml = count > 0 ? `<span class="chip__count">${count}</span>` : '';
  /* 잘린 라벨용 네이티브 툴팁 — HTML 태그 제거한 평문 */
  const titleText = String(label || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/"/g, '&quot;');
  const titleAttr = titleText ? ` title="${titleText}"` : '';
  const dataAttrs = Object.entries(dataset || {})
    .map(([key, value]) => ` data-${key}="${value}"`)
    .join('');

  if (href) {
    return `<a href="${href}" class="${classes.join(' ')}" data-link${
      active ? ' aria-current="page"' : ''
    }${titleAttr}${dataAttrs}>${labelHtml}${countHtml}</a>`;
  }

  return `<button type="button" class="${classes.join(' ')}" aria-pressed="${active}"${titleAttr}${dataAttrs}>${labelHtml}${countHtml}</button>`;
}
