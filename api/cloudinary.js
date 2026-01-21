/**
 * Vercel Serverless Function: Cloudinary Admin API 프록시
 *
 * 목적:
 * - Cloudinary Admin API는 서버에서만 호출해야 안전합니다.
 * - 이 함수는 /api/cloudinary 엔드포인트로 접근합니다.
 *
 * 필요한 환경 변수:
 * - CLOUDINARY_CLOUD_NAME
 * - CLOUDINARY_API_KEY
 * - CLOUDINARY_API_SECRET
 */

import { v2 as cloudinary } from 'cloudinary';

// Cloudinary 설정을 매 요청 전에 적용해도 무방합니다.
// (Vercel Function은 요청마다 실행될 수 있으므로 안전한 방식)
function configureCloudinary() {
  // 우선순위:
  // 1) CLOUDINARY_URL이 있으면 그 값을 파싱해서 설정
  // 2) 없으면 개별 환경 변수(CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) 사용
  // 둘 중 하나라도 누락되면 에러를 반환
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const cloudinaryUrl = process.env.CLOUDINARY_URL;

  if ((!cloudName || !apiKey || !apiSecret) && !cloudinaryUrl) {
    return { ok: false, message: 'Cloudinary 환경 변수가 누락되었습니다.' };
  }

  if (cloudinaryUrl) {
    // cloudinary://<api_key>:<api_secret>@<cloud_name> 형식을 URL로 파싱
    try {
      const parsed = new URL(cloudinaryUrl);
      const urlCloudName = parsed.hostname;
      const urlApiKey = decodeURIComponent(parsed.username || '');
      const urlApiSecret = decodeURIComponent(parsed.password || '');
      if (!urlCloudName || !urlApiKey || !urlApiSecret) {
        return { ok: false, message: 'CLOUDINARY_URL 형식이 올바르지 않습니다.' };
      }
      cloudinary.config({
        cloud_name: urlCloudName,
        api_key: urlApiKey,
        api_secret: urlApiSecret,
        secure: true
      });
      return { ok: true };
    } catch (error) {
      return { ok: false, message: 'CLOUDINARY_URL 파싱에 실패했습니다.' };
    }
  }

  // CLOUDINARY_URL이 없을 때는 개별 환경 변수로 설정
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });

  return { ok: true };
}

/**
 * @param {import('@vercel/node').VercelRequest} req
 * @param {import('@vercel/node').VercelResponse} res
 */
export default async function handler(req, res) {
  // GET 요청만 허용합니다.
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Cloudinary 인증 설정 확인 (누락 시 500 응답)
  const configResult = configureCloudinary();
  if (!configResult.ok) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: configResult.message
    });
  }

  try {
    const folderParam = typeof req.query?.folder === 'string' ? req.query.folder : '';
    const maxResultsParam =
      typeof req.query?.max_results === 'string' ? Number(req.query.max_results) : 20;
    const nextCursorParam = typeof req.query?.next_cursor === 'string' ? req.query.next_cursor : null;
    const normalizedMaxResults =
      Number.isFinite(maxResultsParam) && maxResultsParam > 0
        ? Math.min(maxResultsParam, 500)
        : 20;

    // 기본 경로 하위 폴더 확인
    const folders = await cloudinary.api.sub_folders('Notebooks');

    // 1단계: 표지 이미지(Front)만 간단히 조회
    const coverImages = await cloudinary.api.resources({
      type: 'upload',
      prefix: folderParam || 'Notebooks/Cover/Front',
      resource_type: 'image',
      max_results: normalizedMaxResults,
      ...(nextCursorParam ? { next_cursor: nextCursorParam } : {})
    });

    return res.status(200).json({
      folder: folderParam || 'Notebooks/Cover/Front',
      folders: folders.folders || [],
      resources: coverImages.resources || [],
      next_cursor: coverImages.next_cursor || null
    });
  } catch (error) {
    console.error('Cloudinary API error:', error);
    return res.status(500).json({
      error: 'Cloudinary API error',
      message: error?.message || 'Unknown error'
    });
  }
}
