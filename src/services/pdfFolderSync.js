/**
 * 서비스 접속 시 Cloudinary → Notion pdf_folder_url 자동 동기화 요청
 * /api/syncPdfFolders를 백그라운드로 1회 호출합니다 (세션당 1회).
 * 실패해도 앱 동작에는 영향이 없으며, 새로 채워진 값은 다음 로드부터 반영됩니다.
 */

const SYNC_FLAG_KEY = 'pdf-folder-sync-requested';

export function requestPdfFolderSync() {
  try {
    if (sessionStorage.getItem(SYNC_FLAG_KEY)) return;
    sessionStorage.setItem(SYNC_FLAG_KEY, '1');
  } catch {
    /* sessionStorage 사용 불가(시크릿 모드 등)여도 호출은 진행 */
  }

  fetch('/api/syncPdfFolders', { method: 'POST' })
    .then((response) => response.json().catch(() => null))
    .then((result) => {
      if (!result) return;
      if (result.updated > 0) {
        console.info(
          `[pdf-folder-sync] ${result.updated}개 노트북의 pdf_folder_url을 채웠습니다. 새로고침 시 반영됩니다.`,
          result
        );
      } else if (result.ok === false && !result.skipped) {
        console.warn('[pdf-folder-sync] 동기화 실패:', result);
      }
    })
    .catch(() => {
      /* 로컬 dev(vite 단독 실행) 등 API가 없는 환경에서는 조용히 무시 */
    });
}
