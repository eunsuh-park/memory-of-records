/**
 * POST /api/trashNote
 * 노트북 DB의 노트 페이지를 휴지통 DB로 옮긴다.
 *
 * Body: { id: string }
 *
 * Env: NOTION_TRASH_DATABASE_ID (또는 NOTION_TRASH_DB_ID)
 */
import {
  NOTEBOOK_DB_ID,
  TRASH_DB_ID,
  NOTION_MOVE_VERSION,
  findSchemaProperty,
  findTitleProperty,
  isSameNotionId,
  normalizeKey,
  notionFetch
} from './_lib/notionDb.js';

function trimOrEmpty(value) {
  if (value == null) return '';
  return String(value).trim();
}

function parentDatabaseId(page) {
  const parent = page?.parent || {};
  return parent.database_id || parent.data_source_id || '';
}

function toWriteProperty(prop) {
  if (!prop?.type) return null;
  switch (prop.type) {
    case 'title':
      return {
        title: (prop.title || []).map((item) => ({
          type: 'text',
          text: { content: String(item?.plain_text || item?.text?.content || '').slice(0, 2000) }
        }))
      };
    case 'rich_text':
      return {
        rich_text: (prop.rich_text || []).map((item) => ({
          type: 'text',
          text: { content: String(item?.plain_text || item?.text?.content || '').slice(0, 2000) }
        }))
      };
    case 'number':
      return { number: prop.number ?? null };
    case 'select':
      return { select: prop.select?.name ? { name: prop.select.name } : null };
    case 'multi_select':
      return {
        multi_select: (prop.multi_select || []).map((option) => ({ name: option.name })).filter((o) => o.name)
      };
    case 'status':
      return { status: prop.status?.name ? { name: prop.status.name } : null };
    case 'date':
      return { date: prop.date };
    case 'checkbox':
      return { checkbox: Boolean(prop.checkbox) };
    case 'url':
      return { url: prop.url || null };
    case 'email':
      return { email: prop.email || null };
    case 'phone_number':
      return { phone_number: prop.phone_number || null };
    case 'files': {
      const files = (prop.files || [])
        .map((file) => {
          const url = file?.external?.url || file?.file?.url;
          if (!url) return null;
          return {
            name: file.name || 'file',
            type: 'external',
            external: { url }
          };
        })
        .filter(Boolean);
      return { files };
    }
    default:
      return null;
  }
}

function toWriteCover(cover) {
  const url = cover?.external?.url || cover?.file?.url;
  if (!url) return undefined;
  return { type: 'external', external: { url } };
}

function deletedAtPayload(schema, iso) {
  const deletedProp = findSchemaProperty(
    schema,
    '삭제 일시',
    'deleted_at',
    'Deleted At',
    'trashed_at',
    'deletedAt',
    '휴지통 이동일'
  );
  if (deletedProp?.type !== 'date') return null;
  return { key: deletedProp.key, payload: { date: { start: iso } } };
}

function buildTrashProperties(sourceProperties, trashSchema, deletedAtIso) {
  const destByNorm = new Map(
    Object.keys(trashSchema || {}).map((key) => [normalizeKey(key), key])
  );
  const properties = {};
  for (const [name, prop] of Object.entries(sourceProperties || {})) {
    const destKey = destByNorm.get(normalizeKey(name));
    if (!destKey) continue;
    const destType = trashSchema[destKey]?.type;
    if (destType && destType !== prop.type) continue;
    const payload = toWriteProperty(prop);
    if (payload) properties[destKey] = payload;
  }

  const destTitle = findTitleProperty(trashSchema);
  if (destTitle && !properties[destTitle.key]) {
    const sourceTitle = Object.values(sourceProperties || {}).find((prop) => prop?.type === 'title');
    const payload = toWriteProperty(sourceTitle);
    if (payload) properties[destTitle.key] = payload;
  }

  const deleted = deletedAtPayload(trashSchema, deletedAtIso);
  if (deleted) properties[deleted.key] = deleted.payload;
  return properties;
}

async function getTrashDataSourceId(trashDbId) {
  try {
    const db = await notionFetch(`/databases/${trashDbId}`, {
      notionVersion: NOTION_MOVE_VERSION
    });
    return db?.data_sources?.[0]?.id || '';
  } catch {
    return '';
  }
}

async function movePageToTrash(pageId, trashDbId) {
  const dataSourceId = await getTrashDataSourceId(trashDbId);
  const parent = dataSourceId
    ? { type: 'data_source_id', data_source_id: dataSourceId }
    : { type: 'page_id', page_id: trashDbId };

  return notionFetch(`/pages/${pageId}/move`, {
    method: 'POST',
    notionVersion: NOTION_MOVE_VERSION,
    body: { parent }
  });
}

async function copyThenArchive(page, trashDbId, trashSchema, deletedAtIso) {
  const properties = buildTrashProperties(page.properties, trashSchema, deletedAtIso);
  const cover = toWriteCover(page.cover);
  const created = await notionFetch('/pages', {
    method: 'POST',
    body: {
      parent: { database_id: trashDbId },
      properties,
      ...(cover ? { cover } : {})
    }
  });
  await notionFetch(`/pages/${page.id}`, {
    method: 'PATCH',
    body: { archived: true }
  });
  return created;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    const id = trimOrEmpty(body.id).replace(/-/g, '');

    if (!id) {
      return res.status(400).json({
        error: 'Validation failed',
        message: 'id가 필요합니다'
      });
    }

    if (!TRASH_DB_ID) {
      return res.status(503).json({
        error: 'Trash DB not configured',
        message:
          '휴지통 DB가 아직 연결되지 않았습니다. Notion에 「노트 휴지통」 데이터베이스를 만든 뒤 NOTION_TRASH_DATABASE_ID를 설정해 주세요.'
      });
    }

    const page = await notionFetch(`/pages/${id}`);
    if (page?.archived) {
      return res.status(400).json({
        error: 'Already archived',
        message: '이미 삭제된 노트입니다'
      });
    }

    const parentId = parentDatabaseId(page);
    if (isSameNotionId(parentId, TRASH_DB_ID)) {
      return res.status(400).json({
        error: 'Already in trash',
        message: '이미 휴지통에 있는 노트입니다'
      });
    }
    if (parentId && !isSameNotionId(parentId, NOTEBOOK_DB_ID)) {
      return res.status(400).json({
        error: 'Wrong database',
        message: '노트북 DB의 노트만 휴지통으로 옮길 수 있습니다'
      });
    }

    const trashDb = await notionFetch(`/databases/${TRASH_DB_ID}`);
    const trashSchema = trashDb?.properties || {};
    const deletedAtIso = new Date().toISOString();
    const deleted = deletedAtPayload(trashSchema, deletedAtIso);

    let movedPage = null;
    let method = 'move';
    try {
      movedPage = await movePageToTrash(id, TRASH_DB_ID);
      if (deleted) {
        try {
          movedPage = await notionFetch(`/pages/${id}`, {
            method: 'PATCH',
            body: { properties: { [deleted.key]: deleted.payload } }
          });
        } catch {
          /* 이동은 성공. 삭제 일시 속성이 없으면 무시 */
        }
      }
    } catch {
      method = 'copy';
      movedPage = await copyThenArchive(page, TRASH_DB_ID, trashSchema, deletedAtIso);
    }

    return res.status(200).json({
      ok: true,
      id: movedPage?.id || id,
      url: movedPage?.url,
      method
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      error: 'Failed to trash note',
      message: error.message,
      details: error.details
    });
  }
}
