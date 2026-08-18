/**
 * 클라이언트 OCR (Tesseract.js CDN)
 * - npm 의존성 없이 pdf.js와 같이 CDN 로드
 * - 한국어+영어 인식 → ocr_text / entry_date 후보 추출
 */

const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

/** 한글 일기/노트용 — kor을 앞에 둬 한글 우선 디코딩 */
const OCR_LANGS = ['kor', 'eng'];

/** PSM.AUTO — 전체 페이지(여백·여러 블록)에 SINGLE_BLOCK(기본 6)보다 적합 */
const PSM_AUTO = '3';

/** @type {Promise<any> | null} */
let workerPromise = null;
/** @type {((info: { status: string, progress: number }) => void) | null} */
let progressHandler = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () =>
        reject(new Error('Tesseract 스크립트를 불러오지 못했습니다'))
      );
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    });
    script.addEventListener('error', () =>
      reject(new Error('Tesseract 스크립트를 불러오지 못했습니다'))
    );
    document.head.appendChild(script);
  });
}

async function ensureTesseract() {
  if (window.Tesseract?.createWorker) return window.Tesseract;
  await loadScript(TESSERACT_CDN);
  if (!window.Tesseract?.createWorker) {
    throw new Error('Tesseract를 초기화하지 못했습니다');
  }
  return window.Tesseract;
}

async function getWorker() {
  const Tesseract = await ensureTesseract();
  if (!workerPromise) {
    workerPromise = (async () => {
      const worker = await Tesseract.createWorker(OCR_LANGS, 1, {
        logger: (m) => {
          if (!progressHandler || !m) return;
          const progress = typeof m.progress === 'number' ? m.progress : 0;
          progressHandler({
            status: String(m.status || ''),
            progress
          });
        }
      });
      await worker.setParameters({
        tessedit_pageseg_mode: PSM_AUTO,
        preserve_interword_spaces: '1',
        user_defined_dpi: '300'
      });
      return worker;
    })().catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

/**
 * Cloudinary 등 CORS 이미지를 blob URL로 변환 (canvas/OCR용)
 * @param {string} imageUrl
 * @returns {Promise<string>} object URL (호출측에서 revoke)
 */
async function fetchImageAsObjectUrl(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!url) throw new Error('이미지 URL이 없습니다');
  if (url.startsWith('data:') || url.startsWith('blob:')) return url;

  const response = await fetch(url, { mode: 'cors', credentials: 'omit' });
  if (!response.ok) {
    throw new Error(`이미지를 불러오지 못했습니다 (${response.status})`);
  }
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

/**
 * @param {string} src
 * @returns {Promise<HTMLImageElement>}
 */
function loadImageElement(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = 'async';
    if (!src.startsWith('blob:') && !src.startsWith('data:')) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('OCR용 이미지를 디코딩하지 못했습니다'));
    img.src = src;
  });
}

/**
 * 그레이스케일·대비·해상도 보정. 저해상도/흐린 스캔에서 한글 인식률을 올린다.
 * @param {string} sourceUrl - blob/data/http URL
 * @returns {Promise<string>} 전처리된 PNG blob URL
 */
async function preprocessForOcr(sourceUrl) {
  const img = await loadImageElement(sourceUrl);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (!naturalW || !naturalH) {
    throw new Error('이미지 크기를 확인할 수 없습니다');
  }

  const maxSide = Math.max(naturalW, naturalH);
  let scale = 1;
  /* Tesseract는 ~300dpi 상당(긴 변 1600~2400)에서 안정적 */
  if (maxSide < 1400) scale = Math.min(2.5, 1800 / maxSide);
  else if (maxSide > 3200) scale = 3200 / maxSide;

  const w = Math.max(1, Math.round(naturalW * scale));
  const h = Math.max(1, Math.round(naturalH * scale));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Canvas를 사용할 수 없습니다');

  ctx.drawImage(img, 0, 0, w, h);
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  const contrast = 1.35;
  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    const boosted = (gray - 128) * contrast + 128;
    const v = boosted < 0 ? 0 : boosted > 255 ? 255 : boosted;
    data[i] = data[i + 1] = data[i + 2] = v;
  }
  ctx.putImageData(imageData, 0, 0);

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('전처리 이미지를 만들지 못했습니다'))),
      'image/png'
    );
  });
  return URL.createObjectURL(blob);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

/**
 * @param {number|string} year
 * @param {number|string} month
 * @param {number|string} day
 * @returns {string} YYYY-MM-DD 또는 ''
 */
function toIsoDate(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return '';
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return '';
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (
    dt.getUTCFullYear() !== y ||
    dt.getUTCMonth() !== m - 1 ||
    dt.getUTCDate() !== d
  ) {
    return '';
  }
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

function expandTwoDigitYear(yy) {
  const n = Number(yy);
  if (!Number.isFinite(n) || n < 0 || n > 99) return null;
  /* 일기/노트 맥락: 50 이상 → 19xx, 미만 → 20xx */
  return n >= 50 ? 1900 + n : 2000 + n;
}

/**
 * OCR 텍스트에서 첫 번째 유효 날짜를 YYYY-MM-DD로 추출
 * @param {string} text
 * @returns {string}
 */
export function extractEntryDateFromOcr(text) {
  const raw = String(text || '');
  if (!raw.trim()) return '';

  for (const m of raw.matchAll(/(19|20)\d{2}\s*년\s*(\d{1,2})\s*월\s*(\d{1,2})\s*일/g)) {
    const year = m[0].match(/(19|20)\d{2}/)?.[0];
    const iso = toIsoDate(year, m[2], m[3]);
    if (iso) return iso;
  }

  for (const m of raw.matchAll(/(19|20)\d{2}\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})/g)) {
    const year = m[0].match(/(19|20)\d{2}/)?.[0];
    const iso = toIsoDate(year, m[2], m[3]);
    if (iso) return iso;
  }

  for (const m of raw.matchAll(/(?<!\d)(\d{2})\s*[.\-/]\s*(\d{1,2})\s*[.\-/]\s*(\d{1,2})(?!\d)/g)) {
    const y = expandTwoDigitYear(m[1]);
    if (y == null) continue;
    const iso = toIsoDate(y, m[2], m[3]);
    if (iso) return iso;
  }

  return '';
}

/**
 * @param {string} imageUrl - 페이지 이미지 URL (Cloudinary delivery 등)
 * @param {{ onProgress?: (info: { status: string, progress: number }) => void }} [options]
 * @returns {Promise<{ text: string, entry_date: string }>}
 */
export async function recognizePageImage(imageUrl, options = {}) {
  progressHandler = typeof options.onProgress === 'function' ? options.onProgress : null;

  /** @type {string[]} */
  const toRevoke = [];
  try {
    let sourceUrl = '';
    try {
      sourceUrl = await fetchImageAsObjectUrl(imageUrl);
      if (sourceUrl.startsWith('blob:')) toRevoke.push(sourceUrl);
    } catch (err) {
      console.warn('[OCR] blob fetch failed, trying direct URL', err);
      sourceUrl = String(imageUrl || '').trim();
    }

    let recognizeUrl = sourceUrl;
    try {
      recognizeUrl = await preprocessForOcr(sourceUrl);
      toRevoke.push(recognizeUrl);
    } catch (err) {
      console.warn('[OCR] preprocess failed, using raw image', err);
    }

    const worker = await getWorker();
    const result = await worker.recognize(recognizeUrl);
    const text = String(result?.data?.text || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      text,
      entry_date: extractEntryDateFromOcr(text)
    };
  } finally {
    progressHandler = null;
    for (const url of toRevoke) {
      try {
        URL.revokeObjectURL(url);
      } catch {
        /* ignore */
      }
    }
  }
}
