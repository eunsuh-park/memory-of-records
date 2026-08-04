/**
 * FormField — label + 라벨 텍스트 + 입력요소
 *
 * type
 *  - 'text' | 'password' | 'date' : <input>
 *  - 'textarea'                   : <textarea>
 *  - 'select'                     : Select 컴포넌트
 *  - 'colorRadioGroup'            : 색상 스와치 라디오 그룹
 *  - 'custom'                     : 파일 선택 등 임의 마크업(children)
 */

import { render as renderSelect } from '../Select/Select.js';
import './FormField.css';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** 이름이 없는 색상에도 안정적인 색을 주기 위한 해시 → hue */
function fallbackColor(name) {
  let hash = 0;
  const s = String(name || '');
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  return `hsl(${hash % 360} 42% 52%)`;
}

/**
 * 색상 스와치 라디오 목록만 생성 (옵션을 비동기로 갱신할 때 재사용)
 * @param {string[]} colors
 * @param {{ selected?: string, name?: string, colorMap?: Record<string, string>, lightNames?: string[] }} [config]
 * @returns {string}
 */
export function renderColorSwatches(colors = [], config = {}) {
  const { selected = '', name = 'color', colorMap = {}, lightNames = [] } = config;
  const list = [...colors];
  if (selected && !list.includes(selected)) list.push(selected);

  return list
    .map((colorName) => {
      const hex = colorMap[colorName] || fallbackColor(colorName);
      const checked = colorName === selected ? 'checked' : '';
      const isLight = lightNames.includes(colorName);
      return `
        <label class="field__swatch${isLight ? ' field__swatch--light' : ''}" title="${escapeHtml(colorName)}">
          <input type="radio" name="${escapeHtml(name)}" value="${escapeHtml(colorName)}" ${checked} />
          <span class="field__swatch-dot" style="--swatch-color:${escapeHtml(hex)}"></span>
          <span class="field__swatch-name">${escapeHtml(colorName)}</span>
        </label>`;
    })
    .join('');
}

/**
 * @param {Object} config
 * @param {'text'|'password'|'date'|'textarea'|'select'|'colorRadioGroup'|'custom'} [config.type='text']
 * @param {string} [config.label]
 * @param {string} [config.name]
 * @param {string} [config.value]
 * @param {boolean} [config.required] - 라벨 옆 * 표시 + required 속성
 * @param {string} [config.placeholder]
 * @param {string} [config.hint] - 입력요소 아래 작은 설명
 * @param {string} [config.className] - 필드 래퍼 추가 클래스
 * @param {string} [config.inputClassName] - 입력요소 추가 클래스
 * @param {boolean} [config.disabled]
 * @param {number} [config.rows=4] - textarea 전용
 * @param {string} [config.list] - input list 속성(datalist id)
 * @param {string} [config.autocomplete='off']
 * @param {string} [config.extra=''] - 입력요소 뒤에 덧붙일 마크업(datalist, 체크박스 등)
 * @param {Array<string|{value: string, label: string}>} [config.options] - select 전용
 * @param {string[]} [config.colors] - colorRadioGroup 전용
 * @param {Record<string, string>} [config.colorMap] - colorRadioGroup 전용
 * @param {string[]} [config.lightNames] - colorRadioGroup 전용(밝은 색 테두리 보정)
 * @param {string} [config.children] - custom 전용 마크업
 * @returns {string} HTML 문자열
 */
export function render(config = {}) {
  const {
    type = 'text',
    label = '',
    name = '',
    value = '',
    required = false,
    placeholder = '',
    hint = '',
    className = '',
    inputClassName = '',
    disabled = false,
    rows = 4,
    list = '',
    autocomplete = 'off',
    extra = '',
    options = [],
    colors = [],
    colorMap = {},
    lightNames = [],
    children = ''
  } = config;

  const wrapperClass = ['field', className].filter(Boolean).join(' ');
  const labelHtml = label
    ? `<span class="field__label">${escapeHtml(label)}${
        required ? ' <em class="field__req">*</em>' : ''
      }</span>`
    : '';
  const hintHtml = hint ? `<span class="field__hint">${escapeHtml(hint)}</span>` : '';

  if (type === 'colorRadioGroup') {
    return `
      <fieldset class="${wrapperClass} field--colors">
        <legend class="field__label">${escapeHtml(label)}</legend>
        <div class="field__swatches" role="radiogroup" aria-label="${escapeHtml(label)}">
          ${renderColorSwatches(colors, { selected: value, name: name || 'color', colorMap, lightNames })}
        </div>
        ${hintHtml}
      </fieldset>`;
  }

  if (type === 'custom') {
    return `
      <div class="${wrapperClass}">
        ${labelHtml}
        ${children}
        ${hintHtml}
      </div>`;
  }

  let control = '';
  if (type === 'select') {
    control = renderSelect({
      name,
      value,
      options,
      placeholder,
      required,
      disabled,
      className: inputClassName
    });
  } else if (type === 'textarea') {
    control = `<textarea class="${['field__textarea', inputClassName]
      .filter(Boolean)
      .join(' ')}" name="${escapeHtml(name)}" rows="${rows}"${
      placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''
    }${required ? ' required' : ''}${disabled ? ' disabled' : ''}>${escapeHtml(value)}</textarea>`;
  } else {
    control = `<input class="${['field__input', inputClassName]
      .filter(Boolean)
      .join(' ')}" type="${type}" name="${escapeHtml(name)}"${
      placeholder ? ` placeholder="${escapeHtml(placeholder)}"` : ''
    }${list ? ` list="${escapeHtml(list)}"` : ''} value="${escapeHtml(value)}"${
      required ? ' required' : ''
    }${disabled ? ' disabled' : ''} autocomplete="${escapeHtml(autocomplete)}" />`;
  }

  /* select/textarea/input 모두 label로 감싸 클릭 시 포커스가 옮겨가게 한다 */
  return `
    <label class="${wrapperClass}">
      ${labelHtml}
      ${control}
      ${extra}
      ${hintHtml}
    </label>`;
}
