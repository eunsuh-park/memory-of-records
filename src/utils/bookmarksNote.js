/**
 * 북마크 페이지를 모은 가상 노트
 *
 * Notion에 없는 synthetic note. Jukebox에 카드로 끼워 넣고,
 * 열면 Cloudinary is_bookmarked 페이지들을 한 앨범처럼 본다.
 */

import bookmarksCoverFrontUrl from '../assets/bookmarks-cover-front.webp';
import bookmarksCoverBackUrl from '../assets/bookmarks-cover-back.webp';

export const BOOKMARKS_NOTE_ID = 'virtual:bookmarks';
export const BOOKMARKS_NOTE_TITLE = 'Bookmarks';

/**
 * @returns {boolean}
 */
export function isBookmarksNoteId(id) {
  return String(id || '').trim() === BOOKMARKS_NOTE_ID;
}

/**
 * @param {{ pageCount?: number|null, pages?: Array|null }} [overrides]
 */
export function createBookmarksNote(overrides = {}) {
  const pages = Array.isArray(overrides.pages) ? overrides.pages : null;
  const pageCount =
    Number.isFinite(Number(overrides.pageCount)) && Number(overrides.pageCount) >= 0
      ? Math.floor(Number(overrides.pageCount))
      : pages
        ? pages.length
        : null;

  return {
    id: BOOKMARKS_NOTE_ID,
    title: BOOKMARKS_NOTE_TITLE,
    coverFrontUrl: bookmarksCoverFrontUrl,
    coverBackUrl: bookmarksCoverBackUrl,
    pdfFolderUrl: null,
    pdfUrl: null,
    pageCount,
    size: null,
    description: '북마크한 페이지 모음',
    type: 'Bookmarks',
    notebookType: 'Bookmarks',
    color: null,
    favorites: false,
    visible: true,
    isVirtualBookmarks: true,
    pages
  };
}
