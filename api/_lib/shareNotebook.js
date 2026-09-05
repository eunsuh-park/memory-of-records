/**
 * 공유 미리보기용 노트 필드만 Notion 페이지에서 읽는다.
 * 클라이언트 convertNotionPageToNotebook과 같은 속성 이름을 쓴다.
 */

import { parsePublicIdFromProperty } from './publicId.js';
import { isNotionPageVisible } from './visibility.js';

function normalizePropertyKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function getProperty(properties, ...names) {
  if (!properties) return null;
  for (const name of names) {
    if (properties[name]) return properties[name];
  }
  const normalizedMap = new Map(
    Object.keys(properties).map((key) => [normalizePropertyKey(key), key])
  );
  for (const name of names) {
    const matchedKey = normalizedMap.get(normalizePropertyKey(name));
    if (matchedKey && properties[matchedKey]) return properties[matchedKey];
  }
  return null;
}

function parsePlain(property) {
  if (!property) return null;
  switch (property.type) {
    case 'title':
      return property.title?.[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || '';
    case 'url':
      return property.url || null;
    case 'files':
      return property.files?.[0]?.file?.url || property.files?.[0]?.external?.url || null;
    default: {
      if (Array.isArray(property.rich_text)) {
        return property.rich_text[0]?.plain_text || '';
      }
      return null;
    }
  }
}

function normalizeUrlValue(value) {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/https?:\/\/[^\s,]+/i);
    return match ? match[0] : trimmed.split(/[,\s]+/).find(Boolean) || null;
  }
  if (typeof value === 'object') {
    if (value.url) return normalizeUrlValue(value.url);
    if (value.external?.url) return value.external.url;
    if (value.file?.url) return value.file.url;
  }
  return null;
}

function extractPageCoverUrl(page) {
  const cover = page?.cover;
  if (!cover) return null;
  if (cover.type === 'external') return cover.external?.url || null;
  if (cover.type === 'file') return cover.file?.url || null;
  return null;
}

/**
 * @param {object} page - Notion databases/query 결과 항목
 * @returns {{ id: string, title: string, description: string|null, coverFrontUrl: string|null, publicId: string, visible: boolean }|null}
 */
export function parseShareNotebook(page) {
  if (!page?.id) return null;
  const properties = page.properties || {};
  const title =
    parsePlain(getProperty(properties, '이름', 'Name', 'title', 'Title')) || '제목 없음';
  const publicId = parsePublicIdFromProperty(
    getProperty(properties, 'public_id', 'Public_ID', 'Public ID', 'publicId', 'Public id')
  );
  const description =
    parsePlain(
      getProperty(
        properties,
        'description',
        'Description',
        'notes',
        'Notes',
        'desc',
        '설명',
        '메모',
        'memo',
        'Memo',
        'note',
        'Note'
      )
    ) || null;
  const coverFrontProperty = getProperty(
    properties,
    'cover_front_url',
    'cover_front',
    'front_cover_url',
    'cover',
    'cover_url',
    '앞표지',
    '표지',
    '표지 앞',
    '전면 표지',
    '대표 이미지',
    '썸네일',
    '커버'
  );
  const rawFront =
    normalizeUrlValue(parsePlain(coverFrontProperty)) || normalizeUrlValue(extractPageCoverUrl(page));

  return {
    id: page.id,
    title: String(title).trim() || '제목 없음',
    description:
      description != null && String(description).trim() ? String(description).trim() : null,
    coverFrontUrl: rawFront,
    publicId,
    visible: isNotionPageVisible(page)
  };
}
