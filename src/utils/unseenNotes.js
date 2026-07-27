/**
 * 새로 추가된 노트 우상단 빨간 점(badge)용 localStorage 유틸
 */

const STORAGE_KEY = 'mor:unseenNoteIds';

function readIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string' && id) : [];
  } catch {
    return [];
  }
}

function writeIds(ids) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...new Set(ids)]));
  } catch {
    /* ignore quota / private mode */
  }
}

/** @param {string} noteId */
export function markNoteUnseen(noteId) {
  const id = String(noteId || '').trim();
  if (!id) return;
  const ids = readIds();
  if (!ids.includes(id)) {
    ids.push(id);
    writeIds(ids);
  }
}

/** @param {string} noteId */
export function isNoteUnseen(noteId) {
  const id = String(noteId || '').trim();
  if (!id) return false;
  return readIds().includes(id);
}

/** @param {string} noteId */
export function clearNoteUnseen(noteId) {
  const id = String(noteId || '').trim();
  if (!id) return;
  writeIds(readIds().filter((x) => x !== id));
}
