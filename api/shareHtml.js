/**
 * GET /api/shareHtml?slug={note-slug}&p={page}
 * /note/:slug 요청을 이 핸들러로 보내 SPA HTML에 OG 메타를 넣어 반환한다.
 * 카톡·슬랙 등 크롤러는 JS를 실행하지 않으므로 서버에서 제목·설명·이미지를 채운다.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { injectShareMeta, resolveShareMeta, siteDefaults, requestOrigin } from './_lib/shareMeta.js';

function readIndexFromDisk() {
  const file = join(process.cwd(), 'dist/index.html');
  try {
    if (existsSync(file)) return readFileSync(file, 'utf8');
  } catch (err) {
    console.warn('shareHtml: dist/index.html read failed', err);
  }
  return '';
}

async function readIndexHtml(origin) {
  const fromDisk = readIndexFromDisk();
  if (fromDisk) return fromDisk;

  const base = String(origin || '').replace(/\/$/, '');
  if (!base) return '';
  try {
    const response = await fetch(`${base}/index.html`, {
      signal: AbortSignal.timeout(4000),
      headers: { Accept: 'text/html' }
    });
    if (!response.ok) return '';
    return await response.text();
  } catch (err) {
    console.warn('shareHtml: index.html fetch failed', err);
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = requestOrigin(req);
  let meta;
  try {
    meta = await resolveShareMeta(req);
  } catch (err) {
    console.warn('shareHtml: resolveShareMeta failed', err);
    meta = siteDefaults(origin);
  }

  if (String(req.query?.format || '').toLowerCase() === 'json') {
    res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
    return res.status(200).json(meta);
  }

  let html = await readIndexHtml(origin);
  if (!html) {
    html =
      '<!doctype html><html lang="ko"><head><!--share-meta--><!--/share-meta--></head><body></body></html>';
  }

  const injected = injectShareMeta(html, meta);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  return res.status(200).send(injected);
}
