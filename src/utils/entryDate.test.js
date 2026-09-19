import assert from 'node:assert/strict';
import test from 'node:test';
import {
  extractEntryDateFromOcr,
  forwardFillEntryDates,
  normalizeIsoDate,
  toIsoDate,
  yearFromIsoDate
} from './entryDate.js';

test('toIsoDate는 실제 달력 날짜만 YYYY-MM-DD로 만든다', () => {
  assert.equal(toIsoDate(2025, 7, 14), '2025-07-14');
  assert.equal(toIsoDate(2025, 2, 29), '');
  assert.equal(toIsoDate(2024, 2, 29), '2024-02-29');
});

test('extractEntryDateFromOcr는 연월일 표기를 ISO로 정규화한다', () => {
  assert.equal(extractEntryDateFromOcr('오늘 2025년 7월 14일 일기를 썼다'), '2025-07-14');
  assert.equal(extractEntryDateFromOcr('2025. 7. 14'), '2025-07-14');
  assert.equal(extractEntryDateFromOcr('2025-07-14 날씨 맑음'), '2025-07-14');
  assert.equal(extractEntryDateFromOcr('25. 7. 14'), '2025-07-14');
});

test('extractEntryDateFromOcr는 연 없는 월일은 fallbackYear가 있을 때만 쓴다', () => {
  assert.equal(extractEntryDateFromOcr('7월 14일'), '');
  assert.equal(extractEntryDateFromOcr('7월 14일', { fallbackYear: 2025 }), '2025-07-14');
});

test('normalizeIsoDate와 yearFromIsoDate는 YYYY-MM-DD만 인정한다', () => {
  assert.equal(normalizeIsoDate('2025-07-14T00:00:00Z'), '2025-07-14');
  assert.equal(normalizeIsoDate('2025. 7. 14'), '');
  assert.equal(yearFromIsoDate('2025-07-14'), 2025);
  assert.equal(yearFromIsoDate(''), null);
});

test('forwardFillEntryDates는 날짜 없는 장에 직전 날짜를 복사한다', () => {
  const filled = forwardFillEntryDates([
    { pageNumber: 1, ocr_text: '표지' },
    { pageNumber: 2, ocr_text: '2025. 7. 14 월요일' },
    { pageNumber: 3, ocr_text: '같은 날 저녁' },
    { pageNumber: 4, ocr_text: '7월 15일' },
    { pageNumber: 5, entry_date: '2025-07-16', ocr_text: '' }
  ]);

  assert.deepEqual(
    filled.map((p) => ({ page: p.pageNumber, date: p.entry_date, status: p.fill_status })),
    [
      { page: 1, date: '', status: 'null' },
      { page: 2, date: '2025-07-14', status: 'extracted' },
      { page: 3, date: '2025-07-14', status: 'forward_filled' },
      { page: 4, date: '2025-07-15', status: 'extracted' },
      { page: 5, date: '2025-07-16', status: 'extracted' }
    ]
  );
});

test('forwardFillEntryDates는 overwrite면 기존 날짜를 텍스트에서 다시 뽑는다', () => {
  const filled = forwardFillEntryDates(
    [
      { pageNumber: 1, entry_date: '2024-01-01', ocr_text: '2025. 7. 14' },
      { pageNumber: 2, entry_date: '2024-01-02', ocr_text: '' }
    ],
    { overwrite: true }
  );
  assert.equal(filled[0].entry_date, '2025-07-14');
  assert.equal(filled[0].fill_status, 'extracted');
  assert.equal(filled[1].entry_date, '2025-07-14');
  assert.equal(filled[1].fill_status, 'forward_filled');
});
