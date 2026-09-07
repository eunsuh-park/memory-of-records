/**
 * Dialog — 모달 껍데기 (Dim + panel + header + 닫기 버튼 + 본문 슬롯)
 *
 * 노트 추가/수정, 페이지 추가, 페이지 추가 확인, 페이지 정보 모달이 모두 이 구조를 쓴다.
 * 패널 너비·애니메이션처럼 모달마다 다른 부분은 className/panelClassName으로 덮는다.
 */

import { render as renderButton } from '../Button/Button.js';
import { render as renderDim } from '../Dim/Dim.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import { escapeHtml } from '../../utils/html.js';
import './Dialog.css';

/**
 * 모달 오버레이 마크업. open()과 Lab 정적 데모가 같은 HTML을 쓴다.
 *
 * @param {Object} config
 * @param {string} [config.title] - 헤더 제목. 없으면 헤더를 그리지 않음
 * @param {string} [config.titleId] - aria-labelledby로 연결할 id
 * @param {string} [config.subtitle] - 제목 아래 보조 문구(이스케이프)
 * @param {string} [config.subtitleHtml] - 제목 아래 보조 문구(이미 이스케이프된 HTML)
 * @param {string} [config.bodyHtml=''] - 본문 슬롯 HTML
 * @param {string} [config.className] - 오버레이 추가 클래스 (모달별 구분·스타일 오버라이드)
 * @param {string} [config.panelClassName] - 패널 추가 클래스 (너비 등)
 * @param {boolean} [config.showClose=true] - 닫기 버튼 표시
 * @param {'solid'|'blur'} [config.dimTone='solid']
 * @returns {string}
 */
export function render(config = {}) {
  const {
    title = '',
    titleId = '',
    subtitle = '',
    subtitleHtml = '',
    bodyHtml = '',
    className = '',
    panelClassName = '',
    showClose = true,
    dimTone = 'solid'
  } = config;

  const labelled = titleId ? ` aria-labelledby="${titleId}"` : '';
  const subtitleMarkup = subtitleHtml || (subtitle ? escapeHtml(subtitle) : '');

  return `
    <div class="${['dialog', className].filter(Boolean).join(' ')}" role="dialog" aria-modal="true"${labelled}>
      ${renderDim({ tone: dimTone, className: 'dialog__dim' })}
      ${
        showClose
          ? renderButton({
              shape: 'circle',
              size: 's',
              role: 'close',
              tone: 'ghost',
              ariaLabel: '닫기',
              content: MINGCUTE.closeLine,
              className: 'dialog__close'
            })
          : ''
      }
      <div class="dialog__panel${panelClassName ? ` ${panelClassName}` : ''}">
        ${
          title
            ? `<header class="dialog__header">
          <div class="dialog__heading">
            <h2 class="dialog__title"${titleId ? ` id="${titleId}"` : ''}>${escapeHtml(title)}</h2>
            ${subtitleMarkup ? `<p class="dialog__subtitle">${subtitleMarkup}</p>` : ''}
          </div>
        </header>`
            : ''
        }
        <div class="dialog__body">${bodyHtml}</div>
      </div>
    </div>`;
}

/**
 * 모달을 열고 참조를 돌려준다. 닫기 버튼·딤 클릭·ESC를 Dialog가 처리한다.
 *
 * @param {Object} config
 * @param {string} [config.title]
 * @param {string} [config.titleId]
 * @param {string} [config.bodyHtml='']
 * @param {string} [config.className]
 * @param {string} [config.panelClassName]
 * @param {boolean} [config.showClose=true]
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
    closeOnBackdrop = true,
    closeOnEscape = true,
    canClose,
    onEscape,
    onClose
  } = config;

  const holder = document.createElement('div');
  holder.innerHTML = render(config).trim();
  const overlay = /** @type {HTMLElement} */ (holder.firstElementChild);

  document.body.appendChild(overlay);
  document.body.classList.add('dialog-open');

  const allowClose = () => (typeof canClose === 'function' ? canClose() !== false : true);

  function close() {
    if (!allowClose()) return;
    document.removeEventListener('keydown', handleKeydown);
    overlay.remove();
    /* Lab에 박아 둔 인라인 데모(.dialog--inline)는 열린 오버레이로 치지 않는다 */
    if (!document.body.querySelector(':scope > .dialog')) {
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
