/**
 * DropdownMenu
 *
 * 커스텀 드롭다운의 목록 패널과 항목. 트리거는 DropdownChip.
 * Button 세 갈래와 목적이 달라 별도 컴포넌트로 둔다.
 *
 * 항목 상태: default · hover · selected · active-hover.
 * 패널·항목 에셋만 두고, 트리거와 묶는 목록 동작은 다음 작업에서 붙인다.
 */

import './DropdownMenu.css';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {Object} options
 * @param {string} [options.label]
 * @param {boolean} [options.selected=false]
 * @param {string} [options.ariaLabel]
 * @param {string} [options.id]
 * @param {string} [options.className]
 * @param {boolean} [options.disabled]
 * @param {Record<string, string>} [options.dataset]
 * @returns {string} HTML 문자열
 */
export function renderItem(options = {}) {
  const {
    label = '',
    selected = false,
    ariaLabel = '',
    id = '',
    className = '',
    disabled = false,
    dataset = null
  } = options;

  const classes = ['dropdown-menu__item'];
  if (selected) classes.push('is-selected');
  if (className) classes.push(className);

  const safeLabel = escapeHtml(label);
  const labelAttr = ariaLabel ? escapeHtml(ariaLabel) : safeLabel;
  const attrs = [
    'type="button"',
    `class="${classes.join(' ')}"`,
    'role="option"',
    `aria-selected="${selected ? 'true' : 'false'}"`,
    id ? `id="${escapeHtml(id)}"` : '',
    labelAttr ? `aria-label="${labelAttr}"` : '',
    disabled ? 'disabled' : '',
    ...Object.entries(dataset || {}).map(
      ([key, value]) => `data-${key}="${escapeHtml(value)}"`
    )
  ].filter(Boolean);

  return `<button ${attrs.join(' ')}><span class="dropdown-menu__label">${safeLabel}</span></button>`;
}

/**
 * 목록 패널 껍데기. 안쪽 HTML은 호출 쪽에서 넣는다.
 *
 * @param {Object} options
 * @param {string} [options.content]
 * @param {string} [options.className]
 * @param {string} [options.ariaLabel]
 * @param {Record<string, string>} [options.dataset]
 * @returns {string} HTML 문자열
 */
export function renderPanel(options = {}) {
  const { content = '', className = '', ariaLabel = '', dataset = null } = options;
  const classes = ['dropdown-menu'];
  if (className) classes.push(className);
  const attrs = [
    `class="${classes.join(' ')}"`,
    'role="listbox"',
    ariaLabel ? `aria-label="${escapeHtml(ariaLabel)}"` : '',
    ...Object.entries(dataset || {}).map(
      ([key, value]) => `data-${key}="${escapeHtml(value)}"`
    )
  ].filter(Boolean);
  return `<div ${attrs.join(' ')}>${content}</div>`;
}
