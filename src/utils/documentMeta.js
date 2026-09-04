/**
 * 브라우저 탭 제목. 크롤러용 OG는 api/shareHtml이 담당하고,
 * 사람이 앱을 볼 때만 이 헬퍼가 document.title을 맞춘다.
 */

import { SITE_NAME, formatNoteShareTitle } from '../data/siteMeta.js';

export function setDocumentTitle(title) {
  if (typeof document === 'undefined') return;
  document.title = String(title || '').trim() || SITE_NAME;
}

export function resetDocumentTitle() {
  setDocumentTitle(SITE_NAME);
}

/**
 * @param {string} [noteTitle]
 * @param {unknown} [page]
 */
export function setNoteDocumentTitle(noteTitle, page) {
  setDocumentTitle(formatNoteShareTitle(noteTitle, page));
}
