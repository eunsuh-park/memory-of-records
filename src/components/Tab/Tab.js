/**
 * Tab
 *
 * 뷰 전환용 텍스트 탭. Button·FilterChip과 목적이 다르다.
 * - Button: 액션(제출·아이콘)
 * - FilterChip: 필터 토글(라벨 + 개수)
 * - Tab: 같은 계층의 뷰를 고르는 한 칸 (Timeline / By type / Favorites)
 *
 * Figma 상태: default · hover · pressed(클릭 순간, 이름 없는 variant) · selected
 * 링크형(href)과 버튼형(href 없음)을 모두 지원한다.
 */

import './Tab.css';

/**
 * @param {Object} options
 * @param {string} options.label - 탭 라벨
 * @param {string} [options.href] - 지정하면 <a data-link>, 없으면 <button>
 * @param {boolean} [options.selected=false] - 선택 상태
 * @param {'default'|'hover'|'pressed'|''} [options.previewState] - UiLab에서 상태를 고정 표시
 * @param {string} [options.className]
 * @param {Record<string, string>} [options.dataset]
 * @returns {string} HTML 문자열
 */
export function render(options = {}) {
  const {
    label = '',
    href = '',
    selected = false,
    previewState = '',
    className = '',
    dataset = null
  } = options;

  const classes = ['tab'];
  if (selected) classes.push('is-selected');
  if (previewState === 'hover') classes.push('is-hover');
  if (previewState === 'pressed') classes.push('is-pressed');
  if (previewState === 'default' || previewState === 'hover' || previewState === 'pressed') {
    classes.push('tab--preview');
  }
  if (className) classes.push(className);

  const dataAttrs = Object.entries(dataset || {})
    .map(([key, value]) => ` data-${key}="${value}"`)
    .join('');
  const selectedAttr = selected ? ' aria-current="page"' : '';
  const inner = `<span class="tab__label">${label}</span>`;

  if (href) {
    return `<a href="${href}" class="${classes.join(' ')}" data-link${selectedAttr}${dataAttrs}>${inner}</a>`;
  }

  return `<button type="button" class="${classes.join(' ')}" aria-pressed="${selected}"${dataAttrs}>${inner}</button>`;
}

/**
 * Tab 여러 개를 가로로 묶는 리스트.
 *
 * @param {Array<Object>} items - render()에 넘기는 옵션 배열
 * @param {{ className?: string, ariaLabel?: string }} [options]
 * @returns {string} HTML 문자열
 */
export function renderList(items = [], options = {}) {
  const { className = '', ariaLabel = '' } = options;
  const classes = ['tab-list'];
  if (className) classes.push(className);
  const labelAttr = ariaLabel ? ` role="group" aria-label="${ariaLabel}"` : '';

  return `<div class="${classes.join(' ')}"${labelAttr}>${items.map((item) => render(item)).join('')}</div>`;
}
