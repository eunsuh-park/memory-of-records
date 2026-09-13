import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildViewerPageList, parseCoverPageFlag } from './viewerPages.js';

const pages = [
  { pageNumber: 1, url: 'https://cdn.example/page-1.jpg' },
  { pageNumber: 2, url: 'https://cdn.example/page-2.jpg' },
  { pageNumber: 3, url: 'https://cdn.example/page-3.jpg' },
  { pageNumber: 4, url: 'https://cdn.example/page-4.jpg' }
];

test('parseCoverPageFlag는 true/false/null만 돌려준다', () => {
  assert.equal(parseCoverPageFlag(true), true);
  assert.equal(parseCoverPageFlag('false'), false);
  assert.equal(parseCoverPageFlag(''), null);
});

test('첫 장이 표지면 PDF 페이지를 앞표지로 쓰고 본문은 1부터 센다', () => {
  const list = buildViewerPageList({
    pages,
    coverFrontUrl: 'https://cdn.example/cover_front.jpg',
    coverBackUrl: 'https://cdn.example/cover_back.jpg',
    firstPageIsCover: true,
    lastPageIsCover: false
  });

  assert.deepEqual(
    list.map((item) => [item.kind, item.pageNumber ?? null, item.storedPageNumber ?? null, item.url]),
    [
      ['cover-front', null, 1, pages[0].url],
      ['page', 1, 2, pages[1].url],
      ['page', 2, 3, pages[2].url],
      ['page', 3, 4, pages[3].url],
      ['cover-back', null, null, 'https://cdn.example/cover_back.jpg']
    ]
  );
});

test('표지가 아니면 기존 cover_front 이미지를 맨 앞에 넣는다', () => {
  const list = buildViewerPageList({
    pages,
    coverFrontUrl: 'https://cdn.example/cover_front.jpg',
    coverBackUrl: 'https://cdn.example/cover_back.jpg',
    firstPageIsCover: false,
    lastPageIsCover: false
  });

  assert.equal(list[0].kind, 'cover-front');
  assert.equal(list[0].url, 'https://cdn.example/cover_front.jpg');
  assert.equal(list[1].kind, 'page');
  assert.equal(list[1].pageNumber, 1);
  assert.equal(list[1].storedPageNumber, 1);
  assert.equal(list[list.length - 1].kind, 'cover-back');
  assert.equal(list[list.length - 1].url, 'https://cdn.example/cover_back.jpg');
  assert.equal(list.filter((item) => item.kind === 'page').length, 4);
});

test('첫·마지막 장이 모두 표지면 본문만 번호로 센다', () => {
  const list = buildViewerPageList({
    pages,
    coverFrontUrl: 'https://cdn.example/cover_front.jpg',
    coverBackUrl: 'https://cdn.example/cover_back.jpg',
    firstPageIsCover: true,
    lastPageIsCover: true
  });

  assert.deepEqual(
    list.map((item) => [item.kind, item.pageNumber ?? null, item.storedPageNumber ?? null]),
    [
      ['cover-front', null, 1],
      ['page', 1, 2],
      ['page', 2, 3],
      ['cover-back', null, 4]
    ]
  );
});

test('플래그가 없으면 표지를 끼우거나 승격하지 않는다', () => {
  const list = buildViewerPageList({
    pages,
    coverFrontUrl: 'https://cdn.example/cover_front.jpg',
    coverBackUrl: 'https://cdn.example/cover_back.jpg',
    firstPageIsCover: null,
    lastPageIsCover: null
  });

  assert.equal(list.length, 4);
  assert.ok(list.every((item) => item.kind === 'page'));
  assert.deepEqual(
    list.map((item) => item.pageNumber),
    [1, 2, 3, 4]
  );
});

test('마지막 장만 표지면 PDF 페이지를 뒤표지로 쓰고 본문은 1부터 센다', () => {
  const list = buildViewerPageList({
    pages,
    coverFrontUrl: 'https://cdn.example/cover_front.jpg',
    coverBackUrl: 'https://cdn.example/cover_back.jpg',
    firstPageIsCover: false,
    lastPageIsCover: true
  });

  assert.deepEqual(
    list.map((item) => [item.kind, item.pageNumber ?? null, item.storedPageNumber ?? null, item.url]),
    [
      ['cover-front', null, null, 'https://cdn.example/cover_front.jpg'],
      ['page', 1, 1, pages[0].url],
      ['page', 2, 2, pages[1].url],
      ['page', 3, 3, pages[2].url],
      ['cover-back', null, 4, pages[3].url]
    ]
  );
});

test('한 장짜리 PDF가 앞·뒤 표지면 앞표지만 남긴다', () => {
  const list = buildViewerPageList({
    pages: [{ pageNumber: 1, url: 'https://cdn.example/only.jpg' }],
    coverFrontUrl: 'https://cdn.example/cover_front.jpg',
    coverBackUrl: 'https://cdn.example/cover_back.jpg',
    firstPageIsCover: true,
    lastPageIsCover: true
  });

  assert.deepEqual(
    list.map((item) => item.kind),
    ['cover-front']
  );
  assert.equal(list[0].url, 'https://cdn.example/only.jpg');
});
