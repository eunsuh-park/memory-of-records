import assert from 'node:assert/strict';
import test from 'node:test';
import {
  optimizeImageUrl,
  optimizePlaceholderUrl,
  optimizeThumbnailUrl,
  stripOwnImageTransforms
} from './optimizeImageUrl.js';

const BASE = 'https://res.cloudinary.com/demo/image/upload/';
const PATH = 'v1/notebooks/DIRY-2024-0001/cover_front.png';

test('stripOwnImageTransforms는 우리가 붙인 세그먼트만 걷어 낸다', () => {
  assert.equal(
    stripOwnImageTransforms(`w_1000,c_limit,f_auto,q_auto:good,dpr_auto/${PATH}`),
    PATH
  );
  assert.equal(stripOwnImageTransforms(`f_auto,q_auto/${PATH}`), PATH);
  assert.equal(stripOwnImageTransforms(`w_480,c_limit/f_auto/q_auto:good/${PATH}`), PATH);
  assert.equal(
    stripOwnImageTransforms(`w_32,c_limit/e_blur:400/f_auto/q_auto:low/${PATH}`),
    PATH
  );
  assert.equal(stripOwnImageTransforms(PATH), PATH);
});

test('optimizeImageUrl은 f_auto와 너비 제한을 슬래시로 붙인다', () => {
  assert.equal(
    optimizeImageUrl(`${BASE}${PATH}`, { maxWidth: 900 }),
    `${BASE}w_900,c_limit/f_auto/q_auto:good/${PATH}`
  );
});

test('optimizeImageUrl은 이미 최적화된 URL을 다시 줄일 수 있다', () => {
  const full = `${BASE}w_1000,c_limit,f_auto,q_auto:good,dpr_auto/${PATH}`;
  assert.equal(
    optimizeThumbnailUrl(full, 480),
    `${BASE}w_480,c_limit/f_auto/q_auto:good/${PATH}`
  );
});

test('optimizeThumbnailUrl은 갤러리용 작은 너비를 쓴다', () => {
  assert.equal(
    optimizeThumbnailUrl(`${BASE}${PATH}`, 480),
    `${BASE}w_480,c_limit/f_auto/q_auto:good/${PATH}`
  );
});

test('optimizePlaceholderUrl은 흐린 아주 작은 이미지를 만든다', () => {
  assert.equal(
    optimizePlaceholderUrl(`${BASE}${PATH}`),
    `${BASE}w_32,c_limit/e_blur:400/f_auto/q_auto:low/${PATH}`
  );
});

test('Cloudinary가 아니면 원문을 그대로 둔다', () => {
  const other = 'https://files.example/cover.png';
  assert.equal(optimizeImageUrl(other), other);
  assert.equal(optimizeImageUrl(''), null);
  assert.equal(optimizeImageUrl(null), null);
});
