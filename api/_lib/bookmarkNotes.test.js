import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BOOKMARKS_NOTE_ID,
  MAX_CUSTOM_BOOKMARK_NOTES,
  isCustomBookmarkNoteId,
  normalizeBookmarkNotes
} from './bookmarkNotes.js';

test('사용자 북마크 노트만 남기고 한도를 지킨다', () => {
  const notes = [];
  for (let i = 0; i < 12; i += 1) {
    notes.push({
      id: `${BOOKMARKS_NOTE_ID}:${i}`,
      title: `노트 ${i}`,
      sourceNoteIds: [`src-${i}`],
      createdAt: `2026-09-21T00:00:${String(i).padStart(2, '0')}.000Z`
    });
  }
  notes.push({ id: BOOKMARKS_NOTE_ID, title: '기본', sourceNoteIds: ['x'] });
  notes.push({ id: `${BOOKMARKS_NOTE_ID}:empty`, title: '빈', sourceNoteIds: [] });
  const normalized = normalizeBookmarkNotes(notes);
  assert.equal(normalized.length, MAX_CUSTOM_BOOKMARK_NOTES);
  assert.equal(normalized.every((note) => isCustomBookmarkNoteId(note.id)), true);
  assert.equal(normalized[0].title, '노트 0');
});

test('제목·모을 노트가 없으면 버린다', () => {
  assert.deepEqual(
    normalizeBookmarkNotes([
      { id: `${BOOKMARKS_NOTE_ID}:a`, title: '', sourceNoteIds: ['n1'] },
      { id: 'nope', title: 'X', sourceNoteIds: ['n1'] }
    ]),
    []
  );
});
