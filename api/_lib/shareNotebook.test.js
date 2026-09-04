import assert from 'node:assert/strict';
import test from 'node:test';
import { parseShareNotebook } from './shareNotebook.js';

test('parseShareNotebook은 제목·메모·표지 URL을 읽는다', () => {
  const page = {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    cover: { type: 'external', external: { url: 'https://example.com/notion-cover.png' } },
    properties: {
      이름: { type: 'title', title: [{ plain_text: '2024 일기장' }] },
      description: { type: 'rich_text', rich_text: [{ plain_text: '여름 기록' }] },
      cover_front_url: { type: 'url', url: 'https://res.cloudinary.com/demo/image/upload/v1/cover_front.png' },
      visible: { type: 'checkbox', checkbox: true }
    }
  };
  const note = parseShareNotebook(page);
  assert.equal(note.title, '2024 일기장');
  assert.equal(note.description, '여름 기록');
  assert.equal(note.coverFrontUrl, 'https://res.cloudinary.com/demo/image/upload/v1/cover_front.png');
  assert.equal(note.visible, true);
});

test('parseShareNotebook은 visible=false를 숨김으로 읽는다', () => {
  const page = {
    id: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee',
    properties: {
      Name: { type: 'title', title: [{ plain_text: '비공개' }] },
      visible: { type: 'checkbox', checkbox: false }
    }
  };
  const note = parseShareNotebook(page);
  assert.equal(note.visible, false);
});
