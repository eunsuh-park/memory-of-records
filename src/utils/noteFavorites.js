/**
 * Notion `favorites` 속성 헬퍼
 *
 * - DB 기본값 false. 속성이 없거나 비어 있으면 false로 취급한다.
 * - 즐겨찾기 전용 페이지(/favorites)에서 filterFavoriteNotes로 목록을 모을 예정.
 */

export const FAVORITES_PATH = '/favorites';

function normalizeKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

/**
 * Notion page raw properties → favorites boolean
 * @param {Object} page - Notion page
 * @returns {boolean}
 */
export function parseNotionFavorites(page) {
  const properties = page?.properties || {};
  const key = Object.keys(properties).find((name) => normalizeKey(name) === 'favorites');
  if (!key) return false;

  const property = properties[key];
  switch (property?.type) {
    case 'checkbox':
      return property.checkbox === true;
    case 'select': {
      const name = String(property.select?.name || '')
        .trim()
        .toLowerCase();
      return name === 'true' || name === 'yes' || name === '1';
    }
    case 'rich_text': {
      const text = String(property.rich_text?.[0]?.plain_text || '')
        .trim()
        .toLowerCase();
      return text === 'true' || text === 'yes' || text === '1';
    }
    default:
      return false;
  }
}

/** @param {Object|null|undefined} note */
export function isFavoriteNote(note) {
  return Boolean(note?.favorites);
}

/**
 * favorites === true 인 노트만 반환 (즐겨찾기 페이지용)
 * @param {Array} notes
 * @returns {Array}
 */
export function filterFavoriteNotes(notes) {
  if (!Array.isArray(notes)) return [];
  return notes.filter(isFavoriteNote);
}
