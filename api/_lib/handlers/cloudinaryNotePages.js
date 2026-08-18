/**
 * GET /api/readPages?op=list&note={public_id}
 * notebooks/{public_id}/pages/page-000001 … 이미지를 모아 반환합니다.
 *
 * 응답 예:
 * {
 *   "folder": "notebooks/DIRY-2024-0001/pages",
 *   "pageCount": 36,
 *   "pages": [{ "pageNumber": 1, "url": "https://...", "publicId": "..." }]
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

export function sanitizeNotePublicId(value) {
  const raw = String(value || '').trim();
  if (!raw || raw.length > 80) return '';
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(raw)) return '';
  return raw;
}

export function pagesFolderForNote(noteId) {
  const id = sanitizeNotePublicId(noteId);
  if (!id) return '';
  const root = String(NOTEBOOKS_ROOT || 'notebooks').replace(/\/+$/, '');
  return `${root}/${id}/pages`;
}

/**
 * notebooks/{NOTE_ID}/pages/page-000001 → { noteId, pageNumber }
 * @param {string} publicId
 */
export function parsePagePublicId(publicId) {
  const parts = String(publicId || '')
    .replace(/^\/+|\/+$/g, '')
    .split('/')
    .filter(Boolean);
  if (parts.length !== 4) return null;
  if (parts[0].toLowerCase() !== String(NOTEBOOKS_ROOT).toLowerCase()) return null;
  if (parts[2].toLowerCase() !== 'pages') return null;
  const match = String(parts[3] || '')
    .replace(/\.[a-z0-9]+$/i, '')
    .match(/^page-(\d+)$/i);
  if (!match) return null;
  return { noteId: parts[1], pageNumber: Number(match[1]) };
}

async function searchNotePages({ cloudName, folderPath, authHeader }) {
  const escaped = String(folderPath || '').replace(/"/g, '\\"');
  const expression = `resource_type:image AND public_id:${escaped}* AND filename:page-*`;
  const resources = [];
  let nextCursor = null;

  do {
    const body = { expression, max_results: 500 };
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

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export async function handleNotePages(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const noteId = sanitizeNotePublicId(req.query?.note || req.query?.publicId);
  if (!noteId) {
    return res.status(400).json({
      error: 'Validation failed',
      message: 'note(public_id)가 필요합니다'
    });
  }

  const credentials = getCloudinaryCredentials();
  if (!credentials?.apiKey || !credentials?.apiSecret || !credentials?.cloudName) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: 'CLOUDINARY_URL 또는 CLOUDINARY_* 환경 변수가 필요합니다'
    });
  }

  const folder = pagesFolderForNote(noteId);

  try {
    const authHeader = `Basic ${Buffer.from(
      `${credentials.apiKey}:${credentials.apiSecret}`
    ).toString('base64')}`;
    const resources = await searchNotePages({
      cloudName: credentials.cloudName,
      folderPath: folder,
      authHeader
    });

    const pages = [];
    for (const resource of resources || []) {
      const parsed = parsePagePublicId(resource?.public_id);
      if (!parsed || parsed.noteId.toLowerCase() !== noteId.toLowerCase()) continue;
      const url = String(resource?.secure_url || resource?.url || '').trim();
      if (!url) continue;
      pages.push({
        pageNumber: parsed.pageNumber,
        url,
        publicId: resource.public_id
      });
    }
    pages.sort((a, b) => a.pageNumber - b.pageNumber);

    const maxPage = pages.reduce((max, page) => Math.max(max, page.pageNumber), 0);
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      folder,
      pageCount: maxPage,
      pages
    });
  } catch (error) {
    console.error('Cloudinary note pages API error:', error);
    return res.status(error.status || 500).json({
      error: 'Cloudinary API error',
      message: error.message,
      details: error.details
    });
  }
}
