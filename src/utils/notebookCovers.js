/**
 * Cloudinary 노트 표지 이미지 URL 목록을 가져오는 유틸
 * /api/notebooks/covers 응답의 secure_url을 배열로 저장합니다.
 */

/**
 * @param {"front" | "back"} type
 * @returns {Promise<string[]>}
 */
export async function fetchNotebookCoverUrls(type = 'front') {
  const endpoint = type === 'back' ? '/api/notebooks/covers_back' : '/api/notebooks/covers';
  const response = await fetch(endpoint, {
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

const cachedNotebookCoverUrls = {
  front: null,
  back: null
};
const cachedNotebookCoverUrlsPromise = {
  front: null,
  back: null
};

/**
 * 노트 표지 URL 캐시 버전
 * @param {"front" | "back"} type
 * @returns {Promise<string[]>}
 */
export async function getNotebookCoverUrls(type = 'front') {
  const key = type === 'back' ? 'back' : 'front';
  if (cachedNotebookCoverUrls[key]) return cachedNotebookCoverUrls[key];
  if (cachedNotebookCoverUrlsPromise[key]) return cachedNotebookCoverUrlsPromise[key];

  cachedNotebookCoverUrlsPromise[key] = fetchNotebookCoverUrls(key)
    .then((urls) => {
      cachedNotebookCoverUrls[key] = urls;
      return urls;
    })
    .catch((error) => {
      cachedNotebookCoverUrls[key] = null;
      cachedNotebookCoverUrlsPromise[key] = null;
      throw error;
    });

  return cachedNotebookCoverUrlsPromise[key];
}
