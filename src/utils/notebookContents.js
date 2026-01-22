/**
 * Cloudinary 노트 PDF(Contents) URL 목록을 가져오는 유틸
 * /api/cloudinary?folder=Notebooks/Contents 응답의 secure_url을 배열로 저장합니다.
 */

/**
 * @returns {Promise<string[]>}
 */
export async function fetchNotebookContentUrls() {
  const response = await fetch('/api/cloudinary?folder=Notebooks/Contents', {
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
  const ordered = resources
    .slice()
    .sort((a, b) => String(a?.public_id || '').localeCompare(String(b?.public_id || ''), 'ko'));
  const urls = ordered
    .map((resource) => resource?.secure_url || resource?.url || null)
    .filter(Boolean);

  return urls;
}

let cachedNotebookContentUrls = null;
let cachedNotebookContentUrlsPromise = null;

/**
 * 노트 PDF URL 캐시 버전
 * @returns {Promise<string[]>}
 */
export async function getNotebookContentUrls() {
  if (cachedNotebookContentUrls) return cachedNotebookContentUrls;
  if (cachedNotebookContentUrlsPromise) return cachedNotebookContentUrlsPromise;

  cachedNotebookContentUrlsPromise = fetchNotebookContentUrls()
    .then((urls) => {
      cachedNotebookContentUrls = urls;
      return urls;
    })
    .catch((error) => {
      cachedNotebookContentUrls = null;
      cachedNotebookContentUrlsPromise = null;
      throw error;
    });

  return cachedNotebookContentUrlsPromise;
}
