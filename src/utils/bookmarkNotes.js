/**
 * 사용자 북마크 노트(기본권 + 최대 10권) 규칙.
 * 페이지 소속은 Cloudinary context.bookmark_note_id 로 구분한다.
 */

import {
  BOOKMARKS_NOTE_ID,
  isBookmarksNoteId,
  isCustomBookmarkNoteId,
  isDefaultBookmarksNoteId
} from './bookmarkNoteIds.js';

export const MAX_CUSTOM_BOOKMARK_NOTES = 10;
export const MAX_PAGES_PER_BOOKMARK_NOTE = 50;

/**
 * @param {unknown} id
 * @returns {string}
 */
export function normalizeBookmarkNoteId(id) {
  const raw = String(id || '').trim();
  if (!raw) return BOOKMARKS_NOTE_ID;
  return isBookmarksNoteId(raw) ? raw : BOOKMARKS_NOTE_ID;
}

/**
 * @param {{ bookmarkNoteId?: string, bookmark_note_id?: string }|null|undefined} page
 * @returns {string}
 */
export function pageBookmarkNoteId(page) {
  const raw = String(page?.bookmarkNoteId || page?.bookmark_note_id || '').trim();
  return raw ? normalizeBookmarkNoteId(raw) : BOOKMARKS_NOTE_ID;
}

/**
 * @param {{ bookmarkNoteId?: string, bookmark_note_id?: string }|null|undefined} page
 * @param {string} noteId
 */
export function pageBelongsToBookmarkNote(page, noteId) {
  return pageBookmarkNoteId(page) === normalizeBookmarkNoteId(noteId);
}

/**
 * @param {Array} pages
 * @param {string} noteId
 * @returns {Array}
 */
export function filterPagesForBookmarkNote(pages, noteId) {
  return (Array.isArray(pages) ? pages : []).filter((page) =>
    pageBelongsToBookmarkNote(page, noteId)
  );
}

/**
 * @param {Array} pages
 * @returns {Record<string, number>}
 */
export function countPagesByBookmarkNote(pages) {
  const counts = {};
  for (const page of Array.isArray(pages) ? pages : []) {
    const id = pageBookmarkNoteId(page);
    counts[id] = (counts[id] || 0) + 1;
  }
  return counts;
}

/**
 * @param {number} customCount
 */
export function canCreateBookmarkNote(customCount) {
  return Number(customCount) < MAX_CUSTOM_BOOKMARK_NOTES;
}

/**
 * @param {number} pageCount
 */
export function canAddPageToBookmarkNote(pageCount) {
  return Number(pageCount) < MAX_PAGES_PER_BOOKMARK_NOTE;
}

/**
 * @param {Array<{ id?: string, title?: string }>} sourceNotes
 * @returns {string}
 */
export function formatSourceNotesDescription(sourceNotes) {
  const titles = (Array.isArray(sourceNotes) ? sourceNotes : [])
    .map((note) => String(note?.title || note?.name || '').trim())
    .filter(Boolean);
  if (!titles.length) return '선택한 노트에서 북마크한 페이지를 모읍니다.';
  const shown = titles.slice(0, 4);
  const extra = titles.length - shown.length;
  const label = shown.join(', ');
  return extra > 0 ? `${label} 외 ${extra}권에서 모은 페이지` : `${label}에서 모은 페이지`;
}

/**
 * @param {{
 *   collections?: Array<{ id?: string, title?: string }>,
 *   counts?: Record<string, number>,
 *   includeDefault?: boolean
 * }} [options]
 * @returns {Array<{ id: string, title: string, pageCount: number, remaining: number, full: boolean, isDefault: boolean }>}
 */
export function listBookmarkDestinations(options = {}) {
  const collections = Array.isArray(options.collections) ? options.collections : [];
  const counts = options.counts || {};
  const includeDefault = options.includeDefault !== false;
  const items = [];

  if (includeDefault) {
    items.push({
      id: BOOKMARKS_NOTE_ID,
      title: 'Bookmark Note',
      isDefault: true
    });
  }

  for (const note of collections) {
    const id = String(note?.id || '').trim();
    if (!isCustomBookmarkNoteId(id)) continue;
    items.push({
      id,
      title: String(note.title || '북마크 노트').trim() || '북마크 노트',
      isDefault: false
    });
  }

  return items.map((item) => {
    const pageCount = Math.max(0, Number(counts[item.id]) || 0);
    const remaining = Math.max(0, MAX_PAGES_PER_BOOKMARK_NOTE - pageCount);
    return {
      ...item,
      pageCount,
      remaining,
      full: pageCount >= MAX_PAGES_PER_BOOKMARK_NOTE
    };
  });
}

/**
 * @param {Array} collections
 */
export function customBookmarkNoteCount(collections) {
  return (Array.isArray(collections) ? collections : []).filter((note) =>
    isCustomBookmarkNoteId(note?.id)
  ).length;
}

export {
  isBookmarksNoteId,
  isCustomBookmarkNoteId,
  isDefaultBookmarksNoteId
};
