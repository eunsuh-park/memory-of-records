/**
 * 기본 Bookmark Note 메타 (Cloudinary 표지)
 */

let cache = null;
let inflight = null;

/**
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<{
 *   id: string,
 *   title: string,
 *   coverFrontUrl: string|null,
 *   coverBackUrl: string|null
 * }>}
 */
export async function fetchBookmarkNoteMeta({ force = false } = {}) {
  if (force) {
    cache = null;
    inflight = null;
  }
  if (!force && cache) return cache;
  if (!force && inflight) return inflight;

  const qs = force ? `?_=${Date.now()}` : '';
  inflight = fetch(`/api/bookmarkNote${qs}`, { cache: force ? 'no-store' : 'default' })
    .then(async (response) => {
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.message || data?.error || 'Bookmark Note 메타를 불러오지 못했습니다');
      }
      return response.json();
    })
    .then((data) => {
      cache = {
        id: data?.id || 'virtual:bookmarks',
        title: data?.title || 'Bookmark Note',
        coverFrontUrl: data?.coverFrontUrl || null,
        coverBackUrl: data?.coverBackUrl || null
      };
      return cache;
    })
    .finally(() => {
      inflight = null;
    });

  return inflight;
}

export function clearBookmarkNoteMetaCache() {
  cache = null;
  inflight = null;
}
