/**
 * FileUploadPreview — 파일 선택 버튼 + 선택한 파일 미리보기 리스트(순서변경·삭제)
 *
 * 상태(선택된 파일 목록)는 호출하는 쪽이 들고 있고, 여기서는 마크업만 만든다.
 * 액션 버튼은 data-action(up/down/remove) + data-id로 위임 처리한다.
 */

import { render as renderButton } from '../Button/Button.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { attr, escapeHtml } from '../../utils/html.js';
import './FileUploadPreview.css';

/**
 * 파일 선택 버튼(숨은 input + 라벨) + 선택 상태 텍스트
 * @param {Object} config
 * @param {string} config.name - input name
 * @param {string} [config.pickLabel='파일 선택']
 * @param {string} [config.accept]
 * @param {boolean} [config.multiple]
 * @param {string} [config.statusText='선택된 파일 없음']
 * @param {string} [config.labelAttr] - 라벨 span에 붙일 data 속성 (예: 'data-image-pick-label')
 * @param {string} [config.statusAttr] - 상태 span에 붙일 data 속성 (예: 'data-image-name')
 * @returns {string}
 */
export function renderPicker(config = {}) {
  const {
    name,
    pickLabel = '파일 선택',
    accept = '',
    multiple = false,
    statusText = '선택된 파일 없음',
    labelAttr = '',
    statusAttr = ''
  } = config;

  return `
    <label class="upload-pick">
      <span ${labelAttr}>${escapeHtml(pickLabel)}</span>
      <input type="file" ${attr('name', name)}${accept ? ` accept="${escapeHtml(accept)}"` : ''}${
        multiple ? ' multiple' : ''
      } hidden />
    </label>
    <span class="upload-pick__status" ${statusAttr}>${escapeHtml(statusText)}</span>`;
}

function itemActionButton({ action, id, label, icon, extraClass = '', disabled = false }) {
  return renderButton({
    shape: 'circle',
    size: 's',
    role: 'icon',
    ariaLabel: label,
    title: label,
    content: icon,
    className: ['upload-item__btn', extraClass].filter(Boolean).join(' '),
    dataset: { action, id },
    disabled
  });
}

function coverCheckHtml(name, checked, label) {
  return `
    <label class="form-check upload-item__cover-check">
      <input type="checkbox" name="${escapeHtml(name)}" ${checked ? 'checked' : ''} />
      <span>${escapeHtml(label)}</span>
    </label>`;
}

/**
 * 미리보기 항목들
 * @param {Array<{ id: string, dataUrl: string, label?: string }>} items
 * @param {{
 *   startPage?: number,
 *   emptyText?: string,
 *   coverChecks?: {
 *     showFirst?: boolean,
 *     showLast?: boolean,
 *     firstChecked?: boolean,
 *     lastChecked?: boolean
 *   }|null
 * }} [config]
 * @returns {string}
 */
export function renderList(items = [], config = {}) {
  const {
    startPage = 1,
    emptyText = '선택된 페이지가 없습니다. 이미지를 선택하면 미리보기가 표시됩니다.',
    coverChecks = null
  } = config;

  if (!items.length) {
    /* 컨테이너가 <ul>이라 <p>가 아니라 <li>로 넣는다 */
    return `<li class="upload-list__empty">${escapeHtml(emptyText)}</li>`;
  }

  const showFirst = Boolean(coverChecks?.showFirst);
  const showLast = Boolean(coverChecks?.showLast);
  const firstChecked = coverChecks?.firstChecked !== false;
  const lastChecked = coverChecks?.lastChecked !== false;

  return items
    .map((item, index) => {
      const isFirst = index === 0;
      const isLast = index === items.length - 1;
      const coverHtml = [
        isFirst && showFirst
          ? coverCheckHtml('firstPageIsCover', firstChecked, '표지')
          : '',
        isLast && showLast
          ? coverCheckHtml('lastPageIsCover', lastChecked, '표지')
          : ''
      ].join('');

      return `
      <li class="upload-item${coverHtml ? ' upload-item--cover-check' : ''}" data-id="${escapeHtml(item.id)}">
        <div class="upload-item__num">page-${String(startPage + index).padStart(6, '0')}</div>
        <img src="${escapeHtml(item.dataUrl)}" alt="" />
        <div class="upload-item__meta">
          <span class="upload-item__label">${escapeHtml(item.label || `${index + 1}`)}</span>
          <div class="upload-item__actions">
            ${itemActionButton({
              action: 'up',
              id: item.id,
              label: '위로',
              icon: MINGCUTE.downLine,
              extraClass: 'upload-item__btn--up',
              disabled: index === 0
            })}
            ${itemActionButton({
              action: 'down',
              id: item.id,
              label: '아래로',
              icon: MINGCUTE.downLine,
              extraClass: 'upload-item__btn--down',
              disabled: index === items.length - 1
            })}
            ${itemActionButton({
              action: 'remove',
              id: item.id,
              label: '삭제',
              icon: MINGCUTE.closeLine,
              extraClass: 'upload-item__btn--danger'
            })}
          </div>
          ${coverHtml}
        </div>
      </li>`;
    })
    .join('');
}
