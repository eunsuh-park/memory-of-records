import assert from 'node:assert/strict';
import test from 'node:test';
import { formatBookmarkedDate } from './bookmarkedAt.js';

test('formatBookmarkedDate는 YYYY-MM-DD만 남긴다', () => {
  assert.equal(formatBookmarkedDate('2026-09-21T09:32:00.000Z'), '2026-09-21');
  assert.equal(formatBookmarkedDate('2026-09-21'), '2026-09-21');
  assert.equal(formatBookmarkedDate('1726900000000'), '2024-09-21');
  assert.equal(formatBookmarkedDate(''), '');
  assert.equal(formatBookmarkedDate('nope'), '');
});
