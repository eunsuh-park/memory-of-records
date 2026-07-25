/**
 * Notion `size` 프로퍼티 → 표시 라벨·종횡비 변환
 * 지원: A4/A5 등 용지명, "148x210", "148×210mm" 형태
 */

const PAPER_MM = {
  a3: [297, 420],
  a4: [210, 297],
  a5: [148, 210],
  a6: [105, 148],
  a7: [74, 105],
  b5: [176, 250],
  b6: [125, 176],
  b7: [88, 125],
  letter: [216, 279],
  legal: [216, 356]
};

/**
 * @param {string|number|null|undefined} raw
 * @returns {{ label: string, width: number, height: number, aspectRatio: number } | null}
 */
export function parseNoteSize(raw) {
  if (raw == null || raw === '') return null;
  const text = String(raw).trim();
  if (!text) return null;

  const paperKey = text.toLowerCase().replace(/[\s_-]+/g, '');
  const paperMatch = paperKey.match(/^(a[3-7]|b[5-7]|letter|legal)/);
  if (paperMatch && PAPER_MM[paperMatch[1]]) {
    const [width, height] = PAPER_MM[paperMatch[1]];
    return {
      label: paperMatch[1].toUpperCase(),
      width,
      height,
      aspectRatio: width / height
    };
  }

  const dimMatch = text.match(
    /(\d+(?:\.\d+)?)\s*[x×*]\s*(\d+(?:\.\d+)?)/i
  );
  if (dimMatch) {
    const width = Number(dimMatch[1]);
    const height = Number(dimMatch[2]);
    if (width > 0 && height > 0) {
      return {
        label: `${width}×${height}`,
        width,
        height,
        aspectRatio: width / height
      };
    }
  }

  return { label: text, width: null, height: null, aspectRatio: null };
}

/**
 * CSS aspect-ratio 값 (단페이지 / 양면)
 * @param {string|number|null|undefined} rawSize
 * @param {boolean} [spread=false]
 * @returns {string|null} 예: "148 / 210" 또는 "296 / 210"
 */
export function aspectRatioCss(rawSize, spread = false) {
  const parsed = parseNoteSize(rawSize);
  if (!parsed?.aspectRatio || !parsed.width || !parsed.height) return null;
  const w = spread ? parsed.width * 2 : parsed.width;
  return `${w} / ${parsed.height}`;
}

/**
 * 표시용 사이즈 문자열
 * @param {string|number|null|undefined} rawSize
 * @returns {string}
 */
export function formatNoteSizeLabel(rawSize) {
  const parsed = parseNoteSize(rawSize);
  return parsed?.label || '';
}
