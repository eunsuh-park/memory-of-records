/**
 * 모든 유저에게 기본 제공되는 Bookmark Note
 *
 * Notion에 없는 synthetic note. 로컬 PNG 표지를 쓰고,
 * 북마크된 페이지들을 한 앨범처럼 모아 본다.
 */

import bookmarksCoverFrontFallback from '../assets/bookmarks-cover-front.png';
import bookmarksCoverBackFallback from '../assets/bookmarks-cover-back.png';

export const BOOKMARKS_NOTE_ID = 'virtual:bookmarks';
export const BOOKMARKS_NOTE_TITLE = 'Bookmark Note';
export const PAGE_SCRAP_PATH = '/page-scrap';

const localCovers = {
  title: BOOKMARKS_NOTE_TITLE,
  coverFrontUrl: bookmarksCoverFrontFallback,
  coverBackUrl: bookmarksCoverBackFallback
};

/**
 * @returns {boolean}
 */
export function isBookmarksNoteId(id) {
  return String(id || '').trim() === BOOKMARKS_NOTE_ID;
}

/**
 * 로컬 PNG 표지를 준비한다 (호출부 호환용).
 */
export async function ensureBookmarkNoteCovers() {
  return localCovers;
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
    title: localCovers.title,
    coverFrontUrl: localCovers.coverFrontUrl,
    coverBackUrl: localCovers.coverBackUrl,
    pdfFolderUrl: null,
    pdfUrl: null,
    pageCount,
    size: null,
    description: '모든 유저에게 제공되는 기본 북마크 노트',
    type: 'Bookmarks',
    notebookType: 'Bookmarks',
    color: null,
    favorites: false,
    visible: true,
    isVirtualBookmarks: true,
    pages
  };
}

/**
 * Page Scrap 전용: Bookmark Note만 한 권 반환한다.
 * @returns {Promise<Array>}
 */
export async function getPageScrapNotes() {
  await ensureBookmarkNoteCovers().catch(() => null);
  return [createBookmarksNote()];
}
