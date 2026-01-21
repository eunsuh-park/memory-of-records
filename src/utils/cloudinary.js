/**
 * Cloudinary 노트북 리소스를 가져오는 프론트엔드 유틸
 *
 * 응답 데이터 예시:
 * {
 *   "count": 18,
 *   "notes": [
 *     {
 *       "key": "2005-그림일기",
 *       "year_label": "2005",
 *       "record_type": "그림일기",
 *       "record_order": null,
 *       "front": "https://res.cloudinary.com/..../Notebooks/Cover/Front/2005-그림일기.png",
 *       "back": "https://res.cloudinary.com/..../Notebooks/Cover/Back/2005-그림일기.png",
 *       "contents": "https://res.cloudinary.com/..../Notebooks/Contents/2005-그림일기.pdf",
 *       "front_asset": { ... },
 *       "back_asset": { ... },
 *       "contents_asset": { ... }
 *     }
 *   ],
 *   "items": [ ... ], // contents 리소스 목록 (호환용)
 *   "next_cursor": null,
 *   "folders": { "front": "...", "back": "...", "contents": "..." }
 * }
 */

/**
 * /api/cloudinary 엔드포인트에서 노트북 리소스를 가져옵니다.
 * @returns {Promise<{count: number, notes: Array, items: Array, next_cursor: string | null}>}
 */
export async function fetchNotebookAssets() {
  const response = await fetch('/api/cloudinary', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const message =
      errorBody?.message || `요청 실패: ${response.status} ${response.statusText}`;
    throw new Error(message);
  }

  return response.json();
}

let cachedNotebookAssets = null;
let cachedNotebookAssetsPromise = null;

/**
 * 노트북 리소스 캐시 버전
 * @returns {Promise<{count: number, notes: Array, items: Array, next_cursor: string | null}>}
 */
export async function getNotebookAssets() {
  if (cachedNotebookAssets) return cachedNotebookAssets;
  if (cachedNotebookAssetsPromise) return cachedNotebookAssetsPromise;

  cachedNotebookAssetsPromise = fetchNotebookAssets()
    .then((data) => {
      cachedNotebookAssets = data;
      return data;
    })
    .catch((error) => {
      cachedNotebookAssets = null;
      cachedNotebookAssetsPromise = null;
      throw error;
    });

  return cachedNotebookAssetsPromise;
}
