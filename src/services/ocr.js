/**
 * 페이지 OCR — 글자 읽기만 서버 Gemini에 맡긴다.
 * 날짜 후보는 src/utils/entryDate.js 가 텍스트에서 뽑는다.
 */

import { extractEntryDateFromOcr } from '../utils/entryDate.js';

export { extractEntryDateFromOcr } from '../utils/entryDate.js';

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('이미지를 읽지 못했습니다'));
    reader.readAsDataURL(blob);
  });
}

/**
 * @param {string} imageUrl
 * @returns {Promise<{ imageUrl?: string, file?: string }>}
 */
async function toOcrPayload(imageUrl) {
  const url = String(imageUrl || '').trim();
  if (!url) throw new Error('이미지 URL이 없습니다');
  if (url.startsWith('data:')) return { file: url };
  if (url.startsWith('blob:')) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`이미지를 불러오지 못했습니다 (${response.status})`);
    return { file: await blobToDataUrl(await response.blob()) };
  }
  return { imageUrl: url };
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
  const onProgress = typeof options.onProgress === 'function' ? options.onProgress : null;
  onProgress?.({ status: 'recognizing text', progress: 0.2 });

  const payload = await toOcrPayload(imageUrl);
  onProgress?.({ status: 'recognizing text', progress: 0.45 });

  const response = await fetch('/api/writePages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ op: 'ocr', ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || 'Gemini OCR에 실패했습니다');
  }

  onProgress?.({ status: 'recognizing text', progress: 1 });
  const text = String(data?.text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    text,
    entry_date: extractEntryDateFromOcr(text, { fallbackYear: options.fallbackYear })
  };
}
