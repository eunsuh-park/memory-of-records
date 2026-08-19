/**
 * Select (드롭다운)
 *
 * <select> 마크업을 한곳에서 만든다. options는 문자열 배열과
 * { value, label } 객체 배열을 모두 받는다.
 */

import { attr, classNames, escapeHtml, normalizeOptions } from '../../utils/html.js';
import './Select.css';

/**
 * <option> 목록만 생성 (비동기로 옵션을 갱신할 때 재사용)
 * @param {Array<string|{value: string, label: string}>} options
 * @param {{ placeholder?: string, selected?: string }} [config]
 * @returns {string}
 */
export function renderOptions(options = [], config = {}) {
  const { placeholder = '', selected = '' } = config;
  const list = normalizeOptions(options);
  /* 저장된 값이 옵션 목록에 없으면(Notion에서 지워진 값 등) 목록에 덧붙여 보존 */
  if (selected && !list.some((opt) => opt.value === selected)) {
    list.push({ value: selected, label: selected });
  }

  const html = list.map((opt) => {
    const isSelected = String(opt.value) === String(selected) ? ' selected' : '';
    return `<option value="${escapeHtml(opt.value)}"${isSelected}>${escapeHtml(
      opt.label ?? opt.value
    )}</option>`;
  });

  if (placeholder) {
    html.unshift(`<option value="">${escapeHtml(placeholder)}</option>`);
  }
  return html.join('');
}

/**
 * @param {Object} config
 * @param {string} [config.name]
 * @param {string} [config.value] - 선택된 값
 * @param {Array<string|{value: string, label: string}>} [config.options]
 * @param {string} [config.placeholder] - 빈 값 옵션 라벨
 * @param {string} [config.ariaLabel]
 * @param {string} [config.id]
 * @param {string} [config.className]
 * @param {boolean} [config.required]
 * @param {boolean} [config.disabled]
 * @returns {string} HTML 문자열
 */
export function render(config = {}) {
  const {
    name = '',
    value = '',
    options = [],
    placeholder = '',
    ariaLabel = '',
    id = '',
    className = '',
    required = false,
    disabled = false
  } = config;

  const attrs = [
    attr('class', classNames('select', className)),
    attr('name', name),
    attr('id', id),
    attr('aria-label', ariaLabel),
    required ? 'required' : '',
    disabled ? 'disabled' : ''
  ].filter(Boolean);

  return `<select ${attrs.join(' ')}>${renderOptions(options, {
    placeholder,
    selected: value
  })}</select>`;
}
