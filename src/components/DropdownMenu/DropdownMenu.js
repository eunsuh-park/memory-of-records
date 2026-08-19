/**
 * DropdownMenu
 *
 * 커스텀 드롭다운 목록. 트리거는 DropdownChip, 항목은 26px pill.
 * 패널(.dropdown-menu)은 padding·gap 4px, radius 18px, 0.5px 보더.
 *
 * 항목 상태: default · hover · selected · active-hover.
 * render()는 칩+목록을 묶고, bind()가 열고 고르는 동작을 붙인다.
 */

import { render as renderChip } from '../DropdownChip/DropdownChip.js';
import { attr, classNames, dataAttrs, escapeHtml, normalizeOptions } from '../../utils/html.js';
import './DropdownMenu.css';

/**
 * @param {Object} options
 * @param {string} [options.label]
 * @param {string} [options.value]
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
    value = '',
    selected = false,
    ariaLabel = '',
    id = '',
    className = '',
    disabled = false,
    dataset = null
  } = options;

  const classes = classNames(
    'dropdown-menu__item',
    selected && 'is-selected',
    className
  );

  const safeLabel = escapeHtml(label);
  const labelAttr = ariaLabel ? escapeHtml(ariaLabel) : safeLabel;
  const data = { ...(dataset || {}) };
  if (data.value == null) data.value = value;
  const attrs = [
    'type="button"',
    attr('class', classes),
    'role="option"',
    `aria-selected="${selected ? 'true' : 'false'}"`,
    attr('id', id),
    labelAttr ? `aria-label="${labelAttr}"` : '',
    disabled ? 'disabled' : '',
    dataAttrs(data)
  ].filter(Boolean);

  return `<button ${attrs.join(' ')}><span class="dropdown-menu__label">${safeLabel}</span></button>`;
}

/**
 * 목록 패널(드롭박스). 안쪽 HTML은 호출 쪽에서 넣는다.
 *
 * @param {Object} options
 * @param {string} [options.content]
 * @param {string} [options.className]
 * @param {string} [options.id]
 * @param {string} [options.ariaLabel]
 * @param {boolean} [options.hidden]
 * @param {Record<string, string>} [options.dataset]
 * @returns {string} HTML 문자열
 */
export function renderPanel(options = {}) {
  const {
    content = '',
    className = '',
    id = '',
    ariaLabel = '',
    hidden = false,
    dataset = null
  } = options;
  const classes = classNames('dropdown-menu', className);
  const attrs = [
    attr('class', classes),
    'role="listbox"',
    attr('id', id),
    attr('aria-label', ariaLabel),
    hidden ? 'hidden' : '',
    dataAttrs(dataset)
  ].filter(Boolean);
  return `<div ${attrs.join(' ')}>${content}</div>`;
}

/**
 * 칩 + 드롭박스를 한 덩어리로 만든다.
 *
 * @param {Object} config
 * @param {string} [config.label] - 값이 없을 때 칩에 보여줄 라벨
 * @param {Array<string|{value: string, label: string}>} [config.options]
 * @param {string} [config.value]
 * @param {boolean} [config.open=false]
 * @param {string} [config.id]
 * @param {string} [config.className]
 * @param {string} [config.ariaLabel]
 * @param {boolean} [config.disabled]
 * @returns {string} HTML 문자열
 */
export function render(config = {}) {
  const {
    label = '',
    options = [],
    value = '',
    open = false,
    id = '',
    className = '',
    ariaLabel = '',
    disabled = false
  } = config;

  const list = normalizeOptions(options);
  const selected = list.find((opt) => String(opt.value) === String(value));
  const chipLabel = selected?.label ?? label;
  const listId = id ? `${id}-list` : '';
  const items = list
    .map((opt) =>
      renderItem({
        label: opt.label ?? opt.value,
        value: opt.value,
        selected: String(opt.value) === String(value)
      })
    )
    .join('');

  const classes = classNames('dropdown', open && 'is-open', className);
  const wrapAttrs = [attr('class', classes), attr('id', id)].filter(Boolean);

  return `<div ${wrapAttrs.join(' ')}>${renderChip({
    label: chipLabel,
    open,
    selected: Boolean(selected),
    ariaLabel,
    disabled,
    controls: listId
  })}${renderPanel({
    id: listId,
    ariaLabel: ariaLabel || chipLabel,
    hidden: !open,
    content: items
  })}</div>`;
}

function setOpen(root, open) {
  const chip = root.querySelector('.dropdown-chip');
  const panel = root.querySelector('.dropdown-menu');
  if (!chip || !panel) return;
  root.classList.toggle('is-open', open);
  chip.classList.toggle('is-open', open);
  chip.setAttribute('aria-expanded', String(open));
  if (open) panel.removeAttribute('hidden');
  else panel.setAttribute('hidden', '');
}

function closeOthers(root) {
  document.querySelectorAll('.dropdown.is-open').forEach((other) => {
    if (other !== root) setOpen(other, false);
  });
}

let documentBound = false;

function bindDocument() {
  if (documentBound) return;
  documentBound = true;
  document.addEventListener('click', (event) => {
    document.querySelectorAll('.dropdown.is-open').forEach((el) => {
      if (!el.contains(event.target)) setOpen(el, false);
    });
  });
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    document.querySelectorAll('.dropdown.is-open').forEach((el) => setOpen(el, false));
  });
}

/**
 * 칩 클릭으로 열고, 항목을 고르면 닫는다. 바깥 클릭·Esc도 닫힘.
 *
 * @param {HTMLElement|null} root - .dropdown 루트
 * @param {{ onChange?: (value: string, label: string) => void }} [handlers]
 * @returns {void}
 */
export function bind(root, handlers = {}) {
  if (!root || root.dataset.dropdownBound) return;
  const chip = root.querySelector(':scope > .dropdown-chip');
  const panel = root.querySelector(':scope > .dropdown-menu');
  if (!chip || !panel) return;
  root.dataset.dropdownBound = 'true';
  bindDocument();

  const { onChange } = handlers;

  chip.addEventListener('click', (event) => {
    event.stopPropagation();
    const next = chip.getAttribute('aria-expanded') !== 'true';
    if (next) closeOthers(root);
    setOpen(root, next);
  });

  panel.querySelectorAll('.dropdown-menu__item').forEach((item) => {
    item.addEventListener('click', (event) => {
      event.stopPropagation();
      panel.querySelectorAll('.dropdown-menu__item').forEach((other) => {
        const on = other === item;
        other.classList.toggle('is-selected', on);
        other.setAttribute('aria-selected', String(on));
      });
      const labelEl = chip.querySelector('.dropdown-chip__label');
      const label = item.querySelector('.dropdown-menu__label')?.textContent ?? '';
      if (labelEl) labelEl.textContent = label;
      chip.classList.add('is-selected');
      setOpen(root, false);
      if (typeof onChange === 'function') {
        onChange(item.getAttribute('data-value') || label, label);
      }
    });
  });
}
