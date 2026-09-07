/**
 * NoteDetailPage
 *
 * /note/:id 전체 페이지에서 뷰어(PdfModal · NoteImageViewer)를 감싸는 껍데기.
 * 두 뷰어가 모달이 아닌 모드에서 동일한 마크업·등장 애니메이션을 쓰므로 여기로 모았다.
 * 공유 링크로 바로 열린 경우에도 모달과 같은 닫기(X)로 주크박스에 돌아간다.
 */

import { render as renderButton } from '../Button/Button.js';
import { MINGCUTE } from '../../assets/mingcuteIcons.js';
import '../PdfModal/PdfModal.css';
import './NoteDetailPage.css';

function closeNoteDetail() {
  void import('../../router.js').then(({ router }) => {
    router.navigate('/');
  });
}

function isDimClick(target) {
  if (!(target instanceof Element)) return false;
  if (
    target.closest(
      '.note-detail-close, canvas, .niv-page-image, .niv-bookflip-canvas, .btn, .pdf-page-indicator, .pdf-zoom-controls, .niv-bottom-sheet, .niv-sheet-actions'
    )
  ) {
    return false;
  }
  return (
    target.classList.contains('note-detail-page') ||
    target.classList.contains('note-detail') ||
    target.classList.contains('pdf-viewer') ||
    target.classList.contains('pdf-canvas-wrap') ||
    target.classList.contains('niv-image-container') ||
    target.classList.contains('pdf-canvas-container')
  );
}

/**
 * @param {string} content - 안에 넣을 뷰어 마크업
 * @returns {string} HTML 문자열
 */
export function render(content = '') {
  return `
      <div class="note-detail-page">
        ${renderButton({
          shape: 'circle',
          size: 's',
          role: 'close',
          tone: 'ghost',
          ariaLabel: '닫기',
          title: '닫기',
          content: MINGCUTE.closeLine,
          className: 'pdf-modal-close note-detail-close'
        })}
        <article class="note-detail">
          ${content}
        </article>
      </div>
    `;
}

/**
 * 삽입 직후 등장 애니메이션 클래스를 붙이고, 닫기·ESC·딤 클릭을 연결한다.
 * @param {HTMLElement} targetEl - render() 결과를 심은 컨테이너
 * @returns {() => void} cleanup
 */
export function mount(targetEl) {
  const pageEl = targetEl?.querySelector('.note-detail-page');
  if (!pageEl) return () => {};

  const closeBtn = pageEl.querySelector('.note-detail-close');
  const onClose = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    closeNoteDetail();
  };
  const onKey = (event) => {
    if (event.key === 'Escape') onClose(event);
  };
  const onDimClick = (event) => {
    if (isDimClick(event.target)) onClose(event);
  };

  closeBtn?.addEventListener('click', onClose);
  pageEl.addEventListener('click', onDimClick);
  document.addEventListener('keydown', onKey);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => pageEl.classList.add('note-detail-page--mounted'));
  });

  return () => {
    closeBtn?.removeEventListener('click', onClose);
    pageEl.removeEventListener('click', onDimClick);
    document.removeEventListener('keydown', onKey);
  };
}
