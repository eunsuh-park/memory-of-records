/**
 * GET /api/readPages?op=bookmarkNotes
 * POST /api/writePages { op: 'saveBookmarkNotes', notes: [...] }
 *
 * Cloudinary raw JSON (notebooks/_meta/bookmark_notes)에 사용자 북마크 노트를 저장한다.
 */
import crypto from 'crypto';
import { getCloudinaryCredentials } from '../cloudinaryAuth.js';
import { MAX_CUSTOM_BOOKMARK_NOTES, normalizeBookmarkNotes } from '../bookmarkNotes.js';

const NOTEBOOKS_ROOT = process.env.CLOUDINARY_NOTEBOOKS_FOLDER || 'notebooks';
const STORE_PUBLIC_ID = `${String(NOTEBOOKS_ROOT).replace(/\/+$/, '')}/_meta/bookmark_notes`;

function authHeader(credentials) {
  return `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')}`;
}

function signParams(params, apiSecret) {
  const signatureBase = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return crypto.createHash('sha1').update(signatureBase + apiSecret).digest('hex');
}

async function fetchStoreResource(credentials) {
  const encoded = encodeURIComponent(STORE_PUBLIC_ID);
  const url =
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/resources/raw/upload/${encoded}` +
    `?context=false`;
  const response = await fetch(url, { headers: { Authorization: authHeader(credentials) } });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

async function downloadNotesJson(url) {
  if (!url) return [];
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) return [];
  const data = await response.json().catch(() => null);
  return normalizeBookmarkNotes(data);
}

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export async function handleReadBookmarkNotes(req, res) {
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
    const resource = await fetchStoreResource(credentials);
    if (resource.status === 404) {
      res.setHeader('Cache-Control', 'private, no-store');
      return res.status(200).json({ notes: [] });
    }
    if (!resource.ok) {
      return res.status(resource.status || 500).json({
        error: 'Cloudinary API error',
        details: resource.data,
        message: resource.data?.error?.message || '북마크 노트를 불러오지 못했습니다'
      });
    }
    const notes = await downloadNotesJson(resource.data?.secure_url || resource.data?.url);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({ notes });
  } catch (error) {
    console.error('Bookmark notes read error:', error);
    return res.status(500).json({
      error: 'Cloudinary API error',
      message: error?.message || '북마크 노트를 불러오지 못했습니다'
    });
  }
}

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 * @param {object} body
 */
export async function handleSaveBookmarkNotes(req, res, body) {
  const credentials = getCloudinaryCredentials();
  if (!credentials?.apiKey || !credentials?.apiSecret || !credentials?.cloudName) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: 'CLOUDINARY_URL 또는 CLOUDINARY_* 환경 변수가 필요합니다'
    });
  }

  const notes = normalizeBookmarkNotes(body?.notes);
  if (notes.length > MAX_CUSTOM_BOOKMARK_NOTES) {
    return res.status(400).json({
      error: 'Validation failed',
      message: `북마크 노트는 최대 ${MAX_CUSTOM_BOOKMARK_NOTES}권까지 만들 수 있습니다`
    });
  }

  const payload = JSON.stringify({ notes });
  const timestamp = Math.floor(Date.now() / 1000);
  const paramsToSign = {
    overwrite: 'true',
    public_id: STORE_PUBLIC_ID,
    timestamp: String(timestamp)
  };
  const signature = signParams(paramsToSign, credentials.apiSecret);

  const form = new FormData();
  form.append('file', `data:application/json;base64,${Buffer.from(payload, 'utf8').toString('base64')}`);
  form.append('public_id', STORE_PUBLIC_ID);
  form.append('timestamp', String(timestamp));
  form.append('api_key', credentials.apiKey);
  form.append('signature', signature);
  form.append('overwrite', 'true');

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${credentials.cloudName}/raw/upload`,
    { method: 'POST', body: form }
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return res.status(response.status).json({
      error: 'Cloudinary update failed',
      details: data,
      message: data?.error?.message || '북마크 노트를 저장하지 못했습니다'
    });
  }

  return res.status(200).json({ ok: true, notes });
}
