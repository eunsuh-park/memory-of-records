/**
 * HTML 문자열 마크업을 만들 때 컴포넌트가 공통으로 쓰는 이스케이프·속성 조립.
 */

export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 칩 모바일 라벨처럼 허용된 <br>만 살리고 나머지는 이스케이프 */
export function escapeHtmlAllowBr(value) {
  return escapeHtml(value).replace(/&lt;br\s*\/?&gt;/gi, '<br>');
}

export function classNames(...parts) {
  return parts.flat(Infinity).filter(Boolean).join(' ');
}

/**
 * @param {Record<string, string|boolean|number|null|undefined>} [dataset]
 * @returns {string} 공백으로 이은 data-* 속성. 없으면 ''
 */
export function dataAttrs(dataset) {
  return Object.entries(dataset || {})
    .map(([key, value]) => {
      if (value == null || value === false) return '';
      if (value === true || value === '') return `data-${key}`;
      return `data-${key}="${escapeHtml(value)}"`;
    })
    .filter(Boolean)
    .join(' ');
}

/**
 * @param {string} name
 * @param {string|boolean|number|null|undefined} value
 * @returns {string}
 */
export function attr(name, value) {
  if (value == null || value === false || value === '') return '';
  if (value === true) return name;
  return `${name}="${escapeHtml(value)}"`;
}

/**
 * <select> / 드롭다운이 받는 옵션을 { value, label }로 맞춘다.
 * @param {Array<string|{value: string, label?: string}>} [options]
 * @returns {Array<{value: string, label: string}>}
 */
export function normalizeOptions(options = []) {
  return (options || []).map((opt) =>
    typeof opt === 'string' ? { value: opt, label: opt } : opt
  );
}
