import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { buildNoteShareMeta, injectShareMeta, renderShareMetaBlock, siteDefaults } from './shareMeta.js';
import { formatNoteShareDescription, formatNoteShareTitle, SITE_NAME, SITE_TAGLINE, defaultOgImageUrl } from '../../src/data/siteMeta.js';

test('defaultOgImageUrl은 https 절대경로다', () => {
  assert.match(defaultOgImageUrl(), /^https:\/\/memory-of-records\.vercel\.app\/og-default\.jpg\?v=2$/);
});

test('formatNoteShareTitle은 노트명과 페이지를 붙인다', () => {
  assert.equal(formatNoteShareTitle('2024 일기장'), `2024 일기장 · ${SITE_NAME}`);
  assert.equal(formatNoteShareTitle('2024 일기장', 12), `2024 일기장 · 12페이지 · ${SITE_NAME}`);
});

test('formatNoteShareDescription은 메모가 없으면 사이트 소개를 쓴다', () => {
  assert.equal(formatNoteShareDescription(''), SITE_TAGLINE);
  assert.equal(formatNoteShareDescription('  여름 기록  '), '여름 기록');
});

test('injectShareMeta는 share-meta 구간의 제목·이미지를 바꾼다', () => {
  const html = `<!doctype html><html><head>
    <!--share-meta-->
    <title>Memory of Records</title>
    <meta property="og:image" content="/og-default.jpg" />
    <!--/share-meta-->
    </head><body></body></html>`;
  const meta = {
    title: '여름 일기 · Memory of Records',
    description: '바닷가',
    ogDescription: '바닷가',
    image: 'https://res.cloudinary.com/demo/image/upload/c_fill,w_1200,h_630,f_jpg/cover.jpg',
    imageAlt: '여름 일기',
    url: 'https://example.com/note/summer-abcd1234'
  };
  const injected = injectShareMeta(html, meta);
  assert.match(injected, /<title>여름 일기 · Memory of Records<\/title>/);
  assert.match(injected, /property="og:image" content="https:\/\/res\.cloudinary\.com\/demo/);
  assert.match(injected, /rel="canonical" href="https:\/\/example.com\/note\/summer-abcd1234"/);
  assert.doesNotMatch(injected, /<title>Memory of Records<\/title>/);
});

test('노트 공유 메타는 title·description·image·url을 노트마다 채운다', () => {
  const meta = buildNoteShareMeta(
    {
      id: '316c337e-aaaa-bbbb-cccc-dddddddddddd',
      title: '2005받아쓰기',
      description: '받아쓰기 연습'
    },
    { slug: '2005받아쓰기-316c337e' }
  );
  assert.equal(meta.title, `2005받아쓰기 · ${SITE_NAME}`);
  assert.equal(meta.description, '받아쓰기 연습');
  assert.equal(
    meta.image,
    'https://memory-of-records.vercel.app/og/2005%EB%B0%9B%EC%95%84%EC%93%B0%EA%B8%B0-316c337e.jpg?v=3'
  );
  assert.equal(meta.url, 'https://memory-of-records.vercel.app/note/2005%EB%B0%9B%EC%95%84%EC%93%B0%EA%B8%B0-316c337e');
  const block = renderShareMetaBlock(meta);
  assert.match(block, /property="og:title" content="2005받아쓰기 · Memory of Records"/);
  assert.match(block, /property="og:description" content="받아쓰기 연습"/);
  assert.match(block, /property="og:image" content="https:\/\/memory-of-records\.vercel\.app\/og\//);
  assert.match(block, /property="og:url" content="https:\/\/memory-of-records\.vercel\.app\/note\//);
  assert.doesNotMatch(block, /res\.cloudinary\.com/);
});

test('siteDefaults는 절대 경로 기본 이미지를 만든다', () => {
  const meta = siteDefaults('https://example.com');
  assert.equal(meta.title, SITE_NAME);
  assert.equal(meta.image, defaultOgImageUrl());
  assert.equal(meta.url, 'https://example.com/');
  assert.equal(meta.ogDescription, SITE_TAGLINE);
  const block = renderShareMetaBlock(meta);
  assert.match(block, /og:site_name/);
  assert.match(block, /property="og:image" content="https:\/\/memory-of-records\.vercel\.app\/og-default\.jpg\?v=2"/);
  assert.match(block, /property="og:image:secure_url"/);
});

test('프로젝트 index.html 마커에 노트 메타를 끼워 넣을 수 있다', () => {
  const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../index.html'), 'utf8');
  assert.match(html, /<!--share-meta-->/);
  assert.match(html, /property="og:url" content="__OG_PAGE_URL__"/);
  const injected = injectShareMeta(html, {
    title: '테스트 노트 · Memory of Records',
    description: '메모',
    ogDescription: '메모',
    image: 'https://example.com/cover.jpg',
    imageAlt: '테스트 노트',
    url: 'https://example.com/note/test-abcd1234'
  });
  assert.match(injected, /<title>테스트 노트 · Memory of Records<\/title>/);
  assert.match(injected, /id="app"/);
  assert.match(injected, /src="\/src\/main\.js"/);
});
