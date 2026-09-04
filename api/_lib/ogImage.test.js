import assert from 'node:assert/strict';
import test from 'node:test';
import { stripCloudinaryTransforms, toOgImageUrl } from './ogImage.js';

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
