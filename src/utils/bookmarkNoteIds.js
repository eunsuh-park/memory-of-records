/**
 * 북마크 노트 id 규칙. 이미지 에셋을 건드리지 않아 단위 테스트에서 바로 import 한다.
 */

export const BOOKMARKS_NOTE_ID = 'virtual:bookmarks';
export const BOOKMARKS_NOTE_TITLE = 'Bookmark Note';
export const PAGE_SCRAP_PATH = '/page-scrap';
export const ADD_BOOKMARK_NOTE_ID = 'action:add-bookmark-note';

export function isDefaultBookmarksNoteId(id) {
  return String(id || '').trim() === BOOKMARKS_NOTE_ID;
}

export function isCustomBookmarkNoteId(id) {
  const raw = String(id || '').trim();
  return raw.startsWith(`${BOOKMARKS_NOTE_ID}:`) && raw.length > BOOKMARKS_NOTE_ID.length + 1;
}

export function isBookmarksNoteId(id) {
  return isDefaultBookmarksNoteId(id) || isCustomBookmarkNoteId(id);
}

export function isAddBookmarkNoteId(id) {
  return String(id || '').trim() === ADD_BOOKMARK_NOTE_ID;
}

export function createCustomBookmarkNoteId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${BOOKMARKS_NOTE_ID}:${crypto.randomUUID()}`;
  }
  const rand = Math.random().toString(16).slice(2) + Date.now().toString(16);
  return `${BOOKMARKS_NOTE_ID}:${rand}`;
}
