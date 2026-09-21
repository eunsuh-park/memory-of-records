/**
 * 모든 유저에게 기본 제공되는 Bookmark Note + 사용자 생성 북마크 노트
 *
 * Notion에 없는 synthetic note. 로컬 PNG 표지를 쓰고,
 * 북마크된 페이지들을 한 앨범처럼 모아 본다.
 */

import bookmarksCoverFrontFallback from '../assets/bookmarks-cover-front.png';
import bookmarksCoverBackFallback from '../assets/bookmarks-cover-back.png';
import {
  ADD_BOOKMARK_NOTE_ID,
  BOOKMARKS_NOTE_ID,
  BOOKMARKS_NOTE_TITLE,
  isCustomBookmarkNoteId
} from './bookmarkNoteIds.js';

export {
  ADD_BOOKMARK_NOTE_ID,
  BOOKMARKS_NOTE_ID,
  BOOKMARKS_NOTE_TITLE,
  PAGE_SCRAP_PATH,
  createCustomBookmarkNoteId,
  isAddBookmarkNoteId,
  isBookmarksNoteId,
  isCustomBookmarkNoteId,
  isDefaultBookmarksNoteId
} from './bookmarkNoteIds.js';

const localCovers = {
  title: BOOKMARKS_NOTE_TITLE,
  coverFrontUrl: bookmarksCoverFrontFallback,
  coverBackUrl: bookmarksCoverBackFallback
};

export function defaultBookmarkCovers() {
  return { ...localCovers };
}

/**
 * 로컬 PNG 표지를 준비한다 (호출부 호환용).
 */
export async function ensureBookmarkNoteCovers() {
  return localCovers;
}

/**
 * @param {{
 *   id?: string,
 *   title?: string,
 *   pageCount?: number|null,
 *   pages?: Array|null,
 *   description?: string,
 *   sourceNoteIds?: string[],
 *   sourceNotes?: Array,
 *   coverFrontUrl?: string,
 *   coverBackUrl?: string,
 *   createdAt?: string
 * }} [overrides]
 */
export function createBookmarksNote(overrides = {}) {
  const pages = Array.isArray(overrides.pages) ? overrides.pages : null;
  const pageCount =
    Number.isFinite(Number(overrides.pageCount)) && Number(overrides.pageCount) >= 0
      ? Math.floor(Number(overrides.pageCount))
      : pages
        ? pages.length
        : null;
  const id = String(overrides.id || BOOKMARKS_NOTE_ID).trim() || BOOKMARKS_NOTE_ID;
  const isCustom = isCustomBookmarkNoteId(id);
  const title = String(overrides.title || '').trim() || localCovers.title;

  return {
    id,
    title,
    coverFrontUrl: overrides.coverFrontUrl || localCovers.coverFrontUrl,
    coverBackUrl: overrides.coverBackUrl || localCovers.coverBackUrl,
    pdfFolderUrl: null,
    pdfUrl: null,
    pageCount,
    size: null,
    description:
      overrides.description ||
      (isCustom
        ? '선택한 노트에서 북마크한 페이지를 모읍니다.'
        : '이곳에서 북마크한 페이지들을 모아볼 수 있습니다.'),
    type: 'Bookmarks',
    notebookType: 'Bookmarks',
    color: null,
    favorites: false,
    visible: true,
    isVirtualBookmarks: true,
    isCustomBookmarkNote: isCustom,
    sourceNoteIds: Array.isArray(overrides.sourceNoteIds) ? overrides.sourceNoteIds : [],
    sourceNotes: Array.isArray(overrides.sourceNotes) ? overrides.sourceNotes : [],
    createdAt: overrides.createdAt || '',
    pages
  };
}

export function createAddBookmarkNoteCard() {
  return {
    id: ADD_BOOKMARK_NOTE_ID,
    title: '새 북마크 노트 추가',
    coverFrontUrl: '',
    coverBackUrl: '',
    pdfFolderUrl: null,
    pdfUrl: null,
    pageCount: null,
    size: null,
    description: '이름과 모을 노트를 정해 새 북마크 노트를 만듭니다.',
    type: 'Bookmarks',
    notebookType: 'Bookmarks',
    color: null,
    favorites: false,
    visible: true,
    isAddBookmarkNote: true
  };
}

/**
 * Page Scrap: 기본권 + 사용자 북마크 노트
 * @returns {Promise<Array>}
 */
export async function getPageScrapNotes() {
  const { loadPageScrapNotes } = await import('../services/bookmarkNotes.js');
  return loadPageScrapNotes();
}
