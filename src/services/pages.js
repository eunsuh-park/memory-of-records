/**
 * 페이지 추가·메타 편집 클라이언트 서비스
 */

const PDFJS_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
const PDFJS_WORKER_CDN =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

const ALLOWED_IMAGE_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/gif'
]);

const MAX_IMAGE_COUNT = 10;
/* 서버(api/writePages.js) 페이지 이미지 업로드 제한과 동일 — 선택 단계에서 미리 안내 */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
/* PDF 자체는 서버에 직접 업로드하지 않지만(페이지별로 변환 후 업로드),
 * 너무 큰 파일은 브라우저에서 변환이 오래 걸리거나 멈출 수 있어 권장 상한을 안내 */
export const MAX_PDF_BYTES = 50 * 1024 * 1024;

/**
 * @param {File} file
 * @returns {Promise<string>}
 */
export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다'));
    reader.readAsDataURL(file);
  });
}

/**
 * 임의 이미지 data URL → JPEG data URL (뷰어 page-*.jpg 규칙)
 * @param {string} dataUrl
 * @param {number} [quality=0.9]
 * @returns {Promise<string>}
 */
export function convertImageDataUrlToJpeg(dataUrl, quality = 0.9) {
  if (String(dataUrl || '').startsWith('data:image/jpeg')) return Promise.resolve(dataUrl);
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, img.naturalWidth || img.width);
        canvas.height = Math.max(1, img.naturalHeight || img.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('이미지 변환을 지원하지 않는 환경입니다'));
          return;
        }
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/jpeg', quality));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('JPEG 변환에 실패했습니다'));
      }
    };
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다'));
    img.src = dataUrl;
  });
}

/**
 * @param {File} file
 * @returns {boolean}
 */
export function isAllowedImageFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  if (ALLOWED_IMAGE_TYPES.has(type)) return true;
  const name = String(file.name || '').toLowerCase();
  return /\.(png|jpe?g|gif)$/i.test(name);
}

/**
 * @param {FileList|File[]} files
 * @param {{ maxAdditional?: number }} [options]
 * @returns {{ ok: true, files: File[] } | { ok: false, message: string }}
 */
export function validateImageFiles(files, options = {}) {
  const list = [...(files || [])].filter(Boolean);
  const maxAdditional =
    options.maxAdditional == null ? MAX_IMAGE_COUNT : Math.max(0, Number(options.maxAdditional));
  if (!list.length) {
    return { ok: false, message: '이미지를 1장 이상 선택해주세요' };
  }
  if (list.length > maxAdditional) {
    return {
      ok: false,
      message:
        maxAdditional <= 0
          ? `이미지는 최대 ${MAX_IMAGE_COUNT}장까지 가능합니다`
          : `더 추가할 수 있는 이미지는 ${maxAdditional}장입니다 (최대 ${MAX_IMAGE_COUNT}장)`
    };
  }
  for (const file of list) {
    if (!isAllowedImageFile(file)) {
      return { ok: false, message: 'PNG, JPEG, JPG, GIF만 업로드할 수 있습니다' };
    }
    if (file.size > MAX_IMAGE_BYTES) {
      const limitMb = Math.floor(MAX_IMAGE_BYTES / (1024 * 1024));
      return {
        ok: false,
        message: `${file.name || '이미지'}: ${limitMb}MB 이하 파일만 업로드할 수 있습니다`
      };
    }
  }
  return { ok: true, files: list };
}

/**
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validatePdfFile(file) {
  if (!file) return { ok: false, message: 'PDF 파일을 선택해주세요' };
  if (file.size > MAX_PDF_BYTES) {
    const limitMb = Math.floor(MAX_PDF_BYTES / (1024 * 1024));
    return {
      ok: false,
      message: `PDF는 ${limitMb}MB 이하 파일을 권장합니다 (현재 ${Math.ceil(
        file.size / (1024 * 1024)
      )}MB)`
    };
  }
  return { ok: true };
}

export { MAX_IMAGE_COUNT };

/**
 * 페이지 이미지 URL 조립
 * `{folder}/page-{6자리 zero-padded 페이지 번호}.jpg`
 * @param {string} folderUrl - Cloudinary 폴더 base URL 또는 폴더 경로
 * @param {number} pageNumber - 1부터 시작하는 페이지 번호
 * @returns {string}
 */
export function buildPageImageUrl(folderUrl, pageNumber) {
  const base = String(folderUrl || '').trim().replace(/\/+$/, '');
  return `${base}/page-${String(pageNumber).padStart(6, '0')}.jpg`;
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      if (existing.getAttribute('data-loaded') === 'true') {
        resolve();
        return;
      }
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('스크립트 로드 실패')));
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.addEventListener('load', () => {
      script.setAttribute('data-loaded', 'true');
      resolve();
    });
    script.addEventListener('error', () => reject(new Error('스크립트 로드 실패')));
    document.head.appendChild(script);
  });
}

async function ensurePdfJs() {
  await loadScript(PDFJS_CDN);
  const pdfjsLib = window.pdfjsLib || window['pdfjs-dist/build/pdf'];
  if (!pdfjsLib) throw new Error('PDF.js를 불러오지 못했습니다');
  pdfjsLib.GlobalWorkerOptions.workerSrc = PDFJS_WORKER_CDN;
  return pdfjsLib;
}

/**
 * PDF 파일을 페이지별 JPEG data URL로 변환
 * @param {File} file
 * @param {{ onProgress?: (done: number, total: number) => void, scale?: number }} [options]
 * @returns {Promise<string[]>}
 */
export async function convertPdfFileToJpegDataUrls(file, options = {}) {
  if (!file) throw new Error('PDF 파일이 필요합니다');
  const pdfjsLib = await ensurePdfJs();
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  const total = pdf.numPages || 0;
  if (!total) throw new Error('PDF에 페이지가 없습니다');

  const scale = Number(options.scale) > 0 ? Number(options.scale) : 1.5;
  const results = [];

  for (let i = 1; i <= total; i += 1) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.floor(viewport.width));
    canvas.height = Math.max(1, Math.floor(viewport.height));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('캔버스를 사용할 수 없습니다');
    await page.render({ canvasContext: ctx, viewport }).promise;
    results.push(canvas.toDataURL('image/jpeg', 0.88));
    options.onProgress?.(i, total);
  }

  return results;
}

/**
 * @param {{
 *   file: string,
 *   noteName: string,
 *   pageNumber: number,
 *   folder?: string,
 *   publicId?: string
 * }} payload
 */
export async function uploadPageImage(payload) {
  const response = await fetch('/api/writePages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'upload', ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.details?.error?.message ||
        data?.error ||
        '페이지 업로드에 실패했습니다'
    );
  }
  if (!data?.url) throw new Error('업로드 응답에 URL이 없습니다');
  return data;
}

/**
 * afterPage 이후 페이지들의 Cloudinary public_id를 shiftBy만큼 뒤로 밀어 번호 충돌을 피함
 * @param {{
 *   folder: string,
 *   afterPage: number,
 *   shiftBy: number,
 *   pageCount: number
 * }} payload
 */
export async function shiftPagesAfter(payload) {
  const response = await fetch('/api/writePages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'shiftPages', ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.details?.error?.message ||
        data?.error ||
        '페이지 번호 갱신에 실패했습니다'
    );
  }
  return data;
}

/**
 * 특정 페이지 삭제 후 뒤 페이지 번호를 앞으로 당긴다
 * @param {{
 *   publicId?: string,
 *   folder?: string,
 *   pageNumber: number,
 *   pageCount: number
 * }} payload
 */
export async function deletePage(payload) {
  const response = await fetch('/api/writePages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'deletePage', ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.details?.error?.message ||
        data?.error ||
        '페이지 삭제에 실패했습니다'
    );
  }
  return data;
}

/**
 * @param {{ folder: string, page: number }} params
 */
export async function fetchPageMeta({ folder, page }) {
  const qs = new URLSearchParams({
    op: 'meta',
    folder: String(folder || ''),
    page: String(page || 1)
  });
  const response = await fetch(`/api/readPages?${qs.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || '페이지 메타를 불러오지 못했습니다');
  }
  return data;
}

/**
 * @param {{
 *   publicId?: string,
 *   folder?: string,
 *   pageNumber?: number,
 *   entry_date?: string,
 *   ocr_text?: string,
 *   visible?: boolean,
 *   is_bookmarked?: boolean
 * }} payload
 */
export async function updatePageMeta(payload) {
  const response = await fetch('/api/writePages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'updateMeta', ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.details?.error?.message ||
        data?.error ||
        '페이지 메타 수정에 실패했습니다'
    );
  }
  return data;
}

/**
 * 노트명 변경 시 Content 폴더·앞/뒤 표지 파일명 동기화
 * @param {{
 *   noteId: string,
 *   oldNoteName: string,
 *   newNoteName: string,
 *   pdfFolderUrl?: string,
 *   pageCount?: number,
 *   coverFrontUrl?: string,
 *   coverBackUrl?: string
 * }} payload
 */
export async function renameNoteContentFolder(payload) {
  const response = await fetch('/api/writePages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'renameFolder', ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message ||
        data?.details?.error?.message ||
        data?.error ||
        '노트 관련 Cloudinary 이름 변경에 실패했습니다'
    );
  }
  return data;
}
