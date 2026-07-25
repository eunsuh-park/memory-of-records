/**
 * visible 판정 공용 유틸 (서버리스 함수 전용)
 *
 * - Notion DB의 visible 컬럼이 false로 평가되는 페이지는 웹사이트에서 숨깁니다.
 * - Cloudinary 리소스 metadata(구조화 메타데이터) 또는 context(컨텍스트 메타데이터)의
 *   visible 값이 false로 평가되는 이미지는 웹사이트에서 숨깁니다.
 * - visible 항목이 아예 없으면 기존과 동일하게 항상 노출합니다.
 *
 * 참고: 언더스코어(_)로 시작하는 폴더는 Vercel이 API 엔드포인트로 빌드하지 않습니다.
 */

const FALSE_TEXT_VALUES = new Set(['false', 'no', '0', 'off', 'hidden', '숨김']);

function normalizePropertyKey(name) {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '');
}

function isFalseText(value) {
  return FALSE_TEXT_VALUES.has(String(value ?? '').trim().toLowerCase());
}

/**
 * Notion 페이지의 visible 속성 기준 노출 여부 판정
 * checkbox / select / rich_text / formula 타입을 지원합니다.
 * @param {Object} page - Notion 페이지 객체 (databases/query 응답의 results 항목)
 * @returns {boolean} 웹사이트에 노출해야 하면 true
 */
export function isNotionPageVisible(page) {
  const properties = page?.properties || {};
  const key = Object.keys(properties).find(
    (name) => normalizePropertyKey(name) === 'visible'
  );
  if (!key) return true;

  const property = properties[key];
  switch (property?.type) {
    case 'checkbox':
      return property.checkbox !== false;
    case 'select':
      return !isFalseText(property.select?.name);
    case 'rich_text':
      return !isFalseText(property.rich_text?.[0]?.plain_text);
    case 'formula':
      if (property.formula?.type === 'boolean') return property.formula.boolean !== false;
      if (property.formula?.type === 'string') return !isFalseText(property.formula.string);
      return true;
    default:
      return true;
  }
}

function readVisibleValue(source) {
  if (!source || typeof source !== 'object') return undefined;
  const key = Object.keys(source).find(
    (name) => normalizePropertyKey(name) === 'visible'
  );
  return key === undefined ? undefined : source[key];
}

/**
 * Cloudinary 리소스의 metadata/context 기준 노출 여부 판정
 * @param {Object} resource - Cloudinary Admin API 응답의 resources 항목
 * @returns {boolean} 웹사이트에 노출해야 하면 true
 */
export function isCloudinaryResourceVisible(resource) {
  let value = readVisibleValue(resource?.metadata);
  if (value === undefined) value = readVisibleValue(resource?.context?.custom);
  if (value === undefined) value = readVisibleValue(resource?.context);
  if (value === undefined || value === null) return true;
  if (value === false) return false;
  return !isFalseText(value);
}
