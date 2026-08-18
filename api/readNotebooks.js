/**
 * GET /api/readNotebooks
 * 노트 읽기: 시기/타입 목록 · 폼 옵션 · Cloudinary 표지
 *
 * Query: view=period | type | formMeta | covers
 *        visibility=public | private | all  (period/type)
 */
import { handleNotionByPeriod } from './_lib/handlers/notionByPeriod.js';
import { handleNotionByType } from './_lib/handlers/notionByType.js';
import { handleNoteFormMeta } from './_lib/handlers/noteFormMeta.js';
import { handleCloudinaryCovers } from './_lib/handlers/cloudinaryCovers.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const view = String(req.query?.view || '').trim();

  if (view === 'period') return handleNotionByPeriod(req, res);
  if (view === 'type') return handleNotionByType(req, res);
  if (view === 'formMeta') return handleNoteFormMeta(req, res);
  if (view === 'covers') return handleCloudinaryCovers(req, res);

  return res.status(400).json({
    error: 'Validation failed',
    message: "view는 'period' | 'type' | 'formMeta' | 'covers' 중 하나여야 합니다"
  });
}
