/**
 * 새 노트 생성·표지 업로드·폼 메타 클라이언트 서비스
 */

/* 서버(api/writeCovers.js) 표지 업로드 제한과 동일 — 선택 단계에서 미리 안내 */
export const MAX_COVER_BYTES = 8 * 1024 * 1024;

/**
 * @param {File} file
 * @returns {{ ok: true } | { ok: false, message: string }}
 */
export function validateCoverImageFile(file) {
  if (!file) return { ok: false, message: '이미지를 선택해주세요' };
  if (!String(file.type || '').startsWith('image/')) {
    return { ok: false, message: '이미지 파일만 선택할 수 있습니다' };
  }
  if (file.size > MAX_COVER_BYTES) {
    const limitMb = Math.floor(MAX_COVER_BYTES / (1024 * 1024));
    return {
      ok: false,
      message: `표지 이미지는 ${limitMb}MB 이하 파일만 업로드할 수 있습니다`
    };
  }
  return { ok: true };
}

/**
 * @returns {Promise<{
 *   ok: boolean,
 *   options: {
 *     notebook_type: string[],
 *     period_name: string[],
 *     color: string[],
 *     size: string[]
 *   },
 *   fields?: Record<string, unknown>
 * }>}
 */
export async function fetchNoteFormMeta() {
  const response = await fetch('/api/readNotebooks?view=formMeta', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || '폼 옵션을 불러오지 못했습니다');
  }
  return data;
}

/**
 * @param {{
 *   file: string,
 *   filename?: string,
 *   kind: 'front'|'back',
 *   noteName?: string
 * }} payload
 * @returns {Promise<{ url: string, width?: number, height?: number }>}
 */
export async function uploadCoverImage(payload) {
  const response = await fetch('/api/writeCovers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || data?.details?.error?.message || data?.error || '표지 업로드에 실패했습니다'
    );
  }
  if (!data?.url) throw new Error('업로드 응답에 URL이 없습니다');
  return data;
}

/**
 * @param {{
 *   name: string,
 *   coverFrontUrl: string,
 *   coverBackUrl: string,
 *   notebookType: string,
 *   periodName?: string,
 *   color?: string,
 *   size?: string,
 *   periodStart: string,
 *   periodEnd?: string,
 *   notes?: string,
 *   isKept?: boolean,
 *   visible?: boolean
 * }} payload
 */
export async function createNotionNote(payload) {
  const response = await fetch('/api/writeNotebooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'create', ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || data?.details?.message || data?.error || '노트 생성에 실패했습니다'
    );
  }
  return data;
}

/**
 * @param {{
 *   id: string,
 *   name: string,
 *   notebookType: string,
 *   periodName?: string,
 *   color?: string,
 *   size?: string,
 *   periodStart: string,
 *   periodEnd?: string,
 *   notes?: string,
 *   isKept?: boolean,
 *   visible?: boolean
 * }} payload
 */
export async function updateNotionNote(payload) {
  const response = await fetch('/api/writeNotebooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'update', ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || data?.details?.message || data?.error || '노트 수정에 실패했습니다'
    );
  }
  return data;
}

/**
 * Notion favorites 토글
 * @param {{ id: string, favorites: boolean }} payload
 */
export async function updateNoteFavorite(payload) {
  const response = await fetch('/api/writeNotebooks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'favorite', ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || data?.details?.message || data?.error || '즐겨찾기 변경에 실패했습니다'
    );
  }
  return data;
}

/**
 * 노트를 휴지통 DB로 이동
 * @param {{ id: string }} payload
 */
export async function trashNotionNote(payload) {
  const response = await fetch('/api/writeNotebooks', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ op: 'trash', ...payload })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || data?.details?.message || data?.error || '노트 삭제에 실패했습니다'
    );
  }
  return data;
}

/**
 * File → data URL (base64)
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
 * @param {string} dataUrl
 * @returns {Promise<{ width: number, height: number }>}
 */
export function getImageSizeFromDataUrl(dataUrl) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;
      if (!width || !height) {
        reject(new Error('이미지 크기를 확인할 수 없습니다'));
        return;
      }
      resolve({ width, height });
    };
    img.onerror = () => reject(new Error('이미지를 불러오지 못했습니다'));
    img.src = dataUrl;
  });
}

/**
 * 이미지를 목표 크기에 맞춰 중앙 크롭 후 리사이즈 (앞표지와 동일 픽셀 크기)
 * @param {string} dataUrl
 * @param {number} targetWidth
 * @param {number} targetHeight
 * @returns {Promise<string>} data URL (image/jpeg)
 */
export function cropImageDataUrlToSize(dataUrl, targetWidth, targetHeight) {
  const tw = Math.max(1, Math.round(Number(targetWidth) || 0));
  const th = Math.max(1, Math.round(Number(targetHeight) || 0));

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const sw = img.naturalWidth || img.width;
        const sh = img.naturalHeight || img.height;
        if (!sw || !sh) {
          reject(new Error('뒷표지 이미지 크기를 확인할 수 없습니다'));
          return;
        }

        const targetRatio = tw / th;
        const srcRatio = sw / sh;
        let sx = 0;
        let sy = 0;
        let sWidth = sw;
        let sHeight = sh;

        if (srcRatio > targetRatio) {
          /* 더 넓음 → 좌우 크롭 */
          sWidth = Math.round(sh * targetRatio);
          sx = Math.round((sw - sWidth) / 2);
        } else if (srcRatio < targetRatio) {
          /* 더 높음 → 상하 크롭 */
          sHeight = Math.round(sw / targetRatio);
          sy = Math.round((sh - sHeight) / 2);
        }

        const canvas = document.createElement('canvas');
        canvas.width = tw;
        canvas.height = th;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('이미지 크롭을 지원하지 않는 환경입니다'));
          return;
        }
        ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, tw, th);
        resolve(canvas.toDataURL('image/jpeg', 0.92));
      } catch (err) {
        reject(err instanceof Error ? err : new Error('이미지 크롭에 실패했습니다'));
      }
    };
    img.onerror = () => reject(new Error('뒷표지 이미지를 불러오지 못했습니다'));
    img.src = dataUrl;
  });
}
