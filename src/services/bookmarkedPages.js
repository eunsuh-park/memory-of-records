/**
 * 북마크된 페이지 목록 (가상 Bookmarks 노트용)
 */

let cache = null;
let inflight = null;

/**
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<Array<{
 *   publicId: string,
 *   url: string,
 *   folderUrl: string,
 *   pageNumber: number,
 *   noteFolder?: string,
 *   entryDate?: string|null
 * }>>}
 */
export async function getBookmarkedPages({ force = false } = {}) {
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;

  const qs = force ? `?op=bookmarked&_=${Date.now()}` : '?op=bookmarked';
  inflight = fetch(`/api/readPages${qs}`, {
    cache: force ? 'no-store' : 'default'
  })
    .then(async (response) => {
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || data?.error || '북마크 페이지를 불러오지 못했습니다');
      }
      return response.json();
    })
    .then((data) => {
      const pages = Array.isArray(data?.pages) ? data.pages : [];
      cache = pages;
      return pages;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function clearBookmarkedPagesCache() {
  cache = null;
  inflight = null;
}
