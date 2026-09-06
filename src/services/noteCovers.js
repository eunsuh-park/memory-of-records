/**
 * Cloudinary 노트 폴더에서 앞·뒤 표지 URL을 읽어 노트 객체에 붙인다.
 * Notion cover_*_url 대신 GET /api/readNotebooks?view=covers 결과를 쓴다.
 */
import { optimizeImageUrl } from '../utils/optimizeImageUrl.js';
import { parseCoverPageFlag } from '../utils/viewerPages.js';
import { isBookmarksNoteId } from '../utils/bookmarksNote.js';
import { isDemoNoteId } from '../utils/demoNote.js';

/** @type {{ data: Record<string, {front?: string|null, back?: string|null, firstPageIsCover?: boolean|null, lastPageIsCover?: boolean|null}>|null, loaded: boolean, promise: Promise<unknown>|null }} */
const cachedCovers = { data: null, loaded: false, promise: null };

function normalizeCoverKey(value) {
  return String(value || '').trim().toLowerCase();
}

function optimizeCoverUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return null;
  return optimizeImageUrl(raw) || raw;
}

/**
 * @returns {Promise<{ loaded: boolean, covers: Record<string, {front?: string|null, back?: string|null, firstPageIsCover?: boolean|null, lastPageIsCover?: boolean|null}> }>}
 */
export async function fetchNoteCovers() {
  if (cachedCovers.loaded && cachedCovers.data) {
    return { loaded: true, covers: cachedCovers.data };
  }
  if (cachedCovers.promise) return cachedCovers.promise;

  cachedCovers.promise = fetch('/api/readNotebooks?view=covers', {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })
    .then(async (response) => {
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.message || `표지를 불러오지 못했습니다: ${response.status}`);
      }
      const data = await response.json();
      const raw = data?.covers && typeof data.covers === 'object' ? data.covers : {};
      const covers = {};
      for (const [noteId, urls] of Object.entries(raw)) {
        const key = normalizeCoverKey(noteId);
        if (!key) continue;
        covers[key] = {
          front: urls?.front || null,
          back: urls?.back || null,
          firstPageIsCover: parseCoverPageFlag(urls?.firstPageIsCover),
          lastPageIsCover: parseCoverPageFlag(urls?.lastPageIsCover)
        };
      }
      cachedCovers.data = covers;
      cachedCovers.loaded = true;
      cachedCovers.promise = null;
      return { loaded: true, covers };
    })
    .catch((error) => {
      console.warn('[noteCovers]', error?.message || error);
      cachedCovers.data = null;
      cachedCovers.loaded = false;
      cachedCovers.promise = null;
      return { loaded: false, covers: {} };
    });

  return cachedCovers.promise;
}

function lookupCover(covers, note) {
  const candidates = [note?.publicId, note?.title, note?.name];
  for (const value of candidates) {
    const key = normalizeCoverKey(value);
    if (key && covers[key]) return covers[key];
  }
  return null;
}

/**
 * Cloudinary 표지 URL을 노트에 덮어쓴다.
 * API가 실패한 경우에는 Notion URL을 그대로 둔다.
 * @param {Array} notes
 * @param {{ loaded: boolean, covers: Record<string, {front?: string|null, back?: string|null}> }} coversResult
 */
export function attachNoteCovers(notes, coversResult) {
  const list = Array.isArray(notes) ? notes : [];
  if (!coversResult?.loaded) return list;

  const covers = coversResult.covers || {};
  console.debug('[noteCovers] attachNoteCovers:', {
    notesCount: list.length,
    coversCount: Object.keys(covers).length,
    firstNote: list[0] ? {
      id: list[0].id,
      publicId: list[0].publicId,
      title: list[0].title,
      hasOriginalCover: Boolean(list[0].coverFrontUrl)
    } : null
  });
  
  return list.map((note, index) => {
    if (!note || isBookmarksNoteId(note.id) || note.isVirtualBookmarks || isDemoNoteId(note.id)) {
      return note;
    }
    const hit = lookupCover(covers, note);
    
    /* Cloudinary 표지가 있으면 사용, 없으면 Notion 원본 유지 */
    const frontUrl = hit?.front 
      ? optimizeCoverUrl(hit.front) 
      : (note.coverFrontUrl || null);
    const backUrl = hit?.back 
      ? optimizeCoverUrl(hit.back) 
      : (note.coverBackUrl || null);
    
    if (index === 0) {
      console.debug('[noteCovers] First note cover:', {
        hitFound: Boolean(hit),
        hitFront: hit?.front?.substring(0, 80),
        originalFront: note.coverFrontUrl?.substring(0, 80),
        finalFront: frontUrl?.substring(0, 80)
      });
    }
    
    return {
      ...note,
      coverFrontUrl: frontUrl,
      coverBackUrl: backUrl,
      firstPageIsCover: hit?.firstPageIsCover ?? note.firstPageIsCover ?? null,
      lastPageIsCover: hit?.lastPageIsCover ?? note.lastPageIsCover ?? null
    };
  });
}

export function clearNoteCoversCache() {
  cachedCovers.data = null;
  cachedCovers.loaded = false;
  cachedCovers.promise = null;
}

/**
 * PDF 첫/마지막 장이 표지인지 앞표지 context에 저장한다.
 * @param {{
 *   publicId: string,
 *   firstPageIsCover?: boolean,
 *   lastPageIsCover?: boolean
 * }} payload
 */
export async function updateCoverPageFlags(payload) {
  const publicId = String(payload?.publicId || '').trim();
  if (!publicId) {
    throw new Error('publicId가 필요합니다');
  }
  const body = { op: 'coverFlags', publicId };
  if (typeof payload.firstPageIsCover === 'boolean') {
    body.firstPageIsCover = payload.firstPageIsCover;
  }
  if (typeof payload.lastPageIsCover === 'boolean') {
    body.lastPageIsCover = payload.lastPageIsCover;
  }

  const response = await fetch('/api/writeCovers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      data?.message || data?.error || '표지 페이지 설정을 저장하지 못했습니다'
    );
  }
  clearNoteCoversCache();
  return data;
}
