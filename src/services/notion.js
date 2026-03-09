/**
 * Notion API 유틸리티
 * 노션 데이터 변환 및 파싱 (Notes/ByType 등에서 사용)
 */
import { optimizeImageUrl } from '../utils/optimizeImageUrl.js';

/**
 * 노션 속성 값을 파싱하는 함수
 * @param {Object} property - 노션 속성 객체
 * @returns {string|number|null} 파싱된 값
 */
export function parseNotionProperty(property) {
  if (!property) return null;

  const type = property.type;
  
  switch (type) {
    case 'title':
      return property.title?.[0]?.plain_text || '';
    case 'rich_text':
      return property.rich_text?.[0]?.plain_text || '';
    case 'date':
      return property.date?.start || null;
    case 'number':
      return property.number || null;
    case 'select':
      return property.select?.name || null;
    case 'multi_select':
      return property.multi_select?.map(item => item.name) || [];
    case 'checkbox':
      return property.checkbox || false;
    case 'url':
      return property.url || null;
    case 'files': {
      const raw =
        property.files?.[0]?.file?.url || property.files?.[0]?.external?.url || null;
      return raw ? optimizeImageUrl(raw) || raw : null;
    }
    default:
      return null;
  }
}

