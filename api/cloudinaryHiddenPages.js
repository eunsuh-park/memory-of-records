/**
 * Vercel Serverless Function: Cloudinary 숨김 페이지 조회
 *
 * GET /api/cloudinaryHiddenPages?folder={pdf_folder_url 또는 public_id prefix}
 * Cloudinary Admin API로 해당 폴더의 리소스 metadata/context를 읽어
 * visible이 false로 표시된 페이지 번호 목록을 반환합니다.
 * 응답 예: { "hiddenPages": [3, 12] }  (page-000003.jpg, page-000012.jpg 숨김)
 *
 * 필요 환경 변수 (둘 중 하나):
 * - CLOUDINARY_URL: cloudinary://{api_key}:{api_secret}@{cloud_name}
 * - CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET (+ CLOUDINARY_CLOUD_NAME)
 *   folder 파라미터가 delivery URL이면 cloud_name은 URL에서 추출합니다.
 */
import { isCloudinaryResourceVisible } from './_lib/visibility.js';

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

function decodePathSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/**
 * folder 파라미터에서 cloud name과 폴더 path 추출
 * - delivery URL이면 upload/ 뒤에서 버전(v123...)·변환(f_auto,q_auto 등) 세그먼트 제거
 * - URL 인코딩된 한글 경로를 디코딩 (Admin API prefix/asset_folder는 디코딩된 public_id 기준)
 * - URL이 아니면 값 자체를 path로 사용
 */
function parseFolderParam(folder) {
  const trimmed = String(folder || '').trim().replace(/\/+$/, '');
  if (!trimmed) return { cloudName: null, folderPath: null };

  const deliveryMatch = trimmed.match(
    /^https?:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+)$/i
  );
  if (!deliveryMatch) {
    return { cloudName: null, folderPath: decodePathSegment(trimmed) };
  }

  const segments = deliveryMatch[2].split('/').filter(Boolean);
  while (segments.length && (/^v\d+$/.test(segments[0]) || segments[0].includes(','))) {
    segments.shift();
  }
  return {
    cloudName: deliveryMatch[1],
    folderPath: segments.map(decodePathSegment).join('/')
  };
}

/** public_id에서 페이지 번호 추출 (고유접미사 page-000001_ab3k9x 포함) */
function extractPageNumber(publicId) {
  const match = String(publicId || '').match(/page-(\d+)(?:_[a-z0-9]+)?$/i);
  return match ? Number(match[1]) : null;
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

async function fetchAllGetPages(url, authHeader) {
  const resources = [];
  let nextCursor = null;

  do {
    const endpoint = new URL(url);
    if (nextCursor) endpoint.searchParams.set('next_cursor', nextCursor);
    const data = await fetchJson(endpoint.toString(), authHeader);
    resources.push(...(data?.resources || []));
    nextCursor = data?.next_cursor || null;
  } while (nextCursor);

  return resources;
}

async function searchFolderResources({ cloudName, folderPath, authHeader }) {
  const resources = [];
  let nextCursor = null;
  const escaped = folderPath.replace(/"/g, '\\"');
  /* fixed folder(folder/public_id) + dynamic folder(asset_folder) 모두 커버 */
  const expression =
    `(folder="${escaped}" OR folder="${escaped}/*" OR asset_folder="${escaped}" OR public_id:${escaped}/*)`;

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
    resources.push(...(data?.resources || []));
    nextCursor = data?.next_cursor || null;
  } while (nextCursor);

  return resources;
}

/**
 * Search API를 우선 사용하고, 실패 시 prefix / asset_folder 목록으로 폴백합니다.
 */
async function listFolderResources({ cloudName, folderPath, authHeader }) {
  try {
    const searched = await searchFolderResources({ cloudName, folderPath, authHeader });
    if (searched.length) return searched;
  } catch (error) {
    console.warn('Cloudinary search fallback:', error?.message || error);
  }

  const common = 'max_results=500&context=true&metadata=true';
  const byPrefixUrl =
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload` +
    `?prefix=${encodeURIComponent(`${folderPath}/`)}&${common}`;
  const byAssetFolderUrl =
    `https://api.cloudinary.com/v1_1/${cloudName}/resources/by_asset_folder` +
    `?asset_folder=${encodeURIComponent(folderPath)}&${common}`;

  const [prefixResult, assetFolderResult] = await Promise.allSettled([
    fetchAllGetPages(byPrefixUrl, authHeader),
    fetchAllGetPages(byAssetFolderUrl, authHeader)
  ]);

  if (prefixResult.status === 'rejected' && assetFolderResult.status === 'rejected') {
    throw prefixResult.reason;
  }

  const merged = new Map();
  for (const result of [prefixResult, assetFolderResult]) {
    if (result.status !== 'fulfilled') continue;
    for (const resource of result.value) {
      const key = resource?.asset_id || resource?.public_id;
      if (key) merged.set(key, resource);
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

  const { cloudName: urlCloudName, folderPath } = parseFolderParam(req.query?.folder);
  if (!folderPath) {
    return res.status(400).json({
      error: 'Invalid folder',
      message: 'folder query parameter is required'
    });
  }

  const credentials = getCloudinaryCredentials();
  const cloudName = credentials.cloudName || urlCloudName;
  if (!credentials.apiKey || !credentials.apiSecret || !cloudName) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message:
        'CLOUDINARY_URL or CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET environment variables are required'
    });
  }

  try {
    const authHeader = `Basic ${Buffer.from(
      `${credentials.apiKey}:${credentials.apiSecret}`
    ).toString('base64')}`;

    const resources = await listFolderResources({
      cloudName,
      folderPath,
      authHeader
    });

    const hiddenPages = [];
    for (const resource of resources) {
      if (isCloudinaryResourceVisible(resource)) continue;
      const pageNum = extractPageNumber(resource?.public_id);
      if (pageNum) hiddenPages.push(pageNum);
    }

    /* 페이지 visible 편집 직후 반영을 위해 CDN 장기 캐시 금지 */
    res.setHeader('Cache-Control', 'private, no-store');
    return res.status(200).json({
      hiddenPages: [...new Set(hiddenPages)].sort((a, b) => a - b)
    });
  } catch (error) {
    console.error('Cloudinary hidden pages API error:', error);
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
