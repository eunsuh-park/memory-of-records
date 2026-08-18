/**
 * Cloudinary 노트 폴더의 pages/page-000001 … 목록
 */
import { optimizeImageUrl } from '../utils/optimizeImageUrl.js';

const NOTEBOOKS_ROOT = 'notebooks';

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

/**
 * @param {string} publicId
 * @returns {Promise<{ folder: string, pageCount: number, pages: Array<{pageNumber: number, url: string, publicId?: string}> }>}
 */
export async function fetchNotePages(publicId) {
  const note = String(publicId || '').trim();
  if (!note) {
    return { folder: '', pageCount: 0, pages: [] };
  }

  const qs = new URLSearchParams({ op: 'list', note });
  const response = await fetch(`/api/readPages?${qs.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || data?.error || '페이지 목록을 불러오지 못했습니다');
  }

  const folder = String(data?.folder || notePagesFolder(note)).trim();
  const pages = (Array.isArray(data?.pages) ? data.pages : [])
    .map((page) => ({
      pageNumber: Math.floor(Number(page?.pageNumber) || 0),
      url: optimizePageUrl(page?.url),
      publicId: page?.publicId || ''
    }))
    .filter((page) => page.pageNumber > 0 && page.url)
    .sort((a, b) => a.pageNumber - b.pageNumber);

  const pageCount = Math.max(
    0,
    Math.floor(Number(data?.pageCount) || 0),
    pages.reduce((max, page) => Math.max(max, page.pageNumber), 0)
  );

  return { folder, pageCount, pages };
}
