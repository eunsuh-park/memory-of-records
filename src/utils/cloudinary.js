/**
 * Cloudinary PDF 목록을 가져오는 프론트엔드 유틸
 *
 * 응답 데이터 예시:
 * {
 *   "count": 2,
 *   "items": [
 *     {
 *       "public_id": "archive/2024-01-report",
 *       "file_name": "2024-01-report",
 *       "url": "https://res.cloudinary.com/...",
 *       "bytes": 123456,
 *       "format": "pdf",
 *       "created_at": "2025-01-10T12:34:56Z"
 *     }
 *   ],
 *   "next_cursor": null
 * }
 */

/**
 * /api/cloudinary 엔드포인트에서 PDF 목록을 가져옵니다.
 * @returns {Promise<{count: number, items: Array, next_cursor: string | null}>}
 */
export async function fetchArchivePdfs() {
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

/**
 * 간단한 로딩/에러 처리 예시
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
    const data = await fetchArchivePdfs();

    if (data.items.length === 0) {
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
