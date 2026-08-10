/**
 * POST /api/createNote
 * Notion 노트북 DB에 새 페이지(row) 생성
 *
 * Body:
 * {
 *   name, coverFrontUrl, coverBackUrl, notebookType, periodStart,  // required
 *   periodName?, color?, size?, periodEnd?, notes?, isKept?, visible?, favorites?
 * }
 */
import {
  NOTEBOOK_DB_ID,
  findSchemaProperty,
  findTitleProperty,
  notionFetch
} from './_lib/notionDb.js';

function trimOrEmpty(value) {
  if (value == null) return '';
  return String(value).trim();
}

function buildRichText(content) {
  const text = String(content || '');
  /* Notion rich_text 한 블록 2000자 제한 */
  const sliced = text.slice(0, 2000);
  return { rich_text: [{ type: 'text', text: { content: sliced } }] };
}

function assignIfPresent(properties, prop, payload) {
  if (!prop || !payload) return;
  properties[prop.key] = payload;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const name = trimOrEmpty(body.name);
    const coverFrontUrl = trimOrEmpty(body.coverFrontUrl);
    const coverBackUrl = trimOrEmpty(body.coverBackUrl);
    const notebookType = trimOrEmpty(body.notebookType);
    const periodStart = trimOrEmpty(body.periodStart);

    if (!name || !coverFrontUrl || !coverBackUrl || !notebookType || !periodStart) {
      return res.status(400).json({
        error: 'Validation failed',
        message: '이름, 앞·뒤 표지 URL, 노트 종류, 사용 시작일은 필수입니다'
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

    const frontProp = findSchemaProperty(
      schema,
      'cover_front_url',
      'cover front url',
      'Cover Front URL',
      'cover_front',
      '앞표지'
    );
    const backProp = findSchemaProperty(
      schema,
      'cover_back_url',
      'cover back url',
      'Cover Back URL',
      'cover_back',
      '뒷표지'
    );
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
    const notesProp = findSchemaProperty(
      schema,
      'notes',
      'Notes',
      '메모',
      'description',
      'Description',
      'note',
      'Note'
    );
    const keptProp = findSchemaProperty(schema, 'is_kept', 'is kept', 'kept', '보관');
    const visibleProp = findSchemaProperty(schema, 'visible', 'Visible', '노출', '공개');
    const favoritesProp = findSchemaProperty(
      schema,
      'favorites',
      'Favorites',
      'favorite',
      'Favorite',
      '즐겨찾기'
    );

    if (frontProp?.type === 'url') {
      properties[frontProp.key] = { url: coverFrontUrl };
    } else if (frontProp?.type === 'rich_text') {
      properties[frontProp.key] = buildRichText(coverFrontUrl);
    } else {
      return res.status(500).json({
        error: 'Schema error',
        message: 'cover_front_url(URL) 속성이 Notion DB에 없습니다'
      });
    }

    if (backProp?.type === 'url') {
      properties[backProp.key] = { url: coverBackUrl };
    } else if (backProp?.type === 'rich_text') {
      properties[backProp.key] = buildRichText(coverBackUrl);
    } else {
      return res.status(500).json({
        error: 'Schema error',
        message: 'cover_back_url(URL) 속성이 Notion DB에 없습니다'
      });
    }

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
    if (periodName && periodNameProp) {
      if (periodNameProp.type === 'select') {
        assignIfPresent(properties, periodNameProp, { select: { name: periodName } });
      } else if (periodNameProp.type === 'rich_text') {
        assignIfPresent(properties, periodNameProp, buildRichText(periodName));
      }
    }

    const color = trimOrEmpty(body.color);
    if (color && colorProp) {
      if (colorProp.type === 'select') {
        assignIfPresent(properties, colorProp, { select: { name: color } });
      } else if (colorProp.type === 'rich_text') {
        assignIfPresent(properties, colorProp, buildRichText(color));
      }
    }

    const size = trimOrEmpty(body.size);
    if (size && sizeProp) {
      if (sizeProp.type === 'select') {
        assignIfPresent(properties, sizeProp, { select: { name: size } });
      } else if (sizeProp.type === 'rich_text') {
        assignIfPresent(properties, sizeProp, buildRichText(size));
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
    if (periodEnd && endProp?.type === 'date') {
      properties[endProp.key] = { date: { start: periodEnd } };
    }

    const notes = trimOrEmpty(body.notes);
    if (notes) {
      if (!notesProp) {
        return res.status(500).json({
          error: 'Schema error',
          message:
            '메모(notes)를 저장할 Notion 속성(notes/메모/description 등 rich_text)이 없습니다'
        });
      }
      if (notesProp.type === 'rich_text') {
        assignIfPresent(properties, notesProp, buildRichText(notes));
      } else if (notesProp.type === 'title') {
        return res.status(500).json({
          error: 'Schema error',
          message: `메모 속성(${notesProp.key})이 title이라 노트 이름과 겹칩니다. rich_text 속성을 추가해 주세요`
        });
      } else {
        return res.status(500).json({
          error: 'Schema error',
          message: `메모 속성(${notesProp.key}) 타입이 ${notesProp.type}입니다. rich_text여야 합니다`
        });
      }
    }

    const isKept = body.isKept !== false && body.isKept !== 'false';
    if (keptProp?.type === 'checkbox') {
      properties[keptProp.key] = { checkbox: Boolean(isKept) };
    }

    /* visible 기본값 true */
    const visible = body.visible !== false && body.visible !== 'false';
    if (visibleProp?.type === 'checkbox') {
      properties[visibleProp.key] = { checkbox: Boolean(visible) };
    } else if (visibleProp?.type === 'select' && visible) {
      properties[visibleProp.key] = { select: { name: 'true' } };
    }

    /* favorites 기본값 false */
    const favorites =
      body.favorites === true || body.favorites === 'true' || body.favorites === 1;
    if (favoritesProp?.type === 'checkbox') {
      properties[favoritesProp.key] = { checkbox: Boolean(favorites) };
    } else if (favoritesProp?.type === 'select') {
      properties[favoritesProp.key] = favorites
        ? { select: { name: 'true' } }
        : { select: null };
    }

    const page = await notionFetch('/pages', {
      method: 'POST',
      body: {
        parent: { database_id: NOTEBOOK_DB_ID },
        properties,
        cover: {
          type: 'external',
          external: { url: coverFrontUrl }
        }
      }
    });

    return res.status(200).json({
      ok: true,
      id: page.id,
      url: page.url
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'Failed to create note',
      message: error.message,
      details: error.details
    });
  }
}
