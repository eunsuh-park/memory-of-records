/**
 * Cloudinary 노트 표지(Front) 이미지 URL 목록을 가져오는 유틸
 * /api/notebooks/covers 응답의 secure_url을 배열로 저장합니다.
 */

/**
 * @returns {Promise<string[]>}
 */
export async function fetchNotebookCoverUrls() {
  const response = await fetch('/api/notebooks/covers', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody?.message || `요청 실패: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  const data = await response.json();
  const resources = Array.isArray(data?.resources) ? data.resources : [];
  const urls = resources
    .map((resource) => resource?.secure_url || resource?.url || null)
    .filter(Boolean);

  return urls;
}

let cachedNotebookCoverUrls = null;
let cachedNotebookCoverUrlsPromise = null;

/**
 * 노트 표지 URL 캐시 버전
 * @returns {Promise<string[]>}
 */
export async function getNotebookCoverUrls() {
  if (cachedNotebookCoverUrls) return cachedNotebookCoverUrls;
  if (cachedNotebookCoverUrlsPromise) return cachedNotebookCoverUrlsPromise;

  cachedNotebookCoverUrlsPromise = fetchNotebookCoverUrls()
    .then((urls) => {
      cachedNotebookCoverUrls = urls;
      return urls;
    })
    .catch((error) => {
      cachedNotebookCoverUrls = null;
      cachedNotebookCoverUrlsPromise = null;
      throw error;
    });

  return cachedNotebookCoverUrlsPromise;
}
