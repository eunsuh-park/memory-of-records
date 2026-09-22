import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  ADD_BOOKMARK_NOTE_ID,
  BOOKMARKS_NOTE_ID,
  createCustomBookmarkNoteId,
  isAddBookmarkNoteId,
  isBookmarksNoteId,
  isCustomBookmarkNoteId,
  isDefaultBookmarksNoteId
} from './bookmarkNoteIds.js';
import {
  MAX_CUSTOM_BOOKMARK_NOTES,
  MAX_PAGES_PER_BOOKMARK_NOTE,
  canAddPageToBookmarkNote,
  canCreateBookmarkNote,
  countPagesByBookmarkNote,
  customBookmarkNoteCount,
  filterPagesForBookmarkNote,
  formatSourceNotesDescription,
  listBookmarkDestinations,
  normalizeBookmarkNoteId,
  pageBelongsToBookmarkNote,
  pageBookmarkNoteId
} from './bookmarkNotes.js';

test('기본·사용자 북마크 노트 id를 구분한다', () => {
  assert.equal(isDefaultBookmarksNoteId(BOOKMARKS_NOTE_ID), true);
  assert.equal(isCustomBookmarkNoteId(BOOKMARKS_NOTE_ID), false);
  assert.equal(isBookmarksNoteId(BOOKMARKS_NOTE_ID), true);
  const custom = `${BOOKMARKS_NOTE_ID}:abc`;
  assert.equal(isCustomBookmarkNoteId(custom), true);
  assert.equal(isBookmarksNoteId(custom), true);
  assert.equal(isDefaultBookmarksNoteId(custom), false);
  assert.equal(isBookmarksNoteId('note-1'), false);
  assert.equal(isAddBookmarkNoteId(ADD_BOOKMARK_NOTE_ID), true);
  assert.equal(createCustomBookmarkNoteId().startsWith(`${BOOKMARKS_NOTE_ID}:`), true);
});

test('bookmark_note_id가 없으면 기본권에 속한다', () => {
  assert.equal(pageBookmarkNoteId({}), BOOKMARKS_NOTE_ID);
  assert.equal(pageBelongsToBookmarkNote({ bookmarkNoteId: '' }, BOOKMARKS_NOTE_ID), true);
  assert.equal(
    pageBelongsToBookmarkNote({ bookmark_note_id: `${BOOKMARKS_NOTE_ID}:a` }, BOOKMARKS_NOTE_ID),
    false
  );
});

test('북마크 노트별로 페이지를 걸러 센다', () => {
  const custom = `${BOOKMARKS_NOTE_ID}:trip`;
  const pages = [
    { pageNumber: 1 },
    { pageNumber: 2, bookmarkNoteId: BOOKMARKS_NOTE_ID },
    { pageNumber: 3, bookmark_note_id: custom },
    { pageNumber: 4, bookmarkNoteId: custom }
  ];
  assert.equal(filterPagesForBookmarkNote(pages, BOOKMARKS_NOTE_ID).length, 2);
  assert.equal(filterPagesForBookmarkNote(pages, custom).length, 2);
  const counts = countPagesByBookmarkNote(pages);
  assert.equal(counts[BOOKMARKS_NOTE_ID], 2);
  assert.equal(counts[custom], 2);
});

test('생성 10권·장 50장 한도를 지킨다', () => {
  assert.equal(canCreateBookmarkNote(9), true);
  assert.equal(canCreateBookmarkNote(10), false);
  assert.equal(canAddPageToBookmarkNote(49), true);
  assert.equal(canAddPageToBookmarkNote(50), false);
  assert.equal(MAX_CUSTOM_BOOKMARK_NOTES, 10);
  assert.equal(MAX_PAGES_PER_BOOKMARK_NOTE, 50);
});

test('목적지 목록은 기본권과 사용자 노트를 모은다', () => {
  const custom = `${BOOKMARKS_NOTE_ID}:a`;
  const dest = listBookmarkDestinations({
    collections: [{ id: custom, title: '여행' }],
    counts: { [BOOKMARKS_NOTE_ID]: 50, [custom]: 3 }
  });
  assert.equal(dest.length, 2);
  assert.equal(dest[0].id, BOOKMARKS_NOTE_ID);
  assert.equal(dest[0].full, true);
  assert.equal(dest[1].title, '여행');
  assert.equal(dest[1].pageCount, 3);
  assert.equal(dest[1].remaining, 47);
  assert.equal(customBookmarkNoteCount([{ id: custom }, { id: BOOKMARKS_NOTE_ID }]), 1);
});

test('모을 노트 설명을 만든다', () => {
  assert.match(formatSourceNotesDescription([{ title: '여행 기록' }]), /여행 기록/);
  assert.equal(
    formatSourceNotesDescription([]),
    '선택한 노트에서 북마크한 페이지를 모읍니다.'
  );
});

test('알 수 없는 id는 기본권으로 정규화한다', () => {
  assert.equal(normalizeBookmarkNoteId(''), BOOKMARKS_NOTE_ID);
  assert.equal(normalizeBookmarkNoteId('nope'), BOOKMARKS_NOTE_ID);
});
