/**
 * Confirm — 확인 모달 (Dialog 껍데기 + 설명문 + 보조/주요 액션)
 *
 * 페이지 추가 확인, 소스 선택처럼 「제목 + 설명 + (본문) + 액션」 패턴이 여기로 모인다.
 * 껍데기·닫기·딤은 Dialog가 맡고, 이 파일은 본문 슬롯만 조립한다.
 */

import { render as renderButton } from '../Button/Button.js';
import { open as openDialog, render as renderDialog } from '../Dialog/Dialog.js';
import { escapeHtml } from '../../utils/html.js';
import './Confirm.css';

const CONFIRM_CHOICES = new Set(['confirm', 'ok']);

/**
 * 확인 모달 본문만. Dialog 없이 슬롯 HTML이 필요할 때(페이지 추가 소스 선택 등) 쓴다.
 *
 * @param {{
 *   message?: string,
 *   messageHtml?: string,
 *   bodyHtml?: string,
 *   showActions?: boolean,
 *   cancelLabel?: string,
 *   confirmLabel?: string,
 *   cancelChoice?: string,
 *   confirmChoice?: string
 * }} [options]
 * @returns {string}
 */
export function renderBody(options = {}) {
  const {
    message = '',
    messageHtml = '',
    bodyHtml = '',
    showActions = true,
    cancelLabel = '나중에',
    confirmLabel = '확인',
    cancelChoice = 'later',
    confirmChoice = 'confirm'
  } = options;

  const text = messageHtml || (message ? escapeHtml(message) : '');
  const messageBlock = text ? `<p class="confirm-message">${text}</p>` : '';
  const actions = showActions
    ? `<div class="dialog-actions dialog-actions--stack">
        ${renderButton({
          shape: 'text',
          block: true,
          content: cancelLabel,
          dataset: { choice: cancelChoice }
        })}
        ${renderButton({
          shape: 'solid',
          content: confirmLabel,
          dataset: { choice: confirmChoice }
        })}
      </div>`
    : '';

  return `${messageBlock}${bodyHtml || ''}${actions}`;
}

/**
 * Confirm 전체 마크업 (Dialog 포함).
 *
 * @param {Parameters<typeof renderDialog>[0] & Parameters<typeof renderBody>[0]} [options]
 * @returns {string}
 */
export function render(options = {}) {
  const {
    title = '',
    titleId = '',
    className = '',
    panelClassName = 'dialog__panel--narrow',
    showClose = true,
    dimTone,
    message,
    messageHtml,
    bodyHtml,
    showActions,
    cancelLabel,
    confirmLabel,
    cancelChoice,
    confirmChoice
  } = options;

  return renderDialog({
    title,
    titleId,
    className: ['confirm', className].filter(Boolean).join(' '),
    panelClassName,
    showClose,
    dimTone,
    bodyHtml: renderBody({
      message,
      messageHtml,
      bodyHtml,
      showActions,
      cancelLabel,
      confirmLabel,
      cancelChoice,
      confirmChoice
    })
  });
}

/**
 * Confirm을 연다. 확인 선택은 onConfirm, 나머지 닫기(나중에·X·딤·ESC)는 onCancel.
 *
 * @param {Parameters<typeof render>[0] & {
 *   closeOnBackdrop?: boolean,
 *   closeOnEscape?: boolean,
 *   canClose?: () => boolean,
 *   onConfirm?: () => void,
 *   onCancel?: () => void,
 *   onClose?: () => void
 * }} [options]
 * @returns {{ overlay: HTMLElement, panel: HTMLElement, body: HTMLElement, close: () => void }}
 */
export function open(options = {}) {
  const { onConfirm, onCancel, onClose, ...renderOptions } = options;
  let confirmed = false;

  const dialog = openDialog({
    ...renderOptions,
    className: ['confirm', renderOptions.className].filter(Boolean).join(' '),
    panelClassName: renderOptions.panelClassName || 'dialog__panel--narrow',
    showClose: renderOptions.showClose !== false,
    bodyHtml: renderBody(renderOptions),
    onClose: () => {
      if (confirmed) onConfirm?.();
      else onCancel?.();
      onClose?.();
    }
  });

  dialog.overlay.addEventListener('click', (e) => {
    const btn = e.target?.closest?.('[data-choice]');
    if (!btn) return;
    confirmed = CONFIRM_CHOICES.has(btn.getAttribute('data-choice'));
    dialog.close();
  });

  return dialog;
}
