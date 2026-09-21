import assert from 'node:assert/strict';
import test from 'node:test';
import { compareBookmarkedPages, normalizeBookmarkedAt } from './bookmarkedAt.js';

test('normalizeBookmarkedAt는 ISO와 unix 초·밀리초를 ISO로 맞춘다', () => {
  assert.equal(normalizeBookmarkedAt('2026-09-21T09:32:00.000Z'), '2026-09-21T09:32:00.000Z');
  assert.equal(normalizeBookmarkedAt(1726900000000), '2024-09-21T06:26:40.000Z');
  assert.equal(normalizeBookmarkedAt('1726900000'), '2024-09-21T06:26:40.000Z');
  assert.equal(normalizeBookmarkedAt(''), null);
  assert.equal(normalizeBookmarkedAt('not-a-date'), null);
});

test('compareBookmarkedPages는 추가 일시 오름차순이고 없는 항목을 앞에 둔다', () => {
  const pages = [
    { bookmarkedAt: '2026-09-21T12:00:00.000Z', noteFolder: 'B', pageNumber: 1 },
    { bookmarkedAt: null, noteFolder: 'A', pageNumber: 2, entryDate: '2024-01-02' },
    { bookmarkedAt: '2026-09-20T12:00:00.000Z', noteFolder: 'C', pageNumber: 3 },
    { bookmarkedAt: null, noteFolder: 'A', pageNumber: 1, entryDate: '2024-01-01' }
  ];
  const sorted = [...pages].sort(compareBookmarkedPages);
  assert.deepEqual(
    sorted.map((p) => p.pageNumber),
    [1, 2, 3, 1]
  );
  assert.equal(sorted[0].entryDate, '2024-01-01');
  assert.equal(sorted[2].bookmarkedAt, '2026-09-20T12:00:00.000Z');
  assert.equal(sorted[3].bookmarkedAt, '2026-09-21T12:00:00.000Z');
});
