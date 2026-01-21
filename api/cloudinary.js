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

import {
  configureCloudinary,
  listNotebookFolders,
  listResources
} from './cloudinary/cloudinary_get_shared.js';

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
    const nextCursorParam =
      typeof req.query?.next_cursor === 'string' ? req.query.next_cursor : null;

    // 기본 경로 하위 폴더 확인
    const folders = await listNotebookFolders();

    // 1단계: 표지 이미지(Front)만 간단히 조회
    const coverImages = await listResources({
      prefix: folderParam || 'Notebooks/Cover/Front',
      maxResults: maxResultsParam,
      nextCursor: nextCursorParam,
      resourceType: 'image'
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
