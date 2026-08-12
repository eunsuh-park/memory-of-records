/**
 * 모든 유저에게 기본 제공되는 Bookmark Note
 *
 * Notion에 없는 synthetic note. Cloudinary `Bookmark Note` 폴더 표지를 쓰고,
 * 북마크된 페이지들을 한 앨범처럼 모아 본다.
 */

import bookmarksCoverFrontFallback from '../assets/bookmarks-cover-front.png';
import bookmarksCoverBackFallback from '../assets/bookmarks-cover-back.png';
import { fetchBookmarkNoteMeta } from '../services/bookmarkNoteMeta.js';
import { optimizeImageUrl } from './optimizeImageUrl.js';

export const BOOKMARKS_NOTE_ID = 'virtual:bookmarks';
export const BOOKMARKS_NOTE_TITLE = 'Bookmark Note';

/** @type {{ coverFrontUrl: string, coverBackUrl: string, title: string } | null} */
let remoteMeta = null;

/**
 * @returns {boolean}
 */
export function isBookmarksNoteId(id) {
  return String(id || '').trim() === BOOKMARKS_NOTE_ID;
}

/**
 * Cloudinary 표지 메타를 미리 받아 둔다 (실패해도 로컬 폴백).
 * @param {{ force?: boolean }} [options]
 */
export async function ensureBookmarkNoteCovers({ force = false } = {}) {
  try {
    const meta = await fetchBookmarkNoteMeta({ force });
    const front = optimizeImageUrl(meta.coverFrontUrl) || meta.coverFrontUrl;
    const back = optimizeImageUrl(meta.coverBackUrl) || meta.coverBackUrl;
    remoteMeta = {
      title: meta.title || BOOKMARKS_NOTE_TITLE,
      coverFrontUrl: front || bookmarksCoverFrontFallback,
      coverBackUrl: back || bookmarksCoverBackFallback
    };
  } catch (err) {
    console.warn('Bookmark Note 표지 로드 실패 — 로컬 폴백 사용', err);
    if (!remoteMeta) {
      remoteMeta = {
        title: BOOKMARKS_NOTE_TITLE,
        coverFrontUrl: bookmarksCoverFrontFallback,
        coverBackUrl: bookmarksCoverBackFallback
      };
    }
  }
  return remoteMeta;
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

  const covers = remoteMeta || {
    title: BOOKMARKS_NOTE_TITLE,
    coverFrontUrl: bookmarksCoverFrontFallback,
    coverBackUrl: bookmarksCoverBackFallback
  };

  return {
    id: BOOKMARKS_NOTE_ID,
    title: covers.title || BOOKMARKS_NOTE_TITLE,
    coverFrontUrl: covers.coverFrontUrl,
    coverBackUrl: covers.coverBackUrl,
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
