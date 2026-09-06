/**
 * Cloudinary 노트 폴더의 pages/page-000001 … 목록
 */
import { optimizeImageUrl } from '../utils/optimizeImageUrl.js';

const NOTEBOOKS_ROOT = 'notebooks';
const CACHE_TTL_MS = 5 * 60 * 1000;

/** @type {Map<string, { at: number, payload: { folder: string, pageCount: number, pages: Array<{pageNumber: number, url: string, publicId?: string}> } }>} */
const pageListCache = new Map();
/** @type {Map<string, Promise<{ folder: string, pageCount: number, pages: Array<{pageNumber: number, url: string, publicId?: string}> }>>} */
const inflight = new Map();

function cacheKey(publicId) {
  return String(publicId || '').trim().toLowerCase();
}

/**
 * @param {string} publicId - Notion 노트 public_id (예: DIRY-2024-0001)
 */
export function notePagesFolder(publicId) {
  const id = String(publicId || '').trim();
  if (!id) return '';
  return `${NOTEBOOKS_ROOT}/${id}/pages`;
}

function optimizePageUrl(url) {
  const raw = String(url || '').trim();
  if (!raw) return '';
  return optimizeImageUrl(raw) || raw;
}

function decoratePages(payload) {
  const pages = (payload?.pages || []).map((page) => ({
    ...page,
    url: optimizePageUrl(page.url)
  }));
  return {
    folder: payload?.folder || '',
    pageCount: payload?.pageCount || 0,
    pages
  };
}

/**
 * @param {string} [publicId] - 없으면 전체 비움
 */
export function clearNotePagesCache(publicId) {
  const key = cacheKey(publicId);
  if (key) {
    pageListCache.delete(key);
    inflight.delete(key);
    return;
  }
  pageListCache.clear();
  inflight.clear();
}

/**
 * @param {string} publicId
 * @param {{ force?: boolean }} [options]
 * @returns {Promise<{ folder: string, pageCount: number, pages: Array<{pageNumber: number, url: string, publicId?: string}> }>}
 */
export async function fetchNotePages(publicId, options = {}) {
  const note = String(publicId || '').trim();
  if (!note) {
    return { folder: '', pageCount: 0, pages: [] };
  }

  const key = cacheKey(note);
  const force = Boolean(options.force);

  if (!force) {
    const hit = pageListCache.get(key);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
      return decoratePages(hit.payload);
    }
    if (inflight.has(key)) return inflight.get(key);
  }

  const request = (async () => {
    const qs = new URLSearchParams({ op: 'list', note });
    const response = await fetch(`/api/readPages?${qs.toString()}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: force ? 'no-store' : 'default'
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.message || data?.error || '페이지 목록을 불러오지 못했습니다');
    }

    const folder = String(data?.folder || notePagesFolder(note)).trim();
    const pages = (Array.isArray(data?.pages) ? data.pages : [])
      .map((page) => ({
        pageNumber: Math.floor(Number(page?.pageNumber) || 0),
        url: String(page?.url || '').trim(),
        publicId: page?.publicId || ''
      }))
      .filter((page) => page.pageNumber > 0 && page.url)
      .sort((a, b) => a.pageNumber - b.pageNumber);

    const pageCount = Math.max(
      0,
      Math.floor(Number(data?.pageCount) || 0),
      pages.reduce((max, page) => Math.max(max, page.pageNumber), 0)
    );

    const payload = { folder, pageCount, pages };
    pageListCache.set(key, { at: Date.now(), payload });
    return decoratePages(payload);
  })();

  inflight.set(
    key,
    request.finally(() => {
      inflight.delete(key);
    })
  );
  return request;
}
