/**
 * Vercel Serverless Function: Cloudinary 북마크 페이지 목록
 *
 * GET /api/cloudinaryBookmarkedPages
 * Content 루트 아래에서 is_bookmarked=true 인 페이지 이미지를 모아 반환합니다.
 * 응답 예:
 * {
 *   "pages": [
 *     {
 *       "publicId": "Notebooks_v3/Content/NoteA/page-000003",
 *       "url": "https://res.cloudinary.com/.../page-000003.jpg",
 *       "folderUrl": "https://res.cloudinary.com/.../NoteA",
 *       "pageNumber": 3,
 *       "noteFolder": "NoteA",
 *       "entryDate": "2024-01-01"
 *     }
 *   ]
 * }
 */
import { isCloudinaryResourceVisible } from './_lib/visibility.js';

const CONTENT_ROOT = process.env.CLOUDINARY_CONTENT_FOLDER || 'Notebooks_v3/Content';

function getCloudinaryCredentials() {
  const fromUrl = String(process.env.CLOUDINARY_URL || '').match(
    /^cloudinary:\/\/([^:]+):([^@]+)@(.+)$/
  );
  if (fromUrl) {
    return { apiKey: fromUrl[1], apiSecret: fromUrl[2], cloudName: fromUrl[3] };
  }
  return {
    apiKey: process.env.CLOUDINARY_API_KEY || null,
    apiSecret: process.env.CLOUDINARY_API_SECRET || null,
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || null
  };
}

function normalizeBookmarked(value) {
  if (value === true || value === 1) return true;
  if (value === false || value === 0) return false;
  const s = String(value ?? '').trim().toLowerCase();
  if (!s) return false;
  return ['true', 'yes', '1', 'on', 'bookmarked'].includes(s);
}

function readMetaValue(source, ...keys) {
  if (!source || typeof source !== 'object') return undefined;
  const normalized = new Map(
    Object.keys(source).map((name) => [
      String(name).trim().toLowerCase().replace(/[\s_-]+/g, ''),
      source[name]
    ])
  );
  for (const key of keys) {
    const hit = normalized.get(String(key).trim().toLowerCase().replace(/[\s_-]+/g, ''));
    if (hit !== undefined) return hit;
  }
  return undefined;
}

function isResourceBookmarked(resource) {
  const meta = resource?.metadata || {};
  const ctx = resource?.context?.custom || resource?.context || {};
  const raw =
    readMetaValue(meta, 'is_bookmarked', 'isbookmarked', 'bookmarked') ??
    readMetaValue(ctx, 'is_bookmarked', 'isbookmarked', 'bookmarked');
  return normalizeBookmarked(raw);
}

function extractPageNumber(publicId) {
  const match = String(publicId || '').match(/page-(\d+)(?:_[a-z0-9]+)?$/i);
  return match ? Number(match[1]) : null;
}

function extractEntryDate(resource) {
  const meta = resource?.metadata || {};
  const ctx = resource?.context?.custom || resource?.context || {};
  const raw =
    readMetaValue(meta, 'entry_date', 'entrydate', 'date') ??
    readMetaValue(ctx, 'entry_date', 'entrydate', 'date');
  return raw != null && String(raw).trim() ? String(raw).trim() : null;
}

function folderPathFromPublicId(publicId) {
  const id = String(publicId || '').replace(/^\/+|\/+$/g, '');
  const idx = id.lastIndexOf('/');
  return idx > 0 ? id.slice(0, idx) : '';
}

function folderUrlFromResource(resource, cloudName) {
  const secure = String(resource?.secure_url || resource?.url || '').trim();
  if (secure) return secure.replace(/\/[^/]+$/, '');
  const folderPath = folderPathFromPublicId(resource?.public_id);
  if (!folderPath || !cloudName) return '';
  return `https://res.cloudinary.com/${cloudName}/image/upload/${folderPath}`;
}

async function fetchJson(url, authHeader, init = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: authHeader, ...(init.headers || {}) }
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(data?.error?.message || 'Cloudinary API error');
    error.status = response.status;
    error.details = data;
    throw error;
  }
  return data;
}

/**
 * Content 루트에서 북마크된 리소스를 Search API로 모은다.
 * 표현식이 환경마다 다를 수 있어 여러 expression을 시도한 뒤,
 * 결과를 클라이언트 쪽에서 is_bookmarked로 한 번 더 필터한다.
 */
async function searchBookmarkedResources({ cloudName, contentRoot, authHeader }) {
  const root = String(contentRoot || '').replace(/\/+$/, '');
  const escaped = root.replace(/"/g, '\\"');
  const expressions = [
    `(folder="${escaped}/*" OR asset_folder="${escaped}" OR asset_folder="${escaped}/*" OR public_id:${escaped}/*) AND (context.is_bookmarked=true OR metadata.is_bookmarked=true)`,
    `(folder="${escaped}/*" OR public_id:${escaped}/*) AND context:is_bookmarked=true`,
    `public_id:${escaped}/* AND context.is_bookmarked=true`
  ];

  const merged = new Map();

  for (const expression of expressions) {
    let nextCursor = null;
    try {
      do {
        const body = {
          expression,
          with_field: ['context', 'metadata', 'tags'],
          max_results: 500
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
        for (const resource of data?.resources || []) {
          const key = resource?.asset_id || resource?.public_id;
          if (key) merged.set(key, resource);
        }
        nextCursor = data?.next_cursor || null;
      } while (nextCursor);
      if (merged.size) break;
    } catch (error) {
      console.warn('Cloudinary bookmark search attempt failed:', expression, error?.message || error);
    }
  }

  return [...merged.values()];
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
  if (!credentials.apiKey || !credentials.apiSecret || !credentials.cloudName) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message:
        'CLOUDINARY_URL or CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET/CLOUDINARY_CLOUD_NAME environment variables are required'
    });
  }

  try {
    const authHeader = `Basic ${Buffer.from(
      `${credentials.apiKey}:${credentials.apiSecret}`
    ).toString('base64')}`;

    const resources = await searchBookmarkedResources({
      cloudName: credentials.cloudName,
      contentRoot: CONTENT_ROOT,
      authHeader
    });

    const pages = [];
    for (const resource of resources) {
      if (!isResourceBookmarked(resource)) continue;
      if (!isCloudinaryResourceVisible(resource)) continue;
      const pageNumber = extractPageNumber(resource?.public_id);
      if (!pageNumber) continue;
      const folderPath = folderPathFromPublicId(resource?.public_id);
      const noteFolder = folderPath.split('/').filter(Boolean).pop() || '';
      const folderUrl = folderUrlFromResource(resource, credentials.cloudName);
      const url = String(resource?.secure_url || resource?.url || '').trim();
      if (!url || !folderUrl) continue;
      pages.push({
        publicId: resource.public_id,
        url,
        folderUrl,
        pageNumber,
        noteFolder,
        entryDate: extractEntryDate(resource)
      });
    }

    pages.sort((a, b) => {
      const da = a.entryDate || '';
      const db = b.entryDate || '';
      if (da && db && da !== db) return da < db ? -1 : 1;
      if (a.noteFolder !== b.noteFolder) return a.noteFolder.localeCompare(b.noteFolder, 'ko');
      return a.pageNumber - b.pageNumber;
    });

    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({ pages });
  } catch (error) {
    console.error('Cloudinary bookmarked pages API error:', error);
    if (error?.status) {
      return res.status(error.status).json({
        error: 'Cloudinary API error',
        details: error.details
      });
    }
    return res.status(500).json({
      error: 'Cloudinary API error',
      message: error?.message || 'Unknown error'
    });
  }
}
