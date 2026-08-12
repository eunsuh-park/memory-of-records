/**
 * Bookmarks 표지 SVG를 색상별로 생성한다.
 * Usage: node scripts/generate-bookmarks-covers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'src/assets/bookmarks-covers');

const { NOTE_COLOR_NAMES, NOTE_COLOR_SLUG } = await import(
  pathToFileURL(path.join(root, 'src/utils/noteColorMap.js')).href
);
const { buildBookmarksCoverSvg } = await import(
  pathToFileURL(path.join(root, 'src/utils/bookmarksCoverSvg.js')).href
);

fs.mkdirSync(outDir, { recursive: true });

let count = 0;
for (const name of NOTE_COLOR_NAMES) {
  const slug = NOTE_COLOR_SLUG[name] || 'color';
  for (const face of ['front', 'back']) {
    const file = path.join(outDir, `${slug}-${face}.svg`);
    fs.writeFileSync(file, `${buildBookmarksCoverSvg(face, name)}\n`, 'utf8');
    count += 1;
  }
}

console.log(`Wrote ${count} SVGs → ${path.relative(root, outDir)}`);
