import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  BOOKMARKS_NOTE_ID,
  MAX_CUSTOM_BOOKMARK_NOTES,
  isCustomBookmarkNoteId,
  normalizeBookmarkNotes
} from './bookmarkNotes.js';

test('사용자 북마크 노트만 남기고 한도를 지킨다', () => {
  const notes = [
    { id: `${BOOKMARKS_NOTE_ID}:memo-only`, title: '메모만', description: '짧은 메모', sourceNoteIds: [] }
  ];
  for (let i = 0; i < 12; i += 1) {
    notes.push({
      id: `${BOOKMARKS_NOTE_ID}:${i}`,
      title: `노트 ${i}`,
      sourceNoteIds: [`src-${i}`],
      createdAt: `2026-09-21T00:00:${String(i).padStart(2, '0')}.000Z`
    });
  }
  notes.push({ id: BOOKMARKS_NOTE_ID, title: '기본', sourceNoteIds: ['x'] });
  const normalized = normalizeBookmarkNotes(notes);
  assert.equal(normalized.length, MAX_CUSTOM_BOOKMARK_NOTES);
  const memoOnly = normalized.find((note) => note.title === '메모만');
  assert.ok(memoOnly);
  assert.equal(memoOnly.description, '짧은 메모');
  assert.deepEqual(memoOnly.sourceNoteIds, []);
  assert.equal(normalized.every((note) => isCustomBookmarkNoteId(note.id)), true);
  assert.equal(normalized[0].title, '노트 0');
});

test('제목이 없거나 id가 잘못되면 버린다', () => {
  assert.deepEqual(
    normalizeBookmarkNotes([
      { id: `${BOOKMARKS_NOTE_ID}:a`, title: '', description: '메모' },
      { id: 'nope', title: 'X', description: '메모' }
    ]),
    []
  );
});

test('메모는 100자까지 저장한다', () => {
  const long = '가'.repeat(120);
  const [note] = normalizeBookmarkNotes([
    { id: `${BOOKMARKS_NOTE_ID}:memo`, title: '메모', description: long }
  ]);
  assert.equal(note.description.length, 100);
});
