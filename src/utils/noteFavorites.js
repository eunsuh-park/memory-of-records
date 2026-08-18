/**
 * 노트 즐겨찾기 — 로컬만 저장 (Notion 스키마는 건드리지 않음)
 */

import { normalizeNoteId } from './unseenNotes.js';

const STORAGE_KEY = 'mor:favoriteNoteIds';

function readIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return [...new Set(parsed.map(normalizeNoteId).filter(Boolean))];
  } catch {
    return [];
  }
}

function writeIds(ids) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify([...new Set(ids.map(normalizeNoteId).filter(Boolean))])
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/** @param {string} noteId */
export function isNoteFavorite(noteId) {
  const id = normalizeNoteId(noteId);
  if (!id) return false;
  return readIds().includes(id);
}

/**
 * @param {string} noteId
 * @returns {boolean} 토글 후 즐겨찾기 여부
 */
export function toggleNoteFavorite(noteId) {
  const id = normalizeNoteId(noteId);
  if (!id) return false;
  const ids = readIds();
  const nextOn = !ids.includes(id);
  writeIds(nextOn ? [...ids, id] : ids.filter((x) => x !== id));
  return nextOn;
}
