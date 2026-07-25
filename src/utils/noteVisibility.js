/**
 * Notion visible 속성 파싱 (클라이언트)
 * API가 raw page를 넘기거나, 변환 단계에서 사용합니다.
 */

const FALSE_TEXT = new Set(['false', 'no', '0', 'off', 'hidden', '숨김', '비공개', 'private']);

function normalizeKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

/**
 * @param {Object} page - Notion page
 * @returns {boolean}
 */
export function isNotionPageVisible(page) {
  const properties = page?.properties || {};
  const key = Object.keys(properties).find((name) => normalizeKey(name) === 'visible');
  if (!key) return true;

  const property = properties[key];
  switch (property?.type) {
    case 'checkbox':
      return property.checkbox !== false;
    case 'select':
      return !FALSE_TEXT.has(String(property.select?.name ?? '').trim().toLowerCase());
    case 'rich_text':
      return !FALSE_TEXT.has(String(property.rich_text?.[0]?.plain_text ?? '').trim().toLowerCase());
    case 'formula':
      if (property.formula?.type === 'boolean') return property.formula.boolean !== false;
      if (property.formula?.type === 'string') {
        return !FALSE_TEXT.has(String(property.formula.string ?? '').trim().toLowerCase());
      }
      return true;
    default:
      return true;
  }
}
