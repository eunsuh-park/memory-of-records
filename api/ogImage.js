/**
 * GET /api/ogImage?slug={note-slug}
 * 노트 표지 JPG를 같은 도메인에서 내려 카톡이 Cloudinary 404를 받지 않게 한다.
 */
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { getCloudinaryCredentials } from './_lib/cloudinaryAuth.js';
import { cloudNameFromUrl, coverOgCandidateUrls } from './_lib/ogImage.js';
import { findShareNoteBySlug, requestOrigin } from './_lib/shareMeta.js';
import { defaultOgImageUrl, siteOrigin } from '../src/data/siteMeta.js';

const OG_JPEG_TYPE = 'image/jpeg';
const FETCH_TIMEOUT_MS = 5000;

function resolveCloudName(coverUrl) {
  return cloudNameFromUrl(coverUrl) || getCloudinaryCredentials()?.cloudName || '';
}

function isJpegBuffer(buf) {
  return Boolean(buf && buf.length > 100 && buf[0] === 0xff && buf[1] === 0xd8);
}

async function fetchJpeg(url) {
  const raw = String(url || '').trim();
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  try {
    const response = await fetch(raw, {
      redirect: 'follow',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { Accept: 'image/jpeg,image/*,*/*' }
    });
    if (!response.ok) return null;
    const buf = Buffer.from(await response.arrayBuffer());
    return isJpegBuffer(buf) ? buf : null;
  } catch (err) {
    console.warn('ogImage: fetch failed', raw, err);
    return null;
  }
}

async function defaultOgBuffer(origin) {
  const files = [
    join(process.cwd(), 'public', 'og-default.jpg'),
    join(process.cwd(), 'dist', 'og-default.jpg')
  ];
  for (const file of files) {
    if (existsSync(file)) return readFile(file);
  }
  const fallbackUrl = defaultOgImageUrl();
  const fromOrigin = await fetchJpeg(fallbackUrl);
  if (fromOrigin) return fromOrigin;
  const base = String(origin || siteOrigin()).replace(/\/$/, '');
  if (base && fallbackUrl.startsWith(base) === false) {
    const again = await fetchJpeg(`${base}/og-default.jpg`);
    if (again) return again;
  }
  throw new Error('og-default.jpg missing');
}

export default async function handler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const slug = String(req.query?.slug || '').trim();
  const origin = requestOrigin(req);
  let body = null;

  if (slug) {
    try {
      const note = await findShareNoteBySlug(slug);
      if (note) {
        const cloudName = resolveCloudName(note.coverFrontUrl);
        const candidates = coverOgCandidateUrls(note, '', cloudName);
        for (const url of candidates) {
          body = await fetchJpeg(url);
          if (body) break;
        }
      }
    } catch (err) {
      console.warn('ogImage: note lookup failed', err);
      body = null;
    }
  }

  if (!body) {
    try {
      body = await defaultOgBuffer(origin);
    } catch (err) {
      console.warn('ogImage: default image missing', err);
      return res.status(404).end();
    }
  }

  res.setHeader('Content-Type', OG_JPEG_TYPE);
  res.setHeader('Cache-Control', 'public, s-maxage=86400, stale-while-revalidate=604800');
  res.setHeader('Content-Length', String(body.length));
  if (req.method === 'HEAD') return res.status(200).end();
  return res.status(200).send(body);
}
