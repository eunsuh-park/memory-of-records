/**
 * GET /api/bookmarkNote
 * 모든 유저에게 제공되는 기본 Bookmark Note 메타(표지 URL)를 반환합니다.
 *
 * Cloudinary Cover 규칙:
 *   Notebooks_v3/Cover/Front/{노트명}
 *   Notebooks_v3/Cover/Back/{노트명}
 * 노트명 후보: "Bookmark_Note", "Bookmark Note", …
 */
import { getCloudinaryCredentials } from './_lib/cloudinaryAuth.js';

const COVER_ROOT = process.env.CLOUDINARY_COVER_FOLDER || 'Notebooks_v3/Cover';
const NOTE_STEMS = ['Bookmark_Note', 'Bookmark Note', 'BookmarkNote', 'Bookmarks'];

function authHeader(credentials) {
  return `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')}`;
}

function deliveryUrl(cloudName, publicId) {
  const id = String(publicId || '').replace(/^\/+/, '');
  if (!cloudName || !id) return null;
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${id}`;
}

async function getResourceByPublicId(cloudName, publicId, header) {
  const encoded = encodeURIComponent(publicId).replace(/%2F/g, '/');
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload/${encoded}`,
    { headers: { Authorization: header } }
  );
  if (response.status === 404) return null;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Cloudinary API error');
    error.status = response.status;
    throw error;
  }
  return data;
}

async function searchCoverInFolder(cloudName, kind, header) {
  const root = String(COVER_ROOT || 'Notebooks_v3/Cover').replace(/\/+$/, '');
  const folder = `${root}/${kind === 'back' ? 'Back' : 'Front'}`;
  const escaped = folder.replace(/"/g, '\\"');

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/search`, {
    method: 'POST',
    headers: {
      Authorization: header,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      expression: `(folder="${escaped}" OR asset_folder="${escaped}" OR public_id:${escaped}/*) AND public_id:Bookmark*`,
      max_results: 20
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) return null;
  const resources = Array.isArray(data?.resources) ? data.resources : [];
  const preferred = NOTE_STEMS.map((stem) => `${folder}/${stem}`);
  const hit =
    resources.find((r) => preferred.includes(String(r?.public_id || ''))) ||
    resources.find((r) => /bookmark/i.test(String(r?.public_id || ''))) ||
    null;
  if (!hit) return null;
  return {
    publicId: hit.public_id,
    url: hit.secure_url || deliveryUrl(cloudName, hit.public_id)
  };
}

async function resolveCover(cloudName, kind, header) {
  const root = String(COVER_ROOT || 'Notebooks_v3/Cover').replace(/\/+$/, '');
  const folder = `${root}/${kind === 'back' ? 'Back' : 'Front'}`;

  for (const stem of NOTE_STEMS) {
    const publicId = `${folder}/${stem}`;
    try {
      const resource = await getResourceByPublicId(cloudName, publicId, header);
      if (resource?.secure_url || resource?.public_id) {
        return {
          publicId: resource.public_id || publicId,
          url: resource.secure_url || deliveryUrl(cloudName, publicId)
        };
      }
    } catch (error) {
      if (error?.status && error.status !== 404) {
        console.warn('bookmarkNote cover lookup:', publicId, error.message);
      }
    }
  }

  try {
    return await searchCoverInFolder(cloudName, kind, header);
  } catch (error) {
    console.warn('bookmarkNote cover search failed:', error?.message || error);
    return null;
  }
}

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const credentials = getCloudinaryCredentials();
  if (!credentials?.cloudName || !credentials.apiKey || !credentials.apiSecret) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message:
        'CLOUDINARY_URL or CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET/CLOUDINARY_CLOUD_NAME are required'
    });
  }

  try {
    const header = authHeader(credentials);
    const [front, back] = await Promise.all([
      resolveCover(credentials.cloudName, 'front', header),
      resolveCover(credentials.cloudName, 'back', header)
    ]);

    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({
      id: 'virtual:bookmarks',
      title: 'Bookmark Note',
      coverFrontUrl: front?.url || null,
      coverBackUrl: back?.url || null,
      coverFrontPublicId: front?.publicId || null,
      coverBackPublicId: back?.publicId || null
    });
  } catch (error) {
    console.error('bookmarkNote API error:', error);
    return res.status(500).json({
      error: 'Cloudinary API error',
      message: error?.message || 'Unknown error'
    });
  }
}
