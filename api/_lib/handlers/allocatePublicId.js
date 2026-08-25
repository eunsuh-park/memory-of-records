/**
 * POST /api/writeNotebooks  op=allocatePublicId
 * 폼 입력(종류·기간·이름·메모)과 기존 DB public_id로 다음 ID를 배정한다.
 * Cloudinary 폴더명을 이 값으로 쓰기 위해 노트 생성 전에 호출한다.
 */
import { NOTEBOOK_DB_ID, notionFetch } from '../notionDb.js';
import { allocatePublicId } from '../publicId.js';

function trimOrEmpty(value) {
  if (value == null) return '';
  return String(value).trim();
}

export async function handleAllocatePublicId(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const notebookType = trimOrEmpty(body.notebookType);
    const periodStart = trimOrEmpty(body.periodStart);
    if (!notebookType || !periodStart) {
      return res.status(400).json({
        error: 'Validation failed',
        message: '노트 종류와 사용 시작일은 public_id 배정에 필요합니다'
      });
    }

    const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
    const allocated = await allocatePublicId({
      schema: database?.properties || {},
      notebookType,
      name: trimOrEmpty(body.name),
      notes: trimOrEmpty(body.notes),
      periodStart,
      periodEnd: trimOrEmpty(body.periodEnd)
    });

    return res.status(200).json({
      ok: true,
      publicId: allocated.publicId,
      prefix: allocated.prefix,
      year: allocated.year,
      seq: allocated.seq
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'Failed to allocate public_id',
      message: error.message,
      details: error.details
    });
  }
}
