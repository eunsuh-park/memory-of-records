/**
 * POST /api/writeNotebooks
 * 노트 쓰기: public_id 배정 · 만들기 · 수정 · 휴지통 · 즐겨찾기
 *
 * Body: { op: 'allocatePublicId' | 'create' | 'update' | 'trash' | 'favorite', ... }
 */
import { handleAllocatePublicId } from './_lib/handlers/allocatePublicId.js';
import { handleCreateNote } from './_lib/handlers/createNote.js';
import { handleUpdateNote } from './_lib/handlers/updateNote.js';
import { handleTrashNote } from './_lib/handlers/trashNote.js';
import { handleUpdateFavorite } from './_lib/handlers/updateFavorite.js';

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const op = String(body.op || '').trim();

    if (op === 'allocatePublicId') return handleAllocatePublicId(req, res);
    if (op === 'create') return handleCreateNote(req, res);
    if (op === 'update') return handleUpdateNote(req, res);
    if (op === 'trash') return handleTrashNote(req, res);
    if (op === 'favorite') return handleUpdateFavorite(req, res);

    return res.status(400).json({
      error: 'Validation failed',
      message:
        "op은 'allocatePublicId' | 'create' | 'update' | 'trash' | 'favorite' 중 하나여야 합니다"
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'writeNotebooks API failed',
      message: error.message
    });
  }
}
