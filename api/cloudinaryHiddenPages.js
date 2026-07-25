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

/**
 * folder 파라미터에서 cloud name과 public_id prefix 추출
 * - delivery URL이면 upload/ 뒤에서 버전(v123...)·변환(f_auto,q_auto 등) 세그먼트 제거
 * - URL이 아니면 값 자체를 prefix로 사용
 */
function parseFolderParam(folder) {
  const trimmed = String(folder || '').trim().replace(/\/+$/, '');
  if (!trimmed) return { cloudName: null, prefix: null };

  const deliveryMatch = trimmed.match(
    /^https?:\/\/res\.cloudinary\.com\/([^/]+)\/image\/upload\/(.+)$/i
  );
  if (!deliveryMatch) return { cloudName: null, prefix: trimmed };

  const segments = deliveryMatch[2].split('/').filter(Boolean);
  while (segments.length && (/^v\d+$/.test(segments[0]) || segments[0].includes(','))) {
    segments.shift();
  }
  return { cloudName: deliveryMatch[1], prefix: segments.join('/') };
}

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cloudName: urlCloudName, prefix } = parseFolderParam(req.query?.folder);
  if (!prefix) {
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
    const endpoint = `https://api.cloudinary.com/v1_1/${cloudName}/resources/image/upload`;
    const authHeader = `Basic ${Buffer.from(
      `${credentials.apiKey}:${credentials.apiSecret}`
    ).toString('base64')}`;
    const hiddenPages = [];
    let nextCursor = null;

    // Admin API 페이지네이션 루프 (500건 제한 대응)
    do {
      const params = new URLSearchParams({
        prefix: `${prefix}/`,
        max_results: '500',
        context: 'true',
        metadata: 'true'
      });
      if (nextCursor) params.set('next_cursor', nextCursor);

      const response = await fetch(`${endpoint}?${params.toString()}`, {
        headers: { Authorization: authHeader }
      });
      const data = await response.json();

      if (!response.ok) {
        return res.status(response.status).json({
          error: 'Cloudinary API error',
          details: data
        });
      }

      for (const resource of data?.resources || []) {
        if (isCloudinaryResourceVisible(resource)) continue;
        const pageMatch = String(resource?.public_id || '').match(/page-(\d+)$/i);
        if (pageMatch) hiddenPages.push(Number(pageMatch[1]));
      }
      nextCursor = data?.next_cursor || null;
    } while (nextCursor);

    /* Admin API 호출량 절약: CDN에서 5분 캐시 */
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
    return res.status(200).json({ hiddenPages: hiddenPages.sort((a, b) => a - b) });
  } catch (error) {
    console.error('Cloudinary hidden pages API error:', error);
    return res.status(500).json({
      error: 'Cloudinary API error',
      message: error?.message || 'Unknown error'
    });
  }
}
