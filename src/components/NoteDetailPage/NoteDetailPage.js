/**
 * NoteDetailPage
 *
 * /note/:id 전체 페이지에서 뷰어(PdfModal · NoteImageViewer)를 감싸는 껍데기.
 * 두 뷰어가 모달이 아닌 모드에서 동일한 마크업·등장 애니메이션을 쓰므로 여기로 모았다.
 */

import './NoteDetailPage.css';

/**
 * @param {string} content - 안에 넣을 뷰어 마크업
 * @returns {string} HTML 문자열
 */
export function render(content = '') {
  return `
      <div class="note-detail-page">
        <article class="note-detail">
          ${content}
        </article>
      </div>
    `;
}

/**
 * 삽입 직후 등장 애니메이션 클래스를 붙인다.
 * @param {HTMLElement} targetEl - render() 결과를 심은 컨테이너
 */
export function mount(targetEl) {
  const pageEl = targetEl?.querySelector('.note-detail-page');
  if (!pageEl) return;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => pageEl.classList.add('note-detail-page--mounted'));
  });
}
