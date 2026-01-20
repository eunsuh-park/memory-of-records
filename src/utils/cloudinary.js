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

/**
 * 기존 코드 호환을 위한 별칭 (contents 목록만 필요할 때)
 * @returns {Promise<{count: number, items: Array, next_cursor: string | null}>}
 */
export async function fetchArchivePdfs() {
  return fetchNotebookAssets();
}

/**
 * 간단한 로딩/에러 처리 예시 (contents 목록 렌더링)
 *
 * @param {Object} params
 * @param {HTMLElement} params.listEl - 목록을 렌더링할 요소 (ul/div 등)
 * @param {HTMLElement} params.loadingEl - 로딩 상태 표시 요소
 * @param {HTMLElement} params.errorEl - 에러 메시지 표시 요소
 */
export async function loadArchivePdfs({ listEl, loadingEl, errorEl }) {
  if (!listEl) {
    throw new Error('listEl이 필요합니다.');
  }

  // UI 초기화
  if (loadingEl) loadingEl.style.display = 'block';
  if (errorEl) errorEl.textContent = '';
  listEl.innerHTML = '';

  try {
    const data = await fetchNotebookAssets();

    if (!data.items || data.items.length === 0) {
      listEl.innerHTML = '<li>PDF 파일이 없습니다.</li>';
      return;
    }

    // PDF 목록 렌더링
    const itemsHtml = data.items
      .map((item) => {
        return `
          <li>
            <a href="${item.url}" target="_blank" rel="noopener noreferrer">
              ${item.file_name}
            </a>
          </li>
        `;
      })
      .join('');

    listEl.innerHTML = itemsHtml;
  } catch (error) {
    console.error('PDF 로딩 오류:', error);
    if (errorEl) {
      errorEl.textContent = error?.message || 'PDF 목록을 불러오지 못했습니다.';
    }
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
  }
}
