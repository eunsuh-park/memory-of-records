/**
 * Notion 노트북 DB 공통 헬퍼
 */

export const NOTEBOOK_DB_ID =
  process.env.NOTION_DATABASE_ID || process.env.NOTION_DB_ID || '18dfb9c7066e4df99962c5fed616b3db';

export const NOTION_VERSION = '2022-06-28';

export function normalizeKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

export async function notionFetch(path, { method = 'GET', body } = {}) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    const err = new Error('NOTION_API_KEY environment variable is required');
    err.status = 500;
    throw err;
  }

  const response = await fetch(`https://api.notion.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json'
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  const data = await response.json();
  if (!response.ok) {
    const err = new Error(data?.message || `Notion API ${response.status}`);
    err.status = response.status;
    err.details = data;
    throw err;
  }
  return data;
}

/** 스키마에서 속성 찾기 (정규화 키 + 후보명) */
export function findSchemaProperty(schema, ...names) {
  if (!schema) return null;
  const byNorm = new Map(
    Object.entries(schema).map(([key, value]) => [normalizeKey(key), { key, ...value }])
  );
  for (const name of names) {
    const hit = byNorm.get(normalizeKey(name));
    if (hit) return hit;
  }
  return null;
}

/** title 타입 속성 (이름/Name 등) */
export function findTitleProperty(schema) {
  const preferred = findSchemaProperty(schema, '이름', 'Name', 'title', 'Title', '제목');
  if (preferred?.type === 'title') return preferred;
  const entry = Object.entries(schema || {}).find(([, v]) => v?.type === 'title');
  if (!entry) return null;
  return { key: entry[0], ...entry[1] };
}

export function selectOptionsFromProp(prop) {
  if (!prop || prop.type !== 'select') return [];
  return (prop.select?.options || []).map((o) => o.name).filter(Boolean);
}
