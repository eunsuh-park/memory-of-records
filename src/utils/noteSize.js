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
 * 가로가 더 긴 이미지/페이지 → 2페이지 스캔으로 판정
 * @param {number} width
 * @param {number} height
 */
export function isLandscapeSpread(width, height) {
  return Number(width) > 0 && Number(height) > 0 && Number(width) > Number(height);
}

/**
 * 표시용 종횡비 (단페이지 / 양면·2페이지 스캔)
 * @param {string|number|null|undefined} rawSize
 * @param {{ spreadAsset?: boolean }} [options]
 * @returns {{ width: number, height: number } | null}
 */
export function resolveDisplayAspect(rawSize, options = {}) {
  const parsed = parseNoteSize(rawSize);
  if (!parsed?.width || !parsed?.height) return null;
  return {
    width: options.spreadAsset ? parsed.width * 2 : parsed.width,
    height: parsed.height
  };
}

/**
 * CSS aspect-ratio 값 (단페이지 / 양면)
 * @param {string|number|null|undefined} rawSize
 * @param {boolean} [spread=false]
 * @returns {string|null}
 */
export function aspectRatioCss(rawSize, spread = false) {
  const aspect = resolveDisplayAspect(rawSize, { spreadAsset: spread });
  if (!aspect) return null;
  return `${aspect.width} / ${aspect.height}`;
}

/**
 * maxW×maxH 안에 들어가는 최대 박스 (비율 유지, 크롭 없음)
 * @param {number} aspectW
 * @param {number} aspectH
 * @param {number} maxW
 * @param {number} maxH
 */
export function fitAspectBox(aspectW, aspectH, maxW, maxH) {
  if (!(aspectW > 0 && aspectH > 0 && maxW > 0 && maxH > 0)) {
    return { width: Math.max(0, maxW), height: Math.max(0, maxH) };
  }
  let height = maxH;
  let width = height * (aspectW / aspectH);
  if (width > maxW) {
    width = maxW;
    height = width / (aspectW / aspectH);
  }
  return { width, height };
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
