/**
 * FileUploadPreview — 파일 선택 버튼 + 선택한 파일 미리보기 리스트(순서변경·삭제)
 *
 * 상태(선택된 파일 목록)는 호출하는 쪽이 들고 있고, 여기서는 마크업만 만든다.
 * 액션 버튼은 data-action(up/down/remove) + data-id로 위임 처리한다.
 */

import './FileUploadPreview.css';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

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
      <input type="file" name="${escapeHtml(name)}"${accept ? ` accept="${escapeHtml(accept)}"` : ''}${
        multiple ? ' multiple' : ''
      } hidden />
    </label>
    <span class="upload-pick__status" ${statusAttr}>${escapeHtml(statusText)}</span>`;
}

/** 빈 리스트 컨테이너 (내용은 renderList로 채운다) */
export function renderListContainer() {
  return '<ul class="upload-list"></ul>';
}

/**
 * 미리보기 항목들
 * @param {Array<{ id: string, dataUrl: string, label?: string }>} items
 * @param {{ startPage?: number, emptyText?: string }} [config]
 * @returns {string}
 */
export function renderList(items = [], config = {}) {
  const {
    startPage = 1,
    emptyText = '선택된 페이지가 없습니다. 이미지를 선택하면 미리보기가 표시됩니다.'
  } = config;

  if (!items.length) {
    /* 컨테이너가 <ul>이라 <p>가 아니라 <li>로 넣는다 */
    return `<li class="upload-list__empty">${escapeHtml(emptyText)}</li>`;
  }

  return items
    .map(
      (item, index) => `
      <li class="upload-item" data-id="${escapeHtml(item.id)}">
        <div class="upload-item__num">page-${String(startPage + index).padStart(6, '0')}</div>
        <img src="${escapeHtml(item.dataUrl)}" alt="" />
        <div class="upload-item__meta">
          <span class="upload-item__label">${escapeHtml(item.label || `${index + 1}`)}</span>
          <div class="upload-item__actions">
            <button type="button" class="upload-item__btn" data-action="up" data-id="${escapeHtml(item.id)}" ${
              index === 0 ? 'disabled' : ''
            } aria-label="위로">↑</button>
            <button type="button" class="upload-item__btn" data-action="down" data-id="${escapeHtml(item.id)}" ${
              index === items.length - 1 ? 'disabled' : ''
            } aria-label="아래로">↓</button>
            <button type="button" class="upload-item__btn upload-item__btn--danger" data-action="remove" data-id="${escapeHtml(
              item.id
            )}" aria-label="삭제">×</button>
          </div>
        </div>
      </li>`
    )
    .join('');
}
