/**
 * 업로드 성공 / 부분실패 / 실패 확인 Dialog
 * Primary 확인 버튼 하나. 본문에 짧은 결과 + 선택적 원인 한 줄.
 */

import { render as renderButton } from '../Button/Button.js';
import { open as openDialog } from './Dialog.js';

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * API/예외 문구를 Dialog에 넣을 한 줄로 줄인다.
 * @param {unknown} err
 * @returns {string}
 */
export function shortUploadError(err) {
  const raw = String(err?.message || err || '').trim();
  if (!raw) return '';
  const compact = raw.replace(/\s+/g, ' ');
  if (compact.length > 160) return `${compact.slice(0, 157)}…`;
  return compact;
}

/**
 * @param {{
 *   title?: string,
 *   message: string,
 *   detail?: string,
 *   onClose?: () => void
 * }} options
 */
export function openUploadResultDialog(options = {}) {
  const existing = document.querySelector('.upload-result-dialog');
  if (existing) {
    options.onClose?.();
    return;
  }

  const title = options.title || '업로드';
  const message = String(options.message || '').trim();
  const detail = String(options.detail || '').trim();

  const dialog = openDialog({
    title,
    titleId: 'upload-result-title',
    className: 'upload-result-dialog',
    panelClassName: 'upload-result-panel',
    showClose: false,
    bodyHtml: `
      <p class="upload-result-text">${escapeHtml(message)}</p>
      ${detail ? `<p class="upload-result-detail">${escapeHtml(detail)}</p>` : ''}
      <div class="upload-result-actions">
        ${renderButton({
          shape: 'solid',
          content: '확인',
          className: 'upload-result-ok',
          dataset: { choice: 'ok' }
        })}
      </div>`,
    onClose: () => options.onClose?.()
  });

  dialog.overlay.addEventListener('click', (e) => {
    if (e.target?.closest?.('[data-choice="ok"]')) dialog.close();
  });

  return dialog;
}
