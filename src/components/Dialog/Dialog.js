/**
 * Dialog — 모달 껍데기 (Dim + panel + header + 닫기 버튼 + 본문 슬롯)
 *
 * 노트 추가/수정, 페이지 추가, 페이지 추가 확인, 페이지 정보 모달이 모두 이 구조를 쓴다.
 * 패널 너비·애니메이션처럼 모달마다 다른 부분은 className/panelClassName으로 덮는다.
 */

import { render as renderButton } from '../Button/Button.js';
import { render as renderDim } from '../Dim/Dim.js';
import './Dialog.css';

const CLOSE_ICON =
  "<svg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24'><path fill='currentColor' d='M15.889 6.697a1.001 1.001 0 0 1 1.415 1.414L13.414 12l3.89 3.89a1 1 0 0 1-1.414 1.414L12 13.414l-3.889 3.89a1 1 0 1 1-1.414-1.414L10.586 12 6.697 8.11a1 1 0 0 1 1.414-1.414L12 10.586z'/></svg>";

/**
 * 모달을 열고 참조를 돌려준다. 닫기 버튼·딤 클릭·ESC를 Dialog가 처리한다.
 *
 * @param {Object} config
 * @param {string} [config.title] - 헤더 제목. 없으면 헤더를 그리지 않음
 * @param {string} [config.titleId] - aria-labelledby로 연결할 id
 * @param {string} [config.bodyHtml=''] - 본문 슬롯 HTML
 * @param {string} [config.className] - 오버레이 추가 클래스 (모달별 구분·스타일 오버라이드)
 * @param {string} [config.panelClassName] - 패널 추가 클래스 (너비 등)
 * @param {boolean} [config.showClose=true] - 닫기 버튼 표시
 * @param {'solid'|'blur'} [config.dimTone='solid']
 * @param {boolean} [config.closeOnBackdrop=true]
 * @param {boolean} [config.closeOnEscape=true]
 * @param {() => boolean} [config.canClose] - false를 돌려주면 닫기 시도를 무시(업로드 중 등)
 * @param {(e: KeyboardEvent) => boolean|void} [config.onEscape] - true를 돌려주면 기본 닫기 생략
 * @param {() => void} [config.onClose]
 * @returns {{ overlay: HTMLElement, panel: HTMLElement, body: HTMLElement, close: () => void }}
 */
export function open(config = {}) {
  const {
    title = '',
    titleId = '',
    bodyHtml = '',
    className = '',
    panelClassName = '',
    showClose = true,
    dimTone = 'solid',
    closeOnBackdrop = true,
    closeOnEscape = true,
    canClose,
    onEscape,
    onClose
  } = config;

  const overlay = document.createElement('div');
  overlay.className = ['dialog', className].filter(Boolean).join(' ');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  if (titleId) overlay.setAttribute('aria-labelledby', titleId);

  overlay.innerHTML = `
    ${renderDim({ tone: dimTone, className: 'dialog__dim' })}
    ${
      showClose
        ? renderButton({
            shape: 'circle',
            size: 's',
            role: 'close',
            tone: 'ghost',
            ariaLabel: '닫기',
            content: CLOSE_ICON,
            className: 'dialog__close'
          })
        : ''
    }
    <div class="dialog__panel${panelClassName ? ` ${panelClassName}` : ''}">
      ${
        title
          ? `<header class="dialog__header">
        <h2 class="dialog__title"${titleId ? ` id="${titleId}"` : ''}>${title}</h2>
      </header>`
          : ''
      }
      <div class="dialog__body">${bodyHtml}</div>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.classList.add('dialog-open');

  const allowClose = () => (typeof canClose === 'function' ? canClose() !== false : true);

  function close() {
    if (!allowClose()) return;
    document.removeEventListener('keydown', handleKeydown);
    overlay.remove();
    if (!document.querySelector('.dialog')) {
      document.body.classList.remove('dialog-open');
    }
    onClose?.();
  }

  function handleKeydown(e) {
    if (e.key !== 'Escape') return;
    if (typeof onEscape === 'function' && onEscape(e) === true) return;
    if (closeOnEscape) close();
  }
  document.addEventListener('keydown', handleKeydown);

  overlay.querySelector('.dialog__close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });

  if (closeOnBackdrop) {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target === overlay.querySelector('.dialog__dim')) close();
    });
  }

  return {
    overlay,
    panel: /** @type {HTMLElement} */ (overlay.querySelector('.dialog__panel')),
    body: /** @type {HTMLElement} */ (overlay.querySelector('.dialog__body')),
    close
  };
}
