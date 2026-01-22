/**
 * Cloudinary 노트 표지 이미지 URL 목록을 가져오는 유틸
 * /api/notebooks/covers 및 /api/notebooks/covers_back 응답의 secure_url을 배열로 저장합니다.
 */

/**
 * @param {"front" | "back"} type
 * @returns {Promise<string[]>}
 */
export async function fetchNotebookCoverUrls(type = 'front') {
  // type이 'back'이면 뒷표지, 그 외는 앞표지로 처리합니다.
  const endpoint = type === 'back' ? '/api/notebooks/covers_back' : '/api/notebooks/covers';
  // Vercel API에서 표지 리소스 목록을 가져옵니다.
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
  // secure_url 우선, 없으면 url로 대체합니다.
  // front/back 모두 동일 포맷의 resources를 사용하므로 처리 로직은 같습니다.
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
  // 캐시된 결과가 있으면 즉시 반환
  if (cachedNotebookCoverUrls[key]) return cachedNotebookCoverUrls[key];
  // 동일 요청이 진행 중이면 그 Promise 재사용
  if (cachedNotebookCoverUrlsPromise[key]) return cachedNotebookCoverUrlsPromise[key];

  // front/back 각각 별도의 캐시와 Promise를 유지합니다.
  // 서로 다른 엔드포인트를 호출하므로 동시에 요청해도 충돌하지 않습니다.
  cachedNotebookCoverUrlsPromise[key] = fetchNotebookCoverUrls(key)
    .then((urls) => {
      // 성공 시 결과 캐시
      cachedNotebookCoverUrls[key] = urls;
      return urls;
    })
    .catch((error) => {
      // 실패 시 캐시 초기화
      cachedNotebookCoverUrls[key] = null;
      cachedNotebookCoverUrlsPromise[key] = null;
      throw error;
    });

  return cachedNotebookCoverUrlsPromise[key];
}
