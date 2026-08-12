/**
 * GET /api/bookmarkNote
 * 모든 유저에게 제공되는 기본 Bookmark Note 메타(표지 URL)를 반환합니다.
 *
 * 표지 우선 조회 위치 (사용자가 만든 폴더):
 *   Bookmark Note/
 *   Notebooks_v3/Bookmark Note/
 *   Notebooks_v3/Cover/Bookmark Note/
 * 폴백: Cover/Front|Back/{Bookmark_Note|Bookmark Note|…}
 */
import { getCloudinaryCredentials } from './_lib/cloudinaryAuth.js';

const COVER_ROOT = process.env.CLOUDINARY_COVER_FOLDER || 'Notebooks_v3/Cover';
/** 사용자가 만든 기본 북마크 노트 폴더 */
const BOOKMARK_NOTE_FOLDERS = [
  'Bookmark Note',
  'Notebooks_v3/Bookmark Note',
  `${String(COVER_ROOT || 'Notebooks_v3/Cover').replace(/\/+$/, '')}/Bookmark Note`
];
const NOTE_STEMS = ['Bookmark_Note', 'Bookmark Note', 'BookmarkNote', 'Bookmarks', 'front', 'back'];

function authHeader(credentials) {
  return `Basic ${Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString('base64')}`;
}

function deliveryUrl(cloudName, publicId) {
  const id = String(publicId || '').replace(/^\/+/, '');
  if (!cloudName || !id) return null;
  return `https://res.cloudinary.com/${cloudName}/image/upload/f_auto,q_auto/${id}`;
}

function classifyFace(publicId, filename) {
  const s = `${publicId || ''} ${filename || ''}`.toLowerCase();
  if (/(^|[\/_-])back([\/_.-]|$)/i.test(s) || s.includes('뒷') || s.includes('back')) return 'back';
  if (/(^|[\/_-])front([\/_.-]|$)/i.test(s) || s.includes('앞') || s.includes('front')) return 'front';
  return null;
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

async function searchFolderResources(cloudName, folderPath, header) {
  const escaped = String(folderPath).replace(/"/g, '\\"');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/resources/search`, {
    method: 'POST',
    headers: {
      Authorization: header,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      expression: `folder="${escaped}" OR asset_folder="${escaped}" OR public_id:${escaped}/*`,
      max_results: 50,
      with_field: ['tags']
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.warn('bookmarkNote folder search failed:', folderPath, data?.error?.message);
    return [];
  }
  return Array.isArray(data?.resources) ? data.resources : [];
}

function toCover(resource, cloudName) {
  if (!resource) return null;
  return {
    publicId: resource.public_id,
    url: resource.secure_url || deliveryUrl(cloudName, resource.public_id)
  };
}

/** Bookmark Note 폴더에서 front/back 한 쌍을 고른다 */
async function resolveFromBookmarkFolder(cloudName, header) {
  for (const folder of BOOKMARK_NOTE_FOLDERS) {
    let resources = [];
    try {
      resources = await searchFolderResources(cloudName, folder, header);
    } catch (error) {
      console.warn('bookmarkNote folder error:', folder, error?.message || error);
      continue;
    }
    if (!resources.length) continue;

    let front = null;
    let back = null;
    for (const resource of resources) {
      const face = classifyFace(resource.public_id, resource.filename || resource.display_name);
      if (face === 'front' && !front) front = resource;
      if (face === 'back' && !back) back = resource;
    }

    /* 파일명에 front/back이 없으면 정렬 후 첫/둘째를 front/back으로 */
    if ((!front || !back) && resources.length >= 1) {
      const sorted = [...resources].sort((a, b) =>
        String(a.public_id).localeCompare(String(b.public_id))
      );
      if (!front) front = sorted[0];
      if (!back) back = sorted[1] || sorted[0];
    }

    if (front || back) {
      return {
        folder,
        front: toCover(front, cloudName),
        back: toCover(back, cloudName)
      };
    }
  }
  return null;
}

/** 기존 Cover/Front|Back/{stem} 규칙 폴백 */
async function resolveLegacyCover(cloudName, kind, header) {
  const root = String(COVER_ROOT || 'Notebooks_v3/Cover').replace(/\/+$/, '');
  const folder = `${root}/${kind === 'back' ? 'Back' : 'Front'}`;

  for (const stem of NOTE_STEMS) {
    const publicId = `${folder}/${stem}`;
    try {
      const resource = await getResourceByPublicId(cloudName, publicId, header);
      if (resource?.secure_url || resource?.public_id) {
        return toCover(resource, cloudName);
      }
    } catch (error) {
      if (error?.status && error.status !== 404) {
        console.warn('bookmarkNote legacy lookup:', publicId, error.message);
      }
    }
  }
  return null;
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
    const fromFolder = await resolveFromBookmarkFolder(credentials.cloudName, header);

    let front = fromFolder?.front || null;
    let back = fromFolder?.back || null;

    if (!front) front = await resolveLegacyCover(credentials.cloudName, 'front', header);
    if (!back) back = await resolveLegacyCover(credentials.cloudName, 'back', header);

    res.setHeader('Cache-Control', 'public, max-age=60');
    return res.status(200).json({
      id: 'virtual:bookmarks',
      title: 'Bookmark Note',
      folder: fromFolder?.folder || null,
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
