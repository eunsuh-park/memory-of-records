/**
 * POST /api/updateNotePages
 * Notion 노트북의 pdf_folder_url / page_count만 갱신
 *
 * Body: { id, pdfFolderUrl, pageCount }
 */
import {
  NOTEBOOK_DB_ID,
  findSchemaProperty,
  notionFetch
} from './_lib/notionDb.js';

function trimOrEmpty(value) {
  if (value == null) return '';
  return String(value).trim();
}

function buildPropertyPayload(prop, value) {
  if (!prop) return null;
  if (prop.type === 'url') return { url: value || null };
  if (prop.type === 'rich_text') {
    const text = String(value || '').slice(0, 2000);
    return text
      ? { rich_text: [{ type: 'text', text: { content: text } }] }
      : { rich_text: [] };
  }
  if (prop.type === 'number') {
    const n = Number(value);
    return { number: Number.isFinite(n) ? n : null };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const id = trimOrEmpty(body.id).replace(/-/g, '');
    const pdfFolderUrl = trimOrEmpty(body.pdfFolderUrl);
    const pageCount = Number(body.pageCount);

    if (!id) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'id는 필수입니다'
      });
    }
    if (!pdfFolderUrl) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'pdfFolderUrl은 필수입니다'
      });
    }
    if (!Number.isFinite(pageCount) || pageCount < 1) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'pageCount는 1 이상의 숫자여야 합니다'
      });
    }

    const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
    const schema = database?.properties || {};

    const folderUrlProp = findSchemaProperty(
      schema,
      'pdf_folder_url',
      'PDF Folder URL',
      'pdf folder url'
    );
    const pageCountProp = findSchemaProperty(
      schema,
      'page_count',
      'Page Count',
      'page count'
    );

    if (!folderUrlProp || !['url', 'rich_text'].includes(folderUrlProp.type)) {
      return res.status(500).json({
        error: 'Schema error',
        message: 'Notion DB에 pdf_folder_url(URL/rich_text) 속성이 없습니다'
      });
    }

    const properties = {};
    const folderPayload = buildPropertyPayload(folderUrlProp, pdfFolderUrl);
    if (folderPayload) properties[folderUrlProp.key] = folderPayload;

    if (pageCountProp && ['number', 'rich_text'].includes(pageCountProp.type)) {
      const countPayload = buildPropertyPayload(pageCountProp, pageCount);
      if (countPayload) properties[pageCountProp.key] = countPayload;
    }

    const page = await notionFetch(`/pages/${id}`, {
      method: 'PATCH',
      body: { properties }
    });

    return res.status(200).json({
      ok: true,
      id: page.id,
      url: page.url,
      pdfFolderUrl,
      pageCount
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'Failed to update note pages',
      message: error.message,
      details: error.details
    });
  }
}
