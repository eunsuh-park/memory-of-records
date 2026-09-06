/**
 * Cloudinary Content 폴더명 → Notion 노트 매칭 (북마크 앨범용)
 */

import { loadAllNotes } from './notesCatalog.js';

function normalizeStem(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[\/\\?#%&{}<>*|"`]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function folderStemFromUrl(folderUrl) {
  const trimmed = String(folderUrl || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  try {
    const path = trimmed.includes('://') ? new URL(trimmed).pathname : trimmed;
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[parts.length - 1].toLowerCase() === 'pages') {
      return parts[parts.length - 2] || '';
    }
    return parts[parts.length - 1] || '';
  } catch {
    const parts = trimmed.split('/').filter(Boolean);
    if (parts.length >= 2 && parts[parts.length - 1].toLowerCase() === 'pages') {
      return parts[parts.length - 2] || '';
    }
    return parts[parts.length - 1] || '';
  }
}

/**
 * @param {Array} notes
 * @param {{ noteFolder?: string, folderUrl?: string }} page
 */
export function matchSourceNote(notes, page = {}) {
  const list = Array.isArray(notes) ? notes : [];
  const folderUrl = String(page.folderUrl || '').trim().replace(/\/+$/, '');
  const noteFolder = String(page.noteFolder || folderStemFromUrl(folderUrl) || '').trim();
  const stem = normalizeStem(noteFolder);

  if (!stem) return null;

  const byPublicId = list.find((n) => normalizeStem(n?.publicId) === stem);
  if (byPublicId) {
    return {
      id: byPublicId.id,
      title: byPublicId.title || byPublicId.name || noteFolder || '원본 노트'
    };
  }

  const byStem = list.find((n) => {
    const titleStem = normalizeStem(n?.title || n?.name);
    return titleStem === stem;
  });
  if (!byStem) return null;
  return { id: byStem.id, title: byStem.title || byStem.name || noteFolder || '원본 노트' };
}

/**
 * 북마크 페이지 목록에 sourceNote { id, title } 를 붙인다.
 * @param {Array} pages
 * @returns {Promise<Array>}
 */
export async function attachSourceNotes(pages) {
  if (!Array.isArray(pages) || pages.length === 0) return pages || [];
  const notes = await loadAllNotes();
  return pages.map((page) => {
    const sourceNote = matchSourceNote(notes, page);
    return sourceNote ? { ...page, sourceNote } : { ...page, sourceNote: null };
  });
}
