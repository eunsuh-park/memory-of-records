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
 * 파일 선택 버튼(숨은 input + 라벨) + 파일명·용량·상태 칩·지우기
 * @param {Object} config
 * @param {string} config.name - input name
 * @param {string} [config.pickLabel='파일 선택']
 * @param {string} [config.accept]
 * @param {boolean} [config.multiple]
 * @param {string} [config.fileName='']
 * @param {string} [config.fileSize='']
 * @param {''|'converting'|'done'} [config.chip='']
 * @param {string} [config.labelAttr]
 * @returns {string}
 */
export function renderPicker(config = {}) {
  const {
    name,
    pickLabel = '파일 선택',
    accept = '',
    multiple = false,
    fileName = '',
    fileSize = '',
    chip = '',
    labelAttr = ''
  } = config;

  const hasFile = Boolean(fileName);
  const chipKind = chip === 'converting' || chip === 'done' ? chip : '';
  const chipLabel = chipKind === 'converting' ? '변환중' : chipKind === 'done' ? '완료' : '';
  const chipClass = chipKind ? ` upload-chip--${chipKind}` : '';

  return `
    <div class="upload-pick-row">
      <label class="upload-pick">
        <span ${labelAttr}>${escapeHtml(pickLabel)}</span>
        <input type="file" ${attr('name', name)}${accept ? ` accept="${escapeHtml(accept)}"` : ''}${
          multiple ? ' multiple' : ''
        } hidden />
      </label>
      <div class="upload-pick__meta"${hasFile ? '' : ' hidden'}>
        <span class="upload-pick__name" data-file-name>${escapeHtml(fileName)}</span>
        <span class="upload-pick__size" data-file-size${fileSize ? '' : ' hidden'}>${escapeHtml(
          fileSize
        )}</span>
        <span class="upload-chip${chipClass}" data-file-chip role="status"${
          chipKind ? '' : ' hidden'
        }>${chipLabel}</span>
        ${renderButton({
          shape: 'circle',
          size: 's',
          role: 'close',
          tone: 'ghost',
          ariaLabel: '선택한 파일 지우기',
          title: '선택한 파일 지우기',
          content: MINGCUTE.closeLine,
          className: 'upload-pick__clear',
          dataset: { action: 'clear-file' }
        })}
      </div>
    </div>`;
}

const CHIP_LABEL = { converting: '변환중', done: '완료' };

/**
 * 피커 행의 파일명·용량·칩을 맞춘다.
 * @param {ParentNode|null} root
 * @param {{ fileName?: string, fileSize?: string, chip?: ''|'converting'|'done' }} meta
 */
export function setPickerMeta(root, meta = {}) {
  if (!root) return;
  const wrap = root.querySelector('.upload-pick__meta');
  const nameEl = root.querySelector('[data-file-name]');
  const sizeEl = root.querySelector('[data-file-size]');
  const chipEl = root.querySelector('[data-file-chip]');
  const fileName = String(meta.fileName || '').trim();
  const fileSize = String(meta.fileSize || '').trim();
  const chip = meta.chip === 'converting' || meta.chip === 'done' ? meta.chip : '';
  if (wrap) wrap.hidden = !fileName;
  if (nameEl) nameEl.textContent = fileName;
  if (sizeEl) {
    sizeEl.textContent = fileSize;
    sizeEl.hidden = !fileSize;
  }
  if (chipEl) {
    chipEl.hidden = !chip;
    chipEl.textContent = chip ? CHIP_LABEL[chip] : '';
    chipEl.classList.toggle('upload-chip--converting', chip === 'converting');
    chipEl.classList.toggle('upload-chip--done', chip === 'done');
  }
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

function coverBadgeHtml(name, checked, label) {
  return `
    <label class="upload-item__cover">
      <input type="checkbox" name="${escapeHtml(name)}" ${checked ? 'checked' : ''} />
      <span class="upload-item__cover-badge">
        ${MINGCUTE.checkLine}
        <span>${escapeHtml(label)}</span>
      </span>
    </label>`;
}

/**
 * 미리보기 항목들
 * @param {Array<{ id: string, dataUrl: string, label?: string, pageNumber?: number }>} items
 * @param {{
 *   startPage?: number,
 *   emptyText?: string,
 *   showActions?: boolean,
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
    showActions = true,
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
      const pageNumber = Number.isFinite(Number(item.pageNumber))
        ? Number(item.pageNumber)
        : startPage + index;
      const coverHtml = [
        isFirst && showFirst ? coverBadgeHtml('firstPageIsCover', firstChecked, '표지') : '',
        isLast && showLast ? coverBadgeHtml('lastPageIsCover', lastChecked, '표지') : ''
      ].join('');
      const actionsHtml = showActions
        ? `<div class="upload-item__actions">
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
          </div>`
        : '';

      return `
      <li class="upload-item${coverHtml ? ' upload-item--cover' : ''}" data-id="${escapeHtml(item.id)}">
        <div class="upload-item__frame">
          ${coverHtml}
          <img src="${escapeHtml(item.dataUrl)}" alt="" />
          <span class="upload-item__page">${escapeHtml(`${pageNumber}p`)}</span>
        </div>
        ${actionsHtml}
      </li>`;
    })
    .join('');
}
