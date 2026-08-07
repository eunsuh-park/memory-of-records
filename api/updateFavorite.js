/**
 * POST /api/updateFavorite
 * Notion 노트북 페이지의 favorites(checkbox)만 갱신
 *
 * Body: { id: string, favorites: boolean }
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

function toBoolean(value) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return Boolean(value);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const id = trimOrEmpty(body.id).replace(/-/g, '');

    if (!id || body.favorites === undefined) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'id와 favorites(boolean)가 필요합니다'
      });
    }

    const favorites = toBoolean(body.favorites);

    const database = await notionFetch(`/databases/${NOTEBOOK_DB_ID}`);
    const schema = database?.properties || {};
    const favoritesProp = findSchemaProperty(
      schema,
      'favorites',
      'Favorites',
      'favorite',
      'Favorite',
      '즐겨찾기'
    );

    if (!favoritesProp) {
      return res.status(500).json({
        error: 'Schema error',
        message: 'Notion DB에 favorites 속성이 없습니다'
      });
    }

    const properties = {};
    if (favoritesProp.type === 'checkbox') {
      properties[favoritesProp.key] = { checkbox: favorites };
    } else if (favoritesProp.type === 'select') {
      properties[favoritesProp.key] = favorites
        ? { select: { name: 'true' } }
        : { select: null };
    } else {
      return res.status(500).json({
        error: 'Schema error',
        message: `favorites 속성 타입(${favoritesProp.type})을 지원하지 않습니다. checkbox를 권장합니다.`
      });
    }

    const page = await notionFetch(`/pages/${id}`, {
      method: 'PATCH',
      body: { properties }
    });

    return res.status(200).json({
      ok: true,
      id: page.id,
      favorites
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'Failed to update favorite',
      message: error.message,
      details: error.details
    });
  }
}
