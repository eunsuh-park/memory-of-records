/**
 * 로고를 1200×630 OG 기본 이미지로 합성한다.
 * 사용: node scripts/generate-og-default.mjs
 */
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const logoPath = join(root, 'src/assets/logo.png');
const outPath = join(root, 'public/og-default.jpg');

const WIDTH = 1200;
const HEIGHT = 630;
const LOGO_WIDTH = 720;

await mkdir(dirname(outPath), { recursive: true });

const logo = await sharp(logoPath)
  .resize({ width: LOGO_WIDTH, withoutEnlargement: true })
  .png()
  .toBuffer();

await sharp({
  create: {
    width: WIDTH,
    height: HEIGHT,
    channels: 3,
    background: '#111111'
  }
})
  .composite([{ input: logo, gravity: 'center' }])
  .jpeg({ quality: 88, mozjpeg: true })
  .toFile(outPath);

console.log(`wrote ${outPath}`);
