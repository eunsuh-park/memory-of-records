import assert from 'node:assert/strict';
import test from 'node:test';
import { allowsGalleryLayout, isGalleryLayoutPath } from './galleryLayout.js';

test('isGalleryLayoutPath는 Timeline·By type만 허용한다', () => {
  assert.equal(isGalleryLayoutPath('/'), true);
  assert.equal(isGalleryLayoutPath('/timeline'), true);
  assert.equal(isGalleryLayoutPath('/timeline/elementary'), true);
  assert.equal(isGalleryLayoutPath('/by-type'), true);
  assert.equal(isGalleryLayoutPath('/by-type/diary'), true);
  assert.equal(isGalleryLayoutPath('/favorites'), false);
  assert.equal(isGalleryLayoutPath('/page-scrap'), false);
  assert.equal(isGalleryLayoutPath('/note/abc'), false);
  assert.equal(isGalleryLayoutPath('/story'), false);
  assert.equal(isGalleryLayoutPath('/login'), false);
});

test('allowsGalleryLayout은 period·type 필터만 켠다', () => {
  assert.equal(allowsGalleryLayout('period'), true);
  assert.equal(allowsGalleryLayout('type'), true);
  assert.equal(allowsGalleryLayout('favorites'), false);
  assert.equal(allowsGalleryLayout('scrap'), false);
});
