/**
 * 새 노트 생성·표지 업로드·폼 메타 클라이언트 서비스
 */

/**
 * @returns {Promise<{
 *   ok: boolean,
 *   options: { notebook_type: string[], color: string[], size: string[] },
 *   fields?: Record<string, unknown>
 * }>}
 */
export async function fetchNoteFormMeta() {
  const response = await fetch('/api/noteFormMeta', {
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
 * @param {{ file: string, filename?: string, kind: 'front'|'back' }} payload
 * @returns {Promise<{ url: string }>}
 */
export async function uploadCoverImage(payload) {
  const response = await fetch('/api/uploadCover', {
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
 *   color?: string,
 *   size?: string,
 *   periodStart?: string,
 *   periodEnd?: string,
 *   notes?: string,
 *   isKept?: boolean
 * }} payload
 */
export async function createNotionNote(payload) {
  const response = await fetch('/api/createNote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
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
