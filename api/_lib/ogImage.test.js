import assert from 'node:assert/strict';
import test from 'node:test';
import {
  coverOgCandidateUrls,
  noteOgImageProxyUrl,
  stripCloudinaryTransforms,
  toOgImageUrl,
  toOgImageUrlFromPublicId
} from './ogImage.js';

test('stripCloudinaryTransforms는 변환 세그먼트만 걷어 낸다', () => {
  assert.equal(
    stripCloudinaryTransforms('w_1000,c_limit,f_auto,q_auto:good,dpr_auto/notebooks/DIRY-2024-0001/cover_front.png'),
    'notebooks/DIRY-2024-0001/cover_front.png'
  );
  assert.equal(
    stripCloudinaryTransforms('v1710000000/notebooks/DIRY-2024-0001/cover_front.png'),
    'v1710000000/notebooks/DIRY-2024-0001/cover_front.png'
  );
  assert.equal(
    stripCloudinaryTransforms('notebooks/DIRY-2024-0001/cover_front.png'),
    'notebooks/DIRY-2024-0001/cover_front.png'
  );
});

test('toOgImageUrl은 Cloudinary 표지를 1200x630 JPG로 맞춘다', () => {
  const fallback = 'https://example.com/og-default.jpg';
  const src =
    'https://res.cloudinary.com/demo/image/upload/w_1000,c_limit,f_auto/v1/notebooks/DIRY-2024-0001/cover_front.png';
  assert.equal(
    toOgImageUrl(src, fallback),
    'https://res.cloudinary.com/demo/image/upload/c_pad,b_rgb:111111,w_1200,h_630,f_jpg,q_80/v1/notebooks/DIRY-2024-0001/cover_front.png'
  );
  assert.equal(toOgImageUrl('', fallback), fallback);
  assert.equal(toOgImageUrl('https://files.example/cover.png', fallback), 'https://files.example/cover.png');
});

test('toOgImageUrl은 퍼센트 인코딩된 경로를 디코드한다', () => {
  const fallback = 'https://example.com/og-default.jpg';
  const src =
    'https://res.cloudinary.com/demo/image/upload/v1769269097/2005_%EB%B0%9B%EC%95%84%EC%93%B0%EA%B8%B0_t1qlg7.png';
  assert.equal(
    toOgImageUrl(src, fallback),
    'https://res.cloudinary.com/demo/image/upload/c_pad,b_rgb:111111,w_1200,h_630,f_jpg,q_80/v1769269097/2005_받아쓰기_t1qlg7.png'
  );
});

test('toOgImageUrlFromPublicId는 notebooks/{id}/cover_front JPG를 만든다', () => {
  assert.equal(
    toOgImageUrlFromPublicId('STDY-2005-0002', 'demo'),
    'https://res.cloudinary.com/demo/image/upload/c_pad,b_rgb:111111,w_1200,h_630,f_jpg,q_80/notebooks/STDY-2005-0002/cover_front'
  );
  assert.equal(toOgImageUrlFromPublicId('', 'demo', 'https://example.com/og.jpg'), 'https://example.com/og.jpg');
});

test('coverOgCandidateUrls는 public_id 표지를 죽은 파일 URL보다 앞에 둔다', () => {
  const stale =
    'https://res.cloudinary.com/demo/image/upload/v1769269097/2005_%EB%B0%9B%EC%95%84%EC%93%B0%EA%B8%B0_t1qlg7.png';
  const urls = coverOgCandidateUrls(
    { publicId: 'STDY-2005-0002', coverFrontUrl: stale },
    'https://example.com/og-default.jpg'
  );
  assert.equal(
    urls[0],
    'https://res.cloudinary.com/demo/image/upload/c_pad,b_rgb:111111,w_1200,h_630,f_jpg,q_80/notebooks/STDY-2005-0002/cover_front'
  );
  assert.match(urls[1], /2005_받아쓰기_t1qlg7\.png$/);
  assert.equal(urls[2], 'https://example.com/og-default.jpg');
});

test('noteOgImageProxyUrl은 같은 출처 /og/{slug}.jpg 를 가리킨다', () => {
  assert.equal(
    noteOgImageProxyUrl('https://memory-of-records.vercel.app', '2005받아쓰기-316c337e'),
    'https://memory-of-records.vercel.app/og/2005%EB%B0%9B%EC%95%84%EC%93%B0%EA%B8%B0-316c337e.jpg?v=3'
  );
});
