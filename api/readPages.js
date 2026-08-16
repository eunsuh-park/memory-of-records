/**
 * GET /api/readPages
 * 장 읽기: 노트 장 목록 · 메타 · 숨긴 장 · 북마크된 장
 *
 * Query: op=list | meta | hidden | bookmarked
 *        list는 note={public_id}
 */
import { handlePageMeta } from './_lib/handlers/pageMeta.js';
import { handleHiddenPages } from './_lib/handlers/cloudinaryHiddenPages.js';
import { handleBookmarkedPages } from './_lib/handlers/cloudinaryBookmarkedPages.js';
import { handleNotePages } from './_lib/handlers/cloudinaryNotePages.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const op = String(req.query?.op || '').trim();

  if (op === 'list') return handleNotePages(req, res);
  if (op === 'meta') return handlePageMeta(req, res);
  if (op === 'hidden') return handleHiddenPages(req, res);
  if (op === 'bookmarked') return handleBookmarkedPages(req, res);

  return res.status(400).json({
    error: 'Validation failed',
    message: "op은 'list' | 'meta' | 'hidden' | 'bookmarked' 중 하나여야 합니다"
  });
}
