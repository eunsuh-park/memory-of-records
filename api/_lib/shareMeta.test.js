import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';
import test from 'node:test';
import { injectShareMeta, renderShareMetaBlock, siteDefaults } from './shareMeta.js';
import { formatNoteShareDescription, formatNoteShareTitle, SITE_NAME } from '../../src/data/siteMeta.js';

test('formatNoteShareTitle은 노트명과 페이지를 붙인다', () => {
  assert.equal(formatNoteShareTitle('2024 일기장'), `2024 일기장 · ${SITE_NAME}`);
  assert.equal(formatNoteShareTitle('2024 일기장', 12), `2024 일기장 · 12페이지 · ${SITE_NAME}`);
});

test('formatNoteShareDescription은 메모가 없으면 사이트 소개를 쓴다', () => {
  assert.match(formatNoteShareDescription(''), /아날로그/);
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

test('siteDefaults는 절대 경로 기본 이미지를 만든다', () => {
  const meta = siteDefaults('https://example.com');
  assert.equal(meta.title, SITE_NAME);
  assert.equal(meta.image, 'https://example.com/og-default.jpg');
  assert.equal(meta.url, 'https://example.com/');
  assert.match(renderShareMetaBlock(meta), /og:site_name/);
});

test('프로젝트 index.html 마커에 노트 메타를 끼워 넣을 수 있다', () => {
  const html = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../index.html'), 'utf8');
  assert.match(html, /<!--share-meta-->/);
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
