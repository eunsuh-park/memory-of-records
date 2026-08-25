/**
 * GET /api/readNotebooks?view=covers
 * notebooks/{public_id}/cover_front · cover_back 이미지를 모아 반환합니다.
 *
 * 응답 예:
 * {
 *   "covers": {
 *     "DIRY-2024-0001": {
 *       "front": "https://res.cloudinary.com/.../cover_front.png",
 *       "back": "https://res.cloudinary.com/.../cover_back.png"
 *     }
 *   }
 * }
 */
import { getCloudinaryCredentials } from '../cloudinaryAuth.js';

const NOTEBOOKS_ROOT = process.env.CLOUDINARY_NOTEBOOKS_FOLDER || 'notebooks';

function fetchJson(url, authHeader, init = {}) {
  return fetch(url, {
    ...init,
    headers: { Authorization: authHeader, ...(init.headers || {}) }
  }).then(async (response) => {
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data?.error?.message || 'Cloudinary API error');
      error.status = response.status;
      error.details = data;
      throw error;
    }
    return data;
  });
}

/**
 * notebooks/{NOTE_ID}/cover_front|cover_back → NOTE_ID
 * @param {string} publicId
 * @returns {{ noteId: string, kind: 'front'|'back' }|null}
 */
export function parseCoverPublicId(publicId) {
  const parts = String(publicId || '')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
  if (parts.length !== 3) return null;
  if (parts[0].toLowerCase() !== String(NOTEBOOKS_ROOT).toLowerCase()) return null;
  const file = String(parts[2] || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase();
  if (file === 'cover_front') return { noteId: parts[1], kind: 'front' };
  if (file === 'cover_back') return { noteId: parts[1], kind: 'back' };
  return null;
}

async function searchCoverResources({ cloudName, authHeader }) {
  const root = String(NOTEBOOKS_ROOT || 'notebooks').replace(/\/+$/, '');
  const escaped = root.replace(/"/g, '\\"');
  const expression =
    `resource_type:image AND public_id:${escaped}* AND (filename:cover_front OR filename:cover_back)`;
  const resources = [];
  let nextCursor = null;

  do {
    const body = {
      expression,
      max_results: 500,
      with_field: ['context']
    };
    if (nextCursor) body.next_cursor = nextCursor;
    const data = await fetchJson(
      `https://api.cloudinary.com/v1_1/${cloudName}/resources/search`,
      authHeader,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      }
    );
    resources.push(...(data?.resources || []));
    nextCursor = data?.next_cursor || null;
  } while (nextCursor);

  return resources;
}

function parseCoverPageFlag(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return null;
  if (['true', 'yes', '1', 'on'].includes(s)) return true;
  if (['false', 'no', '0', 'off'].includes(s)) return false;
  return null;
}

function readContextValue(resource, key) {
  const context = resource?.context?.custom || resource?.context || {};
  if (!context || typeof context !== 'object') return undefined;
  const wanted = String(key || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
  for (const [name, value] of Object.entries(context)) {
    const normalized = String(name || '')
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, '');
    if (normalized === wanted) return value;
  }
  return undefined;
}

function buildCoversMap(resources) {
  const covers = {};
  for (const resource of resources || []) {
    const parsed = parseCoverPublicId(resource?.public_id);
    if (!parsed?.noteId) continue;
    const url = String(resource?.secure_url || resource?.url || '').trim();
    if (!url) continue;
    const entry =
      covers[parsed.noteId] ||
      (covers[parsed.noteId] = {
        front: null,
        back: null,
        firstPageIsCover: null,
        lastPageIsCover: null
      });
    if (parsed.kind === 'back') {
      entry.back = url;
      const lastFlag = parseCoverPageFlag(readContextValue(resource, 'last_page_is_cover'));
      if (lastFlag != null && entry.lastPageIsCover == null) entry.lastPageIsCover = lastFlag;
    } else {
      entry.front = url;
      const firstFlag = parseCoverPageFlag(readContextValue(resource, 'first_page_is_cover'));
      const lastFlag = parseCoverPageFlag(readContextValue(resource, 'last_page_is_cover'));
      if (firstFlag != null) entry.firstPageIsCover = firstFlag;
      if (lastFlag != null) entry.lastPageIsCover = lastFlag;
    }
  }
  return covers;
}

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export async function handleCloudinaryCovers(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const credentials = getCloudinaryCredentials();
  if (!credentials?.apiKey || !credentials?.apiSecret || !credentials?.cloudName) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: 'CLOUDINARY_URL 또는 CLOUDINARY_* 환경 변수가 필요합니다'
    });
  }

  try {
    const authHeader = `Basic ${Buffer.from(
      `${credentials.apiKey}:${credentials.apiSecret}`
    ).toString('base64')}`;
    const resources = await searchCoverResources({
      cloudName: credentials.cloudName,
      authHeader
    });
    return res.status(200).json({ covers: buildCoversMap(resources) });
  } catch (error) {
    console.error('Cloudinary covers API error:', error);
    return res.status(error.status || 500).json({
      error: 'Cloudinary API error',
      message: error.message,
      details: error.details
    });
  }
}
