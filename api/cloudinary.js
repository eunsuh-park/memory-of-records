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
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return { ok: false, message: 'Cloudinary 환경 변수가 누락되었습니다.' };
  }

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

  const configResult = configureCloudinary();
  if (!configResult.ok) {
    return res.status(500).json({
      error: 'Cloudinary configuration missing',
      message: configResult.message
    });
  }

  try {
    // archive/ 폴더의 raw 리소스(예: PDF)를 최대 500개까지 가져옵니다.
    const result = await cloudinary.api.resources({
      type: 'upload',
      prefix: 'archive/',
      resource_type: 'raw',
      max_results: 500
    });

    // PDF만 필터링합니다. (format이 pdf이거나 url이 .pdf로 끝나는 경우)
    const pdfAssets = (result.resources || []).filter((asset) => {
      const isRaw = asset.resource_type === 'raw';
      const isPdfFormat = asset.format === 'pdf';
      const isPdfUrl =
        typeof asset.secure_url === 'string' &&
        asset.secure_url.toLowerCase().endsWith('.pdf');
      return isRaw && (isPdfFormat || isPdfUrl);
    });

    const items = pdfAssets.map((asset) => {
      const fileName = asset.public_id.split('/').pop() || asset.public_id;

      return {
        public_id: asset.public_id,
        file_name: fileName,
        url: asset.secure_url,
        bytes: asset.bytes,
        format: asset.format,
        created_at: asset.created_at
      };
    });

    return res.status(200).json({
      count: items.length,
      items,
      next_cursor: result.next_cursor || null
    });
  } catch (error) {
    console.error('Cloudinary API error:', error);
    return res.status(500).json({
      error: 'Cloudinary API error',
      message: error?.message || 'Unknown error'
    });
  }
}
