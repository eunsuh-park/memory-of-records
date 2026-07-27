/**
 * 새로 추가된 노트 우상단 빨간 점(badge)용 localStorage 유틸
 *
 * Notion page id는 하이픈 유무가 섞일 수 있어 비교 시 정규화합니다.
 */

const STORAGE_KEY = 'mor:unseenNoteIds';

/** @param {string} noteId */
export function normalizeNoteId(noteId) {
  return String(noteId || '')
    .trim()
    .replace(/-/g, '')
    .toLowerCase();
}

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
export function markNoteUnseen(noteId) {
  const id = normalizeNoteId(noteId);
  if (!id) return;
  const ids = readIds();
  if (!ids.includes(id)) {
    ids.push(id);
    writeIds(ids);
  }
}

/** @param {string} noteId */
export function isNoteUnseen(noteId) {
  const id = normalizeNoteId(noteId);
  if (!id) return false;
  return readIds().includes(id);
}

/** @param {string} noteId */
export function clearNoteUnseen(noteId) {
  const id = normalizeNoteId(noteId);
  if (!id) return;
  writeIds(readIds().filter((x) => x !== id));
}
