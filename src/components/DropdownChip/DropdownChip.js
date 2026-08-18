/**
 * DropdownChip
 *
 * 커스텀 드롭다운의 트리거 칩. 라벨 + 아래 화살표.
 * Button 세 갈래(circle·solid·text)와 목적이 달라 FilterChip처럼 별도 컴포넌트로 둔다.
 * 아이콘은 MingCute 세트만 쓴다.
 *
 * 상태: default · hover · active(열림) · selected(값 선택, 닫힘) · active-hover.
 * 목록은 DropdownMenu가 칩 아래에 붙인다. 열리면 화살표가 위로 뒤집힌다.
 */

import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import './DropdownChip.css';

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
 * @param {boolean} [options.open=false] - 목록이 열린 active 상태
 * @param {boolean} [options.selected=false] - 값이 선택된 닫힘 상태
 * @param {string} [options.ariaLabel]
 * @param {string} [options.id]
 * @param {string} [options.className]
 * @param {string} [options.controls] - aria-controls용 목록 id
 * @param {boolean} [options.disabled]
 * @param {Record<string, string>} [options.dataset]
 * @returns {string} HTML 문자열
 */
export function render(options = {}) {
  const {
    label = '',
    open = false,
    selected = false,
    ariaLabel = '',
    id = '',
    className = '',
    controls = '',
    disabled = false,
    dataset = null
  } = options;

  const classes = ['dropdown-chip'];
  if (open) classes.push('is-open');
  if (selected) classes.push('is-selected');
  if (className) classes.push(className);

  const safeLabel = escapeHtml(label);
  const labelAttr = ariaLabel ? escapeHtml(ariaLabel) : safeLabel;
  const attrs = [
    'type="button"',
    `class="${classes.join(' ')}"`,
    id ? `id="${escapeHtml(id)}"` : '',
    'aria-haspopup="listbox"',
    `aria-expanded="${open ? 'true' : 'false'}"`,
    controls ? `aria-controls="${escapeHtml(controls)}"` : '',
    labelAttr ? `aria-label="${labelAttr}"` : '',
    disabled ? 'disabled' : '',
    ...Object.entries(dataset || {}).map(
      ([key, value]) => `data-${key}="${escapeHtml(value)}"`
    )
  ].filter(Boolean);

  return `<button ${attrs.join(' ')}><span class="dropdown-chip__label">${safeLabel}</span><span class="dropdown-chip__icon" aria-hidden="true">${MINGCUTE.downLine}</span></button>`;
}
