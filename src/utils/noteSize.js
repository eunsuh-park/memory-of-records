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
 * 2페이지 스캔(한 장에 양면이 들어 있는 이미지/페이지) 판정.
 * - 가로 ≥ 세로 → 스캔본
 * - size가 있으면 단페이지 비율보다 가로가 뚜렷이 긴 경우도 스캔본
 * @param {number} width
 * @param {number} height
 * @param {string|number|null|undefined} [rawSize]
 */
export function isLandscapeSpread(width, height, rawSize = null) {
  const w = Number(width);
  const h = Number(height);
  if (!(w > 0 && h > 0)) return false;

  const imageAspect = w / h;
  /* 정사각형·가로형 = 이미 두 페이지가 한 장에 있는 스캔으로 본다 */
  if (imageAspect >= 1) return true;

  const single = resolveDisplayAspect(rawSize, { spreadAsset: false });
  if (single?.width && single?.height) {
    const singleAspect = single.width / single.height;
    return imageAspect >= singleAspect * 1.3;
  }

  return false;
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
 * 뷰포트 안에서의 최대 표시 영역
 * bounds가 이미지 컨테이너(패딩 제외) 크기일 때 거의 그대로 사용합니다.
 * @param {DOMRect|{width:number,height:number}|null} bounds
 * @param {{ half?: boolean }} [options]
 */
export function getViewportMax(bounds, options = {}) {
  const viewW = bounds?.width || window.innerWidth;
  const viewH = bounds?.height || window.innerHeight;
  const maxW = Math.max(
    80,
    options.half ? Math.max(40, (viewW - 12) / 2) : viewW
  );
  const maxH = Math.max(80, viewH);
  return { maxW, maxH };
}

/**
 * 노트당 표시 박스 2종만 계산 (1페이지 / 2페이지).
 * 같은 노트의 1페이지 이미지들은 항상 동일한 single 박스를 씁니다.
 *
 * @param {string|number|null|undefined} rawSize
 * @param {DOMRect|{width:number,height:number}|null} bounds
 * @param {{ width: number, height: number }|null} [fallbackSingleAspect] size 없을 때 1페이지 비율
 * @returns {{
 *   single: {width:number,height:number}|null,
 *   singleHalf: {width:number,height:number}|null,
 *   spread: {width:number,height:number}|null
 * }}
 */
export function computeNoteDisplayBoxes(rawSize, bounds, fallbackSingleAspect = null) {
  const singleAspect =
    resolveDisplayAspect(rawSize, { spreadAsset: false }) || fallbackSingleAspect || null;
  const spreadAspect =
    resolveDisplayAspect(rawSize, { spreadAsset: true }) ||
    (fallbackSingleAspect
      ? { width: fallbackSingleAspect.width * 2, height: fallbackSingleAspect.height }
      : null);

  const full = getViewportMax(bounds, { half: false });
  const half = getViewportMax(bounds, { half: true });

  return {
    single: singleAspect
      ? fitAspectBox(singleAspect.width, singleAspect.height, full.maxW, full.maxH)
      : null,
    singleHalf: singleAspect
      ? fitAspectBox(singleAspect.width, singleAspect.height, half.maxW, half.maxH)
      : null,
    spread: spreadAspect
      ? fitAspectBox(spreadAspect.width, spreadAspect.height, full.maxW, full.maxH)
      : null
  };
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
