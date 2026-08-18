/**
 * POST /api/writeNotebooks  op=update
 * Notion 노트북 페이지(row) 메타데이터만 수정 (표지/커버 이미지는 변경하지 않음)
 *
 * Body:
 * {
 *   id, name, notebookType, periodStart,  // required
 *   periodName?, color?, size?, periodEnd?, notes?, isKept?, visible?
 * }
 * notes는 Notion description(text/rich_text)에 공백 포함 70자로 저장
 */
import {
  NOTEBOOK_DB_ID,
  buildDescriptionPropertyPayload,
  findNoteDescriptionProperty,
  findSchemaProperty,
  findTitleProperty,
  notionFetch
} from '../notionDb.js';

function trimOrEmpty(value) {
  if (value == null) return '';
  return String(value).trim();
}

function buildRichText(content) {
  const text = String(content || '');
  const sliced = text.slice(0, 2000);
  return { rich_text: [{ type: 'text', text: { content: sliced } }] };
}

export async function handleUpdateNote(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const id = trimOrEmpty(body.id).replace(/-/g, '');
    const name = trimOrEmpty(body.name);
    const notebookType = trimOrEmpty(body.notebookType);
    const periodStart = trimOrEmpty(body.periodStart);

    if (!id || !name || !notebookType || !periodStart) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'id, 이름, 노트 종류, 사용 시작일은 필수입니다'
      });
    }

    const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
    const schema = database?.properties || {};

    const titleProp = findTitleProperty(schema);
    if (!titleProp) {
      return res.status(500).json({
        error: 'Schema error',
        message: 'Notion DB에 title 속성이 없습니다'
      });
    }

    const properties = {
      [titleProp.key]: {
        title: [{ type: 'text', text: { content: name.slice(0, 2000) } }]
      }
    };

    const typeProp = findSchemaProperty(schema, 'notebook_type', 'Notebook Type', 'type', 'Type');
    const periodNameProp = findSchemaProperty(
      schema,
      'period_name',
      'Period Name',
      'period name',
      'Period',
      '시기'
    );
    const colorProp = findSchemaProperty(schema, 'color', 'Color', '색', '색상');
    const sizeProp = findSchemaProperty(schema, 'size', 'Size', '사이즈', '노트 사이즈');
    const startProp = findSchemaProperty(schema, 'period_start', 'Period Start', 'period start');
    const endProp = findSchemaProperty(schema, 'period_end', 'Period End', 'period end');
    const notesProp = findNoteDescriptionProperty(schema);
    const keptProp = findSchemaProperty(schema, 'is_kept', 'is kept', 'kept', '보관');
    const visibleProp = findSchemaProperty(schema, 'visible', 'Visible', '노출', '공개');

    if (typeProp?.type === 'select') {
      properties[typeProp.key] = { select: { name: notebookType } };
    } else if (typeProp?.type === 'rich_text') {
      properties[typeProp.key] = buildRichText(notebookType);
    } else {
      return res.status(500).json({
        error: 'Schema error',
        message: 'notebook_type 속성이 Notion DB에 없습니다'
      });
    }

    const periodName = trimOrEmpty(body.periodName);
    if (periodNameProp) {
      if (periodNameProp.type === 'select') {
        properties[periodNameProp.key] = periodName
          ? { select: { name: periodName } }
          : { select: null };
      } else if (periodNameProp.type === 'rich_text') {
        properties[periodNameProp.key] = periodName
          ? buildRichText(periodName)
          : { rich_text: [] };
      }
    }

    const color = trimOrEmpty(body.color);
    if (colorProp) {
      if (colorProp.type === 'select') {
        properties[colorProp.key] = color ? { select: { name: color } } : { select: null };
      } else if (colorProp.type === 'rich_text') {
        properties[colorProp.key] = color ? buildRichText(color) : { rich_text: [] };
      }
    }

    const size = trimOrEmpty(body.size);
    if (sizeProp) {
      if (sizeProp.type === 'select') {
        properties[sizeProp.key] = size ? { select: { name: size } } : { select: null };
      } else if (sizeProp.type === 'rich_text') {
        properties[sizeProp.key] = size ? buildRichText(size) : { rich_text: [] };
      }
    }

    if (startProp?.type === 'date') {
      properties[startProp.key] = { date: { start: periodStart } };
    } else {
      return res.status(500).json({
        error: 'Schema error',
        message: 'period_start(date) 속성이 Notion DB에 없습니다'
      });
    }

    const periodEnd = trimOrEmpty(body.periodEnd);
    if (endProp?.type === 'date') {
      properties[endProp.key] = periodEnd ? { date: { start: periodEnd } } : { date: null };
    }

    if (body.notes !== undefined) {
      const notes = trimOrEmpty(body.notes);
      if (!notesProp) {
        return res.status(500).json({
          error: 'Schema error',
          message: '메모를 저장할 Notion 속성(description)이 없습니다'
        });
      }
      const notesPayload = buildDescriptionPropertyPayload(notesProp, notes);
      if (!notesPayload) {
        return res.status(500).json({
          error: 'Schema error',
          message: `description 속성(${notesProp.key}) 타입이 ${notesProp.type}입니다. text/rich_text여야 합니다`
        });
      }
      properties[notesProp.key] = notesPayload;
    }

    const isKept = body.isKept !== false && body.isKept !== 'false';
    if (keptProp?.type === 'checkbox') {
      properties[keptProp.key] = { checkbox: Boolean(isKept) };
    }

    if (body.visible !== undefined) {
      const visible = body.visible !== false && body.visible !== 'false';
      if (visibleProp?.type === 'checkbox') {
        properties[visibleProp.key] = { checkbox: Boolean(visible) };
      } else if (visibleProp?.type === 'select') {
        properties[visibleProp.key] = visible
          ? { select: { name: 'true' } }
          : { select: null };
      }
    }

    /* 표지 URL·페이지 cover는 절대 변경하지 않음 */
    const page = await notionFetch(`/pages/${id}`, {
      method: 'PATCH',
      body: { properties }
    });

    return res.status(200).json({
      ok: true,
      id: page.id,
      url: page.url
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'Failed to update note',
      message: error.message,
      details: error.details
    });
  }
}
