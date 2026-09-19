/**
 * 클라이언트 OCR (Tesseract.js CDN)
 * - npm 의존성 없이 pdf.js와 같이 CDN 로드
 * - 한국어+영어 인식 → ocr_text / entry_date 후보 추출
 */

import { extractEntryDateFromOcr } from '../utils/entryDate.js';

export { extractEntryDateFromOcr } from '../utils/entryDate.js';

const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js';

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
    workerPromise = Tesseract.createWorker('kor+eng', 1, {
      logger: (m) => {
        if (!progressHandler || !m) return;
        const progress = typeof m.progress === 'number' ? m.progress : 0;
        progressHandler({
          status: String(m.status || ''),
          progress
        });
      }
    }).catch((err) => {
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
 * @param {string} imageUrl - 페이지 이미지 URL (Cloudinary delivery 등)
 * @param {{
 *   onProgress?: (info: { status: string, progress: number }) => void,
 *   fallbackYear?: number|null
 * }} [options]
 * @returns {Promise<{ text: string, entry_date: string }>}
 */
export async function recognizePageImage(imageUrl, options = {}) {
  progressHandler = typeof options.onProgress === 'function' ? options.onProgress : null;

  let objectUrl = '';
  let shouldRevoke = false;
  try {
    try {
      objectUrl = await fetchImageAsObjectUrl(imageUrl);
      shouldRevoke = objectUrl.startsWith('blob:');
    } catch (err) {
      console.warn('[OCR] blob fetch failed, trying direct URL', err);
      objectUrl = String(imageUrl || '').trim();
    }

    const worker = await getWorker();
    const result = await worker.recognize(objectUrl);
    const text = String(result?.data?.text || '')
      .replace(/\r\n/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();

    return {
      text,
      entry_date: extractEntryDateFromOcr(text, { fallbackYear: options.fallbackYear })
    };
  } finally {
    progressHandler = null;
    if (shouldRevoke && objectUrl) {
      try {
        URL.revokeObjectURL(objectUrl);
      } catch {
        /* ignore */
      }
    }
  }
}
